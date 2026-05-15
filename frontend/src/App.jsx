import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import FlowEditor from './pages/FlowEditor';
import Inbox from './pages/Inbox';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children, adminOnly = false, companyAdminAllowed = false }) {
  const { user, loading, isSuperAdmin, isCompanyAdmin } = useAuth();
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <span className="w-8 h-8 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isSuperAdmin) {
    if (isCompanyAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/inbox" replace />;
  }
  if (companyAdminAllowed && !isSuperAdmin && !isCompanyAdmin)
    return <Navigate to="/inbox" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading, isSuperAdmin, isCompanyAdmin } = useAuth();
  if (loading) return null;
  if (!user) return children;
  if (isSuperAdmin)    return <Navigate to="/dashboard" replace />;
  if (isCompanyAdmin)  return <Navigate to="/admin" replace />;
  return <Navigate to="/inbox" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="companies" element={<ProtectedRoute adminOnly><Companies /></ProtectedRoute>} />
          <Route path="users"     element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="reports"   element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="admin"     element={<ProtectedRoute companyAdminAllowed><AdminPanel /></ProtectedRoute>} />
          <Route path="inbox"     element={<Inbox />} />
        </Route>
        <Route path="/flows/:flowId" element={<ProtectedRoute companyAdminAllowed><FlowEditor /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
