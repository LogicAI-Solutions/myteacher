import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

export const StudentLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, student } = useStudentAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (student) {
            navigate('/portal/dashboard');
        }
    }, [student, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/portal/dashboard');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'ERR_NETWORK' || !err.response) {
                setError('Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.');
            } else if (err.response?.status === 401) {
                setError('Usuário ou senha incorretos. Peça os dados ao seu professor se precisar.');
            } else if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Algo deu errado ao entrar. Tente de novo em instantes.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-bg-dark text-text-main">
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12" style={{ background: 'var(--desk-sunk)' }}>
                <div className="w-full max-w-md animate-slide-up">
                    <div className="sheet overflow-hidden">
                        <img src="/student_login_hero.png" alt="" className="w-full h-auto block" />
                        <div className="p-6 rule-t">
                            <p className="label-print">Portal do aluno</p>
                            <h2 className="mt-3 text-2xl font-bold leading-snug">
                                A sua situação, sempre à mão.
                            </h2>
                            <p className="mt-3 text-text-muted leading-relaxed">
                                Veja as suas aulas, as suas presenças e as suas mensalidades. Só o que é seu.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative">
                <button onClick={() => navigate('/')} className="absolute top-5 left-5 btn btn-ghost">
                    <ArrowLeft size={16} /> Voltar
                </button>

                <div className="w-full max-w-sm animate-fade-in">
                    <div className="flex items-center gap-2">
                        <GraduationCap size={24} className="text-primary" />
                        <span className="font-bold text-lg">MyTeacherApp</span>
                    </div>

                    <h1 className="mt-6 text-2xl sm:text-3xl font-bold">Entrar como aluno</h1>
                    <p className="text-text-muted mt-1.5">Use o usuário e a senha que o seu professor passou.</p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-6 flex items-start gap-2.5 rounded-[2px] border border-danger p-3.5 text-sm text-text-main animate-shake"
                            style={{ background: 'color-mix(in srgb, var(--margin-red) 8%, transparent)' }}
                        >
                            <AlertCircle size={17} className="mt-0.5 shrink-0 text-danger" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                        <div className="field">
                            <label className="label-print" htmlFor="student-user">Usuário</label>
                            <input
                                id="student-user"
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                autoFocus
                            />
                        </div>

                        <div className="field">
                            <label className="label-print" htmlFor="student-password">Senha</label>
                            <input
                                id="student-password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="pr-11"
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-3 text-base justify-center group"
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Entrar
                                    <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
