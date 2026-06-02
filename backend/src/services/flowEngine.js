// Motor de flujo puro — no toca BD ni WhatsApp.
// Usado por el simulador del Flow Editor.

function resolveVars(text, vars) {
  if (!text) return '';
  return text.replace(/\{\{(\w+)\}\}/gi, (_, key) => {
    const val = vars[key] ?? vars[key.toLowerCase()];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

function evaluateCondition(node, vars) {
  const { variable, operator, value } = node.data || {};
  const actual   = vars[variable] != null ? String(vars[variable]) : '';
  const expected = String(value || '');
  switch (operator) {
    case 'equals':       return actual.toLowerCase() === expected.toLowerCase();
    case 'not_equals':   return actual.toLowerCase() !== expected.toLowerCase();
    case 'contains':     return actual.toLowerCase().includes(expected.toLowerCase());
    case 'starts_with':  return actual.toLowerCase().startsWith(expected.toLowerCase());
    case 'is_empty':     return actual.trim() === '';
    case 'not_empty':    return actual.trim() !== '';
    case 'greater_than': return parseFloat(actual) > parseFloat(expected);
    case 'less_than':    return parseFloat(actual) < parseFloat(expected);
    default:             return false;
  }
}

function resolveConditionChain(nodeId, nodes, edges, vars) {
  let id = nodeId;
  for (let i = 0; i < 20; i++) {
    if (!id) return null;
    const node = nodes.find(n => n.id === id);
    if (!node) return null;
    if (node.type !== 'condition') return id;
    const branch = evaluateCondition(node, vars) ? 'true' : 'false';
    const edge   = edges.find(e => e.source === node.id && e.sourceHandle === branch);
    id = edge?.target ?? null;
  }
  return null;
}

function dispatchNode(node, vars) {
  const out = [];
  switch (node.type) {
    case 'start':
    case 'message':
      out.push({ type: 'bot', text: resolveVars(node.data.message || node.data.label || '...', vars) });
      break;

    case 'options': {
      const body = resolveVars(node.data.message || '¿En qué te podemos ayudar?', vars);
      const opts = (node.data.options || []).map(o => ({ id: o.id, label: resolveVars(o.label, vars) }));
      out.push({ type: 'bot', text: body, options: opts });
      break;
    }

    case 'input':
      out.push({ type: 'bot', text: resolveVars(node.data.question || '¿Cuál es tu respuesta?', vars) });
      break;

    case 'transfer':
      out.push({ type: 'bot', text: resolveVars(node.data.message || 'Te conectamos con un asesor, por favor espera.', vars) });
      out.push({ type: 'system', text: '🔁 Conversación transferida a un agente humano' });
      break;

    case 'end':
      out.push({ type: 'bot', text: resolveVars(node.data.message || '¡Gracias por contactarnos! Hasta pronto.', vars) });
      out.push({ type: 'system', text: '🏁 Flujo finalizado' });
      break;

    case 'delay': {
      const dur  = node.data?.duration || 5;
      const unit = node.data?.unit || 'minutes';
      out.push({ type: 'system', text: `⏱ Delay: ${dur} ${unit} (simulado al instante)` });
      break;
    }

    default:
      break;
  }
  return out;
}

/**
 * Ejecuta un paso del simulador.
 *
 * @param {object} params
 * @param {Array}  params.nodes
 * @param {Array}  params.edges
 * @param {string|null} params.currentNodeId  — null = inicio fresco
 * @param {object} params.variables
 * @param {string} params.userMessage
 *
 * @returns {{
 *   messages: Array<{type,text,options?}>,
 *   currentNodeId: string|null,
 *   variables: object,
 *   status: 'active'|'waiting_input'|'transfer'|'end'
 * }}
 */
function stepFlow({ nodes, edges, currentNodeId = null, variables = {}, userMessage = '' }) {
  const vars     = { ...variables };
  const messages = [];

  // ── INICIO FRESCO ─────────────────────────────────────────────────────────
  if (!currentNodeId) {
    const startNode = nodes.find(n => n.type === 'start');
    if (!startNode) {
      return { messages: [{ type: 'error', text: 'No hay nodo de inicio definido.' }], currentNodeId: null, variables: vars, status: 'end' };
    }

    messages.push(...dispatchNode(startNode, vars));

    const startEdge    = edges.find(e => e.source === startNode.id && !e.sourceHandle);
    const resolvedId   = resolveConditionChain(startEdge?.target, nodes, edges, vars);
    const nextNode     = resolvedId ? nodes.find(n => n.id === resolvedId) : null;

    if (!nextNode) return { messages, currentNodeId: null, variables: vars, status: 'end' };

    messages.push(...dispatchNode(nextNode, vars));

    if (nextNode.type === 'options' || nextNode.type === 'input') {
      return { messages, currentNodeId: nextNode.id, variables: vars, status: 'waiting_input' };
    }
    if (nextNode.type === 'transfer') return { messages, currentNodeId: nextNode.id, variables: vars, status: 'transfer' };
    if (nextNode.type === 'end')      return { messages, currentNodeId: null, variables: vars, status: 'end' };

    // Si el nodo es un mensaje, avanzar al siguiente (que podría ser opciones)
    if (nextNode.type === 'message') {
      const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
      const afterId   = resolveConditionChain(afterEdge?.target, nodes, edges, vars);
      const afterNode = afterId ? nodes.find(n => n.id === afterId) : null;
      if (afterNode?.type === 'options' || afterNode?.type === 'input') {
        messages.push(...dispatchNode(afterNode, vars));
        return { messages, currentNodeId: afterNode.id, variables: vars, status: 'waiting_input' };
      }
    }

    return { messages, currentNodeId: nextNode.id, variables: vars, status: 'active' };
  }

  // ── CONTINUAR DESDE NODO ACTUAL ───────────────────────────────────────────
  const currentNode = nodes.find(n => n.id === currentNodeId);
  if (!currentNode) return { messages: [{ type: 'error', text: 'Nodo no encontrado.' }], currentNodeId: null, variables: vars, status: 'end' };

  let nextNodeId = null;

  if (currentNode.type === 'options') {
    const opts  = currentNode.data.options || [];
    const input = userMessage.toLowerCase().trim();
    const selected = opts.find(o =>
      o.id === userMessage || o.label.toLowerCase() === input || o.label.toLowerCase().startsWith(input)
    );
    if (!selected) {
      messages.push({ type: 'bot', text: 'No entendí tu selección 🤔 Por favor elige una de las opciones:' });
      messages.push(...dispatchNode(currentNode, vars));
      return { messages, currentNodeId, variables: vars, status: 'waiting_input' };
    }
    messages.push({ type: 'user_echo', text: `✓ Seleccionaste: "${selected.label}"` });
    const edge = edges.find(e => e.source === currentNode.id && e.sourceHandle === selected.id);
    nextNodeId = edge?.target;

  } else if (currentNode.type === 'input') {
    const varName = currentNode.data?.variable_name?.trim();
    if (varName && userMessage.trim()) {
      vars[varName] = userMessage.trim();
      messages.push({ type: 'system', text: `💾 ${varName} = "${userMessage.trim()}"` });
    }
    const edge = edges.find(e => e.source === currentNode.id && !e.sourceHandle);
    nextNodeId = edge?.target;

  } else if (currentNode.type === 'delay') {
    // En delay, avanzar automáticamente
    const edge = edges.find(e => e.source === currentNode.id && !e.sourceHandle);
    nextNodeId = edge?.target;

  } else {
    const edge = edges.find(e => e.source === currentNode.id && !e.sourceHandle);
    nextNodeId = edge?.target;
  }

  if (!nextNodeId) return { messages: [{ type: 'system', text: '(Sin conexión desde este nodo)' }], currentNodeId, variables: vars, status: 'end' };

  nextNodeId = resolveConditionChain(nextNodeId, nodes, edges, vars);
  if (!nextNodeId) return { messages: [{ type: 'system', text: '(Condición sin salida)' }], currentNodeId, variables: vars, status: 'end' };

  const nextNode = nodes.find(n => n.id === nextNodeId);
  if (!nextNode) return { messages, currentNodeId: null, variables: vars, status: 'end' };

  // Saltar delay automáticamente en el simulador
  if (nextNode.type === 'delay') {
    messages.push(...dispatchNode(nextNode, vars));
    const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
    const afterId   = resolveConditionChain(afterEdge?.target, nodes, edges, vars);
    const afterNode = afterId ? nodes.find(n => n.id === afterId) : null;
    if (afterNode) {
      messages.push(...dispatchNode(afterNode, vars));
      if (afterNode.type === 'options' || afterNode.type === 'input') return { messages, currentNodeId: afterNode.id, variables: vars, status: 'waiting_input' };
      if (afterNode.type === 'transfer') return { messages, currentNodeId: afterNode.id, variables: vars, status: 'transfer' };
      if (afterNode.type === 'end') return { messages, currentNodeId: null, variables: vars, status: 'end' };
      return { messages, currentNodeId: afterNode.id, variables: vars, status: 'active' };
    }
  }

  messages.push(...dispatchNode(nextNode, vars));

  if (nextNode.type === 'transfer') return { messages, currentNodeId: nextNode.id, variables: vars, status: 'transfer' };
  if (nextNode.type === 'end')      return { messages, currentNodeId: null, variables: vars, status: 'end' };
  if (nextNode.type === 'options' || nextNode.type === 'input') return { messages, currentNodeId: nextNode.id, variables: vars, status: 'waiting_input' };

  // Mensaje seguido de opciones/input — avanzar
  if (nextNode.type === 'message') {
    const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
    const afterId   = resolveConditionChain(afterEdge?.target, nodes, edges, vars);
    const afterNode = afterId ? nodes.find(n => n.id === afterId) : null;
    if (afterNode?.type === 'options' || afterNode?.type === 'input') {
      messages.push(...dispatchNode(afterNode, vars));
      return { messages, currentNodeId: afterNode.id, variables: vars, status: 'waiting_input' };
    }
  }

  return { messages, currentNodeId: nextNode.id, variables: vars, status: 'active' };
}

module.exports = { stepFlow };
