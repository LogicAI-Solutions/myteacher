from pydantic import BaseModel, computed_field
from datetime import date, datetime
from typing import Optional

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(UserBase):
    password: str
    is_trial: Optional[bool] = False

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    birth_date: Optional[date] = None
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_trial: Optional[bool] = None

class User(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    is_trial: Optional[bool] = False
    trial_started_at: Optional[datetime] = None

    @computed_field
    @property
    def trial_days_remaining(self) -> Optional[int]:
        if not self.is_trial or not self.trial_started_at:
            return None
        elapsed = (datetime.utcnow() - self.trial_started_at).days
        remaining = 7 - elapsed
        return max(remaining, 0)

    @computed_field
    @property
    def trial_expired(self) -> bool:
        if not self.is_trial:
            return False
        if not self.trial_started_at:
            return False
        return (datetime.utcnow() - self.trial_started_at).days >= 7

    class Config:
        from_attributes = True
