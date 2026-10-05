import urllib.parse
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
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

router = APIRouter()


@router.post("/register", response_model=users_schemas.User, status_code=status.HTTP_201_CREATED)
def register(payload: users_schemas.UserRegister, db: Session = Depends(database.get_db)):
    """Cadastro público: cria a conta com Nome, Sobrenome, E-mail e Senha."""
    email_clean = payload.email.strip().lower()
    
    taken = db.query(User).filter(User.email.ilike(email_clean)).first()
    if taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este e-mail já está em uso. Tente outro ou faça login.",
        )

    full_name = f"{payload.first_name.strip()} {payload.last_name.strip()}".strip()

    return users_crud.create_user(
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
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


def _get_base_scheme_and_host(request: Request) -> tuple[str, str]:
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    host = forwarded_host or request.headers.get("host") or request.base_url.netloc or "localhost:8501"
    is_local = "localhost" in host or "127.0.0.1" in host
    scheme = forwarded_proto or ("http" if is_local else "https")
    return scheme, host


def _get_frontend_url(request: Request) -> str:
    # 1. Tentar obter pelo cabeçalho origin ou referer do navegador
    origin = request.headers.get("origin")
    if origin:
        return origin.rstrip("/")
    referer = request.headers.get("referer")
    if referer:
        parsed = urllib.parse.urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

    scheme, host = _get_base_scheme_and_host(request)
    is_local = "localhost" in host or "127.0.0.1" in host

    # 2. Se for local e FRONTEND_URL estiver no .env
    if is_local and settings.FRONTEND_URL:
        return settings.FRONTEND_URL.rstrip("/")
    elif not is_local:
        return f"{scheme}://{host}".rstrip("/")

    return "http://localhost:5273"


def _get_google_callback_url(request: Request) -> str:
    scheme, host = _get_base_scheme_and_host(request)
    is_local = "localhost" in host or "127.0.0.1" in host

    # Se houver configuração explícita e condizente com o ambiente
    if settings.GOOGLE_CALLBACK_URL and settings.GOOGLE_CALLBACK_URL.strip():
        configured = settings.GOOGLE_CALLBACK_URL.strip()
        if is_local and ("localhost" in configured or "127.0.0.1" in configured):
            return configured
        elif not is_local and ("localhost" not in configured and "127.0.0.1" not in configured):
            return configured

    # Detecção 100% dinâmica automática:
    if is_local:
        return f"http://localhost:8501/auth/google/callback"
    else:
        # Em produção com proxy Nginx, o endpoint público é sob /api/auth/google/callback
        return f"{scheme}://{host}/api/auth/google/callback"


@router.get("/auth/google")
@router.get("/google")
async def google_login(
    request: Request,
    state: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
):
    """Inicia o fluxo OAuth com o Google."""
    frontend_url = _get_frontend_url(request)

    if not settings.GOOGLE_CLIENT_ID:
        return RedirectResponse(url=f"{frontend_url}/login?error=google_not_configured")

    callback_url = _get_google_callback_url(request)

    state_payload = state or ""
    if token and not state:
        state_payload = f"token:{token}"
    elif token and state:
        state_payload = f"{state}|token:{token}"

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": settings.GOOGLE_SCOPES,
        "access_type": "offline",
        "prompt": "consent",
    }
    if state_payload:
        params["state"] = state_payload

    google_auth_base = settings.GOOGLE_AUTH_URL.rstrip("?")
    google_auth_url = f"{google_auth_base}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=google_auth_url)


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
    frontend_url = _get_frontend_url(request)

    if error or not code:
        logger.warning(f"Google OAuth error or missing code: {error}")
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("Google OAuth client credentials not set.")
        return RedirectResponse(url=f"{frontend_url}/login?error=google_not_configured")

    callback_url = _get_google_callback_url(request)

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

        # 3. Verificar se o state carrega um token JWT do usuário já logado
        user = None
        target_redirect = "/dashboard"

        if state:
            if "agenda" in state:
                target_redirect = "/dashboard/agenda"

            if "token:" in state:
                try:
                    user_token = state.split("token:")[1].split("|")[0].strip()
                    payload = security.jwt.decode(
                        user_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
                    )
                    sub_email = payload.get("sub")
                    if sub_email:
                        user = users_crud.get_user_by_email(db, email=sub_email)
                except Exception as e:
                    logger.warning(f"Could not parse user token from state: {e}")

        # Se não achou pelo token do state, busca por email
        if not user:
            user = users_crud.get_user_by_email(db, email=email_clean)

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
            db.commit()
            db.refresh(user)
        else:
            # Atualizar google_id, avatar e tokens sem apagar nenhum dado do usuário
            if not user.google_id:
                user.google_id = google_id
            if not user.avatar and picture:
                user.avatar = picture
            user.google_access_token = access_token_google
            if refresh_token_google:
                user.google_refresh_token = refresh_token_google
            db.commit()
            db.refresh(user)

        # 4. Gerar access token JWT da nossa aplicação
        access_token_expires = security.timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
        app_jwt = security.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?token={app_jwt}&redirect={target_redirect}&isNewUser={'true' if is_new_user else 'false'}"
        )

    except Exception as e:
        logger.error(f"Exception during Google OAuth callback: {e}", exc_info=True)
        return RedirectResponse(url=f"{frontend_url}/login?error=oauth_failed")

