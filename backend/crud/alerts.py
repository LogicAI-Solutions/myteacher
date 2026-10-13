"""Alertas de risco de desistência: aluno sumido das aulas ou com mensalidade atrasada.

Vale igual para professor autônomo e escola: o escopo vem de quem pergunta
(tenant + turmas do professor), e o financeiro só entra para quem tem acesso a ele.
"""
from collections import defaultdict
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from backend.models.attendance import AttendanceLog, AttendanceSession
from backend.models.classes import Class
from backend.models.enrollments import Enrollment
from backend.models.payments import Payment, overdue_clause
from backend.models.students import Student
from backend.crud.classes import scoped_classes

ABSENCE_WINDOW_DAYS = 14   # "sumiu há 2 semanas"
MIN_SESSIONS_IN_WINDOW = 2  # uma falta isolada não é sumiço
PRESENT = "present"


def _absence_alerts(db: Session, owner_id: int, teacher_id: Optional[int], today: date) -> dict:
    """Aluno ativo que faltou a todas as aulas da turma nos últimos 14 dias (mínimo de 2 aulas)."""
    classes = scoped_classes(db, owner_id, teacher_id).all()
    if not classes:
        return {}
    class_names = {c.id: c.name for c in classes}
    since = today - timedelta(days=ABSENCE_WINDOW_DAYS)

    sessions = db.query(AttendanceSession).filter(
        AttendanceSession.class_id.in_(class_names.keys()),
        AttendanceSession.date <= today,
    ).order_by(AttendanceSession.date.desc()).all()
    sessions_by_class = defaultdict(list)
    for s in sessions:
        sessions_by_class[s.class_id].append(s)

    enrollments = db.query(Enrollment.class_id, Student).join(Student, Student.id == Enrollment.student_id).filter(
        Enrollment.class_id.in_(class_names.keys()),
        Student.owner_id == owner_id,
        Student.active.isnot(False),
    ).all()

    present = {
        (log.session_id, log.student_id)
        for log in db.query(AttendanceLog).filter(
            AttendanceLog.session_id.in_([s.id for s in sessions]),
            AttendanceLog.status == PRESENT,
        )
    } if sessions else set()

    alerts = {}
    for class_id, student in enrollments:
        class_sessions = sessions_by_class.get(class_id, [])  # mais recente primeiro
        recent = [s for s in class_sessions if s.date >= since]
        if len(recent) < MIN_SESSIONS_IN_WINDOW:
            continue
        if any((s.id, student.id) in present for s in recent):
            continue
        # Faltas seguidas (para a mensagem) e última presença (para o alerta "renascer" se ele voltar e sumir de novo)
        streak, last_present = 0, None
        for s in class_sessions:
            if (s.id, student.id) in present:
                last_present = s.date
                break
            streak += 1
        alerts[student.id] = {
            "student": student,
            "class_id": class_id,
            "class_name": class_names[class_id],
            "absences": streak,
            "last_present": last_present,
            "since": recent[-1].date,
        }
    return alerts


def _payment_alerts(db: Session, owner_id: int, today: date) -> dict:
    rows = db.query(Payment, Student).join(Student, Student.id == Payment.student_id).filter(
        Student.owner_id == owner_id,
        Student.exempt.isnot(True),
        Student.active.isnot(False),
        overdue_clause(today),
    ).all()
    alerts = {}
    for payment, student in rows:
        a = alerts.setdefault(student.id, {"student": student, "count": 0, "amount": 0.0, "oldest": payment.due_date, "ids": []})
        a["count"] += 1
        a["amount"] += payment.amount or 0.0
        a["oldest"] = min(a["oldest"], payment.due_date)
        a["ids"].append(payment.id)
    return alerts


def get_risk_alerts(db: Session, owner_id: int, teacher_id: Optional[int] = None,
                    include_finance: bool = True, today: Optional[date] = None) -> list:
    """Um alerta por aluno, com os motivos. Mais grave primeiro: os dois sinais juntos, depois o mais antigo."""
    today = today or date.today()
    absences = _absence_alerts(db, owner_id, teacher_id, today)
    payments = _payment_alerts(db, owner_id, today) if include_finance else {}

    out = []
    for student_id in set(absences) | set(payments):
        reasons = []
        key_parts = []
        a = absences.get(student_id)
        p = payments.get(student_id)
        student = (a or p)["student"]
        if a:
            reasons.append({
                "type": "absence",
                "text": f"Faltou às últimas {a['absences']} aulas de {a['class_name']}"
                        + (f" (última presença em {a['last_present'].strftime('%d/%m')})" if a["last_present"] else " (nenhuma presença registrada)"),
                "class_id": a["class_id"],
            })
            key_parts.append(f"a{a['last_present'] or 'never'}")
        if p:
            days = (today - p["oldest"]).days
            reasons.append({
                "type": "payment",
                "text": (f"{p['count']} mensalidades atrasadas" if p["count"] > 1 else "Mensalidade atrasada")
                        + f" há {days} dia{'s' if days != 1 else ''} (R$ {p['amount']:.2f})".replace(".", ","),
                "days_overdue": days,
            })
            key_parts.append("p" + "-".join(map(str, sorted(p["ids"]))))
        level = "high" if (a and p) or (p and p["count"] >= 2) or (a and a["absences"] >= 4) else "medium"
        out.append({
            # Muda quando surge um fato novo (outra falta depois de voltar, outra mensalidade): o front reabre o alerta
            "key": f"{student_id}:" + "|".join(key_parts),
            "student_id": student_id,
            "student_name": student.name,
            "level": level,
            "reasons": reasons,
            "_sort": (0 if level == "high" else 1, -len(reasons), -(p and (today - p["oldest"]).days or 0), -(a and a["absences"] or 0)),
        })
    out.sort(key=lambda x: (x["_sort"], x["student_name"]))
    for item in out:
        item.pop("_sort")
    return out
