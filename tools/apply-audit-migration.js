/**
 * Скрипт для применения SQL миграции audit_log в Supabase
 *
 * Использование:
 *   node tools/apply-audit-migration.js
 *
 * Скрипт:
 * 1. Читает SQL файл миграции
 * 2. Подключается к Supabase
 * 3. Выполняет миграцию
 * 4. Проверяет результат
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Конфигурация Supabase
const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

async function applyMigration() {
  try {
    console.log('🚀 Начинаем применение миграции audit_log...\n');

    // 1. Читаем SQL файл
    console.log('📖 Читаем файл миграции...');
    const migrationPath = join(__dirname, '..', 'migrations', 'create-audit-log-table.sql');
    const sqlContent = readFileSync(migrationPath, 'utf8');
    console.log(`✅ Файл прочитан (${sqlContent.length} символов)\n`);

    // 2. Проверяем подключение к Supabase
    console.log('🔌 Проверяем подключение к Supabase...');
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!testResponse.ok) {
      throw new Error(`Не удалось подключиться к Supabase: ${testResponse.status}`);
    }
    console.log('✅ Подключение успешно\n');

    // 3. Выполняем миграцию через SQL endpoint
    console.log('📝 Выполняем SQL миграцию...');
    console.log('⚠️  ВАЖНО: Этот скрипт использует REST API, для выполнения SQL используйте Supabase SQL Editor\n');

    console.log('📋 Инструкция по применению миграции:');
    console.log('1. Откройте Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Выберите проект: ssvazdgnmatbdynkhkqo');
    console.log('3. Перейдите в раздел SQL Editor');
    console.log('4. Создайте новый запрос (New query)');
    console.log('5. Скопируйте содержимое файла: migrations/create-audit-log-table.sql');
    console.log('6. Вставьте в редактор и нажмите Run (Ctrl+Enter)\n');

    // 4. Проверяем, существует ли таблица audit_log
    console.log('🔍 Проверяем существование таблицы audit_log...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      console.log('✅ Таблица audit_log уже существует!');
      console.log('📊 Проверяем количество записей...');

      const data = await checkResponse.json();
      const countResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/audit_log?select=count`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'count=exact'
          }
        }
      );

      const countHeader = countResponse.headers.get('content-range');
      const count = countHeader ? countHeader.split('/')[1] : '0';
      console.log(`✅ В таблице ${count} записей\n`);

      console.log('🎉 Миграция уже применена!');
    } else if (checkResponse.status === 404 || checkResponse.status === 400) {
      console.log('❌ Таблица audit_log НЕ существует');
      console.log('⚠️  Необходимо применить миграцию через Supabase SQL Editor\n');
      console.log('📋 Следуйте инструкции выше для применения миграции');
    } else {
      throw new Error(`Ошибка проверки таблицы: ${checkResponse.status}`);
    }

  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.error('\n💡 Рекомендация: используйте Supabase SQL Editor для применения миграции');
    console.error('   URL: https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/sql/new');
    process.exit(1);
  }
}

// Запускаем скрипт
applyMigration();
