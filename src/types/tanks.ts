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
