import os
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "change-me-in-production-please-use-a-strong-random-value"


class Settings(BaseSettings):
    # Aplicação / Segurança
    PROJECT_NAME: str = "MyTeacherApp"
    ENVIRONMENT: str = "development"  # "production" ativa as checagens de _check_production
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    TRIAL_DAYS: int = 14

    # Escola
    SCHOOL_TRIAL_MAX_TEACHERS: int = 2  # professores que o diretor pode convidar durante o teste grátis
    SCHOOL_MAX_SECRETARIES: int = 3     # secretaria não conta no limite de professores do plano
    SCHOOL_INVITE_DAYS: int = 7

    # URLs e Portas
    FRONTEND_URL: Optional[str] = None
    PORT_BACKEND: Optional[int] = 8501
    PORT_FRONTEND: Optional[int] = 5273
    HOST_IP: Optional[str] = "0.0.0.0"
    CORS_ORIGINS: Optional[str] = None

    # Google OAuth e Google Agenda (Calendar)
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_CALLBACK_URL: Optional[str] = None
    GOOGLE_AUTH_URL: str = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL: str = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL: str = "https://www.googleapis.com/oauth2/v2/userinfo"
    GOOGLE_CALENDAR_API_URL: str = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    GOOGLE_SCOPES: str = "openid email profile https://www.googleapis.com/auth/calendar.events"
    GOOGLE_CALENDAR_TIMEZONE: str = "America/Sao_Paulo"

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PRICE_ID: Optional[str] = None
    STRIPE_PRICE_ESSENCIAL: Optional[str] = None
    STRIPE_PRICE_PROFISSIONAL: Optional[str] = None
    STRIPE_PRICE_ESCOLA: Optional[str] = None

    # E-mail (SMTP). Sem SMTP_HOST, os e-mails vão para o log (desenvolvimento).
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None  # ex.: "MyTeacherApp <nao-responda@myteacherapp.com.br>"
    SMTP_STARTTLS: bool = True
    EMAIL_VERIFY_HOURS: int = 48
    PASSWORD_RESET_MINUTES: int = 60

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @model_validator(mode="after")
    def _check_production(self):
        """Em produção, recusa subir com configuração que abriria a aplicação:
        SECRET_KEY padrão deixa qualquer um forjar JWT; sem FRONTEND_URL/CORS os
        redirects e o CORS caem em defaults de desenvolvimento."""
        if not self.is_production:
            return self
        problems = []
        if self.SECRET_KEY == DEFAULT_SECRET_KEY or len(self.SECRET_KEY) < 32:
            problems.append("SECRET_KEY padrão ou com menos de 32 caracteres")
        if not self.FRONTEND_URL:
            problems.append("FRONTEND_URL não definida")
        if not self.CORS_ORIGINS:
            problems.append("CORS_ORIGINS não definida")
        if self.GOOGLE_CLIENT_ID and not self.GOOGLE_CALLBACK_URL:
            problems.append("GOOGLE_CALLBACK_URL não definida (Google OAuth ativo)")
        if problems:
            raise ValueError("Configuração de produção inválida: " + "; ".join(problems))
        return self

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
