-- Чистка дубля сети «ВиБенз».
--
-- В prod БД две активные сети «ВиБенз» с одинаковым external_id='19':
--   - code='вибенз' (кириллица), создана 2026-03-24 — СТАРШАЯ, на ней висят
--     роль «Менеджер сети ВиБенз» (net_vibenz) и 2 user_roles (менеджеры);
--     точка «АКАЗС № 1 Кальтино».
--   - code='bibenz' (латиница), создана миграцией 140_network_bibenz.sql
--     (2026-05-04) — ДУБЛЬ, ничего кроме собственной пустой точки «АЗС №1»
--     на нём не висит (ни ролей, ни scope, ни alias).
--
-- Дубль блокирует partial UNIQUE на networks(external_id) (см. 164) и был
-- обнаружен при подготовке переезда ГИГ. Оставляем кириллическую сеть,
-- латинскую гасим: внешний код деактивируем, точку и сеть — soft-delete,
-- external_id у дубля обнуляем (двойная защита: исключает его и из partial
-- индекса по external_id, и из Map getNetworkByExternalId).
--
-- Миграцию 140 НЕ редактируем (уже applied — смена checksum сломает деплой).
-- Файл выполняется атомарно: runner (server/db/migrate.js) оборачивает каждую
-- миграцию в BEGIN/COMMIT, при ошибке любого шага — ROLLBACK. BEGIN/COMMIT тут
-- не нужны. Резолв сети по lower(code) — id не хардкодим.

-- 1) Деактивация внешнего кода STS у точек дубля.
UPDATE trading_point_external_codes
   SET is_active = false,
       updated_at = now()
 WHERE trading_point_id IN (
         SELECT id FROM trading_points
          WHERE network_id = (SELECT id FROM networks WHERE lower(code) = 'bibenz')
       );

-- 2) Soft-delete точек дубля («АЗС №1»). Дубль не участвует в alias-схеме
--    (alias только у ГИГ), поэтому удаление родителя ничего не осиротит.
UPDATE trading_points
   SET is_active = false,
       deleted_at = now(),
       updated_at = now()
 WHERE network_id = (SELECT id FROM networks WHERE lower(code) = 'bibenz')
   AND deleted_at IS NULL;

-- 3) Гашение самой сети-дубля: освобождаем external_id (снимает конфликт '19'),
--    деактивируем и soft-delete. Кириллическая «вибенз» остаётся единственной
--    активной сетью ВиБенз с external_id='19'.
UPDATE networks
   SET external_id = NULL,
       is_active = false,
       deleted_at = now(),
       updated_at = now()
 WHERE lower(code) = 'bibenz';
