import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import React from 'react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    return (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border animate-slide-in flex items-center gap-3 ${type === 'success' ? 'bg-success/20 border-success/30 text-white' :
            type === 'error' ? 'bg-danger/20 border-danger/30 text-white' :
                'bg-yellow-500/20 border-yellow-500/30 text-white'
            }`}>
            {type === 'success' && <div className="p-1 bg-success rounded-full flex items-center justify-center"><CheckCircle size={14} /></div>}
            {type === 'error' && <div className="p-1 bg-danger rounded-full flex items-center justify-center"><AlertTriangle size={14} /></div>}
            {type === 'warning' && <div className="p-1 bg-yellow-500 rounded-full flex items-center justify-center"><AlertTriangle size={14} /></div>}
            <div>
                <h4 className="font-bold text-sm uppercase tracking-wide opacity-80">
                    {type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Atenção'}
                </h4>
                <p className="text-sm font-medium">{message}</p>
            </div>
            <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100"><X size={16} /></button>
        </div>
    );
};
