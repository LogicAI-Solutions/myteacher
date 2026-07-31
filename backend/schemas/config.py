from pydantic import BaseModel
from typing import Optional

class AppConfigBase(BaseModel):
    key: str
    value: Optional[str] = None

class AppConfigCreate(AppConfigBase):
    pass

class AppConfigUpdate(BaseModel):
    value: Optional[str] = None

class AppConfig(AppConfigBase):
    id: int

    class Config:
        from_attributes = True

class StripePublicConfig(BaseModel):
    stripe_public_key: Optional[str] = None
