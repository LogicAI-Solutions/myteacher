import { useEffect, useState } from 'react';
import { Copy, Mail, MessageCircle, Send, X } from 'lucide-react';
import api from '../api';
import { Loading } from './Loading';
import { apiDetail } from '../utils/apiError';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** O resumo costuma ir depois que o mês fecha: padrão é o mês anterior. */
const defaultPeriod = () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
};

const whatsappUrl = (phone: string | null | undefined, text: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    const number = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

const fmtDate = (iso: string) => new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('pt-BR');

const PeriodPicker = ({ month, year, onChange }: { month: number; year: number; onChange: (p: { month: number; year: number }) => void }) => (
    <div className="grid grid-cols-2 gap-3">
        <label className="block">
            <span className="label">Mês</span>
            <select className="input" value={month} onChange={e => onChange({ month: Number(e.target.value), year })}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
        </label>
        <label className="block">
            <span className="label">Ano</span>
            <select className="input" value={year} onChange={e => onChange({ month, year: Number(e.target.value) })}>
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </label>
    </div>
);

const Shell = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
        <div className="modal-sheet w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-main" aria-label="Fechar"><X size={20} /></button>
            <h3 className="text-xl font-bold text-text-main pr-8">{title}</h3>
            {children}
        </div>
    </div>
);

interface Preview {
    text: string;
    has_classes: boolean;
    parent_name?: string | null;
    parent_email?: string | null;
    parent_phone?: string | null;
    email_enabled: boolean;
    last_email_sent_at?: string | null;
}

/** Relatório do mês de um aluno para os pais: prévia, e-mail (com Word anexo) ou WhatsApp. */
export const StudentMonthlyReportModal = ({ studentId, studentName, onClose, notify }: {
    studentId: number; studentName: string; onClose: () => void; notify: (msg: string, type: 'success' | 'error' | 'warning') => void;
}) => {
    const [period, setPeriod] = useState(defaultPeriod);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let alive = true;
        api.get<Preview>(`/students/${studentId}/report/monthly`, { params: period })
            .then(r => { if (alive) setPreview(r.data); })
            .catch(e => notify(apiDetail(e, 'Não foi possível montar o resumo.'), 'error'));
        return () => { alive = false; setPreview(null); };
    }, [studentId, period, notify]);

    const sendEmail = async () => {
        setSending(true);
        try {
            const { data } = await api.post(`/students/${studentId}/report/monthly/email`, null, { params: period });
            notify(data.detail, 'success');
            onClose();
        } catch (e) {
            notify(apiDetail(e, 'Não foi possível enviar.'), 'error');
        } finally {
            setSending(false);
        }
    };

    const copy = async () => {
        try { await navigator.clipboard.writeText(preview!.text); notify('Texto copiado.', 'success'); }
        catch { notify('Não foi possível copiar.', 'warning'); }
    };

    return (
        <Shell title={`Relatório para os pais — ${studentName}`} onClose={onClose}>
            <div className="mt-4 space-y-4">
                <PeriodPicker {...period} onChange={setPeriod} />
                {!preview ? <Loading variant="section" text="Montando o resumo..." /> : (
                    <>
                        {!preview.has_classes && (
                            <p className="text-sm text-[var(--ochre)]">Não há aulas registradas para este aluno neste mês.</p>
                        )}
                        <pre className="text-sm whitespace-pre-wrap rounded-[2px] border border-border p-3 text-text-main" style={{ background: 'var(--desk)', fontFamily: 'inherit' }}>
                            {preview.text}
                        </pre>
                        {preview.last_email_sent_at && (
                            <p className="text-xs text-text-muted">Já enviado por e-mail em {fmtDate(preview.last_email_sent_at)}.</p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                className="btn btn-primary justify-center flex-1"
                                onClick={sendEmail}
                                disabled={sending || !preview.parent_email || !preview.email_enabled}
                                title={!preview.parent_email ? 'Cadastre o e-mail do responsável' : undefined}
                            >
                                <Mail size={15} /> {sending ? 'Enviando...' : 'Enviar por e-mail'}
                            </button>
                            <a
                                className={`btn btn-outline text-primary justify-center flex-1 no-underline ${preview.parent_phone ? '' : 'pointer-events-none opacity-50'}`}
                                href={preview.parent_phone ? whatsappUrl(preview.parent_phone, preview.text) : undefined}
                                target="_blank" rel="noopener noreferrer"
                            >
                                <MessageCircle size={15} /> WhatsApp
                            </a>
                            <button className="btn btn-ghost justify-center" onClick={copy}><Copy size={15} /> Copiar</button>
                        </div>
                        <p className="text-xs text-text-muted">
                            {!preview.email_enabled
                                ? 'O envio de e-mail ainda não está configurado no servidor.'
                                : preview.parent_email
                                    ? <>O e-mail vai para {preview.parent_email}, com o relatório em Word anexo. A resposta chega para você.</>
                                    : 'Sem e-mail do responsável no cadastro do aluno.'}
                            {!preview.parent_phone && ' Sem telefone do responsável para o WhatsApp.'}
                        </p>
                    </>
                )}
            </div>
        </Shell>
    );
};

interface BulkStatus {
    email_enabled: boolean;
    students: { id: number; name: string; parent_email: string | null; sent_at: string | null }[];
}

interface BulkResult { sent: string[]; no_email: string[]; no_classes: string[]; already_sent: string[] }

/** Envia o relatório do mês para todos os responsáveis com e-mail. */
export const BulkMonthlyReportModal = ({ onClose, notify }: {
    onClose: () => void; notify: (msg: string, type: 'success' | 'error' | 'warning') => void;
}) => {
    const [period, setPeriod] = useState(defaultPeriod);
    const [status, setStatus] = useState<BulkStatus | null>(null);
    const [resend, setResend] = useState(false);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<BulkResult | null>(null);

    useEffect(() => {
        let alive = true;
        api.get<BulkStatus>('/reports/monthly', { params: period })
            .then(r => { if (alive) setStatus(r.data); })
            .catch(e => notify(apiDetail(e, 'Não foi possível carregar.'), 'error'));
        return () => { alive = false; setStatus(null); setResult(null); };
    }, [period, notify]);

    const send = async () => {
        setSending(true);
        try {
            const { data } = await api.post<BulkResult>('/reports/monthly/email', { ...period, resend });
            setResult(data);
            notify(data.sent.length ? `Enviando ${data.sent.length} relatório(s).` : 'Nenhum relatório novo para enviar.', data.sent.length ? 'success' : 'warning');
        } catch (e) {
            notify(apiDetail(e, 'Não foi possível enviar.'), 'error');
        } finally {
            setSending(false);
        }
    };

    const withEmail = status?.students.filter(s => s.parent_email) ?? [];
    const pending = withEmail.filter(s => !s.sent_at);

    return (
        <Shell title="Relatório mensal aos pais" onClose={onClose}>
            <p className="text-sm text-text-muted mt-1">
                Cada responsável recebe por e-mail o resumo do mês (frequência, notas e observações) com o relatório em Word anexo.
            </p>
            <div className="mt-4 space-y-4">
                <PeriodPicker {...period} onChange={setPeriod} />
                {!status ? <Loading variant="section" text="Carregando..." /> : result ? (
                    <div className="space-y-2 text-sm">
                        <p className="text-text-main"><strong>{result.sent.length}</strong> relatório(s) a caminho.</p>
                        {result.no_classes.length > 0 && <p className="text-text-muted">Sem aulas no mês: {result.no_classes.join(', ')}.</p>}
                        {result.no_email.length > 0 && <p className="text-text-muted">Sem e-mail do responsável: {result.no_email.join(', ')}.</p>}
                        {result.already_sent.length > 0 && <p className="text-text-muted">Já tinham recebido: {result.already_sent.join(', ')}.</p>}
                        <button className="btn btn-outline mt-2" onClick={onClose}>Fechar</button>
                    </div>
                ) : (
                    <>
                        <div className="rounded-[2px] border border-border p-3 text-sm" style={{ background: 'var(--desk)' }}>
                            <p className="text-text-main">
                                {withEmail.length} de {status.students.length} alunos ativos têm e-mail do responsável;{' '}
                                {pending.length} ainda não receberam este mês.
                            </p>
                            {status.students.length - withEmail.length > 0 && (
                                <p className="text-text-muted text-xs mt-1">
                                    Sem e-mail: {status.students.filter(s => !s.parent_email).map(s => s.name).join(', ')}. Use o WhatsApp no menu de cada aluno.
                                </p>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                            <input type="checkbox" checked={resend} onChange={e => setResend(e.target.checked)} />
                            Reenviar também para quem já recebeu este mês
                        </label>
                        {!status.email_enabled && <p className="text-sm text-[var(--margin-red)]">O envio de e-mail ainda não está configurado no servidor.</p>}
                        <button className="btn btn-primary w-full justify-center" onClick={send}
                            disabled={sending || !status.email_enabled || (resend ? withEmail.length === 0 : pending.length === 0)}>
                            <Send size={15} /> {sending ? 'Enviando...' : `Enviar para ${resend ? withEmail.length : pending.length} responsável(is)`}
                        </button>
                    </>
                )}
            </div>
        </Shell>
    );
};
