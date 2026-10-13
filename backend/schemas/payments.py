from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import date

class PaymentBase(BaseModel):
    student_id: int
    month: int
    year: int
    status: str = "PENDING"
    amount: float
    paid_at: Optional[date] = None
    due_date: Optional[date] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    student: Optional['StudentBase'] = None # To display student name if needed

    @computed_field
    @property
    def is_overdue(self) -> bool:
        if self.student is not None and self.student.exempt:
            return False
        return self.status != "PAID" and self.due_date is not None and self.due_date < date.today()

    class Config:
        from_attributes = True

# Forward ref resolving
from backend.schemas.students import StudentBase
Payment.model_rebuild()
