"""Mensalidade automática: valor e dia de vencimento no aluno geram as mensalidades de cada mês."""
import sys, os
sys.path.append(os.getcwd())

from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.models import users, students, payments, classes, enrollments, attendance, calendar, config, plans, schools, reports  # noqa: F401
from backend.models.users import User
from backend.models.students import Student
from backend.models.payments import Payment
from backend.crud.payments import ensure_monthly_payments, get_payment_stats
from backend.crud import students as student_crud
from backend.schemas.students import StudentCreate


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    owner = User(email="p@x.com")
    session.add(owner)
    session.commit()
    session.owner_id = owner.id
    yield session
    session.close()


def _student(db, name, **kw):
    s = Student(name=name, owner_id=db.owner_id, **kw)
    db.add(s)
    db.commit()
    return s


def _months(db, student):
    return [(p.year, p.month, p.amount, p.due_date, p.status)
            for p in db.query(Payment).filter(Payment.student_id == student.id).order_by(Payment.year, Payment.month)]


def test_gera_do_inicio_ate_o_mes_atual_e_e_idempotente(db):
    s = _student(db, "Ana", monthly_fee=200.0, due_day=10, billing_start=date(2026, 8, 5))
    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 13)) == 3
    assert _months(db, s) == [
        (2026, 8, 200.0, date(2026, 8, 10), "PENDING"),
        (2026, 9, 200.0, date(2026, 9, 10), "PENDING"),
        (2026, 10, 200.0, date(2026, 10, 10), "PENDING"),
    ]
    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 20)) == 0
    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 11, 1)) == 1


def test_vencimento_ja_passado_no_mes_de_inicio_comeca_no_mes_seguinte(db):
    s = _student(db, "Bia", monthly_fee=150.0, due_day=10, billing_start=date(2026, 10, 20))
    ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 20))
    assert _months(db, s) == []                        # não nasce atrasada
    ensure_monthly_payments(db, db.owner_id, today=date(2026, 11, 2))
    assert _months(db, s) == [(2026, 11, 150.0, date(2026, 11, 10), "PENDING")]


def test_dia_31_em_fevereiro_vira_ultimo_dia(db):
    s = _student(db, "Caio", monthly_fee=100.0, due_day=31, billing_start=date(2027, 2, 1))
    ensure_monthly_payments(db, db.owner_id, today=date(2027, 2, 3))
    assert _months(db, s)[0][3] == date(2027, 2, 28)


def test_nao_mexe_em_lancamento_existente_nem_gera_para_isento_inativo_ou_sem_valor(db):
    pago = _student(db, "Pago", monthly_fee=200.0, due_day=5, billing_start=date(2026, 10, 1))
    db.add(Payment(student_id=pago.id, month=10, year=2026, status="PAID", amount=180.0))
    db.commit()
    isento = _student(db, "Isento", monthly_fee=200.0, due_day=5, billing_start=date(2026, 10, 1), exempt=True)
    inativo = _student(db, "Inativo", monthly_fee=200.0, due_day=5, billing_start=date(2026, 10, 1), active=False)
    sem_valor = _student(db, "Sem valor", due_day=5, billing_start=date(2026, 10, 1))

    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 13)) == 0
    assert _months(db, pago) == [(2026, 10, 180.0, None, "PAID")]
    assert _months(db, isento) == _months(db, inativo) == _months(db, sem_valor) == []


def test_limite_de_um_ano_para_tras(db):
    _student(db, "Antigo", monthly_fee=100.0, due_day=1, billing_start=date(2024, 1, 1))
    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 13)) == 12


def test_outro_professor_nao_e_afetado(db):
    outro = User(email="o@x.com")
    db.add(outro); db.commit()
    s = Student(name="De outro", owner_id=outro.id, monthly_fee=100.0, due_day=1, billing_start=date(2026, 10, 1))
    db.add(s); db.commit()
    assert ensure_monthly_payments(db, db.owner_id, today=date(2026, 10, 13)) == 0
    assert _months(db, s) == []


def test_cadastro_marca_inicio_da_cobranca_e_alimenta_o_financeiro(db):
    st = student_crud.create_student(db, StudentCreate(name="Novo", monthly_fee=250.0, due_day=28), db.owner_id)
    assert st.billing_start == date.today()
    ensure_monthly_payments(db, db.owner_id)
    stats = get_payment_stats(db, db.owner_id, date.today().month, date.today().year)
    assert stats["total_students"] == 1
    # Editar sem mexer no valor não reinicia a cobrança
    student_crud.update_student(db, st.id, StudentCreate.model_construct(_fields_set={"phone"}, name="Novo", phone="1"))
    assert db.get(Student, st.id).billing_start == date.today()


def test_valores_invalidos_sao_recusados():
    with pytest.raises(ValueError):
        StudentCreate(name="x", due_day=32)
    with pytest.raises(ValueError):
        StudentCreate(name="x", monthly_fee=-1)
