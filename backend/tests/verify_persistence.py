from app.db.session import SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.security import get_password_hash
from sqlalchemy import text

def verify_persistence():
    db = SessionLocal()
    try:
        # 1. Check DB Version
        print("Checking DB connection...")
        result = db.execute(text("SELECT version()"))
        version = result.scalar()
        print(f"✅ Connected to: {version}")

        # 2. Create User
        print("Creating test user...")
        email = "persistence_test@example.com"
        # Cleanup
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()

        user = User(
            email=email,
            hashed_password=get_password_hash("test"),
            full_name="Persistence Tester"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"✅ User created with ID: {user.id}")

        # 3. Create Conversation
        print("Creating conversation...")
        conversation = Conversation(name="Test Chat", is_group=True)
        # Add participant
        conversation.participants.append(user)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        print(f"✅ Conversation created with ID: {conversation.id}")

        # 4. Create Message
        print("Creating message...")
        msg = Message(
            content="Hello Persistence!",
            sender_id=user.id,
            conversation_id=conversation.id
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        print(f"✅ Message saved with ID: {msg.id}")

        # 5. Verify Retrieval
        saved_msg = db.query(Message).filter(Message.id == msg.id).first()
        assert saved_msg.content == "Hello Persistence!"
        assert saved_msg.sender.email == email
        print("✅ Message retrieval verified")
        
        print("🎉 ALL PERSISTENCE TESTS PASSED")

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_persistence()
