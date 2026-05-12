import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquareMore, Eye, EyeOff, Zap } from 'lucide-react';
import { authAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(form.username, form.password);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Panel izquierdo decorativo */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-brand-600/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          <div className="w-20 h-20 bg-brand-500/20 border border-brand-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-brand-500/20">
            <MessageSquareMore size={36} className="text-brand-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Plataforma de Chatbots</h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Automatiza la atención al cliente de tus empresas con flujos inteligentes de WhatsApp.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { icon: '⚡', title: 'Respuesta inmediata', desc: 'Bot activo 24/7' },
              { icon: '🔀', title: 'Flow Builder', desc: 'Sin código' },
              { icon: '👥', title: 'Multi-empresa', desc: 'Hasta 50 empresas' },
              { icon: '📥', title: 'Bandeja unificada', desc: 'Todo en un lugar' },
            ].map(item => (
              <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-lg mb-1">{item.icon}</p>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
              <MessageSquareMore size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">BotBuilder</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="text-slate-500 mt-1 text-sm">Inicia sesión para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-red-400">✕</span>
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Usuario</label>
              <input
                type="text"
                required
                autoFocus
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                className="input"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 mt-2 flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </span>
              ) : (
                <>
                  <Zap size={16} />
                  Ingresar
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Por defecto: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">admin</span> / <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">admin123</span>
          </p>

          <p className="text-xs text-slate-400 text-center mt-8 border-t border-slate-200 pt-6">
            Powered by <span className="font-semibold text-slate-600">Cato Creativo</span>
          </p>
        </div>
      </div>
    </div>
  );
}
