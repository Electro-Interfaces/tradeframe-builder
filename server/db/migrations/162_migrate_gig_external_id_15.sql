-- Приведение в порядок сетей ГИГ/БТО: ГИГ переходит на external_id=15 (реальный
-- STS system), отказ от alias-схемы 65→15. БТО НЕ удаляем — освобождаем у неё
-- external_id и оставляем активной-пустой (в UI скрывается как сеть с 0 точек).
--
-- Порядок шагов критичен. Файл выполняется атомарно: runner (server/db/migrate.js)
-- оборачивает каждую миграцию в BEGIN/COMMIT, при ошибке любого шага — ROLLBACK.
-- Поэтому BEGIN/COMMIT здесь НЕ нужны.
--
-- Реквизиты сетей в prod БД:
--   БТО: code='bto'  external_id='15'  (физический STS system)
--   ГИГ: code='65'   external_id='65'  (alias-обёртка, в STS системы 65 нет)
--
-- Почему нельзя просто сменить ГИГ→15: при двух активных сетях с external_id=15
-- ломается getNetworkByExternalId (Map по external_id) и alias-резолв; а точки,
-- оставшись в БТО, осиротеют. Поэтому всё одной транзакцией в строгом порядке.

-- 1) Перевод всех родных точек БТО в ГИГ (становятся родными в ГИГ).
--    id точек (bto-azs-X) НЕ меняем — opaque: завязаны external_codes, scopes, tradelink.
UPDATE trading_points
   SET network_id = (SELECT id FROM networks WHERE lower(code) = '65'),
       updated_at = now()
 WHERE network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
   AND deleted_at IS NULL;

-- 2) Снятие alias ГИГ — точки теперь родные, подмена не нужна.
DELETE FROM network_trading_point_aliases
 WHERE network_id = (SELECT id FROM networks WHERE lower(code) = '65');

-- 3) Освобождение external_id у БТО (иначе на шаге 4 будут две сети с '15').
--    БТО остаётся активной (deleted_at НЕ трогаем) — не удаляем, просто пустая.
UPDATE networks
   SET external_id = NULL,
       updated_at = now()
 WHERE lower(code) = 'bto';

-- 4) ГИГ занимает STS system 15 (отказ от alias-подмены 65→15).
UPDATE networks
   SET external_id = '15',
       updated_at = now()
 WHERE lower(code) = '65';

-- ПРИМЕЧАНИЕ: partial UNIQUE на external_id среди активных сетей НЕ создаётся
-- здесь намеренно. В prod уже есть дубль external_id='19' — две активные сети
-- «ВиБенз» (code='bibenz' и code='вибенз'). CREATE UNIQUE INDEX упал бы и
-- откатил всю транзакцию вместе с переездом ГИГ. Защиту external_id выносим в
-- отдельную миграцию после чистки дубля ВиБенз (см. docs / память по data quality).
