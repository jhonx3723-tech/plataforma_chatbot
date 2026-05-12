import { useState } from 'react';
import { KeyRound, X, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../../lib/api';

export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current: '', newPassword: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword(form.current, form.newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <KeyRound size={15} className="text-brand-500" />
            </div>
            <h2 className="font-bold text-slate-900">Cambiar contraseña</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-semibold text-slate-900 mb-1">¡Contraseña actualizada!</p>
            <p className="text-sm text-slate-500 mb-5">Usa tu nueva contraseña la próxima vez que inicies sesión.</p>
            <button onClick={onClose} className="btn-primary w-full">Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  value={form.current}
                  onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
                  className="input pr-10"
                  placeholder="••••••••"
                  autoFocus
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required minLength={6}
                  value={form.newPassword}
                  onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="input pr-10"
                  placeholder="Mín. 6 caracteres"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password" required
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="input"
                placeholder="Repite la nueva contraseña"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 btn-primary">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : 'Actualizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
