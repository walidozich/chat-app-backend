from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.base_class import Base
from app.api import deps
from app.core.config import settings

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[deps.get_db] = override_get_db

client = TestClient(app)

def test_create_user():
    response = client.post(
        f"{settings.API_V1_STR}/users/",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_login_access_token():
    response = client.post(
        f"{settings.API_V1_STR}/login/access-token",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    return data["access_token"]

def test_read_users_me():
    token = test_login_access_token()
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"

if __name__ == "__main__":
    try:
        test_create_user()
        print("✅ User creation passed")
        test_login_access_token()
        print("✅ Login passed")
        test_read_users_me()
        print("✅ Get Current User passed")
        print("🎉 ALL TESTS PASSED")
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
