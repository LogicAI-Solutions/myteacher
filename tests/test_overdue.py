"""Mensalidade em atraso: não paga + vencimento passado (calculado, nunca gravado como LATE)."""
import sys, os
sys.path.append(os.getcwd())

from datetime import date, timedelta
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.core.database import Base
from backend.models import users, students, payments, classes, enrollments, attendance, calendar, config, plans  # noqa: F401  (registra tabelas)
from backend.models.users import User
from backend.models.students import Student
from backend.models.payments import Payment
from backend.schemas.payments import Payment as PaymentOut, PaymentCreate
from backend.crud import payments as payment_crud, students as student_crud, dashboard as dashboard_crud

TODAY = date.today()


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    owner, other = User(email="a@a.com"), User(email="b@b.com")
    session.add_all([owner, other])
    session.flush()
    names = ["Atrasado", "EmDia", "Pago", "SemVenc", "Outro"]
    studs = {n: Student(name=n, owner_id=(other.id if n == "Outro" else owner.id)) for n in names}
    session.add_all(studs.values())
    session.flush()

    def pay(n, status, due, amount=100.0):
        session.add(Payment(student_id=studs[n].id, month=TODAY.month, year=TODAY.year,
                            status=status, amount=amount, due_date=due))
    pay("Atrasado", "PENDING", TODAY - timedelta(days=3), 150.0)
    pay("EmDia", "PENDING", TODAY + timedelta(days=3))
    pay("Pago", "PAID", TODAY - timedelta(days=10))      # pago nunca é atraso
    pay("SemVenc", "PENDING", None)                      # sem vencimento nunca é atraso
    pay("Outro", "PENDING", TODAY - timedelta(days=5))   # de outro professor
    session.commit()
    session.owner_id = owner.id
    yield session
    session.close()


def test_vencimento_hoje_nao_e_atraso(db):
    db.add(Payment(student_id=1, month=1, year=2000, status="PENDING", amount=1, due_date=TODAY))
    db.commit()
    assert not PaymentOut.model_validate(db.query(Payment).filter(Payment.year == 2000).one(), from_attributes=True).is_overdue


def test_is_overdue_na_resposta(db):
    out = {p.student.name: p.is_overdue for p in (PaymentOut.model_validate(x, from_attributes=True) for x in db.query(Payment).all())}
    assert out == {"Atrasado": True, "EmDia": False, "Pago": False, "SemVenc": False, "Outro": True}


def test_stats_do_mes(db):
    s = payment_crud.get_payment_stats(db, db.owner_id, TODAY.month, TODAY.year)
    assert s["overdue_count"] == 1 and s["overdue_amount"] == 150.0


def test_filtro_de_alunos_late(db):
    kw = dict(payment_status="LATE", payment_month=TODAY.month, payment_year=TODAY.year)
    assert [s.name for s in student_crud.get_students(db, db.owner_id, **kw)] == ["Atrasado"]
    assert student_crud.count_students(db, db.owner_id, **kw) == 1


def test_dashboard(db):
    old = Payment(student_id=db.query(Student).filter(Student.name == "EmDia").one().id,
                  month=1, year=2020, status="PENDING", amount=50.0, due_date=date(2020, 1, 10))
    db.add(old)
    db.commit()
    p = dashboard_crud.get_dashboard_stats(db, db.owner_id)["payments"]
    assert p["overdue_count"] == 2 and p["overdue_amount"] == 200.0
    assert [i["student_name"] for i in p["overdue_items"]] == ["EmDia", "Atrasado"]  # mais antigo primeiro
    assert p["overdue_items"][1]["days_overdue"] == 3


def test_update_preserva_vencimento_quando_omitido(db):
    pay = db.query(Payment).join(Student).filter(Student.name == "Atrasado").one()
    due = pay.due_date
    body = PaymentCreate(student_id=pay.student_id, month=pay.month, year=pay.year, status="PAID", amount=150.0)
    payment_crud.update_payment(db, pay.id, body)
    assert db.get(Payment, pay.id).due_date == due
    body = PaymentCreate(student_id=pay.student_id, month=pay.month, year=pay.year, status="PAID", amount=150.0, due_date=None)
    payment_crud.update_payment(db, pay.id, body)
    assert db.get(Payment, pay.id).due_date is None   # null explícito limpa
