"""
Database seeding script
Creates sample users, conversations, and messages for testing
"""
from app.db.session import SessionLocal
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.security import get_password_hash

def seed_database():
    db = SessionLocal()
    
    try:
        # Clear existing data (in correct order due to foreign keys)
        print("Clearing existing data...")
        from sqlalchemy import text
        db.query(Message).delete()
        db.execute(text("DELETE FROM conversation_participants"))
        db.query(Conversation).delete()
        db.query(User).delete()
        db.commit()
        
        # Create users
        print("Creating users...")
        users_data = [
            {"email": "alice@example.com", "full_name": "Alice Johnson", "password": "password123"},
            {"email": "bob@example.com", "full_name": "Bob Smith", "password": "password123"},
            {"email": "charlie@example.com", "full_name": "Charlie Brown", "password": "password123"},
            {"email": "diana@example.com", "full_name": "Diana Prince", "password": "password123"},
        ]
        
        users = []
        for user_data in users_data:
            user = User(
                email=user_data["email"],
                full_name=user_data["full_name"],
                hashed_password=get_password_hash(user_data["password"]),
                is_active=True
            )
            db.add(user)
            users.append(user)
        
        db.commit()
        for user in users:
            db.refresh(user)
        print(f"✅ Created {len(users)} users")
        
        # Create conversations
        print("Creating conversations...")
        conversations = []
        
        # General Chat (Group)
        general_chat = Conversation(
            name="General Chat",
            is_group=True
        )
        general_chat.participants.extend(users)
        db.add(general_chat)
        conversations.append(general_chat)
        
        # Alice & Bob (Direct)
        alice_bob = Conversation(
            name="Alice & Bob",
            is_group=False
        )
        alice_bob.participants.extend([users[0], users[1]])
        db.add(alice_bob)
        conversations.append(alice_bob)
        
        # Charlie & Diana (Direct)
        charlie_diana = Conversation(
            name="Charlie & Diana",
            is_group=False
        )
        charlie_diana.participants.extend([users[2], users[3]])
        db.add(charlie_diana)
        conversations.append(charlie_diana)
        
        # Team Discussion (Group)
        team_discussion = Conversation(
            name="Team Discussion",
            is_group=True
        )
        team_discussion.participants.extend([users[0], users[1], users[2]])
        db.add(team_discussion)
        conversations.append(team_discussion)
        
        db.commit()
        for conv in conversations:
            db.refresh(conv)
        print(f"✅ Created {len(conversations)} conversations")
        
        # Create messages
        print("Creating messages...")
        messages_data = [
            # General Chat messages
            {"conversation": general_chat, "sender": users[0], "content": "Hey everyone! Welcome to the chat!"},
            {"conversation": general_chat, "sender": users[1], "content": "Thanks Alice! Excited to be here."},
            {"conversation": general_chat, "sender": users[2], "content": "Hello team! 👋"},
            {"conversation": general_chat, "sender": users[3], "content": "Hi all! Looking forward to collaborating."},
            
            # Alice & Bob messages
            {"conversation": alice_bob, "sender": users[0], "content": "Hey Bob, did you finish the report?"},
            {"conversation": alice_bob, "sender": users[1], "content": "Almost done! Will send it by EOD."},
            {"conversation": alice_bob, "sender": users[0], "content": "Perfect, thanks!"},
            
            # Charlie & Diana messages
            {"conversation": charlie_diana, "sender": users[2], "content": "Diana, can we schedule a meeting?"},
            {"conversation": charlie_diana, "sender": users[3], "content": "Sure! How about tomorrow at 2 PM?"},
            {"conversation": charlie_diana, "sender": users[2], "content": "Works for me! See you then."},
            
            # Team Discussion messages
            {"conversation": team_discussion, "sender": users[0], "content": "Team, let's discuss the new project."},
            {"conversation": team_discussion, "sender": users[1], "content": "I have some ideas to share."},
            {"conversation": team_discussion, "sender": users[2], "content": "Great! Let's brainstorm together."},
        ]
        
        messages = []
        for msg_data in messages_data:
            message = Message(
                conversation_id=msg_data["conversation"].id,
                sender_id=msg_data["sender"].id,
                content=msg_data["content"]
            )
            db.add(message)
            messages.append(message)
        
        db.commit()
        print(f"✅ Created {len(messages)} messages")
        
        print("\n🎉 Database seeded successfully!")
        print("\nTest Accounts:")
        print("=" * 50)
        for user_data in users_data:
            print(f"Email: {user_data['email']}")
            print(f"Password: {user_data['password']}")
            print("-" * 50)
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
