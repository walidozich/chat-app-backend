import React from 'react';

export interface ToastMessage {
    id: string;
    title: string;
    description?: string;
}

interface ToastProps {
    toasts: ToastMessage[];
    onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
    return (
        <div className="fixed bottom-4 left-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className="w-72 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg p-4"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{toast.title}</div>
                            {toast.description && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {toast.description}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            aria-label="Close notification"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
