"""A agenda consulta apenas o período pedido e evita refresh Google desnecessário."""

import asyncio
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from backend.core.database import Base
from backend.models import attendance, calendar, classes, enrollments, payments, students, users  # noqa: F401
from backend.models.attendance import AttendanceSession
from backend.models.classes import Class
from backend.models.users import User
from backend.routers import calendar as calendar_router


def test_calendar_period_and_google_token(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        user = User(email="agenda@example.com", google_access_token="valid-token", google_refresh_token="refresh-token")
        db.add(user)
        db.flush()
        course = Class(name="Inglês", owner_id=user.id)
        db.add(course)
        db.flush()
        db.add_all([
            AttendanceSession(class_id=course.id, date=date(2026, 5, 12), description="Aula de maio"),
            AttendanceSession(class_id=course.id, date=date(2025, 5, 12), description="Aula antiga"),
        ])
        db.commit()

        period = dict(start_date="2026-05-01T00:00:00Z", end_date="2026-05-31T23:59:59Z")
        local = asyncio.run(calendar_router.list_calendar_events(
            **period, include_google=False, google_only=False, db=db, current_user=user,
        ))
        assert [event.title for event in local] == ["Inglês - Aula de maio"]

        expire_token = False
        requests = []

        class FakeClient:
            def __init__(self, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                pass

            async def get(self, *args, **kwargs):
                authorization = kwargs["headers"]["Authorization"]
                requests.append(authorization)
                status = 401 if expire_token and authorization == "Bearer valid-token" else 200
                return type("Response", (), {"status_code": status, "json": lambda self: {"items": []}})()

        async def unexpected_refresh(*args):
            raise AssertionError("Token válido não deve ser renovado")

        monkeypatch.setattr(calendar_router.httpx, "AsyncClient", FakeClient)
        monkeypatch.setattr(calendar_router, "_refresh_google_token_if_needed", unexpected_refresh)
        google = asyncio.run(calendar_router.list_calendar_events(
            **period, include_google=True, google_only=True, db=db, current_user=user,
        ))
        assert google == []
        assert requests == ["Bearer valid-token"]

        expire_token = True

        async def refresh_token(*args):
            return "new-token"

        monkeypatch.setattr(calendar_router, "_refresh_google_token_if_needed", refresh_token)
        asyncio.run(calendar_router.list_calendar_events(
            **period, include_google=True, google_only=True, db=db, current_user=user,
        ))
        assert requests[-2:] == ["Bearer valid-token", "Bearer new-token"]
