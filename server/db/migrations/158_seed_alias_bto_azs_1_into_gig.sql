-- Сид: «одолжить» АКАЗС №1 (Непокоренных) (физически в сети БТО) в сеть ГИГ.
-- Логика та же, что для №2/№4/№207/№209/№210 в миграциях 151/152/157:
-- точка продолжает работать со своим STS-кодом (sts: 1), но появляется
-- в списке станций сети ГИГ в селекторе TradeFrame и пропадает из БТО.
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
  AND tp.code = '1'
  AND EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
ON CONFLICT DO NOTHING;
