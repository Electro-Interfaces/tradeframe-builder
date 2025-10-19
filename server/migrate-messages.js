/**
 * Прямое применение миграции системы сообщений через Supabase клиент
 * Запуск: node server/migrate-messages.js
 */

const { createClient } = require('@supabase/supabase-js');
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

async function executeSql(sql, description) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error(`❌ ${description}: ${error.message}`);
      return false;
    }

    console.log(`✅ ${description}`);
    return true;
  } catch (err) {
    console.error(`❌ ${description}: ${err.message}`);
    return false;
  }
}

async function createTables() {
  console.log('\n📦 Создание таблиц...\n');

  // 1. broadcast_messages
  await executeSql(`
    CREATE TABLE IF NOT EXISTS broadcast_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      content_html TEXT,
      message_type VARCHAR(50) DEFAULT 'news',
      priority VARCHAR(20) DEFAULT 'medium',
      channels TEXT[] DEFAULT ARRAY['telegram', 'email'],
      recipient_type VARCHAR(50) DEFAULT 'all',
      recipient_filter JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      scheduled_at TIMESTAMP WITH TIME ZONE,
      sent_at TIMESTAMP WITH TIME ZONE,
      total_recipients INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      delivered_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      read_count INTEGER DEFAULT 0,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `, 'Создана таблица broadcast_messages');

  // 2. message_recipients
  await executeSql(`
    CREATE TABLE IF NOT EXISTS message_recipients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel VARCHAR(50) NOT NULL,
      contact_info VARCHAR(255),
      delivery_status VARCHAR(50) DEFAULT 'pending',
      sent_at TIMESTAMP WITH TIME ZONE,
      delivered_at TIMESTAMP WITH TIME ZONE,
      read_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(message_id, user_id, channel)
    );
  `, 'Создана таблица message_recipients');

  // 3. message_templates
  await executeSql(`
    CREATE TABLE IF NOT EXISTS message_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      title_template VARCHAR(255) NOT NULL,
      content_template TEXT NOT NULL,
      message_type VARCHAR(50) DEFAULT 'news',
      category VARCHAR(100),
      variables JSONB,
      default_priority VARCHAR(20) DEFAULT 'medium',
      default_channels TEXT[] DEFAULT ARRAY['telegram', 'email'],
      default_recipient_type VARCHAR(50) DEFAULT 'all',
      is_active BOOLEAN DEFAULT true,
      usage_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `, 'Создана таблица message_templates');

  // 4. message_attachments
  await executeSql(`
    CREATE TABLE IF NOT EXISTS message_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      file_url TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `, 'Создана таблица message_attachments');
}

async function createIndexes() {
  console.log('\n🔍 Создание индексов...\n');

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_broadcast_messages_author ON broadcast_messages(author_id);',
    'Создан индекс idx_broadcast_messages_author'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);',
    'Создан индекс idx_broadcast_messages_status'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created ON broadcast_messages(created_at DESC);',
    'Создан индекс idx_broadcast_messages_created'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id);',
    'Создан индекс idx_message_recipients_message'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(user_id);',
    'Создан индекс idx_message_recipients_user'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_message_templates_author ON message_templates(author_id);',
    'Создан индекс idx_message_templates_author'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);',
    'Создан индекс idx_message_templates_active'
  );

  await executeSql(
    'CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);',
    'Создан индекс idx_message_attachments_message'
  );
}

async function enableRLS() {
  console.log('\n🔒 Включение Row Level Security...\n');

  await executeSql('ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;', 'RLS включен для broadcast_messages');
  await executeSql('ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;', 'RLS включен для message_recipients');
  await executeSql('ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;', 'RLS включен для message_templates');
  await executeSql('ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;', 'RLS включен для message_attachments');
}

async function createPolicies() {
  console.log('\n🛡️ Создание политик безопасности...\n');

  // Политики для broadcast_messages
  await executeSql(`
    DROP POLICY IF EXISTS "Allow read broadcast_messages for authenticated users" ON broadcast_messages;
    CREATE POLICY "Allow read broadcast_messages for authenticated users"
      ON broadcast_messages FOR SELECT
      TO authenticated
      USING (true);
  `, 'Политика чтения для broadcast_messages');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow insert broadcast_messages for authorized users" ON broadcast_messages;
    CREATE POLICY "Allow insert broadcast_messages for authorized users"
      ON broadcast_messages FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = author_id);
  `, 'Политика вставки для broadcast_messages');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow update broadcast_messages for author" ON broadcast_messages;
    CREATE POLICY "Allow update broadcast_messages for author"
      ON broadcast_messages FOR UPDATE
      TO authenticated
      USING (auth.uid() = author_id);
  `, 'Политика обновления для broadcast_messages');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow delete broadcast_messages for author" ON broadcast_messages;
    CREATE POLICY "Allow delete broadcast_messages for author"
      ON broadcast_messages FOR DELETE
      TO authenticated
      USING (auth.uid() = author_id);
  `, 'Политика удаления для broadcast_messages');

  // Политики для message_recipients
  await executeSql(`
    DROP POLICY IF EXISTS "Allow read message_recipients for user or author" ON message_recipients;
    CREATE POLICY "Allow read message_recipients for user or author"
      ON message_recipients FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR
        EXISTS (
          SELECT 1 FROM broadcast_messages
          WHERE id = message_recipients.message_id
          AND author_id = auth.uid()
        )
      );
  `, 'Политика чтения для message_recipients');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow insert message_recipients for service" ON message_recipients;
    CREATE POLICY "Allow insert message_recipients for service"
      ON message_recipients FOR INSERT
      TO authenticated
      WITH CHECK (true);
  `, 'Политика вставки для message_recipients');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow update message_recipients for service" ON message_recipients;
    CREATE POLICY "Allow update message_recipients for service"
      ON message_recipients FOR UPDATE
      TO authenticated
      USING (true);
  `, 'Политика обновления для message_recipients');

  // Политики для message_templates
  await executeSql(`
    DROP POLICY IF EXISTS "Allow read message_templates for authenticated users" ON message_templates;
    CREATE POLICY "Allow read message_templates for authenticated users"
      ON message_templates FOR SELECT
      TO authenticated
      USING (is_active = true OR auth.uid() = author_id);
  `, 'Политика чтения для message_templates');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow insert message_templates for authenticated users" ON message_templates;
    CREATE POLICY "Allow insert message_templates for authenticated users"
      ON message_templates FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = author_id);
  `, 'Политика вставки для message_templates');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow update message_templates for author" ON message_templates;
    CREATE POLICY "Allow update message_templates for author"
      ON message_templates FOR UPDATE
      TO authenticated
      USING (auth.uid() = author_id);
  `, 'Политика обновления для message_templates');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow delete message_templates for author" ON message_templates;
    CREATE POLICY "Allow delete message_templates for author"
      ON message_templates FOR DELETE
      TO authenticated
      USING (auth.uid() = author_id);
  `, 'Политика удаления для message_templates');

  // Политики для message_attachments
  await executeSql(`
    DROP POLICY IF EXISTS "Allow read message_attachments for authenticated users" ON message_attachments;
    CREATE POLICY "Allow read message_attachments for authenticated users"
      ON message_attachments FOR SELECT
      TO authenticated
      USING (true);
  `, 'Политика чтения для message_attachments');

  await executeSql(`
    DROP POLICY IF EXISTS "Allow insert message_attachments for authenticated users" ON message_attachments;
    CREATE POLICY "Allow insert message_attachments for authenticated users"
      ON message_attachments FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM broadcast_messages
          WHERE id = message_attachments.message_id
          AND author_id = auth.uid()
        )
      );
  `, 'Политика вставки для message_attachments');
}

async function checkTables() {
  console.log('\n✔️ Проверка созданных таблиц...\n');

  const tables = ['broadcast_messages', 'message_recipients', 'message_templates', 'message_attachments'];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ ${table} - ошибка: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} - таблица существует (записей: ${count || 0})`);
    }
  }
}

async function migrate() {
  console.log('🚀 Начало миграции системы сообщений...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);

  try {
    await createTables();
    await createIndexes();
    await enableRLS();
    await createPolicies();
    await checkTables();

    console.log('\n🎉 Миграция успешно завершена!\n');
    console.log('📋 Созданные таблицы:');
    console.log('   • broadcast_messages - сообщения для рассылки');
    console.log('   • message_recipients - получатели сообщений');
    console.log('   • message_templates - шаблоны сообщений');
    console.log('   • message_attachments - вложения\n');

  } catch (error) {
    console.error('\n❌ Критическая ошибка миграции:', error);
    process.exit(1);
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
