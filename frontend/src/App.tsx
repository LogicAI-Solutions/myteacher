import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentAuthProvider, useStudentAuth } from './context/StudentAuthContext';
import { Loading } from './components/Loading';
// Pages
import { Landing } from './pages/Landing';
import Login from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Classes } from './pages/Classes';
import { ClassDetails } from './pages/ClassDetails';
import { Students } from './pages/Students';
import { Payments } from './pages/Payments';
import Admin from './pages/Admin';
import { NotFound } from './pages/NotFound';
import { StudentLogin } from './pages/StudentLogin';
import { StudentDashboard } from './pages/StudentDashboard';
import { Profile } from './pages/Profile';
import { TrialExpired } from './pages/TrialExpired';
import Pricing from './pages/Pricing';

// Layouts
import { Layout } from './components/Layout';
import { StudentLayout } from './components/StudentLayout';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, isLoading, isTrialExpired } = useAuth();
  if (isLoading) return <Loading variant="fullscreen" text="Carregando..." />;
  if (isTrialExpired) return <Navigate to="/trial-expired" />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const ProtectedStudentRoute = ({ children }: { children: ReactNode }) => {
  const { student, isLoading } = useStudentAuth();
  if (isLoading) return <Loading variant="fullscreen" text="Carregando portal..." />;
  if (!student) return <Navigate to="/portal/login" />;
  return children;
};

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <StudentAuthProvider>
            <AppRoutes />
          </StudentAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/trial-expired" element={<TrialExpired />} />

      {/* Student Portal Routes */}
      <Route path="/portal/login" element={<StudentLogin />} />
      <Route path="/portal" element={
        <ProtectedStudentRoute>
          <StudentLayout />
        </ProtectedStudentRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
      </Route>

      {/* Protected Admin Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="classes" element={<Classes />} />
        <Route path="class/:id" element={<ClassDetails />} />
        <Route path="students" element={<Students />} />
        <Route path="payments" element={<Payments />} />
        <Route path="admin" element={<Admin />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
