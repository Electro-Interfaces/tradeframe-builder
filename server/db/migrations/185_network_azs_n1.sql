-- Добавление сети «АЗС Н1» (система 71) и станции №3
-- Станция уже есть в STS под system=71 station=3 (2 поста, уровнемер, 6 резервуаров).
-- Шаблон: 140_network_bibenz.sql

DO $$
DECLARE
  v_network_id UUID;
  v_point_id TEXT := 'azs-n1-azs-3';
BEGIN
  -- 1. Создаём сеть
  INSERT INTO networks (code, external_id, name, description, network_type, is_active)
  VALUES ('azs-n1', '71', 'АЗС Н1', 'Сеть АЗС Н1', 'АЗС', true)
  ON CONFLICT (lower(code)) DO NOTHING
  RETURNING id INTO v_network_id;

  -- Если сеть уже существует — получаем её id
  IF v_network_id IS NULL THEN
    SELECT id INTO v_network_id FROM networks WHERE lower(code) = 'azs-n1';
  END IF;

  -- 2. Торговая точка (станция 3 в STS)
  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description, is_active
  ) VALUES (
    v_point_id, v_network_id, '3', '3', 'АЗС №3', 'АЗС Н1 — АЗС №3', true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Внешний код STS (связь с poscontrol: system=71, station=3)
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-azs-n1-sts-3', v_point_id, 'sts', '3',
    'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
END $$;
