import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import api from '../api';
import type { Permission } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { Toast, type ToastType } from '../components/Toast';
import { apiDetail } from '../utils/apiError';
import { PERM_LABELS, PERM_ORDER, ROLE_LABELS, SECRETARY_DEFAULT, TEACHER_PERMS } from '../utils/permissions';

type Role = 'teacher' | 'secretary';

interface Member {
    id: number;
    name: string;
    email: string;
    school_role: 'owner' | Role;
    is_active: boolean;
    permissions: Permission[];
}

/** Uma célula da matriz: professor tem acessos fixos; secretaria é marcada pela direção. */
const PermCell = ({ member, perm, onToggle }: { member: Member; perm: Permission; onToggle: () => void }) => {
    if (member.school_role === 'teacher') {
        const has = TEACHER_PERMS.includes(perm);
        return (
            <span className="inline-flex justify-center w-full" title={has ? 'Fixo para professor (só nas turmas dele)' : 'Professor não tem este acesso'}>
                {has ? <Check size={16} className="text-primary" /> : <Minus size={16} className="text-text-muted opacity-50" />}
            </span>
        );
    }
    return (
        <input
            type="checkbox"
            className="w-4 h-4 cursor-pointer accent-[var(--color-primary)]"
            checked={member.permissions.includes(perm)}
            onChange={onToggle}
            aria-label={`${PERM_LABELS[perm].label} para ${member.name}`}
        />
    );
};

export const Team = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const showToast = (message: string, type: ToastType = 'success') => setToast({ message, type });

    const load = useCallback(async () => {
        try {
            const { data } = await api.get<Member[]>('/schools/members');
            setMembers(data.filter(m => m.school_role !== 'owner'));
        } catch (e) {
            showToast(apiDetail(e, 'Não foi possível carregar a equipe.'), 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Otimista: a tela responde na hora; se o backend recusar, recarrega o estado real.
    const patch = async (member: Member, body: Partial<{ school_role: Role; permissions: Permission[]; is_active: boolean }>, ok?: string) => {
        setMembers(prev => prev.map(m => (m.id === member.id ? { ...m, ...body } as Member : m)));
        try {
            const { data } = await api.patch<Member>(`/schools/members/${member.id}`, body);
            setMembers(prev => prev.map(m => (m.id === member.id ? data : m)));
            if (ok) showToast(ok);
        } catch (e) {
            showToast(apiDetail(e, 'Não foi possível salvar.'), 'error');
            load();
        }
    };

    const togglePerm = (member: Member, perm: Permission) => {
        const has = member.permissions.includes(perm);
        patch(member, { permissions: has ? member.permissions.filter(p => p !== perm) : [...member.permissions, perm] });
    };

    const changeRole = (member: Member, role: Role) => {
        if (role === member.school_role) return;
        // Virando secretaria: começa com o acesso padrão, que a direção ajusta depois
        patch(member, role === 'secretary' ? { school_role: role, permissions: SECRETARY_DEFAULT } : { school_role: role }, `${member.name} agora é ${ROLE_LABELS[role].toLowerCase()}.`);
    };

    const remove = async (member: Member) => {
        if (!window.confirm(`Remover ${member.name} da escola? A pessoa perde o acesso; as turmas dela continuam na escola, sem professor responsável.`)) return;
        try {
            await api.delete(`/schools/members/${member.id}`);
            showToast('Removido da escola.');
            load();
        } catch (e) {
            showToast(apiDetail(e, 'Não foi possível remover.'), 'error');
        }
    };

    if (loading) return <Loading variant="section" text="Carregando equipe..." />;

    return (
        <div className="animate-fade-in space-y-5">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-main flex items-center gap-2">
                        <ShieldCheck className="text-primary" size={24} /> Equipe e acessos
                    </h1>
                    <p className="text-text-muted mt-1.5 text-sm">
                        Defina o que cada pessoa pode fazer. As mudanças valem na hora.
                    </p>
                </div>
                <Link to="/dashboard/escola" className="btn btn-primary no-underline">
                    <UserPlus size={15} /> Convidar pessoa
                </Link>
            </header>

            {/* Legenda dos acessos */}
            <div className="sheet sheet-p">
                <p className="label-print mb-2">O que cada acesso libera</p>
                <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                    {PERM_ORDER.map(p => (
                        <div key={p}>
                            <dt className="inline font-semibold text-text-main">{PERM_LABELS[p].label}:</dt>{' '}
                            <dd className="inline text-text-muted">{PERM_LABELS[p].hint}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-3 text-xs text-text-muted">
                    Professor vê só as turmas em que é o responsável, com acessos fixos (chamada e relatórios), e nunca vê o financeiro.
                    Todos veem turmas e alunos dentro do que lhes cabe; os acessos acima controlam o que podem alterar.
                </p>
            </div>

            {members.length === 0 ? (
                <div className="sheet sheet-p text-center">
                    <p className="text-text-main font-semibold">Ninguém na equipe ainda</p>
                    <p className="text-text-muted text-sm mt-1.5">Convide professores e secretaria pela página Escola.</p>
                </div>
            ) : (
                <>
                    {/* Desktop: matriz pessoa x acesso */}
                    <div className="hidden md:block sheet overflow-x-auto">
                        <table style={{ minWidth: '860px' }}>
                            <thead>
                                <tr>
                                    <th>Pessoa</th>
                                    <th className="w-[150px]">Papel</th>
                                    {PERM_ORDER.map(p => (
                                        <th key={p} className="text-center w-[90px]" title={PERM_LABELS[p].hint}>{PERM_LABELS[p].label}</th>
                                    ))}
                                    <th className="w-[120px] text-center">Situação</th>
                                    <th className="w-[50px]" />
                                </tr>
                            </thead>
                            <tbody>
                                {members.map(m => (
                                    <tr key={m.id} className={m.is_active ? '' : 'opacity-60'}>
                                        <td>
                                            <p className="font-medium text-sm text-text-main">{m.name}</p>
                                            <p className="text-xs text-text-muted">{m.email}</p>
                                        </td>
                                        <td>
                                            <select className="input py-1 text-sm" value={m.school_role} onChange={e => changeRole(m, e.target.value as Role)} aria-label={`Papel de ${m.name}`}>
                                                <option value="teacher">Professor</option>
                                                <option value="secretary">Secretaria</option>
                                            </select>
                                        </td>
                                        {PERM_ORDER.map(p => (
                                            <td key={p} className="text-center">
                                                <PermCell member={m} perm={p} onToggle={() => togglePerm(m, p)} />
                                            </td>
                                        ))}
                                        <td className="text-center">
                                            <button
                                                className={`stamp cursor-pointer ${m.is_active ? 'stamp-paid' : 'stamp-late'}`}
                                                onClick={() => patch(m, { is_active: !m.is_active }, m.is_active ? `${m.name} suspenso.` : `${m.name} reativado.`)}
                                                title={m.is_active ? 'Clique para suspender o acesso' : 'Clique para reativar'}
                                            >
                                                {m.is_active ? 'Ativo' : 'Suspenso'}
                                            </button>
                                        </td>
                                        <td>
                                            <button className="btn btn-ghost px-2" onClick={() => remove(m)} aria-label={`Remover ${m.name}`}>
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Celular: um cartão por pessoa */}
                    <div className="md:hidden space-y-3">
                        {members.map(m => (
                            <div key={m.id} className={`sheet sheet-p ${m.is_active ? '' : 'opacity-70'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-sm text-text-main truncate">{m.name}</p>
                                        <p className="text-xs text-text-muted truncate">{m.email}</p>
                                    </div>
                                    <button
                                        className={`stamp cursor-pointer ${m.is_active ? 'stamp-paid' : 'stamp-late'}`}
                                        onClick={() => patch(m, { is_active: !m.is_active }, m.is_active ? `${m.name} suspenso.` : `${m.name} reativado.`)}
                                    >
                                        {m.is_active ? 'Ativo' : 'Suspenso'}
                                    </button>
                                </div>
                                <select className="input py-1.5 text-sm mt-3" value={m.school_role} onChange={e => changeRole(m, e.target.value as Role)} aria-label={`Papel de ${m.name}`}>
                                    <option value="teacher">Professor</option>
                                    <option value="secretary">Secretaria</option>
                                </select>
                                <ul className="mt-3 space-y-2 list-none p-0">
                                    {PERM_ORDER.map(p => (
                                        <li key={p} className="flex items-center justify-between gap-3 text-sm">
                                            <span className="text-text-main">{PERM_LABELS[p].label}</span>
                                            <span className="w-8 flex justify-center"><PermCell member={m} perm={p} onToggle={() => togglePerm(m, p)} /></span>
                                        </li>
                                    ))}
                                </ul>
                                <button className="btn btn-ghost text-xs mt-3 text-danger" onClick={() => remove(m)}>
                                    <Trash2 size={14} /> Remover da escola
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
