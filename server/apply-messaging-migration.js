/**
 * Скрипт для применения миграции системы сообщений
 * Запуск: node server/apply-messaging-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function checkTablesExist() {
  const tables = ['broadcast_messages', 'message_recipients', 'message_templates', 'message_attachments'];

  console.log('\n🔍 Проверка существующих таблиц...\n');

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ⚪ ${table} - не существует`);
    } else {
      console.log(`   ✅ ${table} - существует (записей: ${count || 0})`);
    }
  }
}

async function applyMigration() {
  console.log('📦 Применение миграции системы сообщений...\n');

  const migrationFile = path.join(__dirname, '..', 'supabase', 'migrations', '20251019_create_messaging_system.sql');

  if (!fs.existsSync(migrationFile)) {
    console.error(`❌ Файл миграции не найден: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Разбиваем SQL на отдельные команды по точке с запятой
  const statements = sql
    .split(/;[\r\n]+/)
    .map(s => s.trim())
    .filter(s => {
      // Убираем комментарии и пустые строки
      if (!s || s.length === 0) return false;
      if (s.startsWith('--')) return false;
      if (s.startsWith('/*') && s.endsWith('*/')) return false;
      return true;
    });

  console.log(`📋 SQL команд для выполнения: ${statements.length}\n`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    // Показываем первые 60 символов
    const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
    process.stdout.write(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      // Используем прямой SQL запрос через REST API
      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        console.log(' ❌');
        errorCount++;
        errors.push({ statement: preview, error: error.message });
      } else {
        console.log(' ✅');
        successCount++;
      }
    } catch (err) {
      console.log(' ❌');
      errorCount++;
      errors.push({ statement: preview, error: err.message });
    }

    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 Результаты:`);
  console.log(`   ✅ Успешно: ${successCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ Ошибки:`);
    errors.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.statement}`);
      console.log(`      ${e.error}`);
    });
  }

  if (errorCount === 0) {
    console.log(`\n🎉 Миграция применена успешно!\n`);
  } else {
    console.log(`\n⚠️ Применение миграции с ошибками. Проверьте результаты выше.`);
    console.log(`\n💡 Совет: Примените миграцию вручную через Supabase Dashboard:`);
    console.log(`   SQL Editor → New Query → Вставьте содержимое файла:`);
    console.log(`   ${migrationFile}\n`);
  }

  await checkTablesExist();
}

applyMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Критическая ошибка:', err);
    process.exit(1);
  });
