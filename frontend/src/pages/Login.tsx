import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ArrowLeft, Lock, User, ArrowRight } from 'lucide-react';
import loginHeroImage from '../assets/login_hero_female.png';
import { openSupportWhatsApp } from '../utils/support';

export const Login = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(nickname, password);
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            // Se trial expirou, redirecionar para tela de trial expirado
            if (err.response?.status === 403 && err.response?.data?.detail === 'TRIAL_EXPIRED') {
                navigate('/trial-expired');
                return;
            }
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
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-bg-darker to-primary-light/20"></div>
                <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Content */}
                <div className="relative z-10 w-full max-w-lg">
                    <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl animate-slide-up">
                        <img
                            src={loginHeroImage}
                            alt="Login Illustration"
                            className="w-full h-auto rounded-2xl mb-8 shadow-lg transform hover:scale-[1.02] transition-transform duration-500"
                        />
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold">Bem-vindo de volta!</h2>
                            <p className="text-text-muted text-lg">
                                Acesse seu painel administrativo e tenha controle total sobre suas turmas e finanças.
                            </p>
                            <div className="flex gap-2 pt-4">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50"></span>
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/20"></span>
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
                            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary border border-primary/30 shadow-glow-primary">
                                <GraduationCap size={32} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">Login</h1>
                        <p className="text-text-muted mt-2">Entre com suas credenciais para continuar.</p>
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
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    className="input-modern pl-12"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    required
                                    placeholder="ex: professor_silva"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-muted ml-1">Senha</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">
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
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    className="text-xs text-primary-light hover:text-white transition-colors"
                                    onClick={() => openSupportWhatsApp()}
                                >
                                    Esqueceu a senha?
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary-gradient w-full py-4 text-lg rounded-xl flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
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

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-bg-dark px-2 text-text-muted">
                                MyTeacherApp
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
