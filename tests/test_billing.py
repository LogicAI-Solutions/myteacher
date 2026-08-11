"""Checagem da rota de assinatura: preço resolvido, sessão criada, webhook ativando o usuário."""
import sys, os
sys.path.append(os.getcwd())

from unittest.mock import patch
from backend.routers import billing


class _DB:
    """DB fake: devolve o config/plan/user que o teste precisar."""
    def __init__(self, user=None, cfg=None, plan=None):
        self.user, self.cfg, self.plan, self.committed = user, cfg or {}, plan, False

    def query(self, model):
        self._model = model
        return self

    def filter(self, *_):
        return self

    def first(self):
        from backend.models.config import AppConfig
        from backend.models.plans import Plan
        if self._model is AppConfig:
            return type("C", (), {"value": self.cfg.get("stripe_price_id")})()
        if self._model is Plan:
            return self.plan
        return self.user

    def commit(self):
        self.committed = True


class _User:
    id, email = 7, "prof@escola.com"
    stripe_customer_id = stripe_subscription_id = plan_id = None
    is_trial, is_active = True, True
    max_classes = 9999


class _Plan:
    """Plano Essencial: R$ 47,90 com teto de 5 turmas."""
    id, stripe_price_id, max_classes = 3, "price_essencial", 5


def test_checkout_usa_o_price_configurado():
    db = _DB(cfg={"stripe_price_id": "price_123"})
    with patch.object(billing, "_stripe") as st:
        st.return_value.checkout.Session.create.return_value = type("S", (), {"url": "https://checkout"})()
        req = type("R", (), {"base_url": "http://app/"})()
        assert billing.create_checkout_session(req, None, db, _User())["url"] == "https://checkout"
        kwargs = st.return_value.checkout.Session.create.call_args.kwargs
    assert kwargs["mode"] == "subscription"
    assert kwargs["line_items"] == [{"price": "price_123", "quantity": 1}]
    assert kwargs["client_reference_id"] == "7"  # webhook precisa disso para achar o usuário


def test_checkout_sem_price_falha():
    from fastapi import HTTPException
    import pytest
    with pytest.raises(HTTPException) as e:
        billing.create_checkout_session(type("R", (), {"base_url": "http://app/"})(), None, _DB(), _User())
    assert e.value.status_code == 503


def test_checkout_manda_o_plano_escolhido_e_seu_price():
    db = _DB(plan=_Plan())
    with patch.object(billing, "_stripe") as st:
        st.return_value.checkout.Session.create.return_value = type("S", (), {"url": "https://checkout"})()
        billing.create_checkout_session(type("R", (), {"base_url": "http://app/"})(), 3, db, _User())
        kwargs = st.return_value.checkout.Session.create.call_args.kwargs
    assert kwargs["line_items"] == [{"price": "price_essencial", "quantity": 1}]
    # o webhook depende do metadata para aplicar o limite de turmas
    assert kwargs["metadata"] == {"plan_id": "3"}
    assert kwargs["subscription_data"] == {"metadata": {"plan_id": "3"}}
    # Precisam bater com rotas reais de frontend/src/App.tsx, senão o usuário cai no NotFound.
    # /checkout/success faz poll até o webhook ativar a conta antes de mandar pro painel.
    assert kwargs["success_url"] == "http://app/checkout/success"
    assert kwargs["cancel_url"] == "http://app/trial-expired"


def test_webhook_aplica_limite_de_turmas_do_plano():
    import asyncio
    user = _User()
    db = _DB(user=user, plan=_Plan(), cfg={"stripe_price_id": "whsec"})  # _cfg fake: mesmo valor p/ qualquer key
    event = {
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": "7", "customer": "cus_1",
                            "subscription": "sub_1", "metadata": {"plan_id": "3"}}},
    }
    req = type("R", (), {"headers": {"stripe-signature": "sig"}, "body": lambda self: _async(b"{}")})()
    with patch.object(billing, "_stripe") as st:
        st.return_value.Webhook.construct_event.return_value = event
        asyncio.run(billing.stripe_webhook(req, db))
    assert user.max_classes == 5
    assert user.plan_id == "3"


def test_webhook_encerra_trial_e_guarda_ids():
    import asyncio
    user, db = _User(), None
    db = _DB(user=user, cfg={"stripe_webhook_secret": "whsec"})
    db.cfg["stripe_price_id"] = "whsec"  # _cfg fake devolve o mesmo valor para qualquer key

    event = {
        "type": "checkout.session.completed",
        "data": {"object": {"client_reference_id": "7", "customer": "cus_1", "subscription": "sub_1"}},
    }
    req = type("R", (), {"headers": {"stripe-signature": "sig"}, "body": lambda self: _async(b"{}")})()
    with patch.object(billing, "_stripe") as st:
        st.return_value.Webhook.construct_event.return_value = event
        asyncio.run(billing.stripe_webhook(req, db))

    assert user.is_trial is False and user.is_active is True
    assert (user.stripe_customer_id, user.stripe_subscription_id) == ("cus_1", "sub_1")
    assert db.committed


def test_webhook_cancelamento_desativa_a_conta():
    """Cancelou no Stripe -> customer.subscription.deleted (status 'canceled').
    A conta precisa ficar is_active=False para o portão de acesso bloquear o uso."""
    import asyncio
    user = _User()
    user.is_active = True
    user.stripe_subscription_id = "sub_1"
    db = _DB(user=user, cfg={"stripe_webhook_secret": "whsec"})
    db.cfg["stripe_price_id"] = "whsec"
    event = {
        "type": "customer.subscription.deleted",
        "data": {"object": {"id": "sub_1", "status": "canceled"}},
    }
    req = type("R", (), {"headers": {"stripe-signature": "sig"}, "body": lambda self: _async(b"{}")})()
    with patch.object(billing, "_stripe") as st:
        st.return_value.Webhook.construct_event.return_value = event
        asyncio.run(billing.stripe_webhook(req, db))
    assert user.is_active is False
    assert db.committed


async def _async(value):
    return value


if __name__ == "__main__":
    test_checkout_usa_o_price_configurado()
    test_checkout_manda_o_plano_escolhido_e_seu_price()
    test_webhook_aplica_limite_de_turmas_do_plano()
    test_webhook_encerra_trial_e_guarda_ids()
    test_webhook_cancelamento_desativa_a_conta()
    print("ok")
