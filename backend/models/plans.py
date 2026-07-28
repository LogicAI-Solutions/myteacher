from sqlalchemy import Column, Integer, String, Boolean, JSON
from backend.core.database import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String)
    price = Column(String)
    period = Column(String, default="/mês")
    stripe_price_id = Column(String, nullable=True)
    
    # Logic fields
    role = Column(String) # autonomous_teacher, school_admin
    max_classes = Column(Integer, default=10)
    max_teachers = Column(Integer, default=1)
    
    # UI specific
    popular = Column(Boolean, default=False)
    button_text = Column(String, default="Assinar")
    features = Column(JSON) # [{"text": "Até 10 turmas", "included": true}]
