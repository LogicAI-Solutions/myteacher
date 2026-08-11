"""Bloqueio do teste grátis: 14 dias contados de trial_started_at."""
import sys, os, asyncio
sys.path.append(os.getcwd())

import pytest
from datetime import datetime, timedelta
from fastapi import HTTPException

from backend.core.config import settings
from backend.core.security import get_current_user
from backend.schemas.users import User


def _user(days_ago, is_trial=True):
    return dict(
        id=1, email="t@t.com", is_active=True, is_admin=False, is_trial=is_trial,
        trial_started_at=datetime.utcnow() - timedelta(days=days_ago),
    )


class _Obj:
    def __init__(self, **kw):
        self.__dict__.update(kw)


def test_dias_restantes_e_expiracao():
    assert settings.TRIAL_DAYS == 14
    ativo = User(**_user(13))
    assert ativo.trial_days_remaining == 1 and ativo.trial_expired is False

    vencido = User(**_user(14))
    assert vencido.trial_days_remaining == 0 and vencido.trial_expired is True

    # Assinante não é bloqueado, mesmo com trial_started_at antigo.
    assert User(**_user(99, is_trial=False)).trial_expired is False


def test_rotas_protegidas_bloqueiam_trial_vencido():
    asyncio.run(get_current_user(_Obj(**_user(13))))  # não levanta

    with pytest.raises(HTTPException) as e:
        asyncio.run(get_current_user(_Obj(**_user(14))))
    assert e.value.status_code == 403 and e.value.detail == "TRIAL_EXPIRED"


def test_rotas_protegidas_bloqueiam_assinatura_cancelada():
    """Assinante que cancelou (is_active=False, sem trial) não pode mais usar nada.
    Mesmo sinal do trial vencido: o front redireciona pro paywall."""
    cancelado = _Obj(id=1, email="c@c.com", is_active=False, is_admin=False,
                     is_trial=False, trial_started_at=None)
    with pytest.raises(HTTPException) as e:
        asyncio.run(get_current_user(cancelado))
    assert e.value.status_code == 403 and e.value.detail == "TRIAL_EXPIRED"

    # Assinante ativo passa livre.
    ativo = _Obj(id=2, email="a@a.com", is_active=True, is_admin=False,
                 is_trial=False, trial_started_at=None)
    asyncio.run(get_current_user(ativo))  # não levanta
