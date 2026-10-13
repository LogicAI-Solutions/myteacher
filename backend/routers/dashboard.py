from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.access import Access, get_access, FINANCE
from backend.crud import dashboard as dashboard_crud
from backend.crud import payments as payment_crud

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    responses={404: {"description": "Not found"}},
)

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    ctx: Access = Depends(get_access)
):
    if ctx.can(FINANCE):
        payment_crud.ensure_monthly_payments(db, ctx.tenant_id)
    return dashboard_crud.get_dashboard_stats(
        db, ctx.tenant_id, teacher_id=ctx.teacher_scope, include_finance=ctx.can(FINANCE)
    )
