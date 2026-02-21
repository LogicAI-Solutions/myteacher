
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, GraduationCap, Compass, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';

export const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { student } = useStudentAuth();

    const handleGoHome = () => {
        if (user) {
            navigate('/dashboard');
        } else if (student) {
            navigate('/portal/dashboard');
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 overflow-hidden relative selection:bg-primary/30">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '3s' }} />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            <div className="relative z-10 w-full max-w-lg animate-slide-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8 animate-fade-in">
                    <GraduationCap className="text-primary" size={24} />
                    <span className="text-gradient font-bold text-lg">MyTeacherApp</span>
                </div>

                <div className="glass-card p-10 sm:p-12 relative overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

                    {/* Floating icon */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className="h-20 w-20 bg-primary/15 rounded-2xl flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/10 animate-float">
                                <Compass size={40} strokeWidth={1.5} />
                            </div>
                            <div className="absolute -top-1 -right-1 h-6 w-6 bg-bg-card rounded-full flex items-center justify-center border border-white/10">
                                <Sparkles size={12} className="text-primary-light" />
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-primary/10 blur-xl rounded-full" />
                        </div>
                    </div>

                    {/* Error Code */}
                    <div className="text-center mb-2">
                        <h1 className="text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white via-white/90 to-white/30 drop-shadow-lg">
                            404
                        </h1>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-3">
                        Página Não Encontrada
                    </h2>

                    <p className="text-text-muted text-center text-sm sm:text-base leading-relaxed mb-8 max-w-sm mx-auto">
                        Ops! Parece que você se perdeu no caminho. A página que você procura não existe ou foi movida.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-6 py-3 rounded-xl border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium group"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            Voltar
                        </button>
                        <button
                            onClick={handleGoHome}
                            className="btn-primary-gradient px-6 py-3 rounded-xl text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 font-bold group hover:scale-[1.02]"
                        >
                            <Home size={18} />
                            Ir para Início
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                    </div>
                </div>

                {/* Footer text */}
                <div className="text-center mt-6 animate-fade-in">
                    <p className="text-text-muted/40 text-xs">
                        MyTeacherApp • LogicIA Solutions
                    </p>
                </div>
            </div>
        </div>
    );
};
