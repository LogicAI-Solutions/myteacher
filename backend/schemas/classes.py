from pydantic import BaseModel
from typing import List, Optional
from backend.schemas.students import Student

class ClassBase(BaseModel):
    name: str
    schedule: str

class ClassCreate(ClassBase):
    teacher_id: Optional[int] = None

class ClassReorder(BaseModel):
    id: int
    display_order: int

class Class(ClassBase):
    id: int
    owner_id: int
    display_order: Optional[int] = 0
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None

    # students: List[Student] = [] # Removed to avoid mismatch with ORM model which has 'enrollments'
    class Config:
        from_attributes = True
