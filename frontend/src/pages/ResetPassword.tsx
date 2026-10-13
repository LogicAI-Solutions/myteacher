import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, CircularProgress, Link, Stack, TextField, Typography } from '@mui/material';
import api from '../api';
import { apiDetail } from '../utils/apiError';
import { AuthLayout } from '../components/AuthLayout';

export const ResetPassword = () => {
    const navigate = useNavigate();
    const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
        if (password !== confirm) return setError('As senhas não conferem.');
        setLoading(true);
        try {
            await api.post('/auth/reset-password', { token, password });
            // Sessões antigas deste navegador não valem mais a pena manter
            localStorage.removeItem('token');
            setDone(true);
        } catch (err) {
            setError(apiDetail(err, 'Não foi possível redefinir a senha. Peça um novo link.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Criar nova senha
            </Typography>

            {!token ? (
                <Alert severity="error" sx={{ mt: 2 }}>Link incompleto. Peça um novo link de recuperação.</Alert>
            ) : done ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Alert severity="success">Senha redefinida. Entre com a nova senha.</Alert>
                    <Button variant="contained" size="large" fullWidth onClick={() => navigate('/login')}>Ir para o login</Button>
                </Stack>
            ) : (
                <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 2 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Nova senha" type="password" value={password} onChange={e => setPassword(e.target.value)} required fullWidth autoFocus autoComplete="new-password" helperText="Mínimo de 8 caracteres" />
                    <TextField label="Repita a nova senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required fullWidth autoComplete="new-password" />
                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}>
                        {loading ? 'Salvando...' : 'Salvar nova senha'}
                    </Button>
                </Stack>
            )}

            {!done && (
                <Link component="button" type="button" variant="body2" underline="hover" sx={{ mt: 2, display: 'block', mx: 'auto' }} onClick={() => navigate('/esqueci-senha')}>
                    Pedir um novo link
                </Link>
            )}
        </AuthLayout>
    );
};

export default ResetPassword;
