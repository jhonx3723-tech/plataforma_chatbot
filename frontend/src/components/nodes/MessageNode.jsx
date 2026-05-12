import { Handle, Position, useReactFlow } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import VarChips from './VarChips';

export default function MessageNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  function insertVar(v) {
    updateNodeData(id, { message: (data.message || '') + v });
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[240px] transition-shadow ${selected ? 'border-blue-500 shadow-md shadow-blue-100' : 'border-blue-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />

      <div className="flex items-center gap-2 bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <MessageSquare size={13} />
        MENSAJE
      </div>

      <div className="p-3">
        <label className="text-xs font-medium text-gray-500 block mb-1">Texto a enviar</label>
        <textarea
          className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          rows={3}
          value={data.message || ''}
          onChange={e => updateNodeData(id, { message: e.target.value })}
          placeholder="Escribe el mensaje que recibirá el usuario..."
        />
        <VarChips onInsert={insertVar} />
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}
