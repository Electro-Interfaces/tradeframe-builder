-- Сид: «одолжить» АКАЗС №4 (Первомайская) и АЗС 207 (Выборг)
-- (физически в сети БТО) в сеть ГИГ.
-- Логика та же, что для №2/№209/№210 в миграциях 151/152: точки продолжают
-- работать со своими STS/MSTO кодами (sts: 4/207), но появляются в списке
-- станций сети ГИГ в селекторе TradeFrame и пропадают из БТО.
--
-- Реквизиты сетей в prod БД:
--   БТО: code='bto'   external_id='15'
--   ГИГ: code='65'    external_id='65'

INSERT INTO network_trading_point_aliases (network_id, trading_point_id)
SELECT
  (SELECT id FROM networks WHERE lower(code) = '65'),
  tp.id
FROM trading_points tp
WHERE tp.network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
  AND tp.code IN ('4', '207')
  AND EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
ON CONFLICT DO NOTHING;
