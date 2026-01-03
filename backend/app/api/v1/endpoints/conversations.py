from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.api import deps

router = APIRouter()

def serialize_conversation(conv: models.Conversation) -> dict:
    return {
        "id": conv.id,
        "name": conv.name,
        "is_group": conv.is_group,
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
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
    
    return [serialize_conversation(conv) for conv in conversations]

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
    return serialize_conversation(conversation)

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
        return serialize_conversation(existing)
    
    conversation_name = f"{current_user.full_name or current_user.email} & {target_user.full_name or target_user.email}"
    conversation = models.Conversation(
        name=conversation_name,
        is_group=False,
    )
    conversation.participants.extend([current_user, target_user])
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    
    return serialize_conversation(conversation)
