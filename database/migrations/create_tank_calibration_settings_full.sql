-- Полная миграция: Создание таблицы tank_calibration_settings со всеми полями
-- TradeFrame Builder v1.5.79+
-- Дата: 2025-10-28
-- Описание: Создание таблицы с полным набором полей из TypeScript типа TankCalibrationSettings

-- ============================================================
-- СОЗДАНИЕ ТАБЛИЦЫ
-- ============================================================

CREATE TABLE IF NOT EXISTS tank_calibration_settings (
  -- ============================================================
  -- ID и привязка
  -- ============================================================
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id TEXT NOT NULL UNIQUE,

  -- ============================================================
  -- Характеристики резервуара и оборудования
  -- ============================================================
  tank_shape_type TEXT DEFAULT 'horizontal_cylinder'
    CHECK (tank_shape_type IN ('horizontal_cylinder', 'vertical_cylinder', 'spherical', 'rectangular')),
  tank_location_type TEXT DEFAULT 'underground'
    CHECK (tank_location_type IN ('underground', 'surface')),
  tank_diameter_mm INTEGER DEFAULT 2500,
  tank_length_mm INTEGER DEFAULT 6300,
  tank_height_mm INTEGER DEFAULT 2500,
  tank_tilt_angle_degrees NUMERIC(5,2) DEFAULT 0,
  level_sensor_type TEXT DEFAULT 'radar'
    CHECK (level_sensor_type IN ('radar', 'float', 'capacitive', 'hydrostatic', 'other')),
  nozzles_count INTEGER DEFAULT 2,

  -- ============================================================
  -- Погрешности оборудования
  -- ============================================================
  dispensers_error_percent NUMERIC(5,2) DEFAULT 0.25,
  dispensers_error_liters NUMERIC(10,2) DEFAULT 50,
  level_sensor_error_percent NUMERIC(5,2) DEFAULT 0.1,
  level_sensor_error_liters NUMERIC(10,2) DEFAULT 30,
  level_sensor_accuracy_mm NUMERIC(5,2) DEFAULT 1,
  bias_offset_percent NUMERIC(5,2) DEFAULT 0,

  -- ============================================================
  -- Температурные параметры
  -- ============================================================
  fuel_type TEXT DEFAULT 'gasoline'
    CHECK (fuel_type IN ('gasoline', 'diesel', 'gas', 'propane')),
  thermal_expansion_coefficient NUMERIC(10,6) DEFAULT 0.00083,
  base_temperature NUMERIC(5,2) DEFAULT 15,
  temp_gradient_liters_per_degree NUMERIC(10,2) DEFAULT 10,
  working_temp_min NUMERIC(5,2) DEFAULT -40,
  working_temp_max NUMERIC(5,2) DEFAULT 50,
  has_thermal_insulation BOOLEAN DEFAULT FALSE,

  -- ============================================================
  -- Испарение и усадка
  -- ============================================================
  natural_loss_summer_percent NUMERIC(5,2) DEFAULT 0.08,
  natural_loss_winter_percent NUMERIC(5,2) DEFAULT 0.03,
  discharge_loss_percent NUMERIC(5,3) DEFAULT 0.15,

  -- ============================================================
  -- Временные параметры
  -- ============================================================
  data_polling_interval_minutes INTEGER DEFAULT 10,
  averaging_period_minutes INTEGER DEFAULT 60,
  analysis_window_days INTEGER DEFAULT 30,
  tank_rest_time_minutes INTEGER DEFAULT 30,

  -- ============================================================
  -- Пороговые значения для калибровки
  -- ============================================================
  min_change_for_calibration_liters NUMERIC(10,2) DEFAULT 100,
  max_acceptable_deviation_percent NUMERIC(5,2) DEFAULT 2,
  max_acceptable_deviation_liters NUMERIC(10,2) DEFAULT 500,
  critical_error_threshold_percent NUMERIC(5,2) DEFAULT 5,

  -- ============================================================
  -- Пороговые значения уведомлений (% от объёма)
  -- ============================================================
  fuel_level_warning_percent NUMERIC(5,2) DEFAULT 20,
  fuel_level_critical_percent NUMERIC(5,2) DEFAULT 10,
  fuel_level_max_percent NUMERIC(5,2) DEFAULT 95,

  -- ============================================================
  -- Мёртвый остаток и зоны измерений
  -- ============================================================
  dead_stock_liters NUMERIC(10,2) DEFAULT 0,
  dead_stock_percent NUMERIC(5,2) DEFAULT 0,
  sensor_blind_zone_bottom_mm INTEGER DEFAULT 100,
  sensor_blind_zone_top_mm INTEGER DEFAULT 100,

  -- ============================================================
  -- Критический уровень воды
  -- ============================================================
  critical_water_level_mm INTEGER DEFAULT 50,

  -- ============================================================
  -- Геометрия резервуара (legacy поля для обратной совместимости)
  -- ============================================================
  tank_shape TEXT DEFAULT 'cylindrical'
    CHECK (tank_shape IN ('cylindrical', 'elliptical', 'rectangular')),
  tank_tilt_degrees NUMERIC(5,2) DEFAULT 0,
  has_calibration_table BOOLEAN DEFAULT FALSE,

  -- ============================================================
  -- Фильтрация аномалий
  -- ============================================================
  exclude_delivery_periods BOOLEAN DEFAULT TRUE,
  exclude_maintenance_periods BOOLEAN DEFAULT TRUE,
  outlier_filter_enabled BOOLEAN DEFAULT TRUE,
  outlier_filter_sigma NUMERIC(5,2) DEFAULT 3,

  -- ============================================================
  -- Метод калибровки
  -- ============================================================
  calibration_method TEXT DEFAULT 'least_squares'
    CHECK (calibration_method IN ('linear_regression', 'least_squares', 'moving_average')),
  sensor_weight NUMERIC(3,2) DEFAULT 0.6,
  dispenser_weight NUMERIC(3,2) DEFAULT 0.4,
  auto_calibration_enabled BOOLEAN DEFAULT FALSE,

  -- ============================================================
  -- JSONB для будущих расширений
  -- ============================================================
  custom_params JSONB DEFAULT '{}'::jsonb,

  -- ============================================================
  -- Метаданные
  -- ============================================================
  last_calibration_date TIMESTAMPTZ,
  calibration_status TEXT DEFAULT 'never'
    CHECK (calibration_status IN ('never', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECK CONSTRAINTS
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
-- ИНДЕКСЫ
-- ============================================================

-- Индекс для быстрого поиска по tank_id
CREATE INDEX IF NOT EXISTS idx_tank_calibration_tank_id
  ON tank_calibration_settings(tank_id);

-- Индекс для поиска резервуаров с автокалибровкой
CREATE INDEX IF NOT EXISTS idx_tank_calibration_auto_enabled
  ON tank_calibration_settings(auto_calibration_enabled)
  WHERE auto_calibration_enabled = TRUE;

-- Индекс для поиска по статусу калибровки
CREATE INDEX IF NOT EXISTS idx_tank_calibration_status
  ON tank_calibration_settings(calibration_status);

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
-- ТРИГГЕРЫ
-- ============================================================

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_tank_calibration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER trigger_tank_calibration_updated_at
  BEFORE UPDATE ON tank_calibration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_calibration_updated_at();

-- ============================================================
-- КОММЕНТАРИИ К ТАБЛИЦЕ И ПОЛЯМ
-- ============================================================

COMMENT ON TABLE tank_calibration_settings IS
  'Настройки автокалибровки резервуаров для точного учета топлива';

COMMENT ON COLUMN tank_calibration_settings.tank_id IS
  'ID резервуара (может быть строковым или числовым)';

COMMENT ON COLUMN tank_calibration_settings.tank_shape_type IS
  'Тип резервуара по форме: horizontal_cylinder, vertical_cylinder, spherical, rectangular';

COMMENT ON COLUMN tank_calibration_settings.tank_location_type IS
  'Расположение: underground (подземный), surface (наземный)';

COMMENT ON COLUMN tank_calibration_settings.level_sensor_type IS
  'Тип датчика: radar, float, capacitive, hydrostatic, other';

COMMENT ON COLUMN tank_calibration_settings.nozzles_count IS
  'Количество пистолетов (ТРК), привязанных к резервуару';

COMMENT ON COLUMN tank_calibration_settings.fuel_level_warning_percent IS
  'Порог предупреждения о низком уровне (% от объёма)';

COMMENT ON COLUMN tank_calibration_settings.fuel_level_critical_percent IS
  'Критический порог низкого уровня (% от объёма)';

COMMENT ON COLUMN tank_calibration_settings.fuel_level_max_percent IS
  'Максимальный уровень заполнения (% от объёма, для безопасности)';

COMMENT ON COLUMN tank_calibration_settings.dead_stock_liters IS
  'Технический (мёртвый) остаток под заливной трубой (литры)';

COMMENT ON COLUMN tank_calibration_settings.dead_stock_percent IS
  'Технический остаток (% от объёма)';

COMMENT ON COLUMN tank_calibration_settings.sensor_blind_zone_bottom_mm IS
  'Мёртвая зона датчика уровня снизу (мм)';

COMMENT ON COLUMN tank_calibration_settings.sensor_blind_zone_top_mm IS
  'Мёртвая зона датчика уровня сверху (мм)';

COMMENT ON COLUMN tank_calibration_settings.critical_water_level_mm IS
  'Критический уровень воды, требующий откачки (мм)';

COMMENT ON COLUMN tank_calibration_settings.custom_params IS
  'JSONB для хранения дополнительных/экспериментальных параметров';

COMMENT ON COLUMN tank_calibration_settings.calibration_method IS
  'Метод расчета калибровки: linear_regression, least_squares, moving_average';

COMMENT ON COLUMN tank_calibration_settings.calibration_status IS
  'Статус последней калибровки: never, in_progress, completed, failed';

-- ============================================================
-- RLS ПОЛИТИКИ (опционально)
-- ============================================================

-- Раскомментируйте для включения Row Level Security:

-- ALTER TABLE tank_calibration_settings ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем аутентифицированным пользователям
-- CREATE POLICY "Allow authenticated users to read calibration settings"
--   ON tank_calibration_settings FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Разрешить запись только администраторам
-- CREATE POLICY "Allow admins to manage calibration settings"
--   ON tank_calibration_settings FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- ПРОВЕРКА СОЗДАНИЯ
-- ============================================================

-- Выводим структуру таблицы
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
ORDER BY ordinal_position;

-- Подсчитываем количество полей
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings';

-- Проверяем constraint'ы
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'tank_calibration_settings';

-- Проверяем индексы
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tank_calibration_settings';
