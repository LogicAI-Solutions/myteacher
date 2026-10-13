import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../api';
import { apiDetail, apiStatus } from '../utils/apiError';
import { PENDING_INVITE_KEY, PENDING_SCHOOL_KEY, clearPendingInvite } from '../utils/invite';

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
    has_password?: boolean;
    email_verified?: boolean | null;
    account_type?: 'school' | 'autonomous_teacher' | null;
    school_id?: number | null;
    school_role?: 'owner' | 'teacher' | 'secretary' | null;
    school_name?: string | null;
    permissions?: string[];
}

// Permissões efetivas vêm do backend (core/access.py). Conta autônoma recebe todas.
export type Permission = 'attendance.edit' | 'students.manage' | 'classes.manage' | 'finance' | 'reports.view';

const consumePendingInvite = async () => {
    let token: string | null = null;
    try { token = sessionStorage.getItem(PENDING_INVITE_KEY); } catch { return; }
    if (!token) return;
    try {
        await api.post(`/invites/${token}/accept`);
        clearPendingInvite();
    } catch (err) {
        // Mantém o token: a página /convite/:token mostra o motivo (e-mail diferente, limite...)
        console.warn('Convite pendente não aceito', err);
    }
};

const consumePendingSchool = async () => {
    let name: string | null = null;
    try { name = sessionStorage.getItem(PENDING_SCHOOL_KEY); } catch { return; }
    if (!name) return;
    try {
        await api.post('/schools', { name });
    } catch (err) {
        console.warn('Escola pendente não criada', err);
    } finally {
        try { sessionStorage.removeItem(PENDING_SCHOOL_KEY); } catch { /* ok */ }
    }
};

const isAccessBlock = (err: unknown) =>
    apiStatus(err) === 403 && ['TRIAL_EXPIRED', 'SCHOOL_INACTIVE'].includes(apiDetail(err, ''));

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
    isTrialExpired: boolean;
    /** Motivo do bloqueio: teste/assinatura própria vencida ou escola sem assinatura. */
    accessBlock: 'TRIAL_EXPIRED' | 'SCHOOL_INACTIVE' | null;
    can: (perm: Permission) => boolean;
    isSchoolOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [accessBlock, setAccessBlock] = useState<AuthContextType['accessBlock']>(null);
    const isTrialExpired = accessBlock !== null;
    const setIsTrialExpired = (blocked: boolean, err?: unknown) =>
        setAccessBlock(blocked ? (apiDetail(err, '') === 'SCHOOL_INACTIVE' ? 'SCHOOL_INACTIVE' : 'TRIAL_EXPIRED') : null);

    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await consumePendingInvite();
                await consumePendingSchool();
                const res = await api.get('/users/me');
                setUser(res.data);
                if (res.data.trial_expired) {
                    setIsTrialExpired(true);
                } else {
                    setIsTrialExpired(false);
                }
            } catch (err: any) {
                if (isAccessBlock(err)) {
                    setIsTrialExpired(true, err);
                } else {
                    localStorage.removeItem('token');
                }
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        } else {
            setUser(null);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshUser();

        const handleStorageChange = () => {
            refreshUser();
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);

            const res = await api.post('/token', params);
            const token = res.data.access_token;

            localStorage.setItem('token', token);

            // Fetch user immediately
            try {
                await consumePendingInvite();
                const userRes = await api.get('/users/me');
                setUser(userRes.data);
                setIsTrialExpired(false);
            } catch (err: any) {
                // Conta válida mas sem acesso (teste vencido ou assinatura cancelada):
                // MANTÉM o token — o paywall precisa dele para abrir o checkout e reassinar.
                if (isAccessBlock(err)) {
                    setIsTrialExpired(true, err);
                    setUser(null);
                    throw err;
                }
                console.error("Failed to fetch user profile after login", err);
                logout();
                throw err;
            }
        } catch (err: any) {
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

    const can = (perm: Permission) => !!user?.permissions?.includes(perm);
    const isSchoolOwner = user?.school_role === 'owner';

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, refreshUser, isLoading, isTrialExpired, accessBlock, can, isSchoolOwner }}>
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
