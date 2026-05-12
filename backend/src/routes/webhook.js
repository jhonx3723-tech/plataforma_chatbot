const express = require('express');
const supabase = require('../supabase');
const { sendText, sendButtons, sendList } = require('../services/whatsapp');

const router = express.Router();

// ─── Verificación del webhook (GET) ──────────────────────────────────────────
router.get('/whatsapp/:companyId', async (req, res) => {
  const { data: company } = await supabase
    .from('companies')
    .select('webhook_verify_token')
    .eq('id', req.params.companyId)
    .single();
  if (!company) return res.sendStatus(404);

  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === company.webhook_verify_token) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── Recepción de mensajes (POST) ────────────────────────────────────────────
router.post('/whatsapp/:companyId', async (req, res) => {
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', req.params.companyId)
    .eq('active', 1)
    .single();
  if (!company) return res.sendStatus(404);

  res.sendStatus(200); // responder rápido a Meta

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!entry?.messages) return;

    const msg         = entry.messages[0];
    const userPhone   = msg.from;
    const contactName = entry.contacts?.[0]?.profile?.name || userPhone;

    const vars = { nombre: contactName, telefono: userPhone, empresa: company.name };

    let userInput = null;
    if (msg.type === 'text') userInput = msg.text.body.trim();
    else if (msg.type === 'interactive') {
      if (msg.interactive.type === 'button_reply') userInput = msg.interactive.button_reply.id;
      else if (msg.interactive.type === 'list_reply') userInput = msg.interactive.list_reply.id;
    }
    if (!userInput) return;

    const conv = await findOrCreateConversation(company.id, userPhone);

    // Auto-crear / actualizar contacto con el nombre de WhatsApp
    const contactPatch = { company_id: company.id, phone: userPhone, updated_at: new Date().toISOString() };
    if (contactName && contactName !== userPhone) contactPatch.name = contactName;
    await supabase.from('contacts').upsert(contactPatch, { onConflict: 'company_id,phone' });

    await saveMessage(conv.id, company.id, 'inbound', userInput, 'user');
    await supabase
      .from('conversations')
      .update({ last_message: userInput, last_message_at: new Date().toISOString() })
      .eq('id', conv.id);

    if (conv.status === 'human') return;

    // ── Verificar horario de atención ─────────────────────────────────────
    if (!isInBusinessHours(company)) {
      const closedMsg = company.business_hours?.closed_message ||
        'En este momento estamos fuera de horario. Te responderemos a la brevedad. 🙏';
      if (company.whatsapp_phone_id && company.whatsapp_token) {
        await sendText(company.whatsapp_phone_id, company.whatsapp_token, userPhone, closedMsg);
      }
      await saveMessage(conv.id, company.id, 'outbound', closedMsg, 'bot');
      return;
    }

    // ── Flujo activo ──────────────────────────────────────────────────────
    const { data: flows } = await supabase
      .from('flows').select('*').eq('company_id', company.id).eq('active', 1).limit(1);
    const flow = flows?.[0];
    if (!flow) return;

    const { nodes, edges } = flow;

    // ── Sesión del usuario ────────────────────────────────────────────────
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('company_id', company.id)
      .eq('user_phone', userPhone)
      .eq('flow_id', flow.id)
      .limit(1);
    let session = sessions?.[0];

    if (!session) {
      const startNode = nodes.find(n => n.type === 'start');
      if (!startNode) return;

      const { data: newSession } = await supabase
        .from('sessions')
        .insert({
          company_id:      company.id,
          flow_id:         flow.id,
          user_phone:      userPhone,
          contact_name:    contactName,
          current_node_id: startNode.id,
        })
        .select()
        .single();
      session = newSession;

      const sent = await dispatchNode(company, startNode, edges, nodes, userPhone, vars);
      if (sent) await saveMessage(conv.id, company.id, 'outbound', sent, 'bot');

      const nextEdge = edges.find(e => e.source === startNode.id && !e.sourceHandle);
      const nextNode = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null;
      if (nextNode?.type === 'options') {
        const sentOpts = await dispatchNode(company, nextNode, edges, nodes, userPhone, vars);
        if (sentOpts) await saveMessage(conv.id, company.id, 'outbound', sentOpts, 'bot');
        await updateSession(session.id, nextNode.id);
      } else if (nextNode) {
        await updateSession(session.id, nextNode.id);
      }
      return;
    }

    if (session.contact_name && session.contact_name !== userPhone) {
      vars.nombre = session.contact_name;
    }

    const currentNode = nodes.find(n => n.id === session.current_node_id);
    if (!currentNode) return;

    let nextNodeId = null;

    if (currentNode.type === 'options') {
      const selected = currentNode.data.options?.find(
        o => o.id === userInput || o.label.toLowerCase() === userInput.toLowerCase()
      );
      if (!selected) {
        const sent = await dispatchNode(company, currentNode, edges, nodes, userPhone, vars);
        if (sent) await saveMessage(conv.id, company.id, 'outbound', sent, 'bot');
        return;
      }
      const edge = edges.find(e => e.source === currentNode.id && e.sourceHandle === selected.id);
      nextNodeId = edge?.target;
    } else {
      const edge = edges.find(e => e.source === currentNode.id && !e.sourceHandle);
      nextNodeId = edge?.target;
    }

    if (!nextNodeId) return;
    const nextNode = nodes.find(n => n.id === nextNodeId);
    if (!nextNode) return;

    const sent = await dispatchNode(company, nextNode, edges, nodes, userPhone, vars);
    if (sent) await saveMessage(conv.id, company.id, 'outbound', sent, 'bot');

    if (nextNode.type === 'message') {
      const afterEdge = edges.find(e => e.source === nextNode.id && !e.sourceHandle);
      const afterNode = afterEdge ? nodes.find(n => n.id === afterEdge.target) : null;
      if (afterNode?.type === 'options') {
        const sentOpts = await dispatchNode(company, afterNode, edges, nodes, userPhone, vars);
        if (sentOpts) await saveMessage(conv.id, company.id, 'outbound', sentOpts, 'bot');
        await updateSession(session.id, afterNode.id);
        return;
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
    console.error('Error en webhook:', err.message);
  }
});

// ─── Utilidades ──────────────────────────────────────────────────────────────

async function findOrCreateConversation(companyId, userPhone) {
  const { data: convs } = await supabase
    .from('conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('user_phone', userPhone)
    .neq('status', 'closed')
    .limit(1);

  if (convs?.length) return convs[0];

  const { data: newConv } = await supabase
    .from('conversations')
    .insert({
      company_id:      companyId,
      user_phone:      userPhone,
      status:          'bot',
      last_message:    '',
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();
  return newConv;
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

function resolveVars(text, vars) {
  if (!text) return text;
  return text
    .replace(/\{\{nombre\}\}/gi,   vars.nombre   || '')
    .replace(/\{\{telefono\}\}/gi, vars.telefono  || '')
    .replace(/\{\{empresa\}\}/gi,  vars.empresa   || '');
}

function isInBusinessHours(company) {
  const bh = company.business_hours;
  if (!bh?.enabled) return true;

  const tz      = bh.timezone || 'America/Bogota';
  const nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const day     = String(nowInTz.getDay());
  const hh      = String(nowInTz.getHours()).padStart(2, '0');
  const mm      = String(nowInTz.getMinutes()).padStart(2, '0');
  const nowTime = `${hh}:${mm}`;

  const dayConfig = bh.schedule?.[day];
  if (!dayConfig?.open) return false;
  return nowTime >= dayConfig.from && nowTime < dayConfig.to;
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

    case 'transfer':
      return send(node.data.message || 'Te conectamos con un asesor, por favor espera.');

    case 'end':
      return send(node.data.message || '¡Gracias por contactarnos! Hasta pronto.');
  }
  return null;
}

module.exports = router;
