import { useEffect, useState, useRef } from 'react';
import api from '../api';
import { Loading } from '../components/Loading';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';


interface DashboardStats {
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

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    return (
        <div className="animate-slide-up space-y-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-text-main">
                    Visão Geral
                </h2>
                <p className="text-text-muted mt-2">Acompanhe o desempenho da sua escola em tempo real.</p>
            </div>

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
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(0,0,0,0.1)' }} />
                                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} axisLine={{ stroke: 'rgba(0,0,0,0.1)' }} />
                                <Tooltip
                                    isAnimationActive={false}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', padding: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
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
