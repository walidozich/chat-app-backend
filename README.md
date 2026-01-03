# Real-time Chat Application

A real-time messaging platform using FastAPI (Backend) and WebSockets.

## Project Structure
- `backend/`: FastAPI application.
- `frontend/`: Client application (currently placeholder).

## Setup & Installation

### Prerequisites
- Python 3.8+
- pip

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
```

**To run the backend:**
```bash
cd backend
source venv/bin/activate  # Activate virtual environment first
uvicorn app.main:app --reload --port 8001
```

## Features & Verification

### 1. Project Initialization
- **Status**: ✅ Completed
- **Verification**:
  Run the server:
  ```bash
  uvicorn app.main:app --reload
  ```
  Visit `http://localhost:8000/docs` to see the Swagger UI.

### 2. Authentication (JWT)
- **Status**: ✅ Completed
- **Endpoints**:
  - `POST /api/v1/users/`: Register a new user.
  - `POST /api/v1/login/access-token`: Login and get JWT.
  - `GET /api/v1/users/me`: Get current user profile (Protected).
- **Verification**:
  You can run the automated verification script:
  ```bash
  # Ensure you are in the project root
  export PYTHONPATH=backend
  python backend/tests/verify_auth.py
  ```
  Expected output:
  ```
  ✅ User creation passed
  ✅ Login passed
  ✅ Get Current User passed
  🎉 ALL TESTS PASSED
  ```

### 3. WebSockets
- **Status**: ✅ Completed
- **Endpoints**:
  - `WS /api/v1/ws?token={access_token}`: Real-time connection.
- **Verification**:
  ```bash
  export PYTHONPATH=backend
  python backend/tests/verify_ws.py
  ```

### 4. Message Persistence (PostgreSQL)
- **Status**: ✅ Completed
- **Infrastructure**: Dockerized PostgreSQL.
- **Verification**:
  ```bash
  # Ensure Docker is running
  docker compose up -d
  
  # Run persistence test
  export PYTHONPATH=backend
  python backend/tests/verify_persistence.py
  ```

### 5. Real-time Messaging
- **Status**: ✅ Completed
- **Features**: Send/receive messages via WebSocket with persistence and broadcasting.
- **Verification**:
  ```bash
  export PYTHONPATH=backend
  python backend/tests/verify_realtime.py
  ```

### 6. Frontend Client (Next.js)
- **Status**: ✅ Completed
- **Features**: Modern UI with authentication, real-time chat, and WebSocket integration.
- **Setup**:
  ```bash
  cd frontend
  npm install
  ```
- **Running**:
  ```bash
  # Terminal 1: Start backend
  cd backend
  uvicorn app.main:app --reload --port 8001
  
  # Terminal 2: Start frontend
  cd frontend
  npm run dev
  ```
- **Access**: Open `http://localhost:3000` in your browser

## Database Seeding

To populate the database with sample data (users, conversations, and messages):

```bash
cd backend
source venv/bin/activate
PYTHONPATH=. python seed.py
```

This creates 4 test users:
- alice@example.com / password123
- bob@example.com / password123
- charlie@example.com / password123
- diana@example.com / password123

## How to Use
1. Start PostgreSQL: `docker compose up -d`
2. Start backend: `cd backend && uvicorn app.main:app --reload --port 8001`
3. Start frontend: `cd frontend && npm run dev`
4. Register a new account at `http://localhost:3000/register`
5. Login and start chatting!

## Upcoming Features
- Frontend Client (UI + WebSocket integration)
