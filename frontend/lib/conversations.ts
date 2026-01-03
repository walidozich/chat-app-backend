import type { Conversation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;

export async function getConversations(token: string): Promise<Conversation[]> {
    const response = await fetch(`${API_V1}/conversations/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch conversations');
    }

    return response.json();
}
