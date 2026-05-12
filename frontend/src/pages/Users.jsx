import { useState, useEffect } from 'react';
import { usersAPI, companiesAPI } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import {
  Plus, Trash2, KeyRound, UserCircle2, Building2,
  ToggleLeft, ToggleRight, Mail, ShieldCheck, Users as UsersIcon,
} from 'lucide-react';

const ROLE_LABEL = { client: 'Cliente', company_agent: 'Agente' };
const ROLE_COLOR = {
  client:        'bg-brand-50 text-brand-700 border-brand-200',
  company_agent: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function Users() {
  const toast = useToast();
  const [users, setUsers]         = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState({ username: '', email: '', password: '', company_id: '', role: 'client' });
  const [saving, setSaving]           = useState(false);

  const [pwdModal, setPwdModal]   = useState(null);
  const [newPwd, setNewPwd]       = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    try {
      const [u, c] = await Promise.all([usersAPI.getAll(), companiesAPI.getAll()]);
      setUsers(u);
      setCompanies(c);
    } catch {
      toast.error('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.username || !form.password || !form.company_id) return;
    if (form.role === 'client' && !form.email) {
      toast.error('El correo es requerido para clientes');
      return;
    }
    setSaving(true);
    try {
      await usersAPI.create(form);
      toast.success(`${ROLE_LABEL[form.role]} creado correctamente`);
      setForm({ username: '', email: '', password: '', company_id: '', role: 'client' });
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPwd || newPwd.length < 6) return;
    setSavingPwd(true);
    try {
      await usersAPI.resetPassword(pwdModal.id, newPwd);
      toast.success('Contraseña restablecida');
      setPwdModal(null);
      setNewPwd('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar contraseña');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleToggle(u) {
    try {
      const res = await usersAPI.toggleActive(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: res.active } : x));
      toast.info(res.active ? `Acceso de ${u.username} activado` : `Acceso de ${u.username} desactivado`);
    } catch {
      toast.error('Error al cambiar estado');
    }
  }

  async function handleDelete(id) {
    try {
      await usersAPI.remove(id);
      toast.success('Usuario eliminado');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    } finally {
      setConfirmDelete(null);
    }
  }

  const clients = users.filter(u => u.role === 'client');
  const agents  = users.filter(u => u.role === 'company_agent');

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestiona accesos de clientes y agentes</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreate && (
        <div className="card p-6 mb-8">
          <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <UsersIcon size={16} className="text-brand-500" />
            Crear acceso de usuario
          </h2>

          {/* Selector de rol */}
          <div className="flex gap-3 mb-5">
            {[
              { key: 'client',        label: 'Cliente',         desc: 'Solo ve su bandeja',         icon: ShieldCheck },
              { key: 'company_agent', label: 'Agente',          desc: 'Gestiona conversaciones',    icon: UserCircle2 },
            ].map(({ key, label, desc, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm(f => ({ ...f, role: key }))}
                className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  form.role === key
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${form.role === key ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${form.role === key ? 'text-brand-700' : 'text-slate-700'}`}>{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Usuario *</label>
                <input className="input" placeholder="nombre.apellido"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Correo electrónico {form.role === 'client' ? '*' : '(opcional)'}
                </label>
                <input className="input" type="email" placeholder="correo@empresa.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required={form.role === 'client'} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Contraseña *</label>
                <input className="input" type="password" placeholder="Mín. 6 caracteres"
                  value={form.password} minLength={6}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Empresa *</label>
                <select className="input" value={form.company_id}
                  onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))} required>
                  <option value="">Selecciona empresa</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Creando...' : `Crear ${ROLE_LABEL[form.role]}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-2 bg-slate-50 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Sección Clientes */}
          <Section
            title="Clientes"
            icon={ShieldCheck}
            color="brand"
            users={clients}
            emptyText="No hay clientes creados"
            emptyDesc="Crea un cliente para darle acceso a su bandeja de entrada"
            onReset={u => { setPwdModal(u); setNewPwd(''); }}
            onToggle={handleToggle}
            onDelete={u => setConfirmDelete(u)}
          />

          {/* Sección Agentes */}
          <Section
            title="Agentes"
            icon={UserCircle2}
            color="violet"
            users={agents}
            emptyText="No hay agentes creados"
            emptyDesc="Los agentes gestionan la bandeja de su empresa"
            onReset={u => { setPwdModal(u); setNewPwd(''); }}
            onToggle={handleToggle}
            onDelete={u => setConfirmDelete(u)}
          />
        </div>
      )}

      {/* Modal restablecer contraseña */}
      {pwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                <KeyRound size={16} className="text-brand-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Restablecer acceso</h3>
                <p className="text-xs text-slate-500">{pwdModal.username}{pwdModal.email ? ` · ${pwdModal.email}` : ''}</p>
              </div>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input className="input w-full" type="password"
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                minLength={6} required autoFocus />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setPwdModal(null)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={savingPwd} className="btn-primary">
                  {savingPwd ? 'Guardando...' : 'Restablecer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar usuario"
          message={`¿Eliminar a "${confirmDelete.username}"? Esta acción no se puede deshacer.`}
          danger
          confirmText="Eliminar"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, users, emptyText, emptyDesc, onReset, onToggle, onDelete }) {
  const headerColor = color === 'brand'
    ? 'text-brand-600 bg-brand-50 border-brand-100'
    : 'text-violet-600 bg-violet-50 border-violet-100';
  const avatarColor = color === 'brand'
    ? 'bg-brand-500/10 border-brand-500/20 text-brand-600'
    : 'bg-violet-500/10 border-violet-500/20 text-violet-600';

  return (
    <div>
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border w-fit ${headerColor}`}>
        <Icon size={14} />
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
        <span className="text-xs opacity-60">({users.length})</span>
      </div>

      {users.length === 0 ? (
        <div className="card text-center py-10">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Icon size={22} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">{emptyText}</p>
          <p className="text-xs text-slate-400 mt-0.5">{emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className={`card flex items-center justify-between gap-4 px-5 py-4 ${!u.active ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`}>
                  {u.username[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{u.username}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {!u.active && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-200">
                        Desactivado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {u.email && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Mail size={11} /> {u.email}
                      </span>
                    )}
                    {u.company_name && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Building2 size={11} /> {u.company_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Activar / desactivar */}
                <button
                  onClick={() => onToggle(u)}
                  title={u.active ? 'Desactivar acceso' : 'Activar acceso'}
                  className={`p-2 rounded-xl transition-colors ${u.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
                >
                  {u.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>

                {/* Restablecer contraseña */}
                <button
                  onClick={() => onReset(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Restablecer contraseña"
                >
                  <KeyRound size={13} /> Acceso
                </button>

                {/* Eliminar */}
                <button
                  onClick={() => onDelete(u)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
