import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'Eliminar', danger = true }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-500' : 'text-amber-500'} />
        </div>
        <h3 className="font-bold text-gray-900 text-lg mb-1">{title}</h3>
        <p className="text-gray-500 text-sm mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
