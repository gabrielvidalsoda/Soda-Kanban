import asyncio
import json
import logging
import uuid
from collections import defaultdict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.auth.jwt import user_id_from_token
from app.db.models import Board
from app.db.session import async_session_factory
from app.services.board_events import create_pubsub_redis
from app.services.permissions import can_view_board

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = defaultdict(set)
        self._listener_started = False

    async def connect(self, board_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active[board_id].add(websocket)
        if not self._listener_started:
            asyncio.create_task(self._redis_listener())
            self._listener_started = True

    def disconnect(self, board_id: str, websocket: WebSocket) -> None:
        self.active[board_id].discard(websocket)

    async def broadcast(self, board_id: str, message: str) -> None:
        dead: list[WebSocket] = []
        for ws in self.active.get(board_id, set()):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(board_id, ws)

    async def _redis_listener(self) -> None:
        while True:
            redis = None
            pubsub = None
            try:
                redis = create_pubsub_redis()
                pubsub = redis.pubsub()
                await pubsub.psubscribe("board:*")
                async for message in pubsub.listen():
                    if message["type"] != "pmessage":
                        continue
                    channel = message["channel"]
                    board_id = channel.split(":", 1)[1]
                    await self.broadcast(board_id, message["data"])
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Redis listener failed")
                await asyncio.sleep(1)
            finally:
                if pubsub is not None:
                    await pubsub.aclose()
                if redis is not None:
                    await redis.aclose()


manager = ConnectionManager()


@router.websocket("/ws/boards/{board_id}")
async def board_websocket(websocket: WebSocket, board_id: uuid.UUID) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    user_id = user_id_from_token(token)
    if not user_id:
        await websocket.close(code=4401)
        return

    async with async_session_factory() as db:
        result = await db.execute(select(Board).where(Board.id == board_id))
        board = result.scalar_one_or_none()
        if not board:
            await websocket.close(code=4404)
            return
        from app.db.models import User

        user = await db.get(User, user_id)
        if not user or not await can_view_board(db, board, user):
            await websocket.close(code=4403)
            return

    board_key = str(board_id)
    await manager.connect(board_key, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Clients may send ping messages; echo pong for keepalive
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect(board_key, websocket)
