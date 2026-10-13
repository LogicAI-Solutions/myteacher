"""Confirmação de e-mail e recuperação de senha. Os e-mails são capturados (sem SMTP)."""
import sys, os
sys.path.append(os.getcwd())

from urllib.parse import urlparse, parse_qs
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import database, security
from backend.models.users import User
from backend.routers import auth as auth_router
from backend.server import app

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def sent(monkeypatch):
    """Lista de (tipo, destinatário, token) dos e-mails 'enviados'."""
    box = []
    token_of = lambda url: parse_qs(urlparse(url).query)["token"][0]
    monkeypatch.setattr(auth_router.email_service, "send_verification_email", lambda to, url: box.append(("verify", to, token_of(url))))
    monkeypatch.setattr(auth_router.email_service, "send_password_reset_email", lambda to, url: box.append(("reset", to, token_of(url))))
    return box


@pytest.fixture()
def client():
    database.Base.metadata.create_all(bind=engine)
    app.dependency_overrides[database.get_db] = _get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
    database.Base.metadata.drop_all(bind=engine)


def _register(client, email="nova@x.com", password="senha12345"):
    r = client.post("/register", json={"first_name": "Ana", "last_name": "Lima", "email": email, "password": password})
    assert r.status_code == 201, r.text
    return r.json()


def _login(client, email, password):
    return client.post("/token", data={"username": email, "password": password})


def _headers(client, email, password="senha12345"):
    return {"Authorization": f"Bearer {_login(client, email, password).json()['access_token']}"}


def test_cadastro_envia_confirmacao_e_link_confirma(client, sent):
    user = _register(client)
    assert user["email_verified"] is False
    assert [(k, to) for k, to, _ in sent] == [("verify", "nova@x.com")]

    token = sent[0][2]
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200
    me = client.get("/users/me", headers=_headers(client, "nova@x.com")).json()
    assert me["email_verified"] is True
    # Link repetido não quebra (idempotente); token adulterado é recusado
    assert client.post("/auth/verify-email", json={"token": token}).status_code == 200
    assert client.post("/auth/verify-email", json={"token": token + "x"}).status_code == 400


def test_reenviar_confirmacao(client, sent):
    _register(client)
    h = _headers(client, "nova@x.com")
    assert client.post("/auth/resend-verification", headers=h).status_code == 200
    assert [k for k, _, _ in sent] == ["verify", "verify"]
    client.post("/auth/verify-email", json={"token": sent[-1][2]})
    client.post("/auth/resend-verification", headers=h)
    assert len(sent) == 2  # já confirmado: não envia de novo


def test_tokens_de_email_nao_servem_como_login(client, sent):
    _register(client)
    token = sent[0][2]
    assert client.get("/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    # nem um tipo de link serve para o outro fluxo
    assert client.post("/auth/reset-password", json={"token": token, "password": "outrasenha1"}).status_code == 400


def test_esqueci_a_senha_nao_revela_conta(client, sent):
    _register(client)
    sent.clear()
    a = client.post("/auth/forgot-password", json={"email": "nova@x.com"})
    b = client.post("/auth/forgot-password", json={"email": "ninguem@x.com"})
    assert a.status_code == b.status_code == 200 and a.json() == b.json()
    assert [(k, to) for k, to, _ in sent] == [("reset", "nova@x.com")]


def test_redefinir_senha_vale_uma_vez(client, sent):
    _register(client)
    client.post("/auth/forgot-password", json={"email": "NOVA@x.com "})
    token = sent[-1][2]

    assert client.post("/auth/reset-password", json={"token": token, "password": "curta"}).status_code == 422
    assert client.post("/auth/reset-password", json={"token": token, "password": "novasenha123"}).status_code == 200
    assert _login(client, "nova@x.com", "senha12345").status_code == 401
    assert _login(client, "nova@x.com", "novasenha123").status_code == 200
    # O mesmo link não funciona de novo (a senha mudou)
    assert client.post("/auth/reset-password", json={"token": token, "password": "outra12345"}).status_code == 400
    # Quem redefiniu pelo e-mail comprovou a posse dele
    assert client.get("/users/me", headers=_headers(client, "nova@x.com", "novasenha123")).json()["email_verified"] is True


def test_link_expirado(client, sent, monkeypatch):
    _register(client)
    expired = security.create_access_token({"purpose": "verify_email", "email": "nova@x.com"}, expires_delta=security.timedelta(seconds=-1))
    assert client.post("/auth/verify-email", json={"token": expired}).status_code == 400


def test_contas_antigas_nao_ficam_pendentes(client, sent):
    db = TestingSession()
    db.add(User(email="antiga@x.com", hashed_password=security.get_password_hash("senha12345"), is_active=True, is_trial=False))
    db.commit(); db.close()
    me = client.get("/users/me", headers=_headers(client, "antiga@x.com")).json()
    assert me["email_verified"] is None  # front trata None como confirmado
