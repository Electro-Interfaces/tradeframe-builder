-- Добавление сети «Энтиком» (система 29) и станции №10

DO $$
DECLARE
  v_network_id UUID;
  v_point_id TEXT;
  v_ec_id TEXT;
BEGIN
  -- 1. Создаём сеть
  INSERT INTO networks (code, external_id, name, description, network_type, is_active)
  VALUES ('enticom', '29', 'Энтиком', 'Сеть АЗС Энтиком', 'АЗС', true)
  ON CONFLICT (lower(code)) DO NOTHING
  RETURNING id INTO v_network_id;

  -- Если сеть уже существует — получаем её id
  IF v_network_id IS NULL THEN
    SELECT id INTO v_network_id FROM networks WHERE lower(code) = 'enticom';
  END IF;

  -- 2. Создаём торговую точку (станция 10)
  v_point_id := 'enticom-azs-10';

  INSERT INTO trading_points (
    id, network_id, code, external_id, name, description, is_active
  ) VALUES (
    v_point_id, v_network_id, '10', '10', 'АЗС №10', 'Энтиком - АЗС №10', true
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Внешний код STS для торговой точки
  v_ec_id := 'ec-enticom-sts-10';

  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    v_ec_id, v_point_id, 'sts', '10', 'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

END $$;
