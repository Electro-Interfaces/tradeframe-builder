-- Добавление АЗС №235 в сеть ГИГ (external_id=15).
-- Станция уже есть в STS под system=15, station=235: 1 рабочее место, 14 пистолетов,
-- 5 резервуаров (ДТ, 2×АИ-95, АИ-92, ГАЗ/СУГ — код топлива 16), первая смена 10.09.2026.
-- Отличия от прочих станций ГИГ: есть резервуар с газом; в /v1/points STS станции нет
-- (справочник точек не заполнен) → название, адрес и координаты заведены по данным владельца.
-- ТРК по данным владельца сходятся с STS один в один: 1-4 (АИ-92 + АИ-95), 5-7 (ДТ), 8 (пропан).
-- Заявленное владельцем ДТ зим. в STS отсутствует - ни резервуара, ни пистолета.
-- Цены в STS пока не заведены (/v1/pos/prices/235 отдаёт пустой список).
-- MSTO: станции у агента нет → внешний код msto не заводим.
-- Шаблон: 186_gig_azs_288.sql

DO $$
DECLARE
  v_gig_id UUID;
  v_point_id TEXT := 'gig-azs-235';
BEGIN
  SELECT id INTO v_gig_id
  FROM networks
  WHERE external_id = '15' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_gig_id IS NULL THEN
    RAISE NOTICE 'Сеть ГИГ (external_id=15) не найдена — пропуск миграции 187';
    RETURN;
  END IF;

  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description,
    region, city, address, latitude, longitude, phone, is_active
  ) VALUES (
    v_point_id, v_gig_id, '235', '235', 'АЗС №235', 'Келози (Ужба)',
    'Ленинградская область', 'Ломоносовский район',
    'автодорога А-180 «Нарва», 45-й км (поворот на д. Келози)',
    59.669528, 29.824222, '8 (931) 303-41-75', true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Внешний код STS (system=15, station=235)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-235', v_point_id, 'sts', '235',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
END $$;
