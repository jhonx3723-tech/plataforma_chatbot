require('dotenv').config();
const supabase = require('./src/supabase');
const { v4: uuidv4 } = require('uuid');

async function createCompany() {
  console.log('🏢 Creando empresa "cato cato"...\n');

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('companies')
    .select('*')
    .eq('name', 'cato cato')
    .single();

  if (existing) {
    console.log('⚠️  La empresa ya existe. Actualizando credenciales...\n');

    const { data, error } = await supabase
      .from('companies')
      .update({
        phone: '15556361235',
        whatsapp_phone_id: '108170425169462D',
        whatsapp_token: 'EAAVFZBfZBF4ewBStcf4pmGRsY6PtPJoBPaeT6Hi1ZBREP3v419urCjqLljVZC6sPIccaHlMxUmAlXZCG54bVZB6ELH16j8ej8XcoT9zFwHGSf37CmHtzM9RYDjHRI6z4qJJVDxSIx18nPLjrdGoWXqXPIxGp7ZAEES5ZBw11ypKHiR94oZBqerQxwg1mrcHkY1Sj2NnaszZANpMcRRCCD1YNozCBjUGMKLVLAZCzDbR5RLspXzL0vv2mwamoGfwT83Rxs2szXxgPKNpYxSnegYLDkHEffw9',
        active: 1,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error actualizando empresa:', error.message);
      process.exit(1);
    }

    console.log('✅ Empresa actualizada:\n');
    console.log('   ID:', data.id);
    console.log('   Nombre:', data.name);
    console.log('   Teléfono:', data.phone);
    console.log('   Phone Number ID:', data.whatsapp_phone_id);
    console.log('   Token configurado: ✅');
    console.log('');
    process.exit(0);
  }

  // Crear nueva empresa
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: 'cato cato',
      phone: '15556361235',
      whatsapp_phone_id: '108170425169462D',
      whatsapp_token: 'EAAVFZBfZBF4ewBStcf4pmGRsY6PtPJoBPaeT6Hi1ZBREP3v419urCjqLljVZC6sPIccaHlMxUmAlXZCG54bVZB6ELH16j8ej8XcoT9zFwHGSf37CmHtzM9RYDjHRI6z4qJJVDxSIx18nPLjrdGoWXqXPIxGp7ZAEES5ZBw11ypKHiR94oZBqerQxwg1mrcHkY1Sj2NnaszZANpMcRRCCD1YNozCBjUGMKLVLAZCzDbR5RLspXzL0vv2mwamoGfwT83Rxs2szXxgPKNpYxSnegYLDkHEffw9',
      webhook_verify_token: uuidv4().replace(/-/g, ''),
      active: 1,
      plan: 'free',
      business_hours: {
        enabled: false,
        timezone: 'America/Bogota',
        schedule: {
          '1': { open: true, from: '08:00', to: '18:00' },
          '2': { open: true, from: '08:00', to: '18:00' },
          '3': { open: true, from: '08:00', to: '18:00' },
          '4': { open: true, from: '08:00', to: '18:00' },
          '5': { open: true, from: '08:00', to: '18:00' },
          '6': { open: false, from: '08:00', to: '13:00' },
          '0': { open: false, from: '08:00', to: '18:00' },
        },
        closed_message: 'Hola 👋 En este momento estamos fuera de horario de atención. Te responderemos a la brevedad. ¡Gracias por tu paciencia!',
      },
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creando empresa:', error.message);
    process.exit(1);
  }

  console.log('✅ Empresa creada exitosamente:\n');
  console.log('   ID:', data.id);
  console.log('   Nombre:', data.name);
  console.log('   Teléfono:', data.phone);
  console.log('   Phone Number ID:', data.whatsapp_phone_id);
  console.log('   Token configurado: ✅');
  console.log('   Webhook Token:', data.webhook_verify_token);
  console.log('');
  console.log('🎉 ¡Listo! Recarga el dashboard para ver la empresa.');
  console.log('');
  process.exit(0);
}

createCompany().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
