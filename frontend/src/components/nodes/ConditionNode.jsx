import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitFork } from 'lucide-react';

const OPERATORS = [
  { value: 'equals',       label: 'es igual a'    },
  { value: 'not_equals',   label: 'no es igual a' },
  { value: 'contains',     label: 'contiene'       },
  { value: 'starts_with',  label: 'empieza con'   },
  { value: 'is_empty',     label: 'está vacío'     },
  { value: 'not_empty',    label: 'no está vacío'  },
  { value: 'greater_than', label: 'es mayor que'   },
  { value: 'less_than',    label: 'es menor que'   },
];

export default function ConditionNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const needsValue = !['is_empty', 'not_empty'].includes(data.operator || 'equals');

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[270px] transition-shadow ${
      selected ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-indigo-300'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400" />

      {/* Header */}
      <div className="flex items-center gap-2 bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <GitFork size={13} />
        CONDICIÓN SI / SINO
      </div>

      <div className="p-3 space-y-2.5">
        {/* Variable */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Variable a evaluar</label>
          <input
            type="text"
            className="nodrag w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent font-mono"
            value={data.variable || ''}
            onChange={e => updateNodeData(id, { variable: e.target.value.replace(/\s/g, '') })}
            placeholder="ej: respuesta, opcion, nombre"
          />
          <p className="text-[10px] text-gray-400 mt-0.5">Nombre de variable capturada por un nodo anterior</p>
        </div>

        {/* Operador */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Condición</label>
          <select
            className="nodrag w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            value={data.operator || 'equals'}
            onChange={e => updateNodeData(id, { operator: e.target.value })}
          >
            {OPERATORS.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>

        {/* Valor de comparación */}
        {needsValue && (
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Valor</label>
            <input
              type="text"
              className="nodrag w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              value={data.value || ''}
              onChange={e => updateNodeData(id, { value: e.target.value })}
              placeholder="Valor a comparar..."
            />
          </div>
        )}

        {/* Vista previa de la condición */}
        {data.variable && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-2 text-[11px] text-indigo-700 font-mono">
            Si <span className="font-bold">{`{{${data.variable}}}`}</span>{' '}
            {OPERATORS.find(o => o.value === (data.operator || 'equals'))?.label}
            {needsValue && data.value && <span className="font-bold"> "{data.value}"</span>}
          </div>
        )}

        {/* Salidas */}
        <div className="relative pt-3 pb-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Sí (verdadero)
            </span>
            <span className="flex items-center gap-1 text-red-500">
              No (falso)
              <span className="w-2 h-2 rounded-full bg-red-400" />
            </span>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1">
            Conecta cada salida al siguiente nodo
          </p>
        </div>
      </div>

      {/* Handle Sí (izquierda-abajo) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="!bg-emerald-500 !w-3 !h-3"
      />
      {/* Handle No (derecha-abajo) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="!bg-red-500 !w-3 !h-3"
      />
    </div>
  );
}
