'use client';

import React, { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { Message, User } from '@/types';

interface MessageListProps {
    messages: Message[];
    currentUserId: number;
    users: Map<number, User>;
}

export function MessageList({ messages, currentUserId, users }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No messages yet. Start the conversation!
                </div>
            ) : (
                messages.map((message) => {
                    const isOwn = message.sender_id === currentUserId;
                    const sender = users.get(message.sender_id);

                    return (
                        <div
                            key={`msg-${message.id}`}
                            className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {!isOwn && <Avatar name={sender?.full_name || 'User'} size="sm" />}

                            <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                                {!isOwn && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {sender?.full_name || sender?.email || 'Unknown'}
                                    </span>
                                )}

                                <div
                                    className={`px-4 py-2 rounded-2xl ${isOwn
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                                        }`}
                                >
                                    {message.content}
                                </div>

                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
