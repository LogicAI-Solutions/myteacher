import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import { buildSupportWhatsAppUrl } from '../utils/support';
import api from '../api';

// O Stripe redireciona pra cá depois do pagamento, mas a conta só é ativada quando
// o webhook checkout.session.completed chega no backend (assíncrono, alguns segundos).
// Aqui a gente espera essa ativação antes de mandar o usuário pro painel — senão o
// /users/me ainda devolve TRIAL_EXPIRED e quem pagou cairia de volta no paywall.
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 20; // ~40s de tolerância pro webhook

type Status = 'confirming' | 'timeout';

export const CheckoutSuccess = () => {
    const [status, setStatus] = useState<Status>('confirming');
    const attempts = useRef(0);

    useEffect(() => {
        let active = true;
        let timer: ReturnType<typeof setTimeout>;

        const check = async () => {
            try {
                const { data } = await api.get('/users/me');
                // Webhook processou: trial encerrado e conta ativa.
                if (!data.is_trial && data.is_active) {
                    // Recarrega no painel pra o AuthContext reinicializar com a conta já ativa.
                    window.location.replace('/dashboard?assinatura=ok');
                    return;
                }
            } catch {
                // 403 TRIAL_EXPIRED enquanto o webhook não chega — só seguir tentando.
            }
            if (!active) return;
            attempts.current += 1;
            if (attempts.current >= MAX_ATTEMPTS) {
                setStatus('timeout');
                return;
            }
            timer = setTimeout(check, POLL_INTERVAL_MS);
        };

        check();
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-dark text-text-main p-6">
            <div className="w-full max-w-md animate-fade-in">
                <div className="sheet sheet-p text-center">
                    {status === 'confirming' ? (
                        <>
                            <div className="mb-5 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-[3px] border border-primary/30 bg-primary/20 text-primary">
                                    <Loader2 size={32} className="animate-spin" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold">Confirmando seu pagamento</h1>
                            <p className="mt-3 text-text-muted leading-relaxed">
                                Recebemos sua assinatura e estamos liberando o acesso. Isso leva só
                                alguns segundos, não feche esta página.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="mb-5 flex justify-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-[3px] border border-primary/30 bg-primary/20 text-primary">
                                    <CheckCircle size={32} />
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold">Pagamento recebido</h1>
                            <p className="mt-3 text-text-muted leading-relaxed">
                                A ativação está demorando um pouco mais que o normal. Seu pagamento
                                foi registrado — atualize o painel em instantes. Se continuar
                                bloqueado, fale com a gente que resolvemos na hora.
                            </p>
                            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <button
                                    onClick={() => window.location.replace('/dashboard?assinatura=ok')}
                                    className="btn btn-primary"
                                >
                                    Ir para o painel
                                </button>
                                <a
                                    href={buildSupportWhatsAppUrl('Ola! Acabei de assinar o MyTeacher mas meu acesso ainda nao foi liberado.')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline text-primary no-underline"
                                >
                                    <MessageCircle size={17} />
                                    Falar no WhatsApp
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
