import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, ArrowLeft, Plus, MessageSquare, ListChecks, PhoneForwarded, CircleOff, PlayCircle, Keyboard, GitFork, Timer } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { flowsAPI } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import StartNode from '../components/nodes/StartNode';
import MessageNode from '../components/nodes/MessageNode';
import OptionsNode from '../components/nodes/OptionsNode';
import TransferNode from '../components/nodes/TransferNode';
import EndNode from '../components/nodes/EndNode';
import InputNode from '../components/nodes/InputNode';
import ConditionNode from '../components/nodes/ConditionNode';
import DelayNode from '../components/nodes/DelayNode';

const nodeTypes = {
  start:     StartNode,
  message:   MessageNode,
  options:   OptionsNode,
  input:     InputNode,
  condition: ConditionNode,
  delay:     DelayNode,
  transfer:  TransferNode,
  end:       EndNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#0ea5e9', strokeWidth: 2 },
};

const NODE_TEMPLATES = [
  {
    type: 'message',
    icon: MessageSquare,
    label: 'Mensaje',
    color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',
    defaultData: { label: 'Mensaje', message: 'Escribe tu mensaje aquí...' },
  },
  {
    type: 'options',
    icon: ListChecks,
    label: 'Opciones',
    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100',
    defaultData: {
      label: 'Menú',
      message: '¿En qué te podemos ayudar?',
      options: [
        { id: uuidv4(), label: 'Opción 1' },
        { id: uuidv4(), label: 'Opción 2' },
      ],
    },
  },
  {
    type: 'input',
    icon: Keyboard,
    label: 'Capturar',
    color: 'text-teal-600 bg-teal-50 hover:bg-teal-100',
    defaultData: { label: 'Capturar respuesta', question: '¿Cuál es tu respuesta?', variable_name: 'respuesta' },
  },
  {
    type: 'delay',
    icon: Timer,
    label: 'Espera',
    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100',
    defaultData: { label: 'Espera', duration: 5, unit: 'minutes', message: '' },
  },
  {
    type: 'condition',
    icon: GitFork,
    label: 'Condición',
    color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100',
    defaultData: { label: 'Condición', variable: '', operator: 'equals', value: '' },
  },
  {
    type: 'transfer',
    icon: PhoneForwarded,
    label: 'Transferir',
    color: 'text-purple-600 bg-purple-50 hover:bg-purple-100',
    defaultData: { label: 'Transferir', message: 'Te conectamos con un asesor, por favor espera.' },
  },
  {
    type: 'end',
    icon: CircleOff,
    label: 'Fin',
    color: 'text-red-500 bg-red-50 hover:bg-red-100',
    defaultData: { label: 'Fin', message: '¡Gracias por contactarnos! Hasta pronto.' },
  },
];

export default function FlowEditor() {
  const toast = useToast();
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    flowsAPI.get(flowId).then(f => {
      setFlow(f);
      if (f.nodes.length === 0) {
        // Flujo nuevo: agrega nodo de inicio automáticamente
        setNodes([{
          id: 'start-1',
          type: 'start',
          position: { x: 300, y: 60 },
          data: { label: 'Inicio', message: '¡Hola! Bienvenido a nuestra empresa. ¿En qué podemos ayudarte?' },
        }]);
      } else {
        setNodes(f.nodes);
      }
      setEdges(f.edges || []);
    });
  }, [flowId]);

  const onConnect = useCallback(
    params => setEdges(eds => addEdge({ ...params, ...defaultEdgeOptions }, eds)),
    []
  );

  function addNode(template) {
    const id = uuidv4();
    const newNode = {
      id,
      type: template.type,
      position: {
        x: 100 + Math.random() * 250,
        y: 100 + Math.random() * 300,
      },
      data: {
        ...JSON.parse(JSON.stringify(template.defaultData)),
        // Nuevas opciones necesitan IDs únicos
        ...(template.type === 'options' ? {
          options: [
            { id: uuidv4(), label: 'Opción 1' },
            { id: uuidv4(), label: 'Opción 2' },
          ],
        } : {}),
      },
    };
    setNodes(nds => [...nds, newNode]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await flowsAPI.update(flowId, { nodes, edges });
      setSaved(true);
      toast.success('Flujo guardado correctamente');
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!flow) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400 text-sm">
        Cargando flujo...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Barra superior */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/companies')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{flow.name}</h1>
          <p className="text-xs text-gray-400">Editor de flujo · {nodes.length} nodos · {edges.length} conexiones</p>
        </div>

        {/* Paleta de nodos */}
        <div className="flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
          <span className="text-xs text-gray-400 font-medium">Agregar:</span>
          {NODE_TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => addNode(t)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${t.color}`}
                title={`Agregar nodo: ${t.label}`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50'
          }`}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
        </button>
      </header>

      {/* Canvas de React Flow */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Delete"
        >
          <Background color="#e5e7eb" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={n => {
              const colors = { start: '#22c55e', message: '#3b82f6', options: '#f59e0b', input: '#14b8a6', delay: '#f59e0b', condition: '#6366f1', transfer: '#a855f7', end: '#ef4444' };
              return colors[n.type] || '#94a3b8';
            }}
            maskColor="rgba(255,255,255,0.8)"
          />

          {nodes.length === 0 && (
            <Panel position="top-center">
              <div className="mt-20 bg-white rounded-2xl border border-gray-200 shadow p-6 text-center max-w-sm">
                <PlayCircle size={36} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium text-sm">Flujo vacío</p>
                <p className="text-gray-400 text-xs mt-1">
                  Usa los botones de arriba para agregar nodos.<br/>
                  Conecta los nodos arrastrando desde los puntos.
                </p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Leyenda */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-2 flex items-center gap-5 text-xs text-gray-400">
        <span className="font-medium text-gray-600">Leyenda:</span>
        {[
          { color: 'bg-green-400',  label: 'Inicio' },
          { color: 'bg-blue-400',   label: 'Mensaje' },
          { color: 'bg-amber-400',  label: 'Opciones' },
          { color: 'bg-teal-400',   label: 'Capturar' },
          { color: 'bg-amber-400',  label: 'Espera' },
          { color: 'bg-indigo-400', label: 'Condición' },
          { color: 'bg-purple-400', label: 'Transferir' },
          { color: 'bg-red-400',    label: 'Fin' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
        <span className="ml-auto">Supr = eliminar seleccionado · Rueda = zoom</span>
      </footer>
    </div>
  );
}
