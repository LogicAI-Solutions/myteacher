import { useCallback, useEffect, useState } from 'react';
import { Building2, Copy, MessageCircle, Send, Trash2, UserPlus } from 'lucide-react';
import api from '../api';
import { apiDetail } from '../utils/apiError';
import { useAuth, type Permission } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { Toast, type ToastType } from '../components/Toast';

type Role = 'teacher' | 'secretary';

interface SchoolInfo {
    school: { id: number; name: string } | null;
    role: string;
    usage?: {
        teachers: number;
        max_teachers: number;
        pending_teacher_invites: number;
        secretaries: number;
        max_secretaries: number;
        pending_secretary_invites: number;
    };
    catalog: { all: Permission[]; teacher: Permission[]; secretary_default: Permission[] };
}

interface Member {
    id: number;
    name: string;
    email: string;
    school_role: 'owner' | Role;
    is_active: boolean;
    permissions: Permission[];
}

interface Invite {
    id: number;
    email: string;
    school_role: Role;
    permissions: Permission[];
    expires_at: string;
    token?: string;
}

const PERM_LABELS: Record<Permission, string> = {
    'attendance.edit': 'Lançar e editar chamada',
    'students.manage': 'Cadastrar e editar alunos',
    'classes.manage': 'Criar turmas e definir professor',
    'finance': 'Financeiro (mensalidades)',
    'reports.view': 'Gerar relatórios',
};

const ROLE_LABELS: Record<string, string> = { owner: 'Direção', teacher: 'Professor', secretary: 'Secretaria' };

const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;

const errorDetail = apiDetail;

const PermissionChecks = ({ value, onChange, disabled }: { value: Permission[]; onChange: (p: Permission[]) => void; disabled?: boolean }) => (
    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {(Object.keys(PERM_LABELS) as Permission[]).map(perm => (
            <label key={perm} className="flex items-center gap-2 text-sm text-text-main cursor-pointer">
                <input
                    type="checkbox"
                    className="accent-[var(--color-primary)]"
                    checked={value.includes(perm)}
                    disabled={disabled}
                    onChange={e => onChange(e.target.checked ? [...value, perm] : value.filter(p => p !== perm))}
                />
                {PERM_LABELS[perm]}
            </label>
        ))}
    </div>
);

export const School = () => {
    const { refreshUser } = useAuth();
    const [info, setInfo] = useState<SchoolInfo | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const [schoolName, setSchoolName] = useState('');
    const [creating, setCreating] = useState(false);

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<Role>('teacher');
    const [invitePerms, setInvitePerms] = useState<Permission[]>([]);
    const [sending, setSending] = useState(false);
    const [lastInvite, setLastInvite] = useState<Invite | null>(null);

    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const load = useCallback(async () => {
        try {
            const { data } = await api.get<SchoolInfo>('/schools/me');
            setInfo(data);
            setInvitePerms(data.catalog.secretary_default);
            if (data.school && data.role === 'owner') {
                const [m, i] = await Promise.all([api.get('/schools/members'), api.get('/schools/invites')]);
                setMembers(m.data);
                setInvites(i.data);
                setSchoolName(data.school.name);
            }
        } catch (e) {
            showToast(errorDetail(e, 'Não foi possível carregar a escola.'), 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const createSchool = async (e: React.FormEvent) => {
        e.preventDefault();
        if (schoolName.trim().length < 2) return showToast('Informe o nome da escola.', 'warning');
        setCreating(true);
        try {
            await api.post('/schools', { name: schoolName.trim() });
            await refreshUser();
            showToast('Escola criada. Agora convide sua equipe.');
            await load();
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível criar a escola.'), 'error');
        } finally {
            setCreating(false);
        }
    };

    const renameSchool = async () => {
        if (!info?.school || schoolName.trim() === info.school.name || schoolName.trim().length < 2) return;
        try {
            await api.patch('/schools/me', { name: schoolName.trim() });
            await refreshUser();
            showToast('Nome da escola atualizado.');
            load();
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível renomear.'), 'error');
        }
    };

    const sendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return showToast('Informe o e-mail.', 'warning');
        setSending(true);
        try {
            const { data } = await api.post<Invite>('/schools/invites', {
                email: inviteEmail.trim(),
                school_role: inviteRole,
                permissions: inviteRole === 'secretary' ? invitePerms : undefined,
            });
            setLastInvite(data);
            setInviteEmail('');
            load();
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível criar o convite.'), 'error');
        } finally {
            setSending(false);
        }
    };

    const copyLink = async (token: string) => {
        try {
            await navigator.clipboard.writeText(inviteUrl(token));
            showToast('Link copiado.');
        } catch {
            showToast('Não foi possível copiar. Selecione o link e copie manualmente.', 'warning');
        }
    };

    const shareWhatsApp = (invite: Invite) => {
        const text = `Você foi convidado(a) para a ${info?.school?.name} no MyTeacherApp. Acesse: ${inviteUrl(invite.token!)}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    };

    const updateMember = async (member: Member, patch: Partial<Pick<Member, 'permissions' | 'is_active'>>) => {
        setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, ...patch } : m)));
        try {
            const { data } = await api.patch(`/schools/members/${member.id}`, patch);
            setMembers(prev => prev.map(m => (m.id === member.id ? data : m)));
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível salvar.'), 'error');
            load();
        }
    };

    const removeMember = async (member: Member) => {
        if (!window.confirm(`Remover ${member.name} da escola? As turmas dele continuam na escola, sem professor responsável.`)) return;
        try {
            await api.delete(`/schools/members/${member.id}`);
            showToast('Membro removido.');
            load();
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível remover.'), 'error');
        }
    };

    const revokeInvite = async (invite: Invite) => {
        try {
            await api.delete(`/schools/invites/${invite.id}`);
            if (lastInvite?.id === invite.id) setLastInvite(null);
            load();
        } catch (err) {
            showToast(errorDetail(err, 'Não foi possível revogar.'), 'error');
        }
    };

    if (loading) return <Loading variant="section" text="Carregando escola..." />;

    // Ainda não é escola: explica o que muda e cria.
    if (!info?.school) {
        return (
            <div className="animate-fade-in max-w-2xl">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <h1 className="text-2xl sm:text-3xl font-bold text-text-main">Escola</h1>
                <p className="text-text-muted mt-1.5 text-sm">Traga professores e secretaria para a mesma conta.</p>

                <form onSubmit={createSchool} className="sheet sheet-p mt-5 space-y-4">
                    <ul className="text-sm text-text-muted space-y-1.5 list-disc pl-5">
                        <li>Você vira a direção. Seus alunos e turmas passam a ser da escola.</li>
                        <li>Cada professor vê só as turmas em que for o responsável, e não vê o financeiro.</li>
                        <li>A secretaria faz o que você liberar: chamada, alunos, turmas, financeiro, relatórios.</li>
                        <li>Professores e secretaria entram por um link de convite e não pagam assinatura.</li>
                    </ul>
                    <label className="block">
                        <span className="label">Nome da escola</span>
                        <input className="input" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Ex.: Colégio Aprender" maxLength={120} />
                    </label>
                    <button type="submit" className="btn btn-primary" disabled={creating}>
                        <Building2 size={16} /> {creating ? 'Criando...' : 'Criar escola'}
                    </button>
                </form>
            </div>
        );
    }

    const usage = info.usage!;
    const teacherSeatsLeft = usage.max_teachers - usage.teachers - usage.pending_teacher_invites;

    return (
        <div className="animate-fade-in space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="label-print">Escola</p>
                    <input
                        aria-label="Nome da escola"
                        className="text-2xl sm:text-3xl font-bold text-text-main bg-transparent border-b border-transparent hover:border-rule-strong focus:border-primary outline-none w-full"
                        value={schoolName}
                        onChange={e => setSchoolName(e.target.value)}
                        onBlur={renameSchool}
                        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                </div>
            </header>

            {/* Uso do plano */}
            <div className="sheet overflow-hidden">
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--rule)' }}>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Professores</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">
                            {usage.teachers}<span className="text-base text-text-muted"> / {usage.max_teachers}</span>
                        </p>
                        {usage.pending_teacher_invites > 0 && <p className="text-xs text-text-muted">{usage.pending_teacher_invites} convite(s) pendente(s)</p>}
                        {usage.max_teachers === 0 && <p className="text-xs text-text-muted">Assine o plano Escola para convidar professores.</p>}
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Secretaria</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">
                            {usage.secretaries}<span className="text-base text-text-muted"> / {usage.max_secretaries}</span>
                        </p>
                        {usage.pending_secretary_invites > 0 && <p className="text-xs text-text-muted">{usage.pending_secretary_invites} convite(s) pendente(s)</p>}
                    </div>
                </div>
            </div>

            {/* Convidar */}
            <section className="sheet sheet-p">
                <h2 className="text-lg font-semibold text-text-main flex items-center gap-2"><UserPlus size={18} /> Convidar</h2>
                <form onSubmit={sendInvite} className="mt-4 space-y-4">
                    <div className="grid sm:grid-cols-[1fr_180px] gap-3">
                        <label className="block">
                            <span className="label">E-mail</span>
                            <input type="email" className="input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="pessoa@email.com" />
                        </label>
                        <label className="block">
                            <span className="label">Papel</span>
                            <select className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value as Role)}>
                                <option value="teacher">Professor</option>
                                <option value="secretary">Secretaria</option>
                            </select>
                        </label>
                    </div>
                    {inviteRole === 'secretary' ? (
                        <div>
                            <p className="label mb-2">O que a secretaria pode fazer</p>
                            <PermissionChecks value={invitePerms} onChange={setInvitePerms} />
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted">
                            Professor vê só as turmas em que for o responsável: lança e edita a chamada e gera relatórios. Não vê o financeiro.
                            {teacherSeatsLeft <= 0 && <span className="text-[var(--margin-red)]"> Limite de professores do plano atingido.</span>}
                        </p>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={sending}>
                        <Send size={15} /> {sending ? 'Gerando...' : 'Gerar link de convite'}
                    </button>
                </form>

                {lastInvite?.token && (
                    <div className="mt-4 rounded-[2px] border border-primary p-3" style={{ background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}>
                        <p className="text-sm text-text-main">
                            Envie este link para <strong>{lastInvite.email}</strong>. Ele vale por 7 dias e só aparece agora.
                        </p>
                        <input readOnly className="input mt-2 text-xs" value={inviteUrl(lastInvite.token)} onFocus={e => e.target.select()} />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className="btn btn-outline" onClick={() => copyLink(lastInvite.token!)}><Copy size={15} /> Copiar link</button>
                            <button type="button" className="btn btn-outline text-primary" onClick={() => shareWhatsApp(lastInvite)}><MessageCircle size={15} /> Enviar pelo WhatsApp</button>
                        </div>
                    </div>
                )}
            </section>

            {/* Equipe */}
            <section className="sheet overflow-hidden">
                <div className="px-4 py-3 rule-b" style={{ background: 'var(--desk)' }}>
                    <h2 className="label-print">Equipe</h2>
                </div>
                {members.filter(m => m.school_role !== 'owner').length === 0 ? (
                    <p className="p-4 text-sm text-text-muted">Ninguém na equipe ainda. Gere um convite acima.</p>
                ) : (
                    <ul className="list-none m-0 p-0">
                        {members.filter(m => m.school_role !== 'owner').map(m => (
                            <li key={m.id} className="p-4 rule-b last:border-b-0">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-text-main text-sm truncate">
                                            {m.name} <span className="stamp stamp-idle ml-1">{ROLE_LABELS[m.school_role]}</span>
                                            {!m.is_active && <span className="stamp stamp-late ml-1">Suspenso</span>}
                                        </p>
                                        <p className="text-xs text-text-muted truncate">{m.email}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="btn btn-outline text-xs" onClick={() => updateMember(m, { is_active: !m.is_active })}>
                                            {m.is_active ? 'Suspender' : 'Reativar'}
                                        </button>
                                        <button className="btn btn-ghost text-xs" onClick={() => removeMember(m)} aria-label={`Remover ${m.name}`}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                                {m.school_role === 'secretary' && (
                                    <div className="mt-3">
                                        <PermissionChecks value={m.permissions} onChange={perms => updateMember(m, { permissions: perms })} />
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Convites pendentes */}
            {invites.length > 0 && (
                <section className="sheet overflow-hidden">
                    <div className="px-4 py-3 rule-b" style={{ background: 'var(--desk)' }}>
                        <h2 className="label-print">Convites pendentes</h2>
                    </div>
                    <ul className="list-none m-0 p-0">
                        {invites.map(i => (
                            <li key={i.id} className="px-4 py-3 rule-b last:border-b-0 flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm text-text-main truncate">{i.email} <span className="stamp stamp-pending ml-1">{ROLE_LABELS[i.school_role]}</span></p>
                                    <p className="text-xs text-text-muted">Expira em {new Date(i.expires_at + 'Z').toLocaleDateString('pt-BR')}</p>
                                </div>
                                <button className="btn btn-ghost text-xs" onClick={() => revokeInvite(i)}>Revogar</button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};
