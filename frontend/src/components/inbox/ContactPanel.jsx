import { useState, useEffect } from 'react';
import { User, Building2, FileText, Save, ChevronRight, ChevronLeft, ArrowRightLeft, Check } from 'lucide-react';
import { contactsAPI, conversationsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function ContactPanel({ conversation, companyId, onContactUpdated, onTransferred }) {
  const { user } = useAuth();
  const [contact, setContact]   = useState(null);
  const [form, setForm]         = useState({ name: '', company_name: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [agents, setAgents]           = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [transferring, setTransferring]   = useState(false);
  const [transferred, setTransferred]     = useState(false);

  useEffect(() => {
    if (!conversation?.user_phone || !companyId) return;
    setContact(null);
    setSaved(false);
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
    try {
      const saved = await contactsAPI.save({
        phone:        conversation.user_phone,
        company_id:   companyId,
        name:         form.name        || null,
        company_name: form.company_name || null,
        notes:        form.notes       || null,
      });
      setContact(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onContactUpdated?.(saved);
    } catch { /* silent */ }
    finally { setSaving(false); }
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

  const dirty = contact
    ? form.name !== (contact.name || '') || form.company_name !== (contact.company_name || '') || form.notes !== (contact.notes || '')
    : form.name || form.company_name || form.notes;

  const currentAssigned = conversation?.assigned_to;

  if (collapsed) {
    return (
      <div className="w-8 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col items-center py-4">
        <button onClick={() => setCollapsed(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <div className="mt-3 [writing-mode:vertical-lr] text-[10px] text-slate-400 font-semibold tracking-widest uppercase rotate-180">
          Contacto
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
            <User size={13} className="text-brand-500" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Contacto</span>
        </div>
        <button onClick={() => setCollapsed(true)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Teléfono */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Teléfono</p>
          <p className="text-sm font-mono text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
            {conversation?.user_phone}
          </p>
        </div>

        {/* Nombre */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Nombre</label>
          <div className="relative">
            <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del contacto"
              className="w-full text-sm pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300" />
          </div>
        </div>

        {/* Empresa */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Empresa cliente</label>
          <div className="relative">
            <Building2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input type="text" value={form.company_name}
              onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
              placeholder="Empresa del contacto"
              className="w-full text-sm pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300" />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Notas internas</label>
          <div className="relative">
            <FileText size={12} className="absolute left-2.5 top-2.5 text-slate-300" />
            <textarea value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Anotaciones sobre este contacto..."
              rows={4}
              className="w-full text-sm pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-slate-300 resize-none" />
          </div>
        </div>

        {/* Transferir a otro agente */}
        {agents.length > 0 && conversation?.status !== 'closed' && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ArrowRightLeft size={10} /> Transferir conversación
            </p>
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="w-full text-sm px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white text-slate-700 mb-2"
            >
              <option value="">Seleccionar agente...</option>
              {agents
                .filter(a => a.id !== currentAssigned)
                .map(a => (
                  <option key={a.id} value={a.id}>{a.username}</option>
                ))}
            </select>
            <button
              onClick={handleTransfer}
              disabled={!selectedAgent || transferring}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
                transferred
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : selectedAgent
                  ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-sm'
                  : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
              }`}
            >
              {transferred
                ? <><Check size={14} /> Transferida</>
                : transferring
                ? 'Transfiriendo...'
                : <><ArrowRightLeft size={14} /> Transferir</>}
            </button>
          </div>
        )}
      </div>

      {/* Guardar contacto */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : dirty
              ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/20'
              : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
          }`}
        >
          <Save size={14} />
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar contacto'}
        </button>
      </div>
    </div>
  );
}
