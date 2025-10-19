-- Миграция: Система уведомлений (УПРОЩЕННАЯ)
-- Версия: 1.0
-- Дата: 2025-10-18

-- 1. Таблица правил уведомлений
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rule_config JSONB NOT NULL DEFAULT '{}',
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'cron',
  schedule_config JSONB NOT NULL DEFAULT '{}',
  notification_config JSONB NOT NULL DEFAULT '{}',
  recipients JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_check_at TIMESTAMPTZ,
  last_notification_at TIMESTAMPTZ,
  total_notifications_sent INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_rules_type ON notification_rules(type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(is_active);

-- 2. Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,
  context JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending',
  channels JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_rule ON notifications(rule_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 3. Таблица настроек уведомлений пользователя
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(100),
  email_verification_expires_at TIMESTAMPTZ,
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id VARCHAR(50),
  telegram_username VARCHAR(100),
  telegram_verified BOOLEAN DEFAULT false,
  telegram_link_code VARCHAR(20),
  telegram_link_expires_at TIMESTAMPTZ,
  do_not_disturb_enabled BOOLEAN DEFAULT false,
  do_not_disturb_start_time TIME DEFAULT '22:00:00',
  do_not_disturb_end_time TIME DEFAULT '08:00:00',
  dnd_allow_critical BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_settings UNIQUE(user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_telegram_code ON user_notification_settings(telegram_link_code) WHERE telegram_link_code IS NOT NULL;

-- 4. Таблица подписок пользователя
CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  channels JSONB NOT NULL DEFAULT '["email"]',
  filters JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  source VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_subscription UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_type ON user_notification_subscriptions(notification_type);

-- 5. Таблица подписок роли
CREATE TABLE IF NOT EXISTS role_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  default_channels JSONB NOT NULL DEFAULT '["email"]',
  recommended_filters JSONB DEFAULT '{}',
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_role_subscription UNIQUE(role_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_role_subscriptions_role ON role_notification_subscriptions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_subscriptions_type ON role_notification_subscriptions(notification_type);

-- 6. Таблица журнала доставки
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_delivery_notification ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_user ON notification_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON notification_delivery_log(status);

-- 7. Функция автообновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Триггеры
DROP TRIGGER IF EXISTS update_notification_rules_updated_at ON notification_rules;
CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at
  BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_subscriptions_updated_at ON user_notification_subscriptions;
CREATE TRIGGER update_user_notification_subscriptions_updated_at
  BEFORE UPDATE ON user_notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_notification_subscriptions_updated_at ON role_notification_subscriptions;
CREATE TRIGGER update_role_notification_subscriptions_updated_at
  BEFORE UPDATE ON role_notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
