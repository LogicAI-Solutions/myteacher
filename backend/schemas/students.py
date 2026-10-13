from pydantic import BaseModel, field_validator
from typing import Optional, List
import datetime

class StudentBase(BaseModel):
    name: str
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    school_year: Optional[str] = None
    school: Optional[str] = None
    intended_profession: Optional[str] = None
    class_type: Optional[str] = None
    active: bool = True
    exempt: bool = False
    photo: Optional[str] = None

    @field_validator("exempt", mode="before")
    @classmethod
    def _exempt_null_is_false(cls, v):
        return False if v is None else v

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    school_year: Optional[str] = None
    school: Optional[str] = None
    intended_profession: Optional[str] = None
    class_type: Optional[str] = None
    active: Optional[bool] = None
    exempt: Optional[bool] = None

class Student(StudentBase):
    id: int
    owner_id: int
    class Config:
        from_attributes = True

class StudentListResponse(BaseModel):
    items: List['Student']
    total: int

class StudentEvolutionPoint(BaseModel):
    date: datetime.date
    grade: Optional[float] = None
    status: str

class StudentReportRequest(BaseModel):
    chart_image: Optional[str] = None
