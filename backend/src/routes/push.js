const express = require('express');
const webpush = require('web-push');
const supabase = require('../supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// GET /api/push/vapid-key — clave pública para el cliente
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — guardar suscripción del dispositivo
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint) return res.status(400).json({ error: 'subscription inválida' });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id:      req.user.id,
      company_id:   req.user.company_id || null,
      endpoint:     subscription.endpoint,
      subscription: subscription,
    }, { onConflict: 'endpoint' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE /api/push/subscribe — eliminar suscripción
router.delete('/subscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  } else {
    await supabase.from('push_subscriptions').delete().eq('user_id', req.user.id);
  }
  res.json({ ok: true });
});

// ── Enviar push a todos los agentes de una empresa ────────────────────────────
async function sendPushToCompany(companyId, payload) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('company_id', companyId);

  if (!subs?.length) return;

  const payloadStr = JSON.stringify(payload);
  const staleEndpoints = [];

  await Promise.all(subs.map(async ({ subscription }) => {
    try {
      await webpush.sendNotification(subscription, payloadStr);
    } catch (err) {
      // 410 = Gone (suscripción caducada), limpiar
      if (err.statusCode === 410 || err.statusCode === 404) {
        staleEndpoints.push(subscription.endpoint);
      }
    }
  }));

  if (staleEndpoints.length) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', staleEndpoints);
  }
}

// ── Enviar push solo al agente asignado ───────────────────────────────────────
async function sendPushToUser(userId, payload) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  if (!subs?.length) return;

  const payloadStr = JSON.stringify(payload);
  await Promise.all(subs.map(async ({ subscription }) => {
    try {
      await webpush.sendNotification(subscription, payloadStr);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      }
    }
  }));
}

module.exports = { router, sendPushToCompany, sendPushToUser };
