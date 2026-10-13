import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, Link, Stack, TextField, Typography } from '@mui/material';
import { AuthLayout, GoogleButton } from '../components/AuthLayout';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { setPendingSchool } from '../utils/invite';

const TRIAL_DAYS = 14;

export const Register = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // A landing e a página de preços mandam o plano escolhido; é só contexto, o
    // pagamento acontece quando o teste acaba.
    const planState = location.state as { planName?: string; role?: string } | null;
    const planName = planState?.planName;
    // Plano Escola: a conta já nasce como escola (direção), com o nome informado aqui
    const isSchool = planState?.role === 'school';

    const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', school_name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleGoogleLogin = () => {
        if (isSchool) {
            if (form.school_name.trim().length < 2) {
                setError('Informe o nome da escola antes de continuar com o Google.');
                return;
            }
            setPendingSchool(form.school_name.trim());
        }
        const apiUrl = import.meta.env.VITE_API_URL || '/api';
        window.location.href = `${apiUrl}/auth/google`;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (isSchool && form.school_name.trim().length < 2) {
            setError('Informe o nome da escola.');
            return;
        }

        if (form.password.length < 8) {
            setError('A senha precisa ter pelo menos 8 caracteres.');
            return;
        }

        setLoading(true);
        try {
            const { school_name, ...rest } = form;
            await api.post('/register', isSchool ? { ...rest, account_type: 'school', school_name: school_name.trim() } : rest);
            // Entra direto com email e senha
            await login(form.email, form.password);
            navigate(isSchool ? '/dashboard/escola' : '/dashboard');
        } catch (err: any) {
            if (err.code === 'ERR_NETWORK' || !err.response) {
                setError('Sistema offline. Verifique sua conexão e tente de novo.');
            } else if (err.response.status === 409) {
                setError(err.response.data.detail);
            } else if (err.response.status === 422) {
                setError('Confira os dados preenchidos e tente novamente.');
            } else {
                setError(err.response.data?.detail || 'Não foi possível criar sua conta. Tente de novo.');
            }
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Criar conta
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {planName ? <>Plano <strong>{planName}</strong>. </> : null}
                {TRIAL_DAYS} dias grátis, sem cartão de crédito.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {isSchool && (
                <Box sx={{ mt: 2 }}>
                    <TextField
                        label="Nome da escola"
                        value={form.school_name}
                        onChange={set('school_name')}
                        required
                        autoFocus
                        fullWidth
                        name="school_name"
                        placeholder="Colégio Aprender"
                        helperText="Você será a direção e poderá convidar professores e secretaria."
                        slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }}
                    />
                </Box>
            )}
            <Box sx={{ mt: 2 }}>
                <GoogleButton onClick={handleGoogleLogin} />
            </Box>

            <Divider sx={{ my: 2, fontSize: '0.75rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                ou
            </Divider>

            <Stack component="form" onSubmit={handleSubmit} spacing={2}>
                <Stack direction="row" spacing={1.5}>
                    <TextField
                        label="Nome"
                        value={form.first_name}
                        onChange={set('first_name')}
                        required
                        fullWidth
                        autoFocus={!isSchool}
                        name="first_name"
                        autoComplete="given-name"
                        placeholder="Maria"
                        slotProps={{ htmlInput: { minLength: 2, maxLength: 60 } }}
                    />
                    <TextField
                        label="Sobrenome"
                        value={form.last_name}
                        onChange={set('last_name')}
                        required
                        fullWidth
                        name="last_name"
                        autoComplete="family-name"
                        placeholder="Silva"
                        slotProps={{ htmlInput: { minLength: 2, maxLength: 60 } }}
                    />
                </Stack>

                <TextField
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    required
                    fullWidth
                    name="email"
                    autoComplete="email"
                    placeholder="maria@escola.com.br"
                />

                <TextField
                    label="Senha"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={set('password')}
                    required
                    fullWidth
                    name="password"
                    autoComplete="new-password"
                    helperText="Mínimo de 8 caracteres."
                    slotProps={{
                        htmlInput: { minLength: 8 },
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
                    {loading ? 'Criando sua conta...' : `Começar ${TRIAL_DAYS} dias grátis`}
                </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                Já tem conta?{' '}
                <Link component="button" type="button" variant="body2" sx={{ fontWeight: 600 }} onClick={() => navigate('/login')}>
                    Entrar
                </Link>
            </Typography>
        </AuthLayout>
    );
};

export default Register;
