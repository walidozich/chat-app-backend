'use client';

import React from 'react';
import { Avatar } from '@/components/ui/Avatar';
import type { Conversation } from '@/types';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: number | null;
    onSelectConversation: (id: number) => void;
}

export function Sidebar({ conversations, activeConversationId, onSelectConversation }: SidebarProps) {
    return (
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Messages
                </h2>
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
