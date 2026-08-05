import { useEffect, useState } from 'react';
import { Clock, MessageCircle, Lock, ArrowLeft, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildSupportWhatsAppUrl } from '../utils/support';
import api from '../api';
import type { Plan } from './Pricing';

export const TrialExpired = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState<number | null>(null);

    useEffect(() => {
        api.get('/plans/')
            .then(({ data }) => setPlans(data.filter((p: Plan) => p.stripe_price_id)))
            .catch(() => setPlans([]));
    }, []);

    const handleSubscribe = async (planId: number) => {
        setLoading(planId);
        try {
            const { data } = await api.post('/billing/checkout', null, { params: { plan_id: planId } });
            window.location.href = data.url;
        } catch (error: any) {
            alert(error?.response?.data?.detail || 'Não foi possível iniciar o pagamento.');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-6 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-danger/5 via-bg-dark to-warning/5"></div>
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-danger/5 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-warning/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 w-full max-w-lg animate-fade-in">
                <div className="glass-card p-8 md:p-10 text-center border border-danger/20 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="h-20 w-20 bg-danger/15 rounded-2xl flex items-center justify-center text-danger border border-danger/25 shadow-lg">
                                <Lock size={40} />
                            </div>
                            <div className="absolute -top-1 -right-1 h-6 w-6 bg-warning rounded-full flex items-center justify-center animate-bounce">
                                <Clock size={14} className="text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-danger to-warning">
                        Período de Teste Encerrado
                    </h1>

                    {/* Description */}
                    <p className="text-text-muted mb-2 text-base leading-relaxed">
                        Seu período de teste gratuito de <strong className="text-text-main">7 dias</strong> chegou ao fim.
                    </p>
                    <p className="text-text-muted mb-8 text-sm leading-relaxed">
                        Para continuar utilizando todas as funcionalidades do sistema, escolha um plano.
                    </p>

                    {/* Planos */}
                    <div className="space-y-3 mb-4">
                        {plans.map((plan) => (
                            <button
                                key={plan.id}
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={loading !== null}
                                className={`w-full flex items-center justify-between gap-3 py-4 px-6 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 ${
                                    plan.popular
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
                                        : 'bg-white/10 hover:bg-white/20'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <CreditCard size={22} />
                                    <span className="text-left">
                                        <span className="block">{plan.name}</span>
                                        <span className="block text-xs font-normal text-white/70">
                                            {plan.max_classes >= 9999 ? 'Turmas ilimitadas' : `Até ${plan.max_classes} turmas`}
                                        </span>
                                    </span>
                                </span>
                                <span className="text-lg whitespace-nowrap">
                                    {loading === plan.id ? '...' : `${plan.price}${plan.period}`}
                                </span>
                            </button>
                        ))}
                    </div>

                    <a
                        href={buildSupportWhatsAppUrl('Ola! Meu periodo de teste do MyTeacher acabou e gostaria de saber sobre os planos disponiveis.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-green-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] w-full justify-center text-lg"
                    >
                        <MessageCircle size={22} />
                        Falar no WhatsApp
                    </a>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-bg-card px-3 text-text-muted">ou</span>
                        </div>
                    </div>

                    {/* Back to login */}
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            navigate('/login');
                        }}
                        className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors mx-auto text-sm"
                    >
                        <ArrowLeft size={16} />
                        Voltar ao login
                    </button>
                </div>

                {/* Footer info */}
                <p className="text-center text-text-muted text-xs mt-6 opacity-60">
                    MyTeacherApp — Sistema de gerenciamento para professores
                </p>
            </div>
        </div>
    );
};

export default TrialExpired;
