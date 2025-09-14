import { supabaseService as supabase } from './src/services/supabaseServiceClient.js';

async function listAllTables() {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      console.log('Error:', error);
      return;
    }

    console.log('Таблицы в базе данных:');
    data.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
  } catch (err) {
    console.log('Запрос не удался, используем прямой запрос');
    
    // Альтернативный способ
    const { data, error } = await supabase.rpc('get_table_names');
    if (data) {
      console.log('Tables:', data);
    } else {
      // Используем список таблиц из сервиса
      const tables = ['equipment_templates', 'equipment', 'networks', 'trading_points', 'operations', 'nomenclature', 'users', 'fuel_types'];
      
      console.log('Известные таблицы из предыдущих тестов:');
      tables.forEach(table => {
        console.log(`- ${table}`);
      });
    }
  }
  
  process.exit(0);
}

listAllTables();