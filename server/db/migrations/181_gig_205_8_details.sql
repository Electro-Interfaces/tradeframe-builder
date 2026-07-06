-- Уточнение данных станций ГИГ 205 (Брусничное) и 8 (Светогорск), Норд-Лайн:
-- реальные адреса, координаты и MSTO-коды (Id у агента) для онлайн-заказов.
-- Данные предоставлены владельцем (Норд-Лайн).

DO $$
BEGIN
  -- ── АЗС №205 — Брусничное ──────────────────────────────
  IF EXISTS (SELECT 1 FROM trading_points WHERE id = 'gig-azs-205') THEN
    UPDATE trading_points
       SET description = 'Брусничное',
           region      = 'Ленинградская область',
           city        = 'г. Выборг',
           address     = 'Брусничное шоссе, д. 12',
           latitude    = 60.8057,
           longitude   = 28.7106
     WHERE id = 'gig-azs-205';

    -- MSTO-код (онлайн-заказы: Id у агента = 144)
    INSERT INTO trading_point_external_codes (
      id, trading_point_id, system, code, description, is_active, metadata
    ) VALUES (
      'ec-gig-msto-205', 'gig-azs-205', 'msto', '144',
      'Id у агента', true, '{"source": "migration", "ownerId": "15205"}'::jsonb
    )
    ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
  END IF;

  -- ── АЗС №8 — Светогорск (точный адрес/координаты) ──────
  IF EXISTS (SELECT 1 FROM trading_points WHERE id = 'gig-azs-9008') THEN
    UPDATE trading_points
       SET description = 'Светогорск',
           region      = 'Ленинградская область',
           city        = 'г. Светогорск',
           address     = 'улица Победы, д. 3',
           latitude    = 61.1212,
           longitude   = 28.8493
     WHERE id = 'gig-azs-9008';

    -- MSTO-код (онлайн-заказы: Id у агента = 145)
    INSERT INTO trading_point_external_codes (
      id, trading_point_id, system, code, description, is_active, metadata
    ) VALUES (
      'ec-gig-msto-8', 'gig-azs-9008', 'msto', '145',
      'Id у агента', true, '{"source": "migration", "ownerId": "15008"}'::jsonb
    )
    ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;
  END IF;
END $$;
