/**
 * Сервис для работы с резервуарами
 * Переключен на работу с Supabase
 */

import { PersistentStorage } from '../utils/persistentStorage';

// Экспортируем все из нового Supabase сервиса
export * from './tanksServiceSupabase';

// Типы данных
export interface Tank {
  id: string; // UUID в Supabase
  name: string;
  fuelType: string;
  currentLevelLiters: number;
  capacityLiters: number;
  minLevelPercent: number;
  criticalLevelPercent: number;
  temperature: number;
  waterLevelMm: number; // изменено обратно на waterLevelMm для совместимости с UI
  density: number;
  status: 'active' | 'maintenance' | 'offline';
  location: string;
  installationDate: string;
  lastCalibration?: string;
  supplier?: string;
  // Добавлены недостающие поля из UI
  sensors: Array<{
    name: string;
    status: 'ok' | 'error';
  }>;
  linkedPumps: Array<{
    id: number;
    name: string;
  }>;
  notifications: {
    enabled: boolean;
    drainAlerts: boolean;
    levelAlerts: boolean;
  };
  thresholds: {
    criticalTemp: {
      min: number;
      max: number;
    };
    maxWaterLevel: number;
    notifications: {
      critical: boolean;
      minimum: boolean;
      temperature: boolean;
      water: boolean;
    };
  };
  trading_point_id: string;
  created_at: string;
  updated_at: string;
}

export interface TankEvent {
  id: string;
  tankId: string; // UUID в Supabase
  type: 'drain' | 'fill' | 'calibration' | 'maintenance' | 'alarm';
  title: string;
  description: string;
  timestamp: string;
  operatorName: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

// Маппинг данных из Supabase в формат Tank
const mapFromSupabase = (data: any): Tank => ({
  id: data.id,
  name: data.name,
  fuelType: data.fuel_type,
  currentLevelLiters: data.current_level_liters,
  capacityLiters: data.capacity_liters,
  minLevelPercent: data.min_level_percent,
  criticalLevelPercent: data.critical_level_percent,
  temperature: data.temperature,
  waterLevelMm: data.water_level_mm,
  density: data.density,
  status: data.is_active ? 'active' : 'maintenance',
  location: data.location || '',
  installationDate: data.installation_date,
  lastCalibration: data.last_calibration,
  supplier: data.supplier,
  sensors: data.sensors || [
    { name: "Уровень", status: "ok" },
    { name: "Температура", status: "ok" }
  ],
  linkedPumps: data.linked_pumps || [],
  notifications: data.notifications || {
    enabled: true,
    drainAlerts: true,
    levelAlerts: true
  },
  thresholds: data.thresholds || {
    criticalTemp: { min: -10, max: 40 },
    maxWaterLevel: 15,
    notifications: { critical: true, minimum: true, temperature: true, water: true }
  },
  trading_point_id: data.trading_point_id,
  created_at: data.created_at,
  updated_at: data.updated_at
});

// Маппинг данных в формат Supabase  
const mapToSupabase = (data: Partial<Tank>) => ({
  name: data.name,
  fuel_type: data.fuelType,
  current_level_liters: data.currentLevelLiters,
  capacity_liters: data.capacityLiters,
  min_level_percent: data.minLevelPercent,
  critical_level_percent: data.criticalLevelPercent,
  temperature: data.temperature,
  water_level_mm: data.waterLevelMm,
  density: data.density,
  is_active: data.status === 'active',
  location: data.location,
  installation_date: data.installationDate,
  last_calibration: data.lastCalibration,
  supplier: data.supplier,
  sensors: data.sensors,
  linked_pumps: data.linkedPumps,
  notifications: data.notifications,
  thresholds: data.thresholds,
  trading_point_id: data.trading_point_id,
  updated_at: new Date().toISOString()
});

export interface DrainOperation {
  id: string;
  tankId: number;
  tankName: string;
  fuelType: string;
  amount: number;
  unit: string;
  timestamp: string;
  operatorName: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface TankCalibration {
  id: string;
  tankId: number;
  date: string;
  filename: string;
  pointsCount: number;
  uploadedBy: string;
  notes?: string;
  created_at: string;
}

// Начальные данные резервуаров
// Разнообразные конфигурации резервуаров для демо сети
const initialTanks: Tank[] = [
  // АЗС №001 - Центральная (3 резервуара - базовая конфигурация)
  {
    id: 1,
    name: "Резервуар №1 (АИ-95)",
    fuelType: "АИ-95",
    currentLevelLiters: 42000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 15.2,
    waterLevelMm: 2,
    density: 0.725,
    status: 'active',
    location: "Северная зона",
    installationDate: "2024-01-15",
    lastCalibration: "2024-08-15",
    supplier: "НефтеГазИнвест",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 1, name: "ТРК-1" },
      { id: 2, name: "ТРК-2" }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point1",
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Резервуар №2 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 35000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 14.8,
    waterLevelMm: 1,
    density: 0.715,
    status: 'active',
    location: "Центральная зона",
    installationDate: "2024-02-20",
    lastCalibration: "2024-08-20",
    supplier: "Лукойл-Нефтепродукт",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "error" }
    ],
    linkedPumps: [{ id: 3, name: "ТРК-3" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: false, water: true }
    },
    trading_point_id: "point1",
    created_at: new Date('2024-02-20').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Резервуар №3 (ДТ)",
    fuelType: "ДТ",
    currentLevelLiters: 28000,
    capacityLiters: 45000,
    minLevelPercent: 15,
    criticalLevelPercent: 8,
    temperature: 12.8,
    waterLevelMm: 1,
    density: 0.835,
    status: 'active',
    location: "Южная зона",
    installationDate: "2024-03-10",
    lastCalibration: "2024-08-25",
    supplier: "Роснефть",
    sensors: [
      { name: "Уровень", status: "error" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 4, name: "ТРК-4" },
      { id: 5, name: "ТРК-5" }
    ],
    notifications: { enabled: false, drainAlerts: false, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -15, max: 50 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: false }
    },
    trading_point_id: "point1",
    created_at: new Date('2024-03-10').toISOString(),
    updated_at: new Date().toISOString()
  },

  // АЗС №002 - Северная (1 резервуар - минимальная конфигурация)
  {
    id: 4,
    name: "Резервуар №1 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 15000,
    capacityLiters: 30000,
    minLevelPercent: 25,
    criticalLevelPercent: 12,
    temperature: 13.5,
    waterLevelMm: 0.8,
    density: 0.720,
    status: 'active',
    location: "Основная зона",
    installationDate: "2024-05-01",
    lastCalibration: "2024-10-15",
    supplier: "Газпром нефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [{ id: 6, name: "ТРК-1" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -12, max: 38 },
      maxWaterLevel: 12,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point2",
    created_at: new Date('2024-05-01').toISOString(),
    updated_at: new Date().toISOString()
  },

  // АЗС №003 - Южная (4 резервуара - расширенная конфигурация)
  {
    id: 5,
    name: "Резервуар №1 (АИ-95)",
    fuelType: "АИ-95",
    currentLevelLiters: 38000,
    capacityLiters: 55000,
    minLevelPercent: 18,
    criticalLevelPercent: 9,
    temperature: 16.3,
    waterLevelMm: 1.2,
    density: 0.728,
    status: 'active',
    location: "Зона А",
    installationDate: "2024-03-15",
    lastCalibration: "2024-09-10",
    supplier: "ЛУКОЙЛ",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 7, name: "ТРК-1" },
      { id: 8, name: "ТРК-2" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -8, max: 42 },
      maxWaterLevel: 18,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point3",
    created_at: new Date('2024-03-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    name: "Резервуар №2 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 29000,
    capacityLiters: 55000,
    minLevelPercent: 18,
    criticalLevelPercent: 9,
    temperature: 15.1,
    waterLevelMm: 2.1,
    density: 0.718,
    status: 'active',
    location: "Зона А",
    installationDate: "2024-03-15",
    lastCalibration: "2024-09-10",
    supplier: "ЛУКОЙЛ",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [{ id: 9, name: "ТРК-3" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -8, max: 42 },
      maxWaterLevel: 18,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point3",
    created_at: new Date('2024-03-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 7,
    name: "Резервуар №3 (ДТ)",
    fuelType: "ДТ",
    currentLevelLiters: 41000,
    capacityLiters: 60000,
    minLevelPercent: 15,
    criticalLevelPercent: 7,
    temperature: 11.9,
    waterLevelMm: 0.9,
    density: 0.842,
    status: 'active',
    location: "Зона Б",
    installationDate: "2024-04-01",
    lastCalibration: "2024-10-05",
    supplier: "Роснефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 10, name: "ТРК-4" },
      { id: 11, name: "ТРК-5" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -20, max: 55 },
      maxWaterLevel: 20,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point3",
    created_at: new Date('2024-04-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 8,
    name: "Резервуар №4 (АИ-98)",
    fuelType: "АИ-98",
    currentLevelLiters: 12000,
    capacityLiters: 25000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 17.2,
    waterLevelMm: 0.3,
    density: 0.738,
    status: 'active',
    location: "Зона Б",
    installationDate: "2024-04-15",
    lastCalibration: "2024-10-20",
    supplier: "Татнефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [{ id: 12, name: "ТРК-6" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -8, max: 42 },
      maxWaterLevel: 12,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point3",
    created_at: new Date('2024-04-15').toISOString(),
    updated_at: new Date().toISOString()
  },

  // АЗС №004 - Московское шоссе (5 резервуаров - максимальная конфигурация с 5 видами топлива)
  {
    id: 9,
    name: "Резервуар №1 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 45000,
    capacityLiters: 60000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 14.5,
    waterLevelMm: 1.5,
    density: 0.720,
    status: 'active',
    location: "Секция А",
    installationDate: "2024-01-10",
    lastCalibration: "2024-08-01",
    supplier: "Газпром нефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 13, name: "ТРК-1" },
      { id: 14, name: "ТРК-2" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -15, max: 45 },
      maxWaterLevel: 20,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point4",
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 10,
    name: "Резервуар №2 (АИ-95)",
    fuelType: "АИ-95",
    currentLevelLiters: 52000,
    capacityLiters: 60000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 15.8,
    waterLevelMm: 1.1,
    density: 0.725,
    status: 'active',
    location: "Секция А",
    installationDate: "2024-01-10",
    lastCalibration: "2024-08-01",
    supplier: "Газпром нефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 15, name: "ТРК-3" },
      { id: 16, name: "ТРК-4" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -15, max: 45 },
      maxWaterLevel: 20,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point4",
    created_at: new Date('2024-01-10').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 11,
    name: "Резервуар №3 (АИ-98)",
    fuelType: "АИ-98",
    currentLevelLiters: 18000,
    capacityLiters: 30000,
    minLevelPercent: 25,
    criticalLevelPercent: 12,
    temperature: 16.9,
    waterLevelMm: 0.4,
    density: 0.740,
    status: 'active',
    location: "Секция Б",
    installationDate: "2024-02-01",
    lastCalibration: "2024-09-01",
    supplier: "Татнефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [{ id: 17, name: "ТРК-5" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -15, max: 45 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point4",
    created_at: new Date('2024-02-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 12,
    name: "Резервуар №4 (ДТ)",
    fuelType: "ДТ",
    currentLevelLiters: 47000,
    capacityLiters: 65000,
    minLevelPercent: 18,
    criticalLevelPercent: 9,
    temperature: 10.2,
    waterLevelMm: 2.8,
    density: 0.845,
    status: 'active',
    location: "Секция Б",
    installationDate: "2024-02-15",
    lastCalibration: "2024-09-15",
    supplier: "Роснефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "error" }
    ],
    linkedPumps: [
      { id: 18, name: "ТРК-6" },
      { id: 19, name: "ТРК-7" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -25, max: 60 },
      maxWaterLevel: 25,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point4",
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 13,
    name: "Резервуар №5 (АИ-100)",
    fuelType: "АИ-100",
    currentLevelLiters: 8000,
    capacityLiters: 20000,
    minLevelPercent: 30,
    criticalLevelPercent: 15,
    temperature: 18.1,
    waterLevelMm: 0.2,
    density: 0.745,
    status: 'active',
    location: "Секция В",
    installationDate: "2024-03-01",
    lastCalibration: "2024-10-01",
    supplier: "Татнефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [{ id: 20, name: "ТРК-8" }],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -15, max: 45 },
      maxWaterLevel: 10,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point4",
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date().toISOString()
  },

  // АЗС №005 - Промзона (5 резервуаров с дублированием топлива - 2 резервуара АИ-92)
  {
    id: 14,
    name: "Резервуар №1 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 35000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 13.8,
    waterLevelMm: 1.8,
    density: 0.716,
    status: 'active',
    location: "Западная секция",
    installationDate: "2024-01-20",
    lastCalibration: "2024-07-20",
    supplier: "ЛУКОЙЛ",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 21, name: "ТРК-1" },
      { id: 22, name: "ТРК-2" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -20, max: 50 },
      maxWaterLevel: 22,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point5",
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 15,
    name: "Резервуар №2 (АИ-92)",
    fuelType: "АИ-92",
    currentLevelLiters: 28000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 14.2,
    waterLevelMm: 1.3,
    density: 0.719,
    status: 'active',
    location: "Западная секция",
    installationDate: "2024-01-20",
    lastCalibration: "2024-07-20",
    supplier: "ЛУКОЙЛ",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 23, name: "ТРК-3" },
      { id: 24, name: "ТРК-4" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -20, max: 50 },
      maxWaterLevel: 22,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point5",
    created_at: new Date('2024-01-20').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 16,
    name: "Резервуар №3 (АИ-95)",
    fuelType: "АИ-95",
    currentLevelLiters: 41000,
    capacityLiters: 55000,
    minLevelPercent: 18,
    criticalLevelPercent: 9,
    temperature: 15.9,
    waterLevelMm: 0.9,
    density: 0.727,
    status: 'active',
    location: "Восточная секция",
    installationDate: "2024-02-10",
    lastCalibration: "2024-08-10",
    supplier: "Газпром нефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 25, name: "ТРК-5" },
      { id: 26, name: "ТРК-6" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -20, max: 50 },
      maxWaterLevel: 18,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point5",
    created_at: new Date('2024-02-10').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 17,
    name: "Резервуар №4 (ДТ)",
    fuelType: "ДТ",
    currentLevelLiters: 52000,
    capacityLiters: 70000,
    minLevelPercent: 15,
    criticalLevelPercent: 8,
    temperature: 9.8,
    waterLevelMm: 3.2,
    density: 0.848,
    status: 'active',
    location: "Восточная секция",
    installationDate: "2024-03-01",
    lastCalibration: "2024-09-01",
    supplier: "Роснефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "ok" }
    ],
    linkedPumps: [
      { id: 27, name: "ТРК-7" },
      { id: 28, name: "ТРК-8" },
      { id: 29, name: "ТРК-9" }
    ],
    notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -30, max: 65 },
      maxWaterLevel: 30,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: "point5",
    created_at: new Date('2024-03-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 18,
    name: "Резервуар №5 (АИ-98)",
    fuelType: "АИ-98",
    currentLevelLiters: 15000,
    capacityLiters: 30000,
    minLevelPercent: 22,
    criticalLevelPercent: 11,
    temperature: 17.5,
    waterLevelMm: 0.6,
    density: 0.742,
    status: 'maintenance',
    location: "Центральная секция",
    installationDate: "2024-04-10",
    lastCalibration: "2024-10-10",
    supplier: "Татнефть",
    sensors: [
      { name: "Уровень", status: "ok" },
      { name: "Температура", status: "error" }
    ],
    linkedPumps: [{ id: 30, name: "ТРК-10" }],
    notifications: { enabled: false, drainAlerts: false, levelAlerts: true },
    thresholds: {
      criticalTemp: { min: -20, max: 50 },
      maxWaterLevel: 12,
      notifications: { critical: true, minimum: false, temperature: false, water: true }
    },
    trading_point_id: "point5",
    created_at: new Date('2024-04-10').toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Начальные события резервуаров
const initialTankEvents: TankEvent[] = [
  {
    id: "evt_1",
    tankId: 1,
    type: 'fill',
    title: 'Поступление топлива',
    description: 'Заправка резервуара АИ-95 - 15000 л',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    operatorName: 'Иванов И.И.',
    severity: 'info',
    metadata: { amount: 15000, supplier: 'НефтеГазИнвест' }
  },
  {
    id: "evt_2",
    tankId: 1,
    type: 'drain',
    title: 'Слив топлива',
    description: 'Отпуск АИ-95 через колонку №3 - 850 л',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    operatorName: 'Петров П.П.',
    severity: 'info',
    metadata: { amount: 850, pump: 3 }
  },
  {
    id: "evt_3",
    tankId: 2,
    type: 'alarm',
    title: 'Превышение уровня воды',
    description: 'Уровень воды в резервуаре превысил норму (1.2 мм)',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    operatorName: 'Система',
    severity: 'warning',
    metadata: { waterLevel: 1.2, threshold: 1.0 }
  },
  {
    id: "evt_4",
    tankId: 4,
    type: 'maintenance',
    title: 'Плановое обслуживание',
    description: 'Техническое обслуживание резервуара и датчиков',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    operatorName: 'Сидоров С.С.',
    severity: 'info',
    metadata: { maintenanceType: 'scheduled', duration: '4 hours' }
  }
];

// Начальные операции слива
const initialDrains: DrainOperation[] = [
  {
    id: "drain_1",
    tankId: 1,
    tankName: "Резервуар №1",
    fuelType: "АИ-95",
    amount: 5000,
    unit: "л",
    timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // через 2 часа
    operatorName: "Иванов И.И.",
    vehicleNumber: "А123БВ45",
    driverName: "Васильев В.В.",
    driverPhone: "+7 (999) 123-45-67",
    status: 'scheduled',
    notes: "Плановая поставка на АЗС №3"
  },
  {
    id: "drain_2",
    tankId: 3,
    tankName: "Резервуар №3",
    fuelType: "ДТ",
    amount: 8000,
    unit: "л",
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 мин назад
    operatorName: "Петров П.П.",
    vehicleNumber: "К456ГД78",
    driverName: "Николаев Н.Н.",
    driverPhone: "+7 (999) 987-65-43",
    status: 'in_progress',
    notes: "Срочная доставка"
  }
];

// Начальные калибровки
const initialCalibrations: TankCalibration[] = [
  {
    id: "cal_1",
    tankId: 1,
    date: "2024-01-15T10:30:00Z",
    filename: "tank_1_calibration_2024.dat",
    pointsCount: 1250,
    uploadedBy: "Технолог Смирнов А.А.",
    notes: "Плановая калибровка после ремонта",
    created_at: new Date('2024-01-15').toISOString()
  },
  {
    id: "cal_2",
    tankId: 2,
    date: "2024-02-10T14:15:00Z",
    filename: "tank_2_calibration_2024.dat",
    pointsCount: 1180,
    uploadedBy: "Технолог Козлов К.К.",
    created_at: new Date('2024-02-10').toISOString()
  },
  {
    id: "cal_3",
    tankId: 3,
    date: "2024-01-28T09:45:00Z",
    filename: "tank_3_calibration_2024.dat",
    pointsCount: 1420,
    uploadedBy: "Технолог Смирнов А.А.",
    notes: "Внеплановая калибровка по запросу",
    created_at: new Date('2024-01-28').toISOString()
  }
];

// Загружаем данные из localStorage
let mockTanks: Tank[] = PersistentStorage.load<Tank>('tanks', initialTanks);
let mockTankEvents: TankEvent[] = PersistentStorage.load<TankEvent>('tankEvents', initialTankEvents);
let mockDrains: DrainOperation[] = PersistentStorage.load<DrainOperation>('drainOperations', initialDrains);
let mockCalibrations: TankCalibration[] = PersistentStorage.load<TankCalibration>('tankCalibrations', initialCalibrations);

// Функции для сохранения изменений
const saveTanks = () => PersistentStorage.save('tanks', mockTanks);
const saveTankEvents = () => PersistentStorage.save('tankEvents', mockTankEvents);
const saveDrains = () => PersistentStorage.save('drainOperations', mockDrains);
const saveCalibrations = () => PersistentStorage.save('tankCalibrations', mockCalibrations);

// Функция для сброса и обновления данных резервуаров (для связанной схемы)
const resetTanksData = () => {
  PersistentStorage.remove('tanks');
  PersistentStorage.remove('tankEvents');
  PersistentStorage.remove('drainOperations');
  PersistentStorage.remove('tankCalibrations');
  
  mockTanks = [...initialTanks];
  mockTankEvents = [...initialTankEvents];
  mockDrains = [...initialDrains];
  mockCalibrations = [...initialCalibrations];
  
  saveTanks();
  saveTankEvents();
  saveDrains();
  saveCalibrations();
  
  console.log('🔄 Tanks data reset to match Equipment schema');
};

// Принудительная очистка localStorage для синхронизации
PersistentStorage.remove('tanks');
PersistentStorage.remove('tankEvents');
PersistentStorage.remove('drainOperations');
PersistentStorage.remove('tankCalibrations');
// Для демонстрации связанной схемы - раскомментируйте следующую строку
resetTanksData();

// API сервис на Supabase
export const tanksService = {
  // Получить все резервуары
  async getTanks(tradingPointId?: string): Promise<Tank[]> {
    console.log('🔄 Loading tanks from Supabase...');
    await delay(300);
    
    try {
      let query = supabase.from('tanks').select('*').order('name');
      
      if (tradingPointId) {
        query = query.eq('trading_point_id', tradingPointId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Ошибка получения резервуаров:', error);
        throw error;
      }
      
      const mappedData = (data || []).map(mapFromSupabase);
      console.log('✅ Loaded tanks from Supabase:', mappedData.length, 'items');
      return mappedData;
      
    } catch (error) {
      console.error('❌ Ошибка в tanksService.getTanks:', error);
      throw error;
    }
  },

  // Получить резервуар по ID
  async getTank(id: string): Promise<Tank | null> {
    console.log('🔍 Getting tank by ID:', id);
    await delay(200);
    
    try {
      const { data, error } = await supabase
        .from('tanks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Не найден
        }
        throw error;
      }

      const mappedData = mapFromSupabase(data);
      console.log('✅ Tank found:', mappedData.name);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в tanksService.getTank:', error);
      return null;
    }
  },

  // Обновить резервуар
  async updateTank(id: number, updates: Partial<Tank>): Promise<Tank> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = mockTanks.findIndex(tank => tank.id === id);
    if (index === -1) {
      throw new Error(`Резервуар с ID ${id} не найден`);
    }

    const updated = {
      ...mockTanks[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    mockTanks[index] = updated;
    saveTanks();
    
    return updated;
  },

  // Получить события резервуара
  async getTankEvents(tankId: number, limit = 10): Promise<TankEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return mockTankEvents
      .filter(event => event.tankId === tankId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },

  // Добавить событие резервуара
  async addTankEvent(event: Omit<TankEvent, 'id'>): Promise<TankEvent> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newEvent: TankEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    mockTankEvents.push(newEvent);
    saveTankEvents();
    
    return newEvent;
  },

  // Получить операции слива
  async getDrains(tankId?: number): Promise<DrainOperation[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    if (tankId) {
      return mockDrains.filter(drain => drain.tankId === tankId);
    }
    return [...mockDrains].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  // Создать операцию слива
  async createDrain(drain: Omit<DrainOperation, 'id'>): Promise<DrainOperation> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newDrain: DrainOperation = {
      ...drain,
      id: `drain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    mockDrains.push(newDrain);
    saveDrains();
    
    return newDrain;
  },

  // Обновить операцию слива
  async updateDrain(id: string, updates: Partial<DrainOperation>): Promise<DrainOperation> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const index = mockDrains.findIndex(drain => drain.id === id);
    if (index === -1) {
      throw new Error(`Операция слива с ID ${id} не найдена`);
    }

    const updated = { ...mockDrains[index], ...updates };
    mockDrains[index] = updated;
    saveDrains();
    
    return updated;
  },

  // Получить калибровки резервуара
  async getTankCalibrations(tankId: number): Promise<TankCalibration[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return mockCalibrations
      .filter(cal => cal.tankId === tankId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // Добавить калибровку
  async addTankCalibration(calibration: Omit<TankCalibration, 'id' | 'created_at'>): Promise<TankCalibration> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const newCalibration: TankCalibration = {
      ...calibration,
      id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };

    mockCalibrations.push(newCalibration);
    saveCalibrations();
    
    // Обновляем дату последней калибровки в резервуаре
    const tankIndex = mockTanks.findIndex(tank => tank.id === calibration.tankId);
    if (tankIndex >= 0) {
      mockTanks[tankIndex] = {
        ...mockTanks[tankIndex],
        lastCalibration: calibration.date,
        updated_at: new Date().toISOString()
      };
      saveTanks();
    }
    
    return newCalibration;
  },

  // Создать резервуар на основе оборудования
  async createTankFromEquipment(equipmentId: string, equipmentData: {
    name: string;
    display_name: string;
    trading_point_id: string;
    params: Record<string, any>;
  }): Promise<Tank> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Извлекаем ВСЕ параметры резервуара из параметров оборудования (синхронизировано с шаблоном)
    const params = equipmentData.params;
    const now = new Date().toISOString();

    // Найдём следующий доступный ID
    const maxId = Math.max(0, ...mockTanks.map(t => t.id));
    const newId = maxId + 1;
    
    const newTank: Tank = {
      // Базовые характеристики
      id: newId,
      name: equipmentData.display_name || equipmentData.name,
      fuelType: params.fuelType || 'АИ-92',
      currentLevelLiters: params.currentLevelLiters || 0,
      capacityLiters: params.capacityLiters || 50000,
      minLevelPercent: params.minLevelPercent || 20,
      criticalLevelPercent: params.criticalLevelPercent || 10,
      
      // Физические параметры (берем из оборудования)
      temperature: params.temperature || 15.0,
      waterLevelMm: params.waterLevelMm || 0.0,
      density: params.density || (params.fuelType?.includes('ДТ') ? 0.835 : 0.725),
      
      // Статус и местоположение (берем из оборудования)
      status: params.status || 'active',
      location: params.location || 'Зона не указана',
      installationDate: params.installationDate || new Date().toISOString().split('T')[0],
      lastCalibration: params.lastCalibration || undefined,
      supplier: params.supplier || undefined,
      
      // Датчики и связи (берем из оборудования)
      sensors: params.sensors || [
        { name: "Уровень", status: "ok" },
        { name: "Температура", status: "ok" }
      ],
      linkedPumps: params.linkedPumps || [],
      
      // Уведомления (берем из оборудования)
      notifications: params.notifications || {
        enabled: true,
        drainAlerts: true,
        levelAlerts: true
      },
      
      // Пороговые значения (берем из оборудования)
      thresholds: params.thresholds || {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 15,
        notifications: {
          critical: true,
          minimum: true,
          temperature: true,
          water: true
        }
      },
      
      // Системные поля
      trading_point_id: equipmentData.trading_point_id,
      created_at: params.created_at || now,
      updated_at: params.updated_at || now
    };

    mockTanks.push(newTank);
    saveTanks();

    // Создаём событие о создании резервуара
    await this.addTankEvent({
      tankId: newId,
      type: 'maintenance',
      title: 'Резервуар создан',
      description: `Резервуар создан на основе оборудования: ${equipmentData.display_name}`,
      timestamp: new Date().toISOString(),
      operatorName: 'Система',
      severity: 'info',
      metadata: { equipmentId, source: 'equipment_sync' }
    });
    
    return newTank;
  },

  // Удалить резервуар (при удалении оборудования)
  async deleteTankByEquipment(equipmentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Находим резервуар, созданный из данного оборудования
    // (можно использовать поиск по событиям или добавить поле equipment_id в Tank)
    const tankEvents = mockTankEvents.filter(event => 
      event.metadata?.equipmentId === equipmentId && 
      event.metadata?.source === 'equipment_sync'
    );
    
    for (const event of tankEvents) {
      const tankIndex = mockTanks.findIndex(tank => tank.id === event.tankId);
      if (tankIndex >= 0) {
        // Добавляем событие об удалении
        await this.addTankEvent({
          tankId: event.tankId,
          type: 'maintenance',
          title: 'Резервуар удалён',
          description: `Резервуар удалён из-за удаления связанного оборудования`,
          timestamp: new Date().toISOString(),
          operatorName: 'Система',
          severity: 'warning',
          metadata: { equipmentId, source: 'equipment_sync' }
        });

        // Удаляем резервуар
        mockTanks.splice(tankIndex, 1);
        saveTanks();
      }
    }
  },

  // Синхронизация с оборудованием - получить резервуары по торговой точке
  async syncWithEquipment(tradingPointId: string, equipmentList: Array<{
    id: string;
    name: string;
    display_name: string;
    system_type: string;
    params: Record<string, any>;
  }>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Находим оборудование типа "резервуар"
    const tankEquipment = equipmentList.filter(eq => 
      eq.system_type === 'fuel_tank' || 
      eq.system_type === 'tank' || 
      eq.name.toLowerCase().includes('резервуар') ||
      eq.name.toLowerCase().includes('tank')
    );

    // Получаем существующие резервуары для данной торговой точки
    const existingTanks = await this.getTanks(tradingPointId);
    
    // Находим резервуары, которые были созданы из оборудования
    const syncedTankIds = new Set<number>();
    
    for (const event of mockTankEvents) {
      if (event.metadata?.source === 'equipment_sync') {
        syncedTankIds.add(event.tankId);
      }
    }

    // Создаём резервуары для нового оборудования
    for (const equipment of tankEquipment) {
      // Проверяем, есть ли уже резервуар для этого оборудования
      const hasExistingTank = mockTankEvents.some(event => 
        event.metadata?.equipmentId === equipment.id && 
        event.metadata?.source === 'equipment_sync'
      );
      
      if (!hasExistingTank) {
        await this.createTankFromEquipment(equipment.id, {
          name: equipment.name,
          display_name: equipment.display_name,
          trading_point_id: tradingPointId,
          params: equipment.params
        });
      }
    }
  }
};