from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    schedule = Column(String) # e.g., "Monday 18:30"
    owner_id = Column(Integer, ForeignKey("users.id"))
    display_order = Column(Integer, default=0)
    # Professor responsável (escola). Em conta autônoma fica NULL.
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    owner = relationship("User", back_populates="owned_classes", foreign_keys=[owner_id])
    teacher = relationship("User", foreign_keys=[teacher_id])
    enrollments = relationship("Enrollment", back_populates="course_class")
    attendance_sessions = relationship("AttendanceSession", back_populates="course_class")

    @property
    def teacher_name(self):
        return (self.teacher.full_name or self.teacher.email) if self.teacher else None
