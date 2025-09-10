import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput } from '@/types/tradingpoint';

// In-memory storage for trading points
let tradingPointsData: TradingPoint[] = [
  {
    id: "point1",
    external_id: "001",
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
    createdAt: new Date()
  },
  {
    id: "point2",
    external_id: "002",
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
    createdAt: new Date()
  },
  {
    id: "point3",
    external_id: "003",
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
    createdAt: new Date()
  },
  {
    id: "point4",
    external_id: "004",
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
    createdAt: new Date()
  },
  {
    id: "point5",
    external_id: "005",
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
    createdAt: new Date()
  },
  {
    id: "point6",
    external_id: "006",
    networkId: "2",
    name: "АЗС №006 - Окружная",
    description: "АЗС на Окружной дороге",
    geolocation: {
      latitude: 55.771244,
      longitude: 37.648423,
      city: "Москва",
      address: "Окружная дорога, км 5"
    },
    isBlocked: false,
    externalCodes: [],
    createdAt: new Date()
  },
  {
    id: "bto-azs-4",
    external_id: "4",
    networkId: "15",
    name: "АЗС 4",
    description: "АЗС 4 - БТО",
    geolocation: {
      latitude: 54.7500,
      longitude: 55.9800,
      region: "Республика Башкортостан",
      city: "Уфа",
      address: "г. Уфа, ул. Победы, 100"
    },
    phone: "+7 (347) 264-75-00",
    email: "azs4@bto.ru",
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
      lubricants: true,
      waterService: false,
      gasBottleExchange: false,
      electricCharging: false,
      truckParking: true
    },
    externalCodes: ["4", "BTO-004"],
    createdAt: new Date()
  }
];

let nextId = 7;

export const tradingPointsStore = {
  getAll: (): TradingPoint[] => [...tradingPointsData],
  
  getById: (id: TradingPointId): TradingPoint | undefined => 
    tradingPointsData.find(tp => tp.id === id),
    
  getByNetworkId: (networkId: NetworkId): TradingPoint[] =>
    tradingPointsData.filter(tp => tp.networkId === networkId),
    
  create: (input: TradingPointInput): TradingPoint => {
    const tradingPoint: TradingPoint = {
      id: String(nextId++),
      networkId: input.networkId || '',
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked || false,
      schedule: input.schedule,
      services: input.services,
      externalCodes: [],
      createdAt: new Date()
    };
    tradingPointsData.push(tradingPoint);
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
      services: input.services,
      updatedAt: new Date()
    };
    
    return tradingPointsData[index];
  },
  
  remove: (id: TradingPointId): boolean => {
    const index = tradingPointsData.findIndex(tp => tp.id === id);
    if (index === -1) return false;
    
    tradingPointsData.splice(index, 1);
    return true;
  },
  
  removeByNetworkId: (networkId: NetworkId): void => {
    tradingPointsData = tradingPointsData.filter(tp => tp.networkId !== networkId);
  },
  
  getCountByNetworkId: (networkId: NetworkId): number => {
    return tradingPointsData.filter(tp => tp.networkId === networkId).length;
  }
};