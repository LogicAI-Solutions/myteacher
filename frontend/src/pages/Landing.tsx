import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, ArrowRight, BarChart3, Users, DollarSign, CalendarCheck,
    MessageCircle, Shield, LogIn, Check, X, CalendarDays, Sparkles, Video,
    Palette, CheckCircle2, ClipboardCheck, WalletCards, Clock3,
    HeartHandshake, LockKeyhole, ChevronDown, Star, ListChecks, Calculator,
} from 'lucide-react';
import { openSupportWhatsApp } from '../utils/support';
import { RegisterStrip, type RegisterStripMonth } from '../components/RegisterStrip';
import { useTheme } from '../context/ThemeContext';
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
        name: 'Essencial',
        description: 'Para quem está começando e gerencia poucas turmas.',
        price: 'R$ 47,90', period: '/mês', popular: false,
        button_text: 'Começar 14 dias grátis',
        features: [
            { text: 'Até 5 turmas', included: true }, { text: 'Alunos ilimitados', included: true },
            { text: 'Agenda integrada com Google Calendar', included: true }, { text: 'Gestão financeira completa', included: true },
            { text: 'Controle de presenças e notas', included: true }, { text: 'Dashboard do aluno', included: true },
            { text: 'Turmas ilimitadas', included: false },
        ],
    },
    {
        id: 2,
        name: 'Profissional',
        description: 'Para professores com agenda cheia, sem limite de turmas.',
        price: 'R$ 97,90', period: '/mês', popular: true,
        button_text: 'Começar 14 dias grátis',
        features: [
            { text: 'Turmas ilimitadas', included: true }, { text: 'Alunos ilimitados', included: true },
            { text: 'Agenda & Google Meet com 1 clique', included: true }, { text: 'Gestão financeira completa', included: true },
            { text: 'Controle de presenças e notas', included: true }, { text: 'Dashboard do aluno', included: true },
            { text: 'Suporte prioritário', included: true },
        ],
    },
    {
        id: 3,
        name: 'Enterprise / Redes',
        description: 'Solução sob medida para grandes redes de ensino.',
        price: 'Sob Consulta', period: '', popular: false,
        button_text: 'Falar com Consultor',
        features: [
            { text: 'Tudo do plano Pro', included: true }, { text: 'Domínio personalizado & Whitelabel', included: true },
            { text: 'API de integração dedicada', included: true }, { text: 'Treinamento de equipe', included: true },
            { text: 'SLA de atendimento garantido', included: true }, { text: 'Gerente de conta dedicado', included: true },
        ],
    },
];

const SAMPLE_ROWS: { name: string; attendance: boolean[]; months: RegisterStripMonth[] }[] = [
    { name: 'Marina Albuquerque', attendance: [true, true, true, true, true, true, true, true, true, true, true, true], months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'paid' }, { label: 'Mai', status: 'paid' }] },
    { name: 'Joaquim Ferreira', attendance: [true, true, false, true, true, true, false, true, true, true, true, true], months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'paid' }, { label: 'Mai', status: 'pending' }] },
    { name: 'Rita Nascimento', attendance: [true, false, false, true, false, false, true, false, false, true, false, false], months: [{ label: 'Mar', status: 'paid' }, { label: 'Abr', status: 'late' }, { label: 'Mai', status: 'late' }] },
];

export const Landing = () => {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await api.get('/plans/');
                setPlans(Array.isArray(response.data) && response.data.length > 0 ? response.data : defaultPlans);
            } catch (error) {
                console.error('Erro ao carregar planos:', error);
                setPlans(defaultPlans);
            } finally { setLoadingPlans(false); }
        };
        fetchPlans();
    }, []);

    const handleWhatsAppClick = (customMsg?: string) => openSupportWhatsApp(customMsg || 'Olá! Vim pelo site do MyTeacherApp e gostaria de saber mais sobre os planos.');
    const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-bg-dark text-text-main font-sans">
            <nav className="fixed top-0 w-full z-50 sheet-header px-4 py-3 sm:px-6">
                <div className="container mx-auto flex justify-between items-center max-w-6xl">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer bg-transparent border-none text-text-main p-0"><GraduationCap className="text-primary" size={24} /><span>MyTeacherApp</span></button>
                    <div className="hidden lg:flex items-center gap-6 text-sm text-text-muted"><button onClick={() => scrollTo('como-funciona')} className="hover:text-primary transition-colors">Como funciona</button><button onClick={() => scrollTo('exemplos')} className="hover:text-primary transition-colors">Exemplos</button><button onClick={() => scrollTo('recursos')} className="hover:text-primary transition-colors">Recursos</button><button onClick={() => scrollTo('planos')} className="hover:text-primary transition-colors">Planos</button></div>
                    <div className="flex items-center gap-2 sm:gap-3"><button onClick={() => navigate('/login')} className="btn btn-ghost" title="Acessar o sistema"><LogIn size={16} /><span>Entrar</span></button><button onClick={() => navigate('/register')} className="btn btn-primary"><span>Começar grátis</span></button></div>
                </div>
            </nav>

            <main>
                <header className="pt-28 pb-16 lg:pt-36 lg:pb-24 px-4 sm:px-6 relative overflow-hidden">
                    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                    <div className="container mx-auto grid lg:grid-cols-[0.92fr_1.08fr] gap-10 lg:gap-16 items-center max-w-6xl relative">
                        <div className="animate-slide-up">
                            <h1 className="text-4xl sm:text-5xl lg:text-[3.7rem] font-bold leading-[1.04] tracking-tight max-w-[12ch]">Menos planilha. Mais tempo para ensinar.</h1>
                            <p className="mt-5 text-base sm:text-lg text-text-muted leading-relaxed max-w-[48ch]">O MyTeacherApp organiza alunos, turmas, presença, mensalidades e agenda em um só lugar — para você saber o que acontece sem depender da memória.</p>
                            <div className="mt-7 flex flex-col sm:flex-row gap-3"><button onClick={() => navigate('/register')} className="btn btn-primary text-base px-5 py-2.5 group">Criar minha conta grátis<ArrowRight className="group-hover:translate-x-0.5 transition-transform w-4 h-4" /></button><button onClick={() => scrollTo('exemplos')} className="btn btn-outline text-base px-5 py-2.5">Ver exemplos</button></div>
                            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted"><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" />14 dias grátis</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" />Sem cartão</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={15} className="text-primary" />Cancele quando quiser</span></div>
                        </div>
                        <div className="animate-fade-in"><div className="sheet overflow-hidden raised">
                            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 rule-b" style={{ background: 'var(--desk)' }}><div><p className="label-print">Visão geral</p><p className="mt-1 text-sm font-semibold">Quinta-feira, 15 de maio</p></div><span className="stamp stamp-paid"><CheckCircle2 size={12} />Tudo em dia</span></div>
                            <div className="grid grid-cols-3 gap-2 p-4 sm:p-5 rule-b"><Metric label="Alunos" value="42" icon={<Users size={15} />} /><Metric label="Aulas hoje" value="06" icon={<CalendarCheck size={15} />} /><Metric label="A receber" value="R$ 1.280" icon={<WalletCards size={15} />} /></div>
                            <div className="px-4 sm:px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="label-print">Exemplo de turma</p><p className="mt-1 font-semibold">Inglês B2 · Terças e quintas</p></div><span className="text-xs text-text-muted">12 aulas</span></div><ul className="mt-3">{SAMPLE_ROWS.map((row, i) => <li key={row.name} className={`py-3 ${i > 0 ? 'rule-t' : ''}`}><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{row.name}</span><span className={`text-xs font-semibold ${i === 0 ? 'text-primary' : i === 1 ? 'text-text-muted' : 'text-red-700'}`}>{i === 0 ? 'Frequente' : i === 1 ? '1 pendência' : 'Acompanhar'}</span></div><div className="mt-1.5"><RegisterStrip attendance={row.attendance} months={row.months} /></div></li>)}</ul></div>
                            <div className="px-4 sm:px-5 py-3 rule-t text-xs text-text-muted flex items-center gap-2" style={{ background: 'var(--desk)' }}><LockKeyhole size={13} className="text-primary" />Exemplo ilustrativo com dados fictícios</div>
                        </div></div>
                    </div>
                </header>

                <section id="como-funciona" className="py-16 lg:py-20 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}><div className="container mx-auto max-w-6xl"><div className="max-w-[62ch]"><p className="label-print">Do cadastro ao fechamento</p><h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold">Uma rotina mais leve em quatro passos.</h2><p className="mt-3 text-text-muted text-base sm:text-lg">Você não precisa mudar seu jeito de dar aula. Só tirar o trabalho repetitivo do caminho.</p></div><div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><StepCard number="01" icon={<Users />} title="Cadastre suas turmas" description="Adicione alunos, horários e o valor de cada mensalidade em poucos minutos." /><StepCard number="02" icon={<CalendarCheck />} title="Faça a chamada" description="Registre presença na aula e acompanhe o histórico sem procurar em várias planilhas." /><StepCard number="03" icon={<WalletCards />} title="Marque os pagamentos" description="Veja o que já entrou, o que está pendente e quem precisa de um lembrete." /><StepCard number="04" icon={<BarChart3 />} title="Feche o mês" description="Abra o painel e entenda sua operação antes de tomar qualquer decisão." /></div></div></section>

                <section className="py-16 lg:py-20 px-4 sm:px-6"><div className="container mx-auto max-w-6xl grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16 items-start"><div><p className="label-print">O nosso compromisso</p><h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold">Clareza para você ensinar com tranquilidade.</h2><p className="mt-4 text-text-muted leading-relaxed max-w-[46ch]">A ferramenta precisa diminuir sua carga, não criar mais uma. Por isso, cada parte do MyTeacherApp existe para deixar o próximo passo evidente.</p><button onClick={() => handleWhatsAppClick('Olá! Quero conhecer o compromisso do MyTeacherApp e tirar algumas dúvidas.')} className="btn btn-outline mt-6"><HeartHandshake size={17} />Falar com uma pessoa</button></div><div className="grid sm:grid-cols-3 gap-4"><PromiseCard icon={<Clock3 />} title="Seu tempo importa" description="Menos conferência manual e mais tempo para preparar aulas e acompanhar alunos." /><PromiseCard icon={<LockKeyhole />} title="Seus dados são seus" description="Acesso protegido e visão separada para professor e aluno, sem misturar informações." /><PromiseCard icon={<HeartHandshake />} title="Suporte de verdade" description="Quando surgir uma dúvida, você fala com gente — não fica preso em respostas genéricas." /></div></div></section>

                <section id="exemplos" className="py-16 lg:py-20 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}><div className="container mx-auto max-w-6xl"><div className="text-center max-w-[62ch] mx-auto"><p className="label-print">Veja antes de decidir</p><h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold">Exemplos do que você resolve no dia a dia.</h2><p className="mt-3 text-text-muted text-base sm:text-lg">Não é uma promessa abstrata: é o tipo de informação que fica visível no seu painel.</p></div><div className="mt-10 grid lg:grid-cols-2 gap-5">
                    <div className="sheet overflow-hidden"><div className="px-5 py-4 rule-b flex items-center justify-between"><div><p className="label-print">Exemplo 01</p><h3 className="mt-1 text-lg font-bold">Antes da próxima aula</h3></div><ClipboardCheck className="text-primary" size={24} /></div><div className="p-5"><p className="text-sm text-text-muted">Turma de Inglês B2 · 8 alunos</p><ul className="mt-4 space-y-3"><ExampleRow icon={<CheckCircle2 />} text="Marina está com presença completa" status="Tudo certo" tone="success" /><ExampleRow icon={<Clock3 />} text="Joaquim tem uma mensalidade pendente" status="Acompanhar" tone="warning" /><ExampleRow icon={<ListChecks />} text="Rita faltou em 5 das últimas 12 aulas" status="Ver histórico" tone="danger" /></ul></div><div className="px-5 py-3 rule-t text-sm text-text-muted" style={{ background: 'var(--desk)' }}>Você chega preparado para conversar, sem adivinhar.</div></div>
                    <div className="sheet overflow-hidden"><div className="px-5 py-4 rule-b flex items-center justify-between"><div><p className="label-print">Exemplo 02</p><h3 className="mt-1 text-lg font-bold">Fechamento do mês</h3></div><Calculator className="text-primary" size={24} /></div><div className="p-5"><div className="grid grid-cols-3 gap-3"><MiniTotal label="Recebido" value="R$ 4.860" tone="text-primary" /><MiniTotal label="Pendente" value="R$ 780" tone="text-amber-700" /><MiniTotal label="Turmas" value="06" tone="text-text-main" /></div><div className="mt-5 rounded-[3px] border border-[var(--rule)] p-4" style={{ background: 'var(--desk)' }}><div className="flex items-center justify-between text-sm"><span className="font-semibold">Mensalidades de maio</span><span className="text-primary font-semibold">86% recebido</span></div><div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}><div className="h-full rounded-full bg-primary" style={{ width: '86%' }} /></div><p className="mt-3 text-xs text-text-muted">5 pagamentos para conferir · 2 lembretes para enviar</p></div></div><div className="px-5 py-3 rule-t text-sm text-text-muted" style={{ background: 'var(--desk)' }}>Você sabe onde está o dinheiro antes de fechar o mês.</div></div>
                </div></div></section>

                <section id="recursos" className="py-16 lg:py-20 px-4 sm:px-6"><div className="container mx-auto max-w-6xl"><div className="max-w-[62ch]"><p className="label-print">Tudo no mesmo lugar</p><h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold">O essencial para a sua operação.</h2><p className="mt-3 text-text-muted text-base sm:text-lg">Ferramentas práticas para você administrar as aulas com a mesma atenção que dedica aos alunos.</p></div><div className="mt-8 sheet overflow-hidden"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: 'var(--rule)' }}><FeatureCell icon={<CalendarDays />} title="Agenda & Google Calendar" description="Sincronize aulas, horários e feriados sem conflito." /><FeatureCell icon={<Video />} title="Google Meet em 1 clique" description="Gere a sala da aula online sem copiar links." /><FeatureCell icon={<CalendarCheck />} title="Chamada" description="Registre presença e consulte o histórico de cada aluno." /><FeatureCell icon={<DollarSign />} title="Mensalidades" description="Saiba o que entrou, o que falta e de quem cobrar." /><FeatureCell icon={<Users />} title="Alunos & turmas" description="Cadastre pessoas, responsáveis, valores e matrículas." /><FeatureCell icon={<BarChart3 />} title="Fechamento do mês" description="Tenha um resumo rápido da saúde da sua operação." /><FeatureCell icon={<Shield />} title="Portal do aluno" description="Cada aluno acessa apenas sua própria frequência e pagamentos." /><ThemeFeatureCell /></div></div></div></section>

                <section id="planos" className="py-16 lg:py-24 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}><div className="container mx-auto max-w-6xl"><div className="max-w-[60ch] mx-auto text-center"><p className="label-print">Comece no seu ritmo</p><h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold">Um plano simples para cada fase.</h2><p className="mt-3 text-text-muted text-base sm:text-lg">Teste por 14 dias, escolha o que faz sentido e cancele quando quiser.</p></div>{loadingPlans ? <div className="flex justify-center items-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" role="status" aria-label="Carregando planos" /></div> : <div className="mt-10 flex flex-wrap justify-center gap-5 items-stretch">{plans.map(plan => <div key={plan.id} className={`sheet flex flex-col p-6 w-full max-w-[22rem] ${plan.popular ? 'border-primary raised' : ''}`}><div className="flex items-baseline justify-between gap-2"><h3 className="text-lg font-bold">{plan.name}</h3>{plan.popular && <span className="stamp stamp-paid">Mais escolhido</span>}</div><p className="mt-2 text-sm text-text-muted min-h-[2.75rem]">{plan.description}</p><p className="mt-5 pb-5 rule-b flex items-baseline gap-1"><span className="text-3xl font-bold tracking-tight tabular">{plan.price}</span>{plan.period && <span className="text-sm text-text-muted">{plan.period}</span>}</p><ul className="mt-5 space-y-2.5 text-sm flex-1">{plan.features?.map((feature, idx) => <li key={idx} className="flex items-start gap-2.5">{feature.included ? <Check size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /> : <X size={15} className="mt-0.5 shrink-0 text-text-muted opacity-50" aria-hidden="true" />}<span className={feature.included ? 'text-text-main' : 'text-text-muted line-through'}>{feature.text}</span></li>)}</ul><button onClick={() => plan.price.includes('Sob Consulta') ? handleWhatsAppClick(`Olá! Gostaria de uma cotação para o plano ${plan.name}`) : navigate('/register', { state: { planId: plan.id, planName: plan.name } })} className={`btn w-full mt-6 py-2.5 ${plan.popular ? 'btn-primary' : 'btn-outline'}`}><span>{plan.button_text || 'Assinar plano'}</span><ArrowRight size={15} /></button></div>)}</div>}<p className="mt-6 text-center text-sm text-text-muted">Todos os planos incluem atualizações e acesso ao suporte.</p></div></section>

                <section id="faq" className="py-16 lg:py-20 px-4 sm:px-6"><div className="container mx-auto max-w-3xl"><div className="text-center"><p className="label-print">Ainda com dúvida?</p><h2 className="mt-2 text-2xl sm:text-3xl font-bold">Perguntas frequentes</h2></div><div className="mt-8 sheet overflow-hidden">{[
                    ['Preciso instalar alguma coisa?', 'Não. O MyTeacherApp funciona no navegador, no computador ou no celular. Basta criar sua conta e começar.'], ['Posso testar antes de pagar?', 'Sim. Você tem 14 dias grátis para conhecer o sistema. Não é necessário informar cartão para começar.'], ['Meus alunos também podem acessar?', 'Sim. O Portal do Aluno permite que cada aluno veja sua própria frequência e situação de pagamentos, com acesso separado.'], ['E se eu precisar de ajuda?', 'Você pode falar com a nossa equipe pelo WhatsApp. A ideia é resolver junto, com uma conversa simples e direta.'],
                ].map(([question, answer], index) => { const isOpen = openFaq === index; return <div key={question} className={index > 0 ? 'rule-t' : ''}><button onClick={() => setOpenFaq(isOpen ? null : index)} className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 hover:bg-wash-1 transition-colors"><span className="font-semibold">{question}</span><ChevronDown size={18} className={`shrink-0 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && <p className="px-5 pb-5 pr-12 text-sm text-text-muted leading-relaxed">{answer}</p>}</div>; })}</div></div></section>

                <section className="py-16 px-4 sm:px-6 rule-t" style={{ background: 'var(--desk-sunk)' }}><div className="container mx-auto max-w-6xl sheet p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-7"><div className="max-w-[58ch]"><div className="flex items-center gap-2 text-primary"><Star size={18} fill="currentColor" /><span className="text-sm font-semibold">Pronto para organizar sua rotina?</span></div><h2 className="mt-3 text-2xl sm:text-3xl font-bold">Comece com uma turma. Sinta a diferença no primeiro mês.</h2><p className="mt-3 text-text-muted">Crie sua conta grátis ou fale com a gente para ver o sistema com um exemplo parecido com o seu.</p></div><div className="flex flex-col sm:flex-row gap-3 shrink-0"><button onClick={() => navigate('/register')} className="btn btn-primary text-base px-5 py-2.5">Começar grátis<ArrowRight size={16} /></button><button onClick={() => handleWhatsAppClick()} className="btn btn-outline text-base px-5 py-2.5"><MessageCircle size={17} />Falar com a gente</button></div></div></section>
            </main>

            <footer className="py-8 px-4 sm:px-6 rule-t"><div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted"><div className="flex items-center gap-2 font-bold text-text-main"><GraduationCap className="text-primary" size={18} />MyTeacherApp</div><div className="flex flex-wrap justify-center gap-5"><button onClick={() => handleWhatsAppClick()} className="bg-transparent border-none p-0 text-text-muted hover:text-primary cursor-pointer transition-colors">Fale conosco</button><button onClick={() => navigate('/terms')} className="bg-transparent border-none p-0 text-text-muted hover:text-primary cursor-pointer transition-colors">Termos</button><button onClick={() => navigate('/privacy')} className="bg-transparent border-none p-0 text-text-muted hover:text-primary cursor-pointer transition-colors">Privacidade</button></div><p>&copy; {new Date().getFullYear()} LogicIA Solutions</p></div></footer>
        </div>
    );
};

const Metric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => <div className="rounded-[3px] border border-[var(--rule)] p-3" style={{ background: 'var(--desk-sunk)' }}><div className="flex items-center gap-1.5 text-primary">{icon}<span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">{label}</span></div><p className="mt-2 text-lg sm:text-xl font-bold tabular">{value}</p></div>;
const StepCard = ({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) => <div className="sheet p-5"><div className="flex items-center justify-between text-primary"><span className="text-xs font-bold tracking-widest">{number}</span>{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div><h3 className="mt-7 text-base font-bold">{title}</h3><p className="mt-2 text-sm text-text-muted leading-relaxed">{description}</p></div>;
const PromiseCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => <div className="sheet p-5"><div className="text-primary">{React.cloneElement(icon as React.ReactElement<any>, { size: 21 })}</div><h3 className="mt-4 font-bold">{title}</h3><p className="mt-2 text-sm text-text-muted leading-relaxed">{description}</p></div>;
const ExampleRow = ({ icon, text, status, tone }: { icon: React.ReactNode; text: string; status: string; tone: 'success' | 'warning' | 'danger' }) => { const tones = { success: 'text-primary', warning: 'text-amber-700', danger: 'text-red-700' }; return <li className="flex items-center gap-3"><span className={tones[tone]}>{React.cloneElement(icon as React.ReactElement<any>, { size: 18 })}</span><span className="text-sm flex-1">{text}</span><span className={`text-xs font-semibold ${tones[tone]}`}>{status}</span></li>; };
const MiniTotal = ({ label, value, tone }: { label: string; value: string; tone: string }) => <div><p className="text-xs text-text-muted">{label}</p><p className={`mt-1 text-base sm:text-lg font-bold tabular ${tone}`}>{value}</p></div>;
const FeatureCell = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => <div className="p-5 sm:p-6" style={{ background: 'var(--sheet)' }}><div className="text-primary">{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div><h3 className="mt-3 text-base font-semibold">{title}</h3><p className="mt-1.5 text-sm text-text-muted leading-relaxed">{description}</p></div>;

const ThemeFeatureCell = () => {
    const { theme, setTheme } = useTheme();
    const themesList = [
        { id: 'registro', label: 'Registro', desc: 'Papel claro', bg: '#ffffff', border: '#cbd5e1', text: '#001D39', accent: '#0A4174' },
        { id: 'almaco', label: 'Almaço', desc: 'Azul intenso', bg: '#f0f7fc', border: '#78a9cb', text: '#001e3d', accent: '#0277bd' },
        { id: 'ardosia', label: 'Ardósia', desc: 'Lousa escura', bg: '#001D39', border: '#0A4174', text: '#e7f3fa', accent: '#7BBDE8' },
    ];
    return <div className="p-5 sm:p-6 flex flex-col justify-between" style={{ background: 'var(--sheet)' }}><div><div className="flex items-center justify-between text-primary"><Palette size={20} /><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Experimente</span></div><h3 className="mt-3 text-base font-semibold">Temas & estilos</h3><p className="mt-1.5 text-sm text-text-muted leading-relaxed">Personalize sua experiência entre papel clássico, tons suaves e modo escuro.</p></div><div className="mt-4 grid grid-cols-3 gap-1.5">{themesList.map(t => { const isActive = theme === t.id; return <button key={t.id} type="button" onClick={() => setTheme(t.id as any)} style={{ backgroundColor: t.bg, borderColor: isActive ? t.accent : t.border, color: t.text }} className={`flex flex-col items-center justify-center p-1.5 rounded-[3px] border-2 transition-all cursor-pointer text-center relative ${isActive ? 'shadow-md scale-[1.03] ring-1 ring-primary' : 'opacity-80 hover:opacity-100 hover:scale-[1.01]'}`} title={`Mudar para o tema ${t.label}`}>{isActive && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow" style={{ backgroundColor: t.accent }}>✓</span>}<div className="w-3 h-3 rounded-full mb-1 border" style={{ backgroundColor: t.accent, borderColor: t.border }} /><span className="text-[10px] font-bold leading-none">{t.label}</span><span className="text-[8px] opacity-75 mt-0.5 leading-none">{t.desc}</span></button>; })}</div></div>;
};
