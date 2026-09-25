import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Bot, Users, ArrowRight, TrendingUp, Zap,
  Activity, MessageSquare, UserCheck, Calendar, Sparkles,
} from 'lucide-react';
import { companiesAPI, dashboardAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([companiesAPI.getAll(), dashboardAPI.getStats()])
      .then(([c, s]) => { setCompanies(c); setStats(s); })
      .finally(() => setLoading(false));
  }, []);

  const capacity = Math.round(((stats?.totalCompanies || 0) / 50) * 100);

  return (
    <div className="p-6 max-w-5xl space-y-6 animate-slide-up">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl text-white"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 35%, #4338ca 70%, #6366f1 100%)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        }}>
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%)' }} />
        {/* Floating orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/3 translate-x-1/4 blur-3xl"
          style={{ background: 'rgba(129,140,248,0.25)' }} />
        <div className="absolute bottom-0 left-20 w-40 h-40 rounded-full translate-y-1/2 blur-2xl"
          style={{ background: 'rgba(167,139,250,0.2)' }} />

        <div className="relative z-10 p-7 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-brand-200 uppercase tracking-widest bg-white/10 border border-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <Sparkles size={10} /> Super Admin
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-1.5">
              Hola, {user?.username} 👋
            </h1>
            <p className="text-brand-200 text-sm font-medium">
              Administra tus empresas y chatbots desde aquí.
            </p>

            {/* Quick stats inline */}
            <div className="flex items-center gap-4 mt-5">
              {[
                { label: 'Empresas', value: loading ? '—' : stats?.totalCompanies ?? 0 },
                { label: 'Conversaciones', value: loading ? '—' : stats?.activeConversations ?? 0 },
                { label: 'Mensajes hoy', value: loading ? '—' : stats?.messagesToday ?? 0 },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <p className="text-2xl font-black text-white">{item.value}</p>
                  <p className="text-[10px] text-brand-300 font-semibold mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              <Activity size={28} className="text-white" />
            </div>
            <span className="text-[10px] text-brand-300 font-semibold bg-white/10 px-2 py-0.5 rounded-full">
              En vivo
            </span>
          </div>
        </div>
      </div>

      {/* ── Métricas del día ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={13} className="text-brand-500" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hoy</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Mensajes"      value={loading ? null : stats?.messagesToday       ?? 0} icon={MessageSquare} color="brand"   />
          <MiniStat label="Conversaciones"value={loading ? null : stats?.newConvsToday       ?? 0} icon={Zap}           color="violet"  />
          <MiniStat label="Con agente"    value={loading ? null : stats?.humanConversations  ?? 0} icon={UserCheck}     color="amber"   />
          <MiniStat label="Bot→Humano"    value={loading ? null : `${stats?.botToHumanRate   ?? 0}%`} icon={TrendingUp} color="emerald" />
        </div>
      </div>

      {/* ── Stats principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Empresas registradas"
          value={loading ? null : stats?.totalCompanies ?? 0}
          sub={`${stats?.activeCompanies ?? 0} activas`} color="brand" />
        <StatCard icon={Bot} label="Conversaciones activas"
          value={loading ? null : stats?.activeConversations ?? 0}
          sub={`${stats?.botConversations ?? 0} bot · ${stats?.humanConversations ?? 0} agente`} color="emerald" />
        <StatCard icon={TrendingUp} label="Capacidad usada"
          value={loading ? null : `${capacity}%`}
          sub="del plan (50 empresas)" color="violet" progress={capacity} />
      </div>

      {/* ── Empresas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {stats?.topCompanies?.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <span className="icon-box-brand w-6 h-6 rounded-lg"><TrendingUp size={12} className="text-white" /></span>
              Top activas
            </h2>
            <div className="space-y-3">
              {stats.topCompanies.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: i === 0 ? 'linear-gradient(135deg,#818cf8,#4f46e5)' : i === 1 ? 'linear-gradient(135deg,#a78bfa,#7c3aed)' : '#e2e8f0', color: i < 2 ? 'white' : '#64748b' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{c.name}</p>
                    <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((c.count / (stats.topCompanies[0]?.count || 1)) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #818cf8, #4f46e5)',
                        }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`card overflow-hidden ${stats?.topCompanies?.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="icon-box-brand w-7 h-7 rounded-lg"><Zap size={13} className="text-white" /></span>
              <h2 className="font-bold text-slate-800 text-sm">Empresas registradas</h2>
            </div>
            <Link to="/companies"
              className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-bold transition-colors bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-50">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center px-5 py-4 gap-3">
                  <div className="w-9 h-9 rounded-xl shimmer" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 shimmer rounded w-1/3" />
                    <div className="h-2 shimmer rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
                <Bot size={26} className="text-brand-400" />
              </div>
              <p className="text-slate-500 font-semibold text-sm">No hay empresas aún</p>
              <Link to="/companies" className="mt-3 inline-block text-brand-500 text-sm font-bold hover:underline">
                Crear primera empresa →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-50/80">
              {companies.slice(0, 8).map((c, i) => (
                <div key={c.id} className="flex items-center px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                  <div className="w-9 h-9 rounded-xl text-white flex items-center justify-center font-black text-sm mr-3 flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${['#818cf8','#a78bfa','#34d399','#fbbf24','#f472b6'][i % 5]}, ${['#4f46e5','#7c3aed','#059669','#d97706','#db2777'][i % 5]})`, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-brand-600 transition-colors">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    c.active
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
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

/* ── MiniStat ─────────────────────────────────────────────────────────────── */
function MiniStat({ label, value, icon: Icon, color }) {
  const cfg = {
    brand:   { from: '#818cf8', to: '#4f46e5', light: '#eef2ff', text: '#4338ca' },
    violet:  { from: '#a78bfa', to: '#7c3aed', light: '#f5f3ff', text: '#6d28d9' },
    amber:   { from: '#fbbf24', to: '#d97706', light: '#fffbeb', text: '#b45309' },
    emerald: { from: '#34d399', to: '#059669', light: '#ecfdf5', text: '#047857' },
  }[color];

  return (
    <div className="card card-hover p-4 relative overflow-hidden group">
      {/* subtle gradient bg */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${cfg.light} 0%, transparent 100%)` }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})`, boxShadow: `0 4px 10px ${cfg.from}40` }}>
            <Icon size={14} className="text-white" />
          </div>
        </div>
        {value === null ? (
          <div className="h-7 w-12 shimmer rounded-lg mb-1" />
        ) : (
          <p className="text-2xl font-black leading-none" style={{ color: cfg.text }}>{value}</p>
        )}
        <p className="text-xs text-slate-500 font-medium mt-1.5">{label}</p>
      </div>
    </div>
  );
}

/* ── StatCard ─────────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, progress }) {
  const cfg = {
    brand:   { from: '#818cf8', to: '#4338ca', glow: 'rgba(99,102,241,0.3)'   },
    emerald: { from: '#34d399', to: '#059669', glow: 'rgba(16,185,129,0.25)'  },
    violet:  { from: '#a78bfa', to: '#7c3aed', glow: 'rgba(139,92,246,0.25)' },
  }[color];

  return (
    <div className="card card-hover p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})` }} />

      <div className="relative z-10">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `linear-gradient(135deg, ${cfg.from}, ${cfg.to})`, boxShadow: `0 6px 16px ${cfg.glow}` }}>
          <Icon size={20} className="text-white" />
        </div>

        {value === null ? (
          <div className="h-9 w-16 shimmer rounded-xl mb-1" />
        ) : (
          <p className="text-4xl font-black text-slate-900 leading-none">{value}</p>
        )}
        <p className="text-sm font-bold text-slate-600 mt-1.5">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}

        {progress !== undefined && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400 font-semibold">Uso del plan</span>
              <span className="text-[10px] font-bold" style={{ color: cfg.from }}>{progress}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(progress, 100)}%`, background: `linear-gradient(90deg, ${cfg.from}, ${cfg.to})` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
