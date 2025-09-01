/**
 * Сервис для работы со статусами компонентов оборудования
 * Включает персистентное хранение в localStorage
 */

import { ComponentStatus } from '@/types/component';
import { PersistentStorage } from '@/utils/persistentStorage';

export interface ComponentStatusRecord {
  id: string;
  componentId: string;
  equipmentId?: string;
  status: ComponentStatus;
  statusMessage?: string;
  lastOnline: string;
  lastOffline?: string;
  uptime: number; // в секундах
  downtime: number; // в секундах
  errorCount: number;
  lastError?: string;
  lastErrorTime?: string;
  responseTime?: number; // в миллисекундах
  signalStrength?: number; // 0-100%
  temperature?: number; // в градусах Цельсия
  voltage?: number; // в вольтах
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComponentStatusInput {
  componentId: string;
  equipmentId?: string;
  status: ComponentStatus;
  statusMessage?: string;
  responseTime?: number;
  signalStrength?: number;
  temperature?: number;
  voltage?: number;
  metadata?: Record<string, any>;
}

export interface ComponentHealthMetrics {
  availability: number; // % времени online
  reliability: number; // % операций без ошибок
  performance: number; // средняя производительность
  avgResponseTime: number;
  avgUptime: number;
}

// Начальные данные статусов компонентов
const initialComponentStatuses: ComponentStatusRecord[] = [
  {
    id: "CS-001",
    componentId: "COMP-001",
    equipmentId: "EQ-001",
    status: "online",
    statusMessage: "Датчик работает нормально",
    lastOnline: "2024-08-30T10:00:00Z",
    uptime: 86400,
    downtime: 0,
    errorCount: 0,
    responseTime: 150,
    signalStrength: 95,
    temperature: 22.5,
    voltage: 12.1,
    metadata: {
      sensorType: "fuel_level",
      calibrationDate: "2024-08-01",
      accuracy: "±0.5mm"
    },
    createdAt: new Date('2024-08-29T10:00:00Z'),
    updatedAt: new Date('2024-08-30T10:00:00Z')
  },
  {
    id: "CS-002",
    componentId: "COMP-002",
    equipmentId: "EQ-001",
    status: "error",
    statusMessage: "Ошибка связи с принтером",
    lastOnline: "2024-08-30T08:30:00Z",
    lastOffline: "2024-08-30T09:15:00Z",
    uptime: 82800,
    downtime: 2700,
    errorCount: 3,
    lastError: "COMM_ERROR: Timeout waiting for printer response",
    lastErrorTime: "2024-08-30T09:15:00Z",
    responseTime: 0,
    signalStrength: 0,
    temperature: 35.2,
    voltage: 11.8,
    metadata: {
      printerModel: "ThermalPrinter-58",
      paperLevel: "low",
      lastMaintenance: "2024-07-15"
    },
    createdAt: new Date('2024-08-29T08:30:00Z'),
    updatedAt: new Date('2024-08-30T09:15:00Z')
  },
  {
    id: "CS-003",
    componentId: "COMP-003",
    equipmentId: "EQ-001",
    status: "offline",
    statusMessage: "Пинпад отключен для обслуживания",
    lastOnline: "2024-08-30T07:00:00Z",
    lastOffline: "2024-08-30T07:05:00Z",
    uptime: 79200,
    downtime: 10800,
    errorCount: 1,
    lastError: "MAINTENANCE_MODE: Device scheduled for maintenance",
    lastErrorTime: "2024-08-30T07:05:00Z",
    responseTime: 0,
    signalStrength: 0,
    metadata: {
      deviceModel: "VeriFone V200c",
      firmwareVersion: "1.2.3",
      maintenanceScheduled: true
    },
    createdAt: new Date('2024-08-29T07:00:00Z'),
    updatedAt: new Date('2024-08-30T07:05:00Z')
  },
  {
    id: "CS-004",
    componentId: "COMP-004",
    equipmentId: "EQ-002",
    status: "online",
    statusMessage: "Сервер функционирует нормально",
    lastOnline: "2024-08-30T00:00:00Z",
    uptime: 172800,
    downtime: 0,
    errorCount: 0,
    responseTime: 25,
    signalStrength: 100,
    temperature: 28.1,
    voltage: 220.5,
    metadata: {
      serverType: "industrial",
      cpuUsage: 35,
      memoryUsage: 68,
      diskUsage: 45,
      networkLatency: 12
    },
    createdAt: new Date('2024-08-28T00:00:00Z'),
    updatedAt: new Date('2024-08-30T10:00:00Z')
  },
  {
    id: "CS-005",
    componentId: "COMP-005",
    equipmentId: "EQ-002",
    status: "disabled",
    statusMessage: "ИБП отключен администратором",
    lastOnline: "2024-08-29T18:00:00Z",
    lastOffline: "2024-08-29T18:00:00Z",
    uptime: 57600,
    downtime: 57600,
    errorCount: 0,
    responseTime: 0,
    signalStrength: 0,
    voltage: 0,
    metadata: {
      upsModel: "APC Smart-UPS 1500VA",
      batteryLevel: 95,
      adminDisabled: true,
      disableReason: "Scheduled replacement"
    },
    createdAt: new Date('2024-08-28T18:00:00Z'),
    updatedAt: new Date('2024-08-29T18:00:00Z')
  }
];

// Загружаем данные из localStorage
let componentStatusesData: ComponentStatusRecord[] = PersistentStorage.load<ComponentStatusRecord>('componentStatuses', initialComponentStatuses);
let nextId = Math.max(...componentStatusesData.map(cs => parseInt(cs.id.replace('CS-', '')) || 0)) + 1;

// Функция для сохранения изменений
const saveComponentStatuses = () => {
  PersistentStorage.save('componentStatuses', componentStatusesData);
};

// API сервис с персистентным хранением
export const componentStatusService = {
  // Получить все статусы компонентов
  async getAll(): Promise<ComponentStatusRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...componentStatusesData].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  // Получить статус компонента по ID
  async getById(id: string): Promise<ComponentStatusRecord | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return componentStatusesData.find(cs => cs.id === id) || null;
  },

  // Получить статус по ID компонента
  async getByComponentId(componentId: string): Promise<ComponentStatusRecord | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return componentStatusesData.find(cs => cs.componentId === componentId) || null;
  },

  // Получить статусы по ID оборудования
  async getByEquipmentId(equipmentId: string): Promise<ComponentStatusRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return componentStatusesData.filter(cs => cs.equipmentId === equipmentId);
  },

  // Получить статусы по статусу
  async getByStatus(status: ComponentStatus): Promise<ComponentStatusRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return componentStatusesData.filter(cs => cs.status === status);
  },

  // Создать или обновить статус компонента
  async upsert(input: ComponentStatusInput): Promise<ComponentStatusRecord> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const existingIndex = componentStatusesData.findIndex(cs => cs.componentId === input.componentId);
    const now = new Date();
    const nowISO = now.toISOString();
    
    if (existingIndex !== -1) {
      // Обновляем существующий статус
      const existing = componentStatusesData[existingIndex];
      const wasOnline = existing.status === 'online';
      const isOnline = input.status === 'online';
      
      // Вычисляем время работы/простоя
      const timeSinceLastUpdate = now.getTime() - new Date(existing.updatedAt).getTime();
      const timeInSeconds = Math.floor(timeSinceLastUpdate / 1000);
      
      let uptime = existing.uptime;
      let downtime = existing.downtime;
      
      if (wasOnline) {
        uptime += timeInSeconds;
      } else {
        downtime += timeInSeconds;
      }
      
      // Увеличиваем счетчик ошибок если статус изменился на error
      let errorCount = existing.errorCount;
      let lastError = existing.lastError;
      let lastErrorTime = existing.lastErrorTime;
      
      if (input.status === 'error' && existing.status !== 'error') {
        errorCount++;
        lastError = input.statusMessage || 'Unknown error';
        lastErrorTime = nowISO;
      }
      
      const updated: ComponentStatusRecord = {
        ...existing,
        status: input.status,
        statusMessage: input.statusMessage,
        lastOnline: isOnline ? nowISO : existing.lastOnline,
        lastOffline: !isOnline && wasOnline ? nowISO : existing.lastOffline,
        uptime,
        downtime,
        errorCount,
        lastError,
        lastErrorTime,
        responseTime: input.responseTime ?? existing.responseTime,
        signalStrength: input.signalStrength ?? existing.signalStrength,
        temperature: input.temperature ?? existing.temperature,
        voltage: input.voltage ?? existing.voltage,
        metadata: { ...existing.metadata, ...(input.metadata || {}) },
        updatedAt: now
      };
      
      componentStatusesData[existingIndex] = updated;
      saveComponentStatuses();
      
      return updated;
    } else {
      // Создаем новый статус
      const newStatus: ComponentStatusRecord = {
        id: `CS-${String(nextId++).padStart(3, '0')}`,
        componentId: input.componentId,
        equipmentId: input.equipmentId,
        status: input.status,
        statusMessage: input.statusMessage,
        lastOnline: input.status === 'online' ? nowISO : nowISO,
        uptime: 0,
        downtime: 0,
        errorCount: input.status === 'error' ? 1 : 0,
        lastError: input.status === 'error' ? input.statusMessage : undefined,
        lastErrorTime: input.status === 'error' ? nowISO : undefined,
        responseTime: input.responseTime,
        signalStrength: input.signalStrength,
        temperature: input.temperature,
        voltage: input.voltage,
        metadata: input.metadata || {},
        createdAt: now,
        updatedAt: now
      };
      
      componentStatusesData.push(newStatus);
      saveComponentStatuses();
      
      return newStatus;
    }
  },

  // Обновить статус компонента
  async updateStatus(componentId: string, status: ComponentStatus, message?: string): Promise<ComponentStatusRecord | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return await this.upsert({
      componentId,
      status,
      statusMessage: message
    });
  },

  // Удалить статус компонента
  async remove(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const index = componentStatusesData.findIndex(cs => cs.id === id);
    if (index === -1) return false;
    
    componentStatusesData.splice(index, 1);
    saveComponentStatuses();
    
    return true;
  },

  // Получить метрики здоровья компонента
  async getHealthMetrics(componentId: string): Promise<ComponentHealthMetrics | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const status = componentStatusesData.find(cs => cs.componentId === componentId);
    if (!status) return null;
    
    const totalTime = status.uptime + status.downtime;
    const availability = totalTime > 0 ? (status.uptime / totalTime) * 100 : 0;
    
    // Простая оценка надежности на основе количества ошибок
    const hoursRunning = status.uptime / 3600;
    const errorsPerHour = hoursRunning > 0 ? status.errorCount / hoursRunning : 0;
    const reliability = Math.max(0, 100 - (errorsPerHour * 10));
    
    // Оценка производительности на основе времени отклика
    let performance = 100;
    if (status.responseTime) {
      if (status.responseTime > 1000) performance = 50;
      else if (status.responseTime > 500) performance = 70;
      else if (status.responseTime > 200) performance = 85;
    }
    
    return {
      availability,
      reliability,
      performance,
      avgResponseTime: status.responseTime || 0,
      avgUptime: status.uptime
    };
  },

  // Получить статистику по всем компонентам
  async getOverallStatistics(): Promise<{
    totalComponents: number;
    componentsByStatus: Record<ComponentStatus, number>;
    avgAvailability: number;
    avgResponseTime: number;
    totalErrors: number;
    componentsByEquipment: Record<string, number>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const totalComponents = componentStatusesData.length;
    
    // Статистика по статусам
    const componentsByStatus = componentStatusesData.reduce((acc, cs) => {
      acc[cs.status] = (acc[cs.status] || 0) + 1;
      return acc;
    }, {} as Record<ComponentStatus, number>);
    
    // Средняя доступность
    const availabilities = componentStatusesData.map(cs => {
      const totalTime = cs.uptime + cs.downtime;
      return totalTime > 0 ? (cs.uptime / totalTime) * 100 : 0;
    });
    const avgAvailability = availabilities.length > 0 
      ? availabilities.reduce((sum, av) => sum + av, 0) / availabilities.length 
      : 0;
    
    // Среднее время отклика
    const responseTimes = componentStatusesData.filter(cs => cs.responseTime).map(cs => cs.responseTime!);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;
    
    // Общее количество ошибок
    const totalErrors = componentStatusesData.reduce((sum, cs) => sum + cs.errorCount, 0);
    
    // Статистика по оборудованию
    const componentsByEquipment = componentStatusesData.reduce((acc, cs) => {
      if (cs.equipmentId) {
        acc[cs.equipmentId] = (acc[cs.equipmentId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalComponents,
      componentsByStatus,
      avgAvailability,
      avgResponseTime,
      totalErrors,
      componentsByEquipment
    };
  },

  // Поиск статусов компонентов
  async search(query: string, filters?: {
    status?: ComponentStatus;
    equipmentId?: string;
    hasErrors?: boolean;
  }): Promise<ComponentStatusRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 180));
    
    let filteredStatuses = componentStatusesData;
    
    // Фильтры
    if (filters) {
      if (filters.status) {
        filteredStatuses = filteredStatuses.filter(cs => cs.status === filters.status);
      }
      if (filters.equipmentId) {
        filteredStatuses = filteredStatuses.filter(cs => cs.equipmentId === filters.equipmentId);
      }
      if (filters.hasErrors) {
        filteredStatuses = filteredStatuses.filter(cs => cs.errorCount > 0);
      }
    }
    
    // Поиск по запросу
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filteredStatuses = filteredStatuses.filter(cs => 
        cs.id.toLowerCase().includes(searchLower) ||
        cs.componentId.toLowerCase().includes(searchLower) ||
        cs.equipmentId?.toLowerCase().includes(searchLower) ||
        cs.statusMessage?.toLowerCase().includes(searchLower) ||
        cs.lastError?.toLowerCase().includes(searchLower)
      );
    }
    
    return filteredStatuses.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
};

// Экспорт store для обратной совместимости
export const componentStatusStore = {
  getAll: (): ComponentStatusRecord[] => [...componentStatusesData],
  
  getById: (id: string): ComponentStatusRecord | undefined => 
    componentStatusesData.find(cs => cs.id === id),
    
  getByComponentId: (componentId: string): ComponentStatusRecord | undefined =>
    componentStatusesData.find(cs => cs.componentId === componentId),
    
  getByStatus: (status: ComponentStatus): ComponentStatusRecord[] =>
    componentStatusesData.filter(cs => cs.status === status),
    
  update: (id: string, updates: Partial<ComponentStatusRecord>): ComponentStatusRecord | null => {
    const index = componentStatusesData.findIndex(cs => cs.id === id);
    if (index === -1) return null;
    
    componentStatusesData[index] = {
      ...componentStatusesData[index],
      ...updates,
      updatedAt: new Date()
    };
    
    saveComponentStatuses();
    return componentStatusesData[index];
  },
  
  remove: (id: string): boolean => {
    const index = componentStatusesData.findIndex(cs => cs.id === id);
    if (index === -1) return false;
    
    componentStatusesData.splice(index, 1);
    saveComponentStatuses();
    return true;
  }
};