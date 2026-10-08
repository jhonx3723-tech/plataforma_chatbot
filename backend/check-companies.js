require('dotenv').config();
const supabase = require('./src/supabase');

async function checkCompanies() {
  console.log('🔍 Verificando empresas en Supabase...\n');

  const { data, error } = await supabase
    .from('companies')
    .select('*');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Empresas encontradas: ${data.length}\n`);

  if (data.length === 0) {
    console.log('⚠️  No hay empresas en la base de datos.');
  } else {
    data.forEach(c => {
      console.log('📋 Empresa:', c.name);
      console.log('   ID:', c.id);
      console.log('   Teléfono:', c.phone || 'N/A');
      console.log('   WhatsApp Phone ID:', c.whatsapp_phone_id || 'N/A');
      console.log('   Token:', c.whatsapp_token ? '✅ Configurado' : '❌ No configurado');
      console.log('   Activa:', c.active ? '✅ Sí' : '❌ No');
      console.log('');
    });
  }

  process.exit(0);
}

checkCompanies().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
