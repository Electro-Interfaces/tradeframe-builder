-- Добавление АЗС №288 (Сиверская) в сеть ГИГ (external_id=15).
-- Станция уже есть в STS под system=15, station=288 (1 рабочее место, уровнемер отсутствует).
-- Топливо по данным владельца: АИ-92, АИ-95, АИ-98, ДТ (в STS цены пока на 92/95/ДТ).
-- MSTO: станции нет у агента → внешний код msto не заводим (добавить отдельно при подключении).
-- TradeLink: ноды нет → карточка «Связь» будет пустой, пока узел не подключат.
-- Шаблон: 180_gig_azs_205.sql

DO $$
DECLARE
  v_gig_id UUID;
  v_point_id TEXT := 'gig-azs-288';
BEGIN
  SELECT id INTO v_gig_id
  FROM networks
  WHERE external_id = '15' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_gig_id IS NULL THEN
    RAISE NOTICE 'Сеть ГИГ (external_id=15) не найдена — пропуск миграции 186';
    RETURN;
  END IF;

  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description,
    region, city, address, latitude, longitude, phone, is_active
  ) VALUES (
    v_point_id, v_gig_id, '288', '288', 'АЗС №288', 'Сиверская',
    'Ленинградская область', 'Гатчинский муниципальный округ, дер. Старосиверская',
    'ул. Новая, д. 1', 59.373668, 30.089859, '+7 921 355-10-02', true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Внешний код STS (system=15, station=288)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-288', v_point_id, 'sts', '288',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
END $$;
