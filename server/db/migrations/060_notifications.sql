CREATE TABLE IF NOT EXISTS user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  email_address TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  telegram_chat_id TEXT,
  telegram_username TEXT,
  telegram_verified BOOLEAN NOT NULL DEFAULT false,
  telegram_enabled BOOLEAN NOT NULL DEFAULT false,
  dnd_enabled BOOLEAN NOT NULL DEFAULT false,
  dnd_start TEXT,
  dnd_end TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id
  ON user_notification_settings (user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_telegram_chat_id
  ON user_notification_settings (telegram_chat_id);

CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT ARRAY['telegram']::TEXT[],
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_subscriptions_user_id
  ON user_notification_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_notification_subscriptions_type
  ON user_notification_subscriptions (notification_type);

CREATE TABLE IF NOT EXISTS role_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT ARRAY['telegram']::TEXT[],
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_role_notification_subscriptions_role_id
  ON role_notification_subscriptions (role_id);

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user_id
  ON telegram_link_codes (user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code
  ON telegram_link_codes (code);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires_at
  ON telegram_link_codes (expires_at);

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_type TEXT NOT NULL DEFAULT 'cron',
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '{"roles":[],"users":[]}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_check_at TIMESTAMPTZ,
  last_notification_at TIMESTAMPTZ,
  total_notifications_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_tenant_id
  ON notification_rules (tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_rules_type
  ON notification_rules (type);

CREATE INDEX IF NOT EXISTS idx_notification_rules_is_active
  ON notification_rules (is_active);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  rule_id UUID REFERENCES notification_rules(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  channels TEXT[] NOT NULL DEFAULT ARRAY['telegram']::TEXT[],
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id
  ON notifications (tenant_id);

CREATE INDEX IF NOT EXISTS idx_notifications_rule_id
  ON notifications (rule_id);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications (status);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id
  ON notification_delivery_log (notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_user_id
  ON notification_delivery_log (user_id);

DROP TRIGGER IF EXISTS trg_user_notification_settings_set_updated_at ON user_notification_settings;
CREATE TRIGGER trg_user_notification_settings_set_updated_at
BEFORE UPDATE ON user_notification_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_notification_subscriptions_set_updated_at ON user_notification_subscriptions;
CREATE TRIGGER trg_user_notification_subscriptions_set_updated_at
BEFORE UPDATE ON user_notification_subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_role_notification_subscriptions_set_updated_at ON role_notification_subscriptions;
CREATE TRIGGER trg_role_notification_subscriptions_set_updated_at
BEFORE UPDATE ON role_notification_subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_telegram_link_codes_set_updated_at ON telegram_link_codes;
CREATE TRIGGER trg_telegram_link_codes_set_updated_at
BEFORE UPDATE ON telegram_link_codes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notification_rules_set_updated_at ON notification_rules;
CREATE TRIGGER trg_notification_rules_set_updated_at
BEFORE UPDATE ON notification_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_notifications_set_updated_at ON notifications;
CREATE TRIGGER trg_notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
