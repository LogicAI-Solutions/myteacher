import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Lock, ArrowLeft, CreditCard, RefreshCw } from 'lucide-react';
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
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="w-full max-w-lg animate-fade-in">
                <div className="sheet sheet-p">
                    <div className="flex items-center gap-3">
                        <Lock size={20} className="text-danger shrink-0" aria-hidden="true" />
                        <span className="stamp stamp-late">Acesso encerrado</span>
                    </div>

                    <h1 className="mt-5 text-2xl md:text-3xl font-bold text-text-main">
                        Seu teste de 14 dias acabou
                    </h1>

                    <p className="mt-3 text-text-muted leading-relaxed">
                        Seus dados continuam salvos. Escolha um plano para voltar a usar o sistema,
                        ou fale com a gente se tiver alguma dúvida.
                    </p>

                    {/* Planos */}
                    <div className="mt-7" aria-live="polite" aria-busy={status === 'loading'}>
                        <p className="label-print mb-2">Escolha um plano</p>

                        {status === 'loading' && <Loading variant="section" text="Carregando planos..." />}

                        {status === 'error' && (
                            <div className="rounded-[2px] border border-danger p-4 text-sm" style={{ background: 'color-mix(in srgb, var(--margin-red) 8%, transparent)' }}>
                                <p className="text-text-main mb-3">
                                    Não conseguimos carregar os planos. Verifique sua conexão e tente de novo.
                                </p>
                                <button onClick={loadPlans} className="btn btn-outline text-danger">
                                    <RefreshCw size={15} />
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {status === 'ready' && plans.length === 0 && (
                            <p className="rounded-[2px] border border-border p-4 text-sm text-text-muted" style={{ background: 'var(--desk)' }}>
                                Nenhum plano está disponível para assinatura no momento. Fale com o suporte pelo
                                WhatsApp abaixo que a gente resolve para você.
                            </p>
                        )}

                        {status === 'ready' && plans.length > 0 && (
                            <div className="space-y-2">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={busy}
                                        aria-busy={checkoutFor === plan.id}
                                        className={`w-full flex items-center justify-between gap-3 rounded-[2px] border px-4 py-3.5 text-left transition-colors duration-150 disabled:pointer-events-none disabled:opacity-60 ${
                                            plan.popular
                                                ? 'border-primary'
                                                : 'border-rule-strong hover:border-primary'
                                        }`}
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <CreditCard size={22} className="flex-none text-primary" aria-hidden="true" />
                                            <span className="min-w-0">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate font-bold text-text-main">{plan.name}</span>
                                                    {plan.popular && (
                                                        <span className="stamp stamp-paid flex-none">Popular</span>
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

                    <div className="mt-6 pt-5 rule-t flex flex-col sm:flex-row items-center justify-between gap-3">
                        <a
                            href={buildSupportWhatsAppUrl('Ola! Meu periodo de teste do MyTeacher acabou e gostaria de saber sobre os planos disponiveis.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline text-primary no-underline"
                        >
                            <MessageCircle size={17} />
                            Tirar uma dúvida no WhatsApp
                        </a>

                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                navigate('/login');
                            }}
                            className="btn btn-ghost"
                        >
                            <ArrowLeft size={15} />
                            Voltar ao login
                        </button>
                    </div>
                </div>

                <p className="text-center text-text-muted text-xs mt-5">
                    MyTeacherApp — gestão para professores autônomos
                </p>
            </div>
        </div>
    );
};

export default TrialExpired;
