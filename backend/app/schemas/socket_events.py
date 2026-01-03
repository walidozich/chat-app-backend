from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime

class SocketEvent(BaseModel):
    type: str
    payload: Any

class IncomingMessage(BaseModel):
    conversation_id: int
    content: str

class OutgoingMessage(BaseModel):
    id: int
    conversation_id: int
    content: str
    sender_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
