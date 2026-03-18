from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from backend.models.students import Student
from backend.models.payments import Payment
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
        Payment.month == current_month,
        Payment.year == current_year,
        Payment.status == "PAID"
    ).count()
    
    # Total esperado para o mês
    total_payments_expected = db.query(Payment).join(Student).filter(
        Student.owner_id == user_id,
        Payment.month == current_month,
        Payment.year == current_year
    ).count()
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
            "pending": total_payments_expected - payments_paid_count
        }
    }
