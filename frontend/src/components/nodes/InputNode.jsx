import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Keyboard } from 'lucide-react';
import VarChips from './VarChips';

export default function InputNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();

  function insertVar(v) {
    updateNodeData(id, { question: (data.question || '') + v });
  }

  const varName = data.variable_name || 'respuesta';

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[270px] transition-shadow ${selected ? 'border-teal-500 shadow-md shadow-teal-100' : 'border-teal-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-teal-400" />

      <div className="flex items-center gap-2 bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <Keyboard size={13} />
        CAPTURAR RESPUESTA
      </div>

      <div className="p-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Pregunta al usuario</label>
          <textarea
            className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            rows={2}
            value={data.question || ''}
            onChange={e => updateNodeData(id, { question: e.target.value })}
            placeholder="¿Cuál es tu nombre completo?"
          />
          <VarChips onInsert={insertVar} color="teal" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Guardar respuesta en variable
          </label>
          <div className="flex items-center">
            <span className="text-xs text-teal-600 font-mono bg-teal-50 px-2 py-1.5 rounded-l border border-r-0 border-teal-200">{'{{'}</span>
            <input
              type="text"
              className="nodrag flex-1 text-sm border-y border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400 font-mono min-w-0"
              value={data.variable_name || ''}
              onChange={e => updateNodeData(id, {
                variable_name: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
              })}
              placeholder="nombre_cliente"
            />
            <span className="text-xs text-teal-600 font-mono bg-teal-50 px-2 py-1.5 rounded-r border border-l-0 border-teal-200">{'}}'}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Usa{' '}
            <span className="font-mono text-teal-600 bg-teal-50 px-1 rounded">{`{{${varName}}}`}</span>
            {' '}en los nodos siguientes para mostrar la respuesta
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-teal-500" />
    </div>
  );
}
