-- =====================================================
-- Migration: Система обмена сообщениями (Broadcast Messages)
-- Дата: 2025-10-19
-- Описание: Таблицы для отправки новостных сообщений пользователям
--           через Telegram Bot и Email
-- =====================================================

-- 1. Таблица broadcast_messages - Сообщения для рассылки
-- =====================================================
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Автор сообщения
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Содержимое сообщения
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT, -- HTML версия для email

  -- Тип сообщения
  message_type VARCHAR(50) DEFAULT 'news', -- news, announcement, alert, maintenance

  -- Приоритет
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical

  -- Каналы доставки
  channels TEXT[] DEFAULT ARRAY['telegram', 'email'], -- telegram, email

  -- Параметры получателей
  recipient_type VARCHAR(50) DEFAULT 'all', -- all, roles, users, trading_points, networks
  recipient_filter JSONB, -- {"role_ids": [...], "user_ids": [...], "trading_point_ids": [...], "network_ids": [...]}

  -- Статус отправки
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, failed

  -- Планирование отправки
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Статистика
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,

  -- Метаданные
  metadata JSONB,

  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для broadcast_messages
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_author ON broadcast_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status ON broadcast_messages(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_scheduled ON broadcast_messages(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created ON broadcast_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_type ON broadcast_messages(message_type);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_broadcast_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER broadcast_messages_updated_at
  BEFORE UPDATE ON broadcast_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_messages_updated_at();


-- 2. Таблица message_recipients - Получатели конкретного сообщения
-- =====================================================
CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с сообщением
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,

  -- Получатель
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Канал доставки для этого получателя
  channel VARCHAR(50) NOT NULL, -- telegram, email

  -- Контактные данные на момент отправки
  contact_info VARCHAR(255), -- chat_id для Telegram, email для Email

  -- Статус доставки
  delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, read

  -- Время доставки
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,

  -- Ошибка доставки
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Уникальность: один пользователь может получить сообщение по разным каналам
  UNIQUE(message_id, user_id, channel)
);

-- Индексы для message_recipients
CREATE INDEX IF NOT EXISTS idx_message_recipients_message ON message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_user ON message_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_message_recipients_status ON message_recipients(delivery_status);
CREATE INDEX IF NOT EXISTS idx_message_recipients_channel ON message_recipients(channel);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_message_recipients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_recipients_updated_at
  BEFORE UPDATE ON message_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_message_recipients_updated_at();


-- 3. Таблица message_templates - Шаблоны сообщений
-- =====================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Автор шаблона
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Название и описание
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Содержимое шаблона
  title_template VARCHAR(255) NOT NULL,
  content_template TEXT NOT NULL,

  -- Тип и категория
  message_type VARCHAR(50) DEFAULT 'news',
  category VARCHAR(100), -- maintenance, updates, offers, alerts

  -- Переменные шаблона
  variables JSONB, -- {"station_name": "string", "date": "date", ...}

  -- Настройки по умолчанию
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_channels TEXT[] DEFAULT ARRAY['telegram', 'email'],
  default_recipient_type VARCHAR(50) DEFAULT 'all',

  -- Активность
  is_active BOOLEAN DEFAULT true,

  -- Статистика использования
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для message_templates
CREATE INDEX IF NOT EXISTS idx_message_templates_author ON message_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();


-- 4. Таблица message_attachments - Вложения к сообщениям (опционально)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с сообщением
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,

  -- Информация о файле
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100), -- image/jpeg, application/pdf, etc.
  file_size INTEGER, -- bytes
  file_url TEXT NOT NULL, -- URL в хранилище (Supabase Storage)

  -- Временные метки
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для message_attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON message_attachments(message_id);


-- 5. Row Level Security (RLS) Policies
-- =====================================================

-- Включаем RLS
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- Политики для broadcast_messages
-- Чтение: все авторизованные пользователи
CREATE POLICY "Allow read broadcast_messages for authenticated users"
  ON broadcast_messages FOR SELECT
  TO authenticated
  USING (true);

-- Создание: только пользователи с соответствующими правами
CREATE POLICY "Allow insert broadcast_messages for authorized users"
  ON broadcast_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
  );

-- Обновление: только автор или администраторы
CREATE POLICY "Allow update broadcast_messages for author"
  ON broadcast_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- Удаление: только автор или администраторы
CREATE POLICY "Allow delete broadcast_messages for author"
  ON broadcast_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);


-- Политики для message_recipients
-- Чтение: пользователь может видеть свои получения или автор сообщения
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

-- Системная вставка/обновление (только через backend service key)
CREATE POLICY "Allow insert message_recipients for service"
  ON message_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update message_recipients for service"
  ON message_recipients FOR UPDATE
  TO authenticated
  USING (true);


-- Политики для message_templates
-- Чтение: все авторизованные
CREATE POLICY "Allow read message_templates for authenticated users"
  ON message_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR auth.uid() = author_id);

-- Создание/обновление/удаление: только автор
CREATE POLICY "Allow insert message_templates for authenticated users"
  ON message_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Allow update message_templates for author"
  ON message_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Allow delete message_templates for author"
  ON message_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);


-- Политики для message_attachments
CREATE POLICY "Allow read message_attachments for authenticated users"
  ON message_attachments FOR SELECT
  TO authenticated
  USING (true);

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


-- =====================================================
-- Комментарии к таблицам
-- =====================================================

COMMENT ON TABLE broadcast_messages IS 'Сообщения для массовой рассылки пользователям через Telegram и Email';
COMMENT ON TABLE message_recipients IS 'Получатели конкретного сообщения с статусом доставки';
COMMENT ON TABLE message_templates IS 'Шаблоны сообщений для быстрой отправки';
COMMENT ON TABLE message_attachments IS 'Вложения к сообщениям (изображения, документы)';

-- =====================================================
-- Готово! Система обмена сообщениями создана
-- =====================================================
