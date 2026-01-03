'use client';

import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message, User } from '@/types';

interface ChatAreaProps {
    messages: Message[];
    currentUserId: number;
    users: Map<number, User>;
    onSendMessage: (content: string) => void;
    conversationName?: string;
}

export function ChatArea({ messages, currentUserId, users, onSendMessage, conversationName }: ChatAreaProps) {
    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {conversationName || 'Select a conversation'}
                </h2>
            </div>

            <MessageList messages={messages} currentUserId={currentUserId} users={users} />
            <MessageInput onSendMessage={onSendMessage} disabled={!conversationName} />
        </div>
    );
}
