/**
 * Скрипт для применения миграции системы сообщений
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './server/.env' });

// Конфигурация Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function applyMessagingMigration() {
  const migrationFile = path.join(__dirname, 'supabase', 'migrations', '20251019_create_messaging_system.sql');

  try {
    const sql = fs.readFileSync(migrationFile, 'utf8');

    // Выполняем миграцию напрямую через Postgres
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      // Если нет функции exec_sql, пробуем выполнить через REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    console.log('✅ Миграция системы сообщений успешно применена!');
    console.log('\nСозданные таблицы:');
    console.log('  - broadcast_messages (сообщения для рассылки)');
    console.log('  - message_recipients (получатели сообщений)');
    console.log('  - message_templates (шаблоны сообщений)');
    console.log('  - message_attachments (вложения)');

  } catch (error) {
    console.error('❌ Ошибка применения миграции:', error.message);
    console.error('\n⚠️ Вручную примените миграцию через Supabase SQL Editor:');
    console.error(`   Файл: ${migrationFile}`);
    process.exit(1);
  }
}

applyMessagingMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
