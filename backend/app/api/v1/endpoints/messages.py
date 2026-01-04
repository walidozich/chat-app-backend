from typing import List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models
from app.api import deps
from app.models.conversation import conversation_participants
from app.websockets.manager import manager
from datetime import datetime
import json

router = APIRouter()

async def notify_read_receipt(user_ids: List[int], event: dict):
    """Background task to notify users about read receipt."""
    await manager.broadcast_to_users(user_ids, json.dumps(event))

@router.get("/{conversation_id}/messages")
def get_messages(
    conversation_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
    limit: int = Query(20, le=50),
    before_id: Optional[int] = Query(None, description="Fetch messages older than this id"),
) -> List[dict]:
    """
    Get paginated messages for a conversation (newest first, optional cursor).
    Also marks the conversation as read for the current user.
    """
    conversation = db.query(models.Conversation).filter(
        models.Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        return []
    
    is_participant = any(p.id == current_user.id for p in conversation.participants)
    if not is_participant:
        return []

    # Load last_read_at for participants
    last_reads = {
        row.user_id: row.last_read_at
        for row in db.query(
            conversation_participants.c.user_id,
            conversation_participants.c.last_read_at
        ).filter(conversation_participants.c.conversation_id == conversation_id)
    }

    query = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    )
    if before_id:
        query = query.filter(models.Message.id < before_id)

    messages = (
        query.order_by(models.Message.id.desc())
        .limit(limit)
        .all()
    )

    # Mark as read now
    now = datetime.utcnow()
    db.execute(
        conversation_participants.update()
        .where(conversation_participants.c.conversation_id == conversation_id)
        .where(conversation_participants.c.user_id == current_user.id)
        .values(last_read_at=now)
    )
    db.commit()

    # Notify other participants about read status
    other_user_ids = [p.id for p in conversation.participants if p.id != current_user.id]
    if other_user_ids:
        event = {
            "type": "conversation.read",
            "payload": {
                "conversation_id": conversation_id,
                "user_id": current_user.id,
                "last_read_at": now.isoformat(),
            },
        }
        background_tasks.add_task(notify_read_receipt, other_user_ids, event)
    
    def message_seen(msg: models.Message) -> bool:
        other_participants = [p.id for p in conversation.participants if p.id != msg.sender_id]
        if not other_participants:
            return False
        for uid in other_participants:
            lr = last_reads.get(uid)
            if not lr:
                return False
            if msg.created_at and lr < msg.created_at:
                return False
        return True

    return [
        {
            "id": msg.id,
            "conversation_id": msg.conversation_id,
            "sender_id": msg.sender_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat(),
            "seen": message_seen(msg),
        }
        for msg in reversed(messages)
    ]
