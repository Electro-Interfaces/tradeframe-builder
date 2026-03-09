CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  direct_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  pwd_salt TEXT NOT NULL DEFAULT '',
  pwd_hash TEXT NOT NULL DEFAULT '',
  last_login TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users (lower(email));

CREATE INDEX IF NOT EXISTS idx_users_tenant_id
  ON users (tenant_id);

CREATE INDEX IF NOT EXISTS idx_users_status
  ON users (status);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at
  ON users (deleted_at);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'network', 'trading_point', 'assigned')),
  scope_values TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_code_unique
  ON roles (lower(code));

CREATE INDEX IF NOT EXISTS idx_roles_tenant_id
  ON roles (tenant_id);

CREATE INDEX IF NOT EXISTS idx_roles_is_active
  ON roles (is_active);

CREATE INDEX IF NOT EXISTS idx_roles_deleted_at
  ON roles (deleted_at);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  scope_value TEXT NOT NULL DEFAULT '',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, role_id, scope_value)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id
  ON user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_id
  ON user_roles (role_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_is_active
  ON user_roles (is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_deleted_at
  ON user_roles (deleted_at);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_hash_unique
  ON refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
  ON refresh_tokens (expires_at);

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON roles;
CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
