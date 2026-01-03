import type { Conversation, LoginRequest, RegisterRequest, AuthResponse, User } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;

export class ApiClient {
    private token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    async login(data: LoginRequest): Promise<AuthResponse> {
        const formData = new URLSearchParams();
        formData.append('username', data.username);
        formData.append('password', data.password);

        const response = await fetch(`${API_V1}/login/access-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Login failed');
        }

        const result = await response.json();
        this.setToken(result.access_token);
        return result;
    }

    async register(data: RegisterRequest): Promise<User> {
        const response = await fetch(`${API_V1}/users/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }

        return response.json();
    }

    async getCurrentUser(): Promise<User> {
        const response = await fetch(`${API_V1}/users/me`, {
            headers: {
                'Authorization': `Bearer ${this.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user');
        }

        return response.json();
    }

    getToken(): string | null {
        return this.token;
    }

    private getAuthHeaders() {
        if (!this.token) {
            throw new Error('User is not authenticated');
        }
        return {
            'Authorization': `Bearer ${this.token}`,
        };
    }

    async searchUsers(query: string): Promise<User[]> {
        const response = await fetch(`${API_V1}/users/search?query=${encodeURIComponent(query)}`, {
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to search users');
        }

        return response.json();
    }

    async startDirectConversation(userId: number): Promise<Conversation> {
        const response = await fetch(`${API_V1}/conversations/direct`, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
        });

        if (!response.ok) {
            throw new Error('Failed to start conversation');
        }

        return response.json();
    }

    async getConversation(conversationId: number): Promise<Conversation> {
        const response = await fetch(`${API_V1}/conversations/${conversationId}`, {
            headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch conversation');
        }

        return response.json();
    }
}

export const apiClient = new ApiClient();
