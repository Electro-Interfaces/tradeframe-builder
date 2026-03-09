CREATE TABLE IF NOT EXISTS networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  code TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  network_type TEXT NOT NULL DEFAULT 'АЗС',
  source_type TEXT NOT NULL DEFAULT 'network',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_networks_code_unique
  ON networks (lower(code));

CREATE INDEX IF NOT EXISTS idx_networks_external_id
  ON networks (external_id);

CREATE INDEX IF NOT EXISTS idx_networks_tenant_id
  ON networks (tenant_id);

CREATE INDEX IF NOT EXISTS idx_networks_is_active
  ON networks (is_active);

CREATE TABLE IF NOT EXISTS trading_points (
  id TEXT PRIMARY KEY,
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0,
  region TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  block_reason TEXT NOT NULL DEFAULT '',
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  services JSONB NOT NULL DEFAULT '{}'::jsonb,
  bill_acceptor_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  fuel_level_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (network_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trading_points_network_external_id_unique
  ON trading_points (network_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trading_points_network_id
  ON trading_points (network_id);

CREATE INDEX IF NOT EXISTS idx_trading_points_is_active
  ON trading_points (is_active);

CREATE INDEX IF NOT EXISTS idx_trading_points_is_blocked
  ON trading_points (is_blocked);

CREATE TABLE IF NOT EXISTS trading_point_external_codes (
  id TEXT PRIMARY KEY,
  trading_point_id TEXT NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
  system TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tp_external_codes_unique
  ON trading_point_external_codes (trading_point_id, lower(system), code);

CREATE INDEX IF NOT EXISTS idx_tp_external_codes_system
  ON trading_point_external_codes (lower(system));

CREATE INDEX IF NOT EXISTS idx_tp_external_codes_code
  ON trading_point_external_codes (code);

DROP TRIGGER IF EXISTS trg_networks_set_updated_at ON networks;
CREATE TRIGGER trg_networks_set_updated_at
BEFORE UPDATE ON networks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_trading_points_set_updated_at ON trading_points;
CREATE TRIGGER trg_trading_points_set_updated_at
BEFORE UPDATE ON trading_points
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
