"""Regressões de segurança: posse de recursos, token de aluno, autoedição do perfil e OAuth.
Usa a API de verdade (TestClient) sobre SQLite em memória."""
import sys, os
sys.path.append(os.getcwd())

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import database, security
from backend.core.config import Settings
from backend.models.users import User
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
def client():
    database.Base.metadata.create_all(bind=engine)
    app.dependency_overrides[database.get_db] = _get_db
    # Sem `with`: o lifespan criaria tabelas no Postgres de database.engine.
    yield TestClient(app)
    app.dependency_overrides.clear()
    database.Base.metadata.drop_all(bind=engine)


def _teacher(email, password="senha12345"):
    db = TestingSession()
    db.add(User(email=email, hashed_password=security.get_password_hash(password), is_active=True, is_trial=False))
    db.commit()
    db.close()
    return {"Authorization": f"Bearer {security.create_access_token({'sub': email, 'role': 'teacher'})}"}


def _setup_two_teachers(client):
    """Professor B com aluno, turma, pagamento e aula; devolve headers de A e os ids de B."""
    a, b = _teacher("a@x.com"), _teacher("b@x.com")
    class_a = client.post("/classes/", json={"name": "A1", "schedule": "seg"}, headers=a).json()["id"]
    student_b = client.post("/students/", json={"name": "Aluno B"}, headers=b).json()["id"]
    class_b = client.post("/classes/", json={"name": "B1", "schedule": "ter"}, headers=b).json()["id"]
    payment_b = client.post("/payments/", json={"student_id": student_b, "month": 1, "year": 2026, "amount": 100}, headers=b).json()["id"]
    session_b = client.post(f"/classes/{class_b}/attendance", json={"date": "2026-01-10", "logs": []}, headers=b).json()["id"]
    return a, b, dict(class_a=class_a, student_b=student_b, class_b=class_b, payment_b=payment_b, session_b=session_b)


def test_professor_nao_acessa_dados_de_outro(client):
    a, b, ids = _setup_two_teachers(client)
    sb, cb = ids["student_b"], ids["class_b"]

    attempts = [
        client.put(f"/students/{sb}", json={"name": "hack"}, headers=a),
        client.get(f"/students/{sb}/evolution", headers=a),
        client.get(f"/students/{sb}/enrollment", headers=a),
        client.put(f"/students/{sb}/enrollment", params={"class_id": ids["class_a"]}, headers=a),
        client.post(f"/students/{sb}/report/docx", json={}, headers=a),
        client.get(f"/classes/{cb}/students", headers=a),
        client.get(f"/classes/{cb}/attendance", headers=a),
        client.post(f"/classes/{cb}/attendance", json={"date": "2026-02-01", "logs": []}, headers=a),
        client.post(f"/classes/{ids['class_a']}/enroll/{sb}", headers=a),  # turma minha, aluno alheio
        client.delete(f"/classes/{cb}/enroll/{sb}", headers=a),
        client.post("/payments/", json={"student_id": sb, "month": 2, "year": 2026, "amount": 1}, headers=a),
        client.put(f"/payments/{ids['payment_b']}", json={"student_id": sb, "month": 1, "year": 2026, "amount": 0, "status": "PAID"}, headers=a),
        # sessão de B atacada pela URL da turma de A
        client.put(f"/classes/{ids['class_a']}/attendance/{ids['session_b']}", json={"date": "2026-01-10", "logs": []}, headers=a),
        client.delete(f"/classes/{ids['class_a']}/attendance/{ids['session_b']}", headers=a),
        # lançar nota para aluno de B numa aula da turma de A
        client.post(f"/classes/{ids['class_a']}/attendance", json={"date": "2026-03-01", "logs": [{"student_id": sb, "status": "present"}]}, headers=a),
        client.delete(f"/students/{sb}", headers=a),
    ]
    assert [r.status_code for r in attempts] == [404] * len(attempts)

    # Nada de B foi alterado
    aluno = client.get("/students/", headers=b).json()["items"][0]
    assert aluno["name"] == "Aluno B"
    pagamento = client.get("/payments/", headers=b).json()[0]
    assert pagamento["amount"] == 100 and pagamento["status"] == "PENDING"
    assert len(client.get(f"/classes/{cb}/attendance", headers=b).json()) == 1


def test_dono_continua_operando(client):
    a, b, ids = _setup_two_teachers(client)
    sb, cb = ids["student_b"], ids["class_b"]
    assert client.post(f"/classes/{cb}/enroll/{sb}", headers=b).status_code == 200
    assert client.get(f"/students/{sb}/enrollment", headers=b).json()["class_id"] == cb
    assert client.put(f"/students/{sb}", json={"name": "Aluno B2"}, headers=b).status_code == 200
    assert client.put(f"/classes/{cb}/attendance/{ids['session_b']}", json={"date": "2026-01-11", "logs": [{"student_id": sb, "status": "present"}]}, headers=b).status_code == 200


def test_token_de_aluno_nao_vale_como_professor(client):
    """Aluno com username = e-mail de um professor não pode se passar por ele."""
    _teacher("vitima@x.com")
    headers = _teacher("atacante@x.com")
    client.post("/students/", json={"name": "Fake", "username": "vitima@x.com", "password": "123456"}, headers=headers)

    token = client.post("/student/token", data={"username": "vitima@x.com", "password": "123456"}).json()["access_token"]
    assert client.get("/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    assert client.get("/student/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_usuario_nao_altera_proprio_trial_ou_status(client):
    db = TestingSession()
    db.add(User(email="trial@x.com", hashed_password="x", is_active=True, is_trial=True))
    db.commit(); db.close()
    headers = {"Authorization": f"Bearer {security.create_access_token({'sub': 'trial@x.com'})}"}

    r = client.put("/users/me", json={"is_trial": False, "is_active": True, "email": "outro@x.com", "full_name": "Ok"}, headers=headers)
    assert r.status_code == 200
    me = client.get("/users/me", headers=headers).json()
    assert me["is_trial"] is True and me["email"] == "trial@x.com" and me["full_name"] == "Ok"


def test_troca_de_senha_exige_senha_atual(client):
    headers = _teacher("p@x.com", password="antiga123")
    assert client.put("/users/me/password", json={"password": "novasenha1"}, headers=headers).status_code == 400
    assert client.put("/users/me/password", json={"password": "novasenha1", "current_password": "errada"}, headers=headers).status_code == 400
    assert client.put("/users/me/password", json={"password": "curta", "current_password": "antiga123"}, headers=headers).status_code == 422
    assert client.put("/users/me/password", json={"password": "novasenha1", "current_password": "antiga123"}, headers=headers).status_code == 200
    assert client.post("/token", data={"username": "p@x.com", "password": "novasenha1"}).status_code == 200


def test_login_nao_aceita_curinga_no_email(client):
    _teacher("alguem@x.com", password="senha12345")
    assert client.post("/token", data={"username": "%", "password": "senha12345"}).status_code == 401
    assert client.post("/token", data={"username": "ALGUEM@x.com", "password": "senha12345"}).status_code == 200


def test_google_callback_recusa_state_forjado(client):
    def callback(**kw):
        return client.get("/auth/google/callback", params={"code": "c", **kw}, follow_redirects=False)

    for r in (callback(state="token:qualquer"), callback(state="lixo")):
        assert r.status_code in (302, 307) and "error=oauth_failed" in r.headers["location"]

    # State assinado corretamente, mas sem o cookie do navegador que iniciou o fluxo (login CSRF)
    state = security.create_access_token({"purpose": "google_state", "flow": "login", "nonce": "n1"})
    r = callback(state=state)
    assert "error=oauth_failed" in r.headers["location"]

    # Token de sessão comum não serve como link de vínculo
    session = security.create_access_token({"sub": "a@x.com", "role": "teacher"})
    from backend.core.config import settings
    settings.GOOGLE_CLIENT_ID, old = "cid", settings.GOOGLE_CLIENT_ID
    try:
        r = client.get("/auth/google", params={"link": session}, follow_redirects=False)
        assert "error=oauth_failed" in r.headers["location"]
    finally:
        settings.GOOGLE_CLIENT_ID = old


def test_token_de_state_nao_vale_como_sessao(client):
    state = security.create_access_token({"purpose": "google_link", "uid": 1})
    assert client.get("/users/me", headers={"Authorization": f"Bearer {state}"}).status_code == 401


def test_producao_recusa_config_insegura():
    with pytest.raises(ValueError):
        Settings(ENVIRONMENT="production", _env_file=None)
    ok = Settings(
        ENVIRONMENT="production", SECRET_KEY="x" * 40, FRONTEND_URL="https://app",
        CORS_ORIGINS="https://app", _env_file=None,
    )
    assert ok.is_production
