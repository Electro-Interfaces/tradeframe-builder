/**
 * Применение миграции audit_log напрямую через Supabase
 */

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

// SQL команды разбитые на отдельные части для выполнения
const sqlCommands = [
  // 1. Создание таблицы
  `CREATE TABLE IF NOT EXISTS audit_log (
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
      'price_change',
      'user_management',
      'equipment_management',
      'authentication',
      'network_settings',
      'reports',
      'system_maintenance',
      'legal_documents',
      'data_migration',
      'api_config'
    ))
  )`,

  // 2. Создание индексов
  `CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_user_email ON audit_log(user_email)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_object_type ON audit_log(object_type)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_object_id ON audit_log(object_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_details ON audit_log USING gin(details)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_log_metadata ON audit_log USING gin(metadata)`,

  // 3. Включение RLS
  `ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY`,

  // 4. Политика для service_role
  `DROP POLICY IF EXISTS "Система может создавать записи аудита" ON audit_log`,
  `CREATE POLICY "Система может создавать записи аудита"
    ON audit_log
    FOR INSERT
    TO service_role
    WITH CHECK (true)`,

  // 5. Политика для authenticated users (чтение своих записей)
  `DROP POLICY IF EXISTS "Пользователи могут читать свои записи аудита" ON audit_log`,
  `CREATE POLICY "Пользователи могут читать свои записи аудита"
    ON audit_log
    FOR SELECT
    TO authenticated
    USING (user_email = current_setting('request.jwt.claims', true)::json->>'email')`,

  // 6. Политика для анонимных пользователей (чтение всех записей через service_role)
  `DROP POLICY IF EXISTS "Service role читает все записи" ON audit_log`,
  `CREATE POLICY "Service role читает все записи"
    ON audit_log
    FOR SELECT
    TO service_role
    USING (true)`
];

async function executeSQL(sql) {
  // Используем RPC для выполнения SQL через pg_exec
  // Но это не сработает, так как PostgREST не поддерживает прямое выполнение DDL

  // Вместо этого попробуем создать таблицу через прямой INSERT
  // Но это тоже не сработает для DDL команд

  console.log('⚠️  PostgREST не поддерживает выполнение DDL команд через REST API');
  console.log('📝 Необходимо использовать Supabase SQL Editor или psql');

  return false;
}

async function applyMigrationDirect() {
  console.log('🚀 Попытка применить миграцию через REST API...\n');

  try {
    // Проверяем доступность Supabase
    console.log('🔌 Проверяем подключение...');
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!testResponse.ok) {
      throw new Error('Не удалось подключиться к Supabase');
    }
    console.log('✅ Подключение успешно\n');

    // Проверяем наличие таблицы
    console.log('🔍 Проверяем таблицу audit_log...');
    const checkResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_log?limit=1`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (checkResponse.ok) {
      console.log('✅ Таблица audit_log уже существует!\n');
      return true;
    }

    console.log('❌ Таблица не существует\n');
    console.log('⚠️  REST API не поддерживает выполнение DDL команд\n');
    console.log('📋 Используйте один из следующих способов:\n');
    console.log('1. Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/sql/new\n');
    console.log('2. psql (командная строка):');
    console.log('   psql "postgresql://postgres:[PASSWORD]@db.ssvazdgnmatbdynkhkqo.supabase.co:5432/postgres"\n');
    console.log('3. Файл миграции находится в:');
    console.log('   migrations/create-audit-log-table.sql\n');

    return false;

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

applyMigrationDirect();
