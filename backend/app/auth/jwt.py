import uuid

import jwt

from app.config import get_settings

settings = get_settings()


def decode_supabase_access_token(token: str) -> dict | None:
    """Verify a Supabase Auth JWT and return claims, or None if invalid."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        if payload.get("role") != "authenticated":
            return None
        return payload
    except (jwt.PyJWTError, ValueError, KeyError):
        return None


def user_id_from_token(token: str) -> uuid.UUID | None:
    claims = decode_supabase_access_token(token)
    if not claims or "sub" not in claims:
        return None
    try:
        return uuid.UUID(claims["sub"])
    except ValueError:
        return None
