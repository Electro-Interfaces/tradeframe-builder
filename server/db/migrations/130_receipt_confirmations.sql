-- Подтверждение поступлений менеджером
-- Менеджер может подтвердить корректность данных из облачной БД STS
-- или скорректировать их. Оригинальные данные STS не меняются.
CREATE TABLE IF NOT EXISTS receipt_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Привязка к STS-данным (натуральный ключ, как в receipt_costs)
  system_id INT NOT NULL,
  station_number INT NOT NULL,
  shift_number INT NOT NULL,
  tank_number INT NOT NULL,
  ttn TEXT NOT NULL,
  receipt_dt TEXT NOT NULL,

  -- Статус подтверждения
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'corrected', 'rejected')),

  -- Скорректированные данные (заполняются только при status = 'corrected')
  corrected_volume TEXT,
  corrected_amount TEXT,
  corrected_density NUMERIC(8,4),
  corrected_temp NUMERIC(6,2),

  -- Комментарий менеджера
  comment TEXT NOT NULL DEFAULT '',

  -- Аудит
  confirmed_by UUID NOT NULL,
  confirmed_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (system_id, station_number, tank_number, ttn, receipt_dt)
);

CREATE INDEX IF NOT EXISTS idx_receipt_confirmations_system_station
  ON receipt_confirmations (system_id, station_number);

CREATE INDEX IF NOT EXISTS idx_receipt_confirmations_receipt_dt
  ON receipt_confirmations (receipt_dt);

CREATE INDEX IF NOT EXISTS idx_receipt_confirmations_ttn
  ON receipt_confirmations (ttn);

CREATE INDEX IF NOT EXISTS idx_receipt_confirmations_status
  ON receipt_confirmations (status);

DROP TRIGGER IF EXISTS trg_receipt_confirmations_set_updated_at ON receipt_confirmations;
CREATE TRIGGER trg_receipt_confirmations_set_updated_at
BEFORE UPDATE ON receipt_confirmations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
