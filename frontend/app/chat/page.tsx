'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { apiClient } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import type { User, Message, Conversation } from '@/types';

export default function ChatPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());

    useEffect(() => {
        const token = apiClient.getToken();
        if (!token) {
            router.push('/');
            return;
        }

        // Fetch current user
        apiClient.getCurrentUser()
            .then(user => {
                setCurrentUser(user);
                setUsers(prev => new Map(prev).set(user.id, user));
            })
            .catch(() => {
                router.push('/');
            });

        // Connect WebSocket
        wsManager.connect(token);
        wsManager.onMessage((message) => {
            setMessages(prev => [...prev, message]);
        });

        // For demo: Create a default conversation
        // In production, you'd fetch this from an API
        setConversations([
            {
                id: 1,
                name: 'General Chat',
                is_group: true,
                created_at: new Date().toISOString(),
            },
        ]);
        setActiveConversationId(1);

        return () => {
            wsManager.disconnect();
        };
    }, [router]);

    const handleSendMessage = (content: string) => {
        if (activeConversationId) {
            wsManager.sendMessage(activeConversationId, content);
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    return (
        <div className="h-screen flex">
            <Sidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={setActiveConversationId}
            />
            <ChatArea
                messages={messages}
                currentUserId={currentUser.id}
                users={users}
                onSendMessage={handleSendMessage}
                conversationName={activeConversation?.name || undefined}
            />
        </div>
    );
}
