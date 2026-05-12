import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, companiesAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Download, BarChart2, MessageSquare, RefreshCw, Building2 } from 'lucide-react';

export default function Reports() {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies]   = useState([]);
  const [companyId, setCompanyId]   = useState('');
  const [from, setFrom]             = useState('');
  const [to, setTo]                 = useState('');
  const [counts, setCounts]         = useState(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      companiesAPI.getAll().then(setCompanies).catch(() => {});
    }
    // Default date range: last 30 days
    const now = new Date();
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    setTo(now.toISOString().slice(0, 10));
    setFrom(past.toISOString().slice(0, 10));
  }, [isSuperAdmin]);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (from)      params.from       = from;
      if (to)        params.to         = to;
      if (companyId) params.company_id = companyId;
      const data = await reportsAPI.count(params);
      setCounts(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [from, to, companyId]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  function buildParams() {
    const params = {};
    if (from)      params.from       = from;
    if (to)        params.to         = to;
    if (companyId) params.company_id = companyId;
    return params;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500 mt-0.5">Exporta datos de conversaciones y mensajes en CSV</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Empresa</label>
              <div className="relative">
                <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  className="w-full text-sm pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white appearance-none"
                >
                  <option value="">Todas las empresas</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={loadCounts}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-brand-600 font-semibold hover:text-brand-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar vista previa
        </button>
      </div>

      {/* Count preview */}
      {counts && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare size={20} className="text-brand-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.conversations.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Conversaciones</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-11 h-11 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart2 size={20} className="text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{counts.messages.toLocaleString()}</p>
              <p className="text-xs text-slate-500 font-medium">Mensajes</p>
            </div>
          </div>
        </div>
      )}

      {/* Download buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare size={17} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Conversaciones</p>
              <p className="text-xs text-slate-500 mt-0.5">ID, empresa, teléfono, estado, último mensaje, fechas</p>
            </div>
          </div>
          <button
            onClick={() => reportsAPI.downloadConvs(buildParams())}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-semibold shadow-sm shadow-emerald-500/20"
          >
            <Download size={15} />
            Descargar CSV
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart2 size={17} className="text-violet-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Mensajes</p>
              <p className="text-xs text-slate-500 mt-0.5">Empresa, teléfono, dirección, agente, contenido, fecha</p>
            </div>
          </div>
          <button
            onClick={() => reportsAPI.downloadMessages(buildParams())}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white rounded-xl hover:bg-violet-600 transition-colors text-sm font-semibold shadow-sm shadow-violet-500/20"
          >
            <Download size={15} />
            Descargar CSV
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Los archivos CSV incluyen BOM UTF-8 para compatibilidad con Excel. El rango de fechas aplica a <em>created_at</em>.
      </p>
    </div>
  );
}
