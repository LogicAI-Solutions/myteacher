import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, ArrowRight, BarChart3, Users,
    DollarSign, CalendarCheck, MessageCircle, Shield, LogIn, Check, X
} from 'lucide-react';
import { openSupportWhatsApp } from '../utils/support';
import { RegisterStrip, type RegisterStripMonth } from '../components/RegisterStrip';
import api from '../api';

export interface Plan {
    id: number;
    name: string;
    description: string;
    price: string;
    period: string;
    features: { text: string; included: boolean }[];
    button_text: string;
    popular: boolean;
    role?: string;
}

// Só aparece se a API de planos cair. Precisa espelhar os planos reais de
// backend/core/init_db.py — anunciar preço que não existe é pior que não anunciar.
const defaultPlans: Plan[] = [
    {
        id: 1,
        name: 'Essencial',
        description: 'Para quem está começando e gerencia poucas turmas.',
        price: 'R$ 47,90',
        period: '/mês',
        popular: false,
        button_text: 'Começar 14 dias grátis',
        features: [
            { text: 'Até 5 turmas', included: true },
            { text: 'Alunos ilimitados', included: true },
            { text: 'Gestão financeira completa', included: true },
            { text: 'Controle de presenças e notas', included: true },
            { text: 'Dashboard do aluno', included: true },
            { text: 'Turmas ilimitadas', included: false }
        ]
    },
    {
        id: 2,
        name: 'Profissional',
        description: 'Para professores com agenda cheia, sem limite de turmas.',
        price: 'R$ 97,90',
        period: '/mês',
        popular: true,
        button_text: 'Começar 14 dias grátis',
        features: [
            { text: 'Turmas ilimitadas', included: true },
            { text: 'Alunos ilimitados', included: true },
            { text: 'Gestão financeira completa', included: true },
            { text: 'Controle de presenças e notas', included: true },
            { text: 'Dashboard do aluno', included: true },
            { text: 'Suporte prioritário', included: true }
        ]
    },
    {
        id: 3,
        name: 'Enterprise / Redes',
        description: 'Solução sob medida para grandes redes de ensino.',
        price: 'Sob Consulta',
        period: '',
        popular: false,
        button_text: 'Falar com Consultor',
        features: [
            { text: 'Tudo do plano Pro', included: true },
            { text: 'Domínio Personalizado & Whitelabel', included: true },
            { text: 'API de Integração Dedicada', included: true },
            { text: 'Treinamento de Equipe', included: true },
            { text: 'SLA de Atendimento Garantido', included: true },
            { text: 'Gerente de Conta Dedicado', included: true }
        ]
    }
];

// Exemplo autoral: a folha que o professor vê depois de um bimestre de uso.
// Nomes e situações são ilustrativos, não dados de cliente.
const SAMPLE_ROWS: { name: string; attendance: boolean[]; months: RegisterStripMonth[] }[] = [
    {
        name: 'Marina Albuquerque',
        attendance: [true, true, true, true, true, true, true, true, true, true, true, true],
        months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'paid' }, { label: 'Mai', status: 'paid' }],
    },
    {
        name: 'Joaquim Ferreira',
        attendance: [true, true, false, true, true, true, false, true, true, true, true, true],
        months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'paid' }, { label: 'Mai', status: 'pending' }],
    },
    {
        name: 'Rita Nascimento',
        attendance: [true, false, false, true, false, false, true, false, false, true, false, false],
        months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'late' }, { label: 'Mai', status: 'late' }],
    },
];

export const Landing = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await api.get('/plans/');
                if (Array.isArray(response.data) && response.data.length > 0) {
                    setPlans(response.data);
                } else {
                    setPlans(defaultPlans);
                }
            } catch (error) {
                console.error('Erro ao carregar planos:', error);
                setPlans(defaultPlans);
            } finally {
                setLoadingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const handleWhatsAppClick = (customMsg?: string) => {
        openSupportWhatsApp(customMsg || 'Olá! Vim pelo site do MyTeacherApp e gostaria de saber mais sobre os planos.');
    };

    const scrollToPlans = () => {
        document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-bg-dark text-text-main font-sans">
            <nav className="fixed top-0 w-full z-50 sheet-header px-4 py-3 sm:px-6">
                <div className="container mx-auto flex justify-between items-center max-w-6xl">
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer bg-transparent border-none text-text-main p-0"
                    >
                        <GraduationCap className="text-primary" size={24} />
                        <span>MyTeacherApp</span>
                    </button>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => navigate('/login')} className="btn btn-ghost" title="Acessar o sistema">
                            <LogIn size={16} />
                            <span>Entrar</span>
                        </button>
                        <button onClick={() => handleWhatsAppClick()} className="btn btn-primary">
                            <MessageCircle size={16} />
                            <span className="hidden sm:inline">Falar com a gente</span>
                            <span className="sm:hidden">Contato</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Primeira dobra: a tese. O produto é o registro, e o registro
                responde as duas perguntas de uma vez. */}
            <header className="pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6">
                <div className="container mx-auto grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center max-w-6xl">
                    <div className="animate-slide-up">
                        <p className="label-print">Para o professor que dá aula por conta própria</p>

                        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight">
                            Quem faltou e quem pagou, na mesma linha.
                        </h1>

                        <p className="mt-5 text-base sm:text-lg text-text-muted leading-relaxed max-w-[46ch]">
                            O MyTeacherApp junta a chamada e a mensalidade no mesmo registro do aluno.
                            Você para de conferir caderno contra planilha para saber como o mês fechou.
                        </p>

                        <div className="mt-7 flex flex-col sm:flex-row gap-3">
                            <button onClick={scrollToPlans} className="btn btn-primary text-base px-5 py-2.5 group">
                                Ver os planos
                                <ArrowRight className="group-hover:translate-x-0.5 transition-transform w-4 h-4" />
                            </button>
                            <button onClick={() => navigate('/login')} className="btn btn-outline text-base px-5 py-2.5">
                                Já sou cliente
                            </button>
                        </div>

                        <p className="mt-4 text-sm text-text-muted">14 dias grátis. Sem cartão para começar.</p>
                    </div>

                    {/* A prova: a folha de verdade, com a gramática de verdade. */}
                    <div className="animate-fade-in">
                        <div className="sheet overflow-hidden">
                            <div className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-3 rule-b" style={{ background: 'var(--desk)' }}>
                                <span className="label-print">Turma de Inglês B2 — 1º bimestre</span>
                                <span className="label-print">Exemplo</span>
                            </div>

                            <ul className="px-4 sm:px-5">
                                {SAMPLE_ROWS.map((row, i) => (
                                    <li key={row.name} className={`py-3.5 ${i > 0 ? 'rule-t' : ''}`}>
                                        <p className="text-sm font-semibold text-text-main">{row.name}</p>
                                        <div className="mt-1.5">
                                            <RegisterStrip attendance={row.attendance} months={row.months} />
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="px-4 sm:px-5 py-3 rule-t text-xs text-text-muted leading-relaxed" style={{ background: 'var(--desk)' }}>
                                A linha reta é aula sem falta. Cada traço é uma ausência.
                                O carimbo embaixo é a mensalidade do mês.
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <section className="py-16 lg:py-20 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}>
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-2xl sm:text-3xl font-bold">O que entra no registro</h2>
                    <p className="mt-2 text-text-muted max-w-[60ch]">
                        Tudo que hoje está espalhado entre o caderno, a planilha e o grupo do WhatsApp.
                    </p>

                    <div className="mt-8 sheet overflow-hidden">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: 'var(--rule)' }}>
                            <FeatureCell
                                icon={<CalendarCheck />}
                                title="Chamada"
                                description="Marque presença turma por turma e veja o histórico de faltas de cada aluno sem abrir outra tela."
                            />
                            <FeatureCell
                                icon={<DollarSign />}
                                title="Mensalidades"
                                description="Registre o que entrou, veja o que falta entrar e saiba de quem, antes do mês virar."
                            />
                            <FeatureCell
                                icon={<Users />}
                                title="Cadastro de alunos"
                                description="Dados do aluno e do responsável, matrícula por turma e situação ativa ou inativa."
                            />
                            <FeatureCell
                                icon={<GraduationCap />}
                                title="Turmas"
                                description="Disciplina, valor da mensalidade e a lista de quem está matriculado em cada uma."
                            />
                            <FeatureCell
                                icon={<BarChart3 />}
                                title="Fechamento do mês"
                                description="Quantas mensalidades foram quitadas e quantas ainda faltam, na abertura do painel."
                            />
                            <FeatureCell
                                icon={<Shield />}
                                title="Portal do aluno"
                                description="Cada aluno acessa e vê apenas a própria situação, com login separado do seu."
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section id="planos" className="py-16 lg:py-24 px-4 sm:px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="max-w-[52ch] mx-auto text-center">
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Planos</h2>
                        <p className="mt-2 text-text-muted text-base sm:text-lg">
                            Quatorze dias grátis em qualquer plano pago. Cancele quando quiser.
                        </p>
                    </div>

                    {/* Flex centralizado em vez de grid: com dois planos a grade de 3
                        colunas deixava um vão à direita e jogava tudo para a esquerda. */}
                    {loadingPlans ? (
                        <div className="flex justify-center items-center py-16">
                            <div
                                className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
                                role="status"
                                aria-label="Carregando planos"
                            />
                        </div>
                    ) : (
                        <div className="mt-10 flex flex-wrap justify-center gap-5 items-stretch">
                            {plans.map(plan => (
                                <div key={plan.id} className={`sheet flex flex-col p-6 w-full max-w-[22rem] ${plan.popular ? 'border-primary' : ''}`}>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h3 className="text-lg font-bold text-text-main">{plan.name}</h3>
                                        {plan.popular && <span className="stamp stamp-paid">Mais escolhido</span>}
                                    </div>

                                    <p className="mt-2 text-sm text-text-muted min-h-[2.75rem]">{plan.description}</p>

                                    <p className="mt-5 pb-5 rule-b flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-text-main tracking-tight tabular">{plan.price}</span>
                                        {plan.period && <span className="text-sm text-text-muted">{plan.period}</span>}
                                    </p>

                                    <ul className="mt-5 space-y-2.5 text-sm flex-1">
                                        {plan.features?.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2.5">
                                                {feature.included ? (
                                                    <Check size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                                                ) : (
                                                    <X size={15} className="mt-0.5 shrink-0 text-text-muted opacity-50" aria-hidden="true" />
                                                )}
                                                <span className={feature.included ? 'text-text-main' : 'text-text-muted line-through'}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => {
                                            if (plan.price.includes('Sob Consulta')) {
                                                handleWhatsAppClick(`Olá! Gostaria de uma cotação para o plano ${plan.name}`);
                                            } else {
                                                navigate('/register', { state: { planId: plan.id, planName: plan.name } });
                                            }
                                        }}
                                        className={`btn w-full mt-6 py-2.5 ${plan.popular ? 'btn-primary' : 'btn-outline'}`}
                                    >
                                        <span>{plan.button_text || 'Assinar plano'}</span>
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="py-16 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}>
                <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="max-w-[46ch]">
                        <h2 className="text-xl sm:text-2xl font-bold">Quer ver funcionando antes de assinar?</h2>
                        <p className="mt-2 text-text-muted">
                            Falamos com você pelo WhatsApp e mostramos o sistema com a sua própria turma.
                        </p>
                    </div>
                    <button onClick={() => handleWhatsAppClick()} className="btn btn-primary text-base px-5 py-2.5 shrink-0 self-start sm:self-auto">
                        <MessageCircle size={18} />
                        Falar com a gente
                    </button>
                </div>
            </section>

            <footer className="py-8 px-4 sm:px-6 rule-t">
                <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted">
                    <div className="flex items-center gap-2 font-bold text-text-main">
                        <GraduationCap className="text-primary" size={18} />
                        MyTeacherApp
                    </div>
                    <div className="flex gap-5">
                        <button
                            onClick={() => handleWhatsAppClick()}
                            className="bg-transparent border-none p-0 text-text-muted hover:text-primary cursor-pointer transition-colors"
                        >
                            Fale conosco
                        </button>
                        <a href="#" className="text-text-muted hover:text-primary transition-colors no-underline">Termos</a>
                        <a href="#" className="text-text-muted hover:text-primary transition-colors no-underline">Privacidade</a>
                    </div>
                    <p>&copy; {new Date().getFullYear()} LogicIA Solutions</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCell = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="p-5 sm:p-6" style={{ background: 'var(--sheet)' }}>
        <div className="text-primary">
            {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        </div>
        <h3 className="mt-3 text-base font-semibold text-text-main">{title}</h3>
        <p className="mt-1.5 text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
);
