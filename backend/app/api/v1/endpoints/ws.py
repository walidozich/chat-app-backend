from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from jose import jwt, JWTError

from app.core.config import settings
from app.websockets.manager import manager
from app.schemas.token import TokenPayload

router = APIRouter()

async def get_token_user(token: str = Query(...)) -> Optional[int]:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            return None
        return int(token_data.sub)
    except (JWTError, ValueError):
        return None

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Optional[int] = Depends(get_token_user)
):
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Simple Echo for verifying connection
            await manager.send_personal_message(f"You wrote: {data}", websocket)
            # manager.broadcast(f"User {user_id} says: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        # await manager.broadcast(f"User {user_id} left the chat")
