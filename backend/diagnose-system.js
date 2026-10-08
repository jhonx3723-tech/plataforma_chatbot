require('dotenv').config();
const supabase = require('./src/supabase');

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA\n');
  console.log('═'.repeat(60));

  // 1. Verificar empresa
  console.log('\n1️⃣ VERIFICANDO EMPRESA:');
  const { data: company, error: compError } = await supabase
    .from('companies')
    .select('*')
    .eq('name', 'cato cato')
    .single();

  if (compError) {
    console.log('❌ Error:', compError.message);
    return;
  }

  console.log('   ✅ Empresa encontrada:', company.name);
  console.log('   📱 Phone:', company.phone);
  console.log('   🆔 Phone ID:', company.whatsapp_phone_id);
  console.log('   🔑 Token:', company.whatsapp_token ? `Configurado (${company.whatsapp_token.substring(0, 20)}...)` : '❌ NO CONFIGURADO');
  console.log('   ✅ Activa:', company.active ? 'SÍ' : 'NO');
  console.log('   🔗 Webhook Token:', company.webhook_verify_token);

  // 2. Verificar conversaciones recientes
  console.log('\n2️⃣ VERIFICANDO CONVERSACIONES RECIENTES:');
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, user_phone, status, last_message, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`   📊 Total conversaciones recientes: ${conversations.length}`);
  conversations.forEach(conv => {
    console.log(`   - ${conv.user_phone} | Estado: ${conv.status} | Último: "${conv.last_message?.substring(0, 30)}..."`);
  });

  // 3. Verificar mensajes recientes
  if (conversations.length > 0) {
    console.log('\n3️⃣ VERIFICANDO MENSAJES DE LA ÚLTIMA CONVERSACIÓN:');
    const lastConv = conversations[0];
    const { data: messages } = await supabase
      .from('messages')
      .select('direction, content, sender_type, created_at')
      .eq('conversation_id', lastConv.id)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`   📨 Total mensajes: ${messages?.length || 0}`);
    if (!messages || messages.length === 0) {
      console.log('   ⚠️  No hay mensajes en esta conversación');
    } else {
      messages.forEach(msg => {
        const icon = msg.direction === 'inbound' ? '📥' : '📤';
        const type = msg.sender_type || 'unknown';
        console.log(`   ${icon} [${msg.direction}] [${type}] ${msg.content?.substring(0, 50)}`);
      });

      // Contar mensajes del bot
      const botMessages = messages.filter(m => m.direction === 'outbound' && m.sender_type === 'bot');
      console.log(`\n   🤖 Mensajes del bot guardados: ${botMessages.length}`);
    }
  }

  // 4. Verificar configuración de IA
  console.log('\n4️⃣ VERIFICANDO CONFIGURACIÓN DE IA:');
  console.log('   🔑 COHERE_API_KEY:', process.env.COHERE_API_KEY ? 'Configurada' : '❌ NO CONFIGURADA');

  // 5. Verificar webhook
  console.log('\n5️⃣ WEBHOOK URL CORRECTO:');
  console.log('   🔗 https://plataforma-chatbot.onrender.com/webhook/whatsapp/' + company.id);
  console.log('   🔐 Verify Token:', company.webhook_verify_token);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ DIAGNÓSTICO COMPLETADO\n');

  process.exit(0);
}

diagnose().catch(err => {
  console.error('❌ Error en diagnóstico:', err.message);
  process.exit(1);
});
