import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material';
import api from '../api';
import { apiDetail } from '../utils/apiError';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/AuthLayout';

export const VerifyEmail = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const started = useRef(false); // StrictMode roda o efeito duas vezes

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        const token = new URLSearchParams(window.location.search).get('token') || '';
        api.post('/auth/verify-email', { token })
            .then(() => {
                setStatus('ok');
                refreshUser();
            })
            .catch(err => {
                setStatus('error');
                setMessage(apiDetail(err, 'Não foi possível confirmar o e-mail.'));
            });
    }, [refreshUser]);

    return (
        <AuthLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Confirmação de e-mail
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
                {status === 'loading' && <CircularProgress sx={{ alignSelf: 'center' }} />}
                {status === 'ok' && <Alert severity="success">E-mail confirmado. Obrigado!</Alert>}
                {status === 'error' && (
                    <Alert severity="error">
                        {message} {user ? 'Peça um novo link pelo aviso no painel.' : 'Entre na sua conta para pedir um novo link.'}
                    </Alert>
                )}
                {status !== 'loading' && (
                    <Button variant="contained" size="large" fullWidth onClick={() => navigate(user ? '/dashboard' : '/login')}>
                        {user ? 'Ir para o painel' : 'Ir para o login'}
                    </Button>
                )}
            </Stack>
        </AuthLayout>
    );
};

export default VerifyEmail;
