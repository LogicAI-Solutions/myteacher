import json
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


def _as_dict(obj) -> dict:
    """stripe>=15 removeu .get() dos objetos e renomeou a conversão recursiva; str() é JSON
    em todas as versões, então é o caminho estável para um dict puro aninhado."""
    return json.loads(str(obj)) if isinstance(obj, stripe.StripeObject) else obj


def _base_url(request: Request) -> str:
    return os.getenv("FRONTEND_URL") or str(request.base_url).rstrip("/")


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


def _activate_from_checkout(db: Session, user: User, session: dict):
    """Ponto único de ativação: usado pelo webhook e pelo /confirm (retorno do Checkout).
    Idempotente — rodar duas vezes com a mesma sessão não muda nada."""
    user.stripe_customer_id = session.get("customer")
    user.stripe_subscription_id = session.get("subscription")
    user.is_trial = False
    user.is_active = True
    _apply_plan(db, user, _plan_by_id(db, (session.get("metadata") or {}).get("plan_id")))
    db.commit()


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

    base_url = _base_url(request)

    # Quem já assina troca de plano no portal do Stripe; abrir um checkout novo
    # criaria uma segunda assinatura e cobraria duas vezes.
    if user.stripe_subscription_id and user.stripe_customer_id:
        return create_portal_session(request, db, user)

    price_id = (plan.stripe_price_id if plan else None) or _cfg(db, "stripe_price_id")
    if not price_id:
        raise HTTPException(status_code=503, detail="Preço da assinatura não configurado.")
    try:
        session = _stripe(db).checkout.Session.create(
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            client_reference_id=str(user.id),
            subscription_data={"metadata": {"plan_id": str(plan.id)}} if plan else {},
            metadata={"plan_id": str(plan.id)} if plan else {},
            customer=user.stripe_customer_id or None,
            customer_email=None if user.stripe_customer_id else user.email,
            # session_id permite ao /confirm ativar a conta na volta, sem esperar o webhook.
            success_url=f"{base_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{base_url}/trial-expired",
        )
    except stripe.InvalidRequestError as e:
        # Config errada (prod_ no lugar de price_, price de outra conta...): causa no detail, não 500 mudo.
        raise HTTPException(status_code=503, detail=f"Stripe: {e.user_message or e}")
    return {"url": session.url}


@router.post("/confirm")
def confirm_checkout(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_user_from_token),
):
    """Retorno do Checkout: confirma direto na API do Stripe que a sessão foi paga e ativa a conta.
    O webhook continua sendo a fonte de verdade para eventos futuros (cancelamento, troca);
    isto só evita que quem pagou fique preso no paywall enquanto o webhook não chega."""
    session = _as_dict(_stripe(db).checkout.Session.retrieve(session_id))
    if session.get("client_reference_id") != str(user.id):
        raise HTTPException(status_code=403, detail="Sessão de pagamento não pertence a este usuário.")
    if session.get("status") == "complete":
        _activate_from_checkout(db, user, session)


@router.post("/portal")
def create_portal_session(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_user_from_token),
):
    """Portal do Stripe: trocar cartão, trocar de plano, ver faturas e cancelar."""
    if not user.stripe_customer_id:
        raise HTTPException(status_code=404, detail="Nenhuma assinatura encontrada.")
    portal = _stripe(db).billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{_base_url(request)}/dashboard/profile",
    )
    return {"url": portal.url}


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

    obj = _as_dict(event["data"]["object"])

    if event["type"] == "checkout.session.completed":
        # client_reference_id pode vir vazio (ex.: link de pagamento criado no Dashboard);
        # sem ele não há usuário para vincular, e levantar erro faria o Stripe reenviar em loop.
        ref = obj.get("client_reference_id")
        user = db.query(User).filter(User.id == int(ref)).first() if ref and ref.isdigit() else None
        if user:
            _activate_from_checkout(db, user, obj)

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        user = db.query(User).filter(User.stripe_subscription_id == obj["id"]).first()
        if user:
            user.is_active = obj["status"] in ("active", "trialing")
            # Troca de plano no Stripe reflete no limite de turmas
            _apply_plan(db, user, _plan_of_subscription(db, obj))
            db.commit()

    return {"received": True}
