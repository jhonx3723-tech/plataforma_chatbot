import { useState, useEffect } from 'react';
import { X, Send, Search, ChevronRight, AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import { hsmAPI } from '../../lib/api';

const CATEGORY_LABEL = {
  MARKETING:      { label: 'Marketing',      cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  UTILITY:        { label: 'Utilidad',        cls: 'bg-blue-100 text-blue-700 border-blue-200'   },
  AUTHENTICATION: { label: 'Autenticación',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
};

// Extrae {{1}}, {{2}}, ... del body del template
function extractVarNumbers(template) {
  const body = template.components?.find(c => c.type === 'BODY');
  if (!body?.text) return [];
  const matches = [...body.text.matchAll(/\{\{(\d+)\}\}/g)];
  const nums = [...new Set(matches.map(m => m[1]))].sort((a, b) => Number(a) - Number(b));
  return nums;
}

function buildPreview(template, vars) {
  const body = template.components?.find(c => c.type === 'BODY');
  if (!body?.text) return '';
  return body.text.replace(/\{\{(\d+)\}\}/g, (_, n) =>
    vars[n] ? `*${vars[n]}*` : `{{${n}}}`
  );
}

function buildComponents(varNums, vars) {
  if (!varNums.length) return [];
  return [{
    type: 'body',
    parameters: varNums.map(n => ({ type: 'text', text: vars[n] || '' })),
  }];
}

export default function HSMTemplateModal({ conversationId, companyId, onClose, onSent }) {
  const [templates, setTemplates]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [vars, setVars]             = useState({});
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState(null);
  const [sent, setSent]             = useState(false);

  useEffect(() => {
    hsmAPI.getTemplates(companyId)
      .then(setTemplates)
      .catch(err => setError(err?.response?.data?.error || 'Error al cargar plantillas'))
      .finally(() => setLoading(false));
  }, [companyId]);

  function selectTemplate(t) {
    setSelected(t);
    setVars({});
    setSendError(null);
  }

  async function handleSend() {
    if (!selected) return;
    const varNums = extractVarNumbers(selected);
    setSending(true);
    setSendError(null);
    try {
      const preview = buildPreview(selected, vars).replace(/\*/g, '');
      const msg = await hsmAPI.send(conversationId, {
        templateName: selected.name,
        languageCode: selected.language,
        components:   buildComponents(varNums, vars),
        previewText:  preview,
      });
      setSent(true);
      setTimeout(() => { onSent(msg); onClose(); }, 1200);
    } catch (err) {
      setSendError(err?.response?.data?.error || 'Error al enviar plantilla');
    } finally {
      setSending(false);
    }
  }

  const filtered = templates.filter(t =>
    !search.trim() ||
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const varNums = selected ? extractVarNumbers(selected) : [];
  const preview = selected ? buildPreview(selected, vars) : '';
  const bodyText = selected?.components?.find(c => c.type === 'BODY')?.text || '';
  const headerComp = selected?.components?.find(c => c.type === 'HEADER');
  const footerComp = selected?.components?.find(c => c.type === 'FOOTER');
  const canSend = !varNums.length || varNums.every(n => vars[n]?.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Plantillas HSM de WhatsApp</h2>
            <p className="text-xs text-slate-400 mt-0.5">Plantillas aprobadas por Meta para iniciar conversaciones</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* ── Lista de plantillas ── */}
          <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar plantilla..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader size={16} className="animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              )}
              {error && (
                <div className="p-4 text-center">
                  <AlertCircle size={22} className="text-red-400 mx-auto mb-2" />
                  <p className="text-xs text-red-500 font-medium">{error}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Configura el WABA ID en Panel Admin → WhatsApp HSM</p>
                </div>
              )}
              {!loading && !error && filtered.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  {search ? 'Sin resultados' : 'No hay plantillas aprobadas'}
                </div>
              )}
              {filtered.map(t => {
                const cat = CATEGORY_LABEL[t.category] || { label: t.category, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                return (
                  <button
                    key={`${t.name}-${t.language}`}
                    onClick={() => selectTemplate(t)}
                    className={`w-full text-left px-3 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-2 ${selected?.name === t.name && selected?.language === t.language ? 'bg-brand-50 border-l-2 border-l-brand-400' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cat.cls}`}>{cat.label}</span>
                        <span className="text-[10px] text-slate-400">{t.language}</span>
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-slate-300 flex-shrink-0 mt-1" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel derecho: preview + variables ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Send size={22} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">Selecciona una plantilla</p>
                  <p className="text-xs text-slate-400 mt-1">Elige una de la lista para ver el preview y enviarla</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Template info */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-800">{selected.name}</h3>
                    {(() => {
                      const cat = CATEGORY_LABEL[selected.category] || { label: selected.category, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
                      return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.cls}`}>{cat.label}</span>;
                    })()}
                  </div>
                  <p className="text-xs text-slate-400">Idioma: {selected.language}</p>
                </div>

                {/* WhatsApp bubble preview */}
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Vista previa</p>
                  <div className="bg-[#e5ddd5] rounded-xl p-4">
                    <div className="bg-white rounded-xl rounded-tl-sm shadow-sm max-w-xs px-3 py-2.5 space-y-1">
                      {headerComp?.text && (
                        <p className="text-sm font-bold text-slate-800">{headerComp.text}</p>
                      )}
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {preview || bodyText}
                      </p>
                      {footerComp?.text && (
                        <p className="text-[11px] text-slate-400">{footerComp.text}</p>
                      )}
                      <p className="text-[10px] text-slate-300 text-right">ahora ✓✓</p>
                    </div>
                  </div>
                </div>

                {/* Variables */}
                {varNums.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Completa las variables
                    </p>
                    <div className="space-y-2">
                      {varNums.map(n => (
                        <div key={n} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-brand-500 bg-brand-50 border border-brand-100 rounded-md px-2 py-1 w-12 text-center flex-shrink-0">
                            {`{{${n}}}`}
                          </span>
                          <input
                            type="text"
                            value={vars[n] || ''}
                            onChange={e => setVars(v => ({ ...v, [n]: e.target.value }))}
                            placeholder={`Variable ${n}...`}
                            className="flex-1 text-sm px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sendError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    {sendError}
                  </div>
                )}
              </div>
            )}

            {/* Footer con botón enviar */}
            {selected && (
              <div className="border-t border-slate-100 px-5 py-4">
                <button
                  onClick={handleSend}
                  disabled={!canSend || sending || sent}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    sent
                      ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200'
                      : canSend
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-md shadow-brand-500/20'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  }`}
                >
                  {sent
                    ? <><CheckCircle2 size={15} /> ¡Plantilla enviada!</>
                    : sending
                    ? 'Enviando...'
                    : <><Send size={14} /> Enviar plantilla HSM</>
                  }
                </button>
                {!canSend && varNums.length > 0 && (
                  <p className="text-center text-[11px] text-slate-400 mt-1.5">Completa todas las variables para enviar</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
