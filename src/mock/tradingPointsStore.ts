import { NetworkId } from '@/types/network';
import { TradingPoint, TradingPointId, TradingPointInput } from '@/types/tradingpoint';

// In-memory storage for trading points
let tradingPointsData: TradingPoint[] = [
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