"""Alertas de risco de desistência: sumiço nas aulas (2 semanas) e mensalidade atrasada."""
import sys, os
sys.path.append(os.getcwd())

from datetime import date, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.models import users, students, payments, classes, enrollments, attendance, calendar, config, plans, schools, reports  # noqa: F401
from backend.models.users import User
from backend.models.students import Student
from backend.models.classes import Class
from backend.models.enrollments import Enrollment
from backend.models.attendance import AttendanceSession, AttendanceLog
from backend.models.payments import Payment
from backend.crud.alerts import get_risk_alerts

TODAY = date(2026, 10, 13)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    owner, teacher = User(email="d@x.com"), User(email="t@x.com")
    session.add_all([owner, teacher]); session.commit()
    session.owner_id, session.teacher_id = owner.id, teacher.id
    yield session
    session.close()


def _class(db, name, teacher_id=None):
    c = Class(name=name, schedule="seg", owner_id=db.owner_id, teacher_id=teacher_id)
    db.add(c); db.commit()
    return c


def _student(db, name, cls=None, **kw):
    s = Student(name=name, owner_id=db.owner_id, **kw)
    db.add(s); db.commit()
    if cls:
        db.add(Enrollment(student_id=s.id, class_id=cls.id)); db.commit()
    return s


def _session(db, cls, days_ago, statuses):
    """statuses: {student: 'present'|'absent'} (aluno ausente do dict = sem registro)."""
    s = AttendanceSession(class_id=cls.id, date=TODAY - timedelta(days=days_ago), description="Aula")
    db.add(s); db.commit()
    for st, status in statuses.items():
        db.add(AttendanceLog(session_id=s.id, student_id=st.id, status=status))
    db.commit()


def _names(alerts):
    return [a["student_name"] for a in alerts]


def test_sumico_de_duas_semanas(db):
    c = _class(db, "Redação")
    sumiu = _student(db, "Sumiu", c)
    veio = _student(db, "Veio", c)
    uma_falta = _student(db, "Uma falta", c)
    _session(db, c, 20, {sumiu: "present", veio: "present", uma_falta: "present"})
    _session(db, c, 10, {sumiu: "absent", veio: "absent", uma_falta: "absent"})
    _session(db, c, 3, {sumiu: "absent", veio: "present", uma_falta: "present"})

    alerts = get_risk_alerts(db, db.owner_id, today=TODAY)
    assert _names(alerts) == ["Sumiu"]
    reason = alerts[0]["reasons"][0]
    assert reason["type"] == "absence" and reason["class_id"] == c.id
    assert "últimas 2 aulas de Redação" in reason["text"] and "última presença" in reason["text"]


def test_sem_aulas_suficientes_na_janela_nao_alerta(db):
    c = _class(db, "Inglês")
    s = _student(db, "Aluno", c)
    _session(db, c, 3, {s: "absent"})          # 1 aula só
    _session(db, c, 30, {s: "absent"})         # fora da janela
    assert get_risk_alerts(db, db.owner_id, today=TODAY) == []


def test_sem_registro_conta_como_falta_e_inativo_nao_alerta(db):
    c = _class(db, "Mat")
    s = _student(db, "Sem registro", c)
    inativo = _student(db, "Inativo", c, active=False)
    _session(db, c, 9, {})
    _session(db, c, 2, {})
    alerts = get_risk_alerts(db, db.owner_id, today=TODAY)
    assert _names(alerts) == ["Sem registro"]
    assert "nenhuma presença" in alerts[0]["reasons"][0]["text"]


def test_mensalidade_atrasada_e_os_dois_sinais(db):
    c = _class(db, "Física")
    ambos = _student(db, "Ambos", c)
    so_pagto = _student(db, "Só pagamento")
    isento = _student(db, "Isento", exempt=True)
    for st in (ambos, so_pagto, isento):
        db.add(Payment(student_id=st.id, month=9, year=2026, status="PENDING", amount=200, due_date=date(2026, 9, 10)))
    db.add(Payment(student_id=so_pagto.id, month=10, year=2026, status="PENDING", amount=200, due_date=date(2026, 10, 20)))  # ainda não venceu
    db.commit()
    _session(db, c, 8, {ambos: "absent"})
    _session(db, c, 1, {ambos: "absent"})

    alerts = get_risk_alerts(db, db.owner_id, today=TODAY)
    assert _names(alerts) == ["Ambos", "Só pagamento"]           # os dois sinais primeiro
    assert alerts[0]["level"] == "high" and len(alerts[0]["reasons"]) == 2
    assert "Mensalidade atrasada há 33 dias (R$ 200,00)" == alerts[1]["reasons"][0]["text"]

    # Sem acesso ao financeiro: só as faltas
    assert _names(get_risk_alerts(db, db.owner_id, include_finance=False, today=TODAY)) == ["Ambos"]


def test_professor_ve_so_as_turmas_dele(db):
    minha = _class(db, "Minha", teacher_id=db.teacher_id)
    outra = _class(db, "Outra")
    a = _student(db, "Da minha", minha)
    b = _student(db, "Da outra", outra)
    for cls, st in ((minha, a), (outra, b)):
        _session(db, cls, 9, {st: "absent"})
        _session(db, cls, 2, {st: "absent"})
    assert _names(get_risk_alerts(db, db.owner_id, teacher_id=db.teacher_id, include_finance=False, today=TODAY)) == ["Da minha"]
    assert len(get_risk_alerts(db, db.owner_id, today=TODAY)) == 2


def test_chave_muda_com_fato_novo(db):
    c = _class(db, "Química")
    s = _student(db, "Aluno", c)
    _session(db, c, 9, {s: "absent"})
    _session(db, c, 2, {s: "absent"})
    key1 = get_risk_alerts(db, db.owner_id, today=TODAY)[0]["key"]
    db.add(Payment(student_id=s.id, month=9, year=2026, status="PENDING", amount=100, due_date=date(2026, 9, 1)))
    db.commit()
    assert get_risk_alerts(db, db.owner_id, today=TODAY)[0]["key"] != key1
