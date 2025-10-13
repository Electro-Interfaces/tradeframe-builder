/**
 * Сервис для работы с торговыми точками
 * Использует tenants.settings.stations в Supabase
 * Торговые точки хранятся как массив станций внутри tenant с type='network'
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput } from '@/types/tradingpoint';
import { supabaseService as supabase } from './supabaseServiceClient';

// Функция для генерации уникального ID торговой точки
function generateStationId(networkCode: string, stationCode: string): string {
  return `${networkCode}-azs-${stationCode}`;
}

// Функция для парсинга ID торговой точки
function parseStationId(id: string): { networkCode: string; stationCode: string } | null {
  const parts = id.split('-azs-');
  if (parts.length !== 2) return null;
  return {
    networkCode: parts[0],
    stationCode: parts[1]
  };
}

// API сервис для работы с торговыми точками через tenants.settings.stations
export const tradingPointsService = {
  // Получить все торговые точки из всех сетей
  async getAll(): Promise<TradingPoint[]> {
    try {
      // Получаем все tenants с type='network'
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('type', 'network')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Supabase error loading tenants:', error);
        throw new Error(`Ошибка загрузки сетей: ${error.message}`);
      }

      if (!tenants) return [];

      // Извлекаем все станции из всех сетей
      const allPoints: TradingPoint[] = [];

      for (const tenant of tenants) {
        const stations = tenant.settings?.stations || [];
        const networkId = tenant.id;
        const networkCode = tenant.code;

        for (const station of stations) {
          if (!station.active) continue; // Пропускаем неактивные

          allPoints.push({
            id: generateStationId(networkCode, station.code),
            external_id: station.code,
            networkId: networkId,
            name: station.name || `АЗС №${station.code}`,
            description: `${tenant.name} - ${station.name}`,
            geolocation: {
              address: station.address || ''
            },
            phone: '',
            email: '',
            website: '',
            isBlocked: !station.active,
            blockReason: '',
            schedule: {},
            services: {},
            externalCodes: [station.code],
            createdAt: new Date(tenant.created_at),
            updatedAt: new Date(tenant.updated_at)
          });
        }
      }

      return allPoints;
    } catch (error) {
      console.error('💥 Critical error loading trading points:', error);
      throw error;
    }
  },

  // Получить торговые точки по ID сети
  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', networkId)
        .eq('type', 'network')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return []; // Сеть не найдена
        }
        console.error('❌ Supabase error loading tenant:', error);
        throw new Error(`Ошибка загрузки сети: ${error.message}`);
      }

      if (!tenant) return [];

      const stations = tenant.settings?.stations || [];
      const networkCode = tenant.code;

      return stations
        .filter(station => station.active)
        .map(station => ({
          id: generateStationId(networkCode, station.code),
          external_id: station.code,
          networkId: tenant.id,
          name: station.name || `АЗС №${station.code}`,
          description: `${tenant.name} - ${station.name}`,
          geolocation: {
            address: station.address || ''
          },
          phone: '',
          email: '',
          website: '',
          isBlocked: !station.active,
          blockReason: '',
          schedule: {},
          services: {},
          externalCodes: [station.code],
          createdAt: new Date(tenant.created_at),
          updatedAt: new Date(tenant.updated_at)
        }));
    } catch (error) {
      console.error('💥 Critical error loading trading points by network:', error);
      throw error;
    }
  },

  // Получить торговую точку по ID
  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    try {
      const parsed = parseStationId(id);
      if (!parsed) {
        console.error('Invalid trading point ID format:', id);
        return null;
      }

      // Находим tenant по code
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', parsed.networkCode)
        .eq('type', 'network')
        .single();

      if (error || !tenant) {
        return null;
      }

      const stations = tenant.settings?.stations || [];
      const station = stations.find(s => s.code === parsed.stationCode);

      if (!station) {
        return null;
      }

      return {
        id: id,
        external_id: station.code,
        networkId: tenant.id,
        name: station.name || `АЗС №${station.code}`,
        description: `${tenant.name} - ${station.name}`,
        geolocation: {
          address: station.address || ''
        },
        phone: '',
        email: '',
        website: '',
        isBlocked: !station.active,
        blockReason: '',
        schedule: {},
        services: {},
        externalCodes: [station.code],
        createdAt: new Date(tenant.created_at),
        updatedAt: new Date(tenant.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error loading trading point by ID:', error);
      return null;
    }
  },

  // Создать новую торговую точку (добавить станцию в tenant.settings.stations)
  async create(input: TradingPointInput): Promise<TradingPoint> {
    try {
      if (!input.networkId) {
        throw new Error('NetworkId is required for creating trading point');
      }

      // Получаем текущий tenant
      const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', input.networkId)
        .eq('type', 'network')
        .single();

      if (fetchError || !tenant) {
        throw new Error('Network not found');
      }

      const stations = tenant.settings?.stations || [];

      // Генерируем код для новой станции
      const maxCode = stations.length > 0
        ? Math.max(...stations.map(s => parseInt(s.code) || 0))
        : 0;
      const newCode = String(maxCode + 1);

      // Создаем новую станцию
      const newStation = {
        code: newCode,
        name: input.name,
        address: input.geolocation?.address || '',
        active: !input.isBlocked
      };

      // Добавляем станцию в массив
      const updatedStations = [...stations, newStation];

      // Обновляем tenant
      const { data: updated, error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations: updatedStations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', input.networkId)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to create trading point: ${updateError?.message}`);
      }

      const stationId = generateStationId(tenant.code, newCode);

      return {
        id: stationId,
        external_id: newCode,
        networkId: tenant.id,
        name: newStation.name,
        description: `${tenant.name} - ${newStation.name}`,
        geolocation: {
          address: newStation.address
        },
        phone: '',
        email: '',
        website: '',
        isBlocked: !newStation.active,
        blockReason: '',
        schedule: {},
        services: {},
        externalCodes: [newCode],
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error creating trading point:', error);
      throw error;
    }
  },

  // Обновить торговую точку (обновить станцию в tenant.settings.stations)
  async update(id: TradingPointId, input: TradingPointInput): Promise<TradingPoint | null> {
    try {
      const parsed = parseStationId(id);
      if (!parsed) {
        throw new Error('Invalid trading point ID format');
      }

      // Находим tenant
      const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', parsed.networkCode)
        .eq('type', 'network')
        .single();

      if (fetchError || !tenant) {
        return null;
      }

      const stations = tenant.settings?.stations || [];
      const stationIndex = stations.findIndex(s => s.code === parsed.stationCode);

      if (stationIndex === -1) {
        return null;
      }

      // Обновляем станцию
      stations[stationIndex] = {
        ...stations[stationIndex],
        name: input.name,
        address: input.geolocation?.address || stations[stationIndex].address,
        active: !input.isBlocked
      };

      // Сохраняем изменения
      const { data: updated, error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations: stations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(`Failed to update trading point: ${updateError?.message}`);
      }

      const updatedStation = stations[stationIndex];

      return {
        id: id,
        external_id: updatedStation.code,
        networkId: tenant.id,
        name: updatedStation.name,
        description: `${tenant.name} - ${updatedStation.name}`,
        geolocation: {
          address: updatedStation.address
        },
        phone: '',
        email: '',
        website: '',
        isBlocked: !updatedStation.active,
        blockReason: '',
        schedule: {},
        services: {},
        externalCodes: [updatedStation.code],
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error updating trading point:', error);
      throw error;
    }
  },

  // Удалить торговую точку (установить active=false)
  async remove(id: TradingPointId): Promise<boolean> {
    try {
      const parsed = parseStationId(id);
      if (!parsed) {
        throw new Error('Invalid trading point ID format');
      }

      // Находим tenant
      const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', parsed.networkCode)
        .eq('type', 'network')
        .single();

      if (fetchError || !tenant) {
        return false;
      }

      const stations = tenant.settings?.stations || [];
      const stationIndex = stations.findIndex(s => s.code === parsed.stationCode);

      if (stationIndex === -1) {
        return false;
      }

      // Деактивируем станцию (soft delete)
      stations[stationIndex] = {
        ...stations[stationIndex],
        active: false
      };

      // Сохраняем изменения
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations: stations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (updateError) {
        throw new Error(`Failed to delete trading point: ${updateError.message}`);
      }

      return true;
    } catch (error) {
      console.error('💥 Critical error deleting trading point:', error);
      throw error;
    }
  },

  // Алиас для remove (для совместимости)
  async delete(id: TradingPointId): Promise<boolean> {
    return this.remove(id);
  },

  // Поиск торговых точек
  async search(query: string): Promise<TradingPoint[]> {
    if (!query.trim()) {
      return this.getAll();
    }

    try {
      const allPoints = await this.getAll();
      const lowerQuery = query.toLowerCase();

      return allPoints.filter(point =>
        point.name.toLowerCase().includes(lowerQuery) ||
        point.description?.toLowerCase().includes(lowerQuery) ||
        point.geolocation?.address?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('💥 Critical error searching trading points:', error);
      throw error;
    }
  },

  // Получить торговые точки с информацией о сети
  async getAllWithNetworks(): Promise<(TradingPoint & { networkName: string })[]> {
    try {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('type', 'network')
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to load tenants: ${error.message}`);
      }

      if (!tenants) return [];

      const allPoints: (TradingPoint & { networkName: string })[] = [];

      for (const tenant of tenants) {
        const stations = tenant.settings?.stations || [];
        const networkCode = tenant.code;

        for (const station of stations) {
          if (!station.active) continue;

          allPoints.push({
            id: generateStationId(networkCode, station.code),
            external_id: station.code,
            networkId: tenant.id,
            networkName: tenant.name,
            name: station.name || `АЗС №${station.code}`,
            description: `${tenant.name} - ${station.name}`,
            geolocation: {
              address: station.address || ''
            },
            phone: '',
            email: '',
            website: '',
            isBlocked: !station.active,
            blockReason: '',
            schedule: {},
            services: {},
            externalCodes: [station.code],
            createdAt: new Date(tenant.created_at),
            updatedAt: new Date(tenant.updated_at)
          });
        }
      }

      return allPoints;
    } catch (error) {
      console.error('💥 Critical error loading trading points with networks:', error);
      throw error;
    }
  },

  // Получить статистику по торговым точкам
  async getStatistics(): Promise<{
    totalPoints: number;
    activePoints: number;
    blockedPoints: number;
    pointsByNetwork: Record<string, number>;
  }> {
    try {
      const points = await this.getAllWithNetworks();

      const totalPoints = points.length;
      const activePoints = points.filter(point => !point.isBlocked).length;
      const blockedPoints = points.filter(point => point.isBlocked).length;

      const pointsByNetwork: Record<string, number> = {};
      points.forEach(point => {
        pointsByNetwork[point.networkName] = (pointsByNetwork[point.networkName] || 0) + 1;
      });

      return {
        totalPoints,
        activePoints,
        blockedPoints,
        pointsByNetwork
      };
    } catch (error) {
      console.error('💥 Critical error getting statistics:', error);
      throw error;
    }
  }
};

// Экспорт для обратной совместимости
export default tradingPointsService;
