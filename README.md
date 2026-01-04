# Real-time Chat Application

A real-time messaging platform using FastAPI (Backend) and WebSockets.

## Demo

[![Watch the Demo](https://res.cloudinary.com/dqgfuemcn/video/upload/c_fill,h_450,w_800,e_blur:200/Screencast_From_2026-01-03_17-35-29_vfjlfj.jpg)](https://player.cloudinary.com/embed/?cloud_name=dqgfuemcn&public_id=Screencast_From_2026-01-03_17-35-29_vfjlfj&profile=cld-default)

*Click the image above to watch the demo video*

## Project Structure
- `backend/`: FastAPI application.
- `frontend/`: Client application built with Next.js.

## Setup & Installation

### Prerequisites
- Python 3.12+
- Node.js & npm
- Docker

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
source venv/bin/activate
uvicorn app.main:app --reload --port 8001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

**To run the frontend:**
```bash
cd frontend
npm run dev
```

## Database Setup

1. Start PostgreSQL using Docker:
   ```bash
   docker compose up -d
   ```

2. Seed the database with sample data:
   ```bash
   cd backend
   source venv/bin/activate
   PYTHONPATH=. python seed.py
   ```

   This creates test accounts:
   - alice@example.com / password123
   - bob@example.com / password123
   - charlie@example.com / password123
   - diana@example.com / password123

## Features
- JWT Authentication (Login/Register)
- Real-time Messaging via WebSockets
- Message Persistence in PostgreSQL
- Modern Next.js UI
- Conversation Management (Direct & Group)
- User search and start-a-chat flow
- **Unread Message Counts**: Badge indicators showing unread messages per conversation
- **Read Receipts**: "Seen" status on messages when the recipient views them
- **Last Read Tracking**: Per-user tracking of last read timestamp for each conversation
- **Toast Notifications**: In-app notifications for new messages in inactive conversations
- **Message Pagination**: Load earlier messages with infinite scroll support

## How to Use
1. Ensure Docker is running.
2. Start the backend on port 8001.
3. Start the frontend on port 3000.
4. Login with a test account or register a new one.
5. Start chatting!
