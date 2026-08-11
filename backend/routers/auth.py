from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session
from backend.schemas import auth as auth_schemas
from backend.schemas import users as users_schemas
from backend.crud import users as users_crud
from backend.models.users import User
from backend.core import database, security

router = APIRouter()


@router.post("/register", response_model=users_schemas.User, status_code=status.HTTP_201_CREATED)
def register(payload: users_schemas.UserRegister, db: Session = Depends(database.get_db)):
    """Cadastro público: cria a conta já em período de teste (settings.TRIAL_DAYS)."""
    # O login resolve por apelido OU email, então os dois espaços de nome
    # precisam ser checados cruzados para não criar credencial ambígua.
    taken = db.query(User).filter(
        or_(
            User.email == payload.email,
            User.nickname == payload.email,
            User.email == payload.nickname,
            User.nickname == payload.nickname,
        )
    ).first()
    if taken:
        campo = "e-mail" if taken.email == payload.email else "nome de usuário"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Este {campo} já está em uso. Tente outro ou faça login.",
        )

    return users_crud.create_user(
        db=db,
        user=users_schemas.UserCreate(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
            nickname=payload.nickname,
            is_trial=True,  # nunca vem do cliente
        ),
    )

@router.post("/token", response_model=auth_schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = users_crud.get_user_by_nickname(db, nickname=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Autenticar não é autorizar: quem tem teste vencido ou assinatura cancelada
    # PRECISA logar para chegar ao checkout e reassinar. O bloqueio de uso das
    # features fica no portão security.get_current_user, não aqui.
    access_token_expires = security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
