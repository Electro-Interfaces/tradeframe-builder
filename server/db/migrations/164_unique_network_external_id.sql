-- Защита уникальности external_id среди активных сетей.
--
-- После чистки дубля «ВиБенз» (163) и переезда ГИГ на external_id='15' (162)
-- среди не удалённых сетей не остаётся двух с одинаковым external_id, поэтому
-- можно поставить partial UNIQUE — он предотвратит повторение инцидента, когда
-- две сети делят один external_id (что ломает Map getNetworkByExternalId и
-- alias-резолв). NULL допускаем — у «пустых» сетей (БТО после переезда,
-- погашенный дубль bibenz) external_id освобождён.
--
-- Если на момент применения остался хоть один дубль external_id среди живых
-- сетей — CREATE UNIQUE INDEX упадёт и runner откатит миграцию: это сигнал,
-- что чистка данных не доведена, а не повод убирать защиту.

CREATE UNIQUE INDEX IF NOT EXISTS idx_networks_external_id_active_unique
  ON networks (external_id)
  WHERE external_id IS NOT NULL AND deleted_at IS NULL;
