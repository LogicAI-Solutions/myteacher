import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../api';

interface Student {
    id: number;
    name: string;
    username: string;
    // Add other fields as needed for the UI
}

interface StudentAuthContextType {
    student: Student | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: ReactNode }) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('student_token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            api.get('/student/me')
                .then(res => setStudent(res.data))
                .catch(() => {
                    localStorage.removeItem('student_token');
                    delete api.defaults.headers.common['Authorization'];
                    setStudent(null);
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const res = await api.post('/student/token', params);
            const token = res.data.access_token;

            localStorage.setItem('student_token', token);
            // We need to ensure subsequent requests use this token. 
            // However, the existing api.ts interceptor uses 'token' (for admins).
            // We might need to adjust api.ts or manually set header here for student requests.
            // For now, let's rely on the interceptor change or a separate axios instance if needed.
            // Wait, the api.ts uses `localStorage.getItem('token')`. 
            // If we use `student_token`, the interceptor won't pick it up automatically unless we change it.

            // Temporary fix: We will modification api.ts to check for student_token if token is missing? 
            // OR we can just use a separate axios instance for students?
            // BETTER: Let's modify api.ts to prefer 'token', but if we are in a student context (URL path?), maybe difficult.

            // ACTUALLY: The best way is to have the interceptor check both, or have the AuthContext set the header.
            // But interceptors run on every request.
            // Let's modify api.ts to check for 'student_token' if 'token' is not present.

            // For this Context, let's just set the localStorage.

            // Fetch user immediately
            // We need to pass the token explicitly for this request since the interceptor might not be ready
            const studentRes = await api.get('/student/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStudent(studentRes.data);
        } catch (err) {
            console.error("Login failed", err);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('student_token');
        setStudent(null);
    };

    return (
        <StudentAuthContext.Provider value={{ student, login, logout, isLoading }}>
            {children}
        </StudentAuthContext.Provider>
    );
};

export const useStudentAuth = () => {
    const context = useContext(StudentAuthContext);
    if (context === undefined) {
        throw new Error('useStudentAuth must be used within a StudentAuthProvider');
    }
    return context;
};
