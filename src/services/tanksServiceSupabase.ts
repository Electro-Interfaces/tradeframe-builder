/**
 * Сервис для работы с резервуарами на Supabase
 */

import { supabaseService as supabase } from './supabaseServiceClient';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
const mapToSupabase = (data: Partial<Tank>) => ({
  name: data.name,
  fuel_type_id: data.fuelType, // используем fuel_type_id
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
});

// API сервис на Supabase
export const supabaseTanksService = {
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

  // Создать резервуар
  async createTank(data: Omit<Tank, 'id' | 'created_at' | 'updated_at'>): Promise<Tank> {
    console.log('➕ Creating tank:', data.name);
    await delay(500);
    
    try {
      const supabaseData = mapToSupabase(data);
      const { data: insertedData, error } = await supabase
        .from('tanks')
        .insert([supabaseData])
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const mappedData = mapFromSupabase(insertedData);
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
      const { data: updatedData, error } = await supabase
        .from('tanks')
        .update(supabaseData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      const mappedData = mapFromSupabase(updatedData);
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
      const { error } = await supabase
        .from('tanks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
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