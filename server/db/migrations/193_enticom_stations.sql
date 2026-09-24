-- Сеть «Энтиком» (STS system=29): все станции из /v1/points + приведение №10.
-- 24.09.2026 в /v1/points?system=29 — 17 станций. Живые: №10 и №25 (смены, транзакции,
-- резервуары); №25 работала, но в Мониторе её не было. Остальные пока пустые —
-- заводим заранее, как АЗС Н1 (191). №10 была «Терминал 10» / «Энтиком - Терминал 10» —
-- называем как в STS, описание = место (как у ГИГ и АЗС Н1, 192).
-- Адреса и координаты — из /v1/points. У №21 координаты в STS совпадают с №10 — берём как есть.

DO $$
DECLARE
  v_network_id UUID;
  r RECORD;
BEGIN
  SELECT id INTO v_network_id
  FROM networks
  WHERE external_id = '29' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_network_id IS NULL THEN
    RAISE NOTICE 'Сеть Энтиком (external_id=29) не найдена — пропуск миграции 193';
    RETURN;
  END IF;

  FOR r IN SELECT * FROM (VALUES
    ('5',  'Малая Рукавицкая',        'Вологодская область',     'д. Малая Рукавицкая', 'д. Малая Рукавицкая, ул. Вишневая, 1А',                59.197356, 37.165533),
    ('6',  'Череповец, Рыбинская',    'Вологодская область',     'Череповец',    'г. Череповец, ул. Рыбинская, 59Г',                              59.078672, 37.918620),
    ('10', 'Вологда, Окружное ш., 73Б','Вологодская область',    'Вологда',      'г. Вологда, ш. Окружное, 73Б',                                  59.206000, 39.876988),
    ('17', 'Сазоново',                'Вологодская область',     'д. Сазоново',  'д. Сазоново, ул. Авиации, 86',                                  59.109969, 35.228126),
    ('18', 'Череповец, Северное ш.',  'Вологодская область',     'Череповец',    'г. Череповец, Северное шоссе, 40Б',                             59.156624, 37.802834),
    ('19', 'Вологда, Окружное ш., 8', 'Вологодская область',     'Вологда',      'г. Вологда, ш. Окружное, 8',                                    59.216214, 39.810088),
    ('21', 'Вологда, Можайского',     'Вологодская область',     'Вологда',      'г. Вологда, ул. Можайского, 1',                                 59.206000, 39.876988),
    ('22', 'Грязовец',                'Вологодская область',     'Грязовец',     'г. Грязовец, ул. Ленина, 178',                                  58.859068, 40.248556),
    ('23', 'Кадников',                'Вологодская область',     'Кадников',     'г. Кадников, ул. Кленовая, 1',                                  59.509591, 40.368167),
    ('25', 'Вологда, Пошехонское ш.', 'Вологодская область',     'Вологда',      'г. Вологда, ш. Пошехонское, 33',                                59.187929, 39.855356),
    ('28', 'Вологда, Окружное ш., 15','Вологодская область',     'Вологда',      'г. Вологда, Окружное шоссе, 15',                                59.214640, 39.807692),
    ('29', 'Белозерск',               'Вологодская область',     'Белозерск',    'г. Белозерск, ул. Красноармейская, стр. 68А',                   60.020020, 37.773814),
    ('34', 'Воробьево',               'Вологодская область',     'д. Воробьево', 'д. Воробьево, а/д Чекшино-Тотьма-Никольск',                     59.631528, 40.883779),
    ('36', 'Харовский р-н, 69 км',    'Вологодская область',     'Харовский район', 'Харовский р-н, 69 км а/д Сокол-Харовск-Вожега',             59.954846, 40.157750),
    ('37', 'Сокол',                   'Вологодская область',     'Сокол',        'г. Сокол, ул. Советская, 91',                                   59.468753, 40.101394),
    ('41', 'Козицино',                'Вологодская область',     'д. Козицино',  'д. Козицино, 451+700 км а/д Москва-Архангельск',                59.154337, 39.932262),
    ('49', 'Нижний Новгород',         'Нижегородская область',   'Нижний Новгород', 'г. Нижний Новгород, ул. Удмуртская, 4а',                   56.291229, 43.884633)
  ) AS v(num, descr, region, city, address, lat, lon)
  LOOP
    INSERT INTO trading_points (
      id, network_id, code, external_id, name, description,
      region, city, address, latitude, longitude, is_active
    ) VALUES (
      'enticom-azs-' || r.num, v_network_id, r.num, r.num, 'АЗС №' || r.num,
      r.descr, r.region, r.city, r.address, r.lat, r.lon, true
    )
    ON CONFLICT (id) DO UPDATE SET
      name        = CASE WHEN trading_points.name = 'Терминал ' || r.num THEN EXCLUDED.name ELSE trading_points.name END,
      description = CASE WHEN trading_points.description LIKE 'Энтиком - %' OR COALESCE(trading_points.description, '') = ''
                         THEN EXCLUDED.description ELSE trading_points.description END,
      region      = COALESCE(NULLIF(trading_points.region, ''), EXCLUDED.region),
      city        = COALESCE(NULLIF(trading_points.city, ''), EXCLUDED.city),
      address     = COALESCE(NULLIF(trading_points.address, ''), EXCLUDED.address),
      latitude    = COALESCE(NULLIF(trading_points.latitude, 0), EXCLUDED.latitude),
      longitude   = COALESCE(NULLIF(trading_points.longitude, 0), EXCLUDED.longitude);

    -- Внешний код STS (system=29, station=N)
    INSERT INTO trading_point_external_codes (
      id, trading_point_id, system, code, description, is_active, metadata
    ) VALUES (
      'ec-enticom-sts-' || r.num, 'enticom-azs-' || r.num, 'sts', r.num,
      'Код станции STS (по умолчанию)', true, '{"source": "migration"}'::jsonb
    )
    ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
  END LOOP;
END $$;
