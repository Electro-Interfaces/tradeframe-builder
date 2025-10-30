-- Миграция: Добавление недостающих полей в tank_calibration_settings
-- TradeFrame Builder v1.5.79+
-- Дата: 2025-10-28
-- Описание: Приведение SQL схемы в соответствие с TypeScript типом TankCalibrationSettings

-- ============================================================
-- ЭТАП 1: Добавление новых полей
-- ============================================================

-- Характеристики резервуара и оборудования
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS tank_shape_type TEXT DEFAULT 'horizontal_cylinder'
    CHECK (tank_shape_type IN ('horizontal_cylinder', 'vertical_cylinder', 'spherical', 'rectangular')),
  ADD COLUMN IF NOT EXISTS tank_location_type TEXT DEFAULT 'underground'
    CHECK (tank_location_type IN ('underground', 'surface')),
  ADD COLUMN IF NOT EXISTS tank_diameter_mm INTEGER DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS tank_length_mm INTEGER DEFAULT 6300,
  ADD COLUMN IF NOT EXISTS tank_height_mm INTEGER DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS tank_tilt_angle_degrees NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_sensor_type TEXT DEFAULT 'radar'
    CHECK (level_sensor_type IN ('radar', 'float', 'capacitive', 'hydrostatic', 'other')),
  ADD COLUMN IF NOT EXISTS nozzles_count INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS bias_offset_percent NUMERIC(5,2) DEFAULT 0;

-- Температурные параметры (дополнительные)
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS has_thermal_insulation BOOLEAN DEFAULT FALSE;

-- Временные параметры (дополнительные)
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS data_polling_interval_minutes INTEGER DEFAULT 10;

-- Пороговые значения уведомлений (% от объёма)
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS fuel_level_warning_percent NUMERIC(5,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS fuel_level_critical_percent NUMERIC(5,2) DEFAULT 10,
  ADD COLUMN IF NOT EXISTS fuel_level_max_percent NUMERIC(5,2) DEFAULT 95;

-- Мёртвый остаток и зоны измерений
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS dead_stock_liters NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dead_stock_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sensor_blind_zone_bottom_mm INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sensor_blind_zone_top_mm INTEGER DEFAULT 100;

-- Критический уровень воды
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS critical_water_level_mm INTEGER DEFAULT 50;

-- JSONB для будущих расширений
ALTER TABLE tank_calibration_settings
  ADD COLUMN IF NOT EXISTS custom_params JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- ЭТАП 2: Обновление существующих CHECK constraints
-- ============================================================

-- Добавляем 'propane' в fuel_type (для пропана)
ALTER TABLE tank_calibration_settings
  DROP CONSTRAINT IF EXISTS tank_calibration_settings_fuel_type_check;

ALTER TABLE tank_calibration_settings
  ADD CONSTRAINT tank_calibration_settings_fuel_type_check
  CHECK (fuel_type IN ('gasoline', 'diesel', 'gas', 'propane'));

-- ============================================================
-- ЭТАП 3: Добавление CHECK constraints для новых полей
-- ============================================================

-- Проверка корректности порогов уведомлений
ALTER TABLE tank_calibration_settings
  ADD CONSTRAINT check_fuel_level_thresholds
  CHECK (
    fuel_level_critical_percent < fuel_level_warning_percent
    AND fuel_level_warning_percent < fuel_level_max_percent
  );

-- Проверка положительных размеров резервуара
ALTER TABLE tank_calibration_settings
  ADD CONSTRAINT check_positive_dimensions
  CHECK (
    tank_diameter_mm > 0
    AND tank_length_mm > 0
    AND tank_height_mm > 0
  );

-- Проверка погрешностей (0-100%)
ALTER TABLE tank_calibration_settings
  ADD CONSTRAINT check_error_percent_range
  CHECK (
    dispensers_error_percent BETWEEN 0 AND 100
    AND level_sensor_error_percent BETWEEN 0 AND 100
    AND bias_offset_percent BETWEEN -100 AND 100
  );

-- Проверка количества пистолетов (1-8)
ALTER TABLE tank_calibration_settings
  ADD CONSTRAINT check_nozzles_count_range
  CHECK (nozzles_count BETWEEN 1 AND 8);

-- ============================================================
-- ЭТАП 4: Создание индексов для новых полей
-- ============================================================

-- GIN индекс для JSONB custom_params (для быстрого поиска)
CREATE INDEX IF NOT EXISTS idx_tank_calibration_custom_params
  ON tank_calibration_settings USING gin(custom_params);

-- Индекс для поиска по типу резервуара
CREATE INDEX IF NOT EXISTS idx_tank_calibration_shape_type
  ON tank_calibration_settings(tank_shape_type);

-- Индекс для поиска по типу топлива
CREATE INDEX IF NOT EXISTS idx_tank_calibration_fuel_type
  ON tank_calibration_settings(fuel_type);

-- ============================================================
-- ЭТАП 5: Обновление комментариев
-- ============================================================

COMMENT ON COLUMN tank_calibration_settings.tank_shape_type IS 'Тип резервуара по форме: horizontal_cylinder, vertical_cylinder, spherical, rectangular';
COMMENT ON COLUMN tank_calibration_settings.tank_location_type IS 'Расположение: underground (подземный), surface (наземный)';
COMMENT ON COLUMN tank_calibration_settings.level_sensor_type IS 'Тип датчика: radar, float, capacitive, hydrostatic, other';
COMMENT ON COLUMN tank_calibration_settings.nozzles_count IS 'Количество пистолетов (ТРК), привязанных к резервуару';
COMMENT ON COLUMN tank_calibration_settings.fuel_level_warning_percent IS 'Порог предупреждения о низком уровне (% от объёма)';
COMMENT ON COLUMN tank_calibration_settings.fuel_level_critical_percent IS 'Критический порог низкого уровня (% от объёма)';
COMMENT ON COLUMN tank_calibration_settings.fuel_level_max_percent IS 'Максимальный уровень заполнения (% от объёма, для безопасности)';
COMMENT ON COLUMN tank_calibration_settings.dead_stock_liters IS 'Технический (мёртвый) остаток под заливной трубой (литры)';
COMMENT ON COLUMN tank_calibration_settings.dead_stock_percent IS 'Технический остаток (% от объёма)';
COMMENT ON COLUMN tank_calibration_settings.sensor_blind_zone_bottom_mm IS 'Мёртвая зона датчика уровня снизу (мм)';
COMMENT ON COLUMN tank_calibration_settings.sensor_blind_zone_top_mm IS 'Мёртвая зона датчика уровня сверху (мм)';
COMMENT ON COLUMN tank_calibration_settings.critical_water_level_mm IS 'Критический уровень воды, требующий откачки (мм)';
COMMENT ON COLUMN tank_calibration_settings.custom_params IS 'JSONB для хранения дополнительных/экспериментальных параметров';

-- ============================================================
-- ЭТАП 6: Миграция данных (если есть старые записи)
-- ============================================================

-- Копируем tank_tilt_degrees в tank_tilt_angle_degrees (если заполнено)
UPDATE tank_calibration_settings
SET tank_tilt_angle_degrees = tank_tilt_degrees
WHERE tank_tilt_degrees IS NOT NULL AND tank_tilt_degrees != 0;

-- Устанавливаем fuel_level_max_percent в зависимости от типа топлива
UPDATE tank_calibration_settings
SET fuel_level_max_percent = CASE
  WHEN fuel_type IN ('propane', 'gas') THEN 85  -- Пропан/газ: 85%
  ELSE 95  -- Бензин/дизель: 95%
END
WHERE fuel_level_max_percent = 95;

-- ============================================================
-- ЭТАП 7: Удаление устаревших полей (опционально)
-- ============================================================

-- ВНИМАНИЕ: Раскомментировать только после проверки, что tank_tilt_degrees больше не используется
-- ALTER TABLE tank_calibration_settings DROP COLUMN IF EXISTS tank_tilt_degrees;

-- ВНИМАНИЕ: Раскомментировать только после проверки, что tank_shape больше не используется
-- ALTER TABLE tank_calibration_settings DROP COLUMN IF EXISTS tank_shape;

-- ============================================================
-- ПРОВЕРКА МИГРАЦИИ
-- ============================================================

-- Проверяем структуру таблицы
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
ORDER BY ordinal_position;

-- Проверяем constraint'ы
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'tank_calibration_settings';

-- Проверяем индексы
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tank_calibration_settings';
