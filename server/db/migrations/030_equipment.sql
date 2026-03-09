CREATE TABLE IF NOT EXISTS tank_calibration_settings (
  tank_id TEXT PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  calibration_status TEXT NOT NULL DEFAULT 'never',
  last_calibration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tank_calibration_status
  ON tank_calibration_settings (calibration_status);

DROP TRIGGER IF EXISTS trg_tank_calibration_settings_set_updated_at ON tank_calibration_settings;
CREATE TRIGGER trg_tank_calibration_settings_set_updated_at
BEFORE UPDATE ON tank_calibration_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
