import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UserRound, Search, Building2, FileText, Phone,
  Pencil, Trash2, Save, RefreshCw, X, Download, Upload,
  CheckCircle, AlertCircle, ChevronDown,
} from 'lucide-react';
import { contactsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';

// ── ImportModal ────────────────────────────────────────────────────────────────
function ImportModal({ companyId, onClose, onImported }) {
  const [step,     setStep]     = useState('upload'); // upload | mapping | importing | result
  const [file,     setFile]     = useState(null);
  const [columns,  setColumns]  = useState([]);
  const [preview,  setPreview]  = useState([]);
  const [mapping,  setMapping]  = useState({ phone: '', name: '', company_name: '', notes: '' });
  const [result,   setResult]   = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const toast = useToast();

  function parseCsvPreview(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return { cols: [], rows: [] };
    const sep  = lines[0].includes(';') ? ';' : ',';
    const cols = lines[0].split(sep).map(c => c.replace(/^"|"$/g, '').trim());
    const rows = lines.slice(1, 6).map(l =>
      l.split(sep).map(v => v.replace(/^"|"$/g, '').trim())
    );
    return { cols, rows };
  }

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => {
      const { cols, rows } = parseCsvPreview(e.target.result);
      setColumns(cols);
      setPreview(rows);
      // Auto-detectar columnas
      const auto = { phone: '', name: '', company_name: '', notes: '' };
      cols.forEach(c => {
        const cl = c.toLowerCase();
        if (!auto.phone        && /tel[eé]?fono|phone|celular|m[oó]vil|cel|whatsapp/i.test(cl)) auto.phone = c;
        if (!auto.name         && /^nombre$|^name$/i.test(cl)) auto.name = c;
        if (!auto.company_name && /empresa|company/i.test(cl))  auto.company_name = c;
        if (!auto.notes        && /notas|notes/i.test(cl))       auto.notes = c;
      });
      setMapping(auto);
      setStep('mapping');
    };
    reader.readAsText(f, 'utf-8');
  }

  async function handleImport() {
    if (!mapping.phone) { toast.error('Selecciona la columna de teléfono'); return; }
    setStep('importing');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId || '');
    formData.append('mapping', JSON.stringify(mapping));
    const token = localStorage.getItem('token');
    try {
      const resp = await fetch('/api/contacts/import', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error);
      setResult(data);
      setStep('result');
      onImported?.();
    } catch (err) {
      toast.error(err.message);
      setStep('mapping');
    }
  }

  const FIELD_LABELS = { phone: 'Teléfono *', name: 'Nombre', company_name: 'Empresa', notes: 'Notas' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-brand-500" />
            <h3 className="font-bold text-slate-800">Importar contactos</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Sube un archivo CSV o Excel exportado como CSV. Debe tener al menos una columna de teléfono.
              </p>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                  dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                }`}
              >
                <Upload size={32} className={`mx-auto mb-3 ${dragging ? 'text-brand-500' : 'text-slate-300'}`} />
                <p className="font-semibold text-slate-600 text-sm">Arrastra tu CSV aquí</p>
                <p className="text-xs text-slate-400 mt-1">o haz clic para seleccionar</p>
                <p className="text-[10px] text-slate-300 mt-3">CSV, máx. 10MB</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />

              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Formato recomendado de columnas:</p>
                <code className="text-[11px] text-brand-600 font-mono">Teléfono, Nombre, Empresa, Notas</code>
              </div>
            </div>
          )}

          {/* ── Step 2: Mapping ── */}
          {step === 'mapping' && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">{file?.name}</p>
              <p className="text-xs text-slate-400 mb-4">{columns.length} columnas detectadas. Mapea cada campo:</p>

              <div className="space-y-3 mb-5">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <div key={field} className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600 w-28 flex-shrink-0">{label}</label>
                    <select
                      value={mapping[field]}
                      onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                    >
                      <option value="">— No importar —</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Vista previa (primeras 5 filas)</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50">
                        <tr>{columns.map(c => <th key={c} className="px-2 py-1.5 text-left text-slate-500 font-semibold">{c}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-t border-slate-50">
                            {row.map((v, j) => <td key={j} className="px-2 py-1.5 text-slate-600 max-w-[80px] truncate">{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <span className="w-10 h-10 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
              <p className="font-semibold text-slate-600">Importando contactos...</p>
              <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
            </div>
          )}

          {/* ── Step 4: Result ── */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircle size={24} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-700">{result.imported} contactos importados</p>
                  <p className="text-xs text-emerald-600">de {result.total} filas en el archivo</p>
                </div>
              </div>
              {result.skipped > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <AlertCircle size={12} /> {result.skipped} fila{result.skipped !== 1 ? 's' : ''} omitida{result.skipped !== 1 ? 's' : ''} (teléfono inválido)
                  </p>
                  {result.errors?.slice(0, 3).map((e, i) => (
                    <p key={i} className="text-[10px] text-amber-600 mt-1">Fila {e.row}: "{e.value}" — {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end flex-shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
          )}
          {step === 'mapping' && (
            <>
              <button onClick={() => setStep('upload')} className="btn-secondary">Volver</button>
              <button onClick={handleImport} disabled={!mapping.phone}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Upload size={13} /> Importar contactos
              </button>
            </>
          )}
          {step === 'result' && (
            <button onClick={onClose} className="btn-primary">Listo</button>
          )}
        </div>
      </div>
    </div>
  );
}

function avatarLetters(c) {
  return (c.name || c.phone || '?').slice(0, 2).toUpperCase();
}

export default function Contacts() {
  const { user } = useAuth();
  const toast    = useToast();
  const companyId = user?.company_id;

  const [contacts, setContacts]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [editing, setEditing]               = useState(null);
  const [form, setForm]                     = useState({ name: '', company_name: '', notes: '' });
  const [saving, setSaving]                 = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [showImport,    setShowImport]      = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setContacts(await contactsAPI.getAll({ company_id: companyId }));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name || '', company_name: c.company_name || '', notes: c.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await contactsAPI.update(editing.id, form);
      setContacts(prev => prev.map(c => c.id === editing.id ? { ...c, ...updated } : c));
      setEditing(null);
      toast.success('Contacto actualizado');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await contactsAPI.remove(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setConfirmDelete(null);
      if (editing?.id === id) setEditing(null);
      toast.success('Contacto eliminado');
    } catch { toast.error('Error al eliminar'); }
  }

  const filtered = contacts.filter(c =>
    !search.trim() ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Contactos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestiona los contactos de tu empresa</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm">
            <Upload size={14} /> Importar CSV
          </button>
          <button onClick={() => contactsAPI.exportCSV(companyId)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Search bar + count + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={13} />
            </button>
          )}
        </div>
        <p className="text-sm text-slate-400 flex-shrink-0 hidden sm:block">
          {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="bg-brand-50/40 border border-brand-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Pencil size={14} className="text-brand-500" />
            Editando: <span className="text-brand-600 font-mono">{editing.phone}</span>
          </h3>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre</label>
              <div className="relative">
                <UserRound size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                  placeholder="Nombre del contacto"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Empresa cliente</label>
              <div className="relative">
                <Building2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                  placeholder="Empresa"
                  value={form.company_name}
                  onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Notas internas</label>
              <div className="relative">
                <FileText size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
                  placeholder="Notas internas"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2 transition-colors shadow-sm"
              >
                <Save size={13} />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table / empty state */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl text-center py-14">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserRound size={22} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">
            {search ? 'Sin resultados' : 'No hay contactos registrados'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {search ? 'Prueba con otro nombre o teléfono' : 'Los contactos se crean desde la bandeja de conversaciones'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Notas</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {avatarLetters(c)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {c.name || <span className="text-slate-400 font-normal italic">Sin nombre</span>}
                        </p>
                        <p className="text-xs text-slate-400 sm:hidden">{c.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-slate-600 font-mono text-xs">
                      <Phone size={11} className="text-slate-300" />{c.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs truncate max-w-[140px]">
                    {c.company_name || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs truncate max-w-[160px]">
                    {c.notes || <span className="text-slate-200">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showImport && (
        <ImportModal
          companyId={companyId}
          onClose={() => setShowImport(false)}
          onImported={() => { load(); setShowImport(false); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar contacto"
          message={`¿Eliminar el contacto "${confirmDelete.name || confirmDelete.phone}"? Se perderán los datos guardados.`}
          danger
          confirmText="Eliminar"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
