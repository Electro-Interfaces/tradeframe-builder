-- Корректировка остатков нефтепродуктов по результатам инвентаризации.
-- Документ заполняется бухгалтером сети, утверждается уполномоченным лицом
-- и отправляется по email на фиксированный адрес рассылки.
-- TradeFrame не применяет корректировку автоматически; правки в poscontrol
-- вносит специалист вручную, читая прикреплённый PDF-приказ.
-- См. docs/INVENTORY_ADJUSTMENT_PROPOSAL.md.

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Привязка к организации
  network_id UUID NOT NULL REFERENCES networks(id) ON DELETE RESTRICT,
  trading_point_id TEXT NOT NULL REFERENCES trading_points(id) ON DELETE RESTRICT,

  -- Реквизиты приказа
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL,
  inventory_date DATE NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  comment TEXT,

  -- Статус документа
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'cancelled')),

  -- Авторство и переходы статусов
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  sent_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,

  cancelled_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- PDF и email-рассылка (заполняется при send)
  pdf_path TEXT,
  email_to TEXT[],
  email_status TEXT
    CHECK (email_status IN ('pending', 'sent', 'failed')),
  email_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_inv_adj_trading_point_status
  ON inventory_adjustments (trading_point_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_adj_network_status
  ON inventory_adjustments (network_id, status);

CREATE INDEX IF NOT EXISTS idx_inv_adj_created_by
  ON inventory_adjustments (created_by_user_id);

DROP TRIGGER IF EXISTS trg_inventory_adjustments_set_updated_at ON inventory_adjustments;
CREATE TRIGGER trg_inventory_adjustments_set_updated_at
BEFORE UPDATE ON inventory_adjustments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE inventory_adjustments IS
  'Документ корректировки остатков по результатам инвентаризации (АКАЗС). Жизненный цикл: draft → sent | cancelled. После sent документ не редактируется, изменения только новым документом.';

COMMENT ON COLUMN inventory_adjustments.effective_at IS
  'Время начала действия из приказа. Справочное поле для PDF — TradeFrame не использует его для автоприменения.';

COMMENT ON COLUMN inventory_adjustments.email_to IS
  'Снимок списка email-получателей на момент отправки.';


-- Построчная корректировка по каждому резервуару, попавшему в приказ.
CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id UUID NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,

  tank_number INT NOT NULL,
  fuel_name TEXT NOT NULL,

  -- Книжный остаток-снимок на момент создания (вытягивается из STS /v1/tanks)
  book_volume_l NUMERIC(12,2) NOT NULL,
  book_mass_kg NUMERIC(12,2),

  -- Фактический замер из акта инвентаризации (вводит сотрудник).
  -- NULL означает, что строка не попала в приказ — корректировка по этому резервуару не применяется.
  fact_volume_l NUMERIC(12,2),
  fact_mass_kg NUMERIC(12,2),

  -- Дельты считаются БД автоматически
  delta_volume_l NUMERIC(12,2)
    GENERATED ALWAYS AS (fact_volume_l - book_volume_l) STORED,
  delta_mass_kg NUMERIC(12,2)
    GENERATED ALWAYS AS (fact_mass_kg - book_mass_kg) STORED,

  UNIQUE (adjustment_id, tank_number)
);

CREATE INDEX IF NOT EXISTS idx_inv_adj_items_adjustment
  ON inventory_adjustment_items (adjustment_id);

COMMENT ON TABLE inventory_adjustment_items IS
  'Корректировка по конкретному резервуару в составе документа inventory_adjustments. fact_volume_l = NULL означает что резервуар не попал в приказ — в PDF не выводится.';
