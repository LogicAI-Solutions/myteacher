import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export const Terms = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg-dark text-text-main font-sans">
            <nav className="fixed top-0 w-full z-50 sheet-header px-4 py-3 sm:px-6">
                <div className="container mx-auto flex justify-between items-center max-w-6xl">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 font-bold text-lg sm:text-xl cursor-pointer bg-transparent border-none text-text-main p-0 hover:opacity-80 transition-opacity"
                    >
                        <GraduationCap className="text-primary" size={24} />
                        <span>MyTeacherApp</span>
                    </button>
                    <button onClick={() => navigate(-1)} className="btn btn-ghost">
                        <ArrowLeft size={16} />
                        <span>Voltar</span>
                    </button>
                </div>
            </nav>

            <main className="pt-28 pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
                <div className="sheet p-6 sm:p-10 text-text-main">
                    <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
                    
                    <div className="space-y-6 text-sm sm:text-base leading-relaxed text-text-muted">
                        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        
                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">1. Aceitação dos Termos</h2>
                            <p>
                                Ao acessar e usar o MyTeacherApp, você concorda em cumprir e ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá acessar a plataforma.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">2. Descrição do Serviço</h2>
                            <p>
                                O MyTeacherApp é uma plataforma de gestão voltada para professores particulares e instituições de ensino, oferecendo ferramentas para controle de turmas, alunos, presenças, mensalidades, agenda e integração com serviços do Google (como Google Calendar e Google Meet).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">3. Uso da Integração com o Google</h2>
                            <p>
                                Nosso aplicativo utiliza a API do Google para fornecer funcionalidades como autenticação, criação e sincronização de eventos na agenda e geração de links para videoconferência. O uso destas informações recebidas das APIs do Google está em conformidade com a Política de Dados de Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">4. Responsabilidades do Usuário</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso;</li>
                                <li>Você concorda em fornecer informações verdadeiras, exatas e completas durante o registro e uso da plataforma;</li>
                                <li>Você é inteiramente responsável por todos os dados de alunos inseridos no sistema, garantindo que possui autorização para coletá-los e armazená-los;</li>
                                <li>O MyTeacherApp não se responsabiliza pela perda de aulas, falhas de conexão no Google Meet ou discordâncias sobre pagamentos entre o professor e o aluno.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">5. Assinaturas e Pagamentos</h2>
                            <p>
                                O uso de funcionalidades premium requer uma assinatura paga. Os pagamentos são processados por terceiros e estão sujeitos aos termos desses parceiros. A assinatura pode ser cancelada a qualquer momento, evitando a renovação no ciclo seguinte, mas não realizamos reembolsos de períodos já cobrados.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">6. Modificações no Serviço</h2>
                            <p>
                                Reservamo-nos o direito de modificar ou descontinuar, temporária ou permanentemente, o serviço (ou qualquer parte dele) com ou sem aviso prévio. Não seremos responsáveis perante você ou terceiros por qualquer modificação, suspensão ou descontinuação do serviço.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">7. Lei Aplicável</h2>
                            <p>
                                Estes termos serão regidos e interpretados de acordo com as leis do Brasil. Qualquer disputa decorrente destes termos estará sujeita à jurisdição exclusiva dos tribunais competentes.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};
