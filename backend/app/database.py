from supabase import create_client, Client
from app.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


def get_supabase_auth() -> Client:
    """Client with anon key — for user-facing auth operations."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)
