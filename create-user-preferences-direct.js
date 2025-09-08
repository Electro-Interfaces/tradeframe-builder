import { Client } from 'pg';
import fs from 'fs';

const client = new Client({
  connectionString: 'postgresql://postgres.tohtryzyffcebtyvkxwh:AQm2022bT3i5Gk35@aws-0-eu-central-1.pooler.supabase.com:6543/postgres'
});

async function createUserPreferencesTable() {
  try {
    await client.connect();
    console.log('📊 Подключились к PostgreSQL...');
    
    // Читаем SQL из файла
    const sql = fs.readFileSync('./create-user-preferences-table.sql', 'utf8');
    
    console.log('🔄 Выполняем создание таблицы user_preferences...');
    const result = await client.query(sql);
    
    console.log('✅ Таблица user_preferences создана успешно!');
    console.log('📋 Результат:', result);
    
    // Проверим что таблица создалась
    const checkTable = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_preferences' 
      ORDER BY ordinal_position;
    `);
    
    console.log('🔍 Структура таблицы user_preferences:');
    console.table(checkTable.rows);
    
    // Проверим индексы
    const checkIndexes = await client.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'user_preferences';
    `);
    
    console.log('📇 Индексы таблицы user_preferences:');
    console.table(checkIndexes.rows);
    
  } catch (error) {
    console.error('❌ Ошибка при создании таблицы:', error);
  } finally {
    await client.end();
    console.log('🔌 Соединение с БД закрыто');
  }
}

createUserPreferencesTable();