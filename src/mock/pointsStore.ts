import { NetworkId } from '@/types/network';

export interface TradingPoint {
  id: string;
  name: string;
  code: string;
  city: string;
  status: string;
  networkId: NetworkId;
}

// In-memory storage for trading points
let pointsData: TradingPoint[] = [
  {
    id: "1",
    name: "АЗС №001 — Центральная",
    code: "A001",
    city: "Казань",
    status: "Активный",
    networkId: "2"
  },
  {
    id: "2",
    name: "АЗС №002 — Северная", 
    code: "A002",
    city: "Казань",
    status: "Активный",
    networkId: "2"
  }
];

let nextPointId = 3;

export const pointsStore = {
  getAll: (): TradingPoint[] => [...pointsData],
  
  getByNetworkId: (networkId: NetworkId): TradingPoint[] =>
    pointsData.filter(p => p.networkId === networkId),
    
  getCountByNetworkId: (networkId: NetworkId): number =>
    pointsData.filter(p => p.networkId === networkId).length,
    
  removeByNetworkId: (networkId: NetworkId): void => {
    pointsData = pointsData.filter(p => p.networkId !== networkId);
  },
  
  create: (point: Omit<TradingPoint, 'id'>): TradingPoint => {
    const newPoint: TradingPoint = {
      id: String(nextPointId++),
      ...point
    };
    pointsData.push(newPoint);
    return newPoint;
  },
  
  remove: (id: string): boolean => {
    const index = pointsData.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    pointsData.splice(index, 1);
    return true;
  }
};