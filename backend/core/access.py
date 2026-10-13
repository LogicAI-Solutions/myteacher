"""Quem pode ver e fazer o quê.

Conta autônoma: o professor é o dono (tenant) dos próprios dados.
Escola: o tenant é o diretor — alunos e turmas têm owner_id = diretor, então os filtros
`owner_id == tenant_id` continuam valendo. Professor fica restrito às turmas com
teacher_id == ele (teacher_scope); secretaria vê tudo e age conforme as permissões
que o diretor marcou.

Fora do escopo -> 404 (não confirma que o recurso existe). No escopo mas sem permissão -> 403.
"""
from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.core import database, security
from backend.models.users import User
from backend.models.schools import School

ATTENDANCE_EDIT = "attendance.edit"
STUDENTS_MANAGE = "students.manage"
CLASSES_MANAGE = "classes.manage"
FINANCE = "finance"
REPORTS_VIEW = "reports.view"

ALL_PERMS = frozenset({ATTENDANCE_EDIT, STUDENTS_MANAGE, CLASSES_MANAGE, FINANCE, REPORTS_VIEW})
# Fixas no MVP; financeiro nunca vale para professor.
TEACHER_PERMS = frozenset({ATTENDANCE_EDIT, REPORTS_VIEW})
SECRETARY_DEFAULT = [STUDENTS_MANAGE, CLASSES_MANAGE, REPORTS_VIEW]


def clean_perms(perms) -> list:
    return sorted(set(perms or []) & ALL_PERMS)


@dataclass
class Access:
    user: User
    tenant_id: int
    tenant_owner: User
    school: Optional[School]
    role: str  # "autonomous" | "owner" | "teacher" | "secretary"
    perms: frozenset

    @property
    def teacher_scope(self) -> Optional[int]:
        """Id do professor quando o acesso é restrito às turmas dele; None = vê tudo do tenant."""
        return self.user.id if self.role == "teacher" else None

    @property
    def is_owner(self) -> bool:
        return self.role == "owner"

    def can(self, perm: str) -> bool:
        return perm in self.perms

    def require(self, perm: str):
        if not self.can(perm):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão para esta ação.")


def build_access(db: Session, user: User) -> Access:
    if user.school_id and user.school_role:
        school = db.query(School).filter(School.id == user.school_id).first()
        if school:
            if user.school_role == "owner" and school.owner_user_id == user.id:
                return Access(user, user.id, user, school, "owner", ALL_PERMS)
            owner = school.owner
            if user.school_role == "teacher":
                perms = TEACHER_PERMS
            else:
                perms = frozenset(clean_perms(user.school_permissions)) - {"school.manage"}
            return Access(user, owner.id, owner, school, user.school_role, perms)
    return Access(user, user.id, user, None, "autonomous", ALL_PERMS)


def get_access(user: User = Depends(security.get_current_user), db: Session = Depends(database.get_db)) -> Access:
    return build_access(db, user)


def require(perm: str):
    """Dependência: `ctx: Access = Depends(require(FINANCE))`."""
    def _dep(ctx: Access = Depends(get_access)) -> Access:
        ctx.require(perm)
        return ctx
    return _dep


def require_owner(ctx: Access = Depends(get_access)) -> Access:
    if not ctx.is_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas a direção da escola.")
    return ctx
