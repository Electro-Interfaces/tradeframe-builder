-- Сид: «одолжить» АКАЗС №2 (физически в сети БТО) в сеть ГИГ.
-- Точка bto-azs-2 продолжит работать со своими STS/MSTO кодами (sts: 2, msto: 238),
-- но появится в списке станций сети ГИГ в селекторе TradeFrame.
--
-- Сети идентифицируются по реальным значениям из prod БД:
--   БТО: code='bto'   external_id='15'
--   ГИГ: code='65'    external_id='65'

INSERT INTO network_trading_point_aliases (network_id, trading_point_id)
SELECT
  (SELECT id FROM networks WHERE lower(code) = '65'),
  (SELECT id FROM trading_points
   WHERE network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
     AND code = '2')
WHERE
  EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
  AND EXISTS (
    SELECT 1 FROM trading_points
    WHERE network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
      AND code = '2'
  )
ON CONFLICT DO NOTHING;
