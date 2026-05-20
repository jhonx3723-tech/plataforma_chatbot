import { useState, useEffect } from 'react';
import { User, Building2, FileText, Save, ChevronRight, ChevronLeft,
         ArrowRightLeft, Check, Phone, Copy, CheckCheck, UserPlus } from 'lucide-react';
import { contactsAPI, conversationsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function avatarInitials(name, phone) {
  if (name) return name.slice(0, 2).toUpperCase();
  return (phone || '??').slice(-2);
}

export default function ContactPanel({ conversation, companyId, onContactUpdated, onTransferred }) {
  const { user } = useAuth();
  const [contact, setContact]   = useState(null);
  const [form, setForm]         = useState({ name: '', company_name: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [saveErr, setSaveErr]   = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied]     = useState(false);

  const [agents, setAgents]           = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [transferring, setTransferring]   = useState(false);
  const [transferred, setTransferred]     = useState(false);

  useEffect(() => {
    if (!conversation?.user_phone || !companyId) return;
    setContact(null);
    setSaved(false);
    setSaveErr(null);
    setTransferred(false);
    setSelectedAgent('');

    contactsAPI.getByPhone(conversation.user_phone, companyId)
      .then(c => {
        setContact(c);
        setForm({ name: c.name || '', company_name: c.company_name || '', notes: c.notes || '' });
      })
      .catch(() => {
        setContact(null);
        setForm({ name: '', company_name: '', notes: '' });
      });
  }, [conversation?.user_phone, companyId]);

  useEffect(() => {
    if (!companyId) return;
    conversationsAPI.getAgents(companyId)
      .then(data => setAgents(data.filter(a => a.role === 'company_agent')))
      .catch(() => {});
  }, [companyId]);

  async function handleSave() {
    setSaving(true);
    setSaveErr(null);
    try {
      const result = await contactsAPI.save({
        phone:        conversation.user_phone,
        company_id:   companyId,
        name:         form.name        || null,
        company_name: form.company_name || null,
        notes:        form.notes       || null,
      });
      setContact(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onContactUpdated?.(result);
    } catch (err) {
      setSaveErr(err?.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  }

  async function handleTransfer() {
    if (!selectedAgent || !conversation?.id) return;
    setTransferring(true);
    try {
      const agent = agents.find(a => a.id === selectedAgent);
      await conversationsAPI.assign(conversation.id, selectedAgent);
      await conversationsAPI.addNote(
        conversation.id,
        `🔄 Conversación transferida a ${agent?.username || 'agente'} por ${user?.username}`
      );
      setTransferred(true);
      setTimeout(() => setTransferred(false), 3000);
      onTransferred?.();
    } catch { /* silent */ }
    finally { setTransferring(false); }
  }

  function handleCopy() {
    navigator.clipboard.writeText(conversation?.user_phone || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const dirty = contact
    ? form.name !== (contact.name || '') || form.company_name !== (contact.company_name || '') || form.notes !== (contact.notes || '')
    : form.name || form.company_name || form.notes;

  const currentAssigned = conversation?.assigned_to;
  const displayName = form.name || contact?.name || null;

  if (collapsed) {
    return (
      <div className="w-9 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col items-center py-4 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={15} />
        </button>
        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
          <User size={11} className="text-brand-500" />
        </div>
        <div className="[writing-mode:vertical-lr] text-[9px] text-slate-400 font-semibold tracking-widest uppercase rotate-180 mt-1">
          Contacto
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">

      {/* ── Cabecera del panel ─────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-100 rounded-md flex items-center justify-center">
            <User size={12} className="text-brand-500" />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Contacto</span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 text-slate-300 hover:text-slate-500 rounded-md hover:bg-slate-100 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── Avatar + teléfono ──────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-4 flex flex-col items-center border-b border-slate-100">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm mb-3 ${
            displayName ? 'bg-gradient-to-br from-brand-400 to-brand-600' : 'bg-gradient-to-br from-slate-300 to-slate-400'
          }`}>
            {avatarInitials(displayName, conversation?.user_phone)}
          </div>

          {displayName
            ? <p className="text-sm font-bold text-slate-800 text-center">{displayName}</p>
            : (
              <div className="flex items-center gap-1.5 text-slate-400">
                <UserPlus size={12} />
                <p className="text-xs font-medium">Sin nombre registrado</p>
              </div>
            )
          }

          <button
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors group"
          >
            <Phone size={10} className="text-slate-400" />
            <span className="text-xs font-mono text-slate-600">{conversation?.user_phone}</span>
            {copied
              ? <CheckCheck size={10} className="text-emerald-500" />
              : <Copy size={10} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            }
          </button>

          {contact && (
            <span className="mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-semibold">
              ✓ Contacto guardado
            </span>
          )}
        </div>

        {/* ── Formulario ─────────────────────────────────────────────────────── */}
        <div className="px-4 py-4 space-y-3.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Datos del contacto</p>

          {/* Nombre */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <User size={9} /> Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setSaveErr(null); }}
              placeholder="Nombre del contacto"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300 transition-shadow"
            />
          </div>

          {/* Empresa */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <Building2 size={9} /> Empresa cliente
            </label>
            <input
              type="text"
              value={form.company_name}
              onChange={e => { setForm(f => ({ ...f, company_name: e.target.value })); setSaveErr(null); }}
              placeholder="Empresa del contacto"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300 transition-shadow"
            />
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <FileText size={9} /> Notas internas
            </label>
            <textarea
              value={form.notes}
              onChange={e => { setForm(f => ({ ...f, notes: e.target.value })); setSaveErr(null); }}
              placeholder="Anotaciones sobre este contacto..."
              rows={3}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300 resize-none transition-shadow"
            />
          </div>
        </div>

        {/* ── Transferir conversación ─────────────────────────────────────────── */}
        {agents.length > 0 && conversation?.status !== 'closed' && (
          <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ArrowRightLeft size={9} /> Transferir conversación
            </p>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-slate-600"
            >
              <option value="">Seleccionar agente...</option>
              {agents
                .filter(a => a.id !== currentAssigned)
                .map(a => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
            <button
              onClick={handleTransfer}
              disabled={!selectedAgent || transferring}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                transferred
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : selectedAgent
                  ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm shadow-violet-500/20'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
              }`}
            >
              {transferred
                ? <><Check size={13} /> Transferida</>
                : transferring ? 'Transfiriendo...'
                : <><ArrowRightLeft size={13} /> Transferir</>}
            </button>
          </div>
        )}
      </div>

      {/* ── Botón guardar ──────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-2">
        {saveErr && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-center">{saveErr}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            saved
              ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200'
              : dirty
              ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/25 active:scale-95'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {saved ? <CheckCheck size={15} /> : <Save size={14} />}
          {saving ? 'Guardando...' : saved ? '¡Contacto guardado!' : 'Guardar contacto'}
        </button>
      </div>
    </div>
  );
}
