from sqlalchemy import Boolean, Column, Integer, String, Date, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_trial = Column(Boolean, default=False)
    # NULL = conta anterior à confirmação de e-mail (tratada como confirmada); False = pendente
    email_verified = Column(Boolean, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    trial_started_at = Column(DateTime, nullable=True)
    
    # Role and Plan Logic
    role = Column(String, default="autonomous_teacher")
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=True, index=True)
    # Papel na escola: "owner" (diretor) | "teacher" | "secretary"; NULL = professor autônomo
    school_role = Column(String, nullable=True)
    school_permissions = Column(JSON, nullable=True)  # lista de permissões (ver core/access.py)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    plan_id = Column(String, nullable=True)
    max_classes = Column(Integer, default=10)
    
    full_name = Column(String, nullable=True)
    birth_date = Column(Date, nullable=True)
    nickname = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    google_id = Column(String, unique=True, index=True, nullable=True)
    auth_provider = Column(String, default="local")
    google_access_token = Column(String, nullable=True)
    google_refresh_token = Column(String, nullable=True)

    owned_classes = relationship("Class", back_populates="owner", foreign_keys="Class.owner_id")
    students = relationship("Student", back_populates="owner")
    calendar_events = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_password(self) -> bool:
        # Exposto no schema para o Perfil saber se pede a senha atual (conta só-Google não tem).
        return bool(self.hashed_password)
