export interface User {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
}

export interface Conversation {
    id: number;
    name: string | null;
    is_group: boolean;
    created_at: string;
}

export interface Message {
    id: number;
    conversation_id: number;
    sender_id: number;
    content: string;
    created_at: string;
}

export interface SocketEvent {
    type: string;
    payload: any;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    full_name: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}
