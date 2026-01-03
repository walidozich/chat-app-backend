from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.api import deps

router = APIRouter()

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
    
    return [
        {
            "id": conv.id,
            "name": conv.name,
            "is_group": conv.is_group,
            "created_at": conv.created_at.isoformat(),
        }
        for conv in conversations
    ]
