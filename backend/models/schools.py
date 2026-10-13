from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from backend.core.database import Base


class School(Base):
    """Escola: o diretor (owner_user) é o tenant — alunos/turmas da escola têm owner_id = diretor."""
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", foreign_keys=[owner_user_id])


class SchoolInvite(Base):
    __tablename__ = "school_invites"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id"), index=True, nullable=False)
    email = Column(String, index=True, nullable=False)
    school_role = Column(String, nullable=False)  # "teacher" | "secretary"
    permissions = Column(JSON, nullable=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)  # sha256 do token; o token em si nunca é salvo
    expires_at = Column(DateTime, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    accepted_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    school = relationship("School")
