from sqlalchemy.orm import Session
from backend.models.users import User
from backend.core import database
from passlib.context import CryptContext
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db(db: Session):
    admin_email = os.getenv("PGADMIN_DEFAULT_EMAIL")
    admin_password = os.getenv("PGADMIN_DEFAULT_PASSWORD")

    if not admin_email or not admin_password:
        print("PGADMIN_DEFAULT_EMAIL or PGADMIN_DEFAULT_PASSWORD not set in .env")
        return

    user = db.query(User).filter(User.email == admin_email).first()
    if not user:
        print(f"Creating admin user: {admin_email}")
        hashed_password = pwd_context.hash(admin_password)
        db_user = User(
            email=admin_email,
            hashed_password=hashed_password,
            is_admin=True,
            is_active=True,
            full_name="Administrator",
            nickname="Admin"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print("Admin user created successfully")
    else:
        print("Admin user already exists")

    # Seed plans
    from backend.models.plans import Plan as PlanModel
    
    if db.query(PlanModel).count() == 0:
        print("Seeding initial plans...")
        plans_data = [
            {
                "name": "Professor Autônomo",
                "description": "Para professores independentes que gerenciam seus próprios alunos e recebimentos.",
                "price": "R$ 49",
                "period": "/mês",
                "features": [
                    {"text": "Até 10 turmas", "included": True},
                    {"text": "Gestão financeira completa", "included": True},
                    {"text": "Controle de presenças e notas", "included": True},
                    {"text": "Dashboard do aluno", "included": True},
                    {"text": "Múltiplos professores", "included": False},
                    {"text": "Permissões por perfil", "included": False},
                ],
                "button_text": "Começar como Autônomo",
                "popular": False,
                "role": "autonomous_teacher",
                "max_classes": 10,
                "max_teachers": 1,
            },
            {
                "name": "Escola - Básico",
                "description": "Para pequenas escolas ou estúdios com sua própria equipe de professores.",
                "price": "R$ 149",
                "period": "/mês",
                "features": [
                    {"text": "Até 10 turmas", "included": True},
                    {"text": "Gestão financeira centralizada", "included": True},
                    {"text": "Controle de presenças e notas", "included": True},
                    {"text": "Dashboard do aluno", "included": True},
                    {"text": "Múltiplos professores", "included": True},
                    {"text": "Professores não veem financeiro", "included": True},
                ],
                "button_text": "Assinar Plano Escola",
                "popular": True,
                "role": "school_admin",
                "max_classes": 10,
                "max_teachers": 5,
            },
            {
                "name": "Escola - Pro",
                "description": "Para escolas em crescimento que precisam de capacidade ilimitada.",
                "price": "R$ 299",
                "period": "/mês",
                "features": [
                    {"text": "Turmas ilimitadas", "included": True},
                    {"text": "Gestão financeira centralizada", "included": True},
                    {"text": "Controle de presenças e notas", "included": True},
                    {"text": "Dashboard do aluno", "included": True},
                    {"text": "Professores ilimitados", "included": True},
                    {"text": "Professores não veem financeiro", "included": True},
                ],
                "button_text": "Assinar Plano Pro",
                "popular": False,
                "role": "school_admin_pro",
                "max_classes": 9999,
                "max_teachers": 9999,
            }
        ]
        
        for plan_dict in plans_data:
            db.add(PlanModel(**plan_dict))
        
        db.commit()
        print("Initial plans seeded successfully")

    # Seed config
    from backend.models.config import AppConfig as AppConfigModel
    
    if db.query(AppConfigModel).count() == 0:
        print("Seeding initial configs...")
        configs_data = [
            {"key": "stripe_public_key", "value": ""},
            {"key": "stripe_secret_key", "value": ""},
            {"key": "stripe_webhook_secret", "value": ""},
        ]
        for cfg in configs_data:
            db.add(AppConfigModel(**cfg))
        db.commit()
        print("Initial configs seeded successfully")
