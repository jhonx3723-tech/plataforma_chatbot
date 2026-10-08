require('dotenv').config();
const { sendText } = require('./src/services/whatsapp');

async function testSend() {
  console.log('🧪 Probando envío de WhatsApp...\n');

  const phoneId = '1081704251694620';
  const token = 'EAAVFZBfZBF4ewBSs54HPeBHVKYa4QnvZCgHZCyQzMZCpQbspqUKyszOixTwbl0plGBbuG8QyXBWHk4IBZAVyXinddnkbfkG147FB4QR93krujJGr4umDeBuNoaMgM4qzUDYSHyX6UT13cXECu33ZBTUUviLxiNJcQQotyhtPr4EF73cvJSElXnLimHAJBIAkbe6miuA3sbVIXZAvaxJKP3sPQoJABVKP1SD7XDaal7LVoC0xPtz17FRZAiwhJh7ADz4NBcRTl8bNoFyzSPJ5H';
  const to = '573209498361'; // El número del screenshot
  const message = '¡Hola! Esta es una prueba del bot. 🤖';

  try {
    const result = await sendText(phoneId, token, to, message);
    console.log('✅ Mensaje enviado exitosamente!');
    console.log('Respuesta de WhatsApp:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Error al enviar:', error.message);
    if (error.response) {
      console.error('Respuesta de error:', JSON.stringify(error.response.data, null, 2));
    }
  }

  process.exit(0);
}

testSend();
