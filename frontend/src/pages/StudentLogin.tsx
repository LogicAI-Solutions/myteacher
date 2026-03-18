import React, { useState, useEffect } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ArrowLeft, Lock, User, ArrowRight } from 'lucide-react';

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
                setError('Sistema offline. Verifique sua conexão.');
            } else if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.response?.status === 401) {
                setError('Credenciais inválidas.');
            } else {
                setError('Erro inesperado. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-bg-dark text-text-main overflow-hidden">
            {/* Left Side - Image/Brand */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-bg-darker items-center justify-center p-12 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-bg-darker to-primary/20"></div>
                <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-lg">
                    <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-slide-up">
                        <img
                            src="/student_login_hero.png"
                            alt="Student Login Illustration"
                            className="w-full h-auto rounded-2xl mb-8 shadow-lg transform hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold">Área do Aluno</h2>
                            <p className="text-text-muted text-lg">
                                Acompanhe suas aulas, verifique sua evolução e mantenha-se conectado com seus estudos.
                            </p>
                            <div className="flex gap-2 pt-4">
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary/50"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-secondary/20"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-6 left-6 text-text-muted hover:text-white flex items-center gap-2 transition-colors p-2 rounded-lg hover:bg-white/5"
                >
                    <ArrowLeft size={20} /> Voltar
                </button>

                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary border border-secondary/30 shadow-glow-secondary">
                                <GraduationCap size={32} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Login do Aluno</h1>
                        <p className="text-text-muted mt-2">Entre com seu usuário e senha.</p>
                    </div>

                    {error && (
                        <div className="bg-danger/10 border border-danger/20 text-danger p-4 rounded-xl text-sm flex items-center gap-2 animate-shake">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted ml-1">Usuário</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    className="input-modern pl-12"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                    placeholder="Seu usuário"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="input-modern pl-12 pr-12"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors cursor-pointer"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn w-full py-4 text-lg rounded-xl flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed bg-secondary hover:bg-secondary/90 text-white font-bold shadow-lg shadow-secondary/20 transition-all"
                        >
                            {loading ? (
                                <span className="animate-pulse">Entrando...</span>
                            ) : (
                                <>
                                    Entrar <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
