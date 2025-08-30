import { Network, NetworkId, NetworkInput } from '@/types/network';

// In-memory storage for networks
let networksData: Network[] = [
  {
    id: "1",
    name: "Демо сеть АЗС",
    description: "Демонстрационная сеть заправочных станций",
    type: "АЗС",
    pointsCount: 0
  },
  {
    id: "2", 
    name: "Норд Лайн",
    description: "Сеть заправочных станций Норд Лайн",
    type: "АЗС",
    pointsCount: 2
  }
];

let nextId = 3;

export const networksStore = {
  getAll: (): Network[] => [...networksData],
  
  getById: (id: NetworkId): Network | undefined => 
    networksData.find(n => n.id === id),
    
  create: (input: NetworkInput): Network => {
    const network: Network = {
      id: String(nextId++),
      name: input.name,
      description: input.description,
      type: input.type,
      pointsCount: 0
    };
    networksData.push(network);
    return network;
  },
  
  update: (id: NetworkId, input: NetworkInput): Network | null => {
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    networksData[index] = {
      ...networksData[index],
      name: input.name,
      description: input.description,
      type: input.type
    };
    
    return networksData[index];
  },
  
  remove: (id: NetworkId): boolean => {
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    networksData.splice(index, 1);
    return true;
  },
  
  updatePointsCount: (id: NetworkId, count: number): void => {
    const network = networksData.find(n => n.id === id);
    if (network) {
      network.pointsCount = count;
    }
  }
};