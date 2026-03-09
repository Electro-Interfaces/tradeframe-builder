CREATE TABLE IF NOT EXISTS broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  message_type TEXT NOT NULL DEFAULT 'news',
  priority TEXT NOT NULL DEFAULT 'medium',
  channels TEXT[] NOT NULL DEFAULT ARRAY['telegram', 'email']::TEXT[],
  recipient_type TEXT NOT NULL DEFAULT 'all',
  recipient_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_author_id
  ON broadcast_messages (author_id);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_status
  ON broadcast_messages (status);

CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created_at
  ON broadcast_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  contact_info TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_message_recipients_message_id
  ON message_recipients (message_id);

CREATE INDEX IF NOT EXISTS idx_message_recipients_user_id
  ON message_recipients (user_id);

CREATE INDEX IF NOT EXISTS idx_message_recipients_delivery_status
  ON message_recipients (delivery_status);

CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  title_template TEXT NOT NULL,
  content_template TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'news',
  category TEXT,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_priority TEXT NOT NULL DEFAULT 'medium',
  default_channels TEXT[] NOT NULL DEFAULT ARRAY['telegram', 'email']::TEXT[],
  default_recipient_type TEXT NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_author_id
  ON message_templates (author_id);

CREATE INDEX IF NOT EXISTS idx_message_templates_is_active
  ON message_templates (is_active);

CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id
  ON message_attachments (message_id);

DROP TRIGGER IF EXISTS trg_broadcast_messages_set_updated_at ON broadcast_messages;
CREATE TRIGGER trg_broadcast_messages_set_updated_at
BEFORE UPDATE ON broadcast_messages
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_message_recipients_set_updated_at ON message_recipients;
CREATE TRIGGER trg_message_recipients_set_updated_at
BEFORE UPDATE ON message_recipients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_message_templates_set_updated_at ON message_templates;
CREATE TRIGGER trg_message_templates_set_updated_at
BEFORE UPDATE ON message_templates
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
