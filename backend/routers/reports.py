"""Relatório mensal para os pais: resumo do mês (frequência, notas, observações) por e-mail,
com o relatório em Word anexo, ou texto pronto para o WhatsApp."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core import database
from backend.core import email as email_service
from backend.core.access import Access, require, REPORTS_VIEW
from backend.core.reports import build_student_report_docx, student_report_filename, monthly_summary
from backend.crud import students as student_crud
from backend.models.reports import ReportSend
from backend.models.students import Student

router = APIRouter()

Month = Query(..., ge=1, le=12)
Year = Query(..., ge=2000, le=2100)


class BulkSend(BaseModel):
    month: int = Field(ge=1, le=12)
    year: int = Field(ge=2000, le=2100)
    resend: bool = False  # reenviar para quem já recebeu este mês


def _sender(ctx: Access) -> str:
    """Assinatura do resumo: nome da escola ou do professor."""
    if ctx.school:
        return ctx.school.name
    return ctx.user.full_name or ctx.user.email


def _own_student(db: Session, ctx: Access, student_id: int) -> Student:
    student = student_crud.get_student_for_owner(db, student_id, ctx.tenant_id, ctx.teacher_scope)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


def _last_sent(db: Session, student_ids, month: int, year: int) -> dict:
    rows = db.query(ReportSend).filter(
        ReportSend.student_id.in_(list(student_ids)), ReportSend.month == month,
        ReportSend.year == year, ReportSend.channel == "email",
    ).order_by(ReportSend.sent_at).all()
    return {r.student_id: r.sent_at for r in rows}  # o último vence


def _build(db: Session, ctx: Access, student: Student, month: int, year: int):
    stats = student_crud.get_student_report_stats(db, student.id, month=month, year=year)
    summary = monthly_summary(stats, month, year, _sender(ctx))
    return stats, summary


def _require_email():
    if not email_service.email_enabled():
        raise HTTPException(status_code=503, detail="O envio de e-mail ainda não está configurado no servidor.")


@router.get("/students/{student_id}/report/monthly")
def preview_monthly_report(student_id: int, month: int = Month, year: int = Year,
                           db: Session = Depends(database.get_db), ctx: Access = Depends(require(REPORTS_VIEW))):
    student = _own_student(db, ctx, student_id)
    _, summary = _build(db, ctx, student, month, year)
    return {
        "text": summary["text"],
        "has_classes": summary["has_classes"],
        "parent_name": student.parent_name,
        "parent_email": student.parent_email,
        "parent_phone": student.parent_phone,
        "email_enabled": email_service.email_enabled(),
        "last_email_sent_at": _last_sent(db, [student.id], month, year).get(student.id),
    }


@router.post("/students/{student_id}/report/monthly/email")
def email_monthly_report(student_id: int, month: int = Month, year: int = Year,
                         db: Session = Depends(database.get_db), ctx: Access = Depends(require(REPORTS_VIEW))):
    student = _own_student(db, ctx, student_id)
    if not (student.parent_email or "").strip():
        raise HTTPException(status_code=422, detail="Cadastre o e-mail do responsável para enviar o relatório.")
    _require_email()
    stats, summary = _build(db, ctx, student, month, year)
    docx = build_student_report_docx(stats, month, year)
    if not email_service.send_monthly_report_email(
        student.parent_email.strip(), summary, docx, student_report_filename(stats, month, year), reply_to=ctx.user.email
    ):
        raise HTTPException(status_code=502, detail="Não foi possível enviar o e-mail agora. Tente de novo.")
    db.add(ReportSend(student_id=student.id, month=month, year=year, channel="email",
                      to=student.parent_email.strip(), sent_by_id=ctx.user.id))
    db.commit()
    return {"detail": f"Relatório enviado para {student.parent_email.strip()}."}


@router.get("/reports/monthly")
def monthly_report_status(month: int = Month, year: int = Year,
                          db: Session = Depends(database.get_db), ctx: Access = Depends(require(REPORTS_VIEW))):
    """Quem recebe o relatório do mês: alunos ativos visíveis, com e-mail do responsável e envio feito."""
    students = student_crud.scoped_students(db, ctx.tenant_id, ctx.teacher_scope)\
        .filter(Student.active.isnot(False)).order_by(Student.name).all()
    sent = _last_sent(db, [s.id for s in students], month, year) if students else {}
    return {
        "email_enabled": email_service.email_enabled(),
        "students": [
            {"id": s.id, "name": s.name, "parent_email": s.parent_email or None, "sent_at": sent.get(s.id)}
            for s in students
        ],
    }


@router.post("/reports/monthly/email")
def email_monthly_reports(payload: BulkSend, background: BackgroundTasks,
                          db: Session = Depends(database.get_db), ctx: Access = Depends(require(REPORTS_VIEW))):
    """Envia o relatório do mês para todos os responsáveis com e-mail. Pula quem não teve aula no mês
    e, sem `resend`, quem já recebeu. Os e-mails saem em segundo plano."""
    _require_email()
    students = student_crud.scoped_students(db, ctx.tenant_id, ctx.teacher_scope)\
        .filter(Student.active.isnot(False)).order_by(Student.name).all()
    already = _last_sent(db, [s.id for s in students], payload.month, payload.year) if students else {}

    queued, no_email, no_classes, skipped_sent = [], [], [], []
    for student in students:
        email = (student.parent_email or "").strip()
        if not email:
            no_email.append(student.name)
            continue
        if student.id in already and not payload.resend:
            skipped_sent.append(student.name)
            continue
        stats, summary = _build(db, ctx, student, payload.month, payload.year)
        if not summary["has_classes"]:
            no_classes.append(student.name)
            continue
        docx = build_student_report_docx(stats, payload.month, payload.year)
        background.add_task(email_service.send_monthly_report_email, email, summary, docx,
                            student_report_filename(stats, payload.month, payload.year), ctx.user.email)
        # Registrado ao enfileirar; falha de SMTP fica no log do servidor
        db.add(ReportSend(student_id=student.id, month=payload.month, year=payload.year, channel="email",
                          to=email, sent_by_id=ctx.user.id, sent_at=datetime.utcnow()))
        queued.append(student.name)
    db.commit()
    return {"sent": queued, "no_email": no_email, "no_classes": no_classes, "already_sent": skipped_sent}
