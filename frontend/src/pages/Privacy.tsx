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
                        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        
                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">1. Informações que Coletamos</h2>
                            <p>
                                Ao utilizar o MyTeacherApp e autenticar-se através de sua conta Google, nós solicitamos acesso ao seu endereço de e-mail e informações de perfil básico (nome e foto) estritamente para fins de criação de conta e identificação na plataforma. Caso opte por utilizar os recursos de integração, também poderemos solicitar permissões adicionais para ler e gerenciar eventos em seu Google Calendar e Google Meet, garantindo o funcionamento da sincronização de aulas.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">2. Como Usamos as Informações</h2>
                            <p>
                                Utilizamos suas informações exclusivamente para:
                            </p>
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Fornecer, operar e manter nosso aplicativo;</li>
                                <li>Criar eventos de aulas na sua agenda e gerar links do Google Meet;</li>
                                <li>Gerenciar a cobrança e assinaturas;</li>
                                <li>Prestar suporte ao cliente e enviar atualizações técnicas.</li>
                            </ul>
                            <p className="mt-2">
                                O MyTeacherApp <strong>não</strong> utiliza seus dados do Google (incluindo dados do Google Workspace e Google Calendar) para desenvolver, melhorar ou treinar modelos generalizados de inteligência artificial ou machine learning.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">3. Compartilhamento de Dados</h2>
                            <p>
                                Não vendemos, trocamos ou transferimos suas informações pessoais a terceiros, exceto quando necessário para processar pagamentos (via gateway de pagamento parceiro) ou quando exigido por lei.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">4. Segurança</h2>
                            <p>
                                Implementamos medidas de segurança reconhecidas no mercado para proteger suas informações contra acesso, alteração, divulgação ou destruição não autorizada. O acesso aos dados da sua conta Google ocorre via tokens de autenticação seguros (OAuth), e nós nunca temos acesso à sua senha.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">5. Exclusão de Dados</h2>
                            <p>
                                Você pode solicitar a exclusão da sua conta e de todos os dados associados a qualquer momento através das configurações do painel ou entrando em contato com nosso suporte. Os tokens de acesso à conta Google podem ser revogados por você diretamente nas configurações de segurança do Google a qualquer momento.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-main mb-3">6. Contato</h2>
                            <p>
                                Se tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco através dos canais de suporte oficiais na plataforma.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};
