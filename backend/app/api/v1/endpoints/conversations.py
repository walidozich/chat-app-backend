from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas
from app.api import deps
from app.models.conversation import conversation_participants

router = APIRouter()

def serialize_conversation(conv: models.Conversation, db: Session, current_user_id: int) -> dict:
    last_read_row = db.execute(
        conversation_participants.select()
        .where(conversation_participants.c.conversation_id == conv.id)
        .where(conversation_participants.c.user_id == current_user_id)
    ).fetchone()
    last_read_at = last_read_row.last_read_at if last_read_row else None
    unread_query = (
        db.query(func.count(models.Message.id))
        .filter(models.Message.conversation_id == conv.id)
        .filter(models.Message.sender_id != current_user_id)
    )
    if last_read_at:
        unread_query = unread_query.filter(models.Message.created_at > last_read_at)
    unread_count = unread_query.scalar()
    participants = [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
        }
        for user in conv.participants
    ]
    return {
        "id": conv.id,
        "name": conv.name,
        "is_group": conv.is_group,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "message_count": unread_count or 0,
        "participants": participants,
    }

@router.get("/")
def get_conversations(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> List[dict]:
    """
    Get all conversations for the current user.
    """
    conversations = db.query(models.Conversation).join(
        models.Conversation.participants
    ).filter(
        models.User.id == current_user.id
    ).all()
    
    return [serialize_conversation(conv, db, current_user.id) for conv in conversations]

@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> dict:
    """
    Get a single conversation for the current user.
    """
    conversation = (
        db.query(models.Conversation)
        .filter(models.Conversation.id == conversation_id)
        .join(models.Conversation.participants)
        .filter(models.User.id == current_user.id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return serialize_conversation(conversation, db, current_user.id)

@router.post("/direct")
def create_direct_conversation(
    payload: schemas.DirectConversationCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user),
) -> dict:
    """
    Create or retrieve a direct conversation with another user.
    """
    if payload.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot create a conversation with yourself.")
    
    target_user = db.query(models.User).filter(models.User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    existing = (
        db.query(models.Conversation)
        .filter(models.Conversation.is_group == False)
        .filter(models.Conversation.participants.any(models.User.id == current_user.id))
        .filter(models.Conversation.participants.any(models.User.id == target_user.id))
        .first()
    )
    
    if existing:
        return serialize_conversation(existing, db, current_user.id)
    
    conversation_name = target_user.full_name or target_user.email
    conversation = models.Conversation(
        name=conversation_name,
        is_group=False,
    )
    conversation.participants.extend([current_user, target_user])
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return serialize_conversation(conversation, db, current_user.id)
