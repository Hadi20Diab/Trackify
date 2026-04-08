from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.auth import AuthUser
from app.services.auth_service import AuthService, get_auth_service

bearer_scheme = HTTPBearer(auto_error=False)


def get_bearer_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
        )

    return credentials.credentials


def get_current_user(
    token: str = Depends(get_bearer_token),
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthUser:
    return auth_service.get_user_from_access_token(token)
