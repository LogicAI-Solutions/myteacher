import secrets
import urllib.parse
from typing import Optional
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.schemas import auth as auth_schemas
from backend.schemas import users as users_schemas
from backend.crud import users as users_crud
from backend.models.users import User
from backend.core import database, security
from backend.core.config import settings
from backend.core.logger import logger
from backend.core import email as email_service
import hashlib
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

router = APIRouter()


@router.post("/register", response_model=users_schemas.User, status_code=status.HTTP_201_CREATED)
def register(payload: users_schemas.UserRegister, background: BackgroundTasks, db: Session = Depends(database.get_db)):
    """Cadastro público: cria a conta com Nome, Sobrenome, E-mail e Senha."""
    email_clean = payload.email.strip().lower()
    
    taken = users_crud.get_user_by_email(db, email=email_clean)
    if taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está em uso. Tente outro ou faça login.",
        )

    full_name = f"{payload.first_name.strip()} {payload.last_name.strip()}".strip()

    user = users_crud.create_user(
        db=db,
        user=users_schemas.UserCreate(
            email=email_clean,
            password=payload.password,
            full_name=full_name,
            nickname=payload.nickname or email_clean.split("@")[0],
            is_trial=True,
            auth_provider="local",
        ),
    )
    user.email_verified = False
    db.commit()
    db.refresh(user)
    background.add_task(email_service.send_verification_email, user.email, _verification_url(user))
    return user


@router.post("/token", response_model=auth_schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = users_crud.get_user_by_nickname(db, nickname=form_data.username)
    if not user or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": "teacher"}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


OAUTH_NONCE_COOKIE = "g_oauth_nonce"
OAUTH_STATE_MINUTES = 10
LINK_TOKEN_MINUTES = 2


def _get_frontend_url() -> str:
    # Só da configuração: derivar de Origin/Referer/X-Forwarded-Host deixava o cliente
    # escolher para qual domínio o JWT seria entregue.
    return (settings.FRONTEND_URL or "http://localhost:5273").rstrip("/")


def _get_google_callback_url() -> str:
    return (settings.GOOGLE_CALLBACK_URL or "").strip() or "http://localhost:8501/auth/google/callback"


def _safe_redirect(path: Optional[str]) -> str:
    return path if path and path.startswith("/dashboard") and "//" not in path else "/dashboard"


def _sign(payload: dict, minutes: int) -> str:
    return security.create_access_token(payload, expires_delta=security.timedelta(minutes=minutes))


def _unsign(token: Optional[str], purpose: str) -> Optional[dict]:
    try:
        payload = security.jwt.decode(token or "", settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except security.JWTError:
        return None
    return payload if payload.get("purpose") == purpose else None


def _redirect_to_google(purpose: str, redirect: str, uid: Optional[int] = None) -> RedirectResponse:
    """state assinado + nonce em cookie: o callback só aceita o fluxo iniciado neste navegador
    (sem isso, um link forjado logava a vítima na conta do atacante — login CSRF)."""
    nonce = secrets.token_urlsafe(24)
    state = _sign(
        {"purpose": "google_state", "flow": purpose, "nonce": nonce, "uid": uid, "redirect": redirect},
        OAUTH_STATE_MINUTES,
    )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": _get_google_callback_url(),
        "response_type": "code",
        "scope": settings.GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    response = RedirectResponse(url=f"{settings.GOOGLE_AUTH_URL.rstrip('?')}?{urllib.parse.urlencode(params)}")
    response.set_cookie(
        OAUTH_NONCE_COOKIE,
        nonce,
        max_age=OAUTH_STATE_MINUTES * 60,
        httponly=True,
        secure=_get_google_callback_url().startswith("https://"),
        samesite="lax",  # o retorno do Google é navegação top-level, então o cookie vai junto
        path="/",
    )
    return response


@router.get("/auth/google")
@router.get("/google")
async def google_login(
    state: Optional[str] = Query(None),
    link: Optional[str] = Query(None),
):
    """Inicia o OAuth com o Google. Com `link` (emitido por POST /auth/google/link),
    conecta o Google à conta já logada em vez de fazer login."""
    frontend_url = _get_frontend_url()

    if not settings.GOOGLE_CLIENT_ID:
        return RedirectResponse(url=f"{frontend_url}/login?error=google_not_configured")

    if link:
        payload = _unsign(link, "google_link")
        if not payload:
            return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")
        return _redirect_to_google("link", _safe_redirect(payload.get("redirect")), uid=payload.get("uid"))

    return _redirect_to_google("login", "/dashboard/agenda" if state == "agenda" else "/dashboard")


@router.post("/auth/google/link")
async def google_link(user: User = Depends(security.get_current_user)):
    """Caminho (relativo à API) para conectar o Google Agenda. Substitui o JWT de sessão, que antes
    ia na query string e parava em logs, por um token que só serve para iniciar o vínculo e vence em 2 min."""
    link = _sign({"purpose": "google_link", "uid": user.id, "redirect": "/dashboard/agenda"}, LINK_TOKEN_MINUTES)
    return {"path": f"/auth/google?link={link}"}


@router.get("/auth/google/callback")
@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(database.get_db),
):
    """Callback do Google OAuth: troca o code por dados do usuário, cria ou localiza a conta e redireciona."""
    frontend_url = _get_frontend_url()

    if error or not code:
        logger.warning(f"Google OAuth error or missing code: {error}")
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

    flow = _unsign(state, "google_state")
    cookie_nonce = request.cookies.get(OAUTH_NONCE_COOKIE)
    if not flow or not cookie_nonce or not secrets.compare_digest(str(flow.get("nonce")), cookie_nonce):
        logger.warning("Google OAuth callback com state inválido ou sem cookie de nonce")
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth client credentials not set.")
        return RedirectResponse(url=f"{frontend_url}/login?error=google_not_configured")

    callback_url = _get_google_callback_url()

    try:
        # 1. Trocar o authorization code por tokens no Google
        token_url = settings.GOOGLE_TOKEN_URL
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": callback_url,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(token_url, data=token_data)
            if token_res.status_code != 200:
                logger.error(f"Google Token Exchange Error: {token_res.text}")
                return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")
            
            tokens = token_res.json()
            access_token_google = tokens.get("access_token")
            refresh_token_google = tokens.get("refresh_token")

            # 2. Obter informações do usuário Google
            userinfo_res = await client.get(
                settings.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token_google}"},
            )
            if userinfo_res.status_code != 200:
                logger.error(f"Google UserInfo Error: {userinfo_res.text}")
                return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

            google_profile = userinfo_res.json()

        email = google_profile.get("email")
        if not email:
            return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

        email_clean = email.strip().lower()
        google_id = google_profile.get("id")
        given_name = google_profile.get("given_name", "")
        family_name = google_profile.get("family_name", "")
        picture = google_profile.get("picture", "")
        name = google_profile.get("name") or f"{given_name} {family_name}".strip() or "Usuário Google"

        # 3. Vínculo (Agenda): a conta vem do state assinado. Login: casa pelo e-mail.
        target_redirect = _safe_redirect(flow.get("redirect"))
        is_link = flow.get("flow") == "link"

        if is_link:
            user = db.query(User).filter(User.id == flow.get("uid")).first()
            if not user:
                return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")
        else:
            user = users_crud.get_user_by_email(db, email=email_clean)
            # E-mail não verificado no Google não pode entrar numa conta local que já usa esse e-mail.
            if user and not google_profile.get("verified_email", False):
                logger.warning("Google OAuth: e-mail não verificado tentando entrar em conta existente")
                return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

        is_new_user = False

        if not user:
            is_new_user = True
            user = users_crud.create_user(
                db=db,
                user=users_schemas.UserCreate(
                    email=email_clean,
                    full_name=name,
                    google_id=google_id,
                    auth_provider="google",
                    avatar=picture,
                    nickname=email_clean.split("@")[0],
                    is_trial=True,
                ),
            )
            user.google_access_token = access_token_google
            if refresh_token_google:
                user.google_refresh_token = refresh_token_google
            if google_profile.get("verified_email", False):
                user.email_verified = True
                user.email_verified_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
        else:
            # Atualizar google_id, avatar e tokens sem apagar nenhum dado do usuário
            if not user.google_id:
                user.google_id = google_id
            if not user.avatar and picture:
                user.avatar = picture
            # Login com Google de e-mail verificado comprova a posse do e-mail
            if google_profile.get("verified_email", False) and not user.email_verified:
                user.email_verified = True
                user.email_verified_at = datetime.utcnow()
            user.google_access_token = access_token_google
            if refresh_token_google:
                user.google_refresh_token = refresh_token_google
            db.commit()
            db.refresh(user)

        if is_link:
            # Quem vinculou já está logado; não emitir sessão nova reduz o estrago se o link vazar.
            response = RedirectResponse(url=f"{frontend_url}/auth/callback#linked=1&redirect={target_redirect}")
            response.delete_cookie(OAUTH_NONCE_COOKIE, path="/")
            return response

        # 4. Gerar access token JWT da nossa aplicação
        access_token_expires = security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        app_jwt = security.create_access_token(
            data={"sub": user.email, "role": "teacher"}, expires_delta=access_token_expires
        )

        # Fragmento (#), não query: não chega a servidores, logs de acesso nem ao Referer.
        response = RedirectResponse(
            url=f"{frontend_url}/auth/callback#token={app_jwt}&redirect={target_redirect}&isNewUser={'true' if is_new_user else 'false'}"
        )
        response.delete_cookie(OAUTH_NONCE_COOKIE, path="/")
        return response

    except Exception as e:
        logger.error(f"Exception during Google OAuth callback: {e}", exc_info=True)
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")



# ---- Confirmação de e-mail e recuperação de senha --------------------------------
# Tokens assinados (JWT com "purpose", sem "sub": não servem como token de acesso).

class VerifyEmailRequest(BaseModel):
    token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=128)


def _verification_url(user: User) -> str:
    token = _sign({"purpose": "verify_email", "email": user.email}, settings.EMAIL_VERIFY_HOURS * 60)
    return f"{_get_frontend_url()}/confirmar-email?token={token}"


def _password_fingerprint(user: User) -> str:
    # Muda quando a senha muda: o link de redefinição vale uma vez só.
    return hashlib.sha256((user.hashed_password or f"sem-senha:{user.id}").encode()).hexdigest()[:16]


@router.post("/auth/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(database.get_db)):
    data = _unsign(payload.token, "verify_email")
    user = users_crud.get_user_by_email(db, email=data["email"]) if data else None
    if not user:
        raise HTTPException(status_code=400, detail="Link de confirmação inválido ou expirado.")
    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = datetime.utcnow()
        db.commit()
    return {"detail": "E-mail confirmado.", "email": user.email}


@router.post("/auth/resend-verification")
def resend_verification(background: BackgroundTasks, user: User = Depends(security.get_user_from_token)):
    if user.email_verified is not False:
        return {"detail": "E-mail já confirmado."}
    background.add_task(email_service.send_verification_email, user.email, _verification_url(user))
    return {"detail": "Enviamos um novo link de confirmação."}


@router.post("/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, background: BackgroundTasks, db: Session = Depends(database.get_db)):
    # Resposta igual exista ou não a conta: não revela quais e-mails estão cadastrados.
    user = users_crud.get_user_by_email(db, email=payload.email.strip().lower())
    if user:
        token = _sign(
            {"purpose": "reset_password", "email": user.email, "fp": _password_fingerprint(user)},
            settings.PASSWORD_RESET_MINUTES,
        )
        background.add_task(
            email_service.send_password_reset_email, user.email, f"{_get_frontend_url()}/redefinir-senha?token={token}"
        )
    return {"detail": "Se houver uma conta com este e-mail, enviamos um link para redefinir a senha."}


@router.post("/auth/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(database.get_db)):
    data = _unsign(payload.token, "reset_password")
    user = users_crud.get_user_by_email(db, email=data["email"]) if data else None
    if not user or data.get("fp") != _password_fingerprint(user):
        raise HTTPException(status_code=400, detail="Link inválido, expirado ou já usado. Peça um novo.")
    users_crud.update_user_password(db, user_id=user.id, password=payload.password)
    # Quem recebeu o link no e-mail comprovou a posse dele
    if not user.email_verified:
        user.email_verified = True
        user.email_verified_at = datetime.utcnow()
    db.commit()
    return {"detail": "Senha redefinida. Entre com a nova senha."}
