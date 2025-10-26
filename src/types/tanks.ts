/**
 * Типы для работы с резервуарами
 */

// Статус датчика
export type SensorStatus = 'ok' | 'warning' | 'error';

// Датчик резервуара
export interface TankSensor {
  name: string;
  status: SensorStatus;
}

// Привязанная ТРК
export interface LinkedPump {
  id: number;
  name: string;
}

// Настройки уведомлений
export interface NotificationSettings {
  critical: boolean;
  minimum: boolean;
  temperature: boolean;
  water: boolean;
}

// Пороговые значения
export interface TankThresholds {
  criticalTemp: {
    min: number;
    max: number;
  };
  maxWaterLevel: number;
  notifications: NotificationSettings;
}

// Настройки уведомлений резервуара
export interface TankNotifications {
  enabled: boolean;
  drainAlerts: boolean;
  levelAlerts: boolean;
}

// Данные от API СТС
export interface STSApiData {
  volumeBegin: number;
  volumeEnd: number;
  massBegin: number;
  massEnd: number;
  releaseVolume: number;
  releaseLiters: number;
  renewedToday: string;
  fuelCode: number;
}

// Данные резервуара от внешнего API (расширенные)
export interface TankApiData {
  temperature?: number;
  level?: string | number;
  water?: {
    level: number;
  };
  density?: number;
  amount_begin?: number;
  amount_end?: number;
  volume_begin?: number;
  volume_end?: number;
  release?: {
    volume: number;
    amount: number;
  };
  dt?: string;
  state?: 'OK' | number;
  fuel?: number;
}

// Основной интерфейс резервуара
export interface Tank {
  id: number | string;
  name: string;
  fuelType: string;
  currentLevelLiters: number;
  capacityLiters: number;
  minLevelPercent: number;
  criticalLevelPercent: number;
  temperature: number;
  waterLevelMm: number;
  density?: number;
  mass?: number;
  sensors: TankSensor[];
  lastCalibration: string;
  linkedPumps: LinkedPump[];
  notifications: TankNotifications;
  thresholds: TankThresholds;
  stsData?: STSApiData;
  apiData?: TankApiData;
}

// Статус резервуара (вычисляемый)
export type TankStatus = 'normal' | 'warning' | 'critical';

// Тип события резервуара
export type TankEventType = 'calibration' | 'delivery' | 'maintenance' | 'alert';

// Статус события
export type TankEventStatus = 'success' | 'completed' | 'warning' | 'in_progress' | 'error' | 'failed';

// События резервуара
export interface TankEvent {
  id: number;
  tankId: number;
  date: string;
  type: TankEventType;
  status: TankEventStatus;
  details: string;
  operator: string;
}

// Калибровка резервуара
export interface TankCalibration {
  id: number;
  tankId: number;
  date: string;
  volume?: number;
  result: 'success' | 'error';
  operator: string;
  notes?: string;
}

// Запись о сливе
export interface DrainageLogEntry {
  id: number;
  date: string;
  tankId: number;
  reason: string;
  volume: number;
  approvedBy: string;
  status: 'approved' | 'completed' | 'pending';
}

// Расширенная запись о сливе
export interface ExpandedDrain {
  id: number;
  date: string;
  tanks: number[];
  totalVolume: number;
  status: 'completed' | 'pending' | 'approved';
  operator: string;
}

// Форма настроек резервуара
export interface TankSettingsFormData {
  minLevelPercent: number;
  criticalLevelPercent: number;
  criticalTemp: {
    min: number;
    max: number;
  };
  maxWaterLevel: number;
  notifications: NotificationSettings;
}

// Форма калибровки
export interface TankCalibrationFormData {
  file?: File;
  notes?: string;
}

// Фильтры для событий
export interface TankEventFilters {
  period: string;
  tankId: string;
  eventType: string;
  status: string;
}

// Запись истории резервуара из /v1/tank_history
export interface TankHistoryRecord {
  number: number;           // Номер резервуара
  fuel: number;             // Код топлива (2=АИ-92, 3=АИ-95, 5=ДТ)
  fuel_name: string;        // Наименование топлива
  state: number;            // Состояние (1=активен)
  volume_begin: string;     // Начальный объем
  volume_end: string;       // Конечный объем
  volume_max: string;       // Максимальная вместимость
  volume_free: string;      // Свободный объем
  volume: string;           // Текущий объем
  amount_begin: string;     // Начальная масса
  amount_end: string;       // Конечная масса
  level: string;            // Уровень в см
  temperature: string;      // Температура в °C
  density: string;          // Плотность в кг/м³
  water: {
    volume: string;         // Объем воды в литрах
    amount: string;         // Масса воды в кг
    level: string;          // Уровень воды в см
  };
  release: {
    volume: string;         // Объем отпущенного топлива в литрах
    amount: string;         // Масса отпущенного топлива в кг
  };
  dt: string;               // Дата и время измерения (ISO 8601)
}

// Период для анализа резервуара
export type AnalysisPeriod = '24h' | '7d' | '30d' | 'custom';

// Параметры запроса истории резервуара
export interface TankHistoryParams {
  system: number;           // Код системы
  station: number;          // Номер ТТ
  dt_beg?: string;          // Начальная дата
  dt_end?: string;          // Конечная дата
}

// Статистика по истории резервуара
export interface TankHistoryStats {
  volume: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  volumeBook?: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  temperature: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  density: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  waterLevel: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
  release: {
    total: number;
    avg: number;
  };
  releaseBook?: {
    total: number;
    avg: number;
  };
}

// Транзакция из /v2/transactions
export interface TransactionItem {
  id: number;
  pos: number;
  shift: number;
  number: number;
  tank: number;              // Номер резервуара
  nozzle: number;            // Номер пистолета
  fuel: number;              // Код топлива
  fuel_name: string;         // Наименование топлива
  quantity: string | number; // Количество (литры) - API возвращает строку!
  cost: string | number;     // Стоимость - API возвращает строку!
  price: string | number;    // Цена за литр - API возвращает строку!
  amount: string | number;   // Масса - API возвращает строку!
  density: string | number;  // Плотность - API возвращает строку!
  order?: string | number;   // Заказанный объем - API возвращает строку!
  card?: string;             // Номер карты (опционально)
  pay_type: {
    id: number;
    name: string;
  };
  dt?: string;               // Дата-время транзакции
}

export interface TransactionV2Response {
  system: number;
  number: number;
  total?: {
    fuels?: Array<{
      service_code: number;
      service_name: string;
      release: {
        volume: number;
        cost: number;
        amount: number;
      };
    }>;
    pay_type?: Array<{
      id: number;
      name: string;
      release: {
        volume: number;
        cost: number;
        amount: number;
      };
    }>;
  };
  items: TransactionItem[];
}

// Поступление нефтепродуктов из /v1/report/receipts
export interface ReceiptItem {
  tank: number;              // Номер резервуара
  ttn: string;               // Номер ТТН
  doc: {                     // По документам
    volume: string | number;          // Объем в литрах - API возвращает строку!
    amount: string | number;          // Масса в кг - API возвращает строку!
    cost?: string | number;           // Стоимость - опционально
    density?: number;        // Плотность
    temp?: number;           // Температура
    discount?: number;       // Скидка
  };
  fact: {                    // Фактически
    volume: string | number; // API возвращает строку!
    amount: string | number; // API возвращает строку!
    cost?: string | number;  // Опционально
    density?: number;
    temp?: number;
    discount?: number;
  };
  dt: string;                // Дата-время
  base?: {                   // Поставщик
    id: number;
    name: string;
  };
  shift?: number;            // Опционально
  fuel?: number;             // Код топлива - опционально
  service?: {
    service_code: number;
    service_name: string;
  };
}

export interface ReceiptResponse {
  system: number;
  number: number;            // Номер ТО
  shifts: Array<{
    number: number;          // Номер смены
    receipt: ReceiptItem[];
  }>;
}

// ============================================
// ТИПЫ ДЛЯ АВТОКАЛИБРОВКИ РЕЗЕРВУАРОВ
// ============================================

// Тип топлива для калибровки
export type CalibrationFuelType = 'gasoline' | 'diesel' | 'gas' | 'propane';

// Форма резервуара
export type TankShape = 'cylindrical' | 'elliptical' | 'rectangular';

// Тип резервуара по форме
export type TankShapeType = 'horizontal_cylinder' | 'vertical_cylinder' | 'spherical' | 'rectangular';

// Расположение резервуара
export type TankLocationType = 'underground' | 'surface';

// Тип датчика уровня
export type LevelSensorType = 'radar' | 'float' | 'capacitive' | 'hydrostatic' | 'other';

// Метод калибровки
export type CalibrationMethod = 'linear_regression' | 'least_squares' | 'moving_average';

// Статус калибровки
export type CalibrationStatus = 'never' | 'in_progress' | 'completed' | 'failed';

// Настройки автокалибровки резервуара
export interface TankCalibrationSettings {
  // ID и привязка
  id?: string;
  tank_id: string;

  // Характеристики резервуара и оборудования
  tank_shape_type: TankShapeType;          // Тип резервуара по форме
  tank_location_type: TankLocationType;    // Расположение резервуара (наземный/подземный)
  tank_diameter_mm: number;                // Диаметр резервуара (мм)
  tank_length_mm: number;                  // Длина резервуара (мм) - для горизонтальных
  tank_height_mm: number;                  // Высота резервуара (мм) - для вертикальных
  tank_tilt_angle_degrees: number;         // Угол наклона (градусы) - для горизонтальных
  level_sensor_type: LevelSensorType;      // Тип датчика уровня
  nozzles_count: number;                   // Количество пистолетов (ТРК)
  dispensers_error_percent: number;        // Погрешность ТРК (%)
  dispensers_error_liters: number;         // Погрешность ТРК (л)
  level_sensor_error_percent: number;      // Погрешность уровнемера (%)
  level_sensor_error_liters: number;       // Погрешность уровнемера (л)
  level_sensor_accuracy_mm: number;        // Точность уровнемера (мм)
  bias_offset_percent: number;             // Смещение в процентах (%)

  // Температурные параметры
  fuel_type: CalibrationFuelType;          // Тип топлива
  thermal_expansion_coefficient: number;    // Коэффициент расширения (1/°C)
  base_temperature: number;                 // Базовая температура (°C)
  temp_gradient_liters_per_degree: number; // Изменение объема (л/°C)
  working_temp_min: number;                 // Мин. рабочая температура (°C)
  working_temp_max: number;                 // Макс. рабочая температура (°C)
  has_thermal_insulation: boolean;          // Наличие теплоизоляции

  // Испарение и усадка
  natural_loss_summer_percent: number;     // Естественная убыль летом (%)
  natural_loss_winter_percent: number;     // Естественная убыль зимой (%)
  discharge_loss_percent: number;          // Потери при сливе (%)

  // Временные параметры
  data_polling_interval_minutes: number;   // Интервал получения данных по остаткам (мин)
  averaging_period_minutes: number;        // Период усреднения (мин)
  analysis_window_days: number;            // Окно анализа (дней)
  tank_rest_time_minutes: number;          // Время покоя резервуара (мин)

  // Пороговые значения для калибровки
  min_change_for_calibration_liters: number;  // Мин. изменение (л)
  max_acceptable_deviation_percent: number;   // Макс. расхождение (%)
  max_acceptable_deviation_liters: number;    // Макс. расхождение (л)
  critical_error_threshold_percent: number;   // Критическая ошибка (%)

  // Пороговые значения уведомлений (% от объёма)
  fuel_level_warning_percent: number;         // Порог предупреждения о низком уровне
  fuel_level_critical_percent: number;        // Критический порог низкого уровня
  fuel_level_max_percent: number;             // Максимальный уровень заполнения (безопасность)

  // Мёртвый остаток и зоны измерений
  dead_stock_liters: number;                  // Технический (мёртвый) остаток (л)
  dead_stock_percent: number;                 // Технический остаток (%)
  sensor_blind_zone_bottom_mm: number;        // Мёртвая зона датчика снизу (мм)
  sensor_blind_zone_top_mm: number;           // Мёртвая зона датчика сверху (мм)

  // Критический уровень воды
  critical_water_level_mm: number;            // Критический уровень воды (мм)

  // Геометрия резервуара
  tank_shape: TankShape;                   // Форма резервуара
  tank_tilt_degrees: number;               // Наклон резервуара (градусы)
  has_calibration_table: boolean;          // Есть ли калибровочная таблица

  // Фильтрация аномалий
  exclude_delivery_periods: boolean;       // Исключать периоды приема
  exclude_maintenance_periods: boolean;    // Исключать ТО
  outlier_filter_enabled: boolean;         // Фильтр выбросов
  outlier_filter_sigma: number;            // Сигма для фильтра выбросов

  // Метод калибровки
  calibration_method: CalibrationMethod;   // Метод расчета
  sensor_weight: number;                   // Вес данных уровнемера (0-1)
  dispenser_weight: number;                // Вес данных ТРК (0-1)
  auto_calibration_enabled: boolean;       // Автоматическая калибровка

  // Метаданные
  last_calibration_date?: string;
  calibration_status: CalibrationStatus;
  created_at?: string;
  updated_at?: string;
}

// Значения по умолчанию для настроек калибровки
export const DEFAULT_CALIBRATION_SETTINGS: Partial<TankCalibrationSettings> = {
  // Характеристики резервуара и оборудования (ГОСТ Р 8.579-2001)
  tank_shape_type: 'horizontal_cylinder', // Горизонтальный цилиндр - самый распространённый на АЗС
  tank_location_type: 'underground',      // Подземный - наиболее распространённый тип на АЗС
  tank_diameter_mm: 2500,                 // Типовой диаметр 2.5 м (25 м³ резервуар)
  tank_length_mm: 6300,                   // Типовая длина 6.3 м (25 м³ резервуар)
  tank_height_mm: 2500,                   // Для вертикальных (если применимо)
  tank_tilt_angle_degrees: 0,             // Обычно 0-3° для горизонтальных
  level_sensor_type: 'radar',             // Радарный - наиболее точный
  nozzles_count: 2,                      // Обычно 2-4 пистолета на резервуар
  dispensers_error_percent: 0.25,        // ±0.25% коммерческие АЗС (ГОСТ 9018-89, с 2024г обязательно)
  dispensers_error_liters: 50,
  level_sensor_error_percent: 0.1,       // ±0.1% для радарных датчиков (БАРС351И, Rosemount 5300)
  level_sensor_error_liters: 30,
  level_sensor_accuracy_mm: 1,           // ±1мм для радарных датчиков (высокоточные модели)
  bias_offset_percent: 0,

  // Температурные параметры
  thermal_expansion_coefficient: 0.00083,  // Для бензина АИ-92/95
  base_temperature: 15,
  temp_gradient_liters_per_degree: 10,
  working_temp_min: -40,
  working_temp_max: 50,
  has_thermal_insulation: false,           // Обычно подземные резервуары без изоляции

  // Испарение и усадка (Приказ Минэнерго № 281 от 16.04.2018)
  natural_loss_summer_percent: 0.08,     // Весенне-летний период (%) - Бензин автомобильный
  natural_loss_winter_percent: 0.03,     // Осенне-зимний период (%) - Бензин автомобильный
  discharge_loss_percent: 0.15,

  // Временные параметры
  data_polling_interval_minutes: 10,   // Опрос каждые 10 минут
  averaging_period_minutes: 60,
  analysis_window_days: 30,
  tank_rest_time_minutes: 30,

  // Пороговые значения для калибровки
  min_change_for_calibration_liters: 100,
  max_acceptable_deviation_percent: 2,
  max_acceptable_deviation_liters: 500,
  critical_error_threshold_percent: 5,

  // Пороговые значения уведомлений (как на странице Оборудование)
  fuel_level_warning_percent: 20,       // ⚠️ Предупреждение при уровне ≤20%
  fuel_level_critical_percent: 10,      // 🔴 Критично при уровне ≤10%
  fuel_level_max_percent: 95,           // 🔼 Максимальный уровень: Бензин/ДТ 95%, Пропан 85%

  // Мёртвый остаток (технический остаток под заливной трубой)
  dead_stock_liters: 0,                 // Рассчитывается индивидуально
  dead_stock_percent: 0,                // Обычно 0-6% от объёма
  sensor_blind_zone_bottom_mm: 100,     // Мёртвая зона снизу (~100-200 мм)
  sensor_blind_zone_top_mm: 100,        // Мёртвая зона сверху (~100-200 мм)

  // Критический уровень воды (требует откачки)
  critical_water_level_mm: 50,          // Обычно 30-50 мм

  // Геометрия
  tank_shape: 'cylindrical',
  tank_tilt_degrees: 0,
  has_calibration_table: false,

  // Фильтрация
  exclude_delivery_periods: true,
  exclude_maintenance_periods: true,
  outlier_filter_enabled: true,
  outlier_filter_sigma: 3,

  // Метод калибровки
  calibration_method: 'least_squares',
  sensor_weight: 0.6,
  dispenser_weight: 0.4,
  auto_calibration_enabled: false,

  calibration_status: 'never',
}

// ============================================================
// Калибровочные таблицы резервуаров
// ============================================================

// Точка калибровочной таблицы
export interface CalibrationTablePoint {
  level_mm: number;        // Высота уровня в мм
  volume_liters: number;   // Соответствующий объем в литрах
}

// Статус калибровочной таблицы
export type CalibrationTableStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';

// Статистика расчета калибровочной таблицы
export interface CalibrationTableStatistics {
  data_points_total: number;      // Всего точек данных
  data_points_filtered: number;   // Отфильтровано точек
  data_points_used: number;       // Использовано для расчета
  average_deviation_percent: number;  // Среднее отклонение
  max_deviation_percent: number;      // Максимальное отклонение
  r_squared: number;              // Коэффициент детерминации
  rmse?: number;                  // Root Mean Square Error
}

// Сравнение с предыдущей таблицей
export interface CalibrationTableComparison {
  has_previous: boolean;
  average_difference_percent?: number;
  max_difference_percent?: number;
  max_difference_level_mm?: number;
  points_with_significant_change?: number;
}

// Калибровочная таблица резервуара
export interface CalibrationTable {
  id: string;
  tank_id: string;
  version: number;
  is_active: boolean;
  status: CalibrationTableStatus;

  // Данные таблицы (в реальности будут зашифрованы на сервере)
  table: CalibrationTablePoint[];

  // Период анализа
  analysis_start_date: string;
  analysis_end_date: string;

  // Снимок параметров, использованных при расчете
  calibration_settings_snapshot?: TankCalibrationSettings;

  // Статистика и сравнение
  statistics?: CalibrationTableStatistics;
  comparison_with_previous?: CalibrationTableComparison;

  // Workflow
  created_by?: string;
  created_at: string;
  creation_notes?: string;

  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;

  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;

  applied_by?: string;
  applied_at?: string;

  updated_at: string;
}

// Параметры для расчета калибровочной таблицы
export interface CalculateCalibrationTableParams {
  tank_id: string;
  period: {
    days_back?: number;      // Последние N дней
    start_date?: string;     // Или произвольный период
    end_date?: string;
  };
  notes?: string;            // Примечания к расчету
}

// Результат расчета калибровочной таблицы
export interface CalculateCalibrationTableResult {
  success: boolean;
  calibration_id?: string;
  table?: CalibrationTablePoint[];
  statistics?: CalibrationTableStatistics;
  comparison?: CalibrationTableComparison;
  error?: string;
}
