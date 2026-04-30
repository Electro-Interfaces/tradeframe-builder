-- Таблица alias-привязки торговой точки к дополнительной сети.
-- Позволяет «одолжить» точку из её родной сети в другую без смены network_id.
-- Используется для постепенного переноса станций между сетями (БТО → ГИГ),
-- когда переучёт во внешних системах (STS, MSTO, TradeCorp) ещё не выполнен.

CREATE TABLE IF NOT EXISTS network_trading_point_aliases (
  network_id        UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  trading_point_id  TEXT NOT NULL REFERENCES trading_points(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (network_id, trading_point_id)
);

CREATE INDEX IF NOT EXISTS idx_ntpa_trading_point
  ON network_trading_point_aliases(trading_point_id);

COMMENT ON TABLE network_trading_point_aliases IS
  'Alias-привязка торговой точки к дополнительной сети. trading_points.network_id остаётся родным (физическая сеть для STS/MSTO/TradeCorp). API getTradingPoints(networkId) объединяет родные точки и алиасы, подменяя network_*-поля на целевую сеть для UI/RBAC, и оставляет network_external_id физической сети для STS-запросов.';

COMMENT ON COLUMN network_trading_point_aliases.network_id IS
  'Целевая (отображающая) сеть, в чей список точек включается алиас.';

COMMENT ON COLUMN network_trading_point_aliases.trading_point_id IS
  'Точка, фактически принадлежащая другой сети (см. trading_points.network_id).';
