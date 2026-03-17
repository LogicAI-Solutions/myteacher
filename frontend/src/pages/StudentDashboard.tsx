import { useEffect, useState } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loading } from '../components/Loading';
import { BookOpen, TrendingUp, Calendar, CheckCircle } from 'lucide-react';

interface EvolutionPoint {
    date: string;
    grade: number | null;
    status: string;
}

interface Stats {
    total_classes: number;
    attendance_rate: number;
    avg_grade: number;
}

export const StudentDashboard = () => {
    const { student } = useStudentAuth();
    const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([]);
    const [stats, setStats] = useState<Stats>({ total_classes: 0, attendance_rate: 0, avg_grade: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!student) return;
            try {
                // Fetch evolution data
                const evolutionRes = await api.get(`/student/evolution`);
                setEvolutionData(evolutionRes.data);

                // Fetch stats (we reuse the report stats endpoint or calculate locally)
                // Since we don't have a direct "my-stats" endpoint yet, let's calculate from evolution data or add an endpoint.
                // The evolution endpoint returns logs.
                const logs: EvolutionPoint[] = evolutionRes.data;
                const total = logs.length;
                const present = logs.filter(l => l.status === 'present').length;
                const grades = logs.filter(l => l.grade !== null).map(l => l.grade as number);
                const avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;

                setStats({
                    total_classes: total,
                    attendance_rate: total > 0 ? (present / total) * 100 : 0,
                    avg_grade: avg
                });
            } catch (err) {
                console.error("Error fetching student data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [student]);

    if (loading) return <Loading text="Carregando seus dados..." />;

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">Olá, {student?.name.split(' ')[0]}! 👋</h1>
                <p className="text-text-muted">Bem-vindo ao seu painel de acompanhamento.</p>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-4 sm:p-6 flex items-center gap-4 border-l-4 border-l-primary">
                    <div className="p-3 bg-primary/20 rounded-xl text-primary">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Aulas Totais</p>
                        <p className="text-2xl font-bold text-text-main">{stats.total_classes}</p>
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-success">
                    <div className="p-3 bg-success/20 rounded-xl text-success">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Presença</p>
                        <p className="text-2xl font-bold text-text-main">{Math.round(stats.attendance_rate)}%</p>
                    </div>
                </div>

                <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-purple-500">
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-text-muted text-sm font-medium uppercase tracking-wider">Média Geral</p>
                        <p className="text-2xl font-bold text-text-main">{stats.avg_grade.toFixed(1)}</p>
                    </div>
                </div>
            </div>

            {/* Evolution Chart */}
            <div className="glass-card p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <TrendingUp className="text-primary" /> Sua Evolução
                    </h2>
                </div>

                <div className="h-[400px] w-full">
                    {evolutionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-text-muted)"
                                    tick={{ fill: 'var(--color-text-muted)' }}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis stroke="var(--color-text-muted)" tick={{ fill: 'var(--color-text-muted)' }} domain={[0, 10]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-main)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                                    itemStyle={{ color: 'var(--color-text-main)' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                    formatter={(value: number) => [value, 'Nota']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="grade"
                                    stroke="var(--color-primary)"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: 'var(--color-primary)' }}
                                    activeDot={{ r: 8 }}
                                    name="Nota"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-text-muted">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <p>Ainda não há dados de evolução registrados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
