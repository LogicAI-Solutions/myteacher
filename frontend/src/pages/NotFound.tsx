import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';

export const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { student } = useStudentAuth();

    const destination = user ? '/dashboard' : student ? '/portal/dashboard' : '/';
    const destinationLabel = user ? 'Ir para o painel' : student ? 'Ir para o portal' : 'Ir para o início';

    return (
        <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-slide-up">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <GraduationCap className="text-primary" size={22} />
                    <span className="font-bold text-lg text-text-main">MyTeacherApp</span>
                </div>

                {/* A folha sem registro correspondente. */}
                <div className="sheet sheet-p text-center">
                    <p className="label-print">Erro 404</p>

                    <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-text-main">
                        Esta página não existe
                    </h1>

                    <p className="mt-3 text-text-muted leading-relaxed">
                        O endereço pode ter mudado, ou o registro que você procurava foi removido.
                    </p>

                    <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                        <button onClick={() => navigate(-1)} className="btn btn-outline justify-center">
                            <ArrowLeft size={16} />
                            Voltar
                        </button>
                        <button onClick={() => navigate(destination)} className="btn btn-primary justify-center">
                            <Home size={16} />
                            {destinationLabel}
                        </button>
                    </div>
                </div>

                <p className="text-center mt-5 text-xs text-text-muted">
                    MyTeacherApp • LogicIA Solutions
                </p>
            </div>
        </div>
    );
};
