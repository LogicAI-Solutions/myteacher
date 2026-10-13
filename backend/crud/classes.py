from sqlalchemy.orm import Session
from backend.models.classes import Class
from backend.schemas.classes import ClassCreate, ClassReorder
from typing import List, Optional

def scoped_classes(db: Session, owner_id: int, teacher_id: Optional[int] = None):
    """Turmas visíveis: todas do tenant, ou só as do professor quando teacher_id é dado."""
    query = db.query(Class).filter(Class.owner_id == owner_id)
    if teacher_id is not None:
        query = query.filter(Class.teacher_id == teacher_id)
    return query

def get_classes(db: Session, user_id: int, skip: int = 0, limit: int = 100, teacher_id: Optional[int] = None):
    return scoped_classes(db, user_id, teacher_id).order_by(Class.display_order, Class.id).offset(skip).limit(limit).all()

def reorder_classes(db: Session, user_id: int, order_data: List[ClassReorder]):
    """Update the display_order for multiple classes"""
    for item in order_data:
        db_class = db.query(Class).filter(Class.id == item.id, Class.owner_id == user_id).first()
        if db_class:
            db_class.display_order = item.display_order
    db.commit()
    return get_classes(db, user_id)

def create_class(db: Session, class_: ClassCreate, user_id: int):
    db_class = Class(**class_.model_dump(), owner_id=user_id)
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def get_class(db: Session, class_id: int):
    return db.query(Class).filter(Class.id == class_id).first()

def get_class_for_owner(db: Session, class_id: int, owner_id: int, teacher_id: Optional[int] = None):
    """None quando a turma não existe, é de outro tenant ou de outro professor da escola —
    o router responde 404 em todos os casos."""
    return scoped_classes(db, owner_id, teacher_id).filter(Class.id == class_id).first()

def update_class(db: Session, class_id: int, class_data: ClassCreate):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if db_class:
        db_class.name = class_data.name
        db_class.schedule = class_data.schedule
        if "teacher_id" in class_data.model_fields_set:
            db_class.teacher_id = class_data.teacher_id
        db.commit()
        db.refresh(db_class)
    return db_class

def delete_class(db: Session, class_id: int):
    db_class = db.query(Class).filter(Class.id == class_id).first()
    if db_class:
        db.delete(db_class)
        db.commit()
    return db_class
