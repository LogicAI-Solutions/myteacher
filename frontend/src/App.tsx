import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, type Permission } from './context/AuthContext';
import { Loading } from './components/Loading';

// Pages — carregadas por rota. Cada página traz sua própria dependência pesada
// (MUI no login, recharts no dashboard, html2canvas nos alunos) e nenhuma
// precisa estar no bundle inicial.
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Classes = lazy(() => import('./pages/Classes').then(m => ({ default: m.Classes })));
const Agenda = lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));
const ClassDetails = lazy(() => import('./pages/ClassDetails').then(m => ({ default: m.ClassDetails })));
const Students = lazy(() => import('./pages/Students').then(m => ({ default: m.Students })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const TrialExpired = lazy(() => import('./pages/TrialExpired').then(m => ({ default: m.TrialExpired })));
const Pricing = lazy(() => import('./pages/Pricing'));
const Register = lazy(() => import('./pages/Register'));
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess').then(m => ({ default: m.CheckoutSuccess })));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const School = lazy(() => import('./pages/School').then(m => ({ default: m.School })));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite').then(m => ({ default: m.AcceptInvite })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));

// Layouts
import { Layout } from './components/Layout';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, isTrialExpired, accessBlock } = useAuth();
  if (isLoading) return <Loading variant="fullscreen" text="Carregando..." />;
  if (isTrialExpired) return <Navigate to={accessBlock === 'SCHOOL_INACTIVE' ? '/trial-expired?escola=1' : '/trial-expired'} />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Esconder o menu não basta: a rota também respeita a permissão (o backend já devolve 403).
const RequirePerm = ({ perm, children }: { perm: Permission; children: ReactNode }) => {
  const { can } = useAuth();
  return can(perm) ? children : <Navigate to="/dashboard" replace />;
};

const RequireSchoolOwner = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  // Autônomo também entra: é onde ele cria a escola
  return !user?.school_role || user.school_role === 'owner' ? children : <Navigate to="/dashboard" replace />;
};

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  useEffect(() => {
    const home = pathname === '/';
    document.title = home ? 'MyTeacherApp | Gestão para professores particulares' : 'Minha conta | MyTeacherApp';
    document.querySelector('meta[name="robots"]')?.setAttribute('content', home ? 'index, follow' : 'noindex, follow');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (home) {
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
      }
      canonical.href = 'https://myteacherapp.com.br/';
    } else {
      canonical?.remove();
    }
  }, [pathname]);
  return (
    <Suspense fallback={<Loading variant="fullscreen" text="Carregando..." />}>
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />
      <Route path="/trial-expired" element={<TrialExpired />} />
      <Route path="/checkout/success" element={<CheckoutSuccess />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/redefinir-senha" element={<ResetPassword />} />
      <Route path="/confirmar-email" element={<VerifyEmail />} />

      {/* Protected Admin Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="classes" element={<Classes />} />
        <Route path="class/:id" element={<ClassDetails />} />
        <Route path="students" element={<Students />} />
        <Route path="payments" element={<RequirePerm perm="finance"><Payments /></RequirePerm>} />
        <Route path="escola" element={<RequireSchoolOwner><School /></RequireSchoolOwner>} />
        <Route path="admin" element={<Admin />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
