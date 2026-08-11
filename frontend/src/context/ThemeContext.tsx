import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'registro' | 'almaco' | 'ardosia';

export const THEMES: { id: Theme; name: string; description: string }[] = [
    { id: 'registro', name: 'Registro', description: 'Papel bond. O padrão, para trabalhar de dia.' },
    { id: 'almaco', name: 'Almaço', description: 'Papel azulado, com mais contraste entre folha e mesa.' },
    { id: 'ardosia', name: 'Ardósia', description: 'A lousa. Para ambiente escuro.' },
];

const THEME_CLASSES = ['theme-registro', 'theme-almaco', 'theme-ardosia'];

// Os temas antigos (sereno / acolhedor / dark) foram substituídos junto com a
// identidade. Quem já tinha uma escolha salva não pode cair num tema inexistente
// e ficar com o app sem cor nenhuma.
const LEGACY: Record<string, Theme> = {
    sereno: 'registro',
    acolhedor: 'almaco',
    dark: 'ardosia',
};

const isTheme = (value: string): value is Theme =>
    value === 'registro' || value === 'almaco' || value === 'ardosia';

const readStoredTheme = (): Theme => {
    const saved = localStorage.getItem('app-theme');
    if (!saved) return 'registro';
    if (isTheme(saved)) return saved;
    return LEGACY[saved] ?? 'registro';
};

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('app-theme', newTheme);
    };

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(...THEME_CLASSES);
        root.classList.add(`theme-${theme}`);
        // Reescreve o valor migrado para que a próxima carga não passe pelo mapa.
        localStorage.setItem('app-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
