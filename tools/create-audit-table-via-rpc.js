/**
 * Создание таблицы audit_log через RPC функцию
 */

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

// Сначала создадим RPC функцию для выполнения миграции
const createMigrationFunction = `
CREATE OR REPLACE FUNCTION apply_audit_log_migration()
RETURNS TEXT AS $$
BEGIN
  -- Создаем таблицу
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

  -- Удаляем старые политики если есть
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

  RETURN 'Миграция успешно применена!';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Ошибка: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function createAndExecuteRPC() {
  console.log('🚀 Применяем миграцию audit_log через RPC...\n');

  try {
    // 1. Сначала попробуем вызвать уже существующую функцию (если она есть)
    console.log('📝 Попытка вызвать функцию apply_audit_log_migration...');

    const execResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/apply_audit_log_migration`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (execResponse.ok) {
      const result = await execResponse.text();
      console.log('✅ Результат:', result);

      // Проверяем таблицу
      console.log('\n🔍 Проверяем таблицу audit_log...');
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
        console.log('✅ Таблица audit_log успешно создана!\n');
        return true;
      }
    } else {
      const error = await execResponse.text();
      console.log('❌ Функция не найдена или ошибка:', error);
      console.log('\n⚠️  Необходимо создать функцию apply_audit_log_migration в Supabase\n');
    }

    // 2. Если функции нет, показываем инструкцию
    console.log('📋 Для применения миграции выполните следующее:\n');
    console.log('1. Откройте Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/sql/new\n');
    console.log('2. Выполните следующий SQL:\n');
    console.log(createMigrationFunction);
    console.log('\n3. Затем вызовите функцию:');
    console.log('   SELECT apply_audit_log_migration();\n');

    return false;

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    return false;
  }
}

createAndExecuteRPC();
