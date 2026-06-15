-- Ведомости: корпоративные клиенты ГИГ + корпоративные онлайн-заказы.
-- Раздел «Ведомости» в TF: реестр корпоративных клиентов + заказы топлива,
-- которые (фаза 2) отправляются в MSTO как агент-источник «ГИГ» и
-- исполняются на станциях ГИГ. Расчёты в TF не ведутся — только учёт факта.

-- ─── Реестр корпоративных клиентов ────────────────────────────────
CREATE TABLE IF NOT EXISTS corporate_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  inn TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corporate_clients_network_name_unique
  ON corporate_clients (network_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_corporate_clients_network_id
  ON corporate_clients (network_id);

CREATE INDEX IF NOT EXISTS idx_corporate_clients_is_active
  ON corporate_clients (is_active);

-- ─── Корпоративные заказы (ведомость) ─────────────────────────────
CREATE TABLE IF NOT EXISTS corporate_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_client_id UUID NOT NULL REFERENCES corporate_clients(id) ON DELETE CASCADE,
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  trading_point_id TEXT REFERENCES trading_points(id) ON DELETE SET NULL,
  station_code TEXT NOT NULL,
  station_name TEXT,
  fuel_code INTEGER NOT NULL,
  fuel_name TEXT,
  column_number INTEGER,
  mode TEXT NOT NULL DEFAULT 'liters',          -- liters | rubles
  ordered_volume NUMERIC(12,3) NOT NULL DEFAULT 0,
  ordered_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  price NUMERIC(12,4),
  status TEXT NOT NULL DEFAULT 'draft',          -- draft|sent|fulfilled|partial|cancelled|failed
  msto_order_id TEXT,
  msto_session_id TEXT,
  actual_volume NUMERIC(12,3) NOT NULL DEFAULT 0,
  actual_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  comment TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_corporate_orders_client_id
  ON corporate_orders (corporate_client_id);

CREATE INDEX IF NOT EXISTS idx_corporate_orders_network_id
  ON corporate_orders (network_id);

CREATE INDEX IF NOT EXISTS idx_corporate_orders_status
  ON corporate_orders (status);

CREATE INDEX IF NOT EXISTS idx_corporate_orders_created_at
  ON corporate_orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_corporate_orders_msto_session_id
  ON corporate_orders (msto_session_id);

-- Триггеры обновления updated_at (функция set_updated_at создана ранее)
DROP TRIGGER IF EXISTS trg_corporate_clients_set_updated_at ON corporate_clients;
CREATE TRIGGER trg_corporate_clients_set_updated_at
BEFORE UPDATE ON corporate_clients
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_corporate_orders_set_updated_at ON corporate_orders;
CREATE TRIGGER trg_corporate_orders_set_updated_at
BEFORE UPDATE ON corporate_orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
