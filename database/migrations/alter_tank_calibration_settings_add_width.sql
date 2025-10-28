-- Миграция: Добавление поля tank_width_mm для прямоугольных резервуаров
-- TradeFrame Builder v1.7.9
-- Дата: 2025-10-28
-- Описание: Добавление поля tank_width_mm для хранения ширины прямоугольных резервуаров

-- ============================================================
-- ДОБАВЛЕНИЕ ПОЛЯ tank_width_mm
-- ============================================================

ALTER TABLE tank_calibration_settings
ADD COLUMN IF NOT EXISTS tank_width_mm INTEGER DEFAULT 2000;

-- Комментарий к полю
COMMENT ON COLUMN tank_calibration_settings.tank_width_mm IS 'Ширина резервуара (мм) - используется для прямоугольных резервуаров. Формула объема: V = L × W × H';

-- ============================================================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================

-- Вывод структуры таблицы для проверки
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
  AND column_name = 'tank_width_mm';
