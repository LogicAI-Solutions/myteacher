import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { Box, Button, Link, Paper, Stack, ThemeProvider, Typography, createTheme, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../context/ThemeContext';

// Paleta do sistema (DESIGN.md). O MUI vive só nas telas de auth, então o
// tema é montado aqui em vez de virar provider global.
const PALETTE = {
    ink: '#001D39',
    institution: '#0A4174',
    institutionPressed: '#001D39',
    institutionLight: '#49769F',
    inkDark: '#e7f3fa',
    institutionDark: '#7BBDE8',
};

// Login e Cadastro compartilham o mesmo casco: tema, logo, card e rodapé.
export const AuthLayout = ({ children }: { children: ReactNode }) => {
    const { theme: appTheme } = useTheme();
    const navigate = useNavigate();

    const muiTheme = useMemo(() => {
        const dark = appTheme === 'ardosia';
        const isAlmaco = appTheme === 'almaco';

        return createTheme({
            palette: {
                mode: dark ? 'dark' : 'light',
                primary: {
                    main: dark ? PALETTE.institutionDark : (isAlmaco ? '#0277bd' : PALETTE.institution),
                    dark: dark ? PALETTE.institutionPressed : (isAlmaco ? '#01579b' : PALETTE.institutionPressed),
                    light: dark ? PALETTE.institutionLight : (isAlmaco ? '#29b6f6' : PALETTE.institutionLight),
                    contrastText: dark ? PALETTE.ink : '#ffffff',
                },
                background: {
                    default: dark ? '#001D39' : (isAlmaco ? '#cde2f1' : '#f6f8fb'),
                    paper: dark ? '#0b2c4f' : (isAlmaco ? '#f0f7fc' : '#ffffff'),
                },
                text: {
                    primary: dark ? PALETTE.inkDark : (isAlmaco ? '#001e3d' : PALETTE.ink),
                    secondary: dark ? '#a3c3d8' : (isAlmaco ? '#244b6e' : '#46617c'),
                },
            },
            shape: { borderRadius: 3 },
            typography: {
                fontFamily: '"Google Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
                button: { textTransform: 'none', fontWeight: 700 },
            },
            components: {
                MuiButton: { defaultProps: { disableElevation: true } },
                MuiPaper: { defaultProps: { elevation: 0 } },
            },
        });
    }, [appTheme]);

    const dark = muiTheme.palette.mode === 'dark';

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
                    position: 'relative',
                }}
            >
                <Box sx={{ position: 'fixed', top: { xs: 16, sm: 24 }, left: { xs: 16, sm: 24 }, zIndex: 50 }}>
                    <Button
                        startIcon={<ArrowLeft size={16} />}
                        onClick={() => navigate('/')}
                        sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            px: 1.5,
                            py: 0.75,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                            bgcolor: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            '&:hover': {
                                color: 'primary.main',
                                borderColor: 'primary.main',
                                bgcolor: dark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                            },
                        }}
                    >
                        Voltar para o início
                    </Button>
                </Box>

                <Box sx={{ width: '100%', maxWidth: 400 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <GraduationCap size={26} color={muiTheme.palette.primary.main} />
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                            MyTeacherApp
                        </Typography>
                    </Stack>

                    <Paper variant="outlined" component="div" sx={{ p: { xs: 2.5, sm: 3 } }}>
                        {children}
                    </Paper>

                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 2 }}>
                        <Link component="button" type="button" underline="hover" sx={{ color: 'text.secondary' }} onClick={() => navigate('/')}>
                            Voltar para o início
                        </Link>
                    </Typography>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export const GoogleButton = ({ onClick }: { onClick: () => void }) => {
    const dark = useMuiTheme().palette.mode === 'dark';
    return (
        <Button
            type="button"
            variant="outlined"
            size="large"
            fullWidth
            onClick={onClick}
            sx={{
                borderColor: dark ? 'rgba(255,255,255,0.2)' : '#dadce0',
                color: dark ? '#fff' : '#3c4043',
                bgcolor: dark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 1.2,
                '&:hover': {
                    bgcolor: dark ? 'rgba(255,255,255,0.1)' : '#f8f9fa',
                    borderColor: dark ? 'rgba(255,255,255,0.3)' : '#dadce0',
                },
            }}
        >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l2.85-2.22.83-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar com o Google
        </Button>
    );
};
