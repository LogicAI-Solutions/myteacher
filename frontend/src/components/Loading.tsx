import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
    variant?: 'fullscreen' | 'section' | 'inline';
    text?: string;
    className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    variant = 'section',
    text,
    className = ''
}) => {
    if (variant === 'inline') {
        return (
            <span className={`inline-flex items-center gap-2 ${className}`} role="status">
                <Loader2 size={16} className="text-primary animate-spin" aria-hidden="true" />
                {text && <span className="text-sm text-text-muted">{text}</span>}
            </span>
        );
    }

    const container =
        variant === 'fullscreen'
            ? 'fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in'
            : 'w-full py-12 flex flex-col items-center justify-center animate-fade-in';

    return (
        <div
            className={`${container} ${className}`}
            role="status"
            aria-live="polite"
            style={variant === 'fullscreen' ? { background: 'var(--desk)' } : undefined}
        >
            {/* Um traço de tinta correndo a volta. Sem brilho, sem gradiente. */}
            <div
                className="w-9 h-9 rounded-full border-2 animate-spin"
                style={{ borderColor: 'var(--rule-strong)', borderTopColor: 'var(--institution)' }}
                aria-hidden="true"
            />

            {text && <p className="mt-4 text-sm text-text-muted">{text}</p>}
        </div>
    );
};
