import { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { labelsAPI } from '../../lib/api';

const PRESET_COLORS = [
  '#f97316', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#f59e0b', '#6366f1',
];

export default function LabelSelector({ conversation, labels, onLabelsChange, companyId }) {
  const [open, setOpen]         = useState(false);
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const ref = useRef(null);

  const convLabelIds = conversation?.label_ids || [];

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function toggleLabel(label) {
    const has = convLabelIds.includes(label.id);
    try {
      if (has) {
        await labelsAPI.removeFromConv(conversation.id, label.id);
        onLabelsChange(convLabelIds.filter(id => id !== label.id));
      } else {
        await labelsAPI.addToConv(conversation.id, label.id);
        onLabelsChange([...convLabelIds, label.id]);
      }
    } catch { /* silent */ }
  }

  async function createLabel() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const label = await labelsAPI.create({ name: newName.trim(), color: newColor, company_id: companyId });
      onLabelsChange(convLabelIds, [...labels, label]);
      setNewName('');
      setShowForm(false);
    } catch { /* silent */ }
    finally { setCreating(false); }
  }

  const activeLabels = labels.filter(l => convLabelIds.includes(l.id));

  return (
    <div className="flex items-center gap-1.5 flex-wrap" ref={ref}>
      {/* Chips de etiquetas activas */}
      {activeLabels.map(l => (
        <span
          key={l.id}
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: l.color + '22', color: l.color, border: `1px solid ${l.color}44` }}
        >
          {l.name}
          <button
            type="button"
            onClick={() => toggleLabel(l)}
            className="hover:opacity-70 transition-opacity"
          >
            <X size={9} />
          </button>
        </span>
      ))}

      {/* Botón agregar */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded-full border border-dashed border-slate-200 hover:border-slate-400 transition-colors"
        >
          <Tag size={9} />
          <Plus size={9} />
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
            <div className="p-2 max-h-44 overflow-y-auto">
              {labels.length === 0 && !showForm && (
                <p className="text-xs text-slate-400 text-center py-2">Sin etiquetas creadas</p>
              )}
              {labels.map(l => {
                const active = convLabelIds.includes(l.id);
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => toggleLabel(l)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="text-xs text-slate-700 flex-1 text-left">{l.name}</span>
                    {active && <Check size={11} className="text-emerald-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Crear nueva etiqueta */}
            {showForm ? (
              <div className="border-t border-slate-100 p-2 space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createLabel()}
                  placeholder="Nombre de etiqueta"
                  className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${newColor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-xs py-1 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={createLabel}
                    disabled={!newName.trim() || creating}
                    className="flex-1 text-xs py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-40 transition-colors"
                  >
                    {creating ? '...' : 'Crear'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="w-full border-t border-slate-100 text-xs text-brand-500 py-2 hover:bg-brand-50 transition-colors flex items-center justify-center gap-1 rounded-b-xl"
              >
                <Plus size={11} /> Nueva etiqueta
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
