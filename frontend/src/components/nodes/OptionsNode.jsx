import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import VarChips from './VarChips';

export default function OptionsNode({ id, data, selected }) {
  const { updateNodeData } = useReactFlow();
  const options = data.options || [];

  function updateOption(optId, label) {
    updateNodeData(id, {
      options: options.map(o => o.id === optId ? { ...o, label } : o),
    });
  }

  function addOption() {
    if (options.length >= 10) return;
    updateNodeData(id, {
      options: [...options, { id: uuidv4(), label: `Opción ${options.length + 1}` }],
    });
  }

  function removeOption(optId) {
    if (options.length <= 1) return;
    updateNodeData(id, {
      options: options.filter(o => o.id !== optId),
    });
  }

  function insertVar(v) {
    updateNodeData(id, { message: (data.message || '') + v });
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 min-w-[260px] transition-shadow ${selected ? 'border-amber-500 shadow-md shadow-amber-100' : 'border-amber-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />

      <div className="flex items-center gap-2 bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-t-[10px]">
        <ListChecks size={13} />
        OPCIONES ({options.length <= 3 ? 'botones' : 'lista'})
      </div>

      <div className="p-3 space-y-2">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Pregunta / texto del menú</label>
          <textarea
            className="nodrag w-full text-sm border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            rows={2}
            value={data.message || ''}
            onChange={e => updateNodeData(id, { message: e.target.value })}
            placeholder="¿En qué te podemos ayudar?"
          />
          <VarChips onInsert={insertVar} color="amber" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-gray-500">Opciones ({options.length}/10)</label>
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="nodrag flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-medium"
              >
                <Plus size={11} /> Agregar
              </button>
            )}
          </div>

          <div className="space-y-1.5 relative">
            {options.map((opt, i) => (
              <div key={opt.id} className="flex items-center gap-2 relative">
                <span className="text-xs text-gray-400 w-4 text-center flex-shrink-0">{i + 1}</span>
                <input
                  type="text"
                  className="nodrag flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent min-w-0"
                  value={opt.label}
                  onChange={e => updateOption(opt.id, e.target.value)}
                  placeholder={`Opción ${i + 1}`}
                />
                <button
                  onClick={() => removeOption(opt.id)}
                  disabled={options.length <= 1}
                  className="nodrag p-1 text-gray-300 hover:text-red-400 disabled:opacity-0 flex-shrink-0"
                >
                  <Trash2 size={12} />
                </button>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={opt.id}
                  style={{ top: `${(i + 0.5) * (100 / options.length)}%` }}
                  className="!bg-amber-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 px-3 pb-2 text-right">
        Conecta cada opción → al siguiente nodo
      </p>
    </div>
  );
}
