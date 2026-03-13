import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, GraduationCap, Menu, X, ChevronLeft, ChevronRight, Settings, UserCircle, DollarSign, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSupportClick = () => {
        const supportMessage = encodeURIComponent('Ola! Preciso de ajuda com o MyTeacherApp.');
        window.open(`https://wa.me/5521974546156?text=${supportMessage}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex h-screen bg-bg-dark overflow-hidden relative">
            {/* Background Orbs for Glass Effect */}
            <div className="orb orb-primary w-96 h-96 -top-48 -left-48 hidden md:block" style={{ animationDelay: '0s' }}></div>
            <div className="orb orb-purple w-64 h-64 bottom-20 right-20 hidden md:block" style={{ animationDelay: '3s' }}></div>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 glass-header w-full fixed top-0 left-0 z-50">
                <h1 className="flex items-center gap-2 font-bold text-lg text-gradient">
                    <GraduationCap size={22} className="text-primary" /> MyTeacherApp
                </h1>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-text-muted hover:text-text-main rounded-xl hover:bg-white/5 transition-all duration-300">
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </header>

            {/* Sidebar Overlay */}
            {
                isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )
            }

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:static inset-y-0 left-0 z-50 glass-sidebar flex flex-col transition-all duration-300 ease-in-out
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${isSidebarCollapsed ? 'w-[70px]' : 'w-[260px]'}
                `}
            >
                {/* Desktop Logo & Toggle */}
                <div className="h-[73px] flex items-center relative px-6 border-b border-white/5">
                    <div className={`flex items-center gap-2 font-bold text-xl transition-all duration-300 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
                        <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 text-gradient ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            MyTeacherApp
                        </span>
                    </div>

                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full p-1.5 hidden md:flex text-text-muted hover:text-text-main hover:border-primary/50 transition-all shadow-md z-10 hover:bg-white/20"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>



                <nav className="flex-1 p-4 flex flex-col gap-2">
                    <Link
                        to="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`nav-link-glass ${location.pathname === '/dashboard' ? 'active text-white shadow-lg' : 'text-text-muted hover:text-text-main'} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                        title="Dashboard"
                    >
                        <LayoutDashboard size={20} className={`shrink-0 ${location.pathname === '/dashboard' ? '' : ''}`} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Dashboard</span>
                    </Link>

                    <Link
                        to="/dashboard/classes"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`nav-link-glass ${location.pathname.includes('/classes') ? 'active text-white shadow-lg' : 'text-text-muted hover:text-text-main'} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                        title="Turmas"
                    >
                        <GraduationCap size={20} className={`shrink-0 ${location.pathname.includes('/classes') ? '' : ''}`} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Turmas</span>
                    </Link>

                    <Link
                        to="/dashboard/students"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`nav-link-glass ${location.pathname.includes('/students') ? 'active text-white shadow-lg' : 'text-text-muted hover:text-text-main'} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                        title="Alunos"
                    >
                        <Users size={20} className={`shrink-0 ${location.pathname.includes('/students') ? '' : ''}`} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Alunos</span>
                    </Link>

                    <Link
                        to="/dashboard/payments"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`nav-link-glass ${location.pathname.includes('/payments') ? 'active text-white shadow-lg' : 'text-text-muted hover:text-text-main'} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                        title="Financeiro"
                    >
                        <DollarSign size={20} className={`shrink-0 ${location.pathname.includes('/payments') ? '' : ''}`} />
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Financeiro</span>
                    </Link>

                    {user?.is_admin && (
                        <Link
                            to="/dashboard/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`nav-link-glass ${location.pathname.includes('/admin') ? 'active text-white shadow-lg' : 'text-text-muted hover:text-text-main'} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                            title="Administração"
                        >
                            <Settings size={20} className={`shrink-0 ${location.pathname.includes('/admin') ? 'animate-spin-slow' : ''}`} />
                            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Administração</span>
                        </Link>
                    )}

                    {/* Profile link moved to footer next to logout */}

                    {/* Theme selector moved to Profile page */}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <Link
                        to="/dashboard/profile"
                        className={`flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-all duration-300 group ${location.pathname === '/dashboard/profile' ? 'bg-white/5' : ''}`}
                        title="Meu Perfil"
                    >
                        <div className="shrink-0 relative">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full border border-white/10 object-cover group-hover:border-primary/50 transition-colors" />
                            ) : (
                                <UserCircle size={36} className="text-text-muted group-hover:text-primary transition-colors" />
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-text-main truncate group-hover:text-primary transition-colors">
                                    {user?.full_name || 'Usuário'}
                                </span>
                                <span className="text-xs text-text-muted truncate">
                                    {user?.email}
                                </span>
                            </div>
                        )}
                    </Link>
                    <button
                        onClick={handleSupportClick}
                        className={`btn w-full text-green-300 border-green-400/20 bg-green-500/10 hover:bg-green-500/20 backdrop-blur-sm ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                        title="Suporte via WhatsApp"
                    >
                        <MessageCircle size={18} />
                        {!isSidebarCollapsed && <span>Suporte</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`btn w-full text-danger border-danger/30 bg-danger/10 hover:bg-danger/20 backdrop-blur-sm ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                        title="Sair"
                    >
                        <LogOut size={18} />
                        {!isSidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto px-3 py-4 sm:p-4 md:p-6 lg:p-8 pt-16 md:pt-6 lg:pt-8 w-full h-screen">
                <div className="container mx-auto max-w-6xl">
                    <Outlet />
                </div>
            </main>

            {/* Removed Profile Modal */}
        </div >
    );
};
