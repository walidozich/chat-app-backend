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
    const [activeSection, setActiveSection] = useState<'chat' | 'directory' | 'account'>('chat');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const activeConversationIdRef = React.useRef<number | null>(null);
    const conversationsRef = React.useRef<Conversation[]>([]);

    // Keep ref in sync with state
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const upsertConversation = (conversation: Conversation) => {
        setConversations(prev => {
            const filtered = prev.filter(c => c.id !== conversation.id);
            return [conversation, ...filtered];
        });
    };

    const ensureConversationExists = async (conversationId: number) => {
        const existing = conversationsRef.current.find(c => c.id === conversationId);
        if (existing) {
            upsertConversation(existing);
            return;
        }
        try {
            const conv = await apiClient.getConversation(conversationId);
            upsertConversation(conv);
        } catch (err) {
            console.error('Failed to fetch conversation for incoming message:', err);
        }
    };

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

        // Fetch directory
        apiClient.listUsers()
            .then((usersList) => {
                setAllUsers(usersList);
                setUsers(prev => {
                    const next = new Map(prev);
                    usersList.forEach(u => next.set(u.id, u));
                    return next;
                });
            })
            .catch(err => console.error('Failed to load users:', err));

        // Connect WebSocket
        wsManager.connect(token);
        wsManager.onMessage(async (message) => {
            // Ensure conversation exists locally so recipients see new chats immediately
            const conversationId = message.conversation_id;
            await ensureConversationExists(conversationId);
            await ensureUserKnown(message.sender_id);

            // If user has no active conversation (e.g., first message), open the new chat
            if (!activeConversationIdRef.current) {
                activeConversationIdRef.current = conversationId;
                setActiveConversationId(conversationId);
                setActiveSection('chat');
            }

            // Only add message if it's for the current active conversation
            if (conversationId !== activeConversationIdRef.current) {
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
                    setUsers(prev => {
                        if (prev.has(senderId)) return prev;
                        const next = new Map(prev);
                        const fromDirectory = allUsers.find(u => u.id === senderId);
                        if (fromDirectory) {
                            next.set(senderId, fromDirectory);
                        } else if (currentUser && senderId === currentUser.id) {
                            next.set(senderId, currentUser);
                        }
                        return next;
                    });
                    ensureUserKnown(senderId);
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

    const ensureUserKnown = async (userId: number) => {
        if (users.has(userId)) return;

        const fromDirectory = allUsers.find(u => u.id === userId);
        if (fromDirectory) {
            setUsers(prev => new Map(prev).set(userId, fromDirectory));
            return;
        }

        try {
            const refreshed = await apiClient.listUsers();
            setAllUsers(refreshed);
            const found = refreshed.find(u => u.id === userId);
            if (found) {
                setUsers(prev => new Map(prev).set(userId, found));
            }
        } catch (err) {
            console.error('Failed to load user info:', err);
        }
    };

    const showChat = activeSection === 'chat';

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

    const handleUpdateProfile = async (data: { full_name?: string; email?: string; password?: string }) => {
        try {
            const updated = await apiClient.updateProfile(data);
            setCurrentUser(updated);
            setUsers(prev => new Map(prev).set(updated.id, updated));
        } catch (err) {
            console.error('Failed to update profile:', err);
        }
    };

    const handleLogout = () => {
        apiClient.clearToken();
        wsManager.disconnect();
        router.push('/');
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
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen((prev) => !prev)}
                activeSection={activeSection}
                onChangeSection={setActiveSection}
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={(id) => {
                    setActiveSection('chat');
                    setActiveConversationId(id);
                }}
                searchResults={searchResults}
                onSearchUsers={handleSearchUsers}
                onStartConversation={(userId) => {
                    setActiveSection('chat');
                    handleStartConversation(userId);
                }}
                currentUser={currentUser}
            />
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen((prev) => !prev)}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            {sidebarOpen ? 'Hide menu' : 'Show menu'}
                        </button>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                            {activeSection}
                        </h2>
                    </div>
                </div>

                {showChat && (
                    <ChatArea
                        messages={messages}
                        currentUserId={currentUser.id}
                        users={users}
                        onSendMessage={handleSendMessage}
                        conversationName={activeConversation?.name || undefined}
                    />
                )}

                {activeSection === 'directory' && (
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">User Directory</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Start a direct chat with anyone.</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {allUsers.length === 0 ? (
                                <div className="text-sm text-gray-500 dark:text-gray-400">No other users yet.</div>
                            ) : (
                                allUsers.map((user) => (
                                    <div key={`dir-card-${user.id}`} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 dark:text-white">{user.full_name || 'Unknown user'}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveSection('chat');
                                                handleStartConversation(user.id);
                                            }}
                                            className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            Message
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'account' && (
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-xl space-y-4">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Account</h3>
                            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                        {(currentUser.full_name || currentUser.email).slice(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{currentUser.full_name || 'Your profile'}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{currentUser.email}</div>
                                    </div>
                                </div>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const formData = new FormData(form);
                                        const full_name = String(formData.get('full_name') || '');
                                        const email = String(formData.get('email') || '');
                                        const password = String(formData.get('password') || '');
                                        await handleUpdateProfile({
                                            full_name,
                                            email,
                                            password: password || undefined,
                                        });
                                        form.reset();
                                    }}
                                    className="space-y-3"
                                >
                                    <div className="grid gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Full name</label>
                                        <input
                                            name="full_name"
                                            defaultValue={currentUser.full_name || ''}
                                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
                                        <input
                                            name="email"
                                            type="email"
                                            defaultValue={currentUser.email}
                                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">New password (optional)</label>
                                        <input
                                            name="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                                        >
                                            Save changes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
