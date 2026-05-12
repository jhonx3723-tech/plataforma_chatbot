import { Handle, Position, useReactFlow } from '@xyflow/react';
import { CircleOff } from 'lucide-react';

export default function EndNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[240px] transition-shadow ${selected ? 'border-red-500 shadow-md shadow-red-100' : 'border-red-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-red-400" />

      <div className="flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <CircleOff size={13} />
        FIN DE CONVERSACIÓN
      </div>

      <div className="p-3">
        <label className="text-xs font-medium text-gray-500 block mb-1">Mensaje de despedida</label>
        <textarea
          className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
          rows={3}
          value={data.message || ''}
          onChange={e => updateNodeData(id, { message: e.target.value })}
          placeholder="¡Gracias por contactarnos! Hasta pronto."
        />
        <p className="text-xs text-red-400 mt-2">La sesión del usuario se cierra aquí.</p>
      </div>
    </div>
  );
}
