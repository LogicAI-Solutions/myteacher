import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, LogIn } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { setPendingInvite, clearPendingInvite } from '../utils/invite';
import { apiDetail } from '../utils/apiError';
import { Loading } from '../components/Loading';

interface InviteInfo {
    school_name: string;
    email: string;
    school_role: 'teacher' | 'secretary';
    has_account: boolean;
}

const ROLE_TEXT = { teacher: 'professor(a)', secretary: 'secretaria' };

export const AcceptInvite = () => {
    const { token = '' } = useParams();
    const navigate = useNavigate();
    const { user, refreshUser, logout, isLoading } = useAuth();
    const [invite, setInvite] = useState<InviteInfo | null>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ first_name: '', last_name: '', password: '' });

    useEffect(() => {
        api.get(`/invites/${token}`)
            .then(r => { setInvite(r.data); setStatus('ready'); })
            .catch(() => setStatus('invalid'));
    }, [token]);

    const finish = async () => {
        clearPendingInvite();
        await refreshUser();
        navigate('/dashboard', { replace: true });
    };

    const accept = async () => {
        setBusy(true);
        setError('');
        try {
            await api.post(`/invites/${token}/accept`);
            await finish();
        } catch (e) {
            setError(apiDetail(e, 'Não foi possível aceitar o convite.'));
            setBusy(false);
        }
    };

    const register = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const { data } = await api.post(`/invites/${token}/register`, form);
            localStorage.setItem('token', data.access_token);
            await finish();
        } catch (err) {
            setError(apiDetail(err, 'Confira os dados: nome e sobrenome com 2+ letras e senha com 8+ caracteres.'));
            setBusy(false);
        }
    };

    // Conta existente (senha ou Google): guarda o convite e aceita logo após o login.
    const goLogin = () => {
        setPendingInvite(token);
        logout();
        navigate('/login');
    };

    if (status === 'loading' || isLoading) return <Loading variant="fullscreen" text="Carregando convite..." />;

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-4">
            <div className="w-full max-w-md animate-slide-up sheet sheet-p">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 className="text-primary" size={20} />
                    <span className="label-print">Convite</span>
                </div>

                {status === 'invalid' || !invite ? (
                    <>
                        <h1 className="text-2xl font-bold">Convite inválido ou expirado</h1>
                        <p className="mt-2 text-text-muted">Peça à direção da escola um novo link.</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold">{invite.school_name}</h1>
                        <p className="mt-2 text-text-muted">
                            Você foi convidado(a) como <strong className="text-text-main">{ROLE_TEXT[invite.school_role]}</strong> para <strong className="text-text-main">{invite.email}</strong>.
                        </p>

                        {error && <p className="mt-4 text-sm text-[var(--margin-red)]">{error}</p>}

                        {user && user.email.toLowerCase() === invite.email ? (
                            <div className="mt-5 space-y-3">
                                <p className="text-sm text-text-muted">
                                    Ao entrar na escola, seus alunos e turmas pessoais ficam ocultos (não são apagados) enquanto você fizer parte dela.
                                </p>
                                <button className="btn btn-primary w-full justify-center" disabled={busy} onClick={accept}>
                                    {busy ? 'Entrando...' : 'Entrar na escola'}
                                </button>
                            </div>
                        ) : user ? (
                            <div className="mt-5 space-y-3">
                                <p className="text-sm text-text-muted">Você está conectado(a) como {user.email}. Este convite é para outro e-mail.</p>
                                <button className="btn btn-outline w-full justify-center" onClick={goLogin}><LogIn size={15} /> Entrar com {invite.email}</button>
                            </div>
                        ) : invite.has_account ? (
                            <div className="mt-5 space-y-3">
                                <p className="text-sm text-text-muted">Já existe uma conta com este e-mail. Entre com ela (senha ou Google) para aceitar.</p>
                                <button className="btn btn-primary w-full justify-center" onClick={goLogin}><LogIn size={15} /> Entrar e aceitar</button>
                            </div>
                        ) : (
                            <form onSubmit={register} className="mt-5 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="label">Nome</span>
                                        <input className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required minLength={2} />
                                    </label>
                                    <label className="block">
                                        <span className="label">Sobrenome</span>
                                        <input className="input" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required minLength={2} />
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="label">Crie uma senha</span>
                                    <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
                                </label>
                                <button type="submit" className="btn btn-primary w-full justify-center" disabled={busy}>
                                    {busy ? 'Criando conta...' : 'Criar conta e entrar'}
                                </button>
                                <button type="button" className="btn btn-ghost w-full justify-center" onClick={goLogin}>
                                    Prefiro entrar com o Google
                                </button>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AcceptInvite;
