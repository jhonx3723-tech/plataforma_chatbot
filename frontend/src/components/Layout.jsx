import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, MessageSquareMore, LogOut, Users, Inbox,
  KeyRound, BarChart2, ShieldCheck, Menu, X, UserRound, ChevronDown, Kanban,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ui/ChangePasswordModal';
import { availabilityAPI, companiesAPI } from '../lib/api';

const ROLE_BADGE = {
  super_admin:   { label: 'Super Admin',   cls: 'bg-brand-500/20 text-brand-300 border-brand-500/30'      },
  company_admin: { label: 'Administrador', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  company_agent: { label: 'Agente',        cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30'    },
};

export default function Layout() {
  const { user, logout, isSuperAdmin, isCompanyAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statuses, setStatuses]           = useState([]);
  const [myStatus, setMyStatus]           = useState(null); // { name, color }
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [crmEnabled,     setCrmEnabled]     = useState(false);
  const [webhookHealthy, setWebhookHealthy] = useState(true);
  const statusRef = useRef(null);

  // Load company statuses + features on mount (only for non-super_admin)
  useEffect(() => {
    if (isSuperAdmin || !user?.company_id) return;
    availabilityAPI.getStatuses(user.company_id)
      .then(data => {
        setStatuses(data);
        if (user.availability_status) {
          const found = data.find(s => s.name === user.availability_status);
          if (found) setMyStatus({ name: found.name, color: found.color });
        }
      })
      .catch(() => {});
    companiesAPI.get(user.company_id)
      .then(c => setCrmEnabled(!!c.crm_enabled))
      .catch(() => {});

    // Verificar salud del webhook cada 5 minutos
    async function checkHealth() {
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(`/api/conversations/health?company_id=${user.company_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return;
        const data = await r.json();
        setWebhookHealthy(data.webhook?.healthy !== false);
      } catch {}
    }
    checkHealth();
    const healthInterval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(healthInterval);
  }, [user?.company_id, isSuperAdmin]);

  // Close dropdown on outside click
  useEffect(() => {
    function h(e) { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusMenu(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function handleSetStatus(s) {
    setShowStatusMenu(false);
    const next = s ? { name: s.name, color: s.color } : null;
    setMyStatus(next);
    const newStatus = s?.name || null;
    await availabilityAPI.setMine(newStatus).catch(() => {});
    // Persistir en localStorage para que sobreviva recargas de página
    refreshUser({ availability_status: newStatus });
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    ...(isSuperAdmin ? [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'          },
      { to: '/companies', icon: Building2,       label: 'Empresas'           },
      { to: '/users',     icon: Users,           label: 'Usuarios'           },
      { to: '/reports',   icon: BarChart2,       label: 'Reportes'           },
    ] : []),
    ...(isCompanyAdmin ? [
      { to: '/admin',     icon: ShieldCheck,     label: 'Panel Admin'        },
    ] : []),
    ...(!isSuperAdmin ? [
      { to: '/contacts',  icon: UserRound,       label: 'Contactos'          },
    ] : []),
    ...(!isSuperAdmin && crmEnabled ? [
      { to: '/crm',       icon: Kanban,          label: 'CRM'                },
    ] : []),
    { to: '/inbox', icon: Inbox, label: 'Bandeja de entrada' },
  ];

  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.company_agent;

  // Badge de alerta si el webhook no está saludable
  const WebhookAlert = () => !isSuperAdmin && !webhookHealthy ? (
    <div className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 bg-red-900/40 border border-red-700/50 rounded-xl">
      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-red-300">WhatsApp sin actividad</p>
        <p className="text-[9px] text-red-400">+2h sin mensajes entrantes</p>
      </div>
    </div>
  ) : null;

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/40 ring-1 ring-brand-400/20">
            <MessageSquareMore size={17} className="text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">BotBuilder</span>
            <p className="text-[10px] text-slate-500 leading-none mt-0.5">by Cato Creativo</p>
          </div>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2 mt-1">
          Menú
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-500/10 text-brand-300 border-l-2 border-brand-400 pl-[10px]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border-l-2 border-transparent pl-[10px]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-brand-400' : 'text-slate-500'} />
                <span className="flex-1">{label}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Perfil + acciones */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-1 mb-1">
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-400/30 text-brand-300 flex items-center justify-center font-bold text-sm">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            {myStatus && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900"
                style={{ backgroundColor: myStatus.color }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
            {user?.email && (
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            )}
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-0.5 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>

        <WebhookAlert />

        {/* Estado de disponibilidad */}
        {!isSuperAdmin && statuses.length > 0 && (
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setShowStatusMenu(v => !v)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: myStatus?.color || '#94a3b8' }}
              />
              <span className="flex-1 text-left text-slate-300 text-xs truncate">
                {myStatus?.name || 'Sin estado'}
              </span>
              <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />
            </button>
            {showStatusMenu && (
              <div className="absolute bottom-full mb-1 left-0 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
                {statuses.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSetStatus(s)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-700 transition-colors text-left"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-sm text-slate-200">{s.name}</span>
                    {myStatus?.name === s.name && <span className="ml-auto text-brand-400 text-xs">✓</span>}
                  </button>
                ))}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => handleSetStatus(null)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-700 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-400">Sin estado</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setShowChangePwd(true)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
        >
          <KeyRound size={15} />
          Cambiar contraseña
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* ── Overlay móvil ──────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (fijo) ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-slate-900 flex-col border-r border-slate-800">
        <SidebarContent />
      </aside>

      {/* ── Sidebar móvil/tablet (slide-over) ─────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 flex flex-col border-r border-slate-800
        transform transition-transform duration-300 ease-in-out lg:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      {/* ── Área principal ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar móvil/tablet */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
              <MessageSquareMore size={13} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm">BotBuilder</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
