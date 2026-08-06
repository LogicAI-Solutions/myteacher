import { useEffect, useState } from 'react';
import { useStudentAuth } from '../context/StudentAuthContext';
import api from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loading } from '../components/Loading';
import { Calendar } from 'lucide-react';

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
                const evolutionRes = await api.get(`/student/evolution`);
                setEvolutionData(evolutionRes.data);

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
                console.error('Error fetching student data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [student]);

    if (loading) return <Loading text="Carregando seus dados..." />;

    const absences = stats.total_classes - Math.round((stats.attendance_rate / 100) * stats.total_classes);

    return (
        <div className="animate-fade-in">
            <header>
                <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
                    Olá, {student?.name.split(' ')[0]}
                </h1>
                <p className="text-text-muted mt-1.5">A sua situação nas aulas até aqui.</p>
            </header>

            {/* O quadro do aluno, dividido por fios. */}
            <section className="mt-7 sheet overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'var(--rule)' }}>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Aulas registradas</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">{stats.total_classes}</p>
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Presença</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">
                            {Math.round(stats.attendance_rate)}%
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                            {absences === 0 ? 'Nenhuma falta' : `${absences} falta${absences === 1 ? '' : 's'}`}
                        </p>
                    </div>
                    <div className="px-4 py-3.5" style={{ background: 'var(--sheet)' }}>
                        <p className="label-print">Média geral</p>
                        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">
                            {stats.avg_grade.toFixed(1)}
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-6 sheet sheet-p">
                <h2 className="text-lg font-semibold text-text-main">Suas notas ao longo do tempo</h2>

                <div className="h-[360px] w-full mt-5">
                    {evolutionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={evolutionData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="var(--color-rule-strong)"
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                                    tickLine={false}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis
                                    stroke="var(--color-rule-strong)"
                                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                                    tickLine={false}
                                    domain={[0, 10]}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'var(--color-rule-strong)' }}
                                    contentStyle={{
                                        backgroundColor: 'var(--color-bg-card)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-main)',
                                        borderRadius: '2px',
                                        fontSize: '0.875rem',
                                    }}
                                    itemStyle={{ color: 'var(--color-text-main)' }}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString('pt-BR')}
                                    formatter={(value: number) => [value, 'Nota']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="grade"
                                    stroke="var(--color-primary)"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: 'var(--color-primary)', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                    name="Nota"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Calendar size={32} className="text-text-muted" aria-hidden="true" />
                            <p className="mt-3 font-semibold text-text-main">Ainda não há notas lançadas</p>
                            <p className="mt-1 text-sm text-text-muted">
                                Assim que o seu professor lançar as primeiras notas, elas aparecem aqui.
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
