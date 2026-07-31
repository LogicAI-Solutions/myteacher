from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PlanFeature(BaseModel):
    text: str
    included: bool

class PlanBase(BaseModel):
    name: str
    description: str
    price: str
    period: str = "/mês"
    stripe_price_id: Optional[str] = None
    role: str
    max_classes: int = 10
    max_teachers: int = 1
    popular: bool = False
    button_text: str = "Assinar"
    features: List[Dict[str, Any]] = []

class PlanCreate(PlanBase):
    pass

class PlanUpdate(PlanBase):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    role: Optional[str] = None

class Plan(PlanBase):
    id: int

    class Config:
        from_attributes = True
