-- Станция Светогорск: STS вернул ей нормальный номер 8 (с 01.07.2026).
-- В июне она временно шла под номером 9008 (миграция 178 завела её так).
-- Транзакции: до 30.06 под stationNumber=9008, с 01.07 под 8.
-- Переводим точку на актуальный номер 8, СОХРАНЯЯ исторический код 9008,
-- чтобы ловить транзакции обоих периодов (фильтр на фронте собирает все
-- STS-коды точки: external_id + external_codes[system='sts']).

DO $$
DECLARE
  v_point_id TEXT := 'gig-azs-9008';
BEGIN
  -- Если точка не существует (миграция 178 не применялась) — пропуск
  IF NOT EXISTS (SELECT 1 FROM trading_points WHERE id = v_point_id) THEN
    RAISE NOTICE 'Точка gig-azs-9008 не найдена — пропуск миграции 179';
    RETURN;
  END IF;

  -- 1. Актуальный номер станции = 8 (по нему идут транзакции с 01.07)
  UPDATE trading_points
     SET code = '8',
         external_id = '8',
         name = 'АЗС №8',
         description = 'Светогорск'
   WHERE id = v_point_id;

  -- 2. Текущий STS-код (8) — по нему матчатся свежие транзакции
  INSERT INTO trading_point_external_codes (
    id, trading_point_id, system, code, description, is_active, metadata
  ) VALUES (
    'ec-gig-sts-8', v_point_id, 'sts', '8',
    'Код станции STS (текущий, с 01.07.2026)', true, '{"source": "migration"}'::jsonb
  )
  ON CONFLICT (trading_point_id, lower(system), code) DO NOTHING;

  -- 3. Исторический STS-код (9008) — транзакции июня под старым номером.
  --    Оставляем запись (создана миграцией 178), обновляем описание.
  UPDATE trading_point_external_codes
     SET description = 'Код станции STS (исторический, июнь 2026: временный №9008)'
   WHERE trading_point_id = v_point_id AND lower(system) = 'sts' AND code = '9008';
END $$;
