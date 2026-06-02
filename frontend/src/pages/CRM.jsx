import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, Users, RefreshCw, ChevronRight,
  ChevronLeft, Calendar, Phone, Building2, Plus, X, Save,
  Trophy, AlertCircle, Download, Filter, UserRound, Search,
  Clock, LayoutGrid, List, FileText, CheckSquare, MessageCircle,
  Mail, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Briefcase,
} from 'lucide-react';
import { crmAPI, contactsAPI, adminAPI, companiesAPI } from '../lib/api';
import { useCrmStages } from '../lib/crmStages';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';

// ── Constantes ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPES = {
  note:     { label: 'Nota',     icon: FileText,       color: '#64748b' },
  task:     { label: 'Tarea',    icon: CheckSquare,    color: '#3b82f6' },
  call:     { label: 'Llamada',  icon: Phone,          color: '#10b981' },
  email:    { label: 'Email',    icon: Mail,           color: '#f59e0b' },
  meeting:  { label: 'Reunión',  icon: Calendar,       color: '#8b5cf6' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle,  color: '#25d366' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val) {
  if (!val && val !== 0) return null;
  return Number(val).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T00:00:00') < new Date(new Date().toDateString());
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function fmtDt(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── ActivityTimeline ──────────────────────────────────────────────────────────

function ActivityTimeline({ contactId }) {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ type: 'note', title: '', description: '', due_date: '' });
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await crmAPI.getActivities(contactId);
      setActivities(data);
    } catch {}
    finally { setLoading(false); }
  }, [contactId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const act = await crmAPI.createActivity({
        contact_id:  contactId,
        type:        form.type,
        title:       form.title,
        description: form.description || null,
        due_date:    form.due_date    || null,
      });
      setActivities(prev => [act, ...prev]);
      setForm({ type: 'note', title: '', description: '', due_date: '' });
      setShowForm(false);
    } catch {}
    finally { setSaving(false); }
  }

  async function toggleComplete(act) {
    try {
      const updated = await crmAPI.updateActivity(act.id, { completed: !act.completed_at });
      setActivities(prev => prev.map(a => a.id === act.id ? updated : a));
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await crmAPI.deleteActivity(id);
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch {}
  }

  const needsDueDate = ['task', 'meeting', 'call'].includes(form.type);

  return (
    <div className="space-y-3">
      {/* Botón agregar */}
      <button
        onClick={() => setShowForm(v => !v)}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border rounded-lg transition-colors ${
          showForm
            ? 'border-brand-300 bg-brand-50 text-brand-600'
            : 'border-dashed border-slate-300 text-slate-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50'
        }`}
      >
        <Plus size={12} /> Nueva actividad
      </button>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-slate-200 rounded-xl p-3 space-y-2.5 bg-slate-50">
          {/* Selector de tipo */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ACTIVITY_TYPES).map(([key, { label, icon: Icon, color }]) => (
              <button
                key={key} type="button"
                onClick={() => setForm(f => ({ ...f, type: key }))}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  form.type === key
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
                style={form.type === key ? { backgroundColor: color, borderColor: color } : {}}
              >
                <Icon size={10} /> {label}
              </button>
            ))}
          </div>

          <input
            type="text" required placeholder="Título de la actividad..."
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="input text-sm py-2"
          />
          <textarea
            rows={2} placeholder="Descripción (opcional)..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input text-sm py-2 resize-none"
          />
          {needsDueDate && (
            <div>
              <label className="text-[10px] font-semibold text-slate-400 block mb-1">Fecha y hora</label>
              <input
                type="datetime-local"
                value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="input text-sm py-2"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary text-xs py-1.5 flex-1">
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-6">
          <span className="w-4 h-4 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8 text-slate-300">
          <FileText size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-xs">Sin actividades registradas</p>
          <p className="text-[10px] mt-0.5">Agrega notas, tareas o registros de llamadas</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {activities.map(act => {
            const cfg    = ACTIVITY_TYPES[act.type] || ACTIVITY_TYPES.note;
            const Icon   = cfg.icon;
            const isTask = act.type === 'task';
            const done   = !!act.completed_at;
            const taskOverdue = isTask && act.due_date && !done && new Date(act.due_date) < new Date();

            return (
              <div
                key={act.id}
                className={`flex gap-2.5 p-2.5 rounded-xl border group transition-all ${
                  done
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {/* Icono / Checkbox */}
                <div className="flex-shrink-0 mt-0.5">
                  {isTask ? (
                    <button
                      type="button"
                      onClick={() => toggleComplete(act)}
                      className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all hover:scale-110"
                      style={done
                        ? { backgroundColor: cfg.color, borderColor: cfg.color }
                        : { borderColor: cfg.color }}
                    >
                      {done && <span className="text-white text-[8px] font-black">✓</span>}
                    </button>
                  ) : (
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.color + '18' }}>
                      <Icon size={11} style={{ color: cfg.color }} />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {act.title}
                  </p>
                  {act.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{act.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[9px] text-slate-300 font-medium">
                      {act.user?.username || 'Sistema'} · {relativeTime(act.created_at)}
                    </span>
                    {act.due_date && (
                      <span className={`text-[9px] font-semibold flex items-center gap-0.5 ${taskOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                        <Calendar size={8} />
                        {taskOverdue ? '⚠ ' : ''}{fmtDt(act.due_date)}
                      </span>
                    )}
                    {done && act.completed_at && (
                      <span className="text-[9px] text-emerald-500 font-semibold">✓ completada</span>
                    )}
                  </div>
                </div>

                {/* Eliminar */}
                <button
                  type="button"
                  onClick={() => handleDelete(act.id)}
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 text-slate-300 hover:text-red-400 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DealModal ──────────────────────────────────────────────────────────────────

function DealModal({ contact, stages, agents, onClose, onSave }) {
  const [tab,  setTab]  = useState('deal'); // 'deal' | 'activities'
  const [form, setForm] = useState({
    crm_stage_id:        contact.crm_stage_id        || stages[0]?.id || '',
    deal_value:          contact.deal_value           || '',
    expected_close_date: contact.expected_close_date  || '',
    crm_notes:           contact.crm_notes            || '',
    deal_assigned_to:    contact.deal_assigned_to     || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await contactsAPI.update(contact.id, {
        crm_stage_id:        form.crm_stage_id || null,
        deal_value:          form.deal_value ? Number(form.deal_value) : null,
        expected_close_date: form.expected_close_date || null,
        crm_notes:           form.crm_notes || null,
        deal_assigned_to:    form.deal_assigned_to || null,
      });
      onSave(updated);
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-800">{contact.name || contact.phone}</h3>
            {contact.company_name && (
              <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Building2 size={9} /> {contact.company_name}
              </p>
            )}
            {contact.crm_entered_at && (
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Clock size={9} /> {daysSince(contact.crm_entered_at)} días en el pipeline
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {[
            { key: 'deal',       label: 'Deal' },
            { key: 'activities', label: 'Actividades' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.key
                  ? 'text-brand-600 border-brand-500 bg-brand-50/40'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {tab === 'deal' ? (
          <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Etapa */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-2">Etapa del pipeline</label>
              <div className="grid grid-cols-2 gap-1.5">
                {stages.map(s => (
                  <button
                    key={s.id} type="button"
                    onClick={() => setForm(f => ({ ...f, crm_stage_id: s.id }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      form.crm_stage_id === s.id ? 'ring-2 ring-offset-1' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    style={form.crm_stage_id === s.id
                      ? { backgroundColor: s.color + '18', color: s.color, borderColor: s.color + '40', outlineColor: s.color }
                      : {}}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Agente */}
            {agents.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">Agente responsable</label>
                <select
                  value={form.deal_assigned_to}
                  onChange={e => setForm(f => ({ ...f, deal_assigned_to: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin asignar</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
                </select>
              </div>
            )}

            {/* Valor */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Valor del deal (COP)</label>
              <div className="relative">
                <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min="0" step="1000" value={form.deal_value}
                  onChange={e => setForm(f => ({ ...f, deal_value: e.target.value }))}
                  placeholder="0" className="input pl-8" />
              </div>
            </div>

            {/* Fecha cierre */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">
                Fecha esperada de cierre
                {isOverdue(form.expected_close_date) && (
                  <span className="ml-2 text-[10px] text-red-500 font-bold">● VENCIDO</span>
                )}
              </label>
              <div className="relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={form.expected_close_date}
                  onChange={e => setForm(f => ({ ...f, expected_close_date: e.target.value }))}
                  className={`input pl-8 ${isOverdue(form.expected_close_date) ? 'border-red-300 focus:ring-red-400' : ''}`} />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5">Notas del deal</label>
              <textarea rows={3} value={form.crm_notes}
                onChange={e => setForm(f => ({ ...f, crm_notes: e.target.value }))}
                placeholder="Próximos pasos, acuerdos, contexto..."
                className="input resize-none" />
            </div>

            {/* Quitar del CRM */}
            <div className="pt-1 border-t border-slate-100">
              <button type="button"
                onClick={async () => {
                  setSaving(true);
                  try { const u = await contactsAPI.update(contact.id, { crm_stage_id: null }); onSave(u, true); }
                  finally { setSaving(false); }
                }}
                className="w-full text-xs text-red-400 hover:text-red-600 py-1.5 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
              >
                Quitar del pipeline
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 overflow-y-auto flex-1">
            <ActivityTimeline contactId={contact.id} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── KanbanCard ─────────────────────────────────────────────────────────────────

function KanbanCard({ contact, stageIdx, totalStages, onEdit, onMoveLeft, onMoveRight }) {
  const overdue = isOverdue(contact.expected_close_date);
  const days    = daysSince(contact.crm_entered_at);

  return (
    <div
      onClick={() => onEdit(contact)}
      className={`bg-white rounded-xl p-3.5 shadow-card cursor-pointer hover:shadow-card-hover transition-all group border ${
        overdue ? 'border-red-200 hover:border-red-300' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {contact.name || <span className="text-slate-400 font-normal italic">Sin nombre</span>}
          </p>
          {contact.company_name && (
            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
              <Building2 size={8} /> {contact.company_name}
            </p>
          )}
        </div>
        {contact.deal_value ? (
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
            {fmt(contact.deal_value)}
          </span>
        ) : null}
      </div>

      <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mb-1">
        <Phone size={8} /> {contact.phone}
      </p>

      {contact.agent_name && (
        <p className="text-[10px] text-brand-500 flex items-center gap-1 mb-1">
          <UserRound size={8} /> {contact.agent_name}
        </p>
      )}

      {contact.expected_close_date && (
        <p className={`text-[10px] flex items-center gap-1 mb-1 ${overdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
          <Calendar size={8} />
          {overdue ? '⚠ ' : ''}Cierre: {new Date(contact.expected_close_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
        </p>
      )}

      {days !== null && (
        <p className={`text-[9px] flex items-center gap-1 ${days > 30 ? 'text-amber-500' : 'text-slate-300'}`}>
          <Clock size={7} /> {days}d en pipeline
        </p>
      )}

      {contact.crm_notes && (
        <p className="text-[9px] text-slate-300 italic truncate mt-1">{contact.crm_notes}</p>
      )}

      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onMoveLeft(contact)} disabled={stageIdx === 0}
          className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-0 transition-colors">
          <ChevronLeft size={12} />
        </button>
        <span className="text-[8px] text-slate-300 font-semibold uppercase tracking-wider">mover</span>
        <button onClick={() => onMoveRight(contact)} disabled={stageIdx === totalStages - 1}
          className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-0 transition-colors">
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── ListView ───────────────────────────────────────────────────────────────────

function ListView({ contacts, stages, onEdit }) {
  const [sortBy,  setSortBy]  = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  }

  const sorted = [...contacts].sort((a, b) => {
    let av, bv;
    if (sortBy === 'stage') {
      av = stages.findIndex(s => s.id === a.crm_stage_id);
      bv = stages.findIndex(s => s.id === b.crm_stage_id);
    } else if (sortBy === 'days') {
      av = a.crm_entered_at ? daysSince(a.crm_entered_at) : -1;
      bv = b.crm_entered_at ? daysSince(b.crm_entered_at) : -1;
    } else {
      av = a[sortBy] ?? '';
      bv = b[sortBy] ?? '';
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ?  1 : -1;
    return 0;
  });

  function SortIcon({ col }) {
    if (sortBy !== col) return <ArrowUpDown size={10} className="text-slate-300 ml-1" />;
    return sortDir === 'asc'
      ? <ArrowUp size={10} className="text-brand-500 ml-1" />
      : <ArrowDown size={10} className="text-brand-500 ml-1" />;
  }

  function Th({ col, label, className = '' }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-semibold text-slate-500 cursor-pointer hover:text-slate-700 select-none ${className}`}
        onClick={() => toggleSort(col)}
      >
        <div className={`flex items-center gap-0 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : ''}`}>
          {label}<SortIcon col={col} />
        </div>
      </th>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full min-w-[760px]">
        <thead className="sticky top-0 bg-white border-b border-slate-200 z-10">
          <tr>
            <Th col="name"                label="Contacto"  className="text-left" />
            <Th col="stage"               label="Etapa"     className="text-left" />
            <Th col="deal_value"          label="Valor"     className="text-right" />
            <Th col="agent_name"          label="Agente"    className="text-left" />
            <Th col="days"                label="Días"      className="text-center" />
            <Th col="expected_close_date" label="Cierre"    className="text-left" />
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(c => {
            const stage   = stages.find(s => s.id === c.crm_stage_id);
            const overdue = isOverdue(c.expected_close_date);
            const days    = daysSince(c.crm_entered_at);

            return (
              <tr
                key={c.id}
                className="hover:bg-slate-50/80 cursor-pointer group transition-colors"
                onClick={() => onEdit(c)}
              >
                {/* Contacto */}
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">
                    {c.name || <span className="text-slate-400 italic text-xs">Sin nombre</span>}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                    <Phone size={8} /> {c.phone}
                    {c.company_name && (
                      <span className="text-slate-300"> · <Building2 size={8} className="inline" /> {c.company_name}</span>
                    )}
                  </p>
                </td>

                {/* Etapa */}
                <td className="px-4 py-3">
                  {stage ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold"
                      style={{ backgroundColor: stage.color + '18', color: stage.color }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </span>
                  ) : <span className="text-slate-300 text-xs">–</span>}
                </td>

                {/* Valor */}
                <td className="px-4 py-3 text-right">
                  {c.deal_value
                    ? <span className="text-sm font-bold text-emerald-600">{fmt(c.deal_value)}</span>
                    : <span className="text-slate-300 text-xs">–</span>}
                </td>

                {/* Agente */}
                <td className="px-4 py-3">
                  {c.agent_name
                    ? <span className="text-xs text-brand-500 flex items-center gap-1"><UserRound size={10} />{c.agent_name}</span>
                    : <span className="text-slate-300 text-xs">–</span>}
                </td>

                {/* Días */}
                <td className="px-4 py-3 text-center">
                  {days !== null ? (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      days > 60 ? 'text-red-500 bg-red-50' :
                      days > 30 ? 'text-amber-600 bg-amber-50' :
                      'text-slate-500'
                    }`}>
                      {days}d
                    </span>
                  ) : <span className="text-slate-300 text-xs">–</span>}
                </td>

                {/* Cierre */}
                <td className="px-4 py-3">
                  {c.expected_close_date ? (
                    <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                      {overdue && <AlertCircle size={10} />}
                      {new Date(c.expected_close_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </span>
                  ) : <span className="text-slate-300 text-xs">–</span>}
                </td>

                {/* Acción */}
                <td className="px-4 py-3">
                  <button
                    onClick={e => { e.stopPropagation(); onEdit(c); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-all"
                  >
                    <Edit2 size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="text-center py-16 text-slate-300">
          <List size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sin deals que mostrar</p>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CRM() {
  const { user, isSuperAdmin } = useAuth();
  const toast                  = useToast();
  const navigate               = useNavigate();

  // super_admin puede seleccionar empresa; company_admin/agent la toma del JWT
  const ownCompanyId  = user?.company_id;
  const [selCompanyId, setSelCompanyId] = useState(null);
  const [companies,    setCompanies]    = useState([]);

  const companyId = isSuperAdmin ? selCompanyId : ownCompanyId;

  const { stages } = useCrmStages(companyId);

  const [contacts,   setContacts]   = useState([]);
  const [agents,     setAgents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(null);
  const [search,     setSearch]     = useState('');
  const [viewMode,   setViewMode]   = useState('kanban');   // 'kanban' | 'list'
  const [myDeals,    setMyDeals]    = useState(false);      // siempre empieza mostrando todo

  // Cargar lista de empresas para super_admin
  useEffect(() => {
    if (!isSuperAdmin) return;
    companiesAPI.getAll()
      .then(list => {
        setCompanies(list);
        // Auto-seleccionar la primera si solo hay una
        if (list.length === 1) setSelCompanyId(list[0].id);
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  // Filtros avanzados
  const [showFilters, setShowFilters] = useState(false);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterFrom,  setFilterFrom]  = useState('');
  const [filterTo,    setFilterTo]    = useState('');
  const [filterMin,   setFilterMin]   = useState('');
  const [filterMax,   setFilterMax]   = useState('');

  const activeFilters = [filterAgent, filterFrom, filterTo, filterMin, filterMax].filter(Boolean).length;

  const load = useCallback(async () => {
    if (!companyId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = { company_id: companyId };
      // "Mis Deals" sobreescribe el filtro de agente
      if (myDeals)          params.agent_id  = user.id;
      else if (filterAgent) params.agent_id  = filterAgent;
      if (filterFrom)       params.date_from = filterFrom;
      if (filterTo)         params.date_to   = filterTo;
      if (filterMin)        params.min_value = filterMin;
      if (filterMax)        params.max_value = filterMax;

      const data = await crmAPI.getPipeline(params);
      setContacts(data);
    } catch { toast.error('Error cargando el pipeline'); }
    finally { setLoading(false); }
  }, [companyId, myDeals, filterAgent, filterFrom, filterTo, filterMin, filterMax]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!companyId) return;
    adminAPI.getMyAgents(companyId).then(setAgents).catch(() => {});
  }, [companyId]);

  async function moveStage(contact, delta) {
    const idx    = stages.findIndex(s => s.id === contact.crm_stage_id);
    const newIdx = Math.max(0, Math.min(stages.length - 1, idx + delta));
    if (newIdx === idx) return;
    const newStageId = stages[newIdx].id;
    try {
      const updated = await contactsAPI.update(contact.id, { crm_stage_id: newStageId });
      setContacts(prev => prev.map(c =>
        c.id === contact.id ? { ...c, ...updated, stage_info: stages[newIdx] } : c
      ));
    } catch { toast.error('Error al mover etapa'); }
  }

  function handleSaveDeal(updated, removed = false) {
    if (removed) {
      setContacts(prev => prev.filter(c => c.id !== updated.id));
      toast.success('Deal removido del pipeline');
    } else {
      const stageInfo = stages.find(s => s.id === updated.crm_stage_id) || null;
      const agentName = updated.deal_assigned_to
        ? agents.find(a => a.id === updated.deal_assigned_to)?.username || 'Desconocido'
        : null;
      setContacts(prev => prev.map(c =>
        c.id === updated.id ? { ...c, ...updated, stage_info: stageInfo, agent_name: agentName } : c
      ));
      toast.success('Deal actualizado');
    }
    setEditing(null);
  }

  const filteredContacts = search.trim()
    ? contacts.filter(c =>
        (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.phone || '').includes(search) ||
        (c.company_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : contacts;

  // Stats
  const wonStages  = stages.filter(s => s.is_won).map(s => s.id);
  const total      = filteredContacts.length;
  const totalValue = filteredContacts.reduce((s, c) => s + (Number(c.deal_value) || 0), 0);
  const ganados    = filteredContacts.filter(c => wonStages.includes(c.crm_stage_id)).length;
  const vencidos   = filteredContacts.filter(c => isOverdue(c.expected_close_date)).length;
  const conversion = total > 0 ? Math.round((ganados / total) * 100) : 0;

  const clearFilters = () => {
    setFilterAgent(''); setFilterFrom(''); setFilterTo(''); setFilterMin(''); setFilterMax('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pipeline CRM</h1>
            <p className="text-sm text-slate-400 mt-0.5">Gestión de leads y oportunidades</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de empresa para super_admin */}
            {isSuperAdmin && (
              <select
                value={selCompanyId || ''}
                onChange={e => setSelCompanyId(e.target.value || null)}
                className="input text-sm py-1.5 h-auto"
              >
                <option value="">— Seleccionar empresa —</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
            {/* Mis Deals toggle */}
            <button
              onClick={() => setMyDeals(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border rounded-lg transition-all ${
                myDeals
                  ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Briefcase size={12} /> Mis Deals
            </button>

            {/* Búsqueda */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar deal..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 py-1.5 text-sm w-40" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtros avanzados */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors ${
                showFilters || activeFilters > 0
                  ? 'bg-brand-50 border-brand-300 text-brand-600'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Filter size={12} /> Filtros
              {activeFilters > 0 && (
                <span className="bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>

            {/* Vista Kanban / Lista */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                  viewMode === 'kanban' ? 'bg-slate-100 text-slate-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <LayoutGrid size={12} /> Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border-l border-slate-200 transition-colors ${
                  viewMode === 'list' ? 'bg-slate-100 text-slate-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                <List size={12} /> Lista
              </button>
            </div>

            {/* Exportar */}
            <button onClick={() => crmAPI.exportPipeline(companyId)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
              <Download size={12} /> Exportar
            </button>

            {/* Recargar */}
            <button onClick={load} disabled={loading}
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {[
            { icon: Users,       label: myDeals ? 'Mis Deals' : 'Deals',  value: total,                       color: 'text-brand-600'   },
            { icon: DollarSign,  label: 'Pipeline',                         value: fmt(totalValue) || '$0',     color: 'text-emerald-600' },
            { icon: Trophy,      label: 'Ganados',                          value: `${ganados} (${conversion}%)`, color: 'text-amber-600' },
            { icon: AlertCircle, label: 'Vencidos',                         value: vencidos,                    color: vencidos > 0 ? 'text-red-500' : 'text-slate-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <Icon size={13} className={color} />
              <div>
                <p className={`text-sm font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}

          {myDeals && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200">
              <Briefcase size={12} className="text-brand-500" />
              <span className="text-xs text-brand-600 font-semibold">Mostrando Mis Deals</span>
              <button onClick={() => setMyDeals(false)} className="text-brand-400 hover:text-brand-600 ml-1">
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 items-center">
            {!myDeals && agents.length > 0 && (
              <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
                className="input text-xs py-1.5 h-auto w-auto">
                <option value="">Todos los agentes</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Cierre:</span>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="input text-xs py-1.5 h-auto w-auto" />
              <span className="text-xs text-slate-400">–</span>
              <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   className="input text-xs py-1.5 h-auto w-auto" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">Valor:</span>
              <input type="number" placeholder="Mín" value={filterMin} onChange={e => setFilterMin(e.target.value)} className="input text-xs py-1.5 h-auto w-24" />
              <span className="text-xs text-slate-400">–</span>
              <input type="number" placeholder="Máx" value={filterMax} onChange={e => setFilterMax(e.target.value)} className="input text-xs py-1.5 h-auto w-24" />
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors">
                <X size={11} /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Contenido: Kanban o Lista ── */}
      {isSuperAdmin && !companyId ? (
        /* Super_admin sin empresa seleccionada */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-brand-300" />
            </div>
            <p className="font-semibold text-slate-600">Selecciona una empresa</p>
            <p className="text-sm text-slate-400 mt-1">Elige una empresa en el selector de arriba para ver su pipeline.</p>
            {companies.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 items-center">
                {companies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelCompanyId(c.id)}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 && activeFilters === 0 && !search && !myDeals ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">Sin deals en el pipeline</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs">Abre una conversación en la Bandeja y agrega el contacto al CRM desde el panel lateral.</p>
            <button onClick={() => navigate('/inbox')} className="btn-primary mt-4 flex items-center gap-2 mx-auto">
              <Plus size={14} /> Ir a Bandeja
            </button>
          </div>
        </div>
      ) : myDeals && contacts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} className="text-brand-300" />
            </div>
            <p className="font-semibold text-slate-600">No tienes deals asignados</p>
            <p className="text-sm text-slate-400 mt-1">Los deals que te asignen aparecerán aquí.</p>
            <button onClick={() => setMyDeals(false)} className="btn-secondary mt-4 flex items-center gap-2 mx-auto">
              Ver todo el pipeline
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ── Vista Lista ── */
        <ListView contacts={filteredContacts} stages={stages} onEdit={setEditing} />
      ) : (
        /* ── Vista Kanban ── */
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-3 h-full p-4" style={{ minWidth: `${stages.length * 272 + 32}px` }}>
            {stages.map((stage, stageIdx) => {
              const cards       = filteredContacts.filter(c => c.crm_stage_id === stage.id);
              const colValue    = cards.reduce((s, c) => s + (Number(c.deal_value) || 0), 0);
              const overdueCount = cards.filter(c => isOverdue(c.expected_close_date)).length;

              return (
                <div key={stage.id} className="w-64 flex flex-col flex-shrink-0 h-full">
                  {/* Cabecera columna */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-t-xl mb-2 border-b-2"
                    style={{ backgroundColor: stage.color + '14', borderColor: stage.color + '40' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/70" style={{ color: stage.color }}>
                        {cards.length}
                      </span>
                      {overdueCount > 0 && (
                        <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5">
                          <AlertCircle size={9} /> {overdueCount}
                        </span>
                      )}
                    </div>
                    {colValue > 0 && (
                      <span className="text-[10px] font-semibold text-slate-500">{fmt(colValue)}</span>
                    )}
                  </div>

                  {/* Tarjetas */}
                  <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                    {cards.map(contact => (
                      <KanbanCard
                        key={contact.id}
                        contact={contact}
                        stageIdx={stageIdx}
                        totalStages={stages.length}
                        onEdit={setEditing}
                        onMoveLeft={c => moveStage(c, -1)}
                        onMoveRight={c => moveStage(c, +1)}
                      />
                    ))}
                    {contacts.length > 0 && cards.length === 0 && (
                      <div className="border-2 border-dashed rounded-xl p-4 text-center"
                        style={{ borderColor: stage.color + '30' }}>
                        <p className="text-xs text-slate-400">Sin deals</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal edición */}
      {editing && (
        <DealModal
          contact={editing}
          stages={stages}
          agents={agents}
          onClose={() => setEditing(null)}
          onSave={handleSaveDeal}
        />
      )}
    </div>
  );
}
