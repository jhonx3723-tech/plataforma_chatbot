import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Bot, Users, ArrowRight, TrendingUp, Zap, Activity, MessageSquare, UserCheck, Calendar } from 'lucide-react';
import { companiesAPI, dashboardAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [companies, setCompanies]   = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      companiesAPI.getAll(),
      dashboardAPI.getStats(),
    ]).then(([c, s]) => {
      setCompanies(c);
      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  const capacity = Math.round(((stats?.totalCompanies || 0) / 50) * 100);

  return (
    <div className="p-8 max-w-5xl">

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl mb-8 bg-slate-900 p-6 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/30 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full">
                Super Admin
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Hola, {user?.username} 👋</h1>
            <p className="text-slate-400 text-sm">Administra tus empresas y chatbots desde aquí.</p>
          </div>
          <div className="hidden sm:flex w-14 h-14 bg-brand-500/20 border border-brand-500/30 rounded-2xl items-center justify-center">
            <Activity size={24} className="text-brand-400" />
          </div>
        </div>
      </div>

      {/* Métricas de hoy */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Calendar size={12} /> Hoy
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MiniStat label="Mensajes hoy"     value={loading ? '—' : stats?.messagesToday    ?? 0} icon={MessageSquare} color="brand" />
          <MiniStat label="Conversac. nuevas" value={loading ? '—' : stats?.newConvsToday   ?? 0} icon={Zap}           color="violet" />
          <MiniStat label="Con agente"        value={loading ? '—' : stats?.humanConversations ?? 0} icon={UserCheck} color="amber" />
          <MiniStat label="Tasa bot→humano"   value={loading ? '—' : `${stats?.botToHumanRate ?? 0}%`} icon={TrendingUp} color="emerald" />
        </div>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon={Building2}
          label="Empresas registradas"
          value={loading ? '—' : stats?.totalCompanies ?? 0}
          sub={`${stats?.activeCompanies ?? 0} activas`}
          color="orange"
        />
        <StatCard
          icon={Bot}
          label="Conversaciones activas"
          value={loading ? '—' : stats?.activeConversations ?? 0}
          sub={`${stats?.botConversations ?? 0} en bot · ${stats?.humanConversations ?? 0} con agente`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Capacidad usada"
          value={loading ? '—' : `${capacity}%`}
          sub="del plan (50 empresas)"
          color="purple"
          progress={capacity}
        />
      </div>

      {/* Top empresas + lista reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top empresas por conversaciones */}
        {stats?.topCompanies?.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-brand-500" /> Top empresas activas
            </h2>
            <div className="space-y-3">
              {stats.topCompanies.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-brand-50 border border-brand-100 text-brand-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full"
                        style={{ width: `${Math.min((c.count / (stats.topCompanies[0]?.count || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500 flex-shrink-0">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de empresas recientes */}
        <div className={`card overflow-hidden ${stats?.topCompanies?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-brand-500" />
              <h2 className="font-semibold text-slate-900">Empresas recientes</h2>
            </div>
            <Link to="/companies" className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1 font-semibold transition-colors">
              Ver todas <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center px-6 py-4 gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-2 bg-slate-50 rounded w-1/4" />
                  </div>
                  <div className="h-5 w-14 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot size={28} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-semibold text-sm">No hay empresas aún</p>
              <Link to="/companies" className="mt-3 inline-block text-brand-500 text-sm font-semibold hover:underline">
                Crear primera empresa →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {companies.slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center px-6 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0 shadow-sm shadow-brand-500/20">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                  </div>
                  <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    c.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {c.active ? '● Activa' : '○ Inactiva'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }) {
  const palette = {
    brand:   { bg: 'bg-brand-50',   text: 'text-brand-600',   icon: 'text-brand-500'   },
    violet:  { bg: 'bg-violet-50',  text: 'text-violet-600',  icon: 'text-violet-500'  },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   icon: 'text-amber-500'   },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'text-emerald-500' },
  }[color];

  return (
    <div className={`${palette.bg} rounded-xl p-4 border border-white`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={14} className={palette.icon} />
      </div>
      <p className={`text-2xl font-bold ${palette.text}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, progress }) {
  const palette = {
    orange: { grad: 'from-brand-400 to-brand-600',     bg: 'bg-brand-50',   shadow: 'shadow-brand-500/20'   },
    green:  { grad: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-500/20' },
    purple: { grad: 'from-violet-400 to-violet-600',   bg: 'bg-violet-50',  shadow: 'shadow-violet-500/20'  },
  }[color];

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${palette.grad} flex items-center justify-center mb-4 shadow-md ${palette.shadow}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${palette.grad} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
