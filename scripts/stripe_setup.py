"""Configura a conta Stripe do MyTeacher (produtos, preços, portal, webhook). Idempotente.

Roda contra a chave que estiver em STRIPE_SECRET_KEY — a mesma configuração vale para
sandbox/teste e para o modo live, então a única diferença entre ambientes é a chave:

    # teste (lê o .env da raiz)
    python scripts/stripe_setup.py
    # live (chave restrita, nunca a sk_live_ raiz; não deixe no histórico do shell)
    STRIPE_SECRET_KEY=rk_live_... FRONTEND_URL=https://myteacherapp.com.br python scripts/stripe_setup.py

No fim imprime as linhas STRIPE_PRICE_* / STRIPE_WEBHOOK_SECRET para colar no .env.
Preços são localizados por lookup_key, então rodar de novo nunca duplica nada.
O que a API NÃO cobre (só no Dashboard): ativar a conta (KYC), nome/descriptor da
fatura, logo do Checkout, e-mails de cobrança, Smart Retries.
"""
import os
import sys

import stripe
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

stripe.api_key = os.getenv("STRIPE_SECRET_KEY") or sys.exit("STRIPE_SECRET_KEY não definida")
FRONTEND_URL = (os.getenv("FRONTEND_URL") or "https://myteacherapp.com.br").rstrip("/")
# Webhook precisa de URL pública: em dev local use `stripe listen`, não este endpoint.
WEBHOOK_URL = f"{FRONTEND_URL}/api/billing/webhook" if FRONTEND_URL.startswith("https://") else None
WEBHOOK_EVENTS = ["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"]

# Espelha backend/core/init_db.py — preço em centavos de BRL, cobrança mensal.
PLANS = [
    {"key": "essencial", "env": "STRIPE_PRICE_ESSENCIAL", "name": "MyTeacher - Essencial",
     "description": "Acesso ao MyTeacher com até 5 turmas", "amount": 4790},
    {"key": "profissional", "env": "STRIPE_PRICE_PROFISSIONAL", "name": "MyTeacher - Profissional",
     "description": "Acesso completo ao MyTeacher, turmas ilimitadas", "amount": 9790},
]


def ensure_price(plan: dict) -> stripe.Price:
    lookup_key = f"{plan['key']}_mensal"
    found = stripe.Price.list(lookup_keys=[lookup_key], active=True).data
    if found:
        return found[0]
    product = stripe.Product.create(name=plan["name"], description=plan["description"], metadata={"plan": plan["key"]})
    price = stripe.Price.create(product=product.id, currency="brl", unit_amount=plan["amount"],
                                recurring={"interval": "month"}, lookup_key=lookup_key,
                                nickname=f"{plan['name']} (mensal)", metadata={"plan": plan["key"]})
    stripe.Product.modify(product.id, default_price=price.id)
    return price


def ensure_portal(prices: list) -> stripe.billing_portal.Configuration:
    features = {
        "customer_update": {"enabled": True, "allowed_updates": ["email", "tax_id"]},
        "invoice_history": {"enabled": True},
        "payment_method_update": {"enabled": True},
        "subscription_cancel": {
            "enabled": True, "mode": "at_period_end",
            "cancellation_reason": {"enabled": True,
                                    "options": ["too_expensive", "missing_features", "switched_service", "unused", "other"]},
        },
        "subscription_update": {
            "enabled": True, "default_allowed_updates": ["price"], "proration_behavior": "create_prorations",
            "products": [{"product": p.product, "prices": [p.id]} for p in prices],
        },
    }
    profile = {"headline": "MyTeacher — gerencie sua assinatura",
               "privacy_policy_url": f"{FRONTEND_URL}/privacy", "terms_of_service_url": f"{FRONTEND_URL}/terms"}
    return_url = f"{FRONTEND_URL}/dashboard/profile"
    existing = next((c for c in stripe.billing_portal.Configuration.list(active=True, limit=10).data if c.is_default), None)
    if existing:
        return stripe.billing_portal.Configuration.modify(existing.id, features=features, business_profile=profile,
                                                          default_return_url=return_url)
    return stripe.billing_portal.Configuration.create(features=features, business_profile=profile,
                                                      default_return_url=return_url)


def ensure_webhook():
    if not WEBHOOK_URL:
        print("  webhook: FRONTEND_URL não é https, pulando (use `stripe listen` em dev)")
        return None, None
    existing = next((w for w in stripe.WebhookEndpoint.list(limit=20).data if w.url == WEBHOOK_URL), None)
    if existing:
        return stripe.WebhookEndpoint.modify(existing.id, enabled_events=WEBHOOK_EVENTS, disabled=False), None
    created = stripe.WebhookEndpoint.create(url=WEBHOOK_URL, enabled_events=WEBHOOK_EVENTS,
                                            description="MyTeacher backend (routers/billing.py)")
    return created, created.secret  # secret só é exibido na criação


def main():
    acct = stripe.Account.retrieve()
    mode = "LIVE" if stripe.api_key.startswith(("sk_live", "rk_live")) else "TESTE"
    print(f"Conta {acct.id} ({acct.country}/{acct.default_currency.upper()}) — modo {mode} — "
          f"charges_enabled={acct.charges_enabled}")

    prices = [ensure_price(p) for p in PLANS]
    for plan, price in zip(PLANS, prices):
        print(f"  {plan['name']}: {price.id} (R$ {price.unit_amount/100:.2f}/mês, lookup_key={price.lookup_key})")

    portal = ensure_portal(prices)
    print(f"  portal do cliente: {portal.id} (troca de plano, cancelamento ao fim do período, faturas)")

    webhook, secret = ensure_webhook()
    if webhook:
        print(f"  webhook: {webhook.id} -> {webhook.url} ({webhook.status})")

    print("\n# Cole no .env deste ambiente:")
    for plan, price in zip(PLANS, prices):
        print(f"{plan['env']}={price.id}")
    print(f"STRIPE_PRICE_ID={prices[-1].id}")
    if secret:
        print(f"STRIPE_WEBHOOK_SECRET={secret}")
    elif webhook:
        print("# STRIPE_WEBHOOK_SECRET: endpoint já existia; o segredo está no Dashboard > Developers > Webhooks")


if __name__ == "__main__":
    main()
