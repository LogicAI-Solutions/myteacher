from sqlalchemy.orm import Session
from backend.models.payments import Payment, overdue_clause
import calendar
from datetime import date
from backend.schemas.payments import PaymentCreate
from typing import List, Optional

from backend.models.students import Student

def get_payments(db: Session, user_id: int, student_id: Optional[int] = None, year: Optional[int] = None, month: Optional[int] = None, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    query = db.query(Payment).join(Student, Payment.student_id == Student.id).filter(Student.owner_id == user_id)
    
    if student_id:
        query = query.filter(Payment.student_id == student_id)
    if year:
        query = query.filter(Payment.year == year)
    if month:
        query = query.filter(Payment.month == month)
    if search:
        query = query.filter(Student.name.ilike(f"%{search}%"))
        
    return query.offset(skip).limit(limit).all()

def create_payment(db: Session, payment: PaymentCreate):
    db_payment = Payment(
        student_id=payment.student_id,
        month=payment.month,
        year=payment.year,
        status=payment.status,
        amount=payment.amount,
        paid_at=payment.paid_at,
        due_date=payment.due_date
    )
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment

def update_payment(db: Session, payment_id: int, payment_data: PaymentCreate, owner_id: int):
    payment = db.query(Payment).join(Student, Payment.student_id == Student.id)\
        .filter(Payment.id == payment_id, Student.owner_id == owner_id).first()
    if payment:
        payment.status = payment_data.status
        payment.amount = payment_data.amount
        payment.paid_at = payment_data.paid_at
        # Clientes que não enviam due_date (ex.: aba de pagamentos da turma) não apagam o vencimento
        if "due_date" in payment_data.model_fields_set:
            payment.due_date = payment_data.due_date
        db.commit()
        db.refresh(payment)
    return payment
    
def get_payment_stats(db: Session, user_id: int, month: int, year: int):
    # Alunos isentes não pagam mensalidade: ficam fora de todos os números do financeiro.
    # Total Active Students for the user
    # Ideally should we count inactive? The original code counted ALL students owned by user from API
    total_students = db.query(Student).filter(Student.owner_id == user_id, Student.exempt.isnot(True)).count()
    
    # Paid Payments for this month/year for students owned by user
    # Note: Join Student to ensure ownership
    paid_query = db.query(Payment).join(Student).filter(
        Student.owner_id == user_id,
        Student.exempt.isnot(True),
        Payment.month == month,
        Payment.year == year,
        Payment.status == 'PAID'
    )
    paid_count = paid_query.count()
    
    # Total Received (Sum amount)
    from sqlalchemy import func
    total_received = db.query(func.sum(Payment.amount)).join(Student).filter(
        Student.owner_id == user_id,
        Student.exempt.isnot(True),
        Payment.month == month,
        Payment.year == year,
        Payment.status == 'PAID'
    ).scalar() or 0.0
    
    overdue_query = db.query(func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0)).join(Student).filter(
        Student.owner_id == user_id,
        Student.exempt.isnot(True),
        Payment.month == month,
        Payment.year == year,
        overdue_clause(date.today())
    )
    overdue_count, overdue_amount = overdue_query.one()

    return {
        "total_students": total_students,
        "paid_count": paid_count,
        "pending_count": total_students - paid_count,
        "total_received": total_received,
        "overdue_count": overdue_count,
        "overdue_amount": float(overdue_amount)
    }


MAX_BACKFILL_MONTHS = 12  # quem ficou meses sem abrir o sistema: gera no máximo um ano para trás


def _due_date(year: int, month: int, due_day):
    """Dia do vencimento no mês; 31 em fevereiro vira o último dia do mês."""
    if not due_day:
        return None
    return date(year, month, min(due_day, calendar.monthrange(year, month)[1]))


def _first_billing_month(student: Student):
    """Mês da primeira cobrança: o do início, ou o seguinte se o vencimento daquele mês já tinha passado
    (configurar dia 10 no dia 20 não cria uma mensalidade já atrasada)."""
    start = student.billing_start
    if student.due_day and _due_date(start.year, start.month, student.due_day) < start:
        return (start.year + 1, 1) if start.month == 12 else (start.year, start.month + 1)
    return (start.year, start.month)


def ensure_monthly_payments(db: Session, owner_id: int, today: date = None) -> int:
    """Cria as mensalidades que faltam, do início da cobrança de cada aluno até o mês atual.
    Idempotente: mês que já tem lançamento (qualquer situação, inclusive manual) não é tocado.
    Isento, inativo e aluno sem valor de mensalidade ficam de fora. Devolve quantas criou."""
    today = today or date.today()
    students = db.query(Student).filter(
        Student.owner_id == owner_id,
        Student.monthly_fee.isnot(None),
        Student.monthly_fee > 0,
        Student.billing_start.isnot(None),
        Student.exempt.isnot(True),
        Student.active.isnot(False),
    ).all()
    if not students:
        return 0

    floor_index = today.year * 12 + today.month - 1 - (MAX_BACKFILL_MONTHS - 1)
    existing = {
        (sid, y, m)
        for sid, y, m in db.query(Payment.student_id, Payment.year, Payment.month)
        .filter(Payment.student_id.in_([s.id for s in students])).all()
    }
    created = 0
    current_index = today.year * 12 + today.month - 1
    for student in students:
        y, m = _first_billing_month(student)
        index = max(y * 12 + m - 1, floor_index)
        while index <= current_index:
            year, month = divmod(index, 12)
            month += 1
            if (student.id, year, month) not in existing:
                db.add(Payment(
                    student_id=student.id, month=month, year=year, status="PENDING",
                    amount=student.monthly_fee, due_date=_due_date(year, month, student.due_day),
                ))
                created += 1
            index += 1
    if created:
        db.commit()
    return created
