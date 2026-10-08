"""Verify Neon Managed Auth JWTs without passing secrets into MCP children."""

import asyncio
import os
from functools import lru_cache
from urllib.parse import urlsplit

import jwt
from fastapi import HTTPException


@lru_cache(maxsize=4)
def jwks_client(url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(url, timeout=10)


async def authenticate_reviewer(authorization: str) -> str:
    base = os.getenv("NEON_AUTH_BASE_URL", "")
    jwks = os.getenv("NEON_AUTH_JWKS_URL", "")
    origin = urlsplit(base)
    if origin.scheme != "https" or not origin.hostname or urlsplit(jwks).scheme != "https":
        raise HTTPException(503, "Engine authentication is not configured")
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in required")
    try:
        token = authorization[7:]
        key = await asyncio.to_thread(jwks_client(jwks).get_signing_key_from_jwt, token)
        payload = jwt.decode(
            token, key.key, algorithms=["EdDSA"],
            issuer=f"{origin.scheme}://{origin.netloc}",
            options={"require": ["sub", "exp", "iat"], "verify_aud": False},
        )
        owner = payload["sub"]
        if not isinstance(owner, str) or not owner or len(owner) > 200 or owner in {"anon", "anonymous"} or payload.get("is_anonymous") or payload.get("isAnonymous") or payload.get("role") == "anonymous":
            raise jwt.InvalidTokenError()
        return owner
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, "Authentication service is unavailable") from None
    except (jwt.PyJWTError, ValueError, KeyError):
        raise HTTPException(401, "Session expired or invalid") from None
