/**
 * Сервис для работы с торговыми точками
 * Использует tenants.settings.stations в Supabase
 * Торговые точки хранятся как массив станций внутри tenant с type='network'
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput, TradingPointExternalCode, TradingPointUpdateInput } from '@/types/tradingpoint';
import { supabaseService as supabase } from './supabaseServiceClient';

/**
 * Структура external code в БД (внутри station)
 */
interface StationExternalCode {
  id: string;
  system: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Преобразует external codes из формата БД в формат TradingPointExternalCode
 */
function mapExternalCodes(stationCode: string, dbCodes?: StationExternalCode[]): TradingPointExternalCode[] {
  // Если нет external_codes в БД, возвращаем дефолтный код станции
  if (!dbCodes || dbCodes.length === 0) {
    return [{
      id: `default-${stationCode}`,
      system: 'sts',
      code: stationCode,
      description: 'Код станции STS (по умолчанию)',
      isActive: true,
      createdAt: new Date()
    }];
  }
  
  return dbCodes.map(ec => ({
    id: ec.id,
    system: ec.system,
    code: ec.code,
    description: ec.description,
    isActive: ec.isActive,
    createdAt: new Date(ec.createdAt),
    updatedAt: ec.updatedAt ? new Date(ec.updatedAt) : undefined
  }));
}

/**
 * Генерирует уникальный ID для external code
 */
function generateExternalCodeId(): string {
  return `ec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

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
              latitude: station.latitude || 0,
              longitude: station.longitude || 0,
              address: station.address || ''
            },
            phone: '',
            email: '',
            website: '',
            isBlocked: !station.active,
            blockReason: '',
            schedule: {},
            services: {},
            billAcceptorThresholds: station.billAcceptorThresholds,
            externalCodes: mapExternalCodes(station.code, station.external_codes),
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
          description: station.description || `${tenant.name} - ${station.name}`,
          geolocation: {
            latitude: station.latitude || 0,
            longitude: station.longitude || 0,
            region: station.region || '',
            city: station.city || '',
            address: station.address || ''
          },
          phone: station.phone || '',
          email: station.email || '',
          website: station.website || '',
          isBlocked: !station.active,
          blockReason: station.blockReason || '',
          schedule: station.schedule || {},
          services: station.services || {},
          externalCodes: mapExternalCodes(station.code, station.external_codes),
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
      // Обработка специального случая "Все торговые точки"
      if (id === 'all') {
        return null;
      }

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
        description: station.description || `${tenant.name} - ${station.name}`,
        geolocation: {
          latitude: station.latitude || 0,
          longitude: station.longitude || 0,
          region: station.region || '',
          city: station.city || '',
          address: station.address || ''
        },
        phone: station.phone || '',
        email: station.email || '',
        website: station.website || '',
        isBlocked: !station.active,
        blockReason: station.blockReason || '',
        schedule: station.schedule || {},
        services: station.services || {},
        billAcceptorThresholds: station.billAcceptorThresholds,
        fuelLevelThresholds: station.fuelLevelThresholds,
        externalCodes: mapExternalCodes(station.code, station.external_codes),
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
          latitude: input.geolocation?.latitude || 0,
          longitude: input.geolocation?.longitude || 0,
          address: newStation.address
        },
        phone: '',
        email: '',
        website: '',
        isBlocked: !newStation.active,
        blockReason: '',
        schedule: {},
        services: {},
        externalCodes: mapExternalCodes(newCode, undefined),
        createdAt: new Date(updated.created_at),
        updatedAt: new Date(updated.updated_at)
      };
    } catch (error) {
      console.error('💥 Critical error creating trading point:', error);
      throw error;
    }
  },

  // Обновить торговую точку (обновить станцию в tenant.settings.stations)
  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint | null> {
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
      // ✅ ИСПРАВЛЕНИЕ: Сохраняем ВСЕ поля (геолокация, контакты, услуги, расписание, external_id)
      stations[stationIndex] = {
        ...stations[stationIndex],
        code: input.external_id || stations[stationIndex].code,
        name: input.name,
        description: input.description,
        address: input.geolocation?.address || stations[stationIndex].address,
        latitude: input.geolocation?.latitude,
        longitude: input.geolocation?.longitude,
        region: input.geolocation?.region,
        city: input.geolocation?.city,
        phone: input.phone,
        email: input.email,
        website: input.website,
        active: !input.isBlocked,
        blockReason: input.blockReason,
        schedule: input.schedule,
        services: input.services
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

      // Генерируем новый ID на основе обновленного code
      const newId = generateStationId(tenant.code, updatedStation.code);

      return {
        id: newId,
        external_id: updatedStation.code,
        networkId: tenant.id,
        name: updatedStation.name,
        description: updatedStation.description || `${tenant.name} - ${updatedStation.name}`,
        geolocation: {
          latitude: updatedStation.latitude || 0,
          longitude: updatedStation.longitude || 0,
          region: updatedStation.region || '',
          city: updatedStation.city || '',
          address: updatedStation.address || ''
        },
        phone: updatedStation.phone || '',
        email: updatedStation.email || '',
        website: updatedStation.website || '',
        isBlocked: !updatedStation.active,
        blockReason: updatedStation.blockReason || '',
        schedule: updatedStation.schedule || {},
        services: updatedStation.services || {},
        externalCodes: mapExternalCodes(updatedStation.code, updatedStation.external_codes),
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
              latitude: station.latitude || 0,
              longitude: station.longitude || 0,
              address: station.address || ''
            },
            phone: '',
            email: '',
            website: '',
            isBlocked: !station.active,
            blockReason: '',
            schedule: {},
            services: {},
            externalCodes: mapExternalCodes(station.code, station.external_codes),
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
  },

  // Обновить пороговые значения купюроприемника для торговой точки
  async updateBillAcceptorThresholds(
    pointId: TradingPointId,
    thresholds: import('@/types/tradingpoint').BillAcceptorThresholds
  ): Promise<void> {
    try {
      // Парсим ID торговой точки чтобы получить код сети и код станции
      const parsed = parseStationId(pointId);
      if (!parsed) {
        throw new Error(`Неверный формат ID торговой точки: ${pointId}`);
      }

      const { networkCode, stationCode } = parsed;

      // Находим tenant по коду сети
      const { data: tenant, error: findError } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', networkCode)
        .eq('type', 'network')
        .single();

      if (findError || !tenant) {
        throw new Error(`Сеть с кодом ${networkCode} не найдена`);
      }

      // Получаем текущие станции
      const stations = tenant.settings?.stations || [];

      // Находим нужную станцию и обновляем пороги
      const updatedStations = stations.map((station: any) => {
        if (station.code === stationCode) {
          return {
            ...station,
            billAcceptorThresholds: thresholds
          };
        }
        return station;
      });

      // Проверяем, что станция была найдена
      const stationFound = updatedStations.some((s: any) => s.code === stationCode);
      if (!stationFound) {
        throw new Error(`Станция с кодом ${stationCode} не найдена в сети ${networkCode}`);
      }

      // Обновляем tenant с новыми данными станций
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations: updatedStations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (updateError) {
        console.error('❌ Supabase error updating thresholds:', updateError);
        throw new Error(`Ошибка обновления порогов: ${updateError.message}`);
      }
    } catch (error) {
      console.error('💥 Critical error updating bill acceptor thresholds:', error);
      throw error;
    }
  },

  // Обновить пороговые значения уровня топлива для торговой точки
  async updateFuelLevelThresholds(
    pointId: TradingPointId,
    thresholds: import('@/types/tradingpoint').FuelLevelThresholds
  ): Promise<void> {
    try {
      // Парсим ID торговой точки чтобы получить код сети и код станции
      const parsed = parseStationId(pointId);
      if (!parsed) {
        throw new Error(`Неверный формат ID торговой точки: ${pointId}`);
      }

      const { networkCode, stationCode } = parsed;

      // Находим tenant по коду сети
      const { data: tenant, error: findError } = await supabase
        .from('tenants')
        .select('*')
        .eq('code', networkCode)
        .eq('type', 'network')
        .single();

      if (findError || !tenant) {
        throw new Error(`Сеть с кодом ${networkCode} не найдена`);
      }

      // Получаем текущие станции
      const stations = tenant.settings?.stations || [];

      // Находим нужную станцию и обновляем пороги топлива
      const updatedStations = stations.map((station: any) => {
        if (station.code === stationCode) {
          return {
            ...station,
            fuelLevelThresholds: thresholds
          };
        }
        return station;
      });

      // Проверяем, что станция была найдена
      const stationFound = updatedStations.some((s: any) => s.code === stationCode);
      if (!stationFound) {
        throw new Error(`Станция с кодом ${stationCode} не найдена в сети ${networkCode}`);
      }

      // Обновляем tenant с новыми данными станций
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
          settings: {
            ...tenant.settings,
            stations: updatedStations
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (updateError) {
        console.error('❌ Supabase error updating fuel level thresholds:', updateError);
        throw new Error(`Ошибка обновления порогов топлива: ${updateError.message}`);
      }
    } catch (error) {
      console.error('💥 Critical error updating fuel level thresholds:', error);
      throw error;
    }
  },

  /**
   * Добавить внешний код для торговой точки
   * @param pointId - ID торговой точки
   * @param system - Система (sts, msto, fuelup и т.д.)
   * @param code - Код в системе
   * @param description - Описание (опционально)
   */
  async addExternalCode(
    pointId: TradingPointId,
    system: string,
    code: string,
    description?: string
  ): Promise<TradingPointExternalCode> {
    const parsed = parseStationId(pointId);
    if (!parsed) {
      throw new Error(`Неверный формат ID торговой точки: ${pointId}`);
    }

    const { networkCode, stationCode } = parsed;

    // Находим tenant по коду сети
    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', networkCode)
      .eq('type', 'network')
      .single();

    if (findError || !tenant) {
      throw new Error(`Сеть с кодом ${networkCode} не найдена`);
    }

    // Получаем текущие станции
    const stations = tenant.settings?.stations || [];
    const stationIndex = stations.findIndex((s: any) => s.code === stationCode);

    if (stationIndex === -1) {
      throw new Error(`Станция с кодом ${stationCode} не найдена в сети ${networkCode}`);
    }

    // Создаём новый external code
    const newCode: StationExternalCode = {
      id: generateExternalCodeId(),
      system: system.toLowerCase(),
      code,
      description,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Добавляем код к станции
    const station = stations[stationIndex];
    const existingCodes: StationExternalCode[] = station.external_codes || [];
    
    // Проверяем на дубликат
    const duplicate = existingCodes.find(
      ec => ec.system === newCode.system && ec.code === newCode.code && ec.isActive
    );
    if (duplicate) {
      throw new Error(`Код ${code} для системы ${system} уже существует`);
    }

    stations[stationIndex] = {
      ...station,
      external_codes: [...existingCodes, newCode]
    };

    // Сохраняем изменения
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: {
          ...tenant.settings,
          stations
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);

    if (updateError) {
      throw new Error(`Ошибка добавления внешнего кода: ${updateError.message}`);
    }

    return {
      id: newCode.id,
      system: newCode.system,
      code: newCode.code,
      description: newCode.description,
      isActive: newCode.isActive,
      createdAt: new Date(newCode.createdAt)
    };
  },

  /**
   * Обновить внешний код торговой точки
   */
  async updateExternalCode(
    pointId: TradingPointId,
    codeId: string,
    system: string,
    code: string,
    description?: string,
    isActive?: boolean
  ): Promise<TradingPointExternalCode> {
    const parsed = parseStationId(pointId);
    if (!parsed) {
      throw new Error(`Неверный формат ID торговой точки: ${pointId}`);
    }

    const { networkCode, stationCode } = parsed;

    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', networkCode)
      .eq('type', 'network')
      .single();

    if (findError || !tenant) {
      throw new Error(`Сеть с кодом ${networkCode} не найдена`);
    }

    const stations = tenant.settings?.stations || [];
    const stationIndex = stations.findIndex((s: any) => s.code === stationCode);

    if (stationIndex === -1) {
      throw new Error(`Станция с кодом ${stationCode} не найдена`);
    }

    const station = stations[stationIndex];
    const existingCodes: StationExternalCode[] = station.external_codes || [];
    const codeIndex = existingCodes.findIndex(ec => ec.id === codeId);

    if (codeIndex === -1) {
      throw new Error(`Внешний код с ID ${codeId} не найден`);
    }

    // Обновляем код
    const updatedCode: StationExternalCode = {
      ...existingCodes[codeIndex],
      system: system.toLowerCase(),
      code,
      description,
      isActive: isActive ?? existingCodes[codeIndex].isActive,
      updatedAt: new Date().toISOString()
    };

    existingCodes[codeIndex] = updatedCode;
    stations[stationIndex] = {
      ...station,
      external_codes: existingCodes
    };

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: {
          ...tenant.settings,
          stations
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);

    if (updateError) {
      throw new Error(`Ошибка обновления внешнего кода: ${updateError.message}`);
    }

    return {
      id: updatedCode.id,
      system: updatedCode.system,
      code: updatedCode.code,
      description: updatedCode.description,
      isActive: updatedCode.isActive,
      createdAt: new Date(updatedCode.createdAt),
      updatedAt: updatedCode.updatedAt ? new Date(updatedCode.updatedAt) : undefined
    };
  },

  /**
   * Удалить внешний код торговой точки
   */
  async removeExternalCode(pointId: TradingPointId, codeId: string): Promise<boolean> {
    const parsed = parseStationId(pointId);
    if (!parsed) {
      throw new Error(`Неверный формат ID торговой точки: ${pointId}`);
    }

    const { networkCode, stationCode } = parsed;

    const { data: tenant, error: findError } = await supabase
      .from('tenants')
      .select('*')
      .eq('code', networkCode)
      .eq('type', 'network')
      .single();

    if (findError || !tenant) {
      throw new Error(`Сеть с кодом ${networkCode} не найдена`);
    }

    const stations = tenant.settings?.stations || [];
    const stationIndex = stations.findIndex((s: any) => s.code === stationCode);

    if (stationIndex === -1) {
      throw new Error(`Станция с кодом ${stationCode} не найдена`);
    }

    const station = stations[stationIndex];
    const existingCodes: StationExternalCode[] = station.external_codes || [];
    
    // Фильтруем, удаляя код с указанным ID
    const filteredCodes = existingCodes.filter(ec => ec.id !== codeId);

    if (filteredCodes.length === existingCodes.length) {
      throw new Error(`Внешний код с ID ${codeId} не найден`);
    }

    stations[stationIndex] = {
      ...station,
      external_codes: filteredCodes
    };

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        settings: {
          ...tenant.settings,
          stations
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);

    if (updateError) {
      throw new Error(`Ошибка удаления внешнего кода: ${updateError.message}`);
    }

    return true;
  }
};

// Экспорт для обратной совместимости
export default tradingPointsService;
