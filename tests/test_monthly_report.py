"""Relatório mensal para os pais: resumo, envio por e-mail (com Word anexo) e envio em lote."""
import sys, os
sys.path.append(os.getcwd())

from datetime import date, datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import database, security
from backend.core import email as email_service
from backend.models.users import User
from backend.models.students import Student
from backend.models.classes import Class
from backend.models.attendance import AttendanceSession, AttendanceLog
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
    yield TestClient(app)
    app.dependency_overrides.clear()
    database.Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def outbox(monkeypatch):
    box = []
    monkeypatch.setattr(email_service, "email_enabled", lambda: True)
    monkeypatch.setattr(email_service, "send_monthly_report_email",
                        lambda to, summary, docx, filename, reply_to=None: box.append((to, summary, docx, filename, reply_to)) or True)
    return box


@pytest.fixture()
def data(client):
    db = TestingSession()
    prof = User(email="prof@x.com", full_name="Prof. Lia", is_active=True, is_trial=False)
    db.add(prof); db.commit()
    c = Class(name="Redação", schedule="seg", owner_id=prof.id)
    ana = Student(name="Ana", owner_id=prof.id, parent_email="mae.ana@x.com", parent_phone="21999990000")
    bia = Student(name="Bia", owner_id=prof.id)                                   # sem e-mail
    caio = Student(name="Caio", owner_id=prof.id, parent_email="pai.caio@x.com")  # sem aula no mês
    db.add_all([c, ana, bia, caio]); db.commit()
    for day, status, grade, obs in ((6, "present", 800, "Ótima argumentação"), (20, "absent", None, None)):
        s = AttendanceSession(class_id=c.id, date=date(2026, 9, day), description="Aula")
        db.add(s); db.commit()
        db.add(AttendanceLog(session_id=s.id, student_id=ana.id, status=status, grade=grade, observation=obs, essay_delivered=grade is not None))
        db.add(AttendanceLog(session_id=s.id, student_id=bia.id, status="present"))
    db.commit()
    ids = dict(ana=ana.id, bia=bia.id, caio=caio.id)
    db.close()
    return {"h": {"Authorization": f"Bearer {security.create_access_token({'sub': 'prof@x.com', 'role': 'teacher'})}"}, **ids}


def test_resumo_do_mes(client, data):
    r = client.get(f"/students/{data['ana']}/report/monthly", params={"month": 9, "year": 2026}, headers=data["h"]).json()
    text = r["text"]
    assert "Resumo de setembro de 2026 — Ana" in text
    assert "Frequência: 1 de 2 aulas (50%)" in text
    assert "Média das notas: 800" in text and "Redações entregues: 1" in text
    assert "06/09: Ótima argumentação" in text and text.endswith("— Prof. Lia")
    assert r["parent_phone"] == "21999990000"


def test_envio_individual_por_email(client, data, outbox):
    r = client.post(f"/students/{data['ana']}/report/monthly/email", params={"month": 9, "year": 2026}, headers=data["h"])
    assert r.status_code == 200
    to, summary, docx, filename, reply_to = outbox[0]
    assert to == "mae.ana@x.com" and reply_to == "prof@x.com"
    assert docx[:2] == b"PK" and filename == "Relatorio_Ana_09_2026.docx"   # .docx é um zip
    assert summary["subject"] == "Resumo de setembro de 2026 — Ana"
    preview = client.get(f"/students/{data['ana']}/report/monthly", params={"month": 9, "year": 2026}, headers=data["h"]).json()
    assert preview["last_email_sent_at"]

    # Sem e-mail do responsável
    assert client.post(f"/students/{data['bia']}/report/monthly/email", params={"month": 9, "year": 2026}, headers=data["h"]).status_code == 422


def test_sem_smtp_avisa(client, data, monkeypatch):
    monkeypatch.setattr(email_service, "email_enabled", lambda: False)
    r = client.post(f"/students/{data['ana']}/report/monthly/email", params={"month": 9, "year": 2026}, headers=data["h"])
    assert r.status_code == 503


def test_envio_em_lote(client, data, outbox):
    body = {"month": 9, "year": 2026}
    r = client.post("/reports/monthly/email", json=body, headers=data["h"]).json()
    assert r == {"sent": ["Ana"], "no_email": ["Bia"], "no_classes": ["Caio"], "already_sent": []}
    assert [o[0] for o in outbox] == ["mae.ana@x.com"]

    # Segunda vez não repete, a não ser com resend
    r = client.post("/reports/monthly/email", json=body, headers=data["h"]).json()
    assert r["sent"] == [] and r["already_sent"] == ["Ana"]
    r = client.post("/reports/monthly/email", json={**body, "resend": True}, headers=data["h"]).json()
    assert r["sent"] == ["Ana"] and len(outbox) == 2

    status = client.get("/reports/monthly", params=body, headers=data["h"]).json()
    by_name = {s["name"]: s for s in status["students"]}
    assert by_name["Ana"]["sent_at"] and by_name["Bia"]["sent_at"] is None


def test_aluno_de_outro_professor(client, data, outbox):
    db = TestingSession()
    db.add(User(email="outro@x.com", is_active=True, is_trial=False)); db.commit(); db.close()
    h = {"Authorization": f"Bearer {security.create_access_token({'sub': 'outro@x.com', 'role': 'teacher'})}"}
    assert client.get(f"/students/{data['ana']}/report/monthly", params={"month": 9, "year": 2026}, headers=h).status_code == 404
    assert client.post(f"/students/{data['ana']}/report/monthly/email", params={"month": 9, "year": 2026}, headers=h).status_code == 404
    assert client.post("/reports/monthly/email", json={"month": 9, "year": 2026}, headers=h).json()["sent"] == []


def test_excluir_aluno_com_envio_registrado(client, data, outbox):
    client.post(f"/students/{data['ana']}/report/monthly/email", params={"month": 9, "year": 2026}, headers=data["h"])
    assert client.delete(f"/students/{data['ana']}", headers=data["h"]).status_code == 200
