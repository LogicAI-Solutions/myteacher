import { useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LogOut, LayoutDashboard, GraduationCap, ChevronLeft, ChevronRight, Settings, UserCircle, DollarSign, MessageCircle, Users, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { openSupportWhatsApp } from '../utils/support';

type NavEntry = {
    to: string;
    label: string;
    short: string;
    icon: typeof LayoutDashboard;
    match: (path: string) => boolean;
    adminOnly?: boolean;
};

// Uma lista só: a sidebar e a barra inferior liam o mesmo destino de dois
// lugares diferentes, e foi assim que o "Painel" do mobile acabou apontando
// para o portal do aluno.
const NAV: NavEntry[] = [
    { to: '/dashboard', label: 'Painel', short: 'Painel', icon: LayoutDashboard, match: p => p === '/dashboard' },
    { to: '/dashboard/agenda', label: 'Agenda', short: 'Agenda', icon: Calendar, match: p => p.includes('/agenda') },
    { to: '/dashboard/classes', label: 'Turmas', short: 'Turmas', icon: GraduationCap, match: p => p.includes('/classes') || p.includes('/class/') },
    { to: '/dashboard/students', label: 'Alunos', short: 'Alunos', icon: Users, match: p => p.includes('/students') },
    { to: '/dashboard/payments', label: 'Financeiro', short: 'Financeiro', icon: DollarSign, match: p => p.includes('/payments') },
    { to: '/dashboard/admin', label: 'Administração', short: 'Admin', icon: Settings, match: p => p.includes('/admin'), adminOnly: true },
];

export const Layout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const entries = NAV.filter(e => !e.adminOnly || user?.is_admin);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSupportClick = () => {
        openSupportWhatsApp('Olá! Preciso de ajuda com o MyTeacherApp.');
    };

    return (
        <div className="flex h-screen bg-bg-dark overflow-hidden relative">
            {/* Sidebar */}
            <aside
                className={`
                    hidden md:flex sheet-sidebar flex-col transition-[width] duration-300 ease-in-out
                    ${isSidebarCollapsed ? 'w-[70px]' : 'w-[260px]'}
                `}
            >
                <div className="h-[73px] flex items-center relative rule-b">
                    <div className={`flex items-center gap-2 font-bold text-xl transition-colors duration-150 ${isSidebarCollapsed ? 'justify-center w-full px-0' : 'px-6'}`}>
                        <GraduationCap size={24} className="shrink-0 text-primary" />
                        <span className={`whitespace-nowrap overflow-hidden transition-[width,opacity] duration-300 ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            MyTeacherApp
                        </span>
                    </div>

                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-bg-card border border-rule-strong rounded-[2px] p-1.5 hidden md:flex text-text-muted hover:text-text-main hover:border-primary transition-colors duration-150 z-10"
                        aria-label={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                </div>

                <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
                    {entries.map(({ to, label, icon: Icon, match }) => {
                        const active = match(location.pathname);
                        return (
                            <Link
                                key={to}
                                to={to}
                                aria-current={active ? 'page' : undefined}
                                className={`nav-item ${active ? 'active' : ''} ${isSidebarCollapsed ? 'justify-center gap-0' : 'gap-3'}`}
                                title={label}
                            >
                                <Icon size={19} className="shrink-0" />
                                <span className={`whitespace-nowrap transition-[width,opacity] duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>
                                    {label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 rule-t space-y-1.5">
                    <Link
                        to="/dashboard/profile"
                        className={`flex items-center gap-3 px-2 py-2 rounded-[2px] transition-colors duration-150 group ${location.pathname === '/dashboard/profile' ? 'bg-[var(--wash-2)]' : 'hover:bg-[var(--wash-1)]'}`}
                        title="Meu perfil"
                    >
                        <div className="shrink-0">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="w-9 h-9 rounded-full border border-border object-cover" />
                            ) : (
                                <UserCircle size={34} className="text-text-muted group-hover:text-primary transition-colors" />
                            )}
                        </div>
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-text-main truncate group-hover:text-primary transition-colors">
                                    {user?.full_name || 'Usuário'}
                                </span>
                                <span className="text-xs text-text-muted truncate">{user?.email}</span>
                            </div>
                        )}
                    </Link>

                    <button
                        onClick={handleSupportClick}
                        className={`btn btn-outline w-full text-primary ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                        title="Suporte via WhatsApp"
                    >
                        <MessageCircle size={17} />
                        {!isSidebarCollapsed && <span>Suporte</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className={`btn btn-ghost w-full ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                        title="Sair da conta"
                    >
                        <LogOut size={17} />
                        {!isSidebarCollapsed && <span>Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Barra inferior flutuante no celular. Destinos principais + avatar;
                o avatar abre perfil, admin (se houver), suporte e sair. */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsProfileOpen(false)} />
            )}
            <nav
                className="md:hidden fixed left-3 right-3 z-50 sheet-footer-nav rounded-full shadow-lg flex items-stretch justify-around px-2"
                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
            >
                {entries.filter(e => !e.adminOnly).map(({ to, short, icon: Icon, match }) => {
                    const active = match(location.pathname);
                    return (
                        <Link
                            key={to}
                            to={to}
                            aria-current={active ? 'page' : undefined}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors duration-150 ${
                                active ? 'text-primary' : 'text-text-muted'
                            }`}
                        >
                            <Icon size={19} />
                            <span className="text-[0.6875rem] font-medium tracking-[0.03em]">{short}</span>
                        </Link>
                    );
                })}
                <button
                    onClick={() => setIsProfileOpen(o => !o)}
                    aria-expanded={isProfileOpen}
                    aria-label="Menu do perfil"
                    className="flex items-center justify-center px-2 flex-1"
                >
                    {user?.avatar ? (
                        <img src={user.avatar} alt="" className={`w-8 h-8 rounded-full object-cover border-2 ${isProfileOpen || location.pathname === '/dashboard/profile' ? 'border-primary' : 'border-border'}`} />
                    ) : (
                        <UserCircle size={28} className={isProfileOpen || location.pathname === '/dashboard/profile' ? 'text-primary' : 'text-text-muted'} />
                    )}
                </button>

                {isProfileOpen && (
                    <div className="absolute bottom-full right-0 mb-3 w-60 sheet-footer-nav rounded-3xl shadow-lg p-2 flex flex-col gap-0.5">
                        <div className="flex items-center gap-3 px-3 py-2 rule-b mb-1">
                            {user?.avatar ? (
                                <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                            ) : (
                                <UserCircle size={36} className="text-text-muted" />
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-text-main truncate">{user?.full_name || 'Usuário'}</span>
                                <span className="text-xs text-text-muted truncate">{user?.email}</span>
                            </div>
                        </div>
                        {entries.filter(e => e.adminOnly).map(({ to, label, icon: Icon, match }) => (
                            <Link key={to} to={to} onClick={() => setIsProfileOpen(false)} className={`nav-item ${match(location.pathname) ? 'active' : ''}`}>
                                <Icon size={19} /> {label}
                            </Link>
                        ))}
                        <Link to="/dashboard/profile" onClick={() => setIsProfileOpen(false)} className={`nav-item ${location.pathname === '/dashboard/profile' ? 'active' : ''}`}>
                            <UserCircle size={19} /> Meu perfil
                        </Link>
                        <button onClick={() => { setIsProfileOpen(false); handleSupportClick(); }} className="nav-item text-primary">
                            <MessageCircle size={19} /> Suporte
                        </button>
                        <button onClick={handleLogout} className="nav-item">
                            <LogOut size={19} /> Sair
                        </button>
                    </div>
                )}
            </nav>

            <main className="flex-1 overflow-auto px-3 py-4 sm:p-4 md:p-6 lg:p-8 pb-28 md:pb-6 lg:pb-8 w-full h-screen">
                <div className={location.pathname === '/dashboard/agenda' ? 'w-full min-w-0' : 'container mx-auto max-w-6xl'}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
