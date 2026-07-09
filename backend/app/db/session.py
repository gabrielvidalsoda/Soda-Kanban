from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.database_url import asyncpg_connect_args

settings = get_settings()
engine = create_async_engine(
    settings.normalized_database_url,
    echo=settings.debug,
    connect_args=asyncpg_connect_args(settings.normalized_database_url),
)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
