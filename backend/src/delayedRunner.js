// Runner for delay nodes — executes scheduled flow messages every 30 seconds.
const supabase = require('./supabase');
const { sendText, sendButtons, sendList } = require('./services/whatsapp');

function getDelayMs(node) {
  const duration = parseInt(node.data?.duration) || 5;
  const unit     = node.data?.unit || 'minutes';
  const mult     = unit === 'seconds' ? 1000 : unit === 'hours' ? 3600000 : 60000;
  return duration * mult;
}

function resolveVars(text, vars) {
  if (!text) return text;
  return text.replace(/\{\{(\w+)\}\}/gi, (_, key) => {
    const val = vars[key] ?? vars[key.toLowerCase()];
    return val !== undefined ? String(val) : '';
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

async function dispatchNode(company, node, edges, nodes, userPhone, vars = {}) {
  const { whatsapp_phone_id: phoneId, whatsapp_token: token } = company;

  const send = async (text) => {
    const resolved = resolveVars(text, vars);
    if (phoneId && token) await sendText(phoneId, token, userPhone, resolved);
    return resolved;
  };

  switch (node.type) {
    case 'start':
    case 'message':
      return send(node.data.message || node.data.label);

    case 'delay':
      if (node.data.message?.trim()) return send(node.data.message);
      return null;

    case 'options': {
      const opts = node.data.options || [];
      const body = resolveVars(node.data.message || '¿En qué te podemos ayudar?', vars);
      if (phoneId && token) {
        if (opts.length <= 3) {
          await sendButtons(phoneId, token, userPhone, body, opts.map(o => ({ id: o.id, title: o.label })));
        } else {
          await sendList(phoneId, token, userPhone, resolveVars(node.data.label || 'Menú', vars), body,
            opts.map(o => ({ id: o.id, title: o.label })));
        }
      }
      return `[Opciones] ${body}`;
    }

    case 'input':
      return send(node.data.question || '¿Cuál es tu respuesta?');

    case 'transfer':
      return send(node.data.message || 'Te conectamos con un asesor, por favor espera.');

    case 'end':
      return send(node.data.message || '¡Gracias por contactarnos! Hasta pronto.');
  }
  return null;
}

async function saveMessage(conversationId, companyId, direction, content, sentBy) {
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    company_id:      companyId,
    direction,
    content,
    sent_by:         sentBy,
    read:            direction === 'outbound',
  });
}

async function updateSession(sessionId, nodeId) {
  await supabase
    .from('sessions')
    .update({ current_node_id: nodeId, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
}

async function runDelayedMessages() {
  try {
    const now = new Date().toISOString();
    const { data: due } = await supabase
      .from('delayed_messages')
      .select('*')
      .eq('executed', false)
      .lte('scheduled_at', now);

    if (!due?.length) return;

    for (const item of due) {
      // Mark executed first to prevent double-execution on concurrent runs
      await supabase.from('delayed_messages').update({ executed: true }).eq('id', item.id);

      try {
        const [{ data: conv }, { data: session }, { data: company }] = await Promise.all([
          supabase.from('conversations').select('*').eq('id', item.conversation_id).single(),
          supabase.from('sessions').select('*').eq('id', item.session_id).single(),
          supabase.from('companies').select('*').eq('id', item.company_id).single(),
        ]);

        if (!conv || !session || !company) continue;
        if (conv.status === 'human' || conv.status === 'closed') continue;

        const { data: flows } = await supabase
          .from('flows').select('*').eq('company_id', company.id).eq('active', 1).limit(1);
        const flow = flows?.[0];
        if (!flow) continue;

        const { nodes, edges } = flow;
        const vars = {
          nombre:  session.contact_name || conv.user_phone,
          telefono: conv.user_phone,
          empresa: company.name,
          ...(session.variables || {}),
        };

        // Resolve conditions from the scheduled node
        const resolvedId = resolveConditionChain(item.next_node_id, nodes, edges, vars);
        if (!resolvedId) continue;

        const nextNode = nodes.find(n => n.id === resolvedId);
        if (!nextNode) continue;

        // If next node is also a delay, schedule it
        if (nextNode.type === 'delay') {
          const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
          if (afterEdge?.target) {
            await supabase.from('delayed_messages').insert({
              company_id:      company.id,
              conversation_id: conv.id,
              session_id:      session.id,
              next_node_id:    afterEdge.target,
              scheduled_at:    new Date(Date.now() + getDelayMs(nextNode)).toISOString(),
            });
            // Send the delay node's optional message if set
            if (nextNode.data?.message?.trim()) {
              const msg = resolveVars(nextNode.data.message, vars);
              if (company.whatsapp_phone_id && company.whatsapp_token)
                await sendText(company.whatsapp_phone_id, company.whatsapp_token, conv.user_phone, msg);
              await saveMessage(conv.id, company.id, 'outbound', msg, 'bot');
            }
          }
          await updateSession(session.id, nextNode.id);
          continue;
        }

        const sent = await dispatchNode(company, nextNode, edges, nodes, conv.user_phone, vars);
        if (sent) {
          await saveMessage(conv.id, company.id, 'outbound', sent, 'bot');
          await supabase.from('conversations')
            .update({ last_message: sent, last_message_at: new Date().toISOString() })
            .eq('id', conv.id);
        }

        // Look ahead: if a message node is followed by options/input, dispatch both
        if (nextNode.type === 'message') {
          const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
          const resolvedAfterId = resolveConditionChain(afterEdge?.target, nodes, edges, vars);
          const afterNode = resolvedAfterId ? nodes.find(n => n.id === resolvedAfterId) : null;
          if (afterNode?.type === 'options' || afterNode?.type === 'input') {
            const sentAfter = await dispatchNode(company, afterNode, edges, nodes, conv.user_phone, vars);
            if (sentAfter) await saveMessage(conv.id, company.id, 'outbound', sentAfter, 'bot');
            await updateSession(session.id, afterNode.id);
            continue;
          }
        }

        if (nextNode.type === 'transfer') {
          await supabase.from('conversations').update({ status: 'human' }).eq('id', conv.id);
          await supabase.from('sessions').delete().eq('id', session.id);
        } else if (nextNode.type === 'end') {
          await supabase.from('sessions').delete().eq('id', session.id);
        } else {
          await updateSession(session.id, nextNode.id);
        }

      } catch (err) {
        console.error(`Error en delayed_message ${item.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Error en runDelayedMessages:', err.message);
  }
}

module.exports = { runDelayedMessages };
