const express = require('express');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// SSE — eventos en tiempo real para la bandeja de entrada
router.get('/', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { ok: true });

  const channelName = `inbox-${req.user.id}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations' },
      (payload) => {
        const conv = payload.new || payload.old;
        // Filtrar por empresa si es agente
        if (req.user.role === 'company_agent' && conv?.company_id !== req.user.company_id) return;
        send('conversation', payload);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
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
    res.write(':ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    supabase.removeChannel(channel);
  });
});

module.exports = router;
