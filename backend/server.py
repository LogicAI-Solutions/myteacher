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
    print("🚀 API starting up...")
    try:
        print("🗄️ Creating database tables...")
        database.Base.metadata.create_all(bind=database.engine)
        print("✅ Tables created/verified.")
        
        print("👤 Initializing admin user...")
        db = next(database.get_db())
        try:
            init_db(db)
            print("✅ Admin user initialization finished.")
        except Exception as e:
            print(f"⚠️ Error during init_db (non-critical): {e}")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ CRITICAL ERROR during startup: {e}")
        # Not crashing the app here might allow it to report health as unhealthy via another way,
        # but for now we want to know what failed.
    
    yield
    print("🛑 API shutting down...")


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