import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PhoneForwarded } from 'lucide-react';
import VarChips from './VarChips';

export default function TransferNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  function insertVar(v) {
    updateNodeData(id, { message: (data.message || '') + v });
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[240px] transition-shadow ${selected ? 'border-purple-500 shadow-md shadow-purple-100' : 'border-purple-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-400" />

      <div className="flex items-center gap-2 bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <PhoneForwarded size={13} />
        TRANSFERIR A ASESOR
      </div>

      <div className="p-3">
        <label className="text-xs font-medium text-gray-500 block mb-1">Mensaje antes de transferir</label>
        <textarea
          className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          rows={3}
          value={data.message || ''}
          onChange={e => updateNodeData(id, { message: e.target.value })}
          placeholder="Te estamos conectando con un asesor..."
        />
        <VarChips onInsert={insertVar} color="purple" />
        <p className="text-xs text-purple-400 mt-2">La conversación finaliza aquí en el bot.</p>
      </div>
    </div>
  );
}
