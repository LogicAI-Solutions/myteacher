import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft, User, Mail, AtSign, Lock, Loader2, CheckCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const TRIAL_DAYS = 14;

export const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // A landing e a página de preços mandam o plano escolhido; é só contexto, o
    // pagamento acontece quando o teste acaba.
    const planName = (location.state as { planName?: string } | null)?.planName;

    const [form, setForm] = useState({ full_name: '', email: '', nickname: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password.length < 8) {
            setError('A senha precisa ter pelo menos 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/register', form);
            // Entra direto: o valor tem que vir antes de qualquer outra tela.
            await login(form.nickname, form.password);
            navigate('/dashboard');
        } catch (err: any) {
            if (err.code === 'ERR_NETWORK' || !err.response) {
                setError('Sistema offline. Verifique sua conexão e tente de novo.');
            } else if (err.response.status === 409) {
                setError(err.response.data.detail);
            } else if (err.response.status === 422) {
                setError('Confira os dados: o usuário aceita apenas letras, números, ponto, hífen e underscore.');
            } else {
                setError(err.response.data?.detail || 'Não foi possível criar sua conta. Tente de novo.');
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-6 relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]"></div>

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 flex items-center gap-2 rounded-[2px] px-2 py-2 text-text-muted transition-colors hover:text-text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                    <ArrowLeft size={20} /> Voltar
                </button>

                <div className="sheet sheet-p">
                    <div className="text-center">
                        <div className="mb-4 flex justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-[3px] border border-primary/30 bg-primary/20 text-primary">
                                <GraduationCap size={32} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Criar conta</h1>
                        <p className="mt-2 text-text-muted">
                            {planName ? (
                                <>Plano <strong className="text-text-main">{planName}</strong>. </>
                            ) : null}
                            {TRIAL_DAYS} dias grátis, sem cartão de crédito.
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 rounded-[2px] border border-danger/20 bg-danger/10 p-4 text-sm text-danger"
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                        <div className="space-y-1">
                            <label htmlFor="full_name" className="ml-1 text-sm font-medium text-text-muted">
                                Seu nome
                            </label>
                            <div className="relative">
                                <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="full_name"
                                    className="input pl-12"
                                    value={form.full_name}
                                    onChange={set('full_name')}
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    autoComplete="name"
                                    placeholder="Maria Silva"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="email" className="ml-1 text-sm font-medium text-text-muted">
                                E-mail
                            </label>
                            <div className="relative">
                                <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="email"
                                    type="email"
                                    className="input pl-12"
                                    value={form.email}
                                    onChange={set('email')}
                                    required
                                    autoComplete="email"
                                    placeholder="maria@escola.com.br"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="nickname" className="ml-1 text-sm font-medium text-text-muted">
                                Usuário
                            </label>
                            <div className="relative">
                                <AtSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="nickname"
                                    className="input pl-12"
                                    value={form.nickname}
                                    onChange={set('nickname')}
                                    required
                                    minLength={3}
                                    maxLength={40}
                                    pattern="[A-Za-z0-9._\-]+"
                                    autoComplete="username"
                                    placeholder="maria.silva"
                                    aria-describedby="nickname-hint"
                                />
                            </div>
                            <p id="nickname-hint" className="ml-1 text-xs text-text-muted">
                                É com ele que você entra no sistema. Letras, números, ponto, hífen e underscore.
                            </p>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="ml-1 text-sm font-medium text-text-muted">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    id="password"
                                    type="password"
                                    className="input pl-12"
                                    value={form.password}
                                    onChange={set('password')}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                    aria-describedby="password-hint"
                                />
                            </div>
                            <p id="password-hint" className="ml-1 text-xs text-text-muted">
                                Mínimo de 8 caracteres.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex w-full items-center justify-center gap-2 rounded-[2px] px-6 py-3.5 text-base font-bold disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Criando sua conta...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    Começar {TRIAL_DAYS} dias grátis
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-text-muted">
                        Já tem conta?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="rounded font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            Entrar
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
