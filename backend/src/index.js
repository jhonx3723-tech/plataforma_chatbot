require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');
const { authMiddleware } = require('./middleware/auth');

const authRouter          = require('./routes/auth');
const companiesRouter     = require('./routes/companies');
const flowsRouter         = require('./routes/flows');
const webhookRouter       = require('./routes/webhook');
const usersRouter         = require('./routes/users');
const conversationsRouter = require('./routes/conversations');
const eventsRouter        = require('./routes/events');
const dashboardRouter     = require('./routes/dashboard');
const contactsRouter      = require('./routes/contacts');
const templatesRouter     = require('./routes/templates');
const labelsRouter        = require('./routes/labels');
const reportsRouter       = require('./routes/reports');
const hsmRouter           = require('./routes/hsm');
const crmRouter           = require('./routes/crm');
const { router: pushRouter } = require('./routes/push');

const { sendText } = require('./services/whatsapp');
const supabase     = require('./supabase');
const { runDelayedMessages } = require('./delayedRunner');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL, // ej: https://botbuilder-cato.netlify.app
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas públicas ─────────────────────────────────────────────────────────────
app.use('/api/auth',    authRouter);
app.use('/webhook',     webhookRouter);

// ── Rutas protegidas ──────────────────────────────────────────────────────────
app.use('/api/companies',     authMiddleware, companiesRouter);
app.use('/api/flows',         authMiddleware, flowsRouter);
app.use('/api/users',         usersRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/events',        eventsRouter);
app.use('/api/dashboard',     dashboardRouter);
app.use('/api/contacts',      contactsRouter);
app.use('/api/templates',     templatesRouter);
app.use('/api/labels',        labelsRouter);
app.use('/api/reports',       reportsRouter);
app.use('/api/hsm',           hsmRouter);
app.use('/api/crm',           authMiddleware, crmRouter);
app.use('/api/push',          pushRouter);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Cron: follow-ups automáticos (cada 15 min) ────────────────────────────────
async function runFollowUps() {
  try {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, whatsapp_phone_id, whatsapp_token, follow_up_config')
      .eq('active', 1)
      .not('follow_up_config', 'is', null);

    for (const company of (companies || [])) {
      const cfg = company.follow_up_config;
      if (!cfg?.enabled || !cfg?.hours) continue;

      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - cfg.hours);

      const { data: convs } = await supabase
        .from('conversations')
        .select('id, user_phone, follow_up_sent_at, last_message_at')
        .eq('company_id', company.id)
        .eq('status', 'human')
        .lte('last_message_at', cutoff.toISOString());

      for (const conv of (convs || [])) {
        if (
          conv.follow_up_sent_at &&
          new Date(conv.follow_up_sent_at) > new Date(conv.last_message_at)
        ) continue;

        const msg = cfg.message?.trim() || '¿Sigues necesitando ayuda? Estamos aquí para atenderte. 😊';

        if (cfg.action === 'message' && company.whatsapp_phone_id && company.whatsapp_token) {
          try { await sendText(company.whatsapp_phone_id, company.whatsapp_token, conv.user_phone, msg); } catch { /* silent */ }
          await supabase.from('messages').insert({
            conversation_id: conv.id, company_id: company.id,
            direction: 'outbound', content: msg, sent_by: 'bot', read: true, is_note: false,
          });
          await supabase.from('conversations')
            .update({ last_message: msg, last_message_at: new Date().toISOString() })
            .eq('id', conv.id);
        } else {
          const note = `⏰ Sin respuesta hace más de ${cfg.hours} hora${cfg.hours > 1 ? 's' : ''}. Recordatorio automático.`;
          await supabase.from('messages').insert({
            conversation_id: conv.id, company_id: company.id,
            direction: 'outbound', content: note, sent_by: 'bot', read: true, is_note: true,
          });
        }

        await supabase.from('conversations')
          .update({ follow_up_sent_at: new Date().toISOString() })
          .eq('id', conv.id);
      }
    }
  } catch (err) {
    console.error('Error en follow-ups:', err.message);
  }
}

// ── Arranque ──────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✓ Servidor en http://localhost:${PORT}`);
    setInterval(runFollowUps, 15 * 60 * 1000);
    runFollowUps();
    setInterval(runDelayedMessages, 30 * 1000); // cada 30 segundos
    runDelayedMessages();
  });
});
