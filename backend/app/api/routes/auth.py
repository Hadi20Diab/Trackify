from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.schemas.auth import (
    AuthMessageResponse,
    AuthSessionResponse,
    AuthUser,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
)
from app.services.auth_service import AuthService, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    return auth_service.register(payload)


@router.post("/login", response_model=AuthSessionResponse)
def login(
    payload: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    return auth_service.login(payload)


@router.get("/me", response_model=AuthUser)
def me(current_user: AuthUser = Depends(get_current_user)) -> AuthUser:
    return current_user


@router.post("/forgot-password", response_model=AuthMessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthMessageResponse:
    message = auth_service.send_password_reset(payload)
    return AuthMessageResponse(message=message)
