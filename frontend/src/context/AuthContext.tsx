import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../api';

interface User {
    id: number;
    email: string;
    is_active: boolean;
    is_admin: boolean;
    is_trial: boolean;
    trial_started_at?: string;
    trial_days_remaining?: number | null;
    trial_expired?: boolean;
    plan_id?: string | null;
    max_classes?: number | null;
    full_name?: string;
    nickname?: string;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (nickname: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    isLoading: boolean;
    isTrialExpired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/users/me')
                .then(res => {
                    setUser(res.data);
                    // Verificar se trial expirou via dados do user
                    if (res.data.trial_expired) {
                        setIsTrialExpired(true);
                    }
                })
                .catch((err) => {
                    // Se backend retornou 403 TRIAL_EXPIRED
                    if (err.response?.status === 403 && err.response?.data?.detail === 'TRIAL_EXPIRED') {
                        setIsTrialExpired(true);
                    } else {
                        localStorage.removeItem('token');
                    }
                    setUser(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (nickname: string, password: string) => {
        try {
            const params = new URLSearchParams();
            params.append('username', nickname);
            params.append('password', password);

            const res = await api.post('/token', params);
            const token = res.data.access_token;

            localStorage.setItem('token', token);

            // Fetch user immediately
            try {
                const userRes = await api.get('/users/me');
                setUser(userRes.data);
                setIsTrialExpired(false);
            } catch (err) {
                console.error("Failed to fetch user profile after login", err);
                logout();
                throw err;
            }
        } catch (err: any) {
            // Verificar se é erro de trial expirado
            if (err.response?.status === 403 && err.response?.data?.detail === 'TRIAL_EXPIRED') {
                setIsTrialExpired(true);
                setUser(null);
            }
            console.error("Login failed", err);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsTrialExpired(false);
    };

    const updateUser = (userData: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...userData } : null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, isTrialExpired }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
