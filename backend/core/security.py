from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.crud import users as users_crud
from backend.schemas import auth as auth_schemas
from backend.schemas import users as users_schemas
from backend.core import database
from backend.core.config import settings

# CONSTANTS
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_from_token(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """Usuário autenticado, sem verificar trial. Usado no checkout (trial expirado precisa assinar)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = auth_schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = users_crud.get_user_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception

    return user


async def get_current_user(user = Depends(get_user_from_token)):
    # Portão de acesso das rotas de feature: bloqueia quem não tem direito de uso.
    # Dois motivos levam à mesma tela de "assine um plano" (front redireciona no 403
    # TRIAL_EXPIRED): teste grátis vencido, ou assinatura inativa/cancelada.
    if user.is_trial and user.trial_started_at:
        elapsed_days = (datetime.utcnow() - user.trial_started_at).days
        if elapsed_days >= settings.TRIAL_DAYS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="TRIAL_EXPIRED",
            )

    # Assinante que cancelou fica is_active=False (webhook customer.subscription.deleted).
    # Sem este gate, o token ainda válido daria acesso total mesmo sem plano ativo.
    # ponytail: TRIAL_EXPIRED é reusado como sinal único de "sem acesso, vá assinar".
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="TRIAL_EXPIRED",
        )

    return user


async def get_current_active_user(current_user = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta inativa")
    return current_user
