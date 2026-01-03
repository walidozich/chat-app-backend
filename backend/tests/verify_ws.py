from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core import security
from datetime import timedelta

client = TestClient(app)

def test_websocket():
    # 1. Get Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token("1", expires_delta=access_token_expires) # Fake user ID 1
    
    # 2. Connect to WS
    with client.websocket_connect(f"{settings.API_V1_STR}/ws?token={token}") as websocket:
        websocket.send_text("Hello World")
        data = websocket.receive_text()
        assert data == "You wrote: Hello World"
        print("✅ WebSocket Connection & Echo passed")

if __name__ == "__main__":
    try:
        test_websocket()
        print("🎉 ALL TESTS PASSED")
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
