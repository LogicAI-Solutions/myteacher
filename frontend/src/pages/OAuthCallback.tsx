import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const OAuthCallback = () => {
    const navigate = useNavigate();
    // O backend entrega no fragmento (#) para o token não ir a logs nem ao Referer.
    // Lido uma vez: o efeito limpa o hash e, no StrictMode, roda duas vezes.
    const [params] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
    const { refreshUser } = useAuth();

    useEffect(() => {
        window.history.replaceState(null, '', window.location.pathname);
        const token = params.get('token');
        const linked = params.get('linked') === '1';
        const redirect = params.get('redirect') || '/dashboard';

        if (linked) {
            // Google conectado a uma conta já logada: não há token novo.
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', redirect }, window.location.origin);
                window.close();
                return;
            }
            navigate(redirect, { replace: true });
        } else if (token) {
            localStorage.setItem('token', token);
            window.dispatchEvent(new Event('storage'));

            // Se foi aberto como popup, comunica a janela pai e fecha o popup
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token, redirect }, window.location.origin);
                    window.close();
                    return;
                } catch (e) {
                    console.error('Error posting message to opener:', e);
                }
            }

            // Redirecionamento normal se não for popup
            refreshUser().then(() => {
                navigate(redirect, { replace: true });
            });
        } else {
            if (window.opener && !window.opener.closed) {
                try {
                    window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR' }, window.location.origin);
                    window.close();
                    return;
                } catch (e) {
                    console.error('Error posting message to opener:', e);
                }
            }
            navigate('/login?error=oauth_failed', { replace: true });
        }
    }, [params, navigate, refreshUser]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark text-text-main p-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-text-muted font-medium text-base">Autenticando com o Google...</p>
        </div>
    );
};

export default OAuthCallback;
