-- Сеть «АЗС Н1» (STS system=71): станции №1, №2, №4–№12 + адрес и координаты у №3.
-- 23.09.2026 все 12 станций появились в /v1/points?system=71. Данные по ним пока
-- не идут (цены, /v1/info, смены, резервуары, транзакции пустые) — точки заводим
-- заранее по решению владельца, наполнятся сами после подключения в STS.
-- Адреса и координаты — из /v1/points. Шаблон: 185_network_azs_n1.sql, 187_gig_azs_235.sql

DO $$
DECLARE
  v_network_id UUID;
  r RECORD;
BEGIN
  SELECT id INTO v_network_id
  FROM networks
  WHERE lower(code) = 'azs-n1' AND deleted_at IS NULL
  LIMIT 1;

  IF v_network_id IS NULL THEN
    RAISE NOTICE 'Сеть АЗС Н1 (azs-n1) не найдена — пропуск миграции 191';
    RETURN;
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('1',  'Тюменская область',     'Тюмень',      'г. Тюмень, ул. Амурская, 181',                             57.150432, 65.478465),
    ('2',  'Тюменская область',     'Тюмень',      'г. Тюмень, ул. Республики, 218',                           57.120333, 65.611634),
    ('3',  'Тюменская область',     'Тюмень',      'г. Тюмень, ул. 50 лет ВЛКСМ, 61',                          57.134063, 65.559492),
    ('4',  'Тюменская область',     'Тюмень',      'г. Тюмень, проезд Заречный, 57',                           57.173738, 65.570312),
    ('5',  'Тюменская область',     'Тюмень',      'г. Тюмень, ул. Институтская, 11',                          57.163704, 65.440651),
    ('6',  'Свердловская область',  'Талица',      'Свердловская область, г. Талица, ул. Вокзальная, 46 "Б"',  57.035784, 63.723133),
    ('7',  'Тюменская область',     'Тюмень',      'г. Тюмень, ул. Новаторов, 12',                             57.114747, 65.614061),
    ('8',  'Тюменская область',     'Ишим',        'Тюменская область, г. Ишим, ул. Республики, 1 "Б"',        56.121188, 69.491186),
    ('9',  'Тюменская область',     'Тюмень',      'г. Тюмень, 318 км. Екатеринбург - Тюмень',                 57.117460, 65.433527),
    ('10', 'Тюменская область',     'Тюмень',      'г. Тюмень, ул. Щербакова, 146/1',                          57.190808, 65.575333),
    ('11', 'Тюменская область',     'Заводоуковск','Тюменская область, г. Заводоуковск, ул. Энергетиков, 43 "Г"', 56.491685, 66.541153),
    ('12', 'Тюменская область',     'Тюмень',      'Тюменская область, 22 км. Тюмень-Омск',                    57.020101, 65.752770)
  ) AS v(num, region, city, address, lat, lon)
  LOOP
    INSERT INTO trading_points (
      id, network_id, code, external_id, name, description,
      region, city, address, latitude, longitude, is_active
    ) VALUES (
      'azs-n1-azs-' || r.num, v_network_id, r.num, r.num, 'АЗС №' || r.num,
      'АЗС Н1 — АЗС №' || r.num, r.region, r.city, r.address, r.lat, r.lon, true
    )
    ON CONFLICT (id) DO UPDATE SET
      region    = COALESCE(NULLIF(trading_points.region, ''), EXCLUDED.region),
      city      = COALESCE(NULLIF(trading_points.city, ''), EXCLUDED.city),
      address   = COALESCE(NULLIF(trading_points.address, ''), EXCLUDED.address),
      latitude  = COALESCE(NULLIF(trading_points.latitude, 0), EXCLUDED.latitude),
      longitude = COALESCE(NULLIF(trading_points.longitude, 0), EXCLUDED.longitude);

    -- Внешний код STS (system=71, station=N)
    INSERT INTO trading_point_external_codes (
      id, trading_point_id, system, code, description, is_active, metadata
    ) VALUES (
      'ec-azs-n1-sts-' || r.num, 'azs-n1-azs-' || r.num, 'sts', r.num,
      'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
    )
    ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
  END LOOP;
END $$;
