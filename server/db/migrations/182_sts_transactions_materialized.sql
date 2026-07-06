-- Материализация транзакций STS в PostgreSQL — фундамент серверной аналитики.
-- Синк-джоб дотягивает транзакции из STS в эту таблицу, а «Обзор»/«Операции»
-- считают агрегаты через SQL GROUP BY за миллисекунды вместо тащить сотни тысяч
-- строк в браузер. Дедупликация по (system, station_code, sts_id).

CREATE TABLE IF NOT EXISTS sts_transactions (
  id             BIGSERIAL PRIMARY KEY,
  network_id     UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  system         INTEGER NOT NULL,          -- STS system (external_id сети)
  station_code   INTEGER NOT NULL,          -- номер станции в STS
  sts_id         BIGINT NOT NULL,           -- id транзакции в STS (уникален в системе)
  dt             TIMESTAMPTZ NOT NULL,      -- время транзакции
  shift          INTEGER,
  receipt        INTEGER,                   -- номер чека (number)
  pos            INTEGER,                   -- ТРК
  nozzle         INTEGER,                   -- пистолет
  tank           INTEGER,                   -- резервуар
  fuel_code      INTEGER,
  fuel_name      TEXT,
  quantity       NUMERIC(14,3),             -- отпущено, литры
  price          NUMERIC(12,2),             -- цена за литр
  cost           NUMERIC(16,2),             -- сумма, рубли
  mass           NUMERIC(14,3),             -- масса, кг (amount)
  density        NUMERIC(8,3),
  pay_type_id    INTEGER,
  pay_type_name  TEXT,                      -- сырое название способа оплаты
  payment_method TEXT,                      -- нормализованный (для группировки)
  card           TEXT,
  order_qty      NUMERIC(14,3),             -- заказано, литры
  order_cost     NUMERIC(16,2),             -- заказано, рубли
  status         TEXT NOT NULL DEFAULT 'completed',
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (system, station_code, sts_id)
);

-- Индексы под горячие агрегаты (период по сети + разбивки)
CREATE INDEX IF NOT EXISTS idx_sts_tx_network_dt          ON sts_transactions (network_id, dt);
CREATE INDEX IF NOT EXISTS idx_sts_tx_network_station_dt  ON sts_transactions (network_id, station_code, dt);
CREATE INDEX IF NOT EXISTS idx_sts_tx_network_dt_fuel     ON sts_transactions (network_id, dt, fuel_code);
CREATE INDEX IF NOT EXISTS idx_sts_tx_network_dt_payment  ON sts_transactions (network_id, dt, payment_method);

-- Курсор синхронизации на станцию: докуда день «закрыт» (неизменен),
-- «сегодня» синк всегда перечитывает целиком.
CREATE TABLE IF NOT EXISTS sts_sync_cursor (
  system            INTEGER NOT NULL,
  station_code      INTEGER NOT NULL,
  network_id        UUID REFERENCES networks(id) ON DELETE CASCADE,
  last_synced_date  DATE,                   -- последний полностью синхронизированный день
  last_run_at       TIMESTAMPTZ,
  last_ok_at        TIMESTAMPTZ,
  last_error        TEXT,
  rows_total        BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (system, station_code)
);
