import { TradingPoint, TradingPointId, NetworkId } from '@/types/tradingpoint';

// In-memory storage for trading points
let tradingPointsData: TradingPoint[] = [
  {
    id: "tp-1",
    networkId: "2",
    name: "АЗС №001 — Центральная",
    description: "Центральная заправочная станция в городе",
    geolocation: {
      latitude: 55.7887,
      longitude: 49.1221,
      region: "Республика Татарстан",
      city: "Казань",
      address: "ул. Баумана, 10"
    },
    phone: "+7 (843) 123-45-67",
    email: "central@azs.ru",
    isActive: true,
    isBlocked: false,
    schedule: {
      monday: "08:00-20:00",
      tuesday: "08:00-20:00",
      wednesday: "08:00-20:00",
      thursday: "08:00-20:00",
      friday: "08:00-20:00",
      saturday: "09:00-18:00",
      sunday: "10:00-17:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: true,
      airPump: true,
      waterService: true,
      lubricants: true,
      shop: true,
      cafe: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: false
    },
    externalCodes: [
      {
        id: "ec-1",
        system: "ЕГАИС",
        code: "KZ-001",
        description: "Код в системе ЕГАИС",
        isActive: true,
        createdAt: new Date("2023-01-15T10:00:00Z")
      }
    ],
    createdAt: new Date("2023-01-15T10:00:00Z"),
    updatedAt: new Date("2023-06-01T14:30:00Z")
  },
  {
    id: "tp-2",
    networkId: "2",
    name: "АЗС №002 — Северная",
    description: "Заправочная станция в северном районе",
    geolocation: {
      latitude: 55.8304,
      longitude: 49.0661,
      region: "Республика Татарстан",
      city: "Казань",
      address: "ул. Северная, 45"
    },
    phone: "+7 (843) 234-56-78",
    isActive: true,
    isBlocked: false,
    schedule: {
      isAlwaysOpen: true
    },
    services: {
      selfServiceTerminal: true,
      airPump: true,
      waterService: false,
      lubricants: true,
      shop: true,
      cafe: true,
      gasBottleExchange: true,
      electricCharging: true,
      truckParking: true
    },
    externalCodes: [
      {
        id: "ec-2",
        system: "ЕГАИС",
        code: "KZ-002",
        description: "Код в системе ЕГАИС",
        isActive: true,
        createdAt: new Date("2023-02-01T09:00:00Z")
      }
    ],
    createdAt: new Date("2023-02-01T09:00:00Z")
  },
  {
    id: "tp-3",
    networkId: "1",
    name: "АЗС №101 — Московская",
    description: "Заправочная станция на Московском проспекте",
    geolocation: {
      latitude: 55.7558,
      longitude: 49.2077,
      region: "Республика Татарстан",
      city: "Казань",
      address: "Московский проспект, 125"
    },
    phone: "+7 (843) 345-67-89",
    isActive: false,
    isBlocked: true,
    blockReason: "Техническое обслуживание оборудования",
    schedule: {
      monday: "06:00-24:00",
      tuesday: "06:00-24:00",
      wednesday: "06:00-24:00",
      thursday: "06:00-24:00",
      friday: "06:00-24:00",
      saturday: "06:00-24:00",
      sunday: "07:00-23:00",
      isAlwaysOpen: false
    },
    services: {
      selfServiceTerminal: false,
      airPump: true,
      waterService: true,
      lubricants: false,
      shop: false,
      cafe: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: false
    },
    externalCodes: [],
    createdAt: new Date("2023-03-10T11:00:00Z"),
    updatedAt: new Date("2023-11-15T16:45:00Z")
  }
];

export const tradingPointsStore = {
  getAll: (): TradingPoint[] => [...tradingPointsData],
  
  getById: (id: TradingPointId): TradingPoint | undefined =>
    tradingPointsData.find(p => p.id === id),
  
  getByNetworkId: (networkId: NetworkId): TradingPoint[] =>
    tradingPointsData.filter(p => p.networkId === networkId),
    
  getCountByNetworkId: (networkId: NetworkId): number =>
    tradingPointsData.filter(p => p.networkId === networkId).length,
    
  removeByNetworkId: (networkId: NetworkId): void => {
    tradingPointsData = tradingPointsData.filter(p => p.networkId !== networkId);
  },
  
  create: (networkId: NetworkId, pointInput: Omit<TradingPoint, 'id' | 'networkId' | 'createdAt' | 'externalCodes'>): TradingPoint => {
    const newPoint: TradingPoint = {
      id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      networkId,
      ...pointInput,
      externalCodes: [],
      createdAt: new Date()
    };
    tradingPointsData.push(newPoint);
    return newPoint;
  },
  
  update: (id: TradingPointId, updates: Partial<Omit<TradingPoint, 'id' | 'networkId' | 'createdAt'>>): TradingPoint | null => {
    const index = tradingPointsData.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    tradingPointsData[index] = {
      ...tradingPointsData[index],
      ...updates,
      updatedAt: new Date()
    };
    return tradingPointsData[index];
  },
  
  remove: (id: TradingPointId): boolean => {
    const index = tradingPointsData.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    tradingPointsData.splice(index, 1);
    return true;
  },

  block: (id: TradingPointId, reason: string): TradingPoint | null => {
    const point = tradingPointsData.find(p => p.id === id);
    if (!point) return null;
    
    point.isBlocked = true;
    point.blockReason = reason;
    point.updatedAt = new Date();
    return point;
  },

  unblock: (id: TradingPointId): TradingPoint | null => {
    const point = tradingPointsData.find(p => p.id === id);
    if (!point) return null;
    
    point.isBlocked = false;
    point.blockReason = undefined;
    point.updatedAt = new Date();
    return point;
  },

  addExternalCode: (pointId: TradingPointId, externalCode: Omit<TradingPoint['externalCodes'][0], 'id' | 'createdAt'>): TradingPoint | null => {
    const point = tradingPointsData.find(p => p.id === pointId);
    if (!point) return null;
    
    const newExternalCode = {
      id: `ec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...externalCode,
      createdAt: new Date()
    };
    
    point.externalCodes.push(newExternalCode);
    point.updatedAt = new Date();
    return point;
  },

  removeExternalCode: (pointId: TradingPointId, externalCodeId: string): TradingPoint | null => {
    const point = tradingPointsData.find(p => p.id === pointId);
    if (!point) return null;
    
    point.externalCodes = point.externalCodes.filter(ec => ec.id !== externalCodeId);
    point.updatedAt = new Date();
    return point;
  }
};