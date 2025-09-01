/**
 * Сервис для работы с торговыми точками
 * Включает персистентное хранение в localStorage
 */

import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput } from '@/types/tradingpoint';
import { PersistentStorage } from '@/utils/persistentStorage';

// Начальные данные торговых точек
const initialTradingPoints: TradingPoint[] = [
  {
    id: "point1",
    networkId: "1",
    name: "АЗС №001 - Центральная",
    description: "Центральная АЗС на Невском проспекте. Круглосуточно, полный сервис.",
    geolocation: {
      latitude: 59.9311,
      longitude: 30.3609,
      region: "Санкт-Петербург",
      city: "Санкт-Петербург",
      address: "Невский проспект, 100, Санкт-Петербург, Россия"
    },
    phone: "+7 (812) 123-45-67",
    email: "central@demo-azs.ru",
    isBlocked: false,
    schedule: {
      monday: "00:00-23:59",
      tuesday: "00:00-23:59",
      wednesday: "00:00-23:59",
      thursday: "00:00-23:59",
      friday: "00:00-23:59",
      saturday: "00:00-23:59",
      sunday: "00:00-23:59",
      isAlwaysOpen: true
    },
    services: {
      selfServiceTerminal: true,
      airPump: true,
      carWash: true,
      shop: true,
      cafe: false,
      lubricants: false,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: false
    },
    externalCodes: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: "point2",
    networkId: "1",
    name: "АЗС №002 - Северная",
    description: "Северная АЗС для коммерческого транспорта.",
    geolocation: {
      latitude: 60.0348,
      longitude: 30.3158,
      region: "Санкт-Петербург",
      city: "Санкт-Петербург",
      address: "пр. Энгельса, 154, Санкт-Петербург, Россия"
    },
    phone: "+7 (812) 234-56-78",
    email: "north@demo-azs.ru",
    isBlocked: false,
    schedule: {
      monday: "06:00-23:00",
      tuesday: "06:00-23:00",
      wednesday: "06:00-23:00",
      thursday: "06:00-23:00",
      friday: "06:00-23:00",
      saturday: "06:00-23:00",
      sunday: "06:00-23:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: false,
      airPump: true,
      carWash: false,
      shop: false,
      cafe: false,
      lubricants: true,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: true
    },
    externalCodes: [],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: "point3",
    networkId: "1",
    name: "АЗС №003 - Южная",
    description: "Семейная АЗС с кафе и автомойкой.",
    geolocation: {
      latitude: 59.8533,
      longitude: 30.3492,
      region: "Санкт-Петербург",
      city: "Санкт-Петербург",
      address: "Московский проспект, 220, Санкт-Петербург, Россия"
    },
    phone: "+7 (812) 345-67-89",
    email: "south@demo-azs.ru",
    isBlocked: false,
    schedule: {
      monday: "07:00-22:00",
      tuesday: "07:00-22:00",
      wednesday: "07:00-22:00",
      thursday: "07:00-22:00",
      friday: "07:00-22:00",
      saturday: "07:00-22:00",
      sunday: "07:00-22:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: false,
      airPump: false,
      carWash: true,
      shop: false,
      cafe: true,
      lubricants: false,
      waterService: false,
      gasBottleExchange: true,
      electricCharging: false,
      truckParking: false
    },
    externalCodes: [],
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: "point4",
    networkId: "1",
    name: "АЗС №004 - Московское шоссе",
    description: "Трассовая АЗС с зарядкой электромобилей. 24/7.",
    geolocation: {
      latitude: 59.8267,
      longitude: 30.3417,
      region: "Санкт-Петербург", 
      city: "Санкт-Петербург",
      address: "Московское шоссе, 45, Санкт-Петербург, Россия"
    },
    phone: "+7 (812) 456-78-90",
    email: "moscow-highway@demo-azs.ru",
    isBlocked: false,
    schedule: {
      monday: "00:00-23:59",
      tuesday: "00:00-23:59", 
      wednesday: "00:00-23:59",
      thursday: "00:00-23:59",
      friday: "00:00-23:59",
      saturday: "00:00-23:59",
      sunday: "00:00-23:59",
      isAlwaysOpen: true
    },
    services: {
      selfServiceTerminal: true,
      airPump: true,
      carWash: false,
      shop: false,
      cafe: false,
      lubricants: false,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: true,
      truckParking: true
    },
    externalCodes: [],
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: "point5",
    networkId: "1",
    name: "АЗС №005 - Промзона",
    description: "Промышленная АЗС для коммерческих клиентов.",
    geolocation: {
      latitude: 59.8847,
      longitude: 30.4214,
      region: "Санкт-Петербург",
      city: "Санкт-Петербург", 
      address: "Индустриальный проспект, 12, Санкт-Петербург, Россия"
    },
    phone: "+7 (812) 567-89-01",
    email: "industrial@demo-azs.ru",
    isBlocked: false,
    schedule: {
      monday: "06:00-22:00",
      tuesday: "06:00-22:00",
      wednesday: "06:00-22:00", 
      thursday: "06:00-22:00",
      friday: "06:00-22:00",
      saturday: "06:00-22:00",
      sunday: "08:00-20:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: false,
      airPump: false,
      carWash: false,
      shop: true,
      cafe: false,
      lubricants: true,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: true
    },
    externalCodes: [],
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10')
  },
  {
    id: "point6",
    networkId: "2",
    name: "АЗС №006 - Окружная",
    description: "АЗС на Окружной дороге",
    geolocation: {
      latitude: 55.771244,
      longitude: 37.648423,
      region: "Москва",
      city: "Москва",
      address: "Окружная дорога, км 5"
    },
    phone: "+7 (495) 123-45-67",
    email: "okruzhnaya@nordline.ru",
    isBlocked: false,
    schedule: {
      monday: "06:00-22:00",
      tuesday: "06:00-22:00",
      wednesday: "06:00-22:00",
      thursday: "06:00-22:00",
      friday: "06:00-22:00",
      saturday: "07:00-21:00",
      sunday: "07:00-21:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: true,
      airPump: true,
      carWash: false,
      shop: true,
      cafe: false,
      lubricants: false,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: false
    },
    externalCodes: [],
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-02-15')
  }
];

// Функция для восстановления Date объектов после загрузки из JSON
const reviveDates = (points: TradingPoint[]): TradingPoint[] => {
  return points.map(point => ({
    ...point,
    createdAt: point.createdAt instanceof Date ? point.createdAt : new Date(point.createdAt),
    updatedAt: point.updatedAt instanceof Date ? point.updatedAt : new Date(point.updatedAt || point.createdAt),
    externalCodes: point.externalCodes?.map(code => ({
      ...code,
      createdAt: code.createdAt instanceof Date ? code.createdAt : new Date(code.createdAt),
      updatedAt: code.updatedAt instanceof Date ? code.updatedAt : (code.updatedAt ? new Date(code.updatedAt) : undefined)
    })) || []
  }));
};

// Загружаем данные из localStorage
let tradingPointsData: TradingPoint[] = reviveDates(PersistentStorage.load<TradingPoint>('tradingPoints', initialTradingPoints));
let nextId = Math.max(...tradingPointsData.map(tp => parseInt(tp.id.replace('point', '')) || 0)) + 1;

// Функция для сохранения изменений
const saveTradingPoints = () => {
  PersistentStorage.save('tradingPoints', tradingPointsData);
};

// Функция для обновления счетчика точек у сети
const updateNetworkPointsCount = async (networkId: string) => {
  if (!networkId) return;
  
  try {
    // Подсчитываем количество точек для данной сети
    const pointsCount = tradingPointsData.filter(tp => tp.networkId === networkId).length;
    
    // Динамически импортируем networksService чтобы избежать циклических зависимостей
    const { networksService } = await import('./networksService');
    
    // Обновляем счетчик в сети
    await networksService.updatePointsCount(networkId, pointsCount);
    
    console.log(`✅ Обновлен счетчик точек для сети ${networkId}: ${pointsCount}`);
  } catch (error) {
    console.error('❌ Ошибка обновления счетчика точек:', error);
  }
};

// API сервис с персистентным хранением
export const tradingPointsService = {
  // Получить все торговые точки
  async getAll(): Promise<TradingPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...tradingPointsData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить торговую точку по ID
  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return tradingPointsData.find(tp => tp.id === id) || null;
  },

  // Получить торговые точки по ID сети
  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 120));
    return tradingPointsData
      .filter(tp => tp.networkId === networkId)
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  // Создать новую торговую точку
  async create(input: TradingPointInput): Promise<TradingPoint> {
    await new Promise(resolve => setTimeout(resolve, 350));
    
    const newTradingPoint: TradingPoint = {
      id: `point${nextId++}`,
      networkId: input.networkId,
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked || false,
      schedule: input.schedule,
      services: input.services || {
        selfServiceTerminal: false,
        airPump: false,
        carWash: false,
        shop: false,
        cafe: false,
        lubricants: false,
        waterService: false,
        gasBottleExchange: false,
        electricCharging: false,
        truckParking: false
      },
      externalCodes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    tradingPointsData.push(newTradingPoint);
    saveTradingPoints();
    
    // Обновляем счетчик точек у сети
    updateNetworkPointsCount(input.networkId);
    
    return newTradingPoint;
  },

  // Обновить торговую точку
  async update(id: TradingPointId, input: TradingPointInput): Promise<TradingPoint | null> {
    await new Promise(resolve => setTimeout(resolve, 280));
    
    const index = tradingPointsData.findIndex(tp => tp.id === id);
    if (index === -1) return null;
    
    const updated: TradingPoint = {
      ...tradingPointsData[index],
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked || false,
      schedule: input.schedule,
      services: input.services || tradingPointsData[index].services,
      externalCodes: input.externalCodes || tradingPointsData[index].externalCodes,
      updatedAt: new Date()
    };

    tradingPointsData[index] = updated;
    saveTradingPoints();
    
    return updated;
  },

  // Удалить торговую точку
  async remove(id: TradingPointId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = tradingPointsData.findIndex(tp => tp.id === id);
    if (index === -1) return false;
    
    const networkId = tradingPointsData[index].networkId;
    
    tradingPointsData.splice(index, 1);
    saveTradingPoints();
    
    // Обновляем счетчик точек у сети
    updateNetworkPointsCount(networkId);
    
    return true;
  },

  // Алиас для remove (для совместимости)
  async delete(id: TradingPointId): Promise<boolean> {
    return this.remove(id);
  },

  // Удалить все торговые точки сети
  async removeByNetworkId(networkId: NetworkId): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const initialLength = tradingPointsData.length;
    tradingPointsData = tradingPointsData.filter(tp => tp.networkId !== networkId);
    const removedCount = initialLength - tradingPointsData.length;
    
    if (removedCount > 0) {
      saveTradingPoints();
    }
    
    return removedCount;
  },

  // Получить количество торговых точек в сети
  async getCountByNetworkId(networkId: NetworkId): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 80));
    return tradingPointsData.filter(tp => tp.networkId === networkId).length;
  },

  // Поиск торговых точек
  async search(query: string, networkId?: NetworkId): Promise<TradingPoint[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let filteredPoints = tradingPointsData;
    
    // Фильтр по сети, если указан
    if (networkId) {
      filteredPoints = filteredPoints.filter(tp => tp.networkId === networkId);
    }
    
    // Поиск по запросу
    if (!query.trim()) {
      return filteredPoints.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    const searchLower = query.toLowerCase();
    return filteredPoints.filter(tp => 
      tp.name.toLowerCase().includes(searchLower) ||
      tp.description?.toLowerCase().includes(searchLower) ||
      tp.geolocation?.address?.toLowerCase().includes(searchLower) ||
      tp.geolocation?.city?.toLowerCase().includes(searchLower) ||
      tp.phone?.toLowerCase().includes(searchLower) ||
      tp.email?.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Блокировка/разблокировка торговой точки
  async toggleBlock(id: TradingPointId): Promise<TradingPoint | null> {
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const tradingPoint = tradingPointsData.find(tp => tp.id === id);
    if (!tradingPoint) return null;
    
    tradingPoint.isBlocked = !tradingPoint.isBlocked;
    tradingPoint.updatedAt = new Date();
    
    saveTradingPoints();
    
    return tradingPoint;
  },

  // Получить статистику по торговым точкам
  async getStatistics(): Promise<{
    totalPoints: number;
    blockedPoints: number;
    activePoints: number;
    pointsByNetwork: Record<string, number>;
    pointsByRegion: Record<string, number>;
    servicesStats: Record<string, number>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 120));
    
    const totalPoints = tradingPointsData.length;
    const blockedPoints = tradingPointsData.filter(tp => tp.isBlocked).length;
    const activePoints = totalPoints - blockedPoints;
    
    // Статистика по сетям
    const pointsByNetwork: Record<string, number> = {};
    tradingPointsData.forEach(tp => {
      pointsByNetwork[tp.networkId] = (pointsByNetwork[tp.networkId] || 0) + 1;
    });
    
    // Статистика по регионам
    const pointsByRegion: Record<string, number> = {};
    tradingPointsData.forEach(tp => {
      const region = tp.geolocation?.region || 'Не указан';
      pointsByRegion[region] = (pointsByRegion[region] || 0) + 1;
    });
    
    // Статистика по услугам
    const servicesStats: Record<string, number> = {};
    const serviceNames = [
      'selfServiceTerminal', 'airPump', 'carWash', 'shop', 'cafe',
      'lubricants', 'waterService', 'gasBottleExchange', 'electricCharging', 'truckParking'
    ];
    
    serviceNames.forEach(service => {
      servicesStats[service] = tradingPointsData.filter(tp => tp.services?.[service as keyof typeof tp.services]).length;
    });
    
    return {
      totalPoints,
      blockedPoints,
      activePoints,
      pointsByNetwork,
      pointsByRegion,
      servicesStats
    };
  }
};

// Экспорт store для обратной совместимости с существующим кодом
export const tradingPointsStore = {
  getAll: (): TradingPoint[] => [...tradingPointsData],
  
  getById: (id: TradingPointId): TradingPoint | undefined => 
    tradingPointsData.find(tp => tp.id === id),
    
  getByNetworkId: (networkId: NetworkId): TradingPoint[] =>
    tradingPointsData.filter(tp => tp.networkId === networkId),
    
  create: (input: TradingPointInput): TradingPoint => {
    const tradingPoint: TradingPoint = {
      id: `point${nextId++}`,
      networkId: input.networkId || '',
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked || false,
      schedule: input.schedule,
      services: input.services || {
        selfServiceTerminal: false,
        airPump: false,
        carWash: false,
        shop: false,
        cafe: false,
        lubricants: false,
        waterService: false,
        gasBottleExchange: false,
        electricCharging: false,
        truckParking: false
      },
      externalCodes: input.externalCodes || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    tradingPointsData.push(tradingPoint);
    saveTradingPoints();
    return tradingPoint;
  },
  
  update: (id: TradingPointId, input: TradingPointInput): TradingPoint | null => {
    const index = tradingPointsData.findIndex(tp => tp.id === id);
    if (index === -1) return null;
    
    tradingPointsData[index] = {
      ...tradingPointsData[index],
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked || false,
      schedule: input.schedule,
      services: input.services || tradingPointsData[index].services,
      externalCodes: input.externalCodes || tradingPointsData[index].externalCodes,
      updatedAt: new Date()
    };
    
    saveTradingPoints();
    return tradingPointsData[index];
  },
  
  remove: (id: TradingPointId): boolean => {
    const index = tradingPointsData.findIndex(tp => tp.id === id);
    if (index === -1) return false;
    
    tradingPointsData.splice(index, 1);
    saveTradingPoints();
    return true;
  },
  
  removeByNetworkId: (networkId: NetworkId): void => {
    tradingPointsData = tradingPointsData.filter(tp => tp.networkId !== networkId);
    saveTradingPoints();
  },
  
  getCountByNetworkId: (networkId: NetworkId): number => {
    return tradingPointsData.filter(tp => tp.networkId === networkId).length;
  }
};