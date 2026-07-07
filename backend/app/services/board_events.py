import json
import logging
from typing import Any

import redis.asyncio as aioredis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def create_pubsub_redis() -> aioredis.Redis:
    # Pub/sub listen blocks until a message arrives; disable read timeout.
    return aioredis.from_url(settings.redis_url, decode_responses=True, socket_timeout=None)


def board_channel(board_id: str) -> str:
    return f"board:{board_id}"


async def publish_board_event(board_id: str, event: dict[str, Any]) -> None:
    try:
        client = await get_redis()
        await client.publish(board_channel(board_id), json.dumps(event))
    except Exception:
        logger.exception("Failed to publish board event for %s", board_id)


async def close_redis() -> None:
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
