'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { apiClient } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import type { User, Message, Conversation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;

export default function ChatPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const activeConversationIdRef = React.useRef<number | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [searchResults, setSearchResults] = useState<User[]>([]);

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
            // Only add message if it's for the current active conversation
            if (message.conversation_id !== activeConversationIdRef.current) {
                return;
            }

            setMessages(prev => {
                // Prevent duplicates - check if message already exists
                if (prev.some(m => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        });

        // Fetch conversations from API
        fetch(`${API_V1}/conversations/`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(convs => {
                setConversations(convs);
                if (convs.length > 0) {
                    setActiveConversationId(convs[0].id);
                }
            })
            .catch(err => {
                console.error('Failed to fetch conversations:', err);
            });

        return () => {
            wsManager.disconnect();
        };
    }, [router]);

    // Fetch messages when active conversation changes
    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            return;
        }

        const token = apiClient.getToken();
        if (!token) return;

        // Clear messages while loading new conversation
        setMessages([]);

        // Fetch messages for the conversation
        fetch(`${API_V1}/messages/${activeConversationId}/messages`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
            .then(res => res.json())
            .then(msgs => {
                setMessages(msgs);
                // Fetch user info for all senders
                const senderIds = [...new Set(msgs.map((m: Message) => m.sender_id))] as number[];
                senderIds.forEach(senderId => {
                    // Update: only update if not already in users to avoid triggering effects
                    setUsers(prev => {
                        if (prev.has(senderId)) return prev;

                        // In a real app, you'd fetch user details
                        // For now, we'll just check if it's the current user
                        if (currentUser && senderId === currentUser.id) {
                            return new Map(prev).set(senderId, currentUser);
                        }
                        return prev;
                    });
                });
            })
            .catch(err => {
                console.error('Failed to fetch messages:', err);
            });
    }, [activeConversationId, currentUser]); // Removed 'users' from dependencies

    const handleSendMessage = (content: string) => {
        if (activeConversationId) {
            wsManager.sendMessage(activeConversationId, content);
        }
    };

    const handleSearchUsers = async (query: string) => {
        const term = query.trim();
        if (!term) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await apiClient.searchUsers(term);
            setSearchResults(results);
            setUsers(prev => {
                const next = new Map(prev);
                results.forEach(user => next.set(user.id, user));
                return next;
            });
        } catch (err) {
            console.error('Failed to search users:', err);
        }
    };

    const handleStartConversation = async (userId: number) => {
        try {
            const conversation = await apiClient.startDirectConversation(userId);
            setConversations(prev => {
                const existing = prev.find(c => c.id === conversation.id);
                if (existing) {
                    return prev.map(c => c.id === conversation.id ? conversation : c);
                }
                return [conversation, ...prev];
            });
            setActiveConversationId(conversation.id);
            setSearchResults([]);
        } catch (err) {
            console.error('Failed to start conversation:', err);
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
                searchResults={searchResults}
                onSearchUsers={handleSearchUsers}
                onStartConversation={handleStartConversation}
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
