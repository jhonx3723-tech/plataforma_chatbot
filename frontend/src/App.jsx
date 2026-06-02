import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { API_BASE } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import FlowEditor from './pages/FlowEditor';
import Inbox from './pages/Inbox';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';
import Contacts from './pages/Contacts';
import CRM from './pages/CRM';

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

// ── Registro Service Worker + Push Subscription ───────────────────────────────
function PushManager() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function setup() {
      try {
        // 1. Registrar service worker
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

        // 2. Escuchar mensajes del SW (navegación desde notificación)
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.type === 'PUSH_NAVIGATE') navigate(e.data.url);
        });

        // 3. Solicitar permiso de notificaciones
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // 4. Obtener clave pública VAPID
        const res = await fetch(`${API_BASE}/push/vapid-key`);
        const { publicKey } = await res.json();

        // 5. Suscribir al push
        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // 6. Guardar suscripción en el servidor
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/push/subscribe`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ subscription: sub }),
        });
      } catch { /* browser no soportado o usuario denegó */ }
    }

    setup();
  }, [user?.id]);

  return null;
}

function urlBase64ToUint8Array(base64String) {
  const padding  = '='.repeat((4 - base64String.length % 4) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export default function App() {
  return (
    <AuthProvider>
      <PushManager />
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
          <Route path="companies" element={<ProtectedRoute adminOnly><Companies /></ProtectedRoute>} />
          <Route path="users"     element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="reports"   element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="admin"     element={<ProtectedRoute companyAdminAllowed><AdminPanel /></ProtectedRoute>} />
          <Route path="contacts"  element={<Contacts />} />
          <Route path="crm"       element={<CRM />} />
          <Route path="inbox"     element={<Inbox />} />
        </Route>
        <Route path="/flows/:flowId" element={<ProtectedRoute companyAdminAllowed><FlowEditor /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
