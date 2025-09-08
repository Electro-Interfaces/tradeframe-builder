/**
 * Сервис для работы со статусами компонентов оборудования
 * ОБНОВЛЕН: Интегрирован с централизованной конфигурацией
 * Поддерживает переключение между localStorage и Supabase
 */

import { ComponentStatus } from '@/types/component';
import { PersistentStorage } from '@/utils/persistentStorage';
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { ComponentStatusSupabaseService } from './componentStatusSupabaseService';

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

// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
const mockComponentStatuses: ComponentStatusRecord[] = [];

// ❌ ЗАГРУЗКА ДАННЫХ ЗАБЛОКИРОВАНА - используется только Supabase
const componentStatusesData: ComponentStatusRecord[] = [];
let nextId = Math.max(...componentStatusesData.map(cs => parseInt(cs.id.replace('CS-', '')) || 0)) + 1;

// Экземпляр Supabase сервиса
const componentStatusSupabaseService = new ComponentStatusSupabaseService();

// Функция для сохранения изменений
const saveComponentStatuses = () => {
  PersistentStorage.save('componentStatuses', componentStatusesData);
};

// API сервис с централизованной конфигурацией
export const componentStatusService = {
  async initialize(): Promise<void> {
    try {
      await apiConfigServiceDB.initialize();
      console.log('✅ ComponentStatusService инициализирован');
    } catch (error) {
      console.warn('⚠️ Ошибка инициализации ComponentStatusService:', error);
    }
  },

  // ❌ MOCK РЕЖИМ ЗАБЛОКИРОВАН
  async isMockMode(): Promise<boolean> {
    return false; // Mock режим навсегда отключен
  },

  // Получить все статусы компонентов
  async getAll(): Promise<ComponentStatusRecord[]> {
    try {
      console.log('🔄 ComponentStatusService.getAll: Используется только Supabase');
      return await componentStatusSupabaseService.getAll();
    } catch (error) {
      console.error('❌ Ошибка получения статусов компонентов:', error);
      throw new Error('Не удалось получить статусы компонентов. Настройте подключение к Supabase в разделе "Обмен данными".');
    }
  },

  // Получить статус компонента по ID
  async getById(id: string): Promise<ComponentStatusRecord | null> {
    try {
      console.log(`🔄 ComponentStatusService.getById(${id}): Используется только Supabase`);
      return await componentStatusSupabaseService.getById(id);
    } catch (error) {
      console.error(`❌ Ошибка получения статуса компонента ${id}:`, error);
      throw new Error(`Не удалось получить статус компонента ${id}. Настройте подключение к Supabase в разделе "Обмен данными".`);
    }
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