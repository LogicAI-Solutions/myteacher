from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator, model_validator
from datetime import date, datetime
from typing import List, Literal, Optional
from backend.core.config import settings

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    google_id: Optional[str] = None
    auth_provider: Optional[str] = "local"

class UserCreate(UserBase):
    password: Optional[str] = None
    is_trial: Optional[bool] = False

class UserRegister(BaseModel):
    """Cadastro público: nome, sobrenome, email e senha."""
    first_name: str = Field(min_length=2, max_length=60)
    last_name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nickname: Optional[str] = None
    # Cadastro pelo plano Escola: a conta já nasce como escola (direção)
    account_type: Literal["autonomous_teacher", "school"] = "autonomous_teacher"
    school_name: Optional[str] = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @model_validator(mode="after")
    def school_needs_name(self):
        if self.account_type == "school" and not (self.school_name or "").strip():
            raise ValueError("Informe o nome da escola.")
        return self

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        return " ".join(value.split())


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_trial: Optional[bool] = None

class UserSelfUpdate(BaseModel):
    """O que o próprio usuário pode mudar em PUT /users/me. Sem is_trial/is_active/email:
    com eles, quem está no teste grátis mandava is_trial=false e usava sem pagar."""
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None


class PasswordUpdate(BaseModel):
    password: str = Field(min_length=8, max_length=128)
    # Obrigatória quando a conta já tem senha; conta só-Google pode definir a primeira.
    current_password: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    is_trial: Optional[bool] = False
    trial_started_at: Optional[datetime] = None
    plan_id: Optional[str] = None
    max_classes: Optional[int] = None
    has_password: bool = False
    email_verified: Optional[bool] = None
    account_type: Optional[str] = None  # "school" | "autonomous_teacher"
    # Escola (preenchidos em /users/me a partir de core/access.py)
    school_id: Optional[int] = None
    school_role: Optional[str] = None
    school_name: Optional[str] = None
    permissions: List[str] = []

    @computed_field
    @property
    def trial_days_remaining(self) -> Optional[int]:
        if not self.is_trial or not self.trial_started_at:
            return None
        elapsed = (datetime.utcnow() - self.trial_started_at).days
        remaining = settings.TRIAL_DAYS - elapsed
        return max(remaining, 0)

    @computed_field
    @property
    def trial_expired(self) -> bool:
        if not self.is_trial:
            return False
        if not self.trial_started_at:
            return False
        return (datetime.utcnow() - self.trial_started_at).days >= settings.TRIAL_DAYS

    class Config:
        from_attributes = True
