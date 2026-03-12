CREATE TABLE IF NOT EXISTS tank_calibration_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived')),
  table_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  analysis_start_date DATE NOT NULL,
  analysis_end_date DATE NOT NULL,
  calibration_settings_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  statistics JSONB,
  diagnostics JSONB,
  comparison_with_previous JSONB,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  creation_notes TEXT NOT NULL DEFAULT '',
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT NOT NULL DEFAULT '',
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT NOT NULL DEFAULT '',
  applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tank_id, version),
  CHECK (analysis_end_date >= analysis_start_date)
);

CREATE INDEX IF NOT EXISTS idx_tank_calibration_tables_tank_id
  ON tank_calibration_tables (tank_id);

CREATE INDEX IF NOT EXISTS idx_tank_calibration_tables_status
  ON tank_calibration_tables (status);

CREATE INDEX IF NOT EXISTS idx_tank_calibration_tables_created_at
  ON tank_calibration_tables (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tank_calibration_tables_active_unique
  ON tank_calibration_tables (tank_id)
  WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_tank_calibration_tables_set_updated_at ON tank_calibration_tables;
CREATE TRIGGER trg_tank_calibration_tables_set_updated_at
BEFORE UPDATE ON tank_calibration_tables
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
