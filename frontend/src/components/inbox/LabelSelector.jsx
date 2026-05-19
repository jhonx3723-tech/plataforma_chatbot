import { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { labelsAPI } from '../../lib/api';

export default function LabelSelector({ conversation, labels, onLabelsChange }) {
  const [open, setOpen] = useState(false);
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
          <button type="button" onClick={() => toggleLabel(l)} className="hover:opacity-70 transition-opacity">
            <X size={9} />
          </button>
        </span>
      ))}

      {/* Botón asignar etiqueta */}
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
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
            <div className="p-2 max-h-44 overflow-y-auto">
              {labels.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">
                  Sin etiquetas — el administrador debe crearlas
                </p>
              ) : (
                labels.map(l => {
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
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
