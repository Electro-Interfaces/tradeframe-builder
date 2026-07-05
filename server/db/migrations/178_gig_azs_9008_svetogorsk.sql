-- Добавление станции 9008 (Светогорск, бывшая №8) в сеть ГИГ (external_id=15).
-- В STS станция идёт под system=15, station=9008 — реальная АЗС с оператором
-- (Нефтесервер): 7 резервуаров, топливо ДТ/АИ-92/АИ-95/АИ-98, ~1600 транз/нед.
-- Её НЕ было в нашем справочнике → транзакции 9008 отфильтровывались, а её
-- битая запись (03.06 17:32:27) роняла запросы всей сети ГИГ (HTTP 500).
-- В Светогорске у ГИГ две станции: 209 (ул. Победы, уже заведена) и эта (9008).
-- Показываем под номером 9008 (по согласованию). Шаблон: 175_gig_azs_208.sql.
-- MSTO-код (онлайн-заказы) — ГИГ идёт через отдельного агента, servicePointId
-- не в общем /servicePoints; добавить отдельной миграцией, когда будет известен.

DO $$
DECLARE
  v_gig_id UUID;
  v_point_id TEXT := 'gig-azs-9008';
BEGIN
  -- 1. Резолвим сеть ГИГ по external_id (устойчиво к смене code)
  SELECT id INTO v_gig_id
  FROM networks
  WHERE external_id = '15' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_gig_id IS NULL THEN
    RAISE NOTICE 'Сеть ГИГ (external_id=15) не найдена — пропуск миграции 178';
    RETURN;
  END IF;

  -- 2. Торговая точка (станция 9008, Светогорск)
  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description,
    region, city, address, latitude, longitude, is_active
  ) VALUES (
    v_point_id, v_gig_id, '9008', '9008', 'АЗС №9008', 'Светогорск (бывш. №8)',
    'Ленинградская область', 'г. Светогорск', '',
    61.0954, 28.8926, true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Внешний код STS (связь с poscontrol: system=15, station=9008)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-9008', v_point_id, 'sts', '9008',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

  -- MSTO: код добавить отдельно, когда будет известен servicePointId у агента ГИГ.
  -- TradeLink: отдельная запись не нужна — карточка «Связь» мапит ноды автоматически
  -- по номеру станции (getStationNumber → trading_points.code = '9008').
END $$;
