-- ============================================
-- Миграция: Система уведомлений
-- Версия: 1.0
-- Дата: 2025-10-18
-- ============================================

-- ============================================
-- 1. Таблица правил уведомлений
-- ============================================
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Основная информация
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Конфигурация правила (JSON)
  rule_config JSONB NOT NULL DEFAULT '{}',

  -- Расписание проверки
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'cron',
  schedule_config JSONB NOT NULL DEFAULT '{}',

  -- Настройки уведомлений
  notification_config JSONB NOT NULL DEFAULT '{}',

  -- Получатели
  recipients JSONB NOT NULL DEFAULT '{}',

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Статистика
  last_check_at TIMESTAMPTZ,
  last_notification_at TIMESTAMPTZ,
  total_notifications_sent INTEGER DEFAULT 0
);

-- Индексы для быстрого поиска
CREATE INDEX idx_notification_rules_tenant ON notification_rules(tenant_id);
CREATE INDEX idx_notification_rules_type ON notification_rules(type);
CREATE INDEX idx_notification_rules_active ON notification_rules(is_active);
CREATE INDEX idx_notification_rules_tenant_type ON notification_rules(tenant_id, type, is_active);

-- Комментарии
COMMENT ON TABLE notification_rules IS 'Правила автоматических уведомлений';
COMMENT ON COLUMN notification_rules.rule_config IS 'Конфигурация правила: checkType, warningLevel, applyToAllStations, specificStations';
COMMENT ON COLUMN notification_rules.schedule_config IS 'Настройки расписания: cron, interval, realtime';
COMMENT ON COLUMN notification_rules.notification_config IS 'Настройки отправки: channels, priority, groupByStation, suppressDuplicates';
COMMENT ON COLUMN notification_rules.recipients IS 'Получатели: roles, users, filterByStation';

-- ============================================
-- 2. Таблица уведомлений
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,

  -- Информация об уведомлении
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL,

  -- Контекст (данные для отображения)
  context JSONB DEFAULT '{}',

  -- Статус
  status VARCHAR(20) DEFAULT 'pending',

  -- Доставка
  channels JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_rule ON notifications(rule_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_tenant_status ON notifications(tenant_id, status);

-- Комментарии
COMMENT ON TABLE notifications IS 'Сгенерированные уведомления';
COMMENT ON COLUMN notifications.context IS 'Контекст: stationCode, stationName, billCount, threshold, level и т.д.';
COMMENT ON COLUMN notifications.status IS 'pending, sent, read, archived';
COMMENT ON COLUMN notifications.priority IS 'low, medium, high, critical';

-- ============================================
-- 3. Таблица настроек уведомлений пользователя
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Email настройки
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(100),
  email_verification_expires_at TIMESTAMPTZ,

  -- Telegram настройки
  telegram_enabled BOOLEAN DEFAULT false,
  telegram_chat_id VARCHAR(50),
  telegram_username VARCHAR(100),
  telegram_verified BOOLEAN DEFAULT false,
  telegram_link_code VARCHAR(20),
  telegram_link_expires_at TIMESTAMPTZ,

  -- Режим "Не беспокоить"
  do_not_disturb_enabled BOOLEAN DEFAULT false,
  do_not_disturb_start_time TIME DEFAULT '22:00:00',
  do_not_disturb_end_time TIME DEFAULT '08:00:00',
  dnd_allow_critical BOOLEAN DEFAULT true,

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE UNIQUE INDEX idx_user_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX idx_user_notification_settings_telegram_code ON user_notification_settings(telegram_link_code) WHERE telegram_link_code IS NOT NULL;
CREATE INDEX idx_user_notification_settings_telegram_chat ON user_notification_settings(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- Комментарии
COMMENT ON TABLE user_notification_settings IS 'Настройки уведомлений пользователя';
COMMENT ON COLUMN user_notification_settings.telegram_link_code IS 'Временный код для привязки Telegram (срок действия 15 минут)';

-- ============================================
-- 4. Таблица подписок пользователя
-- ============================================
CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Тип события
  notification_type VARCHAR(50) NOT NULL,

  -- Каналы доставки для этого типа
  channels JSONB NOT NULL DEFAULT '["email"]',

  -- Фильтры
  filters JSONB DEFAULT '{}',

  -- Статус
  is_active BOOLEAN DEFAULT true,
  source VARCHAR(20) DEFAULT 'user',

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

-- Индексы
CREATE INDEX idx_user_subscriptions_user ON user_notification_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_type ON user_notification_subscriptions(notification_type);
CREATE INDEX idx_user_subscriptions_active ON user_notification_subscriptions(is_active);
CREATE UNIQUE INDEX idx_user_subscriptions_user_type ON user_notification_subscriptions(user_id, notification_type);

-- Комментарии
COMMENT ON TABLE user_notification_subscriptions IS 'Подписки пользователя на типы уведомлений';
COMMENT ON COLUMN user_notification_subscriptions.source IS 'user - сам подписался, role - унаследовано от роли, admin - назначено админом';
COMMENT ON COLUMN user_notification_subscriptions.filters IS 'Фильтры: priority, stations, networks';

-- ============================================
-- 5. Таблица подписок роли
-- ============================================
CREATE TABLE IF NOT EXISTS role_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Тип события
  notification_type VARCHAR(50) NOT NULL,

  -- Каналы по умолчанию
  default_channels JSONB NOT NULL DEFAULT '["email"]',

  -- Рекомендованные фильтры
  recommended_filters JSONB DEFAULT '{}',

  -- Обязательная подписка
  is_mandatory BOOLEAN DEFAULT false,

  -- Статус
  is_active BOOLEAN DEFAULT true,

  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(role_id, notification_type)
);

-- Индексы
CREATE INDEX idx_role_subscriptions_role ON role_notification_subscriptions(role_id);
CREATE INDEX idx_role_subscriptions_type ON role_notification_subscriptions(notification_type);
CREATE INDEX idx_role_subscriptions_active ON role_notification_subscriptions(is_active);
CREATE UNIQUE INDEX idx_role_subscriptions_role_type ON role_notification_subscriptions(role_id, notification_type);

-- Комментарии
COMMENT ON TABLE role_notification_subscriptions IS 'Настройки уведомлений по умолчанию для роли';
COMMENT ON COLUMN role_notification_subscriptions.is_mandatory IS 'Если true, пользователь не может отключить эту подписку';

-- ============================================
-- 6. Таблица журнала доставки
-- ============================================
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Информация о доставке
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,

  -- Детали
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,

  -- Метаданные (email message ID, telegram message ID и т.д.)
  metadata JSONB DEFAULT '{}'
);

-- Индексы
CREATE INDEX idx_delivery_notification ON notification_delivery_log(notification_id);
CREATE INDEX idx_delivery_user ON notification_delivery_log(user_id);
CREATE INDEX idx_delivery_status ON notification_delivery_log(status);
CREATE INDEX idx_delivery_channel ON notification_delivery_log(channel);
CREATE INDEX idx_delivery_sent_at ON notification_delivery_log(sent_at DESC);

-- Комментарии
COMMENT ON TABLE notification_delivery_log IS 'Журнал доставки уведомлений';
COMMENT ON COLUMN notification_delivery_log.status IS 'sent, delivered, failed, bounced';
COMMENT ON COLUMN notification_delivery_log.metadata IS 'emailMessageId, telegramMessageId, smtpResponse, retryCount';

-- ============================================
-- 7. Row Level Security (RLS)
-- ============================================

-- Включаем RLS на всех таблицах
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Политики для notification_rules (только для админов сети)
CREATE POLICY "notification_rules_select" ON notification_rules
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "notification_rules_insert" ON notification_rules
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      JOIN user_roles ur ON ut.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ut.user_id = auth.uid() AND r.code IN ('admin', 'network_admin')
    )
  );

CREATE POLICY "notification_rules_update" ON notification_rules
  FOR UPDATE USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      JOIN user_roles ur ON ut.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ut.user_id = auth.uid() AND r.code IN ('admin', 'network_admin')
    )
  );

CREATE POLICY "notification_rules_delete" ON notification_rules
  FOR DELETE USING (
    tenant_id IN (
      SELECT ut.tenant_id FROM user_tenants ut
      JOIN user_roles ur ON ut.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE ut.user_id = auth.uid() AND r.code IN ('admin', 'network_admin')
    )
  );

-- Политики для notifications (пользователь видит свои уведомления)
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenants
      WHERE user_id = auth.uid()
    )
  );

-- Политики для user_notification_settings (только свои настройки)
CREATE POLICY "user_settings_select" ON user_notification_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert" ON user_notification_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update" ON user_notification_settings
  FOR UPDATE USING (user_id = auth.uid());

-- Политики для user_notification_subscriptions (только свои подписки)
CREATE POLICY "user_subscriptions_select" ON user_notification_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_subscriptions_insert" ON user_notification_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_subscriptions_update" ON user_notification_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_subscriptions_delete" ON user_notification_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Политики для role_notification_subscriptions (только для админов)
CREATE POLICY "role_subscriptions_select" ON role_notification_subscriptions
  FOR SELECT USING (true); -- Все могут читать настройки ролей

CREATE POLICY "role_subscriptions_insert" ON role_notification_subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.code IN ('admin', 'network_admin')
    )
  );

CREATE POLICY "role_subscriptions_update" ON role_notification_subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() AND r.code IN ('admin', 'network_admin')
    )
  );

-- ============================================
-- 8. Функции и триггеры
-- ============================================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON user_notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_subscriptions_updated_at BEFORE UPDATE ON user_notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_notification_subscriptions_updated_at BEFORE UPDATE ON role_notification_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Миграция завершена
-- ============================================
