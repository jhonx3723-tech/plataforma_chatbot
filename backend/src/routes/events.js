const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');
const broadcaster = require('../broadcaster');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  };

  send('connected', { ok: true });

  const clientId = `${req.user.id}-${Date.now()}`;
  broadcaster.register(clientId, req.user.id, req.user.company_id, res);

  // ── Enriquecer una conversación con contact_name + assigned_agent_name ────────
  async function enrichConv(conv) {
    if (!conv) return conv;
    const results = await Promise.all([
      conv.user_phone && conv.company_id
        ? supabase.from('contacts').select('name')
            .eq('phone', conv.user_phone).eq('company_id', conv.company_id).maybeSingle()
        : Promise.resolve({ data: null }),
      conv.assigned_to
        ? supabase.from('users').select('id, username')
            .eq('id', conv.assigned_to).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    return {
      ...conv,
      contact_name:        results[0].data?.name || null,
      assigned_agent_name: results[1].data?.username || null,
    };
  }

  const channelName = `inbox-${req.user.id}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' },
      async (payload) => {
        const conv = payload.new || payload.old;
        if (req.user.role === 'company_agent' && conv?.company_id !== req.user.company_id) return;

        // Para INSERT y UPDATE enriquecer con datos relacionados
        if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
          const enriched = await enrichConv(payload.new).catch(() => payload.new);
          send('conversation', { ...payload, new: { ...enriched, unread: payload.eventType === 'INSERT' ? 0 : undefined } });
        } else {
          send('conversation', payload);
        }
      }
    )
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;
        if (req.user.role === 'company_agent' && msg?.company_id !== req.user.company_id) return;
        send('message', payload);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') send('ready', { realtime: true });
      if (status === 'CHANNEL_ERROR') send('ready', { realtime: false });
    });

  // Ping cada 25s para mantener la conexión viva
  const keepAlive = setInterval(() => {
    try { res.write(':ping\n\n'); } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    broadcaster.unregister(clientId);
    supabase.removeChannel(channel);
  });
});

module.exports = router;
