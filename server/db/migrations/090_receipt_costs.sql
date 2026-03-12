-- Себестоимость поступлений нефтепродуктов (закупочные цены по ТТН)
CREATE TABLE IF NOT EXISTS receipt_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Привязка к STS-данным (натуральный ключ)
  system_id INT NOT NULL,
  station_number INT NOT NULL,
  tank_number INT NOT NULL,
  ttn TEXT NOT NULL,
  receipt_dt TEXT NOT NULL,

  -- Топливо
  fuel_code INT NOT NULL DEFAULT 0,
  fuel_name TEXT NOT NULL DEFAULT '',

  -- Себестоимость
  cost_per_liter NUMERIC(12,4) NOT NULL,
  cost_per_kg NUMERIC(12,4),
  input_unit TEXT NOT NULL DEFAULT 'liter' CHECK (input_unit IN ('liter', 'kg')),

  -- Объёмы из ТТН
  volume_liters NUMERIC(12,2) NOT NULL DEFAULT 0,
  density NUMERIC(8,4) NOT NULL DEFAULT 0,
  total_cost NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Поставщик
  supplier_id INT,
  supplier_name TEXT NOT NULL DEFAULT '',

  -- Аудит
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (system_id, station_number, tank_number, ttn, receipt_dt)
);

CREATE INDEX IF NOT EXISTS idx_receipt_costs_system_station
  ON receipt_costs (system_id, station_number);

CREATE INDEX IF NOT EXISTS idx_receipt_costs_fuel_code
  ON receipt_costs (fuel_code);

CREATE INDEX IF NOT EXISTS idx_receipt_costs_receipt_dt
  ON receipt_costs (receipt_dt);

CREATE INDEX IF NOT EXISTS idx_receipt_costs_ttn
  ON receipt_costs (ttn);

DROP TRIGGER IF EXISTS trg_receipt_costs_set_updated_at ON receipt_costs;
CREATE TRIGGER trg_receipt_costs_set_updated_at
BEFORE UPDATE ON receipt_costs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
