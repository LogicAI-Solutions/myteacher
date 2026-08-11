import { X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import React from 'react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

const TITLE: Record<ToastType, string> = {
    success: 'Feito',
    error: 'Não deu certo',
    warning: 'Atenção',
};

const STAMP: Record<ToastType, string> = {
    success: 'stamp-paid',
    error: 'stamp-late',
    warning: 'stamp-pending',
};

const ICON = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
};

/** Um bilhete que chega e assenta sobre o documento. */
export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    const Icon = ICON[type];

    return (
        <div
            role="status"
            aria-live="polite"
            className="fixed top-4 right-4 z-[100] max-w-sm animate-slide-in sheet raised flex items-start gap-3 p-3.5 pr-2.5"
        >
            <Icon size={18} className={`mt-0.5 shrink-0 ${type === 'success' ? 'text-success' : type === 'error' ? 'text-danger' : 'text-warning'}`} />

            <div className="min-w-0 flex-1">
                <span className={`stamp ${STAMP[type]}`}>{TITLE[type]}</span>
                <p className="mt-1.5 text-sm text-text-main leading-snug">{message}</p>
            </div>

            <button
                onClick={onClose}
                aria-label="Fechar aviso"
                className="shrink-0 p-1.5 rounded-[2px] text-text-muted hover:text-text-main hover:bg-[var(--wash-2)] transition-colors duration-150"
            >
                <X size={15} />
            </button>
        </div>
    );
};
