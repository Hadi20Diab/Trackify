from __future__ import annotations

from fastapi import HTTPException, status
from supabase import Client

from app.core.config import Settings, get_settings
from app.core.supabase import create_supabase_admin_client
from app.schemas.auth import AuthSessionResponse, AuthUser, ForgotPasswordRequest, LoginRequest, RegisterRequest


class AuthService:
    def __init__(self, client: Client, settings: Settings) -> None:
        self.client = client
        self.settings = settings

    def register(self, payload: RegisterRequest) -> AuthSessionResponse:
        sign_up_payload: dict[str, object] = {
            "email": payload.email,
            "password": payload.password,
        }

        if payload.fullName:
            sign_up_payload["options"] = {"data": {"full_name": payload.fullName}}

        try:
            response = self.client.auth.sign_up(sign_up_payload)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        user = self._read_attr(response, "user")
        session = self._read_attr(response, "session")

        if user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to register user.")

        auth_user = self._map_user(user)
        if session is None:
            return AuthSessionResponse(
                user=auth_user,
                requiresEmailConfirmation=True,
                message="Registration successful. Please confirm your email before signing in.",
            )

        return self._map_session_response(auth_user, session)

    def login(self, payload: LoginRequest) -> AuthSessionResponse:
        try:
            response = self.client.auth.sign_in_with_password(
                {
                    "email": payload.email,
                    "password": payload.password,
                }
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.") from exc

        user = self._read_attr(response, "user")
        session = self._read_attr(response, "session")

        if user is None or session is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

        return self._map_session_response(self._map_user(user), session)

    def get_user_from_access_token(self, access_token: str) -> AuthUser:
        try:
            response = self.client.auth.get_user(access_token)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.") from exc

        user = self._read_attr(response, "user")
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token.")

        return self._map_user(user)

    def send_password_reset(self, payload: ForgotPasswordRequest) -> str:
        try:
            self.client.auth.reset_password_email(
                payload.email,
                {
                    "redirect_to": self.settings.supabase_password_reset_redirect_url,
                },
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send password reset email.",
            ) from exc

        return "Password reset instructions were sent if the account exists."

    @staticmethod
    def _read_attr(target: object, name: str, default: object | None = None) -> object | None:
        if isinstance(target, dict):
            return target.get(name, default)
        return getattr(target, name, default)

    def _map_user(self, user_obj: object) -> AuthUser:
        user_metadata = self._read_attr(user_obj, "user_metadata")
        full_name: str | None = None

        if isinstance(user_metadata, dict):
            raw_full_name = user_metadata.get("full_name")
            if isinstance(raw_full_name, str) and raw_full_name.strip():
                full_name = raw_full_name.strip()

        user_id = self._read_attr(user_obj, "id")
        email = self._read_attr(user_obj, "email")

        if not isinstance(user_id, str) or not isinstance(email, str):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Invalid user payload.")

        email_confirmed_at = self._read_attr(user_obj, "email_confirmed_at")

        return AuthUser(
            id=user_id,
            email=email,
            fullName=full_name,
            emailConfirmedAt=str(email_confirmed_at) if email_confirmed_at else None,
        )

    def _map_session_response(self, user: AuthUser, session: object) -> AuthSessionResponse:
        access_token = self._read_attr(session, "access_token")
        refresh_token = self._read_attr(session, "refresh_token")
        expires_in = self._read_attr(session, "expires_in")
        token_type = self._read_attr(session, "token_type")

        return AuthSessionResponse(
            user=user,
            accessToken=str(access_token) if access_token else None,
            refreshToken=str(refresh_token) if refresh_token else None,
            expiresIn=int(expires_in) if isinstance(expires_in, int) else None,
            tokenType=str(token_type) if token_type else None,
        )


def get_auth_service() -> AuthService:
    return AuthService(create_supabase_admin_client(), get_settings())
