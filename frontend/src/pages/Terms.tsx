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
                        <p>Última atualização: 5 de outubro de 2026</p>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">1. Aceitação dos termos</h2>
                            <p>Ao criar uma conta ou usar o MyTeacherApp (<strong>myteacherapp.com.br</strong>), operado pela LogicIA Solutions, você concorda com estes Termos de Uso e com a nossa <a href="/privacy" className="text-primary underline">Política de Privacidade</a>. Se não concordar, não utilize a plataforma.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">2. Descrição do serviço</h2>
                            <p>O MyTeacherApp é uma plataforma de gestão para professores particulares: cadastro de alunos e turmas, controle de presenças e notas, mensalidades e pagamentos, agenda e Portal do Aluno, com integração opcional a serviços do Google (login, Google Agenda e Google Meet).</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">3. Cadastro e conta</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Você deve ter capacidade legal para contratar e fornecer informações verdadeiras e atualizadas;</li>
                                <li>Você é responsável por manter suas credenciais em sigilo e por toda atividade realizada na sua conta;</li>
                                <li>Avise-nos imediatamente se suspeitar de acesso indevido.</li>
                            </ul>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">4. Integração com o Google</h2>
                            <p>A integração é opcional. Ao conectá-la, você autoriza o MyTeacherApp a, em seu nome: identificar você pela conta Google e ler, criar, editar e excluir eventos na sua Agenda Google e gerar links do Google Meet, somente para as funcionalidades de aulas e agenda. Detalhes sobre quais dados acessamos e como os protegemos estão na Política de Privacidade.</p>
                            <p className="mt-2">Você pode revogar o acesso a qualquer momento em <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/permissions</a>. Sem a integração, parte dos recursos de agenda fica indisponível, mas o restante do sistema continua funcionando.</p>
                            <p className="mt-2">O uso e a transferência, para qualquer outro aplicativo, das informações recebidas das APIs do Google pelo MyTeacherApp obedecem à <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>
                            <p className="mt-2">O MyTeacherApp não é afiliado, patrocinado ou endossado pelo Google. Google, Google Agenda e Google Meet são marcas da Google LLC.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">5. Responsabilidades do usuário</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Você é responsável pelos dados de alunos e responsáveis que cadastrar, e declara ter autorização para coletá-los e armazená-los, em conformidade com a LGPD;</li>
                                <li>Não use o serviço para fins ilícitos, para enviar conteúdo malicioso, tentar acessar dados de outros usuários ou sobrecarregar a plataforma;</li>
                                <li>Aulas, cobranças e acordos entre professor e aluno são de responsabilidade exclusiva das partes; o MyTeacherApp é uma ferramenta de apoio e não participa dessas relações.</li>
                            </ul>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">6. Assinaturas, teste grátis e pagamentos</h2>
                            <p>Há um período de teste gratuito de 14 dias, sem necessidade de cartão. Após o teste, o uso continuado exige um plano pago, cobrado de forma recorrente e mensal pelo Stripe, nos valores informados na página de planos. Você pode cancelar a qualquer momento, evitando a renovação seguinte. Períodos já cobrados não são reembolsados, salvo quando a lei assegurar o contrário, como o direito de arrependimento de 7 dias previsto no Código de Defesa do Consumidor para contratações a distância.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">7. Propriedade intelectual</h2>
                            <p>O software, a marca e o design do MyTeacherApp pertencem à LogicIA Solutions. Os dados que você insere continuam sendo seus; concedemos a você uma licença limitada, revogável e não exclusiva para usar a plataforma.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">8. Disponibilidade e limitação de responsabilidade</h2>
                            <p>Trabalhamos para manter o serviço disponível, mas ele é fornecido “como está”, sem garantia de funcionamento ininterrupto, inclusive por falhas de serviços de terceiros como o Google e o Stripe. Na extensão permitida pela lei, não respondemos por lucros cessantes, perda de aulas ou danos indiretos decorrentes do uso ou da indisponibilidade da plataforma, e nossa responsabilidade total fica limitada ao valor pago por você nos 12 meses anteriores ao evento.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">9. Suspensão e encerramento</h2>
                            <p>Você pode encerrar sua conta quando quiser, pedindo a exclusão pelo contato abaixo. Podemos suspender ou encerrar contas que violem estes termos ou a lei, com aviso sempre que possível. Após o encerramento, seus dados são tratados conforme a Política de Privacidade.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">10. Modificações</h2>
                            <p>Podemos alterar estes termos ou o serviço. Mudanças relevantes serão comunicadas no aplicativo ou por e-mail, e o uso continuado após o aviso indica concordância.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">11. Lei aplicável e foro</h2>
                            <p>Estes termos são regidos pelas leis do Brasil. Fica eleito o foro do domicílio do consumidor para dirimir controvérsias, quando aplicável o Código de Defesa do Consumidor; nos demais casos, o foro da comarca da sede da LogicIA Solutions.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">12. Contato</h2>
                            <p>Dúvidas sobre estes termos: <a href="mailto:contato@myteacherapp.com.br" className="text-primary underline">contato@myteacherapp.com.br</a>.</p>

                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
};
