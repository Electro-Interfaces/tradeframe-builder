-- Миграция: Добавление колонки calibration_step_mm в tank_calibration_settings
-- Дата: 2025-10-28
-- Описание: Добавляет колонку для хранения шага калибровочной таблицы (в миллиметрах)

-- Добавляем колонку calibration_step_mm
ALTER TABLE tank_calibration_settings 
ADD COLUMN IF NOT EXISTS calibration_step_mm INTEGER DEFAULT 10
CHECK (calibration_step_mm > 0 AND calibration_step_mm <= 1000);

-- Комментарий к колонке
COMMENT ON COLUMN tank_calibration_settings.calibration_step_mm IS 
'Шаг калибровочной таблицы в миллиметрах. По умолчанию 10 мм. Используется для построения геометрической калибровочной таблицы.';

-- Обновляем существующие записи (если есть NULL)
UPDATE tank_calibration_settings 
SET calibration_step_mm = 10 
WHERE calibration_step_mm IS NULL;
