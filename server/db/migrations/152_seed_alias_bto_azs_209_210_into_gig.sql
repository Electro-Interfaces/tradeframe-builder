-- Сид: «одолжить» АКАЗС №209 и АКАЗС №210 (физически в сети БТО) в сеть ГИГ.
-- Логика та же, что для №2 в миграции 151: точки продолжают работать
-- со своими STS/MSTO кодами (sts: 209/210), но появляются в списке
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
  AND tp.code IN ('209', '210')
  AND EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
ON CONFLICT DO NOTHING;
