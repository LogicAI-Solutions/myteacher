import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import { openSupportWhatsApp } from '../utils/support';
import { AuthLayout, GoogleButton } from '../components/AuthLayout';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        if (errorParam === 'oauth_failed') {
            setError('Falha ao autenticar com o Google. Tente novamente ou use seu e-mail e senha.');
            window.history.replaceState({}, '', '/login');
        } else if (errorParam === 'google_not_configured') {
            setError('O login com o Google ainda não foi configurado no servidor.');
            window.history.replaceState({}, '', '/login');
        }
    }, []);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    useEffect(() => {
        const handleAuthMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                navigate('/dashboard');
            } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
                setError('Falha ao autenticar com o Google. Tente novamente.');
            }
        };

        window.addEventListener('message', handleAuthMessage);
        return () => window.removeEventListener('message', handleAuthMessage);
    }, [navigate]);

    const handleGoogleLogin = () => {
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
            `${apiUrl}/auth/google`,
            'google_login_popup',
            `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            console.error(err);
            // Se trial expirou, redirecionar para tela de trial expirado
            if (err.response?.status === 403 && err.response?.data?.detail === 'TRIAL_EXPIRED') {
                navigate('/trial-expired');
                return;
            }
            if (err.code === 'ERR_NETWORK' || !err.response) {
                setError('Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.');
            } else if (err.response?.status === 401) {
                setError('E-mail ou senha incorretos. Confira e tente de novo.');
            } else if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Algo deu errado ao entrar. Tente de novo em instantes.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Entrar
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Acesse o seu registro.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ mt: 2 }}>
                <GoogleButton onClick={handleGoogleLogin} />
            </Box>

            <Divider sx={{ my: 2, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                ou
            </Divider>

            <Stack component="form" onSubmit={handleSubmit} spacing={2}>
                <TextField
                    label="E-mail"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    fullWidth
                    autoFocus
                    autoComplete="email"
                    placeholder="maria@escola.com.br"
                />

                <TextField
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    fullWidth
                    autoComplete="current-password"
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                />

                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                    {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                <Link
                    component="button"
                    type="button"
                    variant="body2"
                    underline="hover"
                    sx={{ alignSelf: 'center' }}
                    onClick={() => openSupportWhatsApp('Olá! Esqueci a senha do MyTeacherApp e preciso de ajuda para recuperar.')}
                >
                    Esqueceu a senha?
                </Link>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                Ainda não tem conta?{' '}
                <Link component="button" type="button" variant="body2" sx={{ fontWeight: 600 }} onClick={() => navigate('/register')}>
                    Comece o teste de 14 dias
                </Link>
            </Typography>
        </AuthLayout>
    );
};

export default Login;
