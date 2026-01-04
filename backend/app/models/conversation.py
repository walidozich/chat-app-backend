from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

# Association table for Group Conversations
conversation_participants = Table(
    'conversation_participants',
    Base.metadata,
    Column('conversation_id', Integer, ForeignKey('conversation.id'), primary_key=True),
    Column('user_id', Integer, ForeignKey('user.id'), primary_key=True),
    Column('joined_at', DateTime(timezone=True), server_default=func.now()),
    Column('last_read_at', DateTime(timezone=True), nullable=True)
)

class Conversation(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True) # Optional for 1-on-1
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    participants = relationship("User", secondary=conversation_participants, backref="conversations")
    messages = relationship("Message", back_populates="conversation")
