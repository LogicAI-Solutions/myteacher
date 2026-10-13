from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.core import database
from backend.core.access import Access, get_access, FINANCE
from backend.crud import alerts as alerts_crud

router = APIRouter()


@router.get("/alerts")
def read_alerts(db: Session = Depends(database.get_db), ctx: Access = Depends(get_access)):
    """Sininho: alunos em risco de desistência dentro do que a pessoa enxerga.
    Professor de escola vê só as faltas dos alunos das turmas dele (sem financeiro)."""
    return alerts_crud.get_risk_alerts(
        db, ctx.tenant_id, teacher_id=ctx.teacher_scope, include_finance=ctx.can(FINANCE)
    )
