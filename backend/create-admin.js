require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./src/supabase');

async function createAdmin() {
  try {
    console.log('🔍 Verificando conexión con Supabase...');

    // Verificar si existe el usuario admin
    const { data: existingAdmin, error: selectError } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('username', 'admin')
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('❌ Error al consultar Supabase:', selectError.message);
      return;
    }

    if (existingAdmin) {
      console.log('✅ Usuario admin ya existe:');
      console.log('   ID:', existingAdmin.id);
      console.log('   Username:', existingAdmin.username);
      console.log('   Role:', existingAdmin.role);
      console.log('\n🔄 Actualizando contraseña a: admin123');

      const hashed = await bcrypt.hash('admin123', 10);
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashed, active: true })
        .eq('id', existingAdmin.id);

      if (updateError) {
        console.error('❌ Error actualizando:', updateError.message);
      } else {
        console.log('✅ Contraseña actualizada correctamente');
        console.log('\n📝 Puedes hacer login con:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
      }
    } else {
      console.log('📝 Usuario admin no existe, creando...');

      const hashed = await bcrypt.hash('admin123', 10);
      const { data: newAdmin, error: insertError } = await supabase
        .from('users')
        .insert({
          username: 'admin',
          password: hashed,
          role: 'super_admin',
          active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creando admin:', insertError.message);
      } else {
        console.log('✅ Usuario admin creado correctamente:');
        console.log('   ID:', newAdmin.id);
        console.log('   Username:', newAdmin.username);
        console.log('   Role:', newAdmin.role);
        console.log('\n📝 Puedes hacer login con:');
        console.log('   Usuario: admin');
        console.log('   Contraseña: admin123');
      }
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
    console.error(err);
  }
}

createAdmin();
