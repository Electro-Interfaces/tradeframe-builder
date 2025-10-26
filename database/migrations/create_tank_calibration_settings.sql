-- Таблица для хранения настроек автокалибровки резервуаров
-- TradeFrame Builder v1.5.76+

CREATE TABLE IF NOT EXISTS tank_calibration_settings (
  -- ID и привязка
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id TEXT NOT NULL UNIQUE,

  -- Погрешности оборудования
  dispensers_error_percent NUMERIC(5,2) DEFAULT 0.5,
  dispensers_error_liters NUMERIC(10,2) DEFAULT 50,
  level_sensor_error_percent NUMERIC(5,2) DEFAULT 0.3,
  level_sensor_error_liters NUMERIC(10,2) DEFAULT 30,
  level_sensor_accuracy_mm NUMERIC(5,2) DEFAULT 2,

  -- Температурные параметры
  fuel_type TEXT DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'gas')),
  thermal_expansion_coefficient NUMERIC(10,6) DEFAULT 0.0012,
  base_temperature NUMERIC(5,2) DEFAULT 15,
  temp_gradient_liters_per_degree NUMERIC(10,2) DEFAULT 10,
  working_temp_min NUMERIC(5,2) DEFAULT -40,
  working_temp_max NUMERIC(5,2) DEFAULT 50,

  -- Испарение и усадка
  natural_loss_summer_percent NUMERIC(5,2) DEFAULT 0.8,
  natural_loss_winter_percent NUMERIC(5,2) DEFAULT 0.3,
  discharge_loss_percent NUMERIC(5,3) DEFAULT 0.15,

  -- Временные параметры
  averaging_period_minutes INTEGER DEFAULT 60,
  analysis_window_days INTEGER DEFAULT 30,
  tank_rest_time_minutes INTEGER DEFAULT 30,

  -- Пороговые значения
  min_change_for_calibration_liters NUMERIC(10,2) DEFAULT 100,
  max_acceptable_deviation_percent NUMERIC(5,2) DEFAULT 2,
  max_acceptable_deviation_liters NUMERIC(10,2) DEFAULT 500,
  critical_error_threshold_percent NUMERIC(5,2) DEFAULT 5,

  -- Геометрия резервуара
  tank_shape TEXT DEFAULT 'cylindrical' CHECK (tank_shape IN ('cylindrical', 'elliptical', 'rectangular')),
  tank_tilt_degrees NUMERIC(5,2) DEFAULT 0,
  has_calibration_table BOOLEAN DEFAULT FALSE,

  -- Фильтрация аномалий
  exclude_delivery_periods BOOLEAN DEFAULT TRUE,
  exclude_maintenance_periods BOOLEAN DEFAULT TRUE,
  outlier_filter_enabled BOOLEAN DEFAULT TRUE,
  outlier_filter_sigma NUMERIC(5,2) DEFAULT 3,

  -- Метод калибровки
  calibration_method TEXT DEFAULT 'least_squares' CHECK (calibration_method IN ('linear_regression', 'least_squares', 'moving_average')),
  sensor_weight NUMERIC(3,2) DEFAULT 0.6,
  dispenser_weight NUMERIC(3,2) DEFAULT 0.4,
  auto_calibration_enabled BOOLEAN DEFAULT FALSE,

  -- Метаданные
  last_calibration_date TIMESTAMPTZ,
  calibration_status TEXT DEFAULT 'never' CHECK (calibration_status IN ('never', 'in_progress', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по tank_id
CREATE INDEX IF NOT EXISTS idx_tank_calibration_tank_id ON tank_calibration_settings(tank_id);

-- Индекс для поиска резервуаров с автокалибровкой
CREATE INDEX IF NOT EXISTS idx_tank_calibration_auto_enabled ON tank_calibration_settings(auto_calibration_enabled) WHERE auto_calibration_enabled = TRUE;

-- Индекс для поиска по статусу калибровки
CREATE INDEX IF NOT EXISTS idx_tank_calibration_status ON tank_calibration_settings(calibration_status);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_tank_calibration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tank_calibration_updated_at
  BEFORE UPDATE ON tank_calibration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_tank_calibration_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE tank_calibration_settings IS 'Настройки автокалибровки резервуаров для точного учета топлива';
COMMENT ON COLUMN tank_calibration_settings.tank_id IS 'ID резервуара (может быть строковым или числовым)';
COMMENT ON COLUMN tank_calibration_settings.calibration_method IS 'Метод расчета калибровки: linear_regression, least_squares, moving_average';
COMMENT ON COLUMN tank_calibration_settings.calibration_status IS 'Статус последней калибровки: never, in_progress, completed, failed';

-- RLS политики (опционально, если используется Row Level Security)
-- ALTER TABLE tank_calibration_settings ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем аутентифицированным пользователям
-- CREATE POLICY "Allow authenticated users to read calibration settings"
--   ON tank_calibration_settings FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Разрешить запись только администраторам
-- CREATE POLICY "Allow admins to manage calibration settings"
--   ON tank_calibration_settings FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');
