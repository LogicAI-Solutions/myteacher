import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.schools import School, SchoolInvite
from backend.models.users import User
from backend.models.plans import Plan
from backend.models.classes import Class


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def max_teachers(db: Session, owner: User) -> int:
    """Limite de professores vem do plano do diretor, lido na hora (sem cópia no usuário).
    Teste grátis: limite pequeno; plano de professor autônomo: não convida professores."""
    if owner.is_trial:
        return settings.SCHOOL_TRIAL_MAX_TEACHERS
    plan = None
    if owner.plan_id and str(owner.plan_id).isdigit():
        plan = db.query(Plan).filter(Plan.id == int(owner.plan_id)).first()
    if plan and plan.role == "school":
        return plan.max_teachers or 0
    return 0


def members(db: Session, school: School, role: Optional[str] = None):
    query = db.query(User).filter(User.school_id == school.id)
    if role:
        query = query.filter(User.school_role == role)
    return query.order_by(User.full_name, User.email).all()


def pending_invites(db: Session, school: School, role: Optional[str] = None):
    query = db.query(SchoolInvite).filter(
        SchoolInvite.school_id == school.id,
        SchoolInvite.accepted_at.is_(None),
        SchoolInvite.revoked_at.is_(None),
        SchoolInvite.expires_at > datetime.utcnow(),
    )
    if role:
        query = query.filter(SchoolInvite.school_role == role)
    return query.order_by(SchoolInvite.created_at.desc()).all()


def usage(db: Session, school: School) -> dict:
    teachers = db.query(User).filter(User.school_id == school.id, User.school_role == "teacher").count()
    secretaries = db.query(User).filter(User.school_id == school.id, User.school_role == "secretary").count()
    return {
        "teachers": teachers,
        "max_teachers": max_teachers(db, school.owner),
        "pending_teacher_invites": len(pending_invites(db, school, "teacher")),
        "secretaries": secretaries,
        "max_secretaries": settings.SCHOOL_MAX_SECRETARIES,
        "pending_secretary_invites": len(pending_invites(db, school, "secretary")),
    }


def has_seat(db: Session, school: School, role: str, counting_invites: bool) -> bool:
    """Ao convidar contam convites pendentes; ao aceitar, só quem já é membro."""
    u = usage(db, school)
    if role == "teacher":
        used = u["teachers"] + (u["pending_teacher_invites"] if counting_invites else 0)
        return used < u["max_teachers"]
    used = u["secretaries"] + (u["pending_secretary_invites"] if counting_invites else 0)
    return used < u["max_secretaries"]


def create_invite(db: Session, school: School, email: str, role: str, permissions: list, created_by: User):
    """Devolve (invite, token). Só o hash do token é salvo."""
    token = secrets.token_urlsafe(32)
    invite = SchoolInvite(
        school_id=school.id,
        email=email.strip().lower(),
        school_role=role,
        permissions=permissions,
        token_hash=hash_token(token),
        expires_at=datetime.utcnow() + timedelta(days=settings.SCHOOL_INVITE_DAYS),
        created_by_id=created_by.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite, token


def get_valid_invite(db: Session, token: str) -> Optional[SchoolInvite]:
    invite = db.query(SchoolInvite).filter(SchoolInvite.token_hash == hash_token(token)).first()
    if not invite or invite.accepted_at or invite.revoked_at or invite.expires_at <= datetime.utcnow():
        return None
    return invite


def join_school(db: Session, user: User, invite: SchoolInvite):
    """Liga o usuário à escola. Membro não tem trial nem assinatura própria: o acesso segue o diretor."""
    user.school_id = invite.school_id
    user.school_role = invite.school_role
    user.school_permissions = invite.permissions or []
    user.is_trial = False
    user.is_active = True
    invite.accepted_at = datetime.utcnow()
    invite.accepted_user_id = user.id
    db.commit()
    db.refresh(user)
    return user


def remove_member(db: Session, school: School, member: User):
    """Desliga o membro. is_active=False: sem isto, ex-membro sem trial ficaria com acesso grátis.
    As turmas ficam com a escola, sem professor responsável."""
    db.query(Class).filter(Class.owner_id == school.owner_user_id, Class.teacher_id == member.id)\
        .update({Class.teacher_id: None}, synchronize_session=False)
    member.school_id = None
    member.school_role = None
    member.school_permissions = None
    member.is_active = False
    db.commit()
