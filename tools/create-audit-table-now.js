/**
 * Создание таблицы audit_log напрямую через Supabase
 * Использует прямое выполнение SQL через fetch API
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

// SQL для создания таблицы (один большой запрос)
const SQL = `
-- Создаем таблицу audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID,
  user_email TEXT NOT NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  object TEXT,
  object_type TEXT,
  object_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_action_type CHECK (action_type IN (
    'price_change', 'user_management', 'equipment_management',
    'authentication', 'network_settings', 'reports',
    'system_maintenance', 'legal_documents', 'data_migration', 'api_config'
  ))
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_email ON audit_log(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_object_type ON audit_log(object_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_object_id ON audit_log(object_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_details ON audit_log USING gin(details);
CREATE INDEX IF NOT EXISTS idx_audit_log_metadata ON audit_log USING gin(metadata);

-- Включаем RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Система может создавать записи аудита" ON audit_log;
DROP POLICY IF EXISTS "Пользователи могут читать свои записи аудита" ON audit_log;
DROP POLICY IF EXISTS "Service role читает все записи" ON audit_log;

-- Создаем политики
CREATE POLICY "Система может создавать записи аудита"
  ON audit_log FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Пользователи могут читать свои записи аудита"
  ON audit_log FOR SELECT TO authenticated
  USING (user_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Service role читает все записи"
  ON audit_log FOR SELECT TO service_role USING (true);
`;

async function createTable() {
  console.log('🚀 Создаю таблицу audit_log...\n');

  try {
    // 1. Проверяем, существует ли таблица
    console.log('🔍 Проверяю существующую таблицу...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?limit=1`,
      {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      console.log('✅ Таблица audit_log уже существует!');
      const countResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/audit_log?select=count`,
        {
          headers: {
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Prefer': 'count=exact'
          }
        }
      );
      const count = countResponse.headers.get('content-range')?.split('/')[1] || '0';
      console.log(`📊 В таблице ${count} записей\n`);
      return true;
    }

    console.log('❌ Таблица не существует, создаю...\n');

    // 2. Читаем полный SQL из файла
    const sqlPath = join(__dirname, '..', 'migrations', 'create-audit-log-table.sql');
    const fullSQL = readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL файл прочитан');
    console.log(`📏 Размер: ${fullSQL.length} символов\n`);

    // 3. Показываем инструкцию
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  REST API не поддерживает выполнение DDL команд');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Для создания таблицы выполните следующие шаги:\n');
    console.log('1️⃣  Откройте Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/sql/new\n');

    console.log('2️⃣  Скопируйте весь SQL из файла:');
    console.log(`   ${sqlPath}\n`);

    console.log('3️⃣  Вставьте в SQL Editor и нажмите Run (Ctrl+Enter)\n');

    console.log('4️⃣  После выполнения запустите этот скрипт снова для проверки\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Открываем файл SQL в блокноте для удобства
    console.log('📝 Открываю SQL файл в блокноте...');
    const { exec } = await import('child_process');
    exec(`notepad "${sqlPath}"`);

    console.log('✅ Файл открыт\n');

    return false;

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

createTable();
