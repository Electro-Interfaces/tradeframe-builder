/**
 * Типы и интерфейсы для STS API
 */

export interface STSApiConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
  token?: string;
  tokenExpiry?: number;
  // networkId и tradingPointId теперь берутся из селекторов приложения
}

export interface Tank {
  id: number;
  name: string;
  fuelType: string;
  currentLevelLiters: number;
  capacityLiters: number;
  noSensorData?: boolean;
  minLevelPercent: number;
  criticalLevelPercent: number;
  temperature: number;
  waterLevelMm: number;
  sensors: Array<{ name: string; status: string; }>;
  lastCalibration: string;
  linkedPumps: Array<{ id: number; name: string; }>;
  notifications: {
    enabled: boolean;
    drainAlerts: boolean;
    levelAlerts: boolean;
  };
  thresholds: {
    criticalTemp: { min: number; max: number; };
    maxWaterLevel: number;
    notifications: {
      critical: boolean;
      minimum: boolean;
      temperature: boolean;
      water: boolean;
    };
  };
  apiData?: {
    number: number;
    fuel: number;
    fuel_name: string;
    state: number;
    volume_begin: number;
    volume_end: number;
    volume_max: number;
    volume_free: number;
    volume: number;
    amount_begin: number;
    amount_end: number;
    level: number;
    water: {
      volume: number;
      amount: number;
      level: number;
    };
    temperature: number;
    density: number;
    release: {
      volume: number;
      amount: number;
    };
    dt: string;
  };
}

export interface Pump {
  id: number;
  name: string;
  status: string;
  fuelType: string;
  currentPrice: number;
  totalSales: number;
  dailySales: number;
  lastTransaction: string;
  nozzles: Array<{ id: number; name: string; status: string; }>;
}

export interface Sale {
  id: number;
  date: string;
  pumpId: number;
  pumpName: string;
  fuelType: string;
  volume: number;
  price: number;
  total: number;
  cardNumber?: string;
  receiptNumber: string;
}

export interface TerminalInfo {
  terminalState?: {
    code: number;
    description: string;
  };
  terminal: {
    id: string;
    name: string;
    version: string;
    status: 'online' | 'offline' | 'maintenance';
    uptime: number;
    lastHeartbeat: string;
    cpu: {
      usage: number;
      temperature: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
    network: {
      ip: string;
      connected: boolean;
      speed: number;
    };
  };
  pumps: Array<{
    id: number;
    name: string;
    status: 'active' | 'offline' | 'error' | 'maintenance';
    fuelType: string;
    nozzles: Array<{
      id: number;
      status: 'ready' | 'dispensing' | 'error' | 'maintenance';
    }>;
  }>;
  tanks: Array<{
    id: number;
    name: string;
    fuelType: string;
    level: number;
    capacity: number;
    temperature: number;
    status: 'normal' | 'low' | 'critical' | 'error';
  }>;
  pos: Array<{
    number: number;
    status: 'online' | 'offline' | 'error';
    version: string;
    lastUpdate?: string;
    lastTransaction: string;
    cashierConnected: boolean;
    cashSum?: number;
    bankSum?: number;
    devices?: {
      billAcceptor?: {
        status: 'online' | 'error';
        name: string;
        billCount?: number;
        billAmount?: number;
        billDenominations?: Array<{ nominal: number; count: number }>;
      };
      cardReader?: {
        status: 'online' | 'error';
        name: string;
      };
      mpsReader?: {
        status: 'online' | 'error';
        name: string;
      };
      fiscalRegister?: {
        status: 'online' | 'error';
        name: string;
        isEmergencyMode: boolean;
      };
    };
  }>;
  fiscal: {
    status: 'ready' | 'error' | 'maintenance';
    model: string;
    serialNumber: string;
    documentNumber: number;
  };
  shift?: {
    number: number;
    state: string;
    openedAt?: string;
  };
}

export interface Price {
  id: number;
  fuelType: string;
  price: number;
  effectiveDate: string;
  createdBy: string;
  status: string;
}

export interface PriceSetRequest {
  prices: Record<string, number>; // Коды услуг как ключи, цены в рублях как значения
  effective_date: string; // ISO 8601 format: "2024-01-15T10:30:00Z"
}

export interface PriceItem {
  fuel_type: string;
  price: number;
}

export interface PriceScheduleEntry {
  id?: number;
  service_code: string;
  service_name?: string;
  fuel_type?: string;
  price: number;
  effective_date: string;
  created_at?: string;
  status?: string;
}

export interface Transaction {
  id: number;
  transactionId: string;
  date: string;
  stationNumber?: string;
  stationName?: string;
  pumpId?: number;
  pumpName?: string;
  fuelType: string;
  volume: number;
  price: number;
  total: number;
  cardNumber?: string;
  receiptNumber?: string;
  status: string;
  operationType: string;
  paymentMethod?: string;
  networkId?: string;
  tradingPointId?: string;
  operatorName?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  /** Числовой timestamp startTime (мс) — вычислен один раз при маппинге,
   *  чтобы фильтры/сортировки/агрегаты не парсили строку даты на каждую строку */
  tsMs?: number;
  orderedQuantity?: number;  // заказанное количество литров (order)
  orderedAmount?: number;    // заказанная сумма в рублях (order_cost)
  apiData?: {
    // Сырые данные от API СТС
    [key: string]: any;
  };
}
