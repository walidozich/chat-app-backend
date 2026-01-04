import type { SocketEvent, Message } from '@/types';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';
const WS_V1 = `${WS_BASE_URL}/api/v1`;

export class WebSocketManager {
    private ws: WebSocket | null = null;
    private token: string | null = null;
    private messageHandlers: ((message: Message) => void)[] = [];
    private readHandlers: ((payload: { conversation_id: number; user_id: number; last_read_at: string }) => void)[] = [];
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect(token: string) {
        this.token = token;
        this.ws = new WebSocket(`${WS_V1}/ws?token=${token}`);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
        };

        this.ws.onmessage = (event) => {
            try {
                const socketEvent: SocketEvent = JSON.parse(event.data);
                if (socketEvent.type === 'message.new') {
                    const message: Message = socketEvent.payload;
                    this.messageHandlers.forEach(handler => handler(message));
                } else if (socketEvent.type === 'conversation.read') {
                    this.readHandlers.forEach(handler => handler(socketEvent.payload));
                }
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    private attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
            this.reconnectAttempts++;
            setTimeout(() => {
                console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                this.connect(this.token!);
            }, 2000 * this.reconnectAttempts);
        }
    }

    sendMessage(conversationId: number, content: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const event: SocketEvent = {
                type: 'message.new',
                payload: {
                    conversation_id: conversationId,
                    content,
                },
            };
            this.ws.send(JSON.stringify(event));
        }
    }

    onMessage(handler: (message: Message) => void) {
        this.messageHandlers.push(handler);
    }

    onRead(handler: (payload: { conversation_id: number; user_id: number; last_read_at: string }) => void) {
        this.readHandlers.push(handler);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers = [];
        this.readHandlers = [];
    }
}

export const wsManager = new WebSocketManager();
