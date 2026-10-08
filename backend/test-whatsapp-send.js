require('dotenv').config();
const { sendText } = require('./src/services/whatsapp');

async function testSend() {
  console.log('🧪 Probando envío de WhatsApp...\n');

  const phoneId = '1081704251694620';
  const token = 'EAAVFZBfZBF4ewBSsoyfNKiXtW3VEYDrMdyDAukYPpuled3PWF3BIksx8yieZAwfKggXoYxHvhTgNx7473lRJAtLaKbFuKZAwze3rBbrrd77n2ZCZBCJqRZAjJjcUenIZCBIcBMCLDbjDxAYcZBPleSxyeBAbQ66cgW9uqHrVRvBqSIcGLzxpH6YCp9fleBtomcEVG2rMi5wunAOJr6RfVTkMsEWiSIysEahU8DSMNYDMpsdZC3AdZB5F9FltoyKuD5aDlVlbqANCvQ90dZA2xMqepXhL76RNXQZDZD';
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
