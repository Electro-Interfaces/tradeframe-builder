CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL DEFAULT '',
  user_name TEXT,
  action TEXT NOT NULL,
  action_type TEXT NOT NULL,
  object TEXT,
  object_type TEXT,
  object_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp
  ON audit_log (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
  ON audit_log (action_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id
  ON audit_log (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_email
  ON audit_log (lower(user_email));

CREATE INDEX IF NOT EXISTS idx_audit_log_object_type
  ON audit_log (object_type);

CREATE INDEX IF NOT EXISTS idx_audit_log_object_id
  ON audit_log (object_id);
