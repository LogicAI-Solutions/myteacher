import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    GraduationCap, ArrowRight, CheckCircle, BarChart3, Users, 
    DollarSign, CalendarCheck, MessageCircle, Shield, LogIn, Check, X, Sparkles 
} from 'lucide-react';
import teacherIllustration from '../assets/teacher_login_illustration.png';
import { openSupportWhatsApp } from '../utils/support';
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

const defaultPlans: Plan[] = [
    {
        id: 1,
        name: 'Professor Autônomo',
        description: 'Ideal para professores particulares ou com poucas turmas.',
        price: 'R$ 49',
        period: '/mês',
        popular: false,
        button_text: 'Começar Agora',
        features: [
            { text: 'Até 5 Turmas Ativas', included: true },
            { text: 'Controle de Frequência & Faltas', included: true },
            { text: 'Relatórios em PDF/Excel', included: true },
            { text: 'Controle Financeiro Simples', included: true },
            { text: 'Suporte via WhatsApp', included: true },
            { text: 'Múltiplos Professores', included: false }
        ]
    },
    {
        id: 2,
        name: 'Escola / Curso Pro',
        description: 'Para escolas de cursos livres, idiomas e reforço escolar.',
        price: 'R$ 129',
        period: '/mês',
        popular: true,
        button_text: 'Testar 7 Dias Grátis',
        features: [
            { text: 'Turmas Ilimitadas', included: true },
            { text: 'Gestão Completa de Alunos', included: true },
            { text: 'Gestão Financeira & Mensalidades', included: true },
            { text: 'Dashboard & Métricas Avançadas', included: true },
            { text: 'Múltiplos Perfis de Acesso', included: true },
            { text: 'Suporte Prioritário VIP', included: true }
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
                console.error("Erro ao carregar planos:", error);
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
        <div className="min-h-screen bg-bg-dark text-text-main overflow-x-hidden font-sans selection:bg-primary/30">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 glass-header px-4 py-3 sm:px-6 sm:py-4 transition-all duration-300">
                <div className="container mx-auto flex justify-between items-center max-w-6xl">
                    {/* Top Left: Logo */}
                    <div className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <GraduationCap className="text-primary" size={26} />
                        <span className="text-gradient">MyTeacherApp</span>
                    </div>

                    {/* Top Right: Entrar + Fale Conosco */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="btn btn-outline text-xs sm:text-sm px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-white/10 hover:border-primary/50 hover:bg-white/10 text-white transition-all shadow-sm cursor-pointer"
                            title="Acessar o sistema"
                        >
                            <LogIn size={16} className="text-primary" />
                            <span>Entrar</span>
                        </button>

                        <button
                            onClick={() => handleWhatsAppClick()}
                            className="btn btn-primary text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:scale-105 cursor-pointer"
                        >
                            <MessageCircle size={18} />
                            <span className="hidden sm:inline">Fale Conosco</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-24 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6 overflow-hidden">
                {/* Background Orbs */}
                <div className="orb orb-primary w-64 h-64 top-20 -left-20 animate-float opacity-50"></div>
                <div className="orb orb-purple w-96 h-96 bottom-0 -right-40 animate-pulse-soft opacity-40" style={{ animationDelay: '1s' }}></div>

                <div className="container mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10 max-w-6xl">
                    <div className="space-y-6 animate-slide-up text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary-light backdrop-blur-sm mx-auto lg:mx-0 hover:bg-white/10 transition-colors">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                            Sistema de Gestão Escolar Completo
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                            Organize sua Escola com <br /><span className="text-gradient">Eficiência Total</span>
                        </h1>

                        <p className="text-base sm:text-lg text-text-muted leading-relaxed max-w-lg mx-auto lg:mx-0">
                            Controle de frequência, gestão financeira e acompanhamento de alunos em uma única plataforma. Simples, rápido e seguro.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center lg:justify-start">
                            <button
                                onClick={scrollToPlans}
                                className="btn btn-primary-gradient text-base px-6 py-3 rounded-xl group shadow-lg shadow-primary/25 hover:shadow-primary/40 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all cursor-pointer"
                            >
                                Conhecer os Planos
                                <ArrowRight className="group-hover:translate-x-1 transition-transform w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="btn btn-outline text-base px-6 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Área do Cliente
                            </button>
                        </div>
                        <p className="text-xs text-text-muted/60 text-center lg:text-left">
                            * Teste 7 dias grátis sem compromisso.
                        </p>

                        <div className="flex flex-wrap justify-center lg:justify-start gap-4 sm:gap-6 pt-4 text-text-muted text-xs sm:text-sm font-medium opacity-80">
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <CheckCircle size={16} className="text-primary" /> Multi-plataforma
                            </div>
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <DollarSign size={16} className="text-primary" /> Controle Financeiro
                            </div>
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <Shield size={16} className="text-primary" /> Dados Seguros
                            </div>
                        </div>
                    </div>

                    <div className="relative animate-fade-in mt-8 lg:mt-0">
                        <div className="glass-card p-4 rounded-2xl relative z-10 border-white/10 hover:scale-[1.01] transition-transform duration-500 shadow-2xl shadow-black/50">
                            <div className="relative rounded-xl overflow-hidden shadow-inner bg-bg-card">
                                <img
                                    src={teacherIllustration}
                                    alt="Dashboard Preview"
                                    className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-bg-dark/90 via-transparent to-transparent pointer-events-none"></div>

                                {/* Floating Stats */}
                                <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                                    <div className="glass p-3 rounded-lg flex-1 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="bg-primary/20 p-2 rounded-md text-primary-light">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Alunos Ativos</p>
                                            <p className="text-lg font-bold text-white">1,240</p>
                                        </div>
                                    </div>
                                    <div className="glass p-3 rounded-lg flex-1 flex items-center gap-3 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="bg-success/20 p-2 rounded-md text-success">
                                            <BarChart3 size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Frequência</p>
                                            <p className="text-lg font-bold text-white">98%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Key Features Section */}
            <section className="py-16 bg-bg-darker border-y border-white/5 relative">
                <div className="container mx-auto px-4 max-w-6xl relative z-10">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
                            <BarChart3 size={14} />
                            Funcionalidades Completas
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Tudo para sua Gestão</h2>
                        <p className="text-text-muted max-w-2xl mx-auto text-sm sm:text-base">
                            Ferramentas essenciais para simplificar o dia a dia da secretaria e dos professores.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <FeatureCard
                            icon={<CalendarCheck />}
                            title="Controle de Frequência"
                            description="Registro de chamadas rápido e fácil, com relatórios detalhados de presença e faltas por aluno e turma."
                        />
                        <FeatureCard
                            icon={<DollarSign />}
                            title="Gestão Financeira"
                            description="Acompanhe pagamentos de mensalidades, gere boletos e visualize o fluxo de caixa em tempo real."
                        />
                        <FeatureCard
                            icon={<Users />}
                            title="Gestão de Alunos"
                            description="Cadastro completo de alunos e responsáveis, histórico escolar e documentos em um só lugar."
                        />
                        <FeatureCard
                            icon={<GraduationCap />}
                            title="Turmas e Grades"
                            description="Organização de grades horárias, disciplinas e distribuição de professores por turma."
                        />
                        <FeatureCard
                            icon={<BarChart3 />}
                            title="Relatórios Gerenciais"
                            description="Dashboards interativos com métricas de desempenho acadêmico e saúde financeira."
                        />
                        <FeatureCard
                            icon={<Shield />}
                            title="Acesso Seguro"
                            description="Perfis de acesso diferenciados para administradores, professores e secretaria."
                        />
                    </div>
                </div>
            </section>

            {/* Dynamic Plans Section */}
            <section id="planos" className="py-20 relative overflow-hidden bg-bg-dark">
                <div className="orb orb-primary w-96 h-96 top-10 left-1/2 -translate-x-1/2 opacity-30"></div>
                <div className="container mx-auto px-4 max-w-6xl relative z-10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary-light mb-4 backdrop-blur-md">
                            <Sparkles size={14} className="animate-spin-slow text-primary" />
                            Planos Flexíveis
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                            Escolha o Plano Ideal para seu Negócio
                        </h2>
                        <p className="text-text-muted max-w-2xl mx-auto text-base sm:text-lg">
                            Transparente, sem letrinhas miúdas. Comece a transformar sua gestão hoje mesmo.
                        </p>
                    </div>

                    {loadingPlans ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`glass-card p-8 rounded-3xl relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 ${
                                        plan.popular
                                            ? 'border-2 border-primary shadow-2xl shadow-primary/20 bg-gradient-to-b from-primary/10 via-bg-card to-bg-card'
                                            : 'border-white/10 hover:border-white/20'
                                    }`}
                                >
                                    {plan.popular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary-hover text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                            <Sparkles size={12} /> Mais Popular
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                        <p className="text-sm text-text-muted mb-6 min-h-[40px]">{plan.description}</p>

                                        <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-white/10">
                                            <span className="text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                                            {plan.period && (
                                                <span className="text-sm text-text-muted font-medium">{plan.period}</span>
                                            )}
                                        </div>

                                        <ul className="space-y-3.5 mb-8 text-sm">
                                            {plan.features?.map((feature, idx) => (
                                                <li key={idx} className="flex items-center gap-3">
                                                    {feature.included ? (
                                                        <div className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0">
                                                            <Check size={12} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-white/5 text-text-muted/40 flex items-center justify-center flex-shrink-0">
                                                            <X size={12} />
                                                        </div>
                                                    )}
                                                    <span className={feature.included ? 'text-text-main font-medium' : 'text-text-muted/50 line-through'}>
                                                        {feature.text}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (plan.price.includes('Sob Consulta')) {
                                                handleWhatsAppClick(`Olá! Gostaria de uma cotação para o plano ${plan.name}`);
                                            } else {
                                                navigate('/register', { state: { planId: plan.id, planName: plan.name } });
                                            }
                                        }}
                                        className={`w-full py-3.5 px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                                            plan.popular
                                                ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02]'
                                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                                        }`}
                                    >
                                        <span>{plan.button_text || 'Assinar Plano'}</span>
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Contact CTA Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="orb w-96 h-96 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary/5 blur-[100px]"></div>
                <div className="container mx-auto px-4 max-w-4xl relative z-10 text-center">
                    <h2 className="text-3xl font-bold mb-6">Leve sua escola para o próximo nível</h2>
                    <p className="text-text-muted mb-8 text-lg">
                        Entre em contato agora mesmo para tirar suas dúvidas e agendar uma demonstração.
                        <br />
                        <span className="text-primary font-medium">Atendimento exclusivo via WhatsApp.</span>
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <button
                            onClick={() => handleWhatsAppClick()}
                            className="btn btn-primary-gradient text-lg px-8 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 transition-transform duration-300 flex items-center gap-3 group cursor-pointer"
                        >
                            <MessageCircle size={24} className="group-hover:rotate-12 transition-transform" />
                            Falar com Consultor
                        </button>
                        <p className="text-xs text-text-muted/50 mt-4">
                            MyTeacherApp • Soluções Educacionais
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-text-muted text-sm bg-bg-dark relative z-10">
                <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 font-bold text-lg opacity-80 hover:opacity-100 transition-opacity">
                        <GraduationCap className="text-primary" size={20} />
                        MyTeacherApp
                    </div>
                    <div className="flex gap-6">
                        <span onClick={() => handleWhatsAppClick()} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 group">
                            <MessageCircle size={16} className="text-primary group-hover:text-success transition-colors" />
                            <span className="group-hover:underline decoration-primary/50 underline-offset-4">Fale Conosco</span>
                        </span>
                        <a href="#" className="hover:text-white transition-colors hover:underline decoration-white/20 underline-offset-4">Termos</a>
                        <a href="#" className="hover:text-white transition-colors hover:underline decoration-white/20 underline-offset-4">Privacidade</a>
                    </div>
                    <p>&copy; {new Date().getFullYear()} LogicIA Solutions.</p>
                </div>
            </footer>
        </div>
    );
};

// Helper Components
const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="glass-card p-6 hover:bg-white/5 transition-all group cursor-default hover:-translate-y-1 duration-300 border border-white/5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="mb-4 p-3 rounded-xl bg-primary/10 w-fit text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-inner">
            {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
        </div>
        <h3 className="text-lg font-bold mb-2 text-white group-hover:text-primary-light transition-colors">{title}</h3>
        <p className="text-text-muted text-sm leading-relaxed">{description}</p>
    </div>
);
