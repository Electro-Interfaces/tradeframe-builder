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
  noSensorData?: boolean;  // Нет данных от уровнемера, используется книжный остаток
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
export type CalibrationMethod = 'geometric' | 'mathematical' | 'combined';

// Источник опорной точки
export type ReferenceSource = 'geometry' | 'current_table' | 'manual';

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

// Диагностика процесса калибровки
export interface CalibrationDiagnostics {
  segmentsCount: number;
  totalPointsBeforeFilter: number;
  totalPointsAfterFilter: number;
  receiptsProcessed: number;
  transactionsProcessed: number;
  temperatureCorrectionApplied: boolean;
  blindZonesFiltered: number;
  warnings: string[];
  // Опорная точка для отображения на графике
  referencePoint?: {
    level_mm: number;
    volume_liters: number;
  };
}

// Результат расчета калибровочной таблицы
export interface CalculateCalibrationTableResult {
  success: boolean;
  calibration_id?: string;
  table?: CalibrationTablePoint[];
  statistics?: CalibrationTableStatistics;
  comparison?: CalibrationTableComparison;
  diagnostics?: CalibrationDiagnostics;
  error?: string;
}

// Настройки калибровки резервуара
export interface TankCalibrationSettings {
  tank_id: string;
  tank_shape_type: TankShapeType;
  tank_location_type: TankLocationType;
  tank_diameter_mm: number;
  tank_length_mm: number;
  tank_width_mm: number;
  tank_height_mm: number;
  tank_tilt_angle_degrees: number;

  level_sensor_type: LevelSensorType;
  level_sensor_error_percent: number;
  level_sensor_accuracy_mm: number;

  fuel_type: CalibrationFuelType;
  thermal_expansion_coefficient: number;
  base_temperature: number;
  working_temp_min: number;
  working_temp_max: number;

  has_thermal_insulation: boolean;

  natural_loss_summer_percent: number;
  natural_loss_winter_percent: number;
  discharge_loss_percent: number;

  data_polling_interval_minutes: number;
  averaging_period_minutes: number;
  tank_rest_time_minutes: number;

  fuel_level_warning_percent: number;
  fuel_level_critical_percent: number;
  fuel_level_max_percent: number;

  dead_stock_liters: number;
  dead_stock_percent: number;
  sensor_blind_zone_bottom_mm: number;
  sensor_blind_zone_top_mm: number;
  critical_water_level_mm: number;

  calibration_method: CalibrationMethod;
  calibration_step_mm: number;
  bias_offset_percent: number;

  nozzles_count: number;

  calibration_status: 'never' | 'in_progress' | 'completed' | 'failed';
  last_calibration_date?: string;

  // Источник опорной точки
  reference_source: ReferenceSource;
  manual_reference_volume?: number;
}

export const DEFAULT_CALIBRATION_SETTINGS: Omit<TankCalibrationSettings, 'tank_id'> = {
  tank_shape_type: 'horizontal_cylinder',
  tank_location_type: 'underground',
  tank_diameter_mm: 2800,
  tank_length_mm: 8500,
  tank_width_mm: 0,
  tank_height_mm: 0,
  tank_tilt_angle_degrees: 0,

  level_sensor_type: 'other',
  level_sensor_error_percent: 0.5,
  level_sensor_accuracy_mm: 1,

  fuel_type: 'gasoline',
  thermal_expansion_coefficient: 0.00083,
  base_temperature: 15,
  working_temp_min: -40,
  working_temp_max: 50,

  has_thermal_insulation: false,

  natural_loss_summer_percent: 0.08,
  natural_loss_winter_percent: 0.03,
  discharge_loss_percent: 0.1,

  data_polling_interval_minutes: 10,
  averaging_period_minutes: 30,
  tank_rest_time_minutes: 30,

  fuel_level_warning_percent: 15,
  fuel_level_critical_percent: 5,
  fuel_level_max_percent: 95,

  dead_stock_liters: 1500,
  dead_stock_percent: 3,
  sensor_blind_zone_bottom_mm: 150,
  sensor_blind_zone_top_mm: 100,
  critical_water_level_mm: 50,

  calibration_method: 'combined',
  calibration_step_mm: 10,
  bias_offset_percent: 0.002,

  nozzles_count: 1,

  calibration_status: 'never',

  reference_source: 'geometry',
  manual_reference_volume: 0
};
