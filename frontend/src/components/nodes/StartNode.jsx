import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PlayCircle } from 'lucide-react';
import VarChips from './VarChips';

export default function StartNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  function insertVar(v) {
    updateNodeData(id, { message: (data.message || '') + v });
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[240px] transition-shadow ${selected ? 'border-green-500 shadow-md shadow-green-100' : 'border-green-300'}`}>
      <div className="flex items-center gap-2 bg-green-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <PlayCircle size={13} />
        INICIO
      </div>
      <div className="p-3">
        <label className="text-xs font-medium text-gray-500 block mb-1">Mensaje de bienvenida</label>
        <textarea
          className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
          rows={3}
          value={data.message || ''}
          onChange={e => updateNodeData(id, { message: e.target.value })}
          placeholder="¡Hola! Bienvenido a nuestra empresa..."
        />
        <VarChips onInsert={insertVar} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
