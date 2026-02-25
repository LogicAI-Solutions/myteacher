import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.core import database
from backend.models import users, classes, students, enrollments, attendance, payments
from backend.core.router_loader import include_routers

from contextlib import asynccontextmanager
from backend.core.init_db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização do banco de dados na inicialização do app
    database.Base.metadata.create_all(bind=database.engine)
    
    db = next(database.get_db())
    try:
        init_db(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="TeacherApp API",
    description="API para gerenciamento de alunos e turmas",
    version="1.0.1",
    lifespan=lifespan
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Produção: usa origens específicas do .env
    origins = [origin.strip() for origin in cors_origins_env.split(",")]
else:
    # Desenvolvimento: permite todas as origens
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint para verificação de saúde da API"""
    return {"status": "healthy", "service": "TeacherApp API"}

include_routers(app)