-- АЗС №3 Кудрово: перенос в ГИГ через alias (последняя родная станция БТО).
-- Кудрово физически остаётся в БТО (STS system=15), но в UI показывается в ГИГ.
-- После этой миграции в сети БТО не остаётся «родных» станций —
-- все 9 точек (№1, №2, №3, №4, №5, №6, №207, №209, №210) показываются в ГИГ через alias.
--
-- Реквизиты сетей в prod БД:
--   БТО: code='bto'  external_id='15'
--   ГИГ: code='65'   external_id='65'

INSERT INTO network_trading_point_aliases (network_id, trading_point_id)
SELECT
  (SELECT id FROM networks WHERE lower(code) = '65'),
  tp.id
FROM trading_points tp
WHERE tp.network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
  AND tp.code = '3'
  AND EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
ON CONFLICT DO NOTHING;
