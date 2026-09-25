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
      {/* ── Logo ── */}
      <div className="px-4 py-4 flex items-center justify-between flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, transparent 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #818cf8, #4338ca)', boxShadow: '0 4px 14px rgba(99,102,241,0.5)' }}>
              <MessageSquareMore size={18} className="text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-tight">BotBuilder</span>
            <p className="text-[9px] text-slate-500 leading-none mt-0.5 font-medium tracking-wide uppercase">by Cato Creativo</p>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60">
          <X size={16} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 pb-2 pt-1">
          Navegación
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-l-2 ${
                isActive
                  ? 'border-brand-400 text-brand-200 pl-[10px]'
                  : 'border-transparent text-slate-400 hover:text-slate-100 pl-[10px]'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: 'rgba(99,102,241,0.15)' }
              : {}}
          >
            {({ isActive }) => (
              <>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                  isActive
                    ? 'bg-brand-500/20'
                    : 'bg-transparent group-hover:bg-slate-800'
                }`}>
                  <Icon size={15} className={isActive ? 'text-brand-300' : 'text-slate-500'} />
                </div>
                <span className="flex-1 text-sm">{label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Perfil + acciones ── */}
      <div className="p-3 space-y-2 border-t border-slate-800/60 flex-shrink-0">

        <WebhookAlert />

        {/* Avatar + info */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #818cf8, #6366f1)' }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            {myStatus && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900"
                style={{ backgroundColor: myStatus.color, boxShadow: `0 0 6px ${myStatus.color}` }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-100 truncate leading-tight">{user?.username}</p>
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full border mt-0.5 ${badge.cls}`}>
              {badge.label}
            </span>
          </div>
        </div>

        {/* Estado de disponibilidad */}
        {!isSuperAdmin && statuses.length > 0 && (
          <div className="relative" ref={statusRef}>
            <button onClick={() => setShowStatusMenu(v => !v)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/60 transition-all group">
              <span className="w-2 h-2 rounded-full flex-shrink-0 transition-all"
                style={{
                  backgroundColor: myStatus?.color || '#475569',
                  boxShadow: myStatus ? `0 0 6px ${myStatus.color}60` : 'none',
                }} />
              <span className="flex-1 text-left text-slate-400 group-hover:text-slate-200 text-xs font-medium truncate transition-colors">
                {myStatus?.name || 'Sin estado'}
              </span>
              <ChevronDown size={11} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
            </button>

            {showStatusMenu && (
              <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-slate-700 py-1.5 z-50 overflow-hidden"
                style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 pb-1.5 pt-0.5">Estado</p>
                {statuses.map(s => (
                  <button key={s.id} onClick={() => handleSetStatus(s)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/5 transition-colors">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color, boxShadow: `0 0 6px ${s.color}80` }} />
                    <span className="text-sm text-slate-200 font-medium flex-1 text-left">{s.name}</span>
                    {myStatus?.name === s.name && <span className="text-brand-400 text-xs font-bold">✓</span>}
                  </button>
                ))}
                <div className="border-t border-slate-800 my-1" />
                <button onClick={() => handleSetStatus(null)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-white/5 transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600 flex-shrink-0" />
                  <span className="text-sm text-slate-500">Sin estado</span>
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setShowChangePwd(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-all text-xs font-medium">
          <KeyRound size={14} /> Cambiar contraseña
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
