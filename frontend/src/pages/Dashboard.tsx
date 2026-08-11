import { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Loading } from '../components/Loading';
import { AlertCircle, GraduationCap, ClipboardList, ArrowRight, X, HelpCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Toast, type ToastType } from '../components/Toast';

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
        // Atenção: current_month/current_year são o número do mês e o ano, não
        // valores. paid/pending/total_expected são CONTAGENS de mensalidades,
        // não dinheiro. Ver backend/crud/dashboard.py.
        current_month: number;
        current_year: number;
        paid: number;
        total_expected: number;
        pending: number;
    };
}

const MONTHS = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Uma barra que é uma linha: cheia na cor de sucesso significa mês fechado. O que falta é
// o que escreve no traço, e é isso que o professor está procurando.
const ClosingBar = ({ paid, pending }: { paid: number; pending: number }) => {
    const total = paid + pending;
    if (total === 0) {
        return <div className="h-2.5 w-full rounded-[2px]" style={{ background: 'var(--desk-sunk)' }} />;
    }
    const paidPct = (paid / total) * 100;
    return (
        <div
            className="flex h-2.5 w-full overflow-hidden rounded-[2px]"
            style={{ background: 'var(--desk-sunk)' }}
            role="img"
            aria-label={`${paid} de ${total} mensalidades quitadas`}
        >
            {paid > 0 && <div style={{ width: `${paidPct}%`, background: 'var(--color-success)' }} />}
            {pending > 0 && <div style={{ width: `${100 - paidPct}%`, background: 'var(--ochre)' }} />}
        </div>
    );
};

const Figure = ({ label, value, note }: { label: string; value: number; note?: string }) => (
    <div className="px-4 py-3.5 sm:px-5" style={{ background: 'var(--sheet)' }}>
        <p className="label-print">{label}</p>
        <p className="mt-1.5 text-2xl font-bold text-text-main tabular">{value}</p>
        {note && <p className="mt-0.5 text-xs text-text-muted">{note}</p>}
    </div>
);

export const Dashboard = () => {
    const { user } = useAuth();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hideTutorial, setHideTutorial] = useState(() => localStorage.getItem('hideTutorial') === 'true');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Retorno do checkout do Stripe: confirma a ativação e limpa o param da URL.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('assinatura') === 'ok') {
            setToast({ message: 'Assinatura ativada! Bem-vindo(a) de volta.', type: 'success' });
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleDismissTutorial = () => {
        localStorage.setItem('hideTutorial', 'true');
        setHideTutorial(true);
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (err: any) {
                console.error('Error fetching dashboard stats:', err);
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
                <Loading text="Carregando painel..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center gap-3 text-center">
                <AlertCircle size={40} className="text-danger" />
                <p className="text-xl font-semibold text-text-main">Não foi possível carregar o painel</p>
                <p className="text-text-muted max-w-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="btn btn-primary mt-2">
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (!stats) return null;

    const isFirstTime = !hideTutorial;
    const firstName = user?.full_name?.split(' ')[0] || 'Professor(a)';
    const monthName = MONTHS[stats.payments.current_month - 1] ?? '';
    const { paid, pending, total_expected } = stats.payments;
    const settled = total_expected > 0 && pending === 0;

    return (
        <div className="animate-slide-up">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-text-main">Olá, {firstName}</h1>
                    <p className="text-text-muted mt-1.5">
                        Situação de {monthName} de {stats.payments.current_year}.
                    </p>
                </div>
                {hideTutorial && (
                    <button
                        onClick={() => {
                            localStorage.setItem('hideTutorial', 'false');
                            setHideTutorial(false);
                        }}
                        className="btn btn-outline shrink-0"
                    >
                        <HelpCircle size={17} className="text-primary" />
                        <span>Mostrar o passo a passo</span>
                    </button>
                )}
            </header>

            {isFirstTime && (
                <section className="sheet sheet-p mt-8 relative">
                    <button
                        onClick={handleDismissTutorial}
                        className="absolute top-3 right-3 p-2 text-text-muted hover:text-text-main hover:bg-[var(--wash-2)] rounded-[2px] transition-colors duration-150"
                        aria-label="Ocultar o passo a passo"
                    >
                        <X size={18} />
                    </button>
                    <h2 className="text-lg font-semibold text-text-main pr-10">Comece por aqui</h2>
                    <p className="text-text-muted mt-1 text-sm">Três passos para o primeiro mês ficar completo.</p>

                    <ol className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'var(--rule)' }}>
                        {[
                            { n: 1, to: '/dashboard/classes', icon: GraduationCap, title: 'Criar uma turma', note: 'Defina a disciplina e o valor da mensalidade.' },
                            { n: 2, to: '/dashboard/students', icon: Users, title: 'Cadastrar alunos', note: 'Matricule cada aluno na turma dele.' },
                            { n: 3, to: '/dashboard/classes', icon: ClipboardList, title: 'Fazer a chamada', note: 'Abra a turma e marque as presenças do dia.' },
                        ].map(({ n, to, icon: Icon, title, note }) => (
                            <li key={n} style={{ background: 'var(--sheet)' }}>
                                <Link
                                    to={to}
                                    className="flex h-full items-start gap-3 p-4 no-underline transition-colors duration-150 group"
                                >
                                    <Icon size={19} className="mt-0.5 shrink-0 text-primary" />
                                    <span className="min-w-0 flex-1">
                                        <span className="label-print">Passo {n}</span>
                                        <span className="mt-1 block text-sm font-semibold text-text-main group-hover:text-primary transition-colors">
                                            {title}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-text-muted leading-snug">{note}</span>
                                    </span>
                                    <ArrowRight size={15} className="mt-0.5 shrink-0 text-text-muted group-hover:text-primary transition-colors" />
                                </Link>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {/* O fechamento do mês: a pergunta que o professor abre o sistema
                para responder, respondida antes de qualquer clique. */}
            <section className="sheet sheet-p mt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="text-lg font-semibold text-text-main">Fechamento de {monthName}</h2>
                    <Link to="/dashboard/payments" className="text-sm font-semibold text-primary no-underline hover:underline">
                        Abrir o financeiro
                    </Link>
                </div>

                {total_expected === 0 ? (
                    <p className="mt-4 text-text-muted">
                        Nenhuma mensalidade lançada para {monthName} ainda.
                    </p>
                ) : (
                    <>
                        <p className="mt-3 text-text-main">
                            <span className="text-3xl font-bold tabular">{paid}</span>
                            <span className="text-text-muted"> de </span>
                            <span className="text-3xl font-bold tabular">{total_expected}</span>
                            <span className="text-text-muted"> mensalidades quitadas</span>
                        </p>

                        <div className="mt-4">
                            <ClosingBar paid={paid} pending={pending} />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="stamp stamp-paid">{paid} pago{paid === 1 ? '' : 's'}</span>
                            {pending > 0 && <span className="stamp stamp-pending">{pending} a receber</span>}
                            {settled && <span className="text-sm text-text-muted">Mês fechado. Nada pendente.</span>}
                        </div>
                    </>
                )}
            </section>

            {/* Os números do registro num quadro dividido por fios, não em
                quatro cartões flutuando. */}
            <section className="mt-6">
                <h2 className="label-print mb-2">Quadro geral</h2>
                <div className="sheet overflow-hidden">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'var(--rule)' }}>
                        <Figure
                            label="Alunos ativos"
                            value={stats.students.active}
                            note={stats.students.inactive > 0
                                ? `${stats.students.inactive} inativo${stats.students.inactive === 1 ? '' : 's'}`
                                : 'Nenhum inativo'}
                        />
                        <Figure label="Turmas" value={stats.overview.classes_count} />
                        <Figure label="Chamadas feitas" value={stats.overview.sessions_count} note="Desde o início" />
                        <Figure label="Cadastro total" value={stats.students.total} note="Ativos e inativos" />
                    </div>
                </div>
            </section>
        </div>
    );
};
