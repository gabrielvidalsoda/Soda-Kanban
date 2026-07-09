from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SODA KANBAN API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/soda_kanba"
    database_url_direct: str | None = None
    redis_url: str = "redis://localhost:6379/0"

    supabase_url: str = "http://localhost:54321"
    supabase_service_role_key: str = "dev-service-role-key"
    supabase_jwt_secret: str = "dev-jwt-secret"

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    frontend_url: str = "http://localhost:5173"

    resend_api_key: str = ""
    from_email: str = "noreply@localhost"

    supabase_attachments_bucket: str = "attachments"
    supabase_avatars_bucket: str = "avatars"
    presigned_url_expire_seconds: int = 900
    max_avatar_bytes: int = 5 * 1024 * 1024
    max_attachment_bytes: int = 10 * 1024 * 1024

    @property
    def migration_database_url(self) -> str:
        return self.database_url_direct or self.database_url


@lru_cache
def get_settings() -> Settings:
    return Settings()
