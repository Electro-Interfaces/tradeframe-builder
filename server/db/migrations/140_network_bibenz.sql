-- Добавление сети «ВиБенз» (система 19) и станции №1

DO $$
DECLARE
  v_network_id UUID;
  v_point_id TEXT;
  v_ec_id TEXT;
BEGIN
  -- 1. Создаём сеть
  INSERT INTO networks (code, external_id, name, description, network_type, is_active)
  VALUES ('bibenz', '19', 'ВиБенз', 'Сеть АЗС ВиБенз', 'АЗС', true)
  ON CONFLICT (lower(code)) DO NOTHING
  RETURNING id INTO v_network_id;

  -- Если сеть уже существует — получаем её id
  IF v_network_id IS NULL THEN
    SELECT id INTO v_network_id FROM networks WHERE lower(code) = 'bibenz';
  END IF;

  -- 2. Создаём торговую точку (станция 1)
  v_point_id := 'bibenz-azs-1';

  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description, is_active
  ) VALUES (
    v_point_id, v_network_id, '1', '1', 'АЗС №1', 'ВиБенз - АЗС №1', true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Внешний код STS для торговой точки
  v_ec_id := 'ec-bibenz-sts-1';

  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    v_ec_id, v_point_id, 'sts', '1', 'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

END $$;
