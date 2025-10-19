-- Упрощенная версия миграции для быстрого применения через Supabase SQL Editor
-- Скопируйте и вставьте в Supabase Dashboard → SQL Editor

-- 1. Таблица broadcast_messages
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

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_author ON broadcast_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created ON broadcast_messages(created_at DESC);

-- 2. Таблица message_recipients
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

CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(user_id);

-- 3. Таблица message_templates
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

CREATE INDEX IF NOT EXISTS idx_message_templates_author ON message_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);

-- 4. Таблица message_attachments
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);

-- 5. RLS Policies
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Политики для broadcast_messages (все пользователи могут читать)
DROP POLICY IF EXISTS "Allow read broadcast_messages for authenticated users" ON broadcast_messages;
CREATE POLICY "Allow read broadcast_messages for authenticated users"
  ON broadcast_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert broadcast_messages for authorized users" ON broadcast_messages;
CREATE POLICY "Allow insert broadcast_messages for authorized users"
  ON broadcast_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow update broadcast_messages for author" ON broadcast_messages;
CREATE POLICY "Allow update broadcast_messages for author"
  ON broadcast_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow delete broadcast_messages for author" ON broadcast_messages;
CREATE POLICY "Allow delete broadcast_messages for author"
  ON broadcast_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Политики для message_recipients
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

DROP POLICY IF EXISTS "Allow insert message_recipients for service" ON message_recipients;
CREATE POLICY "Allow insert message_recipients for service"
  ON message_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update message_recipients for service" ON message_recipients;
CREATE POLICY "Allow update message_recipients for service"
  ON message_recipients FOR UPDATE
  TO authenticated
  USING (true);

-- Политики для message_templates
DROP POLICY IF EXISTS "Allow read message_templates for authenticated users" ON message_templates;
CREATE POLICY "Allow read message_templates for authenticated users"
  ON message_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow insert message_templates for authenticated users" ON message_templates;
CREATE POLICY "Allow insert message_templates for authenticated users"
  ON message_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow update message_templates for author" ON message_templates;
CREATE POLICY "Allow update message_templates for author"
  ON message_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Allow delete message_templates for author" ON message_templates;
CREATE POLICY "Allow delete message_templates for author"
  ON message_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Политики для message_attachments
DROP POLICY IF EXISTS "Allow read message_attachments for authenticated users" ON message_attachments;
CREATE POLICY "Allow read message_attachments for authenticated users"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (true);

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

-- Готово!
SELECT 'Migration completed successfully!' as status;
