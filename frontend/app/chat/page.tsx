'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { ToastContainer, type ToastMessage } from '@/components/ui/Toast';
import { apiClient } from '@/lib/api';
import { wsManager } from '@/lib/websocket';
import type { User, Message, Conversation } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;
const PAGE_SIZE = 20;

export default function ChatPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeSection, setActiveSection] = useState<'chat' | 'directory' | 'account'>('chat');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const activeConversationIdRef = React.useRef<number | null>(null);
    const currentUserRef = React.useRef<User | null>(null);
    const conversationsRef = React.useRef<Conversation[]>([]);
    const [messageCounts, setMessageCounts] = useState<Record<number, number>>({});

    // Keep ref in sync with state
    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Map<number, User>>(new Map());
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [earliestMessageId, setEarliestMessageId] = useState<number | null>(null);

    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    const upsertConversation = (conversation: Conversation) => {
        setConversations(prev => {
            const filtered = prev.filter(c => c.id !== conversation.id);
            return [conversation, ...filtered];
        });
        if (conversation.message_count !== undefined) {
            setMessageCounts(prev => ({
                ...prev,
                [conversation.id]: conversation.message_count ?? 0,
            }));
        }
    };

    const ensureConversationExists = async (conversationId: number) => {
        const existing = conversationsRef.current.find(c => c.id === conversationId);
        if (existing) {
            upsertConversation(existing);
            return existing;
        }
        try {
            const conv = await apiClient.getConversation(conversationId);
            upsertConversation(conv);
            return conv;
        } catch (err) {
            console.error('Failed to fetch conversation for incoming message:', err);
        }
        return undefined;
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
            const conv = await ensureConversationExists(conversationId);
            const sender = await ensureUserKnown(message.sender_id);
            const isActive = conversationId === activeConversationIdRef.current;
            const isOwnMessage = currentUserRef.current && message.sender_id === currentUserRef.current.id;
            setMessageCounts(prev => ({
                ...prev,
                [conversationId]: isActive || isOwnMessage ? 0 : (prev[conversationId] ?? conv?.message_count ?? 0) + 1,
            }));

            // If user has no active conversation (e.g., first message), open the new chat
            if (!activeConversationIdRef.current) {
                activeConversationIdRef.current = conversationId;
                setActiveConversationId(conversationId);
                setActiveSection('chat');
            }

            // Only add message if it's for the current active conversation
            if (conversationId !== activeConversationIdRef.current) {
                if (!isOwnMessage) {
                    const senderInState = sender || users.get(message.sender_id) || allUsers.find(u => u.id === message.sender_id);
                    const senderName = senderInState?.full_name || senderInState?.email || 'New message';
                    pushToast({
                        title: senderName,
                        description: message.content,
                    });
                }
                return;
            }

            setMessages(prev => {
                // Prevent duplicates - check if message already exists
                if (prev.some(m => m.id === message.id)) {
                    return prev;
                }
                return [...prev, { ...message, seen: message.seen ?? false }];
            });
        });
        wsManager.onRead((payload) => {
            applyReadReceipt(payload.conversation_id, payload.user_id, payload.last_read_at);
            if (payload.user_id === currentUserRef.current?.id) {
                setMessageCounts(prev => ({
                    ...prev,
                    [payload.conversation_id]: 0,
                }));
            }
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
                setMessageCounts(() => {
                    const counts: Record<number, number> = {};
                    convs.forEach((c: Conversation) => {
                        counts[c.id] = c.message_count ?? 0;
                    });
                    return counts;
                });
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

    const loadMessages = async (conversationId: number, append = false, beforeId?: number) => {
        const token = apiClient.getToken();
        if (!token) return;

        if (!append) {
            setMessages([]);
            setEarliestMessageId(null);
        } else {
            setLoadingMore(true);
        }

        const params = new URLSearchParams();
        params.append('limit', PAGE_SIZE.toString());
        if (beforeId) params.append('before_id', beforeId.toString());

        try {
            const res = await fetch(`${API_V1}/messages/${conversationId}/messages?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const raw: Message[] = await res.json();
            const msgs = raw.map(m => ({ ...m, seen: m.seen ?? false }));

            if (append) {
                setMessages(prev => [...msgs, ...prev]);
            } else {
                setMessages(msgs);
            }

            if (msgs.length > 0) {
                setEarliestMessageId(msgs[0].id);
            }
            setHasMore(msgs.length === PAGE_SIZE);
            setMessageCounts(prev => ({
                ...prev,
                [conversationId]: 0,
            }));

            const senderIds = [...new Set(msgs.map((m: Message) => m.sender_id))] as number[];
            senderIds.forEach(senderId => ensureUserKnown(senderId));
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!activeConversationId) {
            setMessages([]);
            setHasMore(false);
            return;
        }
        loadMessages(activeConversationId);
    }, [activeConversationId]);

    const handleSendMessage = (content: string) => {
        if (activeConversationId) {
            wsManager.sendMessage(activeConversationId, content);
        }
    };

    const handleLoadMore = () => {
        if (!activeConversationId || loadingMore || !hasMore) return;
        loadMessages(activeConversationId, true, earliestMessageId || undefined);
    };

    const ensureUserKnown = async (userId: number): Promise<User | undefined> => {
        if (users.has(userId)) return users.get(userId);

        const fromDirectory = allUsers.find(u => u.id === userId);
        if (fromDirectory) {
            setUsers(prev => new Map(prev).set(userId, fromDirectory));
            return fromDirectory;
        }

        try {
            const refreshed = await apiClient.listUsers();
            setAllUsers(refreshed);
            const found = refreshed.find(u => u.id === userId);
            if (found) {
                setUsers(prev => new Map(prev).set(userId, found));
                return found;
            }
        } catch (err) {
            console.error('Failed to load user info:', err);
        }
        return undefined;
    };

    const applyReadReceipt = (conversationId: number, readerId: number, lastReadAt: string) => {
        if (!currentUserRef.current) return;
        if (readerId === currentUserRef.current.id) {
            // Current user already set counts to 0 locally when viewing
            return;
        }
        const readTime = new Date(lastReadAt).getTime();
        setMessages(prev =>
            prev.map(msg => {
                if (msg.conversation_id !== conversationId) return msg;
                if (msg.sender_id !== currentUserRef.current!.id) return msg;
                const msgTime = new Date(msg.created_at).getTime();
                if (msgTime <= readTime) {
                    return { ...msg, seen: true };
                }
                return msg;
            })
        );
    };

    const showChat = activeSection === 'chat';

    const pushToast = (toast: Omit<ToastMessage, 'id'>) => {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        const newToast = { ...toast, id };
        setToasts((prev) => [...prev, newToast]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
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
            setMessageCounts(prev => ({
                ...prev,
                [conversation.id]: conversation.message_count ?? 0,
            }));
        } catch (err) {
            console.error('Failed to start conversation:', err);
        }
    };

    const handleUpdateProfile = async (data: { full_name?: string; email?: string; password?: string }) => {
        try {
            const updated = await apiClient.updateProfile(data);
            setCurrentUser(updated);
            setUsers(prev => new Map(prev).set(updated.id, updated));
            // Update direct conversations names if they relied on current user's old name/email
            setConversations(prev => prev.map(conv => {
                if (conv.is_group) return conv;
                return { ...conv, participants: conv.participants };
            }));
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

    const getConversationTitle = (conv: Conversation) => {
        if (conv.is_group) return conv.name || 'Group';
        if (conv.participants && currentUser) {
            const other = conv.participants.find(p => p.id !== currentUser.id);
            if (other) return other.full_name || other.email || 'Direct chat';
        }
        return conv.name || 'Direct chat';
    };

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
                getConversationTitle={getConversationTitle}
                messageCounts={messageCounts}
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
                        conversationName={activeConversation ? getConversationTitle(activeConversation) : undefined}
                        onLoadMore={handleLoadMore}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
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
            <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
        </div>
    );
}
