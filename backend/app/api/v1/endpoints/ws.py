from typing import Optional
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.core.config import settings
from app.websockets.manager import manager
from app.schemas.token import TokenPayload
from app import schemas, models
from app.db.session import SessionLocal

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
            try:
                # 1. Parse Event
                event_dict = json.loads(data)
                event = schemas.SocketEvent(**event_dict)
                
                if event.type == "message.new":
                    # 2. Parse Payload
                    payload = schemas.IncomingMessage(**event.payload)
                    
                    # 3. Persist Message
                    # We need a fresh session here since we are in an async loop and not in a standard request
                    db = SessionLocal()
                    try:
                        # Verify user is participant
                        # For simplicity, assuming direct message or user in conversation
                        # In production, check existing membership properly
                        
                        msg = models.Message(
                            content=payload.content,
                            sender_id=user_id,
                            conversation_id=payload.conversation_id
                        )
                        db.add(msg)
                        db.commit()
                        db.refresh(msg)
                        
                        # 4. Get recipients
                        conversation = db.query(models.Conversation).get(payload.conversation_id)
                        recipient_ids = [p.id for p in conversation.participants]
                        
                        # 5. Broadcast
                        out_msg = schemas.OutgoingMessage.model_validate(msg)
                        response_event = schemas.SocketEvent(
                            type="message.new",
                            payload=out_msg.model_dump(mode="json")
                        )
                        await manager.broadcast_to_users(recipient_ids, response_event.model_dump_json())
                        
                    finally:
                        db.close()
            
            except (ValidationError, json.JSONDecodeError) as e:
                await manager.send_personal_message(f"Error: Invalid format", websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
