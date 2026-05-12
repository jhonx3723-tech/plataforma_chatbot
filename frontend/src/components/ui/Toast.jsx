import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  const add = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const toast = {
    success: msg => add(msg, 'success'),
    error: msg => add(msg, 'error'),
    info: msg => add(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto toast-enter">
            <ToastItem {...t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const STYLES = {
  success: { icon: CheckCircle2, bg: 'bg-white border-green-200', bar: 'bg-green-400', icon: 'text-green-500' },
  error:   { icon: XCircle,      bg: 'bg-white border-red-200',   bar: 'bg-red-400',   icon: 'text-red-500'   },
  info:    { icon: Info,         bg: 'bg-white border-sky-200',   bar: 'bg-sky-400',   icon: 'text-sky-500'   },
};

function ToastItem({ message, type, onClose }) {
  const s = STYLES[type] || STYLES.info;
  const Icon = s.icon;
  return (
    <div className={`flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-xl ${s.bg} min-w-[280px] max-w-sm overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar} rounded-l-xl`} />
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${s.icon}`} />
      <p className="text-sm font-medium text-gray-800 flex-1 leading-snug">{message}</p>
      <button onClick={onClose} className="flex-shrink-0 p-0.5 text-gray-300 hover:text-gray-500 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
