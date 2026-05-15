import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, GitBranch, TrendingUp, MessageCircle,
  CheckCircle2, Clock, Bot, Plus, KeyRound, Trash2,
  ToggleLeft, ToggleRight, RefreshCw, X, Zap, AlertCircle,
  ChevronRight, Play, Square,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, flowsAPI } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';

const TABS = [
  { key: 'reports', label: 'Reportes',  icon: BarChart2  },
  { key: 'agents',  label: 'Agentes',   icon: Users      },
  { key: 'flows',   label: 'Flujos',    icon: GitBranch  },
];

const PERIODS = [
  { value: 7,  label: 'Últimos 7 días'  },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const toast    = useToast();
  const navigate = useNavigate();

  const [tab, setTab]       = useState('reports');
  const [period, setPeriod] = useState(30);
  const [stats, setStats]   = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [agents, setAgents]     = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [flows, setFlows]       = useState([]);
  const [loadingFlows, setLoadingFlows]   = useState(false);

  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [agentForm, setAgentForm] = useState({ username: '', email: '', password: '' });
  const [savingAgent, setSavingAgent] = useState(false);

  const [pwdModal, setPwdModal] = useState(null);
  const [newPwd, setNewPwd]     = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const companyId = user?.company_id;

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await adminAPI.getStats({ period, company_id: companyId });
      setStats(data);
    } catch {
      toast.error('Error cargando estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [period, companyId]);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const data = await adminAPI.getMyAgents(companyId);
      setAgents(data);
    } catch {
      toast.error('Error cargando agentes');
    } finally {
      setLoadingAgents(false);
    }
  }, [companyId]);

  const loadFlows = useCallback(async () => {
    if (!companyId) return;
    setLoadingFlows(true);
    try {
      const data = await flowsAPI.getByCompany(companyId);
      setFlows(data);
    } catch {
      toast.error('Error cargando flujos');
    } finally {
      setLoadingFlows(false);
    }
  }, [companyId]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'agents') loadAgents(); }, [tab, loadAgents]);
  useEffect(() => { if (tab === 'flows')  loadFlows();  }, [tab, loadFlows]);

  async function handleCreateAgent(e) {
    e.preventDefault();
    setSavingAgent(true);
    try {
      await adminAPI.createAgent({ ...agentForm, role: 'company_agent', company_id: companyId });
      toast.success('Agente creado correctamente');
      setAgentForm({ username: '', email: '', password: '' });
      setShowCreateAgent(false);
      loadAgents();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al crear agente');
    } finally {
      setSavingAgent(false);
    }
  }

  async function handleToggle(agent) {
    try {
      const res = await adminAPI.toggleAgent(agent.id);
      setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, active: res.active } : a));
      toast.info(res.active ? `${agent.username} activado` : `${agent.username} desactivado`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  }

  async function handleResetPwd(e) {
    e.preventDefault();
    if (!newPwd || newPwd.length < 6) return;
    setSavingPwd(true);
    try {
      await adminAPI.resetAgentPwd(pwdModal.id, newPwd);
      toast.success('Contraseña restablecida');
      setPwdModal(null);
      setNewPwd('');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleDeleteAgent(id) {
    try {
      await adminAPI.deleteAgent(id);
      toast.success('Agente eliminado');
      loadAgents();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al eliminar');
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleToggleFlow(flow) {
    try {
      await flowsAPI.update(flow.id, { active: !flow.active });
      setFlows(prev => prev.map(f =>
        f.id === flow.id ? { ...f, active: !flow.active } : { ...f, active: false }
      ));
      toast.success(!flow.active ? 'Flujo activado' : 'Flujo desactivado');
    } catch {
      toast.error('Error al actualizar flujo');
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
          <p className="text-sm text-slate-400 mt-0.5">Supervisión y control de tu empresa</p>
        </div>

        {tab === 'reports' && (
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={e => setPeriod(Number(e.target.value))}
              className="input py-1.5 text-sm w-44"
            >
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <button onClick={loadStats} disabled={loadingStats}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors">
              <RefreshCw size={15} className={loadingStats ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: REPORTES ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse h-20" />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total convs." value={stats.totals.total}  icon={MessageCircle} color="brand"   />
                <StatCard label="Hoy"           value={stats.totals.today} icon={TrendingUp}    color="blue"    />
                <StatCard label="Abiertas"      value={stats.totals.open}  icon={AlertCircle}   color="yellow"  />
                <StatCard label="Pendientes"    value={stats.totals.pending} icon={Clock}        color="orange"  />
                <StatCard label="Cerradas"      value={stats.totals.closed} icon={CheckCircle2} color="slate"   />
                <StatCard label="Bot activo"    value={stats.totals.bot}   icon={Bot}            color="violet"  />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Gráfica de área — conversaciones por día */}
                <div className="lg:col-span-2 card p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={15} className="text-brand-500" />
                    Conversaciones por día
                  </h3>
                  <div className="h-44">
                    <AreaChart data={stats.by_day} />
                  </div>
                </div>

                {/* Donut — por estado */}
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart2 size={15} className="text-brand-500" />
                    Por estado
                  </h3>
                  <DonutChart data={stats.by_status} />
                </div>
              </div>

              {/* Barras por agente */}
              {stats.by_agent.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={15} className="text-brand-500" />
                    Mensajes enviados por agente — últimos {period} días
                  </h3>
                  <AgentBars data={stats.by_agent} />
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── TAB: AGENTES ── */}
      {tab === 'agents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{agents.length} agente{agents.length !== 1 ? 's' : ''} registrado{agents.length !== 1 ? 's' : ''}</p>
            <button onClick={() => setShowCreateAgent(v => !v)}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={15} />
              Nuevo agente
            </button>
          </div>

          {showCreateAgent && (
            <div className="card p-5 border-2 border-brand-100">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={15} className="text-brand-500" /> Crear agente
              </h3>
              <form onSubmit={handleCreateAgent} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Usuario *</label>
                    <input className="input" placeholder="nombre.agente" required
                      value={agentForm.username}
                      onChange={e => setAgentForm(f => ({ ...f, username: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Email (opcional)</label>
                    <input className="input" type="email" placeholder="agente@empresa.com"
                      value={agentForm.email}
                      onChange={e => setAgentForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Contraseña *</label>
                    <input className="input" type="password" placeholder="Mín. 6 caracteres" minLength={6} required
                      value={agentForm.password}
                      onChange={e => setAgentForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreateAgent(false)} className="btn-secondary text-sm">Cancelar</button>
                  <button type="submit" disabled={savingAgent} className="btn-primary text-sm">
                    {savingAgent ? 'Creando...' : 'Crear agente'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loadingAgents ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="card p-4 h-16 animate-pulse" />)}
            </div>
          ) : agents.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Users size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No hay agentes registrados</p>
              <p className="text-xs text-slate-400 mt-0.5">Crea el primer agente para que atienda conversaciones</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map(agent => {
                const agentStats = stats?.by_agent?.find(a => a.name === agent.username);
                return (
                  <div key={agent.id}
                    className={`card flex items-center justify-between gap-4 px-5 py-4 ${!agent.active ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {agent.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{agent.username}</p>
                          {!agent.active && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                              Desactivado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                          {agent.email && <span>{agent.email}</span>}
                          {agentStats && (
                            <>
                              <span className="flex items-center gap-1">
                                <MessageCircle size={10} /> {agentStats.messages} mensajes
                              </span>
                              <span className="flex items-center gap-1">
                                <Users size={10} /> {agentStats.conversations} convs.
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => handleToggle(agent)} title={agent.active ? 'Desactivar' : 'Activar'}
                        className={`p-2 rounded-xl transition-colors ${agent.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}>
                        {agent.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button onClick={() => { setPwdModal(agent); setNewPwd(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                        <KeyRound size={12} /> Acceso
                      </button>
                      <button onClick={() => setConfirmDelete(agent)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FLUJOS ── */}
      {tab === 'flows' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{flows.length} flujo{flows.length !== 1 ? 's' : ''} configurado{flows.length !== 1 ? 's' : ''}</p>
          </div>

          {loadingFlows ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="card p-4 h-20 animate-pulse" />)}
            </div>
          ) : flows.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <GitBranch size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No hay flujos configurados</p>
              <p className="text-xs text-slate-400 mt-0.5">Contacta al super administrador para crear flujos</p>
            </div>
          ) : (
            <div className="space-y-2">
              {flows.map(flow => (
                <div key={flow.id} className="card flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      flow.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <GitBranch size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{flow.name}</p>
                        {flow.active ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 flex-shrink-0">
                            <Zap size={8} /> Activo
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex-shrink-0">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {flow.nodes?.length || 0} nodos · actualizado {new Date(flow.updated_at || flow.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleFlow(flow)}
                      title={flow.active ? 'Desactivar flujo' : 'Activar como flujo principal'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors font-medium ${
                        flow.active
                          ? 'text-red-500 border-red-200 hover:bg-red-50'
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                      }`}>
                      {flow.active ? <><Square size={11} /> Desactivar</> : <><Play size={11} /> Activar</>}
                    </button>
                    <button
                      onClick={() => navigate(`/flows/${flow.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                      Editar <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal restablecer contraseña */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                  <KeyRound size={16} className="text-brand-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Restablecer acceso</h3>
                  <p className="text-xs text-slate-500">{pwdModal.username}</p>
                </div>
              </div>
              <button onClick={() => setPwdModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleResetPwd} className="space-y-3">
              <input className="input w-full" type="password"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                minLength={6} required autoFocus />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setPwdModal(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={savingPwd} className="btn-primary">
                  {savingPwd ? 'Guardando...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar agente"
          message={`¿Eliminar a "${confirmDelete.username}"? Esta acción no se puede deshacer.`}
          danger confirmText="Eliminar"
          onConfirm={() => handleDeleteAgent(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── Componentes de gráficas ──────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }) {
  const styles = {
    brand:  { card: 'border-brand-100',  icon: 'bg-brand-50 text-brand-500',   val: 'text-brand-700'   },
    blue:   { card: 'border-blue-100',   icon: 'bg-blue-50 text-blue-500',     val: 'text-blue-700'    },
    yellow: { card: 'border-amber-100',  icon: 'bg-amber-50 text-amber-500',   val: 'text-amber-700'   },
    orange: { card: 'border-orange-100', icon: 'bg-orange-50 text-orange-500', val: 'text-orange-700'  },
    slate:  { card: 'border-slate-200',  icon: 'bg-slate-100 text-slate-500',  val: 'text-slate-700'   },
    violet: { card: 'border-violet-100', icon: 'bg-violet-50 text-violet-500', val: 'text-violet-700'  },
  }[color] || {};

  return (
    <div className={`card px-4 py-3 border ${styles.card}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${styles.icon}`}>
        <Icon size={13} />
      </div>
      <p className={`text-2xl font-bold ${styles.val}`}>{value ?? 0}</p>
      <p className="text-xs text-slate-400 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function AreaChart({ data }) {
  if (!data || data.length === 0) return null;
  const W = 560, H = 160, pl = 32, pr = 12, pt = 8, pb = 28;
  const iW = W - pl - pr;
  const iH = H - pt - pb;
  const maxVal = Math.max(...data.map(d => d.count), 1);

  const pts = data.map((d, i) => ({
    x: pl + (i / Math.max(data.length - 1, 1)) * iW,
    y: pt + iH - (d.count / maxVal) * iH,
    ...d,
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(pt + iH).toFixed(1)} L${pts[0].x.toFixed(1)},${(pt + iH).toFixed(1)} Z`;

  const step = Math.ceil(data.length / 7);
  const yTicks = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Grid horizontal */}
      {yTicks.map(f => (
        <line key={f} x1={pl} y1={pt + iH * (1 - f)} x2={W - pr} y2={pt + iH * (1 - f)}
          stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {/* Y labels */}
      {yTicks.map(f => (
        <text key={f} x={pl - 4} y={pt + iH * (1 - f) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
          {Math.round(maxVal * f)}
        </text>
      ))}
      {/* Area */}
      <path d={area} fill="url(#ag)" />
      {/* Line */}
      <path d={line} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.filter(p => p.count > 0).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f97316" />
      ))}
      {/* X labels */}
      {pts.filter((_, i) => i % step === 0).map((p, i) => (
        <text key={i} x={p.x} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {p.date?.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ data }) {
  const COLORS = { open: '#3b82f6', pending: '#f59e0b', closed: '#64748b', bot: '#8b5cf6' };
  const LABELS = { open: 'Abiertas', pending: 'Pendientes', closed: 'Cerradas', bot: 'Bot' };
  const total  = Object.values(data).reduce((s, v) => s + v, 0);

  if (total === 0) return (
    <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Sin datos aún</div>
  );

  const r = 34, cx = 50, cy = 50, circ = 2 * Math.PI * r;
  let cumPct = 0;
  const segments = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([key, val]) => {
      const pct = val / total;
      const seg = { key, val, pct, offset: cumPct * circ, len: pct * circ, color: COLORS[key] };
      cumPct += pct;
      return seg;
    });

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 100 100" className="w-32 h-32 flex-shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        {segments.map(s => (
          <circle key={s.key} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth="12"
            strokeDasharray={`${s.len.toFixed(2)} ${(circ - s.len).toFixed(2)}`}
            strokeDashoffset={-s.offset.toFixed(2)}
          />
        ))}
      </svg>
      <div className="space-y-2 flex-1">
        {Object.entries(data).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[key] }} />
              <span className="text-slate-600">{LABELS[key]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{val}</span>
              <span className="text-slate-400 w-8 text-right">
                {total > 0 ? Math.round(val / total * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentBars({ data }) {
  const max = Math.max(...data.map(d => d.messages), 1);
  return (
    <div className="space-y-3">
      {data.map((agent, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
            {agent.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 truncate">{agent.name}</span>
              <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0 ml-3">
                <span>{agent.messages} msgs.</span>
                <span>{agent.conversations} convs.</span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-400 to-violet-600 rounded-full transition-all"
                style={{ width: `${(agent.messages / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
