/**
 * Сервис для работы с резервуарами
 * Включает персистентное хранение в localStorage
 */

import { PersistentStorage } from '@/utils/persistentStorage';

// Типы данных
export interface Tank {
  id: number;
  name: string;
  fuelType: string;
  currentLevelLiters: number;
  capacityLiters: number;
  minLevelPercent: number;
  criticalLevelPercent: number;
  temperature: number;
  waterLevel: number;
  density: number;
  status: 'active' | 'maintenance' | 'offline';
  location: string;
  installationDate: string;
  lastCalibration?: string;
  supplier?: string;
  thresholds: {
    criticalTemp: number;
    maxWaterLevel: number;
    notifications: boolean;
  };
  trading_point_id: string;
  created_at: string;
  updated_at: string;
}

export interface TankEvent {
  id: string;
  tankId: number;
  type: 'drain' | 'fill' | 'calibration' | 'maintenance' | 'alarm';
  title: string;
  description: string;
  timestamp: string;
  operatorName: string;
  severity: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

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
const initialTanks: Tank[] = [
  {
    id: 1,
    name: "Резервуар №1",
    fuelType: "АИ-95",
    currentLevelLiters: 25000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 10,
    temperature: 15.2,
    waterLevel: 0.5,
    density: 0.725,
    status: 'active',
    location: "Северная зона",
    installationDate: "2022-03-15",
    lastCalibration: "2024-01-15",
    supplier: "НефтеГазИнвест",
    thresholds: {
      criticalTemp: 40,
      maxWaterLevel: 10,
      notifications: true
    },
    trading_point_id: "1",
    created_at: new Date('2022-03-15').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    name: "Резервуар №2",
    fuelType: "АИ-92",
    currentLevelLiters: 18000,
    capacityLiters: 45000,
    minLevelPercent: 15,
    criticalLevelPercent: 8,
    temperature: 14.8,
    waterLevel: 1.2,
    density: 0.715,
    status: 'active',
    location: "Центральная зона",
    installationDate: "2022-03-20",
    lastCalibration: "2024-02-10",
    supplier: "Лукойл-Нефтепродукт",
    thresholds: {
      criticalTemp: 38,
      maxWaterLevel: 12,
      notifications: true
    },
    trading_point_id: "1",
    created_at: new Date('2022-03-20').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    name: "Резервуар №3",
    fuelType: "ДТ",
    currentLevelLiters: 32000,
    capacityLiters: 60000,
    minLevelPercent: 25,
    criticalLevelPercent: 12,
    temperature: 16.1,
    waterLevel: 0.8,
    density: 0.835,
    status: 'active',
    location: "Южная зона",
    installationDate: "2022-04-10",
    lastCalibration: "2024-01-28",
    supplier: "Роснефть",
    thresholds: {
      criticalTemp: 42,
      maxWaterLevel: 8,
      notifications: true
    },
    trading_point_id: "1",
    created_at: new Date('2022-04-10').toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    name: "Резервуар №4",
    fuelType: "АИ-98",
    currentLevelLiters: 8500,
    capacityLiters: 25000,
    minLevelPercent: 18,
    criticalLevelPercent: 9,
    temperature: 15.5,
    waterLevel: 0.3,
    density: 0.735,
    status: 'maintenance',
    location: "Восточная зона",
    installationDate: "2023-01-12",
    lastCalibration: "2024-03-05",
    supplier: "Татнефть",
    thresholds: {
      criticalTemp: 39,
      maxWaterLevel: 6,
      notifications: false
    },
    trading_point_id: "1",
    created_at: new Date('2023-01-12').toISOString(),
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

// API сервис с персистентным хранением
export const tanksService = {
  // Получить все резервуары
  async getTanks(tradingPointId?: string): Promise<Tank[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (tradingPointId) {
      return mockTanks.filter(tank => tank.trading_point_id === tradingPointId);
    }
    return [...mockTanks];
  },

  // Получить резервуар по ID
  async getTank(id: number): Promise<Tank | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return mockTanks.find(tank => tank.id === id) || null;
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
  }
};