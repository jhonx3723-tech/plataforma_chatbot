const axios    = require('axios');
const FormData = require('form-data');

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

// Sube un archivo al servidor de medios de Meta y devuelve el media_id
async function uploadMedia(phoneId, token, fileBuffer, mimeType) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', fileBuffer, {
    filename: `media.${mimeType.split('/')[1] || 'bin'}`,
    contentType: mimeType,
  });

  const res = await axios.post(`${BASE}/${phoneId}/media`, form, {
    headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
  });
  return res.data.id;
}

// Envía una imagen usando un media_id previamente subido
async function sendImage(phoneId, token, to, mediaId, caption = '') {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'image',
    image: { id: mediaId },
  };
  if (caption) payload.image.caption = caption;

  return axios.post(`${BASE}/${phoneId}/messages`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Obtiene el perfil público de WhatsApp Business del número
async function getWAProfile(phoneId, token) {
  const res = await axios.get(`${BASE}/${phoneId}/whatsapp_business_profile`, {
    params: { fields: 'about,address,description,email,profile_picture_url,websites,vertical' },
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data.data?.[0] || {};
}

// Actualiza el perfil público de WhatsApp Business
async function updateWAProfile(phoneId, token, profile) {
  return axios.post(`${BASE}/${phoneId}/whatsapp_business_profile`, {
    messaging_product: 'whatsapp',
    ...profile,
  }, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

module.exports = { sendText, sendButtons, sendList, uploadMedia, sendImage, getWAProfile, updateWAProfile };
