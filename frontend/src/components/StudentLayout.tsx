import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { LogOut, GraduationCap, LayoutDashboard, UserCircle, MessageCircle } from 'lucide-react';
import { openSupportWhatsApp } from '../utils/support';

export const StudentLayout = () => {
    const { logout, student } = useStudentAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/portal/login');
    };

    const handleSupportClick = () => {
        openSupportWhatsApp('Olá! Preciso de suporte no Portal do Aluno do MyTeacherApp.');
    };

    const onDashboard = location.pathname === '/portal/dashboard';

    return (
        <div className="flex min-h-screen bg-bg-dark font-sans text-text-main">
            <aside className="w-20 lg:w-64 sheet-sidebar fixed lg:static inset-y-0 left-0 z-50 flex flex-col">
                <div className="h-[73px] flex items-center justify-center lg:justify-start lg:px-6 rule-b">
                    <GraduationCap size={24} className="text-primary shrink-0" />
                    <span className="ml-2 font-bold text-lg hidden lg:block">Portal do aluno</span>
                </div>

                <nav className="flex-1 p-3">
                    <Link
                        to="/portal/dashboard"
                        aria-current={onDashboard ? 'page' : undefined}
                        className={`nav-item ${onDashboard ? 'active' : ''} justify-center lg:justify-start`}
                        title="Painel"
                    >
                        <LayoutDashboard size={19} className="shrink-0" />
                        <span className="hidden lg:block">Painel</span>
                    </Link>
                </nav>

                <div className="p-3 rule-t">
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <UserCircle size={30} className="text-text-muted shrink-0" />
                        <div className="hidden lg:block min-w-0">
                            <p className="text-sm font-semibold text-text-main truncate">{student?.name}</p>
                            <p className="text-xs text-text-muted truncate">{student?.username}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSupportClick}
                        className="btn btn-outline w-full text-primary justify-center lg:justify-start mb-1.5"
                        title="Suporte via WhatsApp"
                    >
                        <MessageCircle size={17} />
                        <span className="hidden lg:block">Suporte</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="btn btn-ghost w-full justify-center lg:justify-start"
                        title="Sair da conta"
                    >
                        <LogOut size={17} />
                        <span className="hidden lg:block">Sair</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto h-screen ml-20 lg:ml-0">
                <div className="p-4 lg:p-8 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
