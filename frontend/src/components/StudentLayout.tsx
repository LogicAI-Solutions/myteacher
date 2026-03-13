import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext';
import { LogOut, GraduationCap, LayoutDashboard, UserCircle, MessageCircle } from 'lucide-react';

export const StudentLayout = () => {
    const { logout, student } = useStudentAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/portal/login');
    };

    const handleSupportClick = () => {
        const supportMessage = encodeURIComponent('Ola! Preciso de suporte no Portal do Aluno do MyTeacherApp.');
        window.open(`https://wa.me/5521974546156?text=${supportMessage}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex min-h-screen bg-bg-dark font-sans text-text-main relative overflow-x-hidden">
            {/* Background Orbs */}
            <div className="orb orb-primary w-96 h-96 -top-48 -left-48 fixed z-0 pointer-events-none" style={{ animationDelay: '0s' }}></div>
            <div className="orb orb-purple w-64 h-64 bottom-20 right-20 fixed z-0 pointer-events-none" style={{ animationDelay: '3s' }}></div>

            {/* Sidebar / Navigation */}
            <aside className="w-20 lg:w-64 glass-sidebar fixed lg:static inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 border-r border-white/5 bg-bg-card/50 backdrop-blur-xl">
                <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
                    <GraduationCap size={32} className="text-secondary shrink-0" />
                    <span className="ml-3 font-bold text-xl hidden lg:block text-gradient-secondary">Portal Aluno</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        to="/portal/dashboard"
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${location.pathname === '/portal/dashboard' ? 'bg-secondary/20 text-white shadow-glow-secondary' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={22} />
                        <span className="hidden lg:block font-medium">Dashboard</span>
                    </Link>

                    {/* Future links can go here, e.g. Calendar, Materials */}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary border border-secondary/30">
                            <UserCircle size={20} />
                        </div>
                        <div className="hidden lg:block overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{student?.name}</p>
                            <p className="text-xs text-text-muted truncate">{student?.username}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSupportClick}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-green-300 hover:bg-green-500/10 transition-all border border-transparent hover:border-green-400/20 mb-2"
                        title="Suporte via WhatsApp"
                    >
                        <MessageCircle size={22} />
                        <span className="hidden lg:block font-medium">Suporte</span>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-danger hover:bg-danger/10 transition-all border border-transparent hover:border-danger/20"
                        title="Sair"
                    >
                        <LogOut size={22} />
                        <span className="hidden lg:block font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative z-10 overflow-y-auto h-screen">
                <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
