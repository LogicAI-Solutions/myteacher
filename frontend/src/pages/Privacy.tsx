import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export const Privacy = () => {
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
                    <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
                    
                                            <div className="space-y-6 text-sm sm:text-base leading-relaxed text-text-muted">
                        <p>Última atualização: 5 de outubro de 2026</p>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">1. Quem somos</h2>
                            <p>O MyTeacherApp (<strong>myteacherapp.com.br</strong>) é um sistema de gestão para professores particulares, operado pela LogicIA Solutions, que atua como controladora dos dados pessoais descritos nesta política, nos termos da Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">2. Dados que coletamos</h2>
                            <p>Coletamos apenas o necessário para o funcionamento do serviço:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Dados da conta:</strong> nome, e-mail, apelido e senha (armazenada somente na forma de hash, nunca em texto legível);</li>
                                <li><strong>Dados inseridos por você:</strong> alunos, turmas, matrículas, presenças, notas, mensalidades, pagamentos e eventos de agenda. Você é quem decide o que cadastrar;</li>
                                <li><strong>Dados de assinatura:</strong> plano contratado e identificadores do cliente no Stripe. Os dados do cartão são tratados diretamente pelo Stripe e não passam pelos nossos servidores;</li>
                                <li><strong>Dados técnicos:</strong> registros de acesso e de erros necessários para segurança e diagnóstico.</li>
                            </ul>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">3. Dados obtidos da sua conta Google</h2>
                            <p>Se você optar por entrar com o Google ou conectar o Google Agenda, solicitamos as seguintes permissões (escopos OAuth), e somente elas:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>openid, e-mail e perfil</strong> (<em>email</em>, <em>profile</em>): para identificar você, criar sua conta e exibir seu nome. Recebemos seu e-mail, nome, foto e o identificador da conta Google;</li>
                                <li><strong>Google Agenda — eventos</strong> (<em>https://www.googleapis.com/auth/calendar.events</em>): para ler, criar, editar e excluir eventos na sua agenda principal e para gerar links do Google Meet nas aulas online.</li>
                            </ul>
                            <p className="mt-2">Para manter a conexão ativa sem pedir login a cada uso, armazenamos no nosso banco de dados o token de acesso e o token de atualização (refresh token) fornecidos pelo Google. Esses tokens são usados exclusivamente para executar, em seu nome, as ações que você pede dentro do MyTeacherApp.</p>
                            <p className="mt-2">Os eventos da sua agenda do Google são lidos para serem exibidos junto às suas aulas na tela de Agenda. Não os copiamos para outros fins nem os usamos para criar perfis ou publicidade.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">4. Como usamos as informações</h2>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Fornecer, operar e manter o aplicativo;</li>
                                <li>Criar, atualizar e excluir eventos de aulas na sua agenda e gerar links do Google Meet, apenas quando você solicita;</li>
                                <li>Exibir na Agenda os seus eventos do Google ao lado das suas aulas;</li>
                                <li>Gerenciar cobrança e assinaturas;</li>
                                <li>Prestar suporte e enviar comunicações técnicas essenciais sobre o serviço.</li>
                            </ul>
                            <p className="mt-2">O uso e a transferência, para qualquer outro aplicativo, das informações recebidas das APIs do Google pelo MyTeacherApp obedecem à <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>
                            <p className="mt-2">Em conformidade com essa política, o MyTeacherApp: (a) usa os dados do Google apenas para fornecer e melhorar funcionalidades visíveis ao usuário; (b) <strong>não</strong> transfere esses dados a terceiros, exceto quando necessário para prestar o serviço, cumprir a lei ou em caso de fusão ou venda da empresa, com aviso prévio; (c) <strong>não</strong> usa esses dados para publicidade, inclusive direcionada; (d) <strong>não</strong> permite que pessoas leiam esses dados, salvo com o seu consentimento, por segurança, para cumprir a lei ou quando agregados e anonimizados; e (e) <strong>não</strong> usa dados do Google para desenvolver, melhorar ou treinar modelos de inteligência artificial ou aprendizado de máquina.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">5. Compartilhamento de dados</h2>
                            <p>Não vendemos seus dados. Compartilhamos informações apenas com operadores essenciais ao serviço: o <strong>Stripe</strong> (processamento de pagamentos), a <strong>infraestrutura de hospedagem</strong> onde o sistema roda e as <strong>APIs do Google</strong>, quando você ativa a integração. Também podemos divulgar dados quando exigido por lei ou ordem judicial.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">6. Dados de alunos</h2>
                            <p>Os dados de alunos (e de responsáveis) cadastrados por você são de sua responsabilidade como professor, que atua como controlador desses dados perante os alunos. O MyTeacherApp os trata como operador, apenas para prestar o serviço, e cada aluno com acesso ao Portal do Aluno vê somente as próprias informações.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">7. Armazenamento, retenção e segurança</h2>
                            <p>Os dados ficam em banco de dados PostgreSQL em servidor com acesso restrito, e a comunicação com o aplicativo é protegida por HTTPS. As senhas são armazenadas com hash. Mantemos os dados enquanto sua conta estiver ativa e, após a exclusão, os removemos em até 30 dias, salvo o que precisarmos guardar por obrigação legal (por exemplo, registros fiscais e de cobrança). Nenhum sistema é totalmente imune a falhas; em caso de incidente relevante, notificaremos você e a ANPD conforme a LGPD.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">8. Seus direitos e como revogar o acesso ao Google</h2>
                            <p>Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização ou eliminação dos seus dados, e revogar consentimentos. Para isso, escreva para <a href="mailto:contato@myteacherapp.com.br" className="text-primary underline">contato@myteacherapp.com.br</a>.</p>
                            <p className="mt-2"><strong>Para revogar o acesso do MyTeacherApp à sua conta Google</strong>, acesse <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/permissions</a>, selecione o MyTeacherApp e clique em “Remover acesso”. Ao fazer isso, os tokens deixam de funcionar. Você também pode pedir a exclusão da sua conta e de todos os dados associados, inclusive os tokens do Google, pelo e-mail acima; atendemos em até 30 dias.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">9. Cookies e armazenamento local</h2>
                            <p>Usamos o armazenamento local do navegador apenas para manter sua sessão e preferências (como o tema). Não usamos cookies de publicidade nem de rastreamento de terceiros.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">10. Crianças e adolescentes</h2>
                            <p>O MyTeacherApp é destinado a professores adultos. Dados de menores só devem ser cadastrados por professores com autorização dos pais ou responsáveis, conforme o art. 14 da LGPD.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">11. Alterações desta política</h2>
                            <p>Podemos atualizar esta política. Alterações relevantes serão avisadas no aplicativo ou por e-mail, e a data no topo desta página será atualizada.</p>

                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">12. Contato</h2>
                            <p>Dúvidas ou solicitações sobre privacidade: <a href="mailto:contato@myteacherapp.com.br" className="text-primary underline">contato@myteacherapp.com.br</a>. Também atendemos pelo WhatsApp de suporte do site.</p>

                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
};
