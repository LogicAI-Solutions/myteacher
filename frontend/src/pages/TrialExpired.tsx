import { useCallback, useEffect, useState } from 'react';
import { Clock, MessageCircle, Lock, ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildSupportWhatsAppUrl } from '../utils/support';
import api from '../api';
import { Loading } from '../components/Loading';
import { Toast, type ToastType } from '../components/Toast';
import type { Plan } from './Pricing';

// Sentinela do backend: planos ilimitados são semeados com 9999 em core/init_db.py.
const UNLIMITED_CLASSES = 9999;

type Status = 'loading' | 'ready' | 'error';

export const TrialExpired = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [status, setStatus] = useState<Status>('loading');
    const [checkoutFor, setCheckoutFor] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const loadPlans = useCallback(async () => {
        setStatus('loading');
        try {
            const { data } = await api.get('/plans/');
            setPlans(data.filter((p: Plan) => p.stripe_price_id));
            setStatus('ready');
        } catch {
            setStatus('error');
        }
    }, []);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const handleSubscribe = async (planId: number) => {
        setCheckoutFor(planId);
        try {
            const { data } = await api.post('/billing/checkout', null, { params: { plan_id: planId } });
            window.location.href = data.url;
        } catch (error: any) {
            const status = error?.response?.status;
            setToast({
                type: 'error',
                message:
                    status === 503
                        ? 'O pagamento ainda não está disponível. Fale com o suporte pelo WhatsApp.'
                        : error?.response?.data?.detail || 'Não foi possível abrir o pagamento. Tente de novo.',
            });
            setCheckoutFor(null);
        }
    };

    const busy = checkoutFor !== null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-6 relative overflow-hidden">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-danger/5 via-bg-dark to-warning/5"></div>
            <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-danger/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-warning/5 rounded-full blur-[120px]"></div>

            <div className="relative z-10 w-full max-w-lg animate-fade-in">
                <div className="glass-card p-8 md:p-10 text-center border border-danger/20 shadow-2xl">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="h-20 w-20 bg-danger/15 rounded-2xl flex items-center justify-center text-danger border border-danger/25 shadow-lg">
                                <Lock size={40} />
                            </div>
                            <div className="absolute -top-1 -right-1 h-6 w-6 bg-warning rounded-full flex items-center justify-center">
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
                    <div className="mb-4" aria-live="polite" aria-busy={status === 'loading'}>
                        {status === 'loading' && <Loading variant="section" text="Carregando planos..." />}

                        {status === 'error' && (
                            <div className="rounded-xl border border-danger/25 bg-danger/10 p-5 text-sm">
                                <p className="text-text-main mb-3">
                                    Não conseguimos carregar os planos. Verifique sua conexão.
                                </p>
                                <button
                                    onClick={loadPlans}
                                    className="inline-flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2 font-semibold text-danger transition-colors hover:bg-danger/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
                                >
                                    <RefreshCw size={16} />
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {status === 'ready' && plans.length === 0 && (
                            <p className="rounded-xl border border-border bg-warning/10 p-5 text-sm text-text-muted">
                                Nenhum plano está disponível para assinatura no momento. Fale com o suporte pelo WhatsApp
                                abaixo que a gente resolve para você.
                            </p>
                        )}

                        {status === 'ready' && plans.length > 0 && (
                            <div className="space-y-3">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={busy}
                                        aria-busy={checkoutFor === plan.id}
                                        className={`w-full flex items-center justify-between gap-3 rounded-xl border px-6 py-4 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                                            plan.popular
                                                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                                : 'border-border hover:border-primary'
                                        }`}
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <CreditCard size={22} className="flex-none text-primary" aria-hidden="true" />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate font-bold text-text-main">{plan.name}</span>
                                                    {plan.popular && (
                                                        <span className="badge-glass badge-primary flex-none">Popular</span>
                                                    )}
                                                </span>
                                                <span className="block truncate text-xs text-text-muted">
                                                    {plan.max_classes >= UNLIMITED_CLASSES
                                                        ? 'Turmas ilimitadas'
                                                        : `Até ${plan.max_classes} turmas`}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex-none whitespace-nowrap font-bold text-text-main">
                                            {checkoutFor === plan.id ? (
                                                <Loading variant="inline" text="Abrindo..." />
                                            ) : (
                                                `${plan.price}${plan.period}`
                                            )}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <a
                        href={buildSupportWhatsAppUrl('Ola! Meu periodo de teste do MyTeacher acabou e gostaria de saber sobre os planos disponiveis.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-green-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] w-full justify-center text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
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
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-text-muted hover:text-text-main transition-colors mx-auto text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
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
