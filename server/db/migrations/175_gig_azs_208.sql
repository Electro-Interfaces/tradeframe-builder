-- Добавление АЗС №208 (Выборг) в сеть ГИГ (external_id=15)
-- Станция уже есть в STS под system=15 (Нефтесервер с оператором, 2 рабочих места)
-- и в TradeLink (2 ноды: «Станция 208 — 1С», «Станция 208 — Сервер»).
-- Старый id bto-azs-208 занят тестовой записью в сети БТО (soft-deleted) → используем gig-azs-208.
-- Шаблон: 140_network_bibenz.sql

DO $$
DECLARE
  v_gig_id UUID;
  v_point_id TEXT := 'gig-azs-208';
BEGIN
  -- 1. Резолвим сеть ГИГ по external_id (устойчиво к смене code)
  SELECT id INTO v_gig_id
  FROM networks
  WHERE external_id = '15' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_gig_id IS NULL THEN
    RAISE NOTICE 'Сеть ГИГ (external_id=15) не найдена — пропуск миграции 175';
    RETURN;
  END IF;

  -- 2. Торговая точка (станция 208)
  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description,
    region, city, address, latitude, longitude, is_active
  ) VALUES (
    v_point_id, v_gig_id, '208', '208', 'АЗС №208', 'Выборг',
    'Ленинградская область', 'г. Выборг', 'Светогорское шоссе, д. 17',
    60.725234, 28.767361, true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Внешний код STS (связь с poscontrol: system=15, station=208)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-208', v_point_id, 'sts', '208',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

  -- 4. Внешний код MSTO (онлайн-заказы: ID станции у агента = 23)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-msto-208', v_point_id, 'msto', '23',
    'Id у агента', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

  -- TradeLink: отдельная запись не нужна — карточка «Связь» мапит ноды автоматически
  -- по номеру станции (getStationNumber → trading_points.code = '208').
END $$;
