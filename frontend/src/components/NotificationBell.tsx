import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CalendarX, Wallet } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

interface Reason {
    type: 'absence' | 'payment';
    text: string;
    class_id?: number;
}

interface RiskAlert {
    key: string;
    student_id: number;
    student_name: string;
    level: 'high' | 'medium';
    reasons: Reason[];
}

const REFRESH_MS = 5 * 60 * 1000;

// "Visto" é conveniência por navegador: o alerta volta sozinho quando surge fato novo (a chave muda).
const seenKey = (userId: number) => `seen_alerts_${userId}`;
const readSeen = (userId: number): Set<string> => {
    try { return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]')); } catch { return new Set(); }
};
const writeSeen = (userId: number, keys: string[]) => {
    try { localStorage.setItem(seenKey(userId), JSON.stringify(keys)); } catch { /* sem storage: badge só não some */ }
};

/** Sininho de risco de desistência: aluno sumido das aulas ou com mensalidade atrasada. */
export const NotificationBell = () => {
    const { user, can } = useAuth();
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [seen, setSeen] = useState<Set<string>>(() => (user ? readSeen(user.id) : new Set()));
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get<RiskAlert[]>('/alerts');
            setAlerts(data);
        } catch {
            /* sininho é acessório: falha silenciosa */
        }
    }, []);

    useEffect(() => {
        if (!user) return;
        load();
        const id = setInterval(load, REFRESH_MS);
        return () => clearInterval(id);
    }, [user, load]);

    // Fecha ao clicar fora
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    if (!user) return null;
    const unseen = alerts.filter(a => !seen.has(a.key)).length;

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next && unseen > 0) {
            // Abrir o sininho marca como visto (só as chaves atuais, para a lista não crescer)
            const keys = alerts.map(a => a.key);
            writeSeen(user.id, keys);
            setTimeout(() => setSeen(new Set(keys)), 1500); // mantém o destaque de "novo" um instante
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={toggle}
                className="relative p-2 rounded-[2px] text-text-muted hover:text-text-main hover:bg-[var(--wash-1)] transition-colors"
                aria-label={unseen > 0 ? `Alertas: ${unseen} novo(s)` : 'Alertas'}
                aria-expanded={open}
            >
                <Bell size={20} />
                {unseen > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[0.6875rem] font-bold flex items-center justify-center tabular"
                        style={{ background: 'var(--margin-red)', color: '#fff' }}
                    >
                        {unseen > 9 ? '9+' : unseen}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 mt-2 w-[min(92vw,380px)] z-50 rounded-[3px] overflow-hidden shadow-lg animate-fade-in"
                    style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}
                    role="dialog"
                    aria-label="Alunos em risco de desistência"
                >
                    <div className="px-4 py-3 rule-b" style={{ background: 'var(--desk)' }}>
                        <p className="label-print">Risco de desistência</p>
                        <p className="text-xs text-text-muted mt-0.5">
                            Sem presença nas aulas das últimas 2 semanas{can('finance') ? ' ou com mensalidade atrasada' : ''}.
                        </p>
                    </div>

                    {alerts.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-text-muted text-center">Nenhum aluno em risco agora. 🎉</p>
                    ) : (
                        <ul className="list-none m-0 p-0 max-h-[60vh] overflow-y-auto">
                            {alerts.map(a => (
                                <li key={a.key} className={`px-4 py-3 rule-b last:border-b-0 ${seen.has(a.key) ? '' : 'bg-[var(--wash-1)]'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-sm text-text-main truncate">{a.student_name}</span>
                                        <span className={`stamp ${a.level === 'high' ? 'stamp-late' : 'stamp-pending'}`}>
                                            {a.level === 'high' ? 'Risco alto' : 'Atenção'}
                                        </span>
                                    </div>
                                    <ul className="list-none m-0 p-0 mt-1.5 space-y-1">
                                        {a.reasons.map((r, i) => {
                                            const Icon = r.type === 'absence' ? CalendarX : Wallet;
                                            const to = r.type === 'absence' ? `/dashboard/class/${r.class_id}?tab=history` : '/dashboard/payments';
                                            return (
                                                <li key={i}>
                                                    <Link to={to} onClick={() => setOpen(false)} className="flex items-start gap-2 text-xs text-text-muted hover:text-primary no-underline">
                                                        <Icon size={14} className="shrink-0 mt-0.5" />
                                                        <span>{r.text}</span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
