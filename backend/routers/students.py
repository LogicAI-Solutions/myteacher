from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import pydantic
from backend.schemas import students as student_schemas
from backend.crud import students as student_crud
from backend.crud import payments as payment_crud
from backend.crud import enrollments as enrollment_crud
from backend.crud import classes as class_crud
from backend.core import database
from backend.core.access import Access, get_access, FINANCE, STUDENTS_MANAGE, REPORTS_VIEW

router = APIRouter()


def _own_student(db: Session, student_id: int, ctx: Access):
    """404 também para aluno de outro tenant/professor: IDs são sequenciais e 403 confirmaria que existe."""
    student = student_crud.get_student_for_owner(db, student_id=student_id, owner_id=ctx.tenant_id, teacher_id=ctx.teacher_scope)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.get("/students/", response_model=student_schemas.StudentListResponse)
def read_students(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    sort_by: Optional[str] = "name",
    sort_desc: bool = False,
    active: Optional[bool] = None,
    payment_status: Optional[str] = None,
    payment_month: Optional[int] = None,
    payment_year: Optional[int] = None,
    db: Session = Depends(database.get_db), 
    ctx: Access = Depends(get_access)
):
    if payment_status:
        ctx.require(FINANCE)
        payment_crud.ensure_monthly_payments(db, ctx.tenant_id)
    students = student_crud.get_students(
        db, 
        user_id=ctx.tenant_id, 
        teacher_id=ctx.teacher_scope,
        skip=skip, 
        limit=limit, 
        search=search, 
        sort_by=sort_by, 
        sort_desc=sort_desc, 
        active_status=active,
        payment_status=payment_status,
        payment_month=payment_month,
        payment_year=payment_year
    )
    total = student_crud.count_students(
        db, 
        user_id=ctx.tenant_id,
        teacher_id=ctx.teacher_scope, 
        search=search,
        active_status=active,
        payment_status=payment_status,
        payment_month=payment_month,
        payment_year=payment_year
    )
    return {"items": students, "total": total}

@router.post("/students/", response_model=student_schemas.Student)
def create_student(student: student_schemas.StudentCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    ctx.require(STUDENTS_MANAGE)
    return student_crud.create_student(db=db, student=student, user_id=ctx.tenant_id)

@router.put("/students/{student_id}", response_model=student_schemas.Student)
def update_student(student_id: int, student_data: student_schemas.StudentCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_student(db, student_id, ctx)
    ctx.require(STUDENTS_MANAGE)
    student = student_crud.update_student(db, student_id=student_id, student_data=student_data)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_student(db, student_id, ctx)
    ctx.require(STUDENTS_MANAGE)
    student = student_crud.delete_student(db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"detail": "Student deleted"}

@router.get("/students/{student_id}/evolution", response_model=List[student_schemas.StudentEvolutionPoint])
def get_student_evolution(student_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_student(db, student_id, ctx)
    results = student_crud.get_student_evolution(db, student_id=student_id)
    
    response = []
    for log in results:
        response.append({
            "date": log.session.date,
            "grade": log.grade,
            "status": log.status
        })
    return response

@router.get("/students/{student_id}/enrollment")
def get_student_enrollment(
    student_id: int, 
    db: Session = Depends(database.get_db), 
    ctx: Access = Depends(get_access)
):
    """Retorna a turma atual do aluno (pode ser null se não estiver em nenhuma)"""
    _own_student(db, student_id, ctx)
    enrollment = enrollment_crud.get_enrollment_for_student(db, student_id=student_id)
    if enrollment:
        # Busca dados da turma para retornar
        class_data = class_crud.get_class(db, class_id=enrollment.class_id)
        return {"class_id": enrollment.class_id, "class_name": class_data.name if class_data else None}
    return {"class_id": None, "class_name": None}

@router.put("/students/{student_id}/enrollment")
def update_student_enrollment(
    student_id: int, 
    class_id: Optional[int] = None,
    db: Session = Depends(database.get_db), 
    ctx: Access = Depends(get_access)
):
    """Atualiza a turma do aluno (pass class_id=null para remover da turma)"""
    _own_student(db, student_id, ctx)
    ctx.require(STUDENTS_MANAGE)
    if class_id and not class_crud.get_class_for_owner(db, class_id=class_id, owner_id=ctx.tenant_id):
        raise HTTPException(status_code=404, detail="Class not found")
    enrollment_crud.change_student_class(db, student_id=student_id, new_class_id=class_id)
    return {"message": "Enrollment updated successfully"}

from backend.core.reports import build_student_report_docx, student_report_filename

@router.post("/students/{student_id}/report/docx")
def generate_student_report(
    student_id: int, 
    report_data: student_schemas.StudentReportRequest,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(database.get_db), 
    ctx: Access = Depends(get_access)
):
    _own_student(db, student_id, ctx)
    ctx.require(REPORTS_VIEW)
    stats = student_crud.get_student_report_stats(db, student_id=student_id, month=month, year=year)
    if not stats:
        raise HTTPException(status_code=404, detail="Student not found")
    
    content = build_student_report_docx(stats, month, year, chart_image=report_data.chart_image)
    filename = student_report_filename(stats, month, year)

    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
