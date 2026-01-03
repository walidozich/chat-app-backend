'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation, User } from '@/types';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    activeSection: 'chat' | 'directory' | 'account';
    onChangeSection: (section: 'chat' | 'directory' | 'account') => void;
    conversations: Conversation[];
    activeConversationId: number | null;
    onSelectConversation: (id: number) => void;
    searchResults: User[];
    onSearchUsers: (query: string) => void;
    onStartConversation: (userId: number) => void;
    currentUser: User;
}

export function Sidebar({
    isOpen,
    onToggle,
    activeSection,
    onChangeSection,
    conversations,
    activeConversationId,
    onSelectConversation,
    searchResults,
    onSearchUsers,
    onStartConversation,
    currentUser,
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
        <div className={`${isOpen ? 'w-80' : 'w-0 md:w-20'} transition-all duration-300 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={onToggle}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isOpen ? 'Hide' : 'Menu'}
                    </button>
                    {isOpen && (
                        <div className="flex -space-x-2">
                            <Avatar name={currentUser.full_name || currentUser.email} size="sm" />
                        </div>
                    )}
                </div>

                {isOpen && (
                    <div className="flex gap-2">
                        {(['chat', 'directory', 'account'] as const).map((section) => (
                            <button
                                key={section}
                                onClick={() => onChangeSection(section)}
                                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                                    activeSection === section
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                {section}
                            </button>
                        ))}
                    </div>
                )}

                {isOpen && (
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search users..."
                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                )}

                {isOpen && searchResults.length > 0 && (
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

            {isOpen && (
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
            )}
        </div>
    );
}
