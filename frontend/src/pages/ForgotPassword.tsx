import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material';
import api from '../api';
import { apiStatus } from '../utils/apiError';
import { AuthLayout } from '../components/AuthLayout';

export const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: email.trim() });
            setSent(true);
        } catch (err) {
            setError(apiStatus(err) === 422 ? 'Informe um e-mail válido.' : 'Não foi possível enviar agora. Tente de novo em instantes.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Recuperar senha
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Enviamos um link para você criar uma nova senha.
            </Typography>

            {sent ? (
                <Alert severity="success" sx={{ mt: 2 }}>
                    Se houver uma conta com <strong>{email.trim()}</strong>, o link chega em instantes. Ele vale por 1 hora.
                    Confira também a caixa de spam.
                </Alert>
            ) : (
                <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        label="E-mail da conta"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        fullWidth
                        autoFocus
                        autoComplete="email"
                    />
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                        {loading ? 'Enviando...' : 'Enviar link'}
                    </Button>
                </Stack>
            )}

            <Link component="button" type="button" variant="body2" underline="hover" sx={{ mt: 2, display: 'block', mx: 'auto' }} onClick={() => navigate('/login')}>
                Voltar ao login
            </Link>
        </AuthLayout>
    );
};

export default ForgotPassword;
