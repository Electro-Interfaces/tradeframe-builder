-- ============================================================================
-- СИСТЕМА УВЕДОМЛЕНИЙ ДЛЯ TRADEFRAME BUILDER
-- ============================================================================
-- Создаёт полную структуру таблиц для системы уведомлений пользователей

-- ============================================================================
-- 1. НАСТРОЙКИ УВЕДОМЛЕНИЙ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Email настройки
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),

  -- Telegram настройки
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id VARCHAR(255),
  telegram_username VARCHAR(255),
  telegram_verified BOOLEAN DEFAULT false,

  -- Режим "Не беспокоить"
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start TIME DEFAULT '22:00:00',
  dnd_end TIME DEFAULT '08:00:00',

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность по user_id
  CONSTRAINT user_notification_settings_user_id_key UNIQUE (user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id
  ON user_notification_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_telegram_chat_id
  ON user_notification_settings(telegram_chat_id)
  WHERE telegram_verified = true;

-- Комментарии
COMMENT ON TABLE user_notification_settings IS 'Настройки уведомлений для каждого пользователя';
COMMENT ON COLUMN user_notification_settings.telegram_verified IS 'Флаг подтверждения привязки Telegram аккаунта';
COMMENT ON COLUMN user_notification_settings.dnd_enabled IS 'Включен ли режим "Не беспокоить"';

-- ============================================================================
-- 2. ПОДПИСКИ ПОЛЬЗОВАТЕЛЕЙ НА ТИПЫ СОБЫТИЙ
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
COMMENT ON COLUMN user_notification_subscriptions.notification_type IS 'Тип события: bill_acceptor_threshold, equipment_offline, low_fuel_level, shift_not_closed';

-- ============================================================================
-- 3. ПРАВИЛА УВЕДОМЛЕНИЙ (для системных событий)
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
COMMENT ON COLUMN notification_rules.conditions IS 'JSON с условиями срабатывания правила';

-- ============================================================================
-- 4. ЖУРНАЛ УВЕДОМЛЕНИЙ
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
COMMENT ON COLUMN notifications.metadata IS 'Дополнительные данные о событии, вызвавшем уведомление';

-- ============================================================================
-- RLS (ROW LEVEL SECURITY) ПОЛИТИКИ
-- ============================================================================

-- Настройки уведомлений пользователей
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
  ON user_notification_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
  ON user_notification_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
  ON user_notification_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Подписки пользователей
ALTER TABLE user_notification_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON user_notification_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own subscriptions"
  ON user_notification_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- Правила уведомлений (доступны администраторам тенанта)
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notification rules for their tenant"
  ON notification_rules
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants WHERE user_id = auth.uid()
    )
  );

-- Журнал уведомлений
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- ============================================================================

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления updated_at
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_subscriptions_updated_at
  BEFORE UPDATE ON user_notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ (DEFAULT SUBSCRIPTIONS)
-- ============================================================================

-- Функция для создания дефолтных подписок при создании пользователя
CREATE OR REPLACE FUNCTION create_default_notification_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Создаём настройки уведомлений
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
CREATE TRIGGER create_user_notification_settings_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_subscriptions();

COMMENT ON FUNCTION create_default_notification_subscriptions() IS 'Автоматически создаёт настройки уведомлений и дефолтные подписки для новых пользователей';
