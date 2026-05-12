import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, MessageSquareMore, LogOut, Users, Inbox, KeyRound, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChangePasswordModal from './ui/ChangePasswordModal';

const ROLE_BADGE = {
  super_admin:   { label: 'Super Admin', cls: 'bg-brand-500/20 text-brand-300 border-brand-500/30' },
  client:        { label: 'Cliente',     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  company_agent: { label: 'Agente',      cls: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
};

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [showChangePwd, setShowChangePwd] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const navItems = [
    ...(isSuperAdmin ? [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
      { to: '/companies', icon: Building2,       label: 'Empresas'         },
      { to: '/users',     icon: Users,           label: 'Usuarios'         },
      { to: '/reports',   icon: BarChart2,       label: 'Reportes'         },
    ] : []),
    { to: '/inbox', icon: Inbox, label: 'Bandeja de entrada' },
  ];

  const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.company_agent;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col border-r border-slate-800">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
              <MessageSquareMore size={17} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">BotBuilder</span>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">by Cato Creativo</p>
            </div>
          </div>
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-brand-400' : ''} />
                  {label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Perfil + acciones */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Info usuario */}
          <div className="flex items-center gap-3 px-1 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user?.username?.[0]?.toUpperCase()}
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

          {/* Cambiar contraseña (clientes y agentes) */}
          {!isSuperAdmin && (
            <button
              onClick={() => setShowChangePwd(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-slate-700"
            >
              <KeyRound size={15} />
              Cambiar contraseña
            </button>
          )}

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </div>
  );
}
