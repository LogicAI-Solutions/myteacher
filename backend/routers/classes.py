from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.schemas import classes as class_schemas
from backend.schemas import students as student_schemas
from backend.schemas import attendance as attendance_schemas
from backend.crud import classes as class_crud
from backend.crud import enrollments as enrollment_crud
from backend.crud import attendance as attendance_crud
from backend.crud import students as student_crud
from backend.core import database
from backend.core.access import Access, get_access, require, ATTENDANCE_EDIT, CLASSES_MANAGE, STUDENTS_MANAGE
from backend.models.classes import Class as ClassModel
from backend.models.users import User

router = APIRouter()


def _own_class(db: Session, class_id: int, ctx: Access):
    """404 também para turma de outro professor/tenant: IDs são sequenciais e 403 confirmaria que existe."""
    db_class = class_crud.get_class_for_owner(db, class_id=class_id, owner_id=ctx.tenant_id, teacher_id=ctx.teacher_scope)
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")
    return db_class


def _check_teacher(db: Session, ctx: Access, teacher_id: Optional[int]):
    """Professor responsável precisa ser membro (diretor ou professor) da mesma escola."""
    if teacher_id is None:
        return
    if not ctx.school:
        raise HTTPException(status_code=422, detail="Professor responsável só existe em conta de escola.")
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.school_id == ctx.school.id,
        User.school_role.in_(("owner", "teacher")),
    ).first()
    if not teacher:
        raise HTTPException(status_code=422, detail="Professor não pertence à escola.")


@router.get("/classes/", response_model=List[class_schemas.Class])
def read_classes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    return class_crud.get_classes(db, user_id=ctx.tenant_id, skip=skip, limit=limit, teacher_id=ctx.teacher_scope)

@router.put("/classes/reorder", response_model=List[class_schemas.Class])
def reorder_classes(order_data: List[class_schemas.ClassReorder], db: Session = Depends(database.get_db), ctx: Access = Depends(require(CLASSES_MANAGE))):
    return class_crud.reorder_classes(db=db, user_id=ctx.tenant_id, order_data=order_data)

@router.post("/classes/", response_model=class_schemas.Class)
def create_class(class_: class_schemas.ClassCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(require(CLASSES_MANAGE))):
    # Limite de turmas é do plano de quem paga (o diretor, em escola)
    max_classes = ctx.tenant_owner.max_classes
    current_class_count = db.query(ClassModel).filter(ClassModel.owner_id == ctx.tenant_id).count()
    if max_classes and current_class_count >= max_classes:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Limite de turmas atingido. O seu plano permite no máximo {max_classes} turmas."
        )
    _check_teacher(db, ctx, class_.teacher_id)
    return class_crud.create_class(db=db, class_=class_, user_id=ctx.tenant_id)

@router.get("/classes/{class_id}", response_model=class_schemas.Class)
def read_class(class_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    return _own_class(db, class_id, ctx)

@router.put("/classes/{class_id}", response_model=class_schemas.Class)
def update_class(class_id: int, class_data: class_schemas.ClassCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(require(CLASSES_MANAGE))):
    _own_class(db, class_id, ctx)
    if "teacher_id" in class_data.model_fields_set:
        _check_teacher(db, ctx, class_data.teacher_id)
    return class_crud.update_class(db=db, class_id=class_id, class_data=class_data)

@router.delete("/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(require(CLASSES_MANAGE))):
    _own_class(db, class_id, ctx)
    class_crud.delete_class(db=db, class_id=class_id)
    return {"message": "Class deleted successfully"}

@router.get("/classes/{class_id}/students", response_model=List[student_schemas.Student])
def read_class_students(class_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_class(db, class_id, ctx)
    return enrollment_crud.get_students_for_class(db, class_id=class_id)

@router.get("/classes/{class_id}/attendance", response_model=List[attendance_schemas.AttendanceSession])
def read_attendance_sessions(class_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_class(db, class_id, ctx)
    return attendance_crud.get_class_attendance_sessions(db, class_id=class_id)

@router.post("/classes/{class_id}/attendance", response_model=attendance_schemas.AttendanceSession)
def create_attendance_session(class_id: int, session: attendance_schemas.AttendanceSessionCreate, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_class(db, class_id, ctx)
    ctx.require(ATTENDANCE_EDIT)
    if not student_crud.owns_all_students(db, [log.student_id for log in session.logs], ctx.tenant_id):
        raise HTTPException(status_code=404, detail="Student not found")
    return attendance_crud.create_attendance_session(db=db, session=session, class_id=class_id, user_id=ctx.user.id)

@router.post("/classes/{class_id}/enroll/{student_id}")
def enroll_student_in_class(class_id: int, student_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_class(db, class_id, ctx)
    ctx.require(STUDENTS_MANAGE)
    if not student_crud.get_student_for_owner(db, student_id=student_id, owner_id=ctx.tenant_id):
        raise HTTPException(status_code=404, detail="Student not found")
    return enrollment_crud.enroll_student(db, class_id=class_id, student_id=student_id)

@router.delete("/classes/{class_id}/enroll/{student_id}")
def unenroll_student_from_class(class_id: int, student_id: int, db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    _own_class(db, class_id, ctx)
    ctx.require(STUDENTS_MANAGE)
    enrollment_crud.unenroll_student(db, class_id=class_id, student_id=student_id)
    return {"message": "Student unenrolled successfully"}
