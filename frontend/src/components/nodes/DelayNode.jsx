import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Timer } from 'lucide-react';

const UNITS = [
  { value: 'seconds', label: 'segundos' },
  { value: 'minutes', label: 'minutos'  },
  { value: 'hours',   label: 'horas'    },
];

export default function DelayNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  const duration = data.duration || 5;
  const unit     = data.unit     || 'minutes';

  const unitLabel = UNITS.find(u => u.value === unit)?.label || 'minutos';

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[240px] transition-shadow ${
      selected ? 'border-amber-500 shadow-md shadow-amber-100' : 'border-amber-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />

      {/* Header */}
      <div className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <Timer size={13} />
        NODO DE ESPERA
      </div>

      <div className="p-3 space-y-2.5">
        {/* Duración */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Esperar durante</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="1440"
              className="nodrag w-20 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-center font-mono"
              value={duration}
              onChange={e => updateNodeData(id, { duration: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <select
              className="nodrag flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              value={unit}
              onChange={e => updateNodeData(id, { unit: e.target.value })}
            >
              {UNITS.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mensaje a enviar al dispararse (opcional) */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Mensaje al dispararse <span className="text-gray-300">(opcional)</span>
          </label>
          <textarea
            rows={2}
            className="nodrag w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
            value={data.message || ''}
            onChange={e => updateNodeData(id, { message: e.target.value })}
            placeholder="Ej: ¿Pudiste completar el proceso? 😊"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Se envía cuando se cumple el tiempo de espera</p>
        </div>

        {/* Vista previa */}
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 text-[11px] text-amber-700 flex items-center gap-1.5">
          <Timer size={11} className="flex-shrink-0" />
          Espera <span className="font-bold mx-0.5">{duration} {unitLabel}</span> antes de continuar
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
}
