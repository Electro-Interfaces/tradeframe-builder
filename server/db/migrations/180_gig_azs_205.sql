-- Добавление АЗС №205 в сеть ГИГ (external_id=15).
-- Новая станция ГИГ в STS (system=15, station=205, Нефтесервер с оператором):
-- 7 резервуаров, топливо ДТ/АИ-92/АИ-95/АИ-100, работает с ~01.07.2026
-- (в июне транзакций не было). Не была в справочнике → транзакции 205
-- отфильтровывались, оборот не учитывался. Шаблон: 178_gig_azs_9008.
-- Адрес/город/координаты — заглушки (регион ГИГ), УТОЧНИТЬ отдельно.

DO $$
DECLARE
  v_gig_id UUID;
  v_point_id TEXT := 'gig-azs-205';
BEGIN
  SELECT id INTO v_gig_id
  FROM networks
  WHERE external_id = '15' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_gig_id IS NULL THEN
    RAISE NOTICE 'Сеть ГИГ (external_id=15) не найдена — пропуск миграции 180';
    RETURN;
  END IF;

  -- Торговая точка (станция 205). Адрес/город/координаты — заглушки, уточнить.
  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description,
    region, city, address, latitude, longitude, is_active
  ) VALUES (
    v_point_id, v_gig_id, '205', '205', 'АЗС №205', '',
    'Ленинградская область', '', '', 59.9386, 30.3141, true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Внешний код STS (system=15, station=205)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-205', v_point_id, 'sts', '205',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

  -- MSTO-код добавить отдельно (ГИГ через отдельного агента).
  -- TradeLink: карточка «Связь» мапит ноды по номеру станции автоматически.
END $$;
