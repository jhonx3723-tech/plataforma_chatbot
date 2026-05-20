import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart2, Users, GitBranch, TrendingUp, MessageCircle,
  CheckCircle2, Clock, Bot, KeyRound, Trash2,
  ToggleLeft, ToggleRight, RefreshCw, X, Zap, AlertCircle,
  ChevronRight, Play, Square, Tag, Plus, Pencil, Bell, Save, MessageSquare,
  UserRound, Search, Building2, FileText, Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, flowsAPI, labelsAdminAPI, followUpAPI, templatesAPI, contactsAPI } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';

const TABS = [
  { key: 'reports',    label: 'Reportes',      icon: BarChart2     },
  { key: 'agents',     label: 'Agentes',        icon: Users         },
  { key: 'contacts',   label: 'Contactos',      icon: UserRound     },
  { key: 'flows',      label: 'Flujos',         icon: GitBranch     },
  { key: 'labels',     label: 'Etiquetas',      icon: Tag           },
  { key: 'templates',  label: 'Plantillas',     icon: MessageSquare },
  { key: 'followup',   label: 'Recordatorios',  icon: Bell          },
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
  const [stats, setStats]       = useState(null);
  const [csat, setCsat]         = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [agents, setAgents]     = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [flows, setFlows]       = useState([]);
  const [loadingFlows, setLoadingFlows] = useState(false);

  // Etiquetas
  const [labels, setLabels]         = useState([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labelForm, setLabelForm]   = useState({ name: '', color: '#f97316' });
  const [editingLabel, setEditingLabel] = useState(null);
  const [savingLabel, setSavingLabel]   = useState(false);
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState(null);

  const PRESET_COLORS = ['#f97316','#10b981','#3b82f6','#8b5cf6','#ec4899','#ef4444','#f59e0b','#6366f1'];

  // Plantillas
  const [templates, setTemplates]         = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [tplForm, setTplForm]             = useState({ shortcut: '', content: '' });
  const [editingTpl, setEditingTpl]       = useState(null);
  const [savingTpl, setSavingTpl]         = useState(false);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState(null);

  // Contactos
  const [contacts, setContacts]               = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch]     = useState('');
  const [editingContact, setEditingContact]   = useState(null); // { id, name, company_name, notes, phone }
  const [contactForm, setContactForm]         = useState({ name: '', company_name: '', notes: '' });
  const [savingContact, setSavingContact]     = useState(false);
  const [confirmDeleteContact, setConfirmDeleteContact] = useState(null);

  // Follow-up
  const [fuConfig, setFuConfig]     = useState({ enabled: false, hours: 2, action: 'note', message: '' });
  const [loadingFu, setLoadingFu]   = useState(false);
  const [savingFu, setSavingFu]     = useState(false);


  const [pwdModal, setPwdModal] = useState(null);
  const [newPwd, setNewPwd]     = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const companyId = user?.company_id;

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const [statsData, csatData] = await Promise.all([
        adminAPI.getStats({ period, company_id: companyId }),
        adminAPI.getCsatStats({ period, company_id: companyId }),
      ]);
      setStats(statsData);
      setCsat(csatData);
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

  const loadLabels = useCallback(async () => {
    setLoadingLabels(true);
    try { setLabels(await labelsAdminAPI.getAll(companyId)); }
    catch { toast.error('Error cargando etiquetas'); }
    finally { setLoadingLabels(false); }
  }, [companyId]);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try { setTemplates(await templatesAPI.getAll(companyId)); }
    catch { toast.error('Error cargando plantillas'); }
    finally { setLoadingTemplates(false); }
  }, [companyId]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try { setContacts(await contactsAPI.getAll({ company_id: companyId })); }
    catch { toast.error('Error cargando contactos'); }
    finally { setLoadingContacts(false); }
  }, [companyId]);

  const loadFollowUp = useCallback(async () => {
    setLoadingFu(true);
    try { const d = await followUpAPI.getConfig(); setFuConfig({ enabled: false, hours: 2, action: 'note', message: '', ...d }); }
    catch { /* sin config aún */ }
    finally { setLoadingFu(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'agents')   loadAgents();   }, [tab, loadAgents]);
  useEffect(() => { if (tab === 'contacts') loadContacts(); }, [tab, loadContacts]);
  useEffect(() => { if (tab === 'flows')    loadFlows();    }, [tab, loadFlows]);
  useEffect(() => { if (tab === 'labels')   loadLabels();   }, [tab, loadLabels]);
  useEffect(() => { if (tab === 'templates') loadTemplates(); }, [tab, loadTemplates]);
  useEffect(() => { if (tab === 'followup')  loadFollowUp();  }, [tab, loadFollowUp]);

  async function handleSaveContact(e) {
    e.preventDefault();
    if (!editingContact) return;
    setSavingContact(true);
    try {
      const updated = await contactsAPI.update(editingContact.id, contactForm);
      setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...updated } : c));
      setEditingContact(null);
      toast.success('Contacto actualizado');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al guardar');
    } finally { setSavingContact(false); }
  }

  async function handleDeleteContact(id) {
    try {
      await contactsAPI.remove(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success('Contacto eliminado');
    } catch { toast.error('Error al eliminar'); }
    finally { setConfirmDeleteContact(null); }
  }

  async function handleSaveLabel(e) {
    e.preventDefault();
    if (!labelForm.name.trim()) return;
    setSavingLabel(true);
    try {
      if (editingLabel) {
        const updated = await labelsAdminAPI.update(editingLabel.id, labelForm);
        setLabels(prev => prev.map(l => l.id === editingLabel.id ? updated : l));
        toast.success('Etiqueta actualizada');
      } else {
        const created = await labelsAdminAPI.create({ ...labelForm, company_id: companyId });
        setLabels(prev => [...prev, created]);
        toast.success('Etiqueta creada');
      }
      setLabelForm({ name: '', color: '#f97316' });
      setEditingLabel(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al guardar etiqueta');
    } finally { setSavingLabel(false); }
  }

  async function handleDeleteLabel(id) {
    try {
      await labelsAdminAPI.remove(id);
      setLabels(prev => prev.filter(l => l.id !== id));
      toast.success('Etiqueta eliminada');
    } catch { toast.error('Error al eliminar'); }
    finally { setConfirmDeleteLabel(null); }
  }

  async function handleSaveTpl(e) {
    e.preventDefault();
    if (!tplForm.shortcut.trim() || !tplForm.content.trim()) return;
    setSavingTpl(true);
    try {
      if (editingTpl) {
        const updated = await templatesAPI.update(editingTpl.id, tplForm);
        setTemplates(prev => prev.map(t => t.id === editingTpl.id ? updated : t));
        toast.success('Plantilla actualizada');
      } else {
        const created = await templatesAPI.create({ ...tplForm, company_id: companyId });
        setTemplates(prev => [...prev, created]);
        toast.success('Plantilla creada');
      }
      setTplForm({ shortcut: '', content: '' });
      setEditingTpl(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Error al guardar plantilla');
    } finally { setSavingTpl(false); }
  }

  async function handleDeleteTpl(id) {
    try {
      await templatesAPI.remove(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Plantilla eliminada');
    } catch { toast.error('Error al eliminar'); }
    finally { setConfirmDeleteTpl(null); }
  }

  async function handleSaveFollowUp(e) {
    e.preventDefault();
    setSavingFu(true);
    try {
      const saved = await followUpAPI.saveConfig(fuConfig);
      setFuConfig(prev => ({ ...prev, ...saved }));
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
    finally { setSavingFu(false); }
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

              {/* CSAT */}
              {csat && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="text-base">⭐</span>
                    Satisfacción del cliente (CSAT)
                  </h3>
                  <CsatPanel csat={csat} />
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── TAB: AGENTES ── */}
      {tab === 'agents' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{agents.length} agente{agents.length !== 1 ? 's' : ''} registrado{agents.length !== 1 ? 's' : ''}</p>

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

      {/* ── TAB: CONTACTOS ── */}
      {tab === 'contacts' && (
        <div className="space-y-4">
          {/* Buscador + contador */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="input pl-8 text-sm w-full"
              />
            </div>
            <p className="text-sm text-slate-400 flex-shrink-0">
              {contacts.filter(c =>
                !contactSearch.trim() ||
                (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
                (c.phone || '').includes(contactSearch)
              ).length} contacto{contacts.length !== 1 ? 's' : ''}
            </p>
            <button onClick={loadContacts} disabled={loadingContacts}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors flex-shrink-0">
              <RefreshCw size={14} className={loadingContacts ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Formulario de edición */}
          {editingContact && (
            <div className="card p-5 border-brand-200 bg-brand-50/30">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Pencil size={14} className="text-brand-500" />
                Editando: <span className="text-brand-600">{editingContact.phone}</span>
              </h3>
              <form onSubmit={handleSaveContact} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre</label>
                  <div className="relative">
                    <UserRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" className="input pl-7 text-sm w-full"
                      placeholder="Nombre del contacto"
                      value={contactForm.name}
                      onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Empresa cliente</label>
                  <div className="relative">
                    <Building2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" className="input pl-7 text-sm w-full"
                      placeholder="Empresa"
                      value={contactForm.company_name}
                      onChange={e => setContactForm(f => ({ ...f, company_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Notas</label>
                  <div className="relative">
                    <FileText size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input type="text" className="input pl-7 text-sm w-full"
                      placeholder="Notas internas"
                      value={contactForm.notes}
                      onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>
                <div className="sm:col-span-3 flex justify-end gap-2">
                  <button type="button" className="btn-secondary text-sm"
                    onClick={() => setEditingContact(null)}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingContact} className="btn-primary text-sm flex items-center gap-2">
                    <Save size={13} />
                    {savingContact ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista */}
          {loadingContacts ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="card p-4 h-16 animate-pulse" />)}
            </div>
          ) : (() => {
            const filtered = contacts.filter(c =>
              !contactSearch.trim() ||
              (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
              (c.phone || '').includes(contactSearch)
            );
            if (filtered.length === 0) return (
              <div className="card text-center py-12">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <UserRound size={22} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-500">
                  {contactSearch ? 'Sin resultados' : 'No hay contactos registrados'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {contactSearch ? 'Prueba con otro nombre o teléfono' : 'Los contactos se crean desde la bandeja de conversaciones'}
                </p>
              </div>
            );
            return (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Notas</th>
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {(c.name || c.phone || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate">{c.name || <span className="text-slate-400 font-normal">Sin nombre</span>}</p>
                              <p className="text-xs text-slate-400 sm:hidden">{c.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                            <Phone size={11} className="text-slate-300" />{c.phone}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs truncate max-w-[140px]">
                          {c.company_name || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs truncate max-w-[160px]">
                          {c.notes || <span className="text-slate-200">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => { setEditingContact(c); setContactForm({ name: c.name || '', company_name: c.company_name || '', notes: c.notes || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteContact(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {confirmDeleteContact && (
        <ConfirmModal
          title="Eliminar contacto"
          message={`¿Eliminar el contacto "${confirmDeleteContact.name || confirmDeleteContact.phone}"? Se perderán los datos guardados.`}
          danger confirmText="Eliminar"
          onConfirm={() => handleDeleteContact(confirmDeleteContact.id)}
          onCancel={() => setConfirmDeleteContact(null)}
        />
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

      {/* ── TAB: ETIQUETAS ── */}
      {tab === 'labels' && (
        <div className="space-y-6 max-w-2xl">
          {/* Formulario crear / editar */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Tag size={15} className="text-brand-500" />
              {editingLabel ? 'Editar etiqueta' : 'Nueva etiqueta'}
            </h3>
            <form onSubmit={handleSaveLabel} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre *</label>
                <input className="input" placeholder="Ej: Interesado, Urgente, VIP..." required
                  value={labelForm.name}
                  onChange={e => setLabelForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setLabelForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${labelForm.color === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                {labelForm.name && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: labelForm.color + '22', color: labelForm.color, border: `1px solid ${labelForm.color}44` }}>
                      {labelForm.name}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                {editingLabel && (
                  <button type="button" className="btn-secondary text-sm"
                    onClick={() => { setEditingLabel(null); setLabelForm({ name: '', color: '#f97316' }); }}>
                    Cancelar
                  </button>
                )}
                <button type="submit" disabled={savingLabel} className="btn-primary text-sm flex items-center gap-2">
                  <Plus size={14} />
                  {savingLabel ? 'Guardando...' : editingLabel ? 'Actualizar' : 'Crear etiqueta'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de etiquetas */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Tag size={15} className="text-slate-500" />
              Etiquetas creadas ({labels.length})
            </h3>
            {loadingLabels ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : labels.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No hay etiquetas. Crea la primera arriba.</p>
            ) : (
              <div className="space-y-2">
                {labels.map(label => (
                  <div key={label.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: label.color + '22', color: label.color, border: `1px solid ${label.color}44` }}>
                      {label.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingLabel(label); setLabelForm({ name: label.name, color: label.color }); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDeleteLabel(label)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: PLANTILLAS ── */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Formulario */}
          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
              <MessageSquare size={16} className="text-brand-500" />
              {editingTpl ? 'Editar plantilla' : 'Nueva plantilla'}
            </h2>

            <form onSubmit={handleSaveTpl} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Atajo <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono font-bold text-sm">/</span>
                  <input
                    type="text"
                    placeholder="ej: hola, gracias, horario"
                    value={tplForm.shortcut}
                    onChange={e => setTplForm(p => ({ ...p, shortcut: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                    className="input flex-1"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Escribe <span className="font-mono">/</span> + el atajo en la bandeja para usar esta plantilla.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Mensaje <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Escribe el mensaje que se enviará al usar este atajo..."
                  value={tplForm.content}
                  onChange={e => setTplForm(p => ({ ...p, content: e.target.value }))}
                  rows={5}
                  className="input resize-none"
                  required
                />
                {tplForm.content && (
                  <div className="mt-2 p-3 bg-brand-50 border border-brand-100 rounded-xl">
                    <p className="text-[10px] font-semibold text-brand-400 uppercase mb-1">Vista previa</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{tplForm.content}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingTpl || !tplForm.shortcut || !tplForm.content}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Save size={14} />
                  {savingTpl ? 'Guardando...' : editingTpl ? 'Guardar cambios' : '+ Crear plantilla'}
                </button>
                {editingTpl && (
                  <button
                    type="button"
                    onClick={() => { setEditingTpl(null); setTplForm({ shortcut: '', content: '' }); }}
                    className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de plantillas */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-800">
                Plantillas creadas
                <span className="ml-2 text-sm font-normal text-slate-400">({templates.length})</span>
              </h2>
              <button onClick={loadTemplates} disabled={loadingTemplates}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 disabled:opacity-40 transition-colors">
                <RefreshCw size={13} className={loadingTemplates ? 'animate-spin' : ''} />
              </button>
            </div>

            {loadingTemplates ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <MessageSquare size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No hay plantillas. Crea la primera.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {templates.map(t => (
                  <div key={t.id} className="group flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-brand-50 text-brand-600 font-mono text-xs font-bold border border-brand-100">
                        /{t.shortcut}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 flex-1 leading-relaxed line-clamp-3">{t.content}</p>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTpl(t); setTplForm({ shortcut: t.shortcut, content: t.content }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteTpl(t)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete plantilla */}
      {confirmDeleteTpl && (
        <ConfirmModal
          title="Eliminar plantilla"
          message={`¿Eliminar la plantilla "/${confirmDeleteTpl.shortcut}"? Los agentes dejarán de poder usarla.`}
          onConfirm={() => handleDeleteTpl(confirmDeleteTpl.id)}
          onCancel={() => setConfirmDeleteTpl(null)}
        />
      )}

      {/* ── TAB: RECORDATORIOS ── */}
      {tab === 'followup' && (
        <div className="max-w-lg">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
                <Bell size={16} className="text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Recordatorios automáticos</h3>
                <p className="text-xs text-slate-400">Alerta cuando una conversación lleva demasiado tiempo sin respuesta</p>
              </div>
            </div>

            {loadingFu ? (
              <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
            ) : (
              <form onSubmit={handleSaveFollowUp} className="space-y-5">
                {/* Activar */}
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Activar recordatorios</p>
                    <p className="text-xs text-slate-400">El sistema revisará conversaciones cada 15 minutos</p>
                  </div>
                  <div onClick={() => setFuConfig(f => ({ ...f, enabled: !f.enabled }))}
                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${fuConfig.enabled ? 'bg-brand-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${fuConfig.enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>

                {fuConfig.enabled && (
                  <>
                    {/* Horas sin respuesta */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Horas sin respuesta del agente para activar el recordatorio
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="1" max="48" className="input w-24 text-center"
                          value={fuConfig.hours}
                          onChange={e => setFuConfig(f => ({ ...f, hours: parseInt(e.target.value) || 1 }))} />
                        <span className="text-sm text-slate-500">hora{fuConfig.hours !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Acción */}
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-2">¿Qué debe hacer?</label>
                      <div className="flex gap-3">
                        {[
                          { key: 'note',    label: 'Nota interna',       desc: 'Solo visible para agentes' },
                          { key: 'message', label: 'Mensaje al cliente', desc: 'Envía WhatsApp automático' },
                        ].map(opt => (
                          <button key={opt.key} type="button"
                            onClick={() => setFuConfig(f => ({ ...f, action: opt.key }))}
                            className={`flex-1 p-3 rounded-xl border-2 text-left transition-all ${
                              fuConfig.action === opt.key ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <p className={`text-xs font-semibold ${fuConfig.action === opt.key ? 'text-brand-700' : 'text-slate-700'}`}>{opt.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mensaje (solo si action = message) */}
                    {fuConfig.action === 'message' && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Mensaje a enviar</label>
                        <textarea rows={3} className="input resize-none"
                          placeholder="Ej: Hola, ¿sigues necesitando ayuda? Estamos aquí para atenderte. 😊"
                          value={fuConfig.message}
                          onChange={e => setFuConfig(f => ({ ...f, message: e.target.value }))} />
                        <p className="text-xs text-slate-400 mt-1">Si lo dejas vacío se usará el mensaje por defecto.</p>
                      </div>
                    )}
                  </>
                )}

                <button type="submit" disabled={savingFu} className="w-full btn-primary flex items-center justify-center gap-2">
                  <Save size={15} />
                  {savingFu ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </form>
            )}
          </div>
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

      {confirmDeleteLabel && (
        <ConfirmModal
          title="Eliminar etiqueta"
          message={`¿Eliminar la etiqueta "${confirmDeleteLabel.name}"? Se quitará de todas las conversaciones.`}
          danger confirmText="Eliminar"
          onConfirm={() => handleDeleteLabel(confirmDeleteLabel.id)}
          onCancel={() => setConfirmDeleteLabel(null)}
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

function CsatPanel({ csat }) {
  const STARS = ['', '😞', '😕', '😐', '😊', '😍'];
  const LABELS = ['', 'Muy insatisfecho', 'Insatisfecho', 'Regular', 'Satisfecho', 'Muy satisfecho'];
  const COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  const max = Math.max(...Object.values(csat.distribution), 1);
  const responseRate = csat.sent > 0 ? Math.round((csat.total / csat.sent) * 100) : 0;

  if (csat.sent === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-3xl mb-2">⭐</p>
        <p className="text-sm font-medium">Sin encuestas enviadas aún</p>
        <p className="text-xs mt-1">Las encuestas se envían automáticamente al cerrar conversaciones</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Score promedio */}
      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 border border-slate-100">
        <p className="text-5xl font-black text-slate-800 mb-1">{csat.avg}</p>
        <div className="flex gap-0.5 mb-2">
          {[1,2,3,4,5].map(n => (
            <span key={n} className={`text-lg ${n <= Math.round(csat.avg) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center">
          Basado en <strong>{csat.total}</strong> respuesta{csat.total !== 1 ? 's' : ''} de <strong>{csat.sent}</strong> encuestas enviadas
        </p>
        <div className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100">
          {responseRate}% tasa de respuesta
        </div>
      </div>

      {/* Distribución */}
      <div className="space-y-2">
        {[5,4,3,2,1].map(score => (
          <div key={score} className="flex items-center gap-2">
            <span className="text-base w-5 flex-shrink-0">{STARS[score]}</span>
            <span className="text-xs text-slate-500 w-24 flex-shrink-0 truncate">{LABELS[score]}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(csat.distribution[score] / max) * 100}%`,
                  background: COLORS[score],
                }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 w-5 text-right flex-shrink-0">
              {csat.distribution[score]}
            </span>
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
