-- АЗС №5 Витебский: физический перенос в STS с system=65 на system=15.
-- В TradeFrame переводим точку из сети ГИГ в БТО + alias обратно в ГИГ,
-- чтобы STS-запросы шли к system=15, а в UI станция оставалась в ГИГ.
--
-- После этой миграции в сети ГИГ не остаётся «родных» станций —
-- все 8 показываются через alias из БТО (№1, №2, №4, №5, №6, №207, №209, №210).
-- В БТО остаётся единственная родная станция: №3 Кудрово.
--
-- Реквизиты сетей в prod БД:
--   БТО: code='bto'   external_id='15'
--   ГИГ: code='65'    external_id='65'

-- 1. Перенести торговую точку из ГИГ в БТО (id остаётся прежним: 65-azs-5)
UPDATE trading_points
SET network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
WHERE code = '5'
  AND network_id = (SELECT id FROM networks WHERE lower(code) = '65');

-- 2. Создать alias из БТО в ГИГ — станция продолжит показываться в ГИГ
INSERT INTO network_trading_point_aliases (network_id, trading_point_id)
SELECT
  (SELECT id FROM networks WHERE lower(code) = '65'),
  tp.id
FROM trading_points tp
WHERE tp.network_id = (SELECT id FROM networks WHERE lower(code) = 'bto')
  AND tp.code = '5'
  AND EXISTS (SELECT 1 FROM networks WHERE lower(code) = '65')
ON CONFLICT DO NOTHING;
