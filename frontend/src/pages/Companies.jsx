import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, Bot, ChevronRight,
  ExternalLink, Copy, Check, ToggleLeft, ToggleRight, X, Kanban,
} from 'lucide-react';
import { companiesAPI, flowsAPI } from '../lib/api';
import CompanyModal from '../components/CompanyModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/Toast';

export default function Companies() {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [flowsMap, setFlowsMap] = useState({});
  const [expanded, setExpanded] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [newFlowName, setNewFlowName] = useState('');
  const [creatingFlowFor, setCreatingFlowFor] = useState(null);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    companiesAPI.getAll().then(setCompanies).finally(() => setLoading(false));
  }, []);

  async function loadFlows(companyId) {
    const data = await flowsAPI.getByCompany(companyId);
    setFlowsMap(m => ({ ...m, [companyId]: data }));
  }

  function toggleExpand(id) {
    setExpanded(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) loadFlows(id);
      return next;
    });
  }

  async function handleDeleteCompany(id, name) {
    setConfirm({
      title: 'Eliminar empresa',
      message: `¿Seguro que quieres eliminar "${name}"? Se borrarán todos sus flujos.`,
      onConfirm: async () => {
        setConfirm(null);
        await companiesAPI.remove(id);
        setCompanies(c => c.filter(x => x.id !== id));
        toast.success('Empresa eliminada');
      },
    });
  }

  async function handleToggleActive(company) {
    const updated = await companiesAPI.update(company.id, { active: !company.active });
    setCompanies(c => c.map(x => x.id === updated.id ? updated : x));
    toast.info(updated.active ? `${updated.name} activada` : `${updated.name} desactivada`);
  }

  async function handleToggleCRM(company) {
    try {
      const { crm_enabled } = await companiesAPI.toggleCRM(company.id);
      setCompanies(c => c.map(x => x.id === company.id ? { ...x, crm_enabled } : x));
      toast.info(crm_enabled ? `CRM habilitado para ${company.name}` : `CRM deshabilitado para ${company.name}`);
    } catch {
      toast.error('Error al cambiar estado del CRM');
    }
  }

  async function handleCreateFlow(e) {
    e.preventDefault();
    if (!newFlowName.trim() || !creatingFlowFor) return;
    setCreatingFlow(true);
    try {
      const flow = await flowsAPI.create({ company_id: creatingFlowFor, name: newFlowName.trim() });
      setFlowsMap(m => ({ ...m, [creatingFlowFor]: [flow, ...(m[creatingFlowFor] || [])] }));
      setCreatingFlowFor(null);
      setNewFlowName('');
      toast.success('Flujo creado correctamente');
    } catch {
      toast.error('Error al crear el flujo');
    } finally {
      setCreatingFlow(false);
    }
  }

  async function handleDeleteFlow(companyId, flowId, flowName) {
    setConfirm({
      title: 'Eliminar flujo',
      message: `¿Eliminar el flujo "${flowName}"? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        setConfirm(null);
        await flowsAPI.remove(flowId);
        setFlowsMap(m => ({ ...m, [companyId]: m[companyId].filter(f => f.id !== flowId) }));
        toast.success('Flujo eliminado');
      },
    });
  }

  async function handleToggleFlow(companyId, flowId, currentActive, flowName) {
    await flowsAPI.update(flowId, { active: !currentActive });
    const updated = await flowsAPI.getByCompany(companyId);
    setFlowsMap(m => ({ ...m, [companyId]: updated }));
    toast.info(!currentActive ? `"${flowName}" activado` : `"${flowName}" desactivado`);
  }

  function copyWebhook(companyId) {
    const url = `${window.location.origin.replace('3000', '3001')}/webhook/whatsapp/${companyId}`;
    navigator.clipboard.writeText(url);
    setCopied(companyId);
    setTimeout(() => setCopied(''), 2000);
    toast.success('URL copiada al portapapeles');
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-400 mt-1 text-sm">{companies.length} de 50 empresas registradas</p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true); }}
          disabled={companies.length >= 50}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          Nueva empresa
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                  <div className="h-2 bg-slate-50 rounded w-1/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bot size={28} className="text-slate-300" />
          </div>
          <p className="text-slate-700 font-semibold">No hay empresas registradas</p>
          <p className="text-slate-400 text-sm mt-1">Crea la primera empresa para empezar</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-5 mx-auto">
            Crear empresa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(company => (
            <div key={company.id} className="card overflow-hidden">
              {/* Fila principal */}
              <div className="flex items-center px-5 py-4 gap-3">
                <button onClick={() => toggleExpand(company.id)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                  <ChevronRight
                    size={15}
                    className={`text-slate-300 flex-shrink-0 transition-transform duration-200 ${expanded[company.id] ? 'rotate-90' : ''}`}
                  />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-sm shadow-brand-500/20">
                    {company.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{company.name}</p>
                    <p className="text-xs text-slate-400 truncate">{company.phone}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      company.active
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {company.active ? '● Activa' : '○ Inactiva'}
                    </span>
                    {company.crm_enabled && (
                      <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-brand-50 text-brand-600 border-brand-200 flex items-center gap-1">
                        <Kanban size={10} /> CRM
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleCRM(company)}
                    title={company.crm_enabled ? 'Deshabilitar CRM' : 'Habilitar CRM'}
                    className={`p-2 rounded-xl transition-colors ${company.crm_enabled ? 'text-brand-500 hover:bg-brand-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
                  >
                    <Kanban size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(company)}
                    className={`p-2 rounded-xl transition-colors ${company.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
                    title={company.active ? 'Desactivar' : 'Activar'}
                  >
                    {company.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button
                    onClick={() => { setEditTarget(company); setShowModal(true); }}
                    className="p-2 text-slate-300 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company.id, company.name)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Panel de flujos */}
              {expanded[company.id] && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Flujos del bot</p>
                    <button
                      onClick={() => { setCreatingFlowFor(company.id); setNewFlowName(''); }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-white border border-slate-200 text-brand-600 rounded-lg hover:bg-brand-50 hover:border-brand-200 font-semibold transition-colors shadow-sm"
                    >
                      <Plus size={12} />
                      Nuevo flujo
                    </button>
                  </div>

                  {creatingFlowFor === company.id && (
                    <form onSubmit={handleCreateFlow} className="flex items-center gap-2 mb-3">
                      <input
                        autoFocus
                        type="text"
                        value={newFlowName}
                        onChange={e => setNewFlowName(e.target.value)}
                        placeholder="Nombre del flujo..."
                        className="flex-1 text-sm border border-brand-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white shadow-sm"
                      />
                      <button type="submit" disabled={!newFlowName.trim() || creatingFlow} className="btn-primary py-2">
                        {creatingFlow ? '...' : 'Crear'}
                      </button>
                      <button type="button" onClick={() => setCreatingFlowFor(null)}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                        <X size={15} />
                      </button>
                    </form>
                  )}

                  {!flowsMap[company.id] ? (
                    <p className="text-xs text-slate-400 py-2">Cargando...</p>
                  ) : flowsMap[company.id].length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">Sin flujos aún. Crea el primero.</p>
                  ) : (
                    <div className="space-y-2">
                      {flowsMap[company.id].map(flow => (
                        <div key={flow.id} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-sm hover:border-slate-200 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                            <Bot size={15} className="text-brand-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{flow.name}</p>
                            <p className="text-xs text-slate-400">{flow.nodes.length} nodos</p>
                          </div>
                          <button
                            onClick={() => handleToggleFlow(company.id, flow.id, flow.active, flow.name)}
                            className={`flex-shrink-0 text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${
                              flow.active
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-brand-200 hover:text-brand-500'
                            }`}
                          >
                            {flow.active ? '● Activo' : '○ Inactivo'}
                          </button>
                          <Link
                            to={`/flows/${flow.id}`}
                            className="flex-shrink-0 p-1.5 text-slate-300 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Editar flujo"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <button
                            onClick={() => handleDeleteFlow(company.id, flow.id, flow.name)}
                            className="flex-shrink-0 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {company.whatsapp_phone_id && (
                    <div className="mt-4 p-3 bg-brand-50 border border-brand-100 rounded-xl">
                      <p className="text-[10px] font-bold text-brand-600 mb-1.5 uppercase tracking-wide">Webhook URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-brand-700 flex-1 truncate bg-white px-2 py-1.5 rounded-lg border border-brand-100">
                          …/webhook/whatsapp/{company.id}
                        </code>
                        <button onClick={() => copyWebhook(company.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg bg-white border border-brand-200 text-brand-500 hover:bg-brand-100 transition-colors">
                          {copied === company.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <p className="text-xs text-brand-500 mt-1.5">
                        Token: <code className="font-mono">{company.webhook_verify_token}</code>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CompanyModal
          company={editTarget}
          onClose={() => setShowModal(false)}
          onSave={async data => {
            if (editTarget) {
              const updated = await companiesAPI.update(editTarget.id, data);
              setCompanies(c => c.map(x => x.id === updated.id ? updated : x));
              toast.success('Empresa actualizada');
            } else {
              const created = await companiesAPI.create(data);
              setCompanies(c => [created, ...c]);
              toast.success('Empresa creada correctamente');
            }
            setShowModal(false);
          }}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
