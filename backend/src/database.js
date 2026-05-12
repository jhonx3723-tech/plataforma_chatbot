const bcrypt = require('bcryptjs');
const supabase = require('./supabase');

async function initDB() {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (error) {
      console.error('Error conectando a Supabase:', error.message);
      console.error('Verifica que las tablas estén creadas en Supabase.');
      return;
    }

    if (!admins || admins.length === 0) {
      const hashed = await bcrypt.hash('admin123', 10);
      await supabase.from('users').insert({
        username: 'admin',
        password: hashed,
        role:     'super_admin',
        active:   true,
      });
      console.log('Usuario admin creado — usuario: admin | contraseña: admin123');
    }

    console.log('Conectado a Supabase correctamente ✓');
  } catch (err) {
    console.error('Error en initDB:', err.message);
  }
}

module.exports = { initDB };
