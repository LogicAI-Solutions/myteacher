from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.core.database import get_db
from backend.models.plans import Plan as PlanModel
from backend.schemas.plans import Plan, PlanCreate, PlanUpdate
from backend.core.security import get_current_active_user

router = APIRouter(prefix="/plans", tags=["plans"])

@router.get("/", response_model=List[Plan])
def get_plans(db: Session = Depends(get_db)):
    return db.query(PlanModel).all()

@router.post("/", response_model=Plan)
def create_plan(plan: PlanCreate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    db_plan = PlanModel(**plan.model_dump())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.put("/{plan_id}", response_model=Plan)
def update_plan(plan_id: int, plan: PlanUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    
    db_plan = db.query(PlanModel).filter(PlanModel.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    update_data = plan.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_plan, key, value)
        
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    db_plan = db.query(PlanModel).filter(PlanModel.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
        
    db.delete(db_plan)
    db.commit()
    return {"ok": True}
