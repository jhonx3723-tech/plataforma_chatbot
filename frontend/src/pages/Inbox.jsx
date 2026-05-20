import { useState, useEffect, useRef, useCallback } from 'react';
import { conversationsAPI, templatesAPI, labelsAPI, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Send, Bot, UserCheck, X, RefreshCw, Search, MessageSquare,
  RotateCcw, UserPlus, StickyNote, ChevronDown, Check, Paperclip, Image, Tag, Filter,
  Bell, BellOff, Zap,
} from 'lucide-react';
import ContactPanel from '../components/inbox/ContactPanel';
import TemplatePopover from '../components/inbox/TemplatePopover';
import LabelSelector from '../components/inbox/LabelSelector';

const STATUS_LABELS = { bot: 'Bot', human: 'Agente', closed: 'Cerrado' };
const STATUS_COLORS = {
  bot:    'bg-brand-100 text-brand-700 border-brand-200',
  human:  'bg-amber-100 text-amber-700 border-amber-200',
  closed: 'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_DOT = {
  bot:    'bg-brand-500',
  human:  'bg-amber-500',
  closed: 'bg-slate-400',
};

const FILTER_TABS = [
  { key: 'all',    label: 'Todas'   },
  { key: 'mine',   label: 'Mis'     },
  { key: 'bot',    label: 'Bot'     },
  { key: 'human',  label: 'Agente'  },
  { key: 'closed', label: 'Cerradas'},
];

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function avatarInitials(name) {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 150].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = i === 0 ? 880 : 1100;
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.2);
      osc.start(ctx.currentTime + delay / 1000);
      osc.stop(ctx.currentTime + delay / 1000 + 0.2);
    });
  } catch {}
}

function useTabTitle(unread) {
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) Bandeja — BotBuilder` : 'Bandeja — BotBuilder';
    return () => { document.title = 'BotBuilder'; };
  }, [unread]);
}

// ── Quick replies: top N plantillas más usadas ────────────────────────────────
function trackTemplate(id) {
  try {
    const u = JSON.parse(localStorage.getItem('tplUsage') || '{}');
    u[id] = (u[id] || 0) + 1;
    localStorage.setItem('tplUsage', JSON.stringify(u));
  } catch {}
}

function topTemplates(templates, n = 5) {
  try {
    const u = JSON.parse(localStorage.getItem('tplUsage') || '{}');
    return [...templates].sort((a, b) => (u[b.id] || 0) - (u[a.id] || 0)).slice(0, n);
  } catch {
    return templates.slice(0, n);
  }
}

// ── Opciones de recordatorio ──────────────────────────────────────────────────
const REMINDER_OPTIONS = [
  { label: '30 minutos', minutes: 30 },
  { label: '1 hora',     minutes: 60 },
  { label: '2 horas',    minutes: 120 },
  { label: '4 horas',    minutes: 240 },
  { label: 'Mañana 9am', minutes: null, special: 'tomorrow9' },
];

function calcRemindAt(opt) {
  if (opt.special === 'tomorrow9') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  return new Date(Date.now() + opt.minutes * 60000).toISOString();
}

function reminderLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = d - now;
  if (diff <= 0) return 'Vencido';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(diff / 3600000);
  if (hrs < 24) return `${hrs}h`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

// ── Dropdown de asignación ─────────────────────────────────────────────────────
function AssignDropdown({ agents, assigned, currentUserId, onAssign, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">Asignar a</p>
      {agents.map(a => (
        <button
          key={a.id}
          onClick={() => onAssign(a.id === assigned ? null : a.id)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
            {avatarInitials(a.username)}
          </div>
          <span className="text-sm text-slate-700 flex-1 text-left truncate">
            {a.username}
            {a.id === currentUserId && <span className="text-slate-400 text-xs"> (yo)</span>}
          </span>
          {a.id === assigned && <Check size={13} className="text-brand-500 flex-shrink-0" />}
        </button>
      ))}
      {assigned && (
        <>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={() => onAssign(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 transition-colors text-red-400 text-sm"
          >
            <X size={13} /> Quitar asignación
          </button>
        </>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected]           = useState(null);
  const [messages, setMessages]           = useState([]);
  const [reply, setReply]                 = useState('');
  const [noteMode, setNoteMode]           = useState(false);
  const [sending, setSending]             = useState(false);
  const [loadingConv, setLoadingConv]     = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(false);
  const [filter, setFilter]               = useState('all');
  const [search, setSearch]               = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [templates, setTemplates]         = useState([]);
  const [labels, setLabels]               = useState([]);
  const [agents, setAgents]               = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateQuery, setTemplateQuery] = useState('');
  const [showAssign, setShowAssign]       = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching]         = useState(false);
  const [imagePreview, setImagePreview]   = useState(null); // { file, url }
  const [labelFilter, setLabelFilter]     = useState(null); // label id
  const [agentFilter, setAgentFilter]     = useState(null); // user id
  const [showLabelFilter, setShowLabelFilter] = useState(false);
  const [showAgentFilter, setShowAgentFilter] = useState(false);
  const [showReminder, setShowReminder]   = useState(false);
  const [reminderToasts, setReminderToasts] = useState([]); // { id, conv }


  const messagesEndRef    = useRef(null);
  const pollRef           = useRef(null);
  const selectedRef       = useRef(null);
  const replyInputRef     = useRef(null);
  const searchTimerRef    = useRef(null);
  const fileInputRef      = useRef(null);
  const labelFilterRef    = useRef(null);
  const agentFilterRef    = useRef(null);
  const reminderRef       = useRef(null);

  selectedRef.current = selected;

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);
  useTabTitle(totalUnread);

  const companyId = selected?.company_id || null;

  // Cargar labels y agentes al iniciar usando company_id del usuario (para filtros de la barra)
  useEffect(() => {
    const cid = user?.company_id;
    if (!cid) return;
    Promise.all([
      labelsAPI.getAll(cid),
      conversationsAPI.getAgents(cid),
    ]).then(([l, a]) => {
      setLabels(l);
      setAgents(a);
    }).catch(() => {});
  }, [user?.company_id]);

  // Cargar templates cuando cambia la empresa seleccionada; también carga labels/agents para super_admin
  useEffect(() => {
    if (!companyId) return;
    templatesAPI.getAll(companyId).then(t => setTemplates(t)).catch(() => {});
    // super_admin no tiene company_id propio — carga por conversación seleccionada
    if (!user?.company_id) {
      Promise.all([
        labelsAPI.getAll(companyId),
        conversationsAPI.getAgents(companyId),
      ]).then(([l, a]) => {
        setLabels(l);
        setAgents(a);
      }).catch(() => {});
    }
  }, [companyId, user?.company_id]);

  // Cerrar dropdowns de filtro y reminder al hacer click fuera
  useEffect(() => {
    function handler(e) {
      if (labelFilterRef.current && !labelFilterRef.current.contains(e.target)) setShowLabelFilter(false);
      if (agentFilterRef.current && !agentFilterRef.current.contains(e.target)) setShowAgentFilter(false);
      if (reminderRef.current && !reminderRef.current.contains(e.target)) setShowReminder(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Verificar recordatorios pendientes cada 60 segundos
  useEffect(() => {
    async function checkReminders() {
      try {
        const due = await conversationsAPI.getPendingReminders();
        if (!due.length) return;
        setReminderToasts(prev => {
          const existingIds = new Set(prev.map(t => t.conv.id));
          const newOnes = due.filter(c => !existingIds.has(c.id)).map(c => ({ id: Date.now() + c.id, conv: c }));
          return [...prev, ...newOnes];
        });
        // Limpiar recordatorios vencidos en el estado local
        for (const conv of due) {
          await conversationsAPI.clearReminder(conv.id);
          setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, reminder_at: null } : c));
          if (selectedRef.current?.id === conv.id) setSelected(p => ({ ...p, reminder_at: null }));
        }
        // Notificación del navegador
        due.forEach(c => showBrowserNotification(c.id, '⏰ Recordatorio', c.contact_name || c.user_phone));
      } catch {}
    }
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await conversationsAPI.getAll({ limit: 30, offset: 0 });
      const incoming = res.data ?? res;
      setHasMore(res.hasMore ?? false);
      setConversations(prev => {
        const prevUnread = prev.reduce((a, c) => a + (c.unread || 0), 0);
        const newUnread  = incoming.reduce((a, c) => a + (c.unread || 0), 0);
        if (newUnread > prevUnread) playNotificationSound();
        return incoming;
      });
    } catch { /* silent */ }
    finally { setLoadingConv(false); }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await conversationsAPI.getAll({ limit: 30, offset: conversations.length });
      const incoming = res.data ?? [];
      setHasMore(res.hasMore ?? false);
      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        return [...prev, ...incoming.filter(c => !existingIds.has(c.id))];
      });
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, conversations.length]);

  // Búsqueda server-side con debounce — busca en toda la BD, no solo en los 30 cargados
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (!search.trim()) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await conversationsAPI.getAll({ limit: 50, search: search.trim() });
        setSearchResults(res.data ?? res);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  const loadMessages = useCallback(async (id) => {
    try {
      const data = await conversationsAPI.get(id);
      setSelected(data);
      setMessages(data.messages || []);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  // Solicitar permiso de notificaciones al cargar el inbox
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // SSE — realtime
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    loadConversations();

    const es = new EventSource(`${API_BASE}/events?token=${token}`);

    es.addEventListener('ready', (e) => {
      const { realtime } = JSON.parse(e.data);
      setRealtimeStatus(realtime ? 'live' : 'polling');
      if (!realtime) pollRef.current = setInterval(loadConversations, 4000);
    });

    es.addEventListener('conversation', (e) => {
      const { eventType, new: conv, old: oldConv } = JSON.parse(e.data);
      setConversations(prev => {
        if (eventType === 'INSERT') { playNotificationSound(); return [{ ...conv, unread: 0 }, ...prev]; }
        if (eventType === 'UPDATE') return prev.map(c => c.id === conv.id ? { ...c, ...conv } : c);
        if (eventType === 'DELETE') return prev.filter(c => c.id !== oldConv.id);
        return prev;
      });
    });

    es.addEventListener('message', (e) => {
      const { new: msg } = JSON.parse(e.data);
      if (!msg) return;
      if (selectedRef.current?.id === msg.conversation_id) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
      if (msg.direction === 'inbound') {
        playNotificationSound();
        if (selectedRef.current?.id !== msg.conversation_id) {
          setConversations(prev => prev.map(c =>
            c.id === msg.conversation_id
              ? { ...c, last_message: msg.content, last_message_at: msg.created_at, unread: (c.unread || 0) + 1 }
              : c
          ));
          showBrowserNotification(msg.conversation_id, 'Nuevo mensaje de cliente', msg.content);
        }
      }
    });

    es.onerror = () => {
      setRealtimeStatus('polling');
      es.close();
      if (!pollRef.current) pollRef.current = setInterval(loadConversations, 4000);
    };

    return () => { es.close(); clearInterval(pollRef.current); };
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function selectConversation(conv) {
    setLoadingMsgs(true);
    setMessages([]);
    setReply('');
    setNoteMode(false);
    setShowTemplates(false);
    setShowAssign(false);
    await loadMessages(conv.id);
  }

  function handleReplyChange(e) {
    const val = e.target.value;
    setReply(val);
    if (!noteMode && val.startsWith('/')) {
      setTemplateQuery(val.slice(1));
      setShowTemplates(true);
    } else {
      setShowTemplates(false);
      setTemplateQuery('');
    }
  }

  function handleTemplateSelect(content) {
    setReply(content);
    setShowTemplates(false);
    setTemplateQuery('');
    replyInputRef.current?.focus();
  }

  // ── Notificaciones del navegador ────────────────────────────────────────────
  function showBrowserNotification(convId, title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body: body?.slice(0, 100) || 'Nuevo mensaje',
      icon: '/favicon.ico',
      tag: `conv-${convId}`,
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 6000);
  }

  // ── Imagen adjunta ──────────────────────────────────────────────────────────
  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview({ file, url: URL.createObjectURL(file) });
    e.target.value = '';
  }

  function cancelImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
  }

  async function handleSendImage() {
    if (!imagePreview || !selected) return;
    setSending(true);
    try {
      const msg = await conversationsAPI.sendImage(selected.id, imagePreview.file);
      setMessages(prev => [...prev, msg]);
      setSelected(prev => ({ ...prev, status: 'human' }));
      setConversations(prev => prev.map(c =>
        c.id === selected.id ? { ...c, status: 'human', last_message: '[Imagen]', last_message_at: msg.created_at } : c
      ));
      cancelImage();
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      let msg;
      if (noteMode) {
        msg = await conversationsAPI.addNote(selected.id, reply.trim());
      } else {
        msg = await conversationsAPI.reply(selected.id, reply.trim());
        setSelected(prev => ({ ...prev, status: 'human' }));
      }
      setReply('');
      setShowTemplates(false);
      setMessages(prev => [...prev, msg]);
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function handleStatus(status) {
    if (!selected) return;
    try {
      const updated = await conversationsAPI.setStatus(selected.id, status);
      setSelected(prev => ({ ...prev, status: updated.status }));
      setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, status: updated.status } : c));
    } catch { /* silent */ }
  }

  async function handleRestartBot() {
    if (!selected) return;
    try {
      const updated = await conversationsAPI.restartBot(selected.id);
      setSelected(prev => ({ ...prev, status: 'bot' }));
      setConversations(prev => prev.map(c => c.id === updated.id ? { ...c, status: 'bot' } : c));
    } catch { /* silent */ }
  }

  async function handleAssign(userId) {
    if (!selected) return;
    setShowAssign(false);
    try {
      const updated = await conversationsAPI.assign(selected.id, userId);
      const agentName = userId ? (agents.find(a => a.id === userId)?.username || null) : null;
      setSelected(prev => ({ ...prev, assigned_to: userId, assigned_agent_name: agentName }));
      setConversations(prev => prev.map(c =>
        c.id === selected.id ? { ...c, assigned_to: userId, assigned_agent_name: agentName } : c
      ));
    } catch { /* silent */ }
  }

  async function handleSetReminder(opt) {
    if (!selected) return;
    setShowReminder(false);
    const remind_at = calcRemindAt(opt);
    try {
      await conversationsAPI.setReminder(selected.id, { remind_at });
      setSelected(prev => ({ ...prev, reminder_at: remind_at }));
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, reminder_at: remind_at } : c));
    } catch {}
  }

  async function handleClearReminder() {
    if (!selected) return;
    setShowReminder(false);
    try {
      await conversationsAPI.clearReminder(selected.id);
      setSelected(prev => ({ ...prev, reminder_at: null }));
      setConversations(prev => prev.map(c => c.id === selected.id ? { ...c, reminder_at: null } : c));
    } catch {}
  }

  function handleLabelsChange(newLabelIds, newLabelsArray) {
    setSelected(prev => ({ ...prev, label_ids: newLabelIds }));
    setConversations(prev => prev.map(c => c.id === selected?.id ? { ...c, label_ids: newLabelIds } : c));
    if (newLabelsArray) setLabels(newLabelsArray);
  }

  // Cuando hay búsqueda activa con resultados del servidor, usarlos como base;
  // mientras la búsqueda está pendiente (timer aún corriendo), usar lista local como fallback.
  const baseList = (search.trim() && searchResults !== null) ? searchResults : conversations;
  const filteredConvs = baseList.filter(c => {
    if (filter === 'mine')   return c.assigned_to === user?.id;
    if (filter !== 'all')    return c.status === filter;
    return true;
  }).filter(c => {
    if (!search.trim() || searchResults !== null) return true;
    // fallback local mientras el servidor responde
    return c.user_phone.includes(search) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.last_message || '').toLowerCase().includes(search.toLowerCase());
  }).filter(c => {
    if (labelFilter && !(c.label_ids || []).includes(labelFilter)) return false;
    if (agentFilter && c.assigned_to !== agentFilter) return false;
    return true;
  });

  const inputPlaceholder = noteMode
    ? 'Escribe una nota interna (solo visible para el equipo)...'
    : 'Escribe un mensaje o / para plantillas...';

  return (
    <div className="flex h-full bg-slate-50">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">

        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900">Conversaciones</h1>
              {totalUnread > 0 && (
                <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span title={realtimeStatus === 'live' ? 'Tiempo real activo' : realtimeStatus === 'polling' ? 'Modo polling' : 'Conectando...'}>
                <span className={`w-2 h-2 rounded-full inline-block ${
                  realtimeStatus === 'live'    ? 'bg-emerald-500 animate-pulse' :
                  realtimeStatus === 'polling' ? 'bg-amber-400' : 'bg-slate-300 animate-pulse'
                }`} />
              </span>
              <button onClick={loadConversations} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="relative">
            {searching ? (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
            ) : (
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o mensaje..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent placeholder:text-slate-400"
            />
          </div>
          {search.trim() && searchResults !== null && (
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              {searchResults.length === 0
                ? 'Sin resultados en toda la base de datos'
                : `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''} encontrado${searchResults.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Filter tabs */}
        <div className="px-3 py-2 border-b border-slate-100 flex gap-1 flex-wrap">
          {FILTER_TABS.map(tab => {
            const count = tab.key === 'all'  ? conversations.length
                        : tab.key === 'mine' ? conversations.filter(c => c.assigned_to === user?.id).length
                        : conversations.filter(c => c.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors ${
                  filter === tab.key ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {count > 0 && <span className={`ml-1 ${filter === tab.key ? 'opacity-80' : 'opacity-50'}`}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Filtros avanzados: etiqueta y agente */}
        {(labels.length > 0 || agents.length > 0) && (
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5">
            <Filter size={11} className="text-slate-400 flex-shrink-0" />

            {/* Label filter */}
            {labels.length > 0 && (
              <div className="relative flex-1" ref={labelFilterRef}>
                <button
                  onClick={() => { setShowLabelFilter(v => !v); setShowAgentFilter(false); }}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors truncate ${
                    labelFilter
                      ? 'bg-brand-50 border-brand-200 text-brand-600 font-semibold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Tag size={10} className="flex-shrink-0" />
                  <span className="truncate">
                    {labelFilter ? (labels.find(l => l.id === labelFilter)?.name || 'Etiqueta') : 'Etiqueta'}
                  </span>
                  <ChevronDown size={10} className="ml-auto flex-shrink-0" />
                </button>
                {showLabelFilter && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                    {labels.map(l => (
                      <button
                        key={l.id}
                        onClick={() => { setLabelFilter(labelFilter === l.id ? null : l.id); setShowLabelFilter(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-xs text-slate-700 flex-1 text-left truncate">{l.name}</span>
                        {labelFilter === l.id && <Check size={11} className="text-brand-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Agent filter */}
            {agents.length > 0 && (
              <div className="relative flex-1" ref={agentFilterRef}>
                <button
                  onClick={() => { setShowAgentFilter(v => !v); setShowLabelFilter(false); }}
                  className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors truncate ${
                    agentFilter
                      ? 'bg-violet-50 border-violet-200 text-violet-600 font-semibold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck size={10} className="flex-shrink-0" />
                  <span className="truncate">
                    {agentFilter ? (agents.find(a => a.id === agentFilter)?.username || 'Agente') : 'Agente'}
                  </span>
                  <ChevronDown size={10} className="ml-auto flex-shrink-0" />
                </button>
                {showAgentFilter && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
                    {agents.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setAgentFilter(agentFilter === a.id ? null : a.id); setShowAgentFilter(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                          {avatarInitials(a.username)}
                        </div>
                        <span className="text-xs text-slate-700 flex-1 text-left truncate">{a.username}</span>
                        {agentFilter === a.id && <Check size={11} className="text-violet-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Clear filters */}
            {(labelFilter || agentFilter) && (
              <button
                onClick={() => { setLabelFilter(null); setAgentFilter(null); }}
                title="Limpiar filtros"
                className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 flex flex-col">
          {loadingConv ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="h-2 bg-slate-50 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare size={28} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-medium">{search ? 'Sin resultados' : 'Sin conversaciones'}</p>
              {search && <button onClick={() => setSearch('')} className="text-xs text-brand-500 mt-1 hover:underline">Limpiar búsqueda</button>}
            </div>
          ) : (
            <>
              {filteredConvs.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                    selected?.id === conv.id ? 'bg-brand-50 border-r-2 border-brand-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      conv.status === 'bot' ? 'bg-brand-500' : conv.status === 'human' ? 'bg-amber-500' : 'bg-slate-400'
                    }`}>
                      {conv.user_phone.slice(-2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-sm font-semibold truncate ${selected?.id === conv.id ? 'text-brand-700' : 'text-slate-900'}`}>
                          {conv.contact_name || conv.user_phone}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.reminder_at && new Date(conv.reminder_at) > new Date() && (
                            <span title={`Recordatorio en ${reminderLabel(conv.reminder_at)}`} className="text-amber-400">
                              <Bell size={10} />
                            </span>
                          )}
                          {conv.unread > 0 && (
                            <span className="w-4 h-4 bg-brand-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                              {conv.unread > 9 ? '9+' : conv.unread}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{formatTime(conv.last_message_at)}</span>
                        </div>
                      </div>

                      {conv.contact_name && (
                        <p className="text-[10px] text-slate-400 truncate">{conv.user_phone}</p>
                      )}

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border flex-shrink-0 ${STATUS_COLORS[conv.status]}`}>
                          <span className={`w-1 h-1 rounded-full ${STATUS_DOT[conv.status]}`} />
                          {STATUS_LABELS[conv.status]}
                        </span>
                        <p className="text-xs text-slate-400 truncate flex-1">{conv.last_message}</p>
                      </div>

                      {conv.assigned_agent_name && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-3.5 h-3.5 rounded-full bg-violet-100 text-violet-600 text-[8px] font-bold flex items-center justify-center">
                            {avatarInitials(conv.assigned_agent_name)}
                          </div>
                          <span className="text-[10px] text-violet-500 truncate">{conv.assigned_agent_name}</span>
                        </div>
                      )}

                      {conv.label_ids?.length > 0 && labels.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {conv.label_ids.slice(0, 3).map(lid => {
                            const lbl = labels.find(l => l.id === lid);
                            if (!lbl) return null;
                            return (
                              <span key={lid} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ backgroundColor: lbl.color + '22', color: lbl.color }}>
                                {lbl.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {!search.trim() && hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-3 text-xs text-brand-500 hover:bg-brand-50 transition-colors font-semibold flex items-center justify-center gap-2 flex-shrink-0"
                >
                  {loadingMore ? (
                    <><span className="w-3 h-3 border-2 border-brand-300 border-t-brand-500 rounded-full animate-spin" /> Cargando...</>
                  ) : 'Cargar más conversaciones'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Panel de chat ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200">
                <MessageSquare size={32} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Selecciona una conversación</p>
              <p className="text-xs text-slate-400 mt-1">Los mensajes aparecerán aquí</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                {/* Info izquierda */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 ${
                    selected.status === 'bot' ? 'bg-brand-500' : selected.status === 'human' ? 'bg-amber-500' : 'bg-slate-400'
                  }`}>
                    {selected.user_phone.slice(-2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">{selected.contact_name || selected.user_phone}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {selected.contact_name && <span className="text-xs text-slate-400">{selected.user_phone}</span>}
                      {user?.role === 'super_admin' && <span className="text-xs text-slate-400">{selected.company_name}</span>}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[selected.status]}`}>
                        <span className={`w-1 h-1 rounded-full ${STATUS_DOT[selected.status]}`} />
                        {STATUS_LABELS[selected.status]}
                      </span>
                      {/* Agente asignado badge */}
                      {selected.assigned_agent_name && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                          <div className="w-2.5 h-2.5 rounded-full bg-violet-200 text-[7px] font-bold flex items-center justify-center">
                            {avatarInitials(selected.assigned_agent_name)}
                          </div>
                          {selected.assigned_agent_name}
                        </span>
                      )}
                    </div>
                    {/* Labels */}
                    <div className="mt-1.5">
                      <LabelSelector
                        conversation={selected}
                        labels={labels}
                        onLabelsChange={handleLabelsChange}
                        companyId={companyId}
                      />
                    </div>
                  </div>
                </div>

                {/* Acciones derecha */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  {/* Recordatorio */}
                  <div className="relative" ref={reminderRef}>
                    <button
                      onClick={() => setShowReminder(v => !v)}
                      title={selected.reminder_at ? `Recordatorio en ${reminderLabel(selected.reminder_at)}` : 'Agregar recordatorio'}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors font-semibold ${
                        selected.reminder_at && new Date(selected.reminder_at) > new Date()
                          ? 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100'
                          : 'text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Bell size={13} />
                      {selected.reminder_at && new Date(selected.reminder_at) > new Date()
                        ? reminderLabel(selected.reminder_at)
                        : null}
                    </button>
                    {showReminder && (
                      <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">Recordarme en</p>
                        {REMINDER_OPTIONS.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => handleSetReminder(opt)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                          >
                            <Bell size={12} className="text-amber-400 flex-shrink-0" />
                            {opt.label}
                          </button>
                        ))}
                        {selected.reminder_at && (
                          <>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                              onClick={handleClearReminder}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-sm text-red-400 transition-colors"
                            >
                              <BellOff size={12} className="flex-shrink-0" /> Quitar recordatorio
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Asignar */}
                  {agents.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowAssign(v => !v)}
                        title="Asignar agente"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-colors font-semibold ${
                          selected.assigned_to
                            ? 'text-violet-600 border-violet-200 bg-violet-50 hover:bg-violet-100'
                            : 'text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <UserPlus size={13} />
                        {selected.assigned_agent_name || 'Asignar'}
                        <ChevronDown size={11} />
                      </button>
                      {showAssign && (
                        <AssignDropdown
                          agents={agents}
                          assigned={selected.assigned_to}
                          currentUserId={user?.id}
                          onAssign={handleAssign}
                          onClose={() => setShowAssign(false)}
                        />
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleRestartBot}
                    title="Reiniciar bot"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors font-semibold"
                  >
                    <RotateCcw size={13} /> Reiniciar
                  </button>
                  {selected.status !== 'bot' && (
                    <button onClick={() => handleStatus('bot')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-600 border border-brand-200 rounded-xl hover:bg-brand-50 transition-colors font-semibold">
                      <Bot size={13} /> Bot
                    </button>
                  )}
                  {selected.status !== 'human' && (
                    <button onClick={() => handleStatus('human')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors font-semibold">
                      <UserCheck size={13} /> Tomar
                    </button>
                  )}
                  {selected.status !== 'closed' && (
                    <button onClick={() => handleStatus('closed')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors font-semibold">
                      <X size={13} /> Cerrar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  <span className="w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin mr-2" />
                  Cargando...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sin mensajes aún</div>
              ) : (
                messages.map(msg => {
                  if (msg.is_note) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="max-w-xs lg:max-w-md xl:max-w-lg w-full">
                          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 relative">
                            <div className="flex items-center gap-1.5 mb-1">
                              <StickyNote size={11} className="text-amber-500 flex-shrink-0" />
                              <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Nota interna</span>
                              <span className="text-[10px] text-amber-400 ml-auto">
                                {msg.agent_name || 'Agente'} · {new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-amber-900 leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isOut = msg.direction === 'outbound';
                  return (
                    <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md xl:max-w-lg flex flex-col gap-1 ${isOut ? 'items-end' : 'items-start'}`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOut
                            ? 'bg-brand-500 text-white rounded-br-sm shadow-sm shadow-brand-500/20'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                        }`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 text-[10px] text-slate-400 ${isOut ? 'flex-row-reverse' : ''}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOut && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>{msg.sent_by === 'agent' ? (msg.agent_name || 'Agente') : 'Bot'}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Preview de imagen adjunta */}
            {imagePreview && (
              <div className="bg-slate-50 border-t border-slate-100 px-4 py-2.5 flex items-center gap-3">
                <img src={imagePreview.url} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">Imagen lista para enviar</p>
                  <p className="text-[10px] text-slate-400 truncate">{imagePreview.file.name}</p>
                </div>
                <button
                  onClick={handleSendImage}
                  disabled={sending}
                  className="px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <Send size={11} />
                  {sending ? 'Enviando...' : 'Enviar'}
                </button>
                <button onClick={cancelImage} className="p-1 text-slate-400 hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-slate-200 px-4 py-3">
              {selected.status === 'closed' ? (
                <div className="flex items-center justify-center gap-3 py-1">
                  <p className="text-sm text-slate-400">Conversación cerrada</p>
                  <button onClick={handleRestartBot} className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                    <RotateCcw size={11} /> Reiniciar bot
                  </button>
                </div>
              ) : selected.status === 'bot' ? (
                <div className="space-y-2">
                  {/* En modo bot también se puede dejar nota interna */}
                  <div className="relative">
                    {showTemplates && noteMode === false && (
                      <TemplatePopover templates={templates} query={templateQuery} onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
                    )}
                    {noteMode ? (
                      <form onSubmit={handleSend} className="flex gap-2">
                        <input
                          ref={replyInputRef}
                          type="text"
                          value={reply}
                          onChange={handleReplyChange}
                          placeholder={inputPlaceholder}
                          className="flex-1 px-4 py-2.5 text-sm border border-amber-300 bg-amber-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          disabled={sending}
                        />
                        <button type="submit" disabled={!reply.trim() || sending}
                          className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-semibold">
                          <StickyNote size={15} /> {sending ? '...' : 'Nota'}
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-1 text-sm text-slate-400">
                        <Bot size={15} className="text-brand-400" />
                        El bot está manejando esta conversación.
                        <button onClick={() => handleStatus('human')} className="text-amber-500 font-semibold hover:underline text-xs">
                          Tomar control
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Toggle nota */}
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => { setNoteMode(v => !v); setReply(''); setShowTemplates(false); }}
                      className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                        noteMode ? 'bg-amber-100 text-amber-600 font-semibold' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      <StickyNote size={11} />
                      {noteMode ? 'Cancelar nota' : 'Agregar nota interna'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Quick reply buttons — top 5 plantillas más usadas */}
                  {templates.length > 0 && !noteMode && (
                    <div className="flex gap-1.5 flex-wrap">
                      <Zap size={11} className="text-slate-300 self-center flex-shrink-0" />
                      {topTemplates(templates).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { trackTemplate(t.id); handleTemplateSelect(t.content); }}
                          className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-brand-50 hover:text-brand-600 text-slate-600 rounded-full border border-slate-200 hover:border-brand-200 transition-colors truncate max-w-[130px]"
                          title={t.content}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    {showTemplates && !noteMode && (
                      <TemplatePopover templates={templates} query={templateQuery} onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
                    )}
                    <form onSubmit={handleSend} className="flex gap-2">
                      <input
                        ref={replyInputRef}
                        type="text"
                        value={reply}
                        onChange={handleReplyChange}
                        placeholder={inputPlaceholder}
                        className={`flex-1 px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent ${
                          noteMode
                            ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
                            : 'border-slate-200 bg-slate-50 focus:ring-brand-400'
                        }`}
                        disabled={sending}
                      />
                      {!noteMode && (
                        <>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleImageSelect}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Adjuntar imagen"
                            className="px-3 py-2.5 text-slate-400 border border-slate-200 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0"
                          >
                            <Paperclip size={15} />
                          </button>
                        </>
                      )}
                      <button
                        type="submit"
                        disabled={!reply.trim() || sending}
                        className={`px-4 py-2.5 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm ${
                          noteMode
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                            : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
                        }`}
                      >
                        {noteMode ? <StickyNote size={15} /> : <Send size={15} />}
                        {sending ? '...' : noteMode ? 'Nota' : 'Enviar'}
                      </button>
                    </form>
                  </div>

                  {/* Toggle nota / mensaje */}
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => { setNoteMode(v => !v); setReply(''); setShowTemplates(false); }}
                      className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                        noteMode ? 'bg-amber-100 text-amber-600 font-semibold' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      <StickyNote size={11} />
                      {noteMode ? 'Cancelar nota · volver a mensaje' : 'Nota interna'}
                    </button>
                    {!noteMode && (
                      <span className="text-[10px] text-slate-300">Escribe / para plantillas</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Toasts de recordatorio ──────────────────────────────────────────── */}
      {reminderToasts.length > 0 && (
        <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-[100]">
          {reminderToasts.map(t => (
            <div key={t.id} className="flex items-start gap-3 bg-white border border-amber-200 shadow-xl rounded-2xl px-4 py-3 max-w-xs">
              <Bell size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Recordatorio</p>
                <p className="text-xs text-slate-500 truncate">{t.conv.contact_name || t.conv.user_phone}</p>
                {t.conv.reminder_note && <p className="text-xs text-slate-400 mt-0.5 truncate">{t.conv.reminder_note}</p>}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setReminderToasts(prev => prev.filter(x => x.id !== t.id));
                    selectConversation(t.conv);
                  }}
                  className="text-xs text-brand-500 font-semibold hover:underline"
                >
                  Ver
                </button>
                <button
                  onClick={() => setReminderToasts(prev => prev.filter(x => x.id !== t.id))}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Panel de contacto ────────────────────────────────────────────────── */}
      {selected && (
        <ContactPanel
          conversation={selected}
          companyId={companyId}
          onContactUpdated={(contact) => {
            setSelected(prev => ({ ...prev, contact_name: contact.name }));
            setConversations(prev => prev.map(c =>
              c.id === selected.id ? { ...c, contact_name: contact.name } : c
            ));
          }}
        />
      )}
    </div>
  );
}
