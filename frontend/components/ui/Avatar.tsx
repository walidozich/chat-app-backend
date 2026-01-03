import React from 'react';

interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg';
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
    const sizeStyles = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };

    const initials = name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const colors = [
        'bg-gradient-to-br from-pink-500 to-rose-500',
        'bg-gradient-to-br from-blue-500 to-cyan-500',
        'bg-gradient-to-br from-green-500 to-emerald-500',
        'bg-gradient-to-br from-purple-500 to-indigo-500',
        'bg-gradient-to-br from-orange-500 to-amber-500',
    ];

    const colorIndex = name.charCodeAt(0) % colors.length;

    return (
        <div
            className={`${sizeStyles[size]} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold shadow-md`}
        >
            {initials}
        </div>
    );
}
