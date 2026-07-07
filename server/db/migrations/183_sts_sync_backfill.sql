-- Самоподстраховка синка от пробелов в истории.
-- first_synced_date — самый ранний покрытый день станции. Синк досинкивает
-- историю НАЗАД до целевой глубины (INITIAL_DAYS), останавливаясь на границе
-- данных станции. Так станции, появившиеся позже первого наполнения (или
-- сменившие номер), автоматически догоняют полный исторический период.
ALTER TABLE sts_sync_cursor ADD COLUMN IF NOT EXISTS first_synced_date DATE;
ALTER TABLE sts_sync_cursor ADD COLUMN IF NOT EXISTS backfill_done BOOLEAN NOT NULL DEFAULT false;

-- Бэкфилл-курсор для дополнительных (старых) номеров станции — например
-- Светогорск слал под 9008 до переименования в 8. Синк основного номера
-- досинкивает и старые номера, записывая данные под текущим station_code.
CREATE TABLE IF NOT EXISTS sts_sync_alias_cursor (
  system            INTEGER NOT NULL,
  station_code      INTEGER NOT NULL,   -- текущий (целевой) номер станции
  alias_code        INTEGER NOT NULL,   -- старый номер, под которым слались данные
  first_synced_date DATE,
  backfill_done     BOOLEAN NOT NULL DEFAULT false,
  last_run_at       TIMESTAMPTZ,
  PRIMARY KEY (system, station_code, alias_code)
);
