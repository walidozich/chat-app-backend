import asyncio
import json
from datetime import timedelta
from sqlalchemy.orm import Session

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core import security
from app.db.session import SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.security import get_password_hash

# We use TestClient for REST, but for WS we need to be careful as TestClient's WS support is synchronous.
# For a true async test with multiple clients, we often need `websockets` lib or `httpx` + `anyio`.
# However, TestClient can handle basic WS interaction.
# Simulating 2 concurent users with TestClient is tricky because it's sync.
# We will verify the flow: Connect -> Send -> Receive Echo/Broadcast -> Persist.

def setup_data():
    db = SessionLocal()
    # Create 2 users
    u1 = db.query(User).filter(User.email == "alice@example.com").first()
    if not u1:
        u1 = User(email="alice@example.com", hashed_password=get_password_hash("test"), full_name="Alice")
        db.add(u1)
    
    u2 = db.query(User).filter(User.email == "bob@example.com").first()
    if not u2:
        u2 = User(email="bob@example.com", hashed_password=get_password_hash("test"), full_name="Bob")
        db.add(u2)
    
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    
    # Create Conversation
    conv = Conversation(name="Alice & Bob", is_group=False)
    conv.participants.extend([u1, u2])
    db.add(conv)
    db.commit()
    db.refresh(conv)
    
    return u1, u2, conv.id

def verify_realtime():
    u1, u2, conv_id = setup_data()
    
    client = TestClient(app)
    
    # Get Token for Alice
    token = security.create_access_token(u1.id, expires_delta=timedelta(minutes=30))
    
    print(f"Testing with User: {u1.email}, ConvID: {conv_id}")
    
    with client.websocket_connect(f"{settings.API_V1_STR}/ws?token={token}") as websocket:
        # Prepare Message
        payload = {
            "conversation_id": conv_id,
            "content": "Hello Realtime!"
        }
        event = {
            "type": "message.new",
            "payload": payload
        }
        
        # Send
        websocket.send_text(json.dumps(event))
        
        # Receive Broadcast (Alice should receive it too as she is in participant list)
        data = websocket.receive_text()
        print(f"Received: {data}")
        
        response = json.loads(data)
        assert response["type"] == "message.new"
        assert response["payload"]["content"] == "Hello Realtime!"
        assert response["payload"]["sender_id"] == u1.id
        
        print("✅ WebSocket Send/Receive verified")
        
        # Verify Persistence
        db = SessionLocal()
        msg = db.query(Message).filter(Message.content == "Hello Realtime!").order_by(Message.id.desc()).first()
        assert msg is not None
        assert msg.conversation_id == conv_id
        print("✅ DB Persistence verified")
        
if __name__ == "__main__":
    try:
        verify_realtime()
        print("🎉 ALL REALTIME TESTS PASSED")
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
