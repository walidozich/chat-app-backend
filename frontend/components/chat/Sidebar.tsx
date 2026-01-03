'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation, User } from '@/types';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: number | null;
    onSelectConversation: (id: number) => void;
    searchResults: User[];
    onSearchUsers: (query: string) => void;
    onStartConversation: (userId: number) => void;
}

export function Sidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    searchResults,
    onSearchUsers,
    onStartConversation,
}: SidebarProps) {
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        onSearchUsers(value);
    };

    const handleStartChat = (userId: number) => {
        onStartConversation(userId);
        setSearchTerm('');
        onSearchUsers('');
    };

    return (
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Messages
                </h2>

                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search users..."
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {searchResults.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Start a chat
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleStartChat(user.id)}
                                    className="w-full p-2 flex items-center gap-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <Avatar name={user.full_name || user.email} size="sm" />
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {user.full_name || 'Unknown user'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {user.email}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No conversations yet
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => onSelectConversation(conv.id)}
                            className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${activeConversationId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                        >
                            <Avatar name={conv.name || 'Chat'} />
                            <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {conv.name || 'Unnamed Chat'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                    {conv.is_group ? 'Group' : 'Direct'}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
