# Project Context: Real-time Chat Application

This document provides context for AI agents or developers continuing the work on this project.

## 🚀 Project Overview
A modern, real-time chat application with a FastAPI backend and Next.js frontend. It features JWT authentication, PostgreSQL persistence, and real-time messaging via WebSockets.

## 🛠 Tech Stack
- **Backend**: FastAPI (Python 3.14), SQLAlchemy ORM, PostgreSQL (via Docker), Alembic Migrations, WebSockets.
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React.
- **Infrastructure**: Docker Compose for PostgreSQL (Port 5433 mapped to 5432).

## 🔑 Key Implementation Details

### 1. Backend Port
The backend runs on **port 8001** (to avoid common conflicts with port 8000).
- Frontend `.env.local` is configured to connect to `http://localhost:8001`.

### 2. Authentication & Security
- **Bcrypt**: We use `bcrypt` directly (not through `passlib`) for compatibility with Python 3.14.
- **Password Limit**: Bcrypt has a 72-byte limit. The `get_password_hash` function in `backend/app/core/security.py` handles truncation.
- **JWT**: Standard JWT tokens are used for both REST endpoints and WebSocket handshakes.

### 3. Database
- **Docker**: Run `docker-compose up -d` to start the PostgreSQL container.
- **Seeding**: Use `backend/seed.py` to populate the DB with test users and chats.
- **Models**: `User`, `Conversation`, `Message`, and `ConversationParticipant` (association table).

### 4. WebSocket Flow
- **Endpoint**: `ws://localhost:8001/api/v1/ws?token=...`
- **Manager**: `ConnectionManager` in `backend/app/websockets/manager.py` handles active connections and broadcasting.
- **Filtering**: The frontend filters incoming messages by `activeConversationId` to avoid display leaks.

## ✅ Current Status
- [x] PostgreSQL Migration & Persistence.
- [x] JWT Authentication (Login/Register).
- [x] Real-time Messaging (WebSocket).
- [x] Database Seeding script.
- [x] Next.js Chat UI with Sidebar and Chat Area.
- [x] API endpoints for fetching Conversations and Messages.

## 🛠 Troubleshooting & Gotchas
- **Hydration Warning**: Fixed in `frontend/app/layout.tsx` using `suppressHydrationWarning` on the `<html>` tag.
- **Virtual Env**: Always activate the venv in `backend/venv` before running.
- **Duplicate Message Keys**: Fixed in `MessageList.tsx` by using `key={`msg-${message.id}`}` and checking for duplicates in the state.

## 🔮 Next Steps / Recommendations
1. **User Search**: Build an endpoint and UI to find users and start new conversations.
2. **Online Status**: Add a "User Presence" system using the WebSocket connection state.
3. **Typing Indicators**: Implementation of "User is typing..." events over WebSockets.
4. **Message History Enrichment**: Add pagination or infinite scroll for message history.
5. **Media Support**: Implement image/file uploads (using S3 or local storage).

---
