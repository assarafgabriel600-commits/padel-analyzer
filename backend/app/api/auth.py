from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.models.schemas import RegisterRequest, LoginRequest, AuthResponse
from app.database import get_supabase, get_supabase_auth
from supabase import AuthApiError

router = APIRouter(prefix="/auth", tags=["auth"])
bearer = HTTPBearer()


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    client = get_supabase_auth()
    try:
        resp = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "first_name": body.first_name,
                    "last_name": body.last_name,
                }
            }
        })
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not resp.user or not resp.session:
        raise HTTPException(status_code=400, detail="Inscription échouée. Vérifiez votre email.")

    meta = resp.user.user_metadata or {}
    return AuthResponse(
        access_token=resp.session.access_token,
        user_id=str(resp.user.id),
        email=resp.user.email,
        first_name=meta.get("first_name", ""),
        last_name=meta.get("last_name", ""),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    client = get_supabase_auth()
    try:
        resp = client.auth.sign_in_with_password({"email": body.email, "password": body.password})
    except AuthApiError as e:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    meta = resp.user.user_metadata or {}
    return AuthResponse(
        access_token=resp.session.access_token,
        user_id=str(resp.user.id),
        email=resp.user.email,
        first_name=meta.get("first_name", ""),
        last_name=meta.get("last_name", ""),
    )


@router.post("/logout")
async def logout(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    client = get_supabase_auth()
    client.auth.sign_out()
    return {"message": "Déconnecté."}


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    """Dependency: validates JWT and returns user dict."""
    client = get_supabase()
    try:
        resp = client.auth.get_user(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré.")
    user = resp.user
    meta = user.user_metadata or {}
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": meta.get("first_name", ""),
        "last_name": meta.get("last_name", ""),
    }


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user
