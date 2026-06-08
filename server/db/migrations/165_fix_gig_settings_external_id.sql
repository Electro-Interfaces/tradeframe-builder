-- Доводка переезда ГИГ: синхронизация settings.external_id с колонкой external_id.
--
-- Миграция 162 сменила колонку networks.external_id ГИГ 65→15, но НЕ тронула
-- дублирующее поле settings->>'external_id' (осталось '65'). Фронтовый getSystemId
-- (src/config/stsConfig.ts) читает СНАЧАЛА settings.external_id, и только потом
-- колонку — поэтому для ГИГ в STS уходил system=65 (которого больше нет) и смены/
-- цены/операции возвращались пустыми. Приводим settings.external_id к '15'.
--
-- Резолв по lower(code). Runner оборачивает в BEGIN/COMMIT — здесь не нужно.

UPDATE networks
   SET settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{external_id}', '"15"'),
       updated_at = now()
 WHERE lower(code) = '65';
