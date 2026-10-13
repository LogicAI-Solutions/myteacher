"""Escola: diretor, professores e secretaria. Escopo por professor, permissões, convites e assinatura.
Usa a API de verdade (TestClient) sobre SQLite em memória, no padrão de test_security.py."""
import sys, os
sys.path.append(os.getcwd())

from datetime import date, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.core import database, security
from backend.models.users import User
from backend.models.schools import SchoolInvite
from backend.server import app

TODAY = date.today()

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


def _headers(email):
    return {"Authorization": f"Bearer {security.create_access_token({'sub': email, 'role': 'teacher'})}"}


def _user(email, name=None, **kw):
    """Conta autônoma em teste grátis (recém-criada)."""
    db = TestingSession()
    fields = dict(is_active=True, is_trial=True, trial_started_at=datetime.utcnow())
    fields.update(kw)
    db.add(User(email=email, full_name=name or email, hashed_password=security.get_password_hash("senha12345"), **fields))
    db.commit()
    db.close()
    return _headers(email)


def _update_user(email, **fields):
    db = TestingSession()
    db.query(User).filter(User.email == email).update(fields)
    db.commit()
    db.close()


def _uid(email):
    db = TestingSession()
    try:
        return db.query(User).filter(User.email == email).one().id
    finally:
        db.close()


def _invite_and_register(client, director, email, role, permissions=None):
    body = {"email": email, "school_role": role}
    if permissions is not None:
        body["permissions"] = permissions
    r = client.post("/schools/invites", json=body, headers=director)
    assert r.status_code == 201, r.text
    token = r.json()["token"]
    r = client.post(f"/invites/{token}/register", json={"first_name": "Nome", "last_name": email.split("@")[0], "password": "senha12345"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture()
def school(client):
    """Diretor D com escola; professores T1/T2; secretaria S (permissões padrão).
    Turma C1 (T1) com aluno s1 e pagamento; turma C2 (T2) com aluno s2."""
    d = _user("diretor@x.com", "Diretora")
    assert client.post("/schools", json={"name": "Escola X"}, headers=d).status_code == 201
    t1 = _invite_and_register(client, d, "t1@x.com", "teacher")
    t2 = _invite_and_register(client, d, "t2@x.com", "teacher")
    s = _invite_and_register(client, d, "sec@x.com", "secretary")

    c1 = client.post("/classes/", json={"name": "C1", "schedule": "seg", "teacher_id": _uid("t1@x.com")}, headers=d).json()["id"]
    c2 = client.post("/classes/", json={"name": "C2", "schedule": "ter", "teacher_id": _uid("t2@x.com")}, headers=d).json()["id"]
    s1 = client.post("/students/", json={"name": "Aluno 1"}, headers=d).json()["id"]
    s2 = client.post("/students/", json={"name": "Aluno 2"}, headers=d).json()["id"]
    assert client.post(f"/classes/{c1}/enroll/{s1}", headers=d).status_code == 200
    assert client.post(f"/classes/{c2}/enroll/{s2}", headers=d).status_code == 200
    assert client.post("/payments/", json={"student_id": s1, "month": TODAY.month, "year": TODAY.year, "amount": 100}, headers=d).status_code == 200
    return dict(d=d, t1=t1, t2=t2, s=s, c1=c1, c2=c2, s1=s1, s2=s2)


def test_me_expoe_papel_e_permissoes(client, school):
    me = client.get("/users/me", headers=school["t1"]).json()
    assert me["school_role"] == "teacher" and me["school_name"] == "Escola X"
    assert me["permissions"] == ["attendance.edit", "reports.view"]
    assert me["is_trial"] is False                                  # membro não tem trial próprio
    sec = client.get("/users/me", headers=school["s"]).json()
    assert sec["permissions"] == ["classes.manage", "reports.view", "students.manage"]
    assert "finance" in client.get("/users/me", headers=school["d"]).json()["permissions"]


def test_professor_ve_so_as_proprias_turmas_e_alunos(client, school):
    t1, c1, c2, s1, s2 = school["t1"], school["c1"], school["c2"], school["s1"], school["s2"]
    assert [c["id"] for c in client.get("/classes/", headers=t1).json()] == [c1]
    assert [s["id"] for s in client.get("/students/", headers=t1).json()["items"]] == [s1]
    fora = [
        client.get(f"/classes/{c2}", headers=t1),
        client.get(f"/classes/{c2}/students", headers=t1),
        client.get(f"/classes/{c2}/attendance", headers=t1),
        client.post(f"/classes/{c2}/attendance", json={"date": "2026-02-01", "logs": []}, headers=t1),
        client.get(f"/students/{s2}/evolution", headers=t1),
        client.get(f"/students/{s2}/enrollment", headers=t1),
    ]
    assert [r.status_code for r in fora] == [404] * len(fora)
    # Diretor e secretaria veem tudo
    assert len(client.get("/classes/", headers=school["d"]).json()) == 2
    assert client.get("/students/", headers=school["s"]).json()["total"] == 2


def test_professor_nao_tem_financeiro_nem_cadastro(client, school):
    t1 = school["t1"]
    negados = [
        client.get("/payments/", headers=t1),
        client.get("/payments/stats", params={"month": 1, "year": 2026}, headers=t1),
        client.post("/payments/report/docx", params={"month": 1, "year": 2026}, headers=t1),
        client.get("/students/", params={"payment_status": "PAID", "payment_month": 1, "payment_year": 2026}, headers=t1),
        client.post("/students/", json={"name": "Novo"}, headers=t1),
        client.put(f"/students/{school['s1']}", json={"name": "x"}, headers=t1),
        client.post("/classes/", json={"name": "Nova", "schedule": "qua"}, headers=t1),
        client.put(f"/classes/{school['c1']}", json={"name": "x", "schedule": "x"}, headers=t1),
        client.delete(f"/classes/{school['c1']}", headers=t1),
    ]
    assert [r.status_code for r in negados] == [403] * len(negados)
    stats = client.get("/dashboard/stats", headers=t1).json()
    assert stats["payments"] is None
    assert stats["overview"]["classes_count"] == 1 and stats["students"]["total"] == 1
    assert client.get("/dashboard/stats", headers=school["d"]).json()["payments"]["total_expected"] == 1


def test_chamada_registra_quem_lancou_e_quem_editou(client, school):
    c1, s1 = school["c1"], school["s1"]
    r = client.post(f"/classes/{c1}/attendance", json={"date": "2026-02-01", "logs": [{"student_id": s1, "status": "present"}]}, headers=school["t1"])
    assert r.status_code == 200
    session = r.json()
    assert session["created_by_id"] == _uid("t1@x.com") and session["updated_by_id"] is None

    r = client.put(f"/classes/{c1}/attendance/{session['id']}", json={"date": "2026-02-01", "logs": [{"student_id": s1, "status": "absent"}]}, headers=school["d"])
    assert r.status_code == 200
    assert r.json()["updated_by_name"] == "Diretora" and r.json()["updated_at"]


def test_secretaria_age_conforme_permissoes(client, school):
    s, d, c1, s1 = school["s"], school["d"], school["c1"], school["s1"]
    session_id = client.post(f"/classes/{c1}/attendance", json={"date": "2026-02-01", "logs": []}, headers=school["t1"]).json()["id"]

    # Padrão: cadastra aluno/turma, mas não mexe em chamada nem financeiro
    assert client.post("/students/", json={"name": "Via secretaria"}, headers=s).status_code == 200
    assert client.put(f"/classes/{c1}/attendance/{session_id}", json={"date": "2026-02-01", "logs": []}, headers=s).status_code == 403
    assert client.get("/payments/", headers=s).status_code == 403

    sid = _uid("sec@x.com")
    r = client.patch(f"/schools/members/{sid}", json={"permissions": ["attendance.edit", "finance", "school.manage", "lixo"]}, headers=d)
    assert r.status_code == 200 and r.json()["permissions"] == ["attendance.edit", "finance"]  # só permissões válidas

    assert client.put(f"/classes/{c1}/attendance/{session_id}", json={"date": "2026-02-01", "logs": []}, headers=s).status_code == 200
    assert len(client.get("/payments/", headers=s).json()) == 1
    assert client.post("/students/", json={"name": "Agora não"}, headers=s).status_code == 403  # perdeu students.manage
    # Gestão da escola é só do diretor
    assert client.get("/schools/invites", headers=s).status_code == 403
    assert client.post("/schools/invites", json={"email": "z@x.com", "school_role": "teacher"}, headers=s).status_code == 403


def test_isolamento_entre_escola_e_outras_contas(client, school):
    x = _user("autonomo@x.com")
    cx = client.post("/classes/", json={"name": "CX", "schedule": "sex"}, headers=x).json()["id"]
    sx = client.post("/students/", json={"name": "Aluno X"}, headers=x).json()["id"]
    for who in ("d", "s", "t1"):
        assert client.get(f"/classes/{cx}", headers=school[who]).status_code == 404
        assert client.get(f"/students/{sx}/evolution", headers=school[who]).status_code == 404
    assert client.get(f"/classes/{school['c1']}", headers=x).status_code == 404
    assert client.get("/schools/members", headers=x).status_code == 403
    # Professor de fora da escola não pode ser responsável por turma
    r = client.post("/classes/", json={"name": "Y", "schedule": "x", "teacher_id": _uid("autonomo@x.com")}, headers=school["d"])
    assert r.status_code == 422
    # Autônomo não atribui professor
    assert client.post("/classes/", json={"name": "Z", "schedule": "x", "teacher_id": _uid("t1@x.com")}, headers=x).status_code == 422


def test_membro_removido_perde_acesso_e_turma_fica_com_a_escola(client, school):
    d, c2 = school["d"], school["c2"]
    assert client.delete(f"/schools/members/{_uid('t2@x.com')}", headers=d).status_code == 200
    assert client.get("/classes/", headers=school["t2"]).status_code == 403
    turma = client.get(f"/classes/{c2}", headers=d).json()
    assert turma["teacher_id"] is None and turma["name"] == "C2"


def test_membro_suspenso_e_escola_sem_assinatura(client, school):
    d = school["d"]
    assert client.patch(f"/schools/members/{_uid('t1@x.com')}", json={"is_active": False}, headers=d).status_code == 200
    r = client.get("/classes/", headers=school["t1"])
    assert r.status_code == 403 and r.json()["detail"] == "SCHOOL_INACTIVE"

    # Teste grátis do diretor venceu: membros ficam sem acesso
    _update_user("diretor@x.com", trial_started_at=datetime.utcnow() - timedelta(days=30))
    r = client.get("/classes/", headers=school["s"])
    assert r.status_code == 403 and r.json()["detail"] == "SCHOOL_INACTIVE"
    assert client.get("/classes/", headers=d).json()["detail"] == "TRIAL_EXPIRED"


def test_convites(client, school):
    d = school["d"]
    # Teste grátis: limite de 2 professores, já usados
    r = client.post("/schools/invites", json={"email": "t3@x.com", "school_role": "teacher"}, headers=d)
    assert r.status_code == 403
    usage = client.get("/schools/me", headers=d).json()["usage"]
    assert usage["teachers"] == 2 and usage["max_teachers"] == 2 and usage["secretaries"] == 1

    # E-mail diferente do convite não aceita
    token = client.post("/schools/invites", json={"email": "sec2@x.com", "school_role": "secretary"}, headers=d).json()["token"]
    outro = _user("intruso@x.com")
    assert client.post(f"/invites/{token}/accept", headers=outro).status_code == 403
    info = client.get(f"/invites/{token}").json()
    assert info["school_name"] == "Escola X" and info["has_account"] is False

    # Conta existente aceita; token não vale duas vezes
    sec2 = _user("sec2@x.com")
    assert client.post(f"/invites/{token}/accept", headers=sec2).status_code == 200
    assert client.get(f"/invites/{token}").status_code == 404
    assert client.post(f"/invites/{token}/accept", headers=sec2).status_code == 404
    assert client.get("/users/me", headers=sec2).json()["school_role"] == "secretary"

    # Revogado e expirado
    inv = client.post("/schools/invites", json={"email": "sec3@x.com", "school_role": "secretary"}, headers=d).json()
    assert client.delete(f"/schools/invites/{inv['id']}", headers=d).status_code == 200
    assert client.get(f"/invites/{inv['token']}").status_code == 404
    inv = client.post("/schools/invites", json={"email": "sec4@x.com", "school_role": "secretary"}, headers=d).json()
    db = TestingSession()
    db.query(SchoolInvite).filter(SchoolInvite.id == inv["id"]).update({"expires_at": datetime.utcnow() - timedelta(seconds=1)})
    db.commit(); db.close()
    assert client.post(f"/invites/{inv['token']}/register", json={"first_name": "Ab", "last_name": "Cd", "password": "senha12345"}).status_code == 404

    # Token nunca fica salvo em claro
    db = TestingSession()
    assert all(i.token_hash != inv["token"] for i in db.query(SchoolInvite).all())
    db.close()


def test_membro_nao_assina_nem_cria_outra_escola(client, school):
    assert client.post("/billing/checkout", headers=school["t1"]).status_code == 403
    assert client.post("/schools", json={"name": "Outra"}, headers=school["t1"]).status_code == 409
    assert client.post("/schools", json={"name": "Outra"}, headers=school["d"]).status_code == 409


def test_conta_autonoma_nao_muda(client):
    x = _user("solo@x.com")
    c = client.post("/classes/", json={"name": "Solo", "schedule": "seg"}, headers=x).json()["id"]
    s = client.post("/students/", json={"name": "Aluno"}, headers=x).json()["id"]
    assert client.post(f"/classes/{c}/enroll/{s}", headers=x).status_code == 200
    assert client.post(f"/classes/{c}/attendance", json={"date": "2026-02-01", "logs": []}, headers=x).status_code == 200
    assert client.get("/payments/", headers=x).status_code == 200
    me = client.get("/users/me", headers=x).json()
    assert me["school_role"] is None and "finance" in me["permissions"]
    assert client.get("/schools/me", headers=x).json()["school"] is None


def test_escola_so_no_plano_escola(client):
    # Assinante de plano de professor (sem teste grátis) não cria escola
    pago = _user("pago@x.com", is_trial=False, trial_started_at=None, role="autonomous_teacher")
    r = client.post("/schools", json={"name": "Não"}, headers=pago)
    assert r.status_code == 403
    assert client.get("/schools/me", headers=pago).json()["can_create"] is False
    # Assinou o plano Escola: libera
    _update_user("pago@x.com", role="school")
    assert client.get("/schools/me", headers=pago).json()["can_create"] is True
    assert client.post("/schools", json={"name": "Agora sim"}, headers=pago).status_code == 201


def test_cadastro_pelo_plano_escola_ja_cria_a_escola(client):
    body = {"first_name": "Rosa", "last_name": "Dir", "email": "rosa@x.com", "password": "senha12345"}
    assert client.post("/register", json={**body, "account_type": "school"}).status_code == 422  # sem nome da escola
    r = client.post("/register", json={**body, "account_type": "school", "school_name": "Colégio Rosa"})
    assert r.status_code == 201
    me = client.get("/users/me", headers=_headers("rosa@x.com")).json()
    assert me["account_type"] == "school" and me["school_role"] == "owner" and me["school_name"] == "Colégio Rosa"
    assert me["is_trial"] is True
    # Cadastro comum continua autônomo
    client.post("/register", json={**body, "email": "comum@x.com"})
    me = client.get("/users/me", headers=_headers("comum@x.com")).json()
    assert me["account_type"] == "autonomous_teacher" and me["school_role"] is None


def test_diretor_sai_do_plano_escola(client, school):
    # Trocou para plano de professor (billing._apply_plan muda role): equipe perde o acesso, sem novos convites
    _update_user("diretor@x.com", role="autonomous_teacher", is_trial=False)
    r = client.get("/classes/", headers=school["t1"])
    assert r.status_code == 403 and r.json()["detail"] == "SCHOOL_INACTIVE"
    assert client.post("/schools/invites", json={"email": "z@x.com", "school_role": "secretary"}, headers=school["d"]).status_code == 403
    assert client.post("/schools/invites", json={"email": "y@x.com", "school_role": "teacher"}, headers=school["d"]).status_code == 403
    # Os dados continuam com o diretor
    assert len(client.get("/classes/", headers=school["d"]).json()) == 2


def test_aplicar_plano_define_tipo_de_conta():
    from backend.routers.billing import _apply_plan

    class P:  # plano fake
        id, max_classes = 3, 9999
    u = User(email="a@a.com")
    P.role = "school"; _apply_plan(None, u, P)
    assert u.role == "school"
    P.role = "autonomous_teacher"; _apply_plan(None, u, P)
    assert u.role == "autonomous_teacher"


def test_sininho_respeita_escopo_e_financeiro(client, school):
    from backend.models.payments import Payment
    db = TestingSession()
    # s1 (turma do T1) e s2 (turma do T2) com mensalidade atrasada
    for sid in (school["s1"], school["s2"]):
        db.add(Payment(student_id=sid, month=1, year=2020, status="PENDING", amount=50, due_date=date(2020, 1, 10)))
    db.commit(); db.close()
    # T1 lança 2 aulas recentes com s1 faltando
    for days in (9, 2):
        d = (TODAY - timedelta(days=days)).isoformat()
        assert client.post(f"/classes/{school['c1']}/attendance", json={"date": d, "logs": [{"student_id": school["s1"], "status": "absent"}]}, headers=school["t1"]).status_code == 200

    diretor = client.get("/alerts", headers=school["d"]).json()
    assert {a["student_name"] for a in diretor} == {"Aluno 1", "Aluno 2"}
    prof = client.get("/alerts", headers=school["t1"]).json()
    assert [a["student_name"] for a in prof] == ["Aluno 1"]
    assert [r["type"] for r in prof[0]["reasons"]] == ["absence"]      # professor não vê atraso de mensalidade
    assert client.get("/alerts", headers=school["t2"]).json() == []
