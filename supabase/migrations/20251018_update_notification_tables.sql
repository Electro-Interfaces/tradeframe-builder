-- ============================================================================
-- ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ТАБЛИЦ СИСТЕМЫ УВЕДОМЛЕНИЙ
-- ============================================================================
-- Добавляет недостающие колонки в существующие таблицы

-- ============================================================================
-- 1. ОБНОВЛЕНИЕ user_notification_settings
-- ============================================================================

-- Добавляем недостающие колонки
ALTER TABLE user_notification_settings
  ADD COLUMN IF NOT EXISTS dnd_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS dnd_start TIME DEFAULT '22:00:00',
  ADD COLUMN IF NOT EXISTS dnd_end TIME DEFAULT '08:00:00';

-- Индексы (если ещё не созданы)
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id
  ON user_notification_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_telegram_chat_id
  ON user_notification_settings(telegram_chat_id)
  WHERE telegram_verified = true;

-- ============================================================================
-- 2. СОЗДАНИЕ user_notification_subscriptions (если не существует)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность комбинации пользователь + тип
  CONSTRAINT user_notification_subscriptions_unique UNIQUE (user_id, notification_type)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_notification_subscriptions_user_id
  ON user_notification_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_subscriptions_type
  ON user_notification_subscriptions(notification_type)
  WHERE enabled = true;

-- Комментарии
COMMENT ON TABLE user_notification_subscriptions IS 'Подписки пользователей на различные типы уведомлений';

-- ============================================================================
-- 3. СОЗДАНИЕ notification_rules (если не существует)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  notification_type VARCHAR(100) NOT NULL,

  -- Условия срабатывания (JSON)
  conditions JSONB NOT NULL DEFAULT '{}',

  -- Приоритет уведомления
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Активность правила
  is_active BOOLEAN DEFAULT true,

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant_id
  ON notification_rules(tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_rules_active
  ON notification_rules(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_rules_type
  ON notification_rules(notification_type);

-- Комментарии
COMMENT ON TABLE notification_rules IS 'Правила для автоматической генерации уведомлений на основе событий системы';

-- ============================================================================
-- 4. СОЗДАНИЕ notifications (если не существует)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  notification_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Статус доставки
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  telegram_sent BOOLEAN DEFAULT false,
  telegram_sent_at TIMESTAMPTZ,

  -- Статус прочтения
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Метаданные
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id
  ON notifications(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, read)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications(notification_type, created_at DESC);

-- Комментарии
COMMENT ON TABLE notifications IS 'Журнал всех отправленных уведомлений';

-- ============================================================================
-- RLS ПОЛИТИКИ
-- ============================================================================

-- user_notification_settings (обновляем политики)
DO $$
BEGIN
  -- Включаем RLS если ещё не включен
  ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Создаём политики (с IF NOT EXISTS через DO блок)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notification_settings'
    AND policyname = 'Users can view their own notification settings'
  ) THEN
    CREATE POLICY "Users can view their own notification settings"
      ON user_notification_settings FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notification_settings'
    AND policyname = 'Users can update their own notification settings'
  ) THEN
    CREATE POLICY "Users can update their own notification settings"
      ON user_notification_settings FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notification_settings'
    AND policyname = 'Users can insert their own notification settings'
  ) THEN
    CREATE POLICY "Users can insert their own notification settings"
      ON user_notification_settings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- user_notification_subscriptions
ALTER TABLE user_notification_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notification_subscriptions'
    AND policyname = 'Users can view their own subscriptions'
  ) THEN
    CREATE POLICY "Users can view their own subscriptions"
      ON user_notification_subscriptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_notification_subscriptions'
    AND policyname = 'Users can manage their own subscriptions'
  ) THEN
    CREATE POLICY "Users can manage their own subscriptions"
      ON user_notification_subscriptions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- notification_rules
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notification_rules'
    AND policyname = 'Users can view notification rules for their tenant'
  ) THEN
    CREATE POLICY "Users can view notification rules for their tenant"
      ON notification_rules FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Users can view their own notifications'
  ) THEN
    CREATE POLICY "Users can view their own notifications"
      ON notifications FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Users can update their own notifications'
  ) THEN
    CREATE POLICY "Users can update their own notifications"
      ON notifications FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================================
-- ТРИГГЕРЫ
-- ============================================================================

-- Функция для updated_at (если не существует)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления updated_at
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_subscriptions_updated_at ON user_notification_subscriptions;
CREATE TRIGGER update_user_notification_subscriptions_updated_at
  BEFORE UPDATE ON user_notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_rules_updated_at ON notification_rules;
CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ДЕФОЛТНЫЕ ПОДПИСКИ ДЛЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_notification_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаём настройки уведомлений (если не существуют)
  INSERT INTO user_notification_settings (user_id, email_address)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Создаём дефолтные подписки
  INSERT INTO user_notification_subscriptions (user_id, notification_type, enabled)
  VALUES
    (NEW.id, 'bill_acceptor_threshold', true),
    (NEW.id, 'equipment_offline', true),
    (NEW.id, 'low_fuel_level', true),
    (NEW.id, 'shift_not_closed', false)
  ON CONFLICT (user_id, notification_type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания настроек при регистрации пользователя
DROP TRIGGER IF EXISTS create_user_notification_settings_trigger ON users;
CREATE TRIGGER create_user_notification_settings_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_subscriptions();
