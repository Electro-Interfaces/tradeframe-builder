-- Миграция: Изменение точности поля bias_offset_percent
-- TradeFrame Builder v1.7.10
-- Дата: 2025-10-28
-- Описание: Изменение типа bias_offset_percent с NUMERIC(5,2) на NUMERIC(6,3)
--           для поддержки 3 знаков после запятой и отрицательных значений

-- ============================================================
-- ИЗМЕНЕНИЕ ТИПА ПОЛЯ bias_offset_percent
-- ============================================================

-- Изменяем тип с NUMERIC(5,2) на NUMERIC(6,3)
-- Это позволит хранить значения от -999.999 до 999.999
ALTER TABLE tank_calibration_settings
ALTER COLUMN bias_offset_percent TYPE NUMERIC(6,3);

-- Обновляем комментарий
COMMENT ON COLUMN tank_calibration_settings.bias_offset_percent IS
  'Допустимое колебание показаний для фильтрации выбросов (%).
   Может быть отрицательным, точность до 3 знаков после запятой (0.001%)';

-- ============================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================

-- Вывод информации о поле для проверки
SELECT
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  column_default
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
  AND column_name = 'bias_offset_percent';
