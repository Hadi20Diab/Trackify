from __future__ import annotations

from supabase import Client, create_client

from app.core.config import get_settings


def create_supabase_admin_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
