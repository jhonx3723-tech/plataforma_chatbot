import { useState } from 'react';
import { X, Info, Building2, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const DAYS = [
  { key: '1', label: 'Lunes'     },
  { key: '2', label: 'Martes'    },
  { key: '3', label: 'Miércoles' },
  { key: '4', label: 'Jueves'    },
  { key: '5', label: 'Viernes'   },
  { key: '6', label: 'Sábado'    },
  { key: '0', label: 'Domingo'   },
];

const DEFAULT_SCHEDULE = {
  '1': { open: true,  from: '08:00', to: '18:00' },
  '2': { open: true,  from: '08:00', to: '18:00' },
  '3': { open: true,  from: '08:00', to: '18:00' },
  '4': { open: true,  from: '08:00', to: '18:00' },
  '5': { open: true,  from: '08:00', to: '18:00' },
  '6': { open: false, from: '08:00', to: '13:00' },
  '0': { open: false, from: '08:00', to: '18:00' },
};

function initBH(bh) {
  return {
    enabled:        bh?.enabled        ?? false,
    timezone:       bh?.timezone       ?? 'America/Bogota',
    schedule:       bh?.schedule       ?? DEFAULT_SCHEDULE,
    closed_message: bh?.closed_message ?? 'Hola 👋 En este momento estamos fuera de horario de atención. Te responderemos a la brevedad.',
  };
}

export default function CompanyModal({ company, onClose, onSave }) {
  const [form, setForm] = useState({
    name:              company?.name              || '',
    phone:             company?.phone             || '',
    whatsapp_phone_id: company?.whatsapp_phone_id || '',
    whatsapp_token:    company?.whatsapp_token    || '',
    business_hours:    initBH(company?.business_hours),
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showHours, setShowHours] = useState(false);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  function setBH(key, value) {
    setForm(f => ({ ...f, business_hours: { ...f.business_hours, [key]: value } }));
  }

  function setDayField(dayKey, field, value) {
    setForm(f => ({
      ...f,
      business_hours: {
        ...f.business_hours,
        schedule: {
          ...f.business_hours.schedule,
          [dayKey]: { ...f.business_hours.schedule[dayKey], [field]: value },
        },
      },
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  }

  const bh = form.business_hours;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">

        {/* Header fijo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <Building2 size={15} className="text-brand-500" />
            </div>
            <h2 className="font-bold text-slate-900">
              {company ? 'Editar empresa' : 'Nueva empresa'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 p-6 space-y-4">

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-sm flex items-center gap-2">
                <span className="text-red-400 font-bold">✕</span>
                {error}
              </div>
            )}

            {/* Datos básicos */}
            <Field label="Nombre de la empresa *" hint="Nombre visible en la plataforma">
              <input type="text" required value={form.name} onChange={set('name')}
                className="input" placeholder="Ej: Mi Empresa S.A." />
            </Field>

            <Field label="Número de WhatsApp *" hint="Con código de país, sin + ni espacios">
              <input type="text" required value={form.phone} onChange={set('phone')}
                className="input" placeholder="Ej: 521234567890" />
            </Field>

            {/* WhatsApp Business API */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-800">WhatsApp Business API</p>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Opcional</span>
              </div>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <Info size={12} className="flex-shrink-0" />
                Solo necesario para enviar mensajes reales.
              </p>
              <div className="space-y-3">
                <Field label="Phone Number ID">
                  <input type="text" value={form.whatsapp_phone_id} onChange={set('whatsapp_phone_id')}
                    className="input" placeholder="ID del número en Meta" />
                </Field>
                <Field label="Access Token">
                  <input type="password" value={form.whatsapp_token} onChange={set('whatsapp_token')}
                    className="input" placeholder="Token de acceso permanente" />
                </Field>
              </div>
            </div>

            {/* Horario de atención (colapsable) */}
            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowHours(v => !v)}
                className="w-full flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-brand-50 rounded-lg flex items-center justify-center">
                    <Clock size={13} className="text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Horario de atención</p>
                    <p className="text-xs text-slate-400">
                      {bh.enabled ? 'Activo — bot solo responde en horario' : 'Desactivado — bot responde siempre'}
                    </p>
                  </div>
                </div>
                {showHours
                  ? <ChevronUp size={16} className="text-slate-400" />
                  : <ChevronDown size={16} className="text-slate-400" />
                }
              </button>

              {showHours && (
                <div className="mt-4 space-y-4">
                  {/* Toggle activar/desactivar */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setBH('enabled', !bh.enabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${bh.enabled ? 'bg-brand-500' : 'bg-slate-200'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${bh.enabled ? 'translate-x-5' : ''}`} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {bh.enabled ? 'Horario activado' : 'Activar horario de atención'}
                    </span>
                  </label>

                  {bh.enabled && (
                    <>
                      {/* Tabla de días */}
                      <div className="space-y-2">
                        {DAYS.map(({ key, label }) => {
                          const day = bh.schedule[key] || { open: false, from: '08:00', to: '18:00' };
                          return (
                            <div key={key} className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${day.open ? 'bg-brand-50 border border-brand-100' : 'bg-slate-50 border border-slate-100'}`}>
                              {/* Toggle día */}
                              <div
                                onClick={() => setDayField(key, 'open', !day.open)}
                                className={`relative w-8 h-4 rounded-full flex-shrink-0 cursor-pointer transition-colors ${day.open ? 'bg-brand-500' : 'bg-slate-300'}`}
                              >
                                <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${day.open ? 'translate-x-4' : ''}`} />
                              </div>

                              <span className={`text-xs font-semibold w-20 flex-shrink-0 ${day.open ? 'text-slate-800' : 'text-slate-400'}`}>
                                {label}
                              </span>

                              {day.open ? (
                                <>
                                  <input
                                    type="time"
                                    value={day.from}
                                    onChange={e => setDayField(key, 'from', e.target.value)}
                                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white min-w-0"
                                  />
                                  <span className="text-xs text-slate-400 flex-shrink-0">a</span>
                                  <input
                                    type="time"
                                    value={day.to}
                                    onChange={e => setDayField(key, 'to', e.target.value)}
                                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white min-w-0"
                                  />
                                </>
                              ) : (
                                <span className="text-xs text-slate-400 flex-1">Cerrado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Zona horaria */}
                      <Field label="Zona horaria">
                        <select
                          value={bh.timezone}
                          onChange={e => setBH('timezone', e.target.value)}
                          className="input"
                        >
                          <option value="America/Bogota">Colombia (UTC-5)</option>
                          <option value="America/Mexico_City">México Ciudad (UTC-6)</option>
                          <option value="America/Lima">Perú / Lima (UTC-5)</option>
                          <option value="America/Santiago">Chile / Santiago (UTC-4)</option>
                          <option value="America/Buenos_Aires">Argentina (UTC-3)</option>
                          <option value="America/Caracas">Venezuela (UTC-4)</option>
                          <option value="America/Guayaquil">Ecuador (UTC-5)</option>
                          <option value="America/La_Paz">Bolivia (UTC-4)</option>
                          <option value="America/Asuncion">Paraguay (UTC-4)</option>
                          <option value="America/Montevideo">Uruguay (UTC-3)</option>
                        </select>
                      </Field>

                      {/* Mensaje fuera de horario */}
                      <Field label="Mensaje fuera de horario">
                        <textarea
                          rows={3}
                          value={bh.closed_message}
                          onChange={e => setBH('closed_message', e.target.value)}
                          className="input resize-none"
                          placeholder="Hola 👋 En este momento estamos fuera de horario..."
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          Este mensaje se envía cuando el usuario escribe fuera del horario configurado.
                        </p>
                      </Field>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Botones fijos */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700 block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
