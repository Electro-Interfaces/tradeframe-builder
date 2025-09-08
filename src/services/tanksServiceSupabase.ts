/**
 * Сервис для работы с резервуарами на Supabase
 */

import { supabaseDatabaseClient } from './supabaseDatabaseClient';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Маппинг названий топлива на UUID из nomenclature
const FUEL_TYPE_MAPPING: Record<string, string> = {
  'Дизельное топливо': '123e4567-e89b-12d3-a456-426614174001',
  'АИ-92': '123e4567-e89b-12d3-a456-426614174002', 
  'АИ-95': '123e4567-e89b-12d3-a456-426614174003',
  'АИ-98': '123e4567-e89b-12d3-a456-426614174004',
  'Газ': '123e4567-e89b-12d3-a456-426614174005'
};

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
  waterLevelMm: number;
  density: number;
  status: 'active' | 'maintenance' | 'offline';
  location: string;
  installationDate: string;
  lastCalibration?: string;
  supplier?: string;
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
  fuelType: data.metadata?.fuelType || data.fuel_type_id || 'АИ-95',
  currentLevelLiters: data.current_volume || 0,
  capacityLiters: data.capacity || 0,
  minLevelPercent: data.min_volume || 15,
  criticalLevelPercent: 10,
  temperature: data.metadata?.temperature || 18.0,
  waterLevelMm: data.metadata?.waterLevelMm || 2,
  density: data.metadata?.density || 0.755,
  status: data.status as 'active' | 'maintenance' | 'offline',
  location: data.metadata?.location || '',
  installationDate: data.created_at?.split('T')[0] || '',
  lastCalibration: data.last_calibration,
  supplier: data.metadata?.supplier || '',
  sensors: data.metadata?.sensors || [
    { name: "Уровень", status: "ok" },
    { name: "Температура", status: "ok" }
  ],
  linkedPumps: data.metadata?.linkedPumps || [],
  notifications: data.metadata?.notifications || {
    enabled: true,
    drainAlerts: true,
    levelAlerts: true
  },
  thresholds: data.metadata?.thresholds || {
    criticalTemp: { min: -10, max: 40 },
    maxWaterLevel: 15,
    notifications: { critical: true, minimum: true, temperature: true, water: true }
  },
  trading_point_id: data.trading_point_id,
  created_at: data.created_at,
  updated_at: data.updated_at
});

// Маппинг данных в формат Supabase  
const mapToSupabase = (data: Partial<Tank>) => {
  // Преобразуем название топлива в UUID
  const fuelTypeId = data.fuelType ? FUEL_TYPE_MAPPING[data.fuelType] : null;
  
  if (data.fuelType && !fuelTypeId) {
    console.warn(`⚠️ Неизвестный тип топлива: ${data.fuelType}, используем null`);
  }
  
  return {
    name: data.name,
    fuel_type_id: fuelTypeId, // используем UUID
    current_volume: data.currentLevelLiters,
    capacity: data.capacityLiters,
    min_volume: data.minLevelPercent,
    max_volume: data.capacityLiters, // используем capacity как max_volume
    status: data.status || 'active',
    last_calibration: data.lastCalibration,
    metadata: {
      temperature: data.temperature,
      waterLevelMm: data.waterLevelMm,
      density: data.density,
      location: data.location,
      supplier: data.supplier,
      sensors: data.sensors,
      linkedPumps: data.linkedPumps,
      notifications: data.notifications,
      thresholds: data.thresholds
    },
    trading_point_id: data.trading_point_id,
    updated_at: new Date().toISOString()
  };
};

// API сервис на Supabase
export const supabaseTanksService = {
  // Получить все резервуары
  async getTanks(tradingPointId?: string): Promise<Tank[]> {
    console.log(`🔄 [tanksServiceSupabase] Loading tanks from Supabase для точки: ${tradingPointId}...`);
    await delay(300);
    
    try {
      const queryParams: Record<string, string> = {
        select: '*',
        order: 'name'
      };
      
      if (tradingPointId) {
        console.log(`🔍 [tanksServiceSupabase] Фильтр по trading_point_id: ${tradingPointId}`);
        queryParams.trading_point_id = `eq.${tradingPointId}`;
      } else {
        console.log(`🔍 [tanksServiceSupabase] Загружаем ВСЕ резервуары (без фильтра)`);
      }
      
      console.log(`📡 [tanksServiceSupabase] Отправляем запрос к Supabase...`);
      
      // Преобразуем фильтры для нового клиента
      const dbFilters: Record<string, any> = {};
      if (tradingPointId) {
        dbFilters.trading_point_id = tradingPointId;
      }
      
      const response = await supabaseDatabaseClient.getTanks(dbFilters);
      
      console.log(`📡 [tanksServiceSupabase] Ответ от Supabase:`, response);
      
      if (!response.success) {
        console.error('❌ [tanksServiceSupabase] Ошибка получения резервуаров:', response.error);
        throw new Error(response.error || 'Ошибка загрузки резервуаров');
      }
      
      const data = response.data;
      console.log(`📊 [tanksServiceSupabase] Сырые данные из Supabase: ${data ? data.length : 0} записей`);
      if (data && data.length > 0) {
        console.log(`📊 [tanksServiceSupabase] Первая запись:`, data[0]);
      }
      
      const mappedData = (data || []).map(mapFromSupabase);
      console.log('✅ [tanksServiceSupabase] Финальные данные после мапинга:', mappedData.length, 'items');
      if (mappedData.length > 0) {
        console.log('✅ [tanksServiceSupabase] Первый резервуар после мапинга:', mappedData[0]);
      }
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
      const response = await httpClient.get('/rest/v1/tanks', {
        destination: 'supabase',
        queryParams: {
          select: '*',
          id: `eq.${id}`
        }
      });

      if (!response.success) {
        if (response.status === 404) {
          return null; // Не найден
        }
        throw new Error(response.error || 'Ошибка получения резервуара');
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        return null;
      }

      const mappedData = mapFromSupabase(response.data[0]);
      console.log('✅ Tank found:', mappedData.name);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в tanksService.getTank:', error);
      return null;
    }
  },

  // Создать резервуар
  async createTank(data: Omit<Tank, 'id' | 'created_at' | 'updated_at'>): Promise<Tank> {
    console.log('➕ Creating tank:', data.name);
    await delay(500);
    
    try {
      const supabaseData = mapToSupabase(data);
      const response = await httpClient.post('/rest/v1/tanks', supabaseData, {
        destination: 'supabase',
        headers: {
          'Prefer': 'return=representation'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка создания резервуара');
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Нет данных после создания резервуара');
      }

      const mappedData = mapFromSupabase(response.data[0]);
      console.log('✅ Tank created:', mappedData.name);
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в tanksService.createTank:', error);
      throw error;
    }
  },

  // Обновить резервуар
  async updateTank(id: string, updates: Partial<Tank>): Promise<Tank> {
    console.log('✏️ Updating tank:', id);
    await delay(250);
    
    try {
      const supabaseData = mapToSupabase(updates);
      const response = await httpClient.patch(`/rest/v1/tanks?id=eq.${id}`, supabaseData, {
        destination: 'supabase',
        headers: {
          'Prefer': 'return=representation'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка обновления резервуара');
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Нет данных после обновления резервуара');
      }

      const mappedData = mapFromSupabase(response.data[0]);
      console.log('✅ Tank updated:', mappedData.name);
      
      return mappedData;

    } catch (error) {
      console.error('❌ Ошибка в tanksService.updateTank:', error);
      throw error;
    }
  },

  // Удалить резервуар
  async deleteTank(id: string): Promise<boolean> {
    console.log('🗑️ Deleting tank:', id);
    await delay(200);
    
    try {
      const response = await httpClient.delete(`/rest/v1/tanks?id=eq.${id}`, {
        destination: 'supabase'
      });

      if (!response.success) {
        throw new Error(response.error || 'Ошибка удаления резервуара');
      }

      console.log('✅ Tank deleted');
      return true;

    } catch (error) {
      console.error('❌ Ошибка в tanksService.deleteTank:', error);
      throw error;
    }
  },

  // Получить события резервуара
  async getTankEvents(tankId: string): Promise<TankEvent[]> {
    // Заглушка - таблицы событий пока нет
    await delay(200);
    return [];
  },

  // Добавить событие резервуара
  async addTankEvent(tankId: string, event: Omit<TankEvent, 'id' | 'tankId' | 'timestamp'>): Promise<TankEvent> {
    // Заглушка - таблицы событий пока нет
    await delay(200);
    const newEvent: TankEvent = {
      id: 'temp-' + Date.now(),
      tankId,
      timestamp: new Date().toISOString(),
      ...event
    };
    console.log('📝 Tank event added (mock):', newEvent.title);
    return newEvent;
  }
};

// Экспорт основного API
export const tanksService = supabaseTanksService;