'use client';

import React, { useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { Message, User } from '@/types';

interface MessageListProps {
    messages: Message[];
    currentUserId: number;
    users: Map<number, User>;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

export function MessageList({ messages, currentUserId, users, onLoadMore, hasMore, loadingMore }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {onLoadMore && hasMore && (
                <div className="flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-xs px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {loadingMore ? 'Loading...' : 'Load earlier messages'}
                    </button>
                </div>
            )}

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

                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    <span>
                                        {new Date(message.created_at).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    {isOwn && (
                                        <span className={message.seen ? 'text-blue-600 dark:text-blue-400' : ''}>
                                            {message.seen ? 'Seen' : 'Sent'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
}
