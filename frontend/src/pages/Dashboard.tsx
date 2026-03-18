import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, TrendingUp, AlertCircle, GraduationCap, ClipboardList, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';


interface DashboardStats {
    overview: {
        classes_count: number;
        sessions_count: number;
    };
    students: {
        active: number;
        inactive: number;
        total: number;
    };
    payments: {
        current_month: number;
        current_year: number;
        paid: number;
        total_expected: number;
        pending: number;
    };
}

const COLORS = ['var(--color-primary)', 'var(--color-text-muted)'];


export const Dashboard = () => {
    const { user } = useAuth();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideTutorial, setHideTutorial] = useState(() => localStorage.getItem('hideTutorial') === 'true');

    const handleDismissTutorial = () => {
        localStorage.setItem('hideTutorial', 'true');
        setHideTutorial(true);
    };

    const containerRef = useRef<HTMLDivElement>(null);

    // Measure container width for responsive charts
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth - 48; // minus padding
                Math.max(300, width);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
                
                // Automatically hide tutorial if the user has already completed the steps
                if (res.data?.overview?.sessions_count > 0 && !hideTutorial) {
                    localStorage.setItem('hideTutorial', 'true');
                    setHideTutorial(true);
                }
            } catch (err: any) {
                console.error("Error fetching dashboard stats:", err);
                setError(err.message || 'Erro ao carregar dados');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="h-[50vh] flex items-center justify-center">
                <Loading text="Carregando dashboard..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center text-danger gap-4">
                <AlertCircle size={48} />
                <p className="text-xl">Erro ao carregar dashboard</p>
                <p className="text-text-muted">{error}</p>
                <button onClick={() => window.location.reload()} className="glass-button px-4 py-2 text-white">Tentar Novamente</button>
            </div>
        );
    }

    // Fallback seguro se stats for null por algum motivo estranho, mas sem erro
    if (!stats) return null;

    // Data handling for charts
    const studentData = [
        { name: 'Ativos', value: stats.students.active },
        { name: 'Inativos', value: stats.students.inactive },
    ];

    const paymentData = [
        { name: 'Pagos', value: stats.payments.paid, fill: 'var(--color-success)' },
        { name: 'Pendentes', value: stats.payments.pending, fill: 'var(--color-warning)' },
    ];

    const isFirstTime = !hideTutorial;
    const firstName = user?.full_name?.split(' ')[0] || 'Professor(a)';

    return (
        <div className="animate-slide-up space-y-8">
            <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-text-main">
                    Olá, {firstName}! 👋
                </h2>
                <p className="text-text-muted mt-2">Acompanhe o desempenho da sua escola em tempo real.</p>
            </div>

            {isFirstTime && (
                <div className="glass-card p-6 sm:p-8 border-l-4 border-l-primary relative overflow-hidden">
                    <button 
                        onClick={handleDismissTutorial}
                        className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main hover:bg-black/5 rounded-xl transition-all z-10"
                        title="Ocultar passo a passo"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <h3 className="text-xl font-bold text-text-main mb-2">Bem-vindo ao MyTeacherApp! 🎉</h3>
                    <p className="text-text-muted mb-6">Aqui está o passo a passo sugerido para configurar a sua escola:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Link to="/dashboard/classes" className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group no-underline">
                            <div className="p-2 flex-shrink-0 rounded-lg bg-primary/20 text-primary">
                                <GraduationCap size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-primary font-bold">Passo 1</p>
                                <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">Criar Turma</p>
                                <p className="text-[10px] text-text-muted/80 leading-tight mt-0.5">Defina disciplina e valor</p>
                            </div>
                            <ArrowRight size={16} className="flex-shrink-0 ml-1 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                        <Link to="/dashboard/students" className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-border hover:bg-primary/10 transition-all group no-underline">
                            <div className="p-2 flex-shrink-0 rounded-lg bg-primary/10 text-primary/70">
                                <Users size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-primary/80 font-bold">Passo 2</p>
                                <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">Adicionar Alunos</p>
                                <p className="text-[10px] text-text-muted/80 leading-tight mt-0.5">Cadastre na plataforma</p>
                            </div>
                            <ArrowRight size={16} className="flex-shrink-0 ml-1 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                        <Link to="/dashboard/classes" className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-border hover:bg-primary/10 transition-all group no-underline" title="Vá em Turmas, abra a turma criada e faça a chamada!">
                            <div className="p-2 flex-shrink-0 rounded-lg bg-primary/10 text-primary/70">
                                <ClipboardList size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-primary/80 font-bold">Passo 3</p>
                                <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors truncate">Fazer Chamada</p>
                                <p className="text-[10px] text-text-muted/80 leading-tight mt-0.5">Abra a turma e preencha a lista</p>
                            </div>
                            <ArrowRight size={16} className="flex-shrink-0 ml-1 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                    </div>
                </div>
            )}

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-primary">
                    <div className="p-3 rounded-full bg-primary/20 text-primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm">Total de Alunos</p>
                        <h3 className="text-2xl font-bold text-text-main">{stats.students.total}</h3>
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-success">
                    <div className="p-3 rounded-full bg-success/20 text-success">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm">Alunos Ativos</p>
                        <h3 className="text-2xl font-bold text-text-main">{stats.students.active}</h3>
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-success">
                    <div className="p-3 rounded-full bg-success/20 text-success">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm">Pagamentos (Mês)</p>
                        <h3 className="text-2xl font-bold text-text-main">{stats.payments.paid}</h3>
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-warning">
                    <div className="p-3 rounded-full bg-warning/20 text-warning">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm">Pendentes (Mês)</p>
                        <h3 className="text-2xl font-bold text-text-main">{stats.payments.pending}</h3>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8" ref={containerRef}>
                {/* Students Chart */}
                <div className="glass-card p-6 min-h-[350px] sm:min-h-[400px] flex flex-col items-center w-full">
                    <h3 className="text-xl font-bold text-text-main mb-6 pl-2 border-l-4 border-primary w-full">Alunos: Ativos vs Inativos</h3>
                    <div className="flex-1 w-full h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={studentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {studentData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.1)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    isAnimationActive={false}
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
                                                    <p className="text-text-main" style={{ margin: 0 }}>
                                                        Quantidade: <span style={{ fontWeight: 'bold' }}>{payload[0].value}</span>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payments Chart */}
                <div className="glass-card p-6 min-h-[350px] sm:min-h-[400px] flex flex-col items-center w-full">
                    <h3 className="text-xl font-bold text-text-main mb-6 pl-2 border-l-4 border-success w-full">Pagamentos do Mês Atual</h3>
                    <div className="flex-1 w-full h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={paymentData}
                                margin={{
                                    top: 20,
                                    right: 10,
                                    left: 0,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)' }} axisLine={{ stroke: 'var(--color-border)' }} />
                                <YAxis stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)' }} axisLine={{ stroke: 'var(--color-border)' }} />
                                <Tooltip
                                    isAnimationActive={false}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
                                                    <p className="text-text-main" style={{ margin: 0 }}>
                                                        Quantidade: <span style={{ fontWeight: 'bold' }}>{payload[0].value}</span>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]} animationBegin={0} animationDuration={800}>
                                    {paymentData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
