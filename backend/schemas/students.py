from pydantic import BaseModel
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

class StudentCreate(StudentBase):
    username: Optional[str] = None
    password: Optional[str] = None

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
    username: Optional[str] = None
    password: Optional[str] = None

class Student(StudentBase):
    id: int
    owner_id: int
    username: Optional[str] = None
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
