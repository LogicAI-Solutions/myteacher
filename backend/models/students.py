from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Float, Date
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, nullable=True)
    parent_name = Column(String, nullable=True, index=True)
    parent_phone = Column(String, nullable=True)
    parent_email = Column(String, nullable=True)
    school_year = Column(String, nullable=True)
    school = Column(String, nullable=True)
    intended_profession = Column(String, nullable=True)
    class_type = Column(String, nullable=True)
    active = Column(Boolean, default=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    exempt = Column(Boolean, default=False, nullable=True)  # isento de mensalidade (NULL = não isento, linhas antigas)
    photo = Column(String, nullable=True)
    # Mensalidade automática: valor e dia de vencimento; billing_start = quando a cobrança começou
    monthly_fee = Column(Float, nullable=True)
    due_day = Column(Integer, nullable=True)
    billing_start = Column(Date, nullable=True)

    owner = relationship("User", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    payments = relationship("Payment", back_populates="student")
