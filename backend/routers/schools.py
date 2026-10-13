"""Escola: diretor cria a escola, convida professores/secretaria por link e define permissões."""
from datetime import datetime
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from backend.core import database, security
from backend.core.access import (
    Access, get_access, require_owner, build_access, clean_perms,
    ALL_PERMS, TEACHER_PERMS, SECRETARY_DEFAULT, CLASSES_MANAGE,
)
from backend.crud import schools as school_crud
from backend.crud import users as users_crud
from backend.models.schools import School, SchoolInvite
from backend.models.users import User
from backend.schemas import users as users_schemas

router = APIRouter()

MemberRole = Literal["teacher", "secretary"]


class SchoolCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class InviteCreate(BaseModel):
    email: EmailStr
    school_role: MemberRole
    permissions: Optional[List[str]] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class MemberUpdate(BaseModel):
    school_role: Optional[MemberRole] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class InviteRegister(BaseModel):
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=8, max_length=128)


def _member_out(user: User, full: bool = True) -> dict:
    out = {"id": user.id, "name": user.full_name or user.email, "school_role": user.school_role}
    if full:
        out.update({
            "email": user.email,
            "is_active": bool(user.is_active),
            "permissions": sorted(TEACHER_PERMS) if user.school_role == "teacher" else clean_perms(user.school_permissions),
        })
    return out


def _invite_out(invite: SchoolInvite) -> dict:
    return {
        "id": invite.id,
        "email": invite.email,
        "school_role": invite.school_role,
        "permissions": invite.permissions or [],
        "expires_at": invite.expires_at,
        "created_at": invite.created_at,
    }


def _school_member(db: Session, ctx: Access, user_id: int) -> User:
    member = db.query(User).filter(
        User.id == user_id, User.school_id == ctx.school.id, User.school_role.in_(("teacher", "secretary"))
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")
    return member


def _no_seat(role: str):
    what = "professores" if role == "teacher" else "secretaria"
    raise HTTPException(status_code=403, detail=f"Limite de {what} do plano atingido.")


# ---- Escola -------------------------------------------------------------------

@router.get("/schools/me")
def read_my_school(db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    out = {
        "school": {"id": ctx.school.id, "name": ctx.school.name} if ctx.school else None,
        "role": ctx.role,
        "permissions": sorted(ctx.perms),
        "catalog": {
            "all": sorted(ALL_PERMS),
            "teacher": sorted(TEACHER_PERMS),
            "secretary_default": SECRETARY_DEFAULT,
        },
    }
    if ctx.is_owner:
        out["usage"] = school_crud.usage(db, ctx.school)
    return out


@router.post("/schools", status_code=status.HTTP_201_CREATED)
def create_school(payload: SchoolCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    if ctx.role != "autonomous":
        raise HTTPException(status_code=409, detail="Esta conta já faz parte de uma escola.")
    user = ctx.user
    school = School(name=payload.name.strip(), owner_user_id=user.id)
    db.add(school)
    db.flush()
    user.school_id = school.id
    user.school_role = "owner"
    user.school_permissions = None
    db.commit()
    return {"id": school.id, "name": school.name}


@router.patch("/schools/me")
def rename_school(payload: SchoolCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    ctx.school.name = payload.name.strip()
    db.commit()
    return {"id": ctx.school.id, "name": ctx.school.name}


# ---- Membros --------------------------------------------------------------------

@router.get("/schools/members")
def list_members(role: Optional[str] = None, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    """Diretor vê tudo; quem gerencia turmas vê a lista (nome/papel) para escolher o professor responsável."""
    if not ctx.school or not (ctx.is_owner or ctx.can(CLASSES_MANAGE)):
        raise HTTPException(status_code=403, detail="Sem permissão para esta ação.")
    if role == "teacher":
        # Diretor também pode dar aula: entra na lista de professores responsáveis
        people = school_crud.members(db, ctx.school, "owner") + school_crud.members(db, ctx.school, "teacher")
    else:
        people = school_crud.members(db, ctx.school, role)
    return [_member_out(u, full=ctx.is_owner) for u in people]


@router.patch("/schools/members/{user_id}")
def update_member(user_id: int, payload: MemberUpdate, db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    member = _school_member(db, ctx, user_id)
    if payload.school_role and payload.school_role != member.school_role:
        if not school_crud.has_seat(db, ctx.school, payload.school_role, counting_invites=False):
            _no_seat(payload.school_role)
        member.school_role = payload.school_role
    if payload.permissions is not None:
        member.school_permissions = clean_perms(payload.permissions)
    if payload.is_active is not None:
        member.is_active = payload.is_active
    db.commit()
    db.refresh(member)
    return _member_out(member)


@router.delete("/schools/members/{user_id}")
def remove_member(user_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    member = _school_member(db, ctx, user_id)
    school_crud.remove_member(db, ctx.school, member)
    return {"detail": "Membro removido"}


# ---- Convites (diretor) -------------------------------------------------------

@router.get("/schools/invites")
def list_invites(db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    return [_invite_out(i) for i in school_crud.pending_invites(db, ctx.school)]


@router.post("/schools/invites", status_code=status.HTTP_201_CREATED)
def create_invite(payload: InviteCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing and existing.school_id == ctx.school.id:
        raise HTTPException(status_code=409, detail="Esta pessoa já faz parte da escola.")
    # Reenviar convite para o mesmo e-mail invalida o anterior
    for old in school_crud.pending_invites(db, ctx.school):
        if old.email == payload.email:
            old.revoked_at = datetime.utcnow()
    db.flush()
    if not school_crud.has_seat(db, ctx.school, payload.school_role, counting_invites=True):
        db.rollback()
        _no_seat(payload.school_role)
    perms = clean_perms(SECRETARY_DEFAULT if payload.permissions is None else payload.permissions)
    if payload.school_role == "teacher":
        perms = []  # professor tem permissões fixas
    invite, token = school_crud.create_invite(db, ctx.school, payload.email, payload.school_role, perms, ctx.user)
    # O token só é devolvido aqui: o banco guarda apenas o hash
    return {**_invite_out(invite), "token": token}


@router.delete("/schools/invites/{invite_id}")
def revoke_invite(invite_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(require_owner)):
    invite = db.query(SchoolInvite).filter(SchoolInvite.id == invite_id, SchoolInvite.school_id == ctx.school.id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    invite.revoked_at = datetime.utcnow()
    db.commit()
    return {"detail": "Convite revogado"}


# ---- Aceite do convite (convidado) --------------------------------------------

def _invite_or_404(db: Session, token: str) -> SchoolInvite:
    invite = school_crud.get_valid_invite(db, token)
    if not invite:
        raise HTTPException(status_code=404, detail="Convite inválido ou expirado.")
    return invite


def _check_seat_on_accept(db: Session, invite: SchoolInvite):
    if not school_crud.has_seat(db, invite.school, invite.school_role, counting_invites=False):
        _no_seat(invite.school_role)


@router.get("/invites/{token}")
def read_invite(token: str, db: Session = Depends(database.get_db)):
    """Público: o link do convite é a prova de que a pessoa recebeu o convite."""
    invite = _invite_or_404(db, token)
    return {
        "school_name": invite.school.name,
        "email": invite.email,
        "school_role": invite.school_role,
        "has_account": db.query(User).filter(User.email == invite.email).first() is not None,
        "expires_at": invite.expires_at,
    }


@router.post("/invites/{token}/register")
def register_with_invite(token: str, payload: InviteRegister, db: Session = Depends(database.get_db)):
    """Cria a conta já como membro da escola (sem teste grátis) e devolve o token de acesso."""
    invite = _invite_or_404(db, token)
    if users_crud.get_user_by_email(db, email=invite.email):
        raise HTTPException(status_code=409, detail="Já existe uma conta com este e-mail. Entre e aceite o convite.")
    _check_seat_on_accept(db, invite)
    full_name = f"{' '.join(payload.first_name.split())} {' '.join(payload.last_name.split())}"
    user = users_crud.create_user(db, users_schemas.UserCreate(
        email=invite.email,
        password=payload.password,
        full_name=full_name,
        nickname=invite.email.split("@")[0],
        is_trial=False,
        auth_provider="local",
    ))
    user.email_verified = True  # o link do convite chegou a este e-mail
    school_crud.join_school(db, user, invite)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": "teacher"},
        expires_delta=security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/invites/{token}/accept")
def accept_invite(token: str, db: Session = Depends(database.get_db), user: User = Depends(security.get_user_from_token)):
    """Conta já existente (senha ou Google) entra na escola."""
    invite = _invite_or_404(db, token)
    if user.email.strip().lower() != invite.email:
        raise HTTPException(status_code=403, detail=f"Este convite é para {invite.email}. Entre com esse e-mail.")
    if user.school_id:
        raise HTTPException(status_code=409, detail="Esta conta já faz parte de uma escola.")
    if user.stripe_subscription_id and user.is_active and not user.is_trial:
        raise HTTPException(status_code=409, detail="Cancele sua assinatura individual antes de entrar na escola, para não pagar duas vezes.")
    _check_seat_on_accept(db, invite)
    school_crud.join_school(db, user, invite)
    ctx = build_access(db, user)
    return {"school": {"id": ctx.school.id, "name": ctx.school.name}, "role": ctx.role}
