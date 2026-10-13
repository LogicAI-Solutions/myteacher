from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from backend.models.students import Student
from backend.models.payments import Payment, overdue_clause
from backend.models.classes import Class
from backend.models.attendance import AttendanceSession

def get_dashboard_stats(db: Session, user_id: int):
    # 1. Alunos Ativos vs Inativos
    active_count = db.query(Student).filter(
        Student.owner_id == user_id,
        Student.active == True
    ).count()
    
    inactive_count = db.query(Student).filter(
        Student.owner_id == user_id,
        Student.active == False
    ).count()
    
    # 2. Pagamentos do Mês Atual
    today = date.today()
    current_month = today.month
    current_year = today.year
    
    # Total de pagamentos pagos no mês atual
    payments_paid_count = db.query(Payment).join(Student).filter(
        Student.owner_id == user_id,
        Student.exempt.isnot(True),
        Payment.month == current_month,
        Payment.year == current_year,
        Payment.status == "PAID"
    ).count()
    
    # Total esperado para o mês
    total_payments_expected = db.query(Payment).join(Student).filter(
        Student.owner_id == user_id,
        Student.exempt.isnot(True),
        Payment.month == current_month,
        Payment.year == current_year
    ).count()

    # Mensalidades em atraso (todos os meses, não só o atual)
    overdue_filter = (Student.owner_id == user_id, Student.exempt.isnot(True), overdue_clause(today))
    overdue_count, overdue_amount = db.query(
        func.count(Payment.id), func.coalesce(func.sum(Payment.amount), 0.0)
    ).join(Student).filter(*overdue_filter).one()
    overdue_rows = db.query(Payment, Student.name).join(Student).filter(*overdue_filter)\
        .order_by(Payment.due_date.asc(), Student.name.asc()).limit(5).all()
    overdue_items = [
        {
            "payment_id": p.id,
            "student_id": p.student_id,
            "student_name": name,
            "month": p.month,
            "year": p.year,
            "due_date": p.due_date.isoformat(),
            "days_overdue": (today - p.due_date).days,
            "amount": p.amount or 0.0
        }
        for p, name in overdue_rows
    ]

    # 3. Turmas e Sessões
    classes_count = db.query(Class).filter(Class.owner_id == user_id).count()
    sessions_count = db.query(AttendanceSession).join(Class).filter(Class.owner_id == user_id).count()

    return {
        "overview": {
            "classes_count": classes_count,
            "sessions_count": sessions_count
        },
        "students": {
            "active": active_count,
            "inactive": inactive_count,
            "total": active_count + inactive_count
        },
        "payments": {
            "current_month": current_month,
            "current_year": current_year,
            "paid": payments_paid_count,
            "total_expected": total_payments_expected,
            "pending": total_payments_expected - payments_paid_count,
            "overdue_count": overdue_count,
            "overdue_amount": float(overdue_amount),
            "overdue_items": overdue_items
        }
    }
