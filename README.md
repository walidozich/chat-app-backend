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

## Upcoming Features
- Real-time Messaging
