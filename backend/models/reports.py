from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from backend.core.database import Base


class ReportSend(Base):
    """Histórico de relatórios mensais enviados aos pais (evita mandar o mesmo mês duas vezes)."""
    __tablename__ = "report_sends"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    channel = Column(String, nullable=False)  # "email"
    to = Column(String, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    sent_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
