CREATE TABLE IF NOT EXISTS nomenclature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  internal_code TEXT NOT NULL,
  network_api_code TEXT,
  network_api_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nomenclature_network_internal_code_unique
  ON nomenclature (network_id, lower(internal_code))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nomenclature_network_id
  ON nomenclature (network_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_status
  ON nomenclature (status);

CREATE INDEX IF NOT EXISTS idx_nomenclature_name
  ON nomenclature (lower(name));

CREATE TABLE IF NOT EXISTS nomenclature_external_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomenclature_id UUID NOT NULL REFERENCES nomenclature(id) ON DELETE CASCADE,
  system_type TEXT NOT NULL,
  external_code TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nomenclature_external_codes_unique
  ON nomenclature_external_codes (nomenclature_id, lower(system_type), external_code);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_nomenclature_id
  ON nomenclature_external_codes (nomenclature_id);

CREATE INDEX IF NOT EXISTS idx_nomenclature_external_codes_system_type
  ON nomenclature_external_codes (lower(system_type));

DROP TRIGGER IF EXISTS trg_nomenclature_set_updated_at ON nomenclature;
CREATE TRIGGER trg_nomenclature_set_updated_at
BEFORE UPDATE ON nomenclature
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nomenclature_external_codes_set_updated_at ON nomenclature_external_codes;
CREATE TRIGGER trg_nomenclature_external_codes_set_updated_at
BEFORE UPDATE ON nomenclature_external_codes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
