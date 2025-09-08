/**
 * Создание таблиц для шаблонов команд в Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Конфигурация Supabase
const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.text();
  } catch (error) {
    console.error('❌ SQL execution error:', error.message);
    throw error;
  }
}

async function createCommandTemplatesTables() {
  console.log('🚀 Создание таблиц для шаблонов команд...');

  // Читаем SQL схему
  const schemaPath = path.join(__dirname, 'database', 'command_templates_schema.sql');
  const sqlContent = fs.readFileSync(schemaPath, 'utf8');

  // Разбиваем SQL на отдельные команды (по точке с запятой)
  const sqlCommands = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  console.log(`📝 Найдено ${sqlCommands.length} SQL команд для выполнения`);

  // Выполняем каждую команду отдельно
  for (let i = 0; i < sqlCommands.length; i++) {
    const command = sqlCommands[i];
    if (command.length === 0) continue;

    try {
      console.log(`⚡ Выполняю команду ${i + 1}/${sqlCommands.length}:`);
      console.log(command.substring(0, 80) + '...');
      
      await executeSQL(command);
      console.log('✅ Успешно выполнено');
    } catch (error) {
      console.error(`❌ Ошибка в команде ${i + 1}:`, error.message);
      // Продолжаем выполнение остальных команд
    }
  }

  // Проверяем созданные таблицы
  console.log('\n🔍 Проверка созданных таблиц...');
  
  const tables = ['command_templates', 'api_templates', 'command_executions'];
  for (const table of tables) {
    try {
      const result = await executeSQL(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ Таблица ${table}: готова`);
    } catch (error) {
      console.log(`❌ Таблица ${table}: ${error.message}`);
    }
  }

  console.log('\n🎉 Миграция завершена!');
}

// Запуск
createCommandTemplatesTables().catch(console.error);