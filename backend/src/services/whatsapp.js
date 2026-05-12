const axios = require('axios');

const BASE = 'https://graph.facebook.com/v19.0';

async function sendText(phoneId, token, to, body) {
  return axios.post(`${BASE}/${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  }, { headers: { Authorization: `Bearer ${token}` } });
}

async function sendButtons(phoneId, token, to, body, buttons) {
  // buttons: [{ id, title }] — máximo 3
  return axios.post(`${BASE}/${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.substring(0, 20) },
        })),
      },
    },
  }, { headers: { Authorization: `Bearer ${token}` } });
}

async function sendList(phoneId, token, to, headerText, bodyText, rows) {
  // rows: [{ id, title, description? }] — máximo 10
  return axios.post(`${BASE}/${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        button: 'Ver opciones',
        sections: [{
          title: 'Opciones disponibles',
          rows: rows.slice(0, 10).map(r => ({
            id: r.id,
            title: r.title.substring(0, 24),
            description: (r.description || '').substring(0, 72),
          })),
        }],
      },
    },
  }, { headers: { Authorization: `Bearer ${token}` } });
}

module.exports = { sendText, sendButtons, sendList };
