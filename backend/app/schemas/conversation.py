from pydantic import BaseModel


class DirectConversationCreate(BaseModel):
    user_id: int
