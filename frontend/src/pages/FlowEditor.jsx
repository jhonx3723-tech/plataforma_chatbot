import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save, ArrowLeft, Plus, MessageSquare, ListChecks, PhoneForwarded,
  CircleOff, PlayCircle, Keyboard, GitFork, Timer, FlaskConical,
  RotateCcw, Send, X, Bot, User, Zap,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { flowsAPI } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import StartNode     from '../components/nodes/StartNode';
import MessageNode   from '../components/nodes/MessageNode';
import OptionsNode   from '../components/nodes/OptionsNode';
import TransferNode  from '../components/nodes/TransferNode';
import EndNode       from '../components/nodes/EndNode';
import InputNode     from '../components/nodes/InputNode';
import ConditionNode from '../components/nodes/ConditionNode';
import DelayNode     from '../components/nodes/DelayNode';

const nodeTypes = {
  start: StartNode, message: MessageNode, options: OptionsNode,
  input: InputNode, condition: ConditionNode, delay: DelayNode,
  transfer: TransferNode, end: EndNode,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#0ea5e9', strokeWidth: 2 },
};

const NODE_TEMPLATES = [
  { type: 'message',   icon: MessageSquare,  label: 'Mensaje',   color: 'text-blue-600 bg-blue-50 hover:bg-blue-100',     defaultData: { label: 'Mensaje', message: 'Escribe tu mensaje aquí...' } },
  { type: 'options',   icon: ListChecks,     label: 'Opciones',  color: 'text-amber-600 bg-amber-50 hover:bg-amber-100',   defaultData: { label: 'Menú', message: '¿En qué te podemos ayudar?', options: [{ id: uuidv4(), label: 'Opción 1' }, { id: uuidv4(), label: 'Opción 2' }] } },
  { type: 'input',     icon: Keyboard,       label: 'Capturar',  color: 'text-teal-600 bg-teal-50 hover:bg-teal-100',      defaultData: { label: 'Capturar respuesta', question: '¿Cuál es tu respuesta?', variable_name: 'respuesta' } },
  { type: 'delay',     icon: Timer,          label: 'Espera',    color: 'text-amber-600 bg-amber-50 hover:bg-amber-100',   defaultData: { label: 'Espera', duration: 5, unit: 'minutes', message: '' } },
  { type: 'condition', icon: GitFork,        label: 'Condición', color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100', defaultData: { label: 'Condición', variable: '', operator: 'equals', value: '' } },
  { type: 'transfer',  icon: PhoneForwarded, label: 'Transferir',color: 'text-purple-600 bg-purple-50 hover:bg-purple-100', defaultData: { label: 'Transferir', message: 'Te conectamos con un asesor, por favor espera.' } },
  { type: 'end',       icon: CircleOff,      label: 'Fin',       color: 'text-red-500 bg-red-50 hover:bg-red-100',         defaultData: { label: 'Fin', message: '¡Gracias por contactarnos! Hasta pronto.' } },
];

// ── SimulatorPanel ─────────────────────────────────────────────────────────────
function SimulatorPanel({ flowId, onClose }) {
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState('');
  const [state,         setState]         = useState({ currentNodeId: null, variables: {} });
  const [running,       setRunning]       = useState(false);
  const [status,        setStatus]        = useState('idle'); // idle | active | waiting_input | transfer | end
  const [started,       setStarted]       = useState(false);
  const [activeOptions, setActiveOptions] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function callSimulate(message, currentState) {
    setRunning(true);
    try {
      const token = localStorage.getItem('token');
      const resp  = await fetch(`/api/flows/${flowId}/simulate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ message, state: currentState }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      const newMsgs = (data.messages || []).map((m, i) => ({ ...m, id: Date.now() + i }));
      setMessages(prev => [...prev, ...newMsgs]);
      setState({ currentNodeId: data.currentNodeId, variables: data.variables || {} });
      setStatus(data.status || 'active');

      // Extraer opciones del último mensaje bot con options
      const lastWithOpts = [...newMsgs].reverse().find(m => m.options?.length);
      setActiveOptions(lastWithOpts?.options || []);

      return data.status;
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), type: 'error', text: '⚠ Error: ' + err.message }]);
      return 'error';
    } finally {
      setRunning(false);
    }
  }

  async function handleStart() {
    setMessages([{ id: 0, type: 'system', text: '▶ Simulación iniciada' }]);
    setState({ currentNodeId: null, variables: {} });
    setStarted(true);
    setActiveOptions([]);
    await callSimulate('', { currentNodeId: null, variables: {} });
  }

  async function handleSend(e) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || running || status === 'end' || status === 'transfer') return;
    setInput('');
    setActiveOptions([]);
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: msg }]);
    await callSimulate(msg, state);
  }

  async function handleOption(opt) {
    setActiveOptions([]);
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: opt.label }]);
    await callSimulate(opt.id, state);
  }

  function handleReset() {
    setMessages([]);
    setState({ currentNodeId: null, variables: {} });
    setStatus('idle');
    setStarted(false);
    setActiveOptions([]);
    setInput('');
  }

  const STATUS_BADGE = {
    idle:          null,
    active:        null,
    waiting_input: <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">Esperando respuesta</span>,
    transfer:      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-semibold">🔁 Transferido a agente</span>,
    end:           <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">🏁 Flujo terminado</span>,
  };

  const vars = Object.entries(state.variables || {});

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="text-indigo-500" />
          <span className="font-semibold text-slate-700 text-sm">Simulador de Bot</span>
        </div>
        <div className="flex items-center gap-1">
          {started && (
            <button onClick={handleReset} title="Reiniciar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <RotateCcw size={14} />
            </button>
          )}
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Variables */}
      {vars.length > 0 && (
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">Variables capturadas</p>
          <div className="flex flex-wrap gap-1">
            {vars.map(([k, v]) => (
              <span key={k} className="text-[10px] bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                {k}: <strong>{String(v)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!started ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center">
              <Bot size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Prueba tu bot</p>
              <p className="text-xs text-slate-400 mt-1">Simula una conversación real sin enviar mensajes de WhatsApp</p>
            </div>
            <button onClick={handleStart}
              className="flex items-center gap-2 bg-indigo-500 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-600 transition-colors shadow-sm">
              <PlayCircle size={15} /> Iniciar simulación
            </button>
          </div>
        ) : (
          <>
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {(m.type === 'bot') && (
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-indigo-500" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  m.type === 'user'     ? 'bg-indigo-500 text-white rounded-tr-sm' :
                  m.type === 'bot'      ? 'bg-slate-100 text-slate-700 rounded-tl-sm' :
                  m.type === 'system'   ? 'bg-amber-50 text-amber-700 border border-amber-200 italic' :
                  m.type === 'user_echo'? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  m.type === 'error'    ? 'bg-red-50 text-red-600 border border-red-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {m.text}
                </div>
                {(m.type === 'user') && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={12} className="text-slate-500" />
                  </div>
                )}
              </div>
            ))}

            {/* Opciones rápidas */}
            {activeOptions.length > 0 && status === 'waiting_input' && (
              <div className="flex flex-col gap-1.5 mt-2">
                {activeOptions.map(opt => (
                  <button key={opt.id} onClick={() => handleOption(opt)}
                    className="text-left text-xs px-3 py-2 rounded-xl border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors font-medium">
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {running && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Bot size={12} className="text-indigo-500" />
                </div>
                <div className="bg-slate-100 rounded-2xl px-3 py-2 flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Status badge */}
      {STATUS_BADGE[status] && (
        <div className="px-3 py-1.5 border-t border-slate-100 flex justify-center flex-shrink-0">
          {STATUS_BADGE[status]}
        </div>
      )}

      {/* Input */}
      {started && status !== 'end' && status !== 'transfer' && (
        <form onSubmit={handleSend} className="px-3 py-3 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={activeOptions.length > 0 ? 'O escribe una opción...' : 'Escribe un mensaje...'}
            disabled={running}
            className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 bg-white"
          />
          <button type="submit" disabled={running || !input.trim()}
            className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors">
            <Send size={13} />
          </button>
        </form>
      )}

      {started && (status === 'end' || status === 'transfer') && (
        <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
          <button onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl py-2 transition-colors">
            <RotateCcw size={12} /> Reiniciar simulación
          </button>
        </div>
      )}
    </div>
  );
}

// ── FlowEditor ─────────────────────────────────────────────────────────────────
export default function FlowEditor() {
  const toast = useToast();
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [flow,  setFlow]  = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [showSim,   setShowSim]   = useState(false);

  useEffect(() => {
    flowsAPI.get(flowId).then(f => {
      setFlow(f);
      if (f.nodes.length === 0) {
        setNodes([{
          id: 'start-1', type: 'start',
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
      id, type: template.type,
      position: { x: 100 + Math.random() * 250, y: 100 + Math.random() * 300 },
      data: {
        ...JSON.parse(JSON.stringify(template.defaultData)),
        ...(template.type === 'options' ? {
          options: [{ id: uuidv4(), label: 'Opción 1' }, { id: uuidv4(), label: 'Opción 2' }],
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
    } finally { setSaving(false); }
  }

  if (!flow) return (
    <div className="h-screen flex items-center justify-center text-gray-400 text-sm">
      Cargando flujo...
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Barra superior */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/companies')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{flow.name}</h1>
          <p className="text-xs text-gray-400">Editor de flujo · {nodes.length} nodos · {edges.length} conexiones</p>
        </div>

        {/* Paleta de nodos */}
        <div className="flex items-center gap-2 border-r border-gray-200 pr-4 mr-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Agregar:</span>
          {NODE_TEMPLATES.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.type} onClick={() => addNode(t)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${t.color}`}
                title={`Agregar nodo: ${t.label}`}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Simulador */}
        <button
          onClick={() => setShowSim(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
            showSim
              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
              : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
          }`}
        >
          <FlaskConical size={15} /> Simular
        </button>

        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm ${
            saved ? 'bg-green-500 text-white' : 'bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50'
          }`}
        >
          <Save size={15} />
          {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar'}
        </button>
      </header>

      {/* Canvas + Simulator */}
      <div className="flex-1 relative overflow-hidden">
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode="Delete"
        >
          <Background color="#e5e7eb" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={n => {
              const c = { start:'#22c55e',message:'#3b82f6',options:'#f59e0b',input:'#14b8a6',delay:'#f59e0b',condition:'#6366f1',transfer:'#a855f7',end:'#ef4444' };
              return c[n.type] || '#94a3b8';
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

        {showSim && <SimulatorPanel flowId={flowId} onClose={() => setShowSim(false)} />}
      </div>

      {/* Leyenda */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-200 px-5 py-2 flex items-center gap-5 text-xs text-gray-400">
        <span className="font-medium text-gray-600">Leyenda:</span>
        {[
          { color: 'bg-green-400',  label: 'Inicio'    },
          { color: 'bg-blue-400',   label: 'Mensaje'   },
          { color: 'bg-amber-400',  label: 'Opciones'  },
          { color: 'bg-teal-400',   label: 'Capturar'  },
          { color: 'bg-amber-400',  label: 'Espera'    },
          { color: 'bg-indigo-400', label: 'Condición' },
          { color: 'bg-purple-400', label: 'Transferir'},
          { color: 'bg-red-400',    label: 'Fin'       },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label}
          </span>
        ))}
        <span className="ml-auto">Supr = eliminar · Rueda = zoom</span>
      </footer>
    </div>
  );
}
