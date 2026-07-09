from urllib.parse import urlparse


def normalize_asyncpg_url(url: str) -> str:
    """Ensure SQLAlchemy async URL uses the asyncpg driver."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def is_remote_supabase(url: str) -> bool:
    host = urlparse(url.replace("postgresql+asyncpg://", "postgresql://", 1)).hostname or ""
    return host.endswith(".supabase.co") or host.endswith(".pooler.supabase.com")


def asyncpg_connect_args(url: str) -> dict:
    """Connect args for Supabase Postgres (SSL + pooler-safe cache settings)."""
    args: dict = {}
    if is_remote_supabase(url):
        args["ssl"] = "require"
    if ":6543" in url:
        args["statement_cache_size"] = 0
    return args


def redacted_database_target(url: str) -> dict:
    """Safe connection metadata for logs (no credentials)."""
    normalized = normalize_asyncpg_url(url)
    parsed = urlparse(normalized.replace("postgresql+asyncpg://", "postgresql://", 1))
    return {
        "host": parsed.hostname,
        "port": parsed.port,
        "database": (parsed.path or "").lstrip("/") or None,
        "uses_asyncpg": "+asyncpg" in normalized,
        "remote_supabase": is_remote_supabase(normalized),
        "pooler_port": parsed.port == 6543,
    }
