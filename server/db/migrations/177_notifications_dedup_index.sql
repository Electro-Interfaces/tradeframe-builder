-- Индексы под дедупликацию уведомлений (findRecentNotification).
-- Планировщик на каждом тике для каждой станции ищет последнее уведомление:
--   WHERE type = $1 AND context->>'stationCode' = $2 ORDER BY created_at DESC LIMIT 1
-- Таблица notifications append-only и растёт без очистки — без индекса
-- каждый тик деградирует в seq scan.

-- Общий индекс: свежие уведомления данного типа
CREATE INDEX IF NOT EXISTS idx_notifications_type_created_at
  ON notifications (type, created_at DESC);

-- Точный индекс под самый частый идентификатор дедупликации
CREATE INDEX IF NOT EXISTS idx_notifications_type_station_created_at
  ON notifications (type, (context ->> 'stationCode'), created_at DESC);
