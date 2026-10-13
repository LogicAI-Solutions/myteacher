from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Float, Text, Boolean
from sqlalchemy.orm import relationship
from backend.core.database import Base

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    date = Column(Date)
    description = Column(String) # e.g. "Aula 01"
    lesson_number = Column(Integer, default=1)
    # Auditoria: quem lançou e quem editou por último a chamada
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, nullable=True)

    course_class = relationship("Class", back_populates="attendance_sessions")
    logs = relationship("AttendanceLog", back_populates="session", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])

    @property
    def created_by_name(self):
        return (self.created_by.full_name or self.created_by.email) if self.created_by else None

    @property
    def updated_by_name(self):
        return (self.updated_by.full_name or self.updated_by.email) if self.updated_by else None

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    status = Column(String) # "present", "absent"
    essay_delivered = Column(Boolean, default=False)
    grade = Column(Float, nullable=True) # 960
    observation = Column(Text, nullable=True)
    essay_image = Column(String, nullable=True)

    session = relationship("AttendanceSession", back_populates="logs")
    student = relationship("Student")
