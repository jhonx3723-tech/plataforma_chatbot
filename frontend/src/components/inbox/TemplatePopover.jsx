import { useEffect, useRef } from 'react';
import { Zap } from 'lucide-react';

export default function TemplatePopover({ templates, query, onSelect, onClose }) {
  const listRef = useRef(null);

  const filtered = templates.filter(t =>
    !query || t.shortcut.startsWith(query.toLowerCase())
  );

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50 max-h-56 overflow-y-auto"
    >
      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
        <Zap size={11} className="text-brand-500" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Plantillas rápidas
        </span>
      </div>
      {filtered.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.content)}
          className="w-full text-left px-3 py-2.5 hover:bg-brand-50 transition-colors border-b border-slate-50 last:border-0"
        >
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-brand-500 font-mono">/{t.shortcut}</span>
            <span className="text-xs text-slate-500 truncate flex-1">{t.content}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
