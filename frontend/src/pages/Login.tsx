import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    InputAdornment,
    Link,
    Paper,
    Stack,
    TextField,
    ThemeProvider,
    Typography,
    createTheme,
} from '@mui/material';
import { openSupportWhatsApp } from '../utils/support';

// Paleta do sistema (DESIGN.md). O MUI vive só nesta tela, então o tema é
// montado aqui em vez de virar provider global.
const PALETTE = {
    ink: '#001D39',
    institution: '#0A4174',
    institutionPressed: '#001D39',
    institutionLight: '#49769F',
    inkDark: '#e7f3fa',
    institutionDark: '#7BBDE8',
};

export const Login = () => {
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, user } = useAuth();
    const { theme: appTheme } = useTheme();
    const navigate = useNavigate();

    const muiTheme = useMemo(() => {
        const dark = appTheme === 'ardosia';
        return createTheme({
            palette: {
                mode: dark ? 'dark' : 'light',
                primary: {
                    main: dark ? PALETTE.institutionDark : PALETTE.institution,
                    dark: PALETTE.institutionPressed,
                    light: PALETTE.institutionLight,
                    contrastText: dark ? PALETTE.ink : '#ffffff',
                },
                background: {
                    default: dark ? '#001D39' : '#eef4f9',
                    paper: dark ? '#0b2c4f' : '#ffffff',
                },
                text: {
                    primary: dark ? PALETTE.inkDark : PALETTE.ink,
                    secondary: dark ? '#a3c3d8' : '#46617c',
                },
            },
            shape: { borderRadius: 3 },
            typography: {
                fontFamily: 'Archivo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
                button: { textTransform: 'none', fontWeight: 700 },
            },
            components: {
                MuiButton: { defaultProps: { disableElevation: true } },
                MuiPaper: { defaultProps: { elevation: 0 } },
            },
        });
    }, [appTheme]);

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(nickname, password);
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
                setError('Usuário ou senha incorretos. Confira e tente de novo.');
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
        <ThemeProvider theme={muiTheme}>
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                    bgcolor: 'background.default',
                }}
            >
                <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                        <GraduationCap size={26} color={muiTheme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            MyTeacherApp
                        </Typography>
                    </Stack>

                    <Paper
                        variant="outlined"
                        component="form"
                        onSubmit={handleSubmit}
                        sx={{ p: { xs: 3, sm: 4 } }}
                    >
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            Entrar
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            Acesse o seu registro.
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        <Stack spacing={2.5} sx={{ mt: 3 }}>
                            <TextField
                                label="Usuário"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                                required
                                fullWidth
                                autoFocus
                                autoComplete="username"
                                placeholder="professor_silva"
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

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                            Ainda não tem conta?{' '}
                            <Link component="button" type="button" variant="body2" sx={{ fontWeight: 600 }} onClick={() => navigate('/register')}>
                                Comece o teste de 14 dias
                            </Link>
                        </Typography>
                    </Paper>

                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 3 }}>
                        <Link component="button" type="button" underline="hover" sx={{ color: 'text.secondary' }} onClick={() => navigate('/')}>
                            Voltar para o início
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default Login;
