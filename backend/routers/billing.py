import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.core.database import get_db
from backend.core.security import get_user_from_token
from backend.models.config import AppConfig
from backend.models.plans import Plan
from backend.models.users import User

router = APIRouter(prefix="/billing", tags=["billing"])


def _cfg(db: Session, key: str) -> str | None:
    """Env vence o banco: em produção as chaves live vêm do .env e não podem ser
    anuladas por um valor de teste que ficou salvo em Configurações."""
    row = db.query(AppConfig).filter(AppConfig.key == key).first()
    return os.getenv(key.upper()) or (row.value if row else None) or None


def _stripe(db: Session):
    stripe.api_key = _cfg(db, "stripe_secret_key")
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe não configurado. Defina a chave secreta em Configurações.")
    return stripe


def _apply_plan(db: Session, user: User, plan: Plan | None):
    """Grava o limite de turmas do plano assinado. O limite é aplicado em routers/classes.py."""
    if plan:
        user.plan_id = str(plan.id)
        user.max_classes = plan.max_classes
        # Turmas já criadas acima do novo limite continuam existindo; só bloqueia criar novas.


def _plan_by_id(db: Session, plan_id: str | None) -> Plan | None:
    return db.query(Plan).filter(Plan.id == int(plan_id)).first() if plan_id else None


def _plan_of_subscription(db: Session, sub: dict) -> Plan | None:
    """Plano pelo price da assinatura: troca de plano feita no portal do Stripe
    não copia o metadata original, então o price é a única fonte confiável."""
    items = (sub.get("items") or {}).get("data") or []
    price_id = items[0].get("price", {}).get("id") if items else None
    plan = db.query(Plan).filter(Plan.stripe_price_id == price_id).first() if price_id else None
    return plan or _plan_by_id(db, (sub.get("metadata") or {}).get("plan_id"))


@router.post("/checkout")
def create_checkout_session(
    request: Request,
    plan_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_user_from_token),
):
    """Cria a sessão de pagamento da assinatura mensal e devolve a URL do Stripe Checkout."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first() if plan_id else None
    if plan_id and not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    base_url = os.getenv("FRONTEND_URL") or str(request.base_url).rstrip("/")

    # Quem já assina troca de plano no portal do Stripe; abrir um checkout novo
    # criaria uma segunda assinatura e cobraria duas vezes.
    if user.stripe_subscription_id and user.stripe_customer_id:
        portal = _stripe(db).billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{base_url}/dashboard/profile",
        )
        return {"url": portal.url}

    price_id = (plan.stripe_price_id if plan else None) or _cfg(db, "stripe_price_id")
    if not price_id:
        raise HTTPException(status_code=503, detail="Preço da assinatura não configurado.")

    session = _stripe(db).checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        client_reference_id=str(user.id),
        subscription_data={"metadata": {"plan_id": str(plan.id)}} if plan else {},
        metadata={"plan_id": str(plan.id)} if plan else {},
        customer=user.stripe_customer_id or None,
        customer_email=None if user.stripe_customer_id else user.email,
        success_url=f"{base_url}/checkout/success",
        cancel_url=f"{base_url}/trial-expired",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    secret = _cfg(db, "stripe_webhook_secret")
    if not secret:
        raise HTTPException(status_code=503, detail="Chave do webhook não configurada.")
    client = _stripe(db)
    try:
        event = client.Webhook.construct_event(
            await request.body(), request.headers.get("stripe-signature"), secret
        )
    except Exception:
        # construct_event só levanta ValueError / SignatureVerificationError
        raise HTTPException(status_code=400, detail="Assinatura do webhook inválida")

    obj = event["data"]["object"]

    if event["type"] == "checkout.session.completed":
        # client_reference_id pode vir vazio (ex.: link de pagamento criado no Dashboard);
        # sem ele não há usuário para vincular, e levantar erro faria o Stripe reenviar em loop.
        ref = obj.get("client_reference_id")
        user = db.query(User).filter(User.id == int(ref)).first() if ref and ref.isdigit() else None
        if user:
            user.stripe_customer_id = obj.get("customer")
            user.stripe_subscription_id = obj.get("subscription")
            user.is_trial = False
            user.is_active = True
            _apply_plan(db, user, _plan_by_id(db, (obj.get("metadata") or {}).get("plan_id")))
            db.commit()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        user = db.query(User).filter(User.stripe_subscription_id == obj["id"]).first()
        if user:
            user.is_active = obj["status"] in ("active", "trialing")
            # Troca de plano no Stripe reflete no limite de turmas
            _apply_plan(db, user, _plan_of_subscription(db, obj))
            db.commit()

    return {"received": True}
