'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface MessageInputProps {
    onSendMessage: (content: string) => void;
    disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={disabled}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                <Button type="submit" disabled={disabled || !message.trim()}>
                    Send
                </Button>
            </div>
        </form>
    );
}
