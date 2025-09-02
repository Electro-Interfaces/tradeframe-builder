/**
 * Сервис для работы с торговыми сетями
 * Включает персистентное хранение в localStorage
 */

import { Network, NetworkId, NetworkInput } from '@/types/network';
import { PersistentStorage } from '@/utils/persistentStorage';

// Начальные данные сетей
const initialNetworks: Network[] = [
  {
    id: "1",
    name: "Демо сеть АЗС",
    description: "Демонстрационная сеть заправочных станций",
    type: "АЗС",
    pointsCount: 5,
    created_at: new Date('2024-01-01').toISOString(),
    updated_at: new Date('2024-01-01').toISOString()
  },
  {
    id: "2",
    name: "Норд Лайн",
    description: "Сеть АЗС Норд Лайн",
    type: "АЗС",
    pointsCount: 1,
    created_at: new Date('2024-02-15').toISOString(),
    updated_at: new Date('2024-02-15').toISOString()
  }
];

// Загружаем данные из localStorage
let networksData: Network[] = PersistentStorage.load<Network>('networks', initialNetworks);
// Найдём максимальный ID среди всех сетей (включая те что могли быть удалены)
let nextId = Math.max(
  ...networksData.map(n => parseInt(n.id) || 0), 
  ...initialNetworks.map(n => parseInt(n.id) || 0),
  3 // Минимум 4 чтобы не перезаписывать существующие ID 1,2,3
) + 1;

// Функция для сохранения изменений
const saveNetworks = () => {
  PersistentStorage.save('networks', networksData);
};

// API сервис с персистентным хранением
export const networksService = {
  // Получить все сети
  async getAll(): Promise<Network[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [...networksData].sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить сеть по ID
  async getById(id: NetworkId): Promise<Network | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return networksData.find(n => n.id === id) || null;
  },

  // Создать новую сеть
  async create(input: NetworkInput): Promise<Network> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const newNetwork: Network = {
      id: String(nextId++),
      name: input.name,
      description: input.description,
      type: input.type,
      pointsCount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    networksData.push(newNetwork);
    saveNetworks();
    
    return newNetwork;
  },

  // Обновить сеть
  async update(id: NetworkId, input: NetworkInput): Promise<Network | null> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    const updated: Network = {
      ...networksData[index],
      name: input.name,
      description: input.description,
      type: input.type,
      updated_at: new Date().toISOString()
    };

    networksData[index] = updated;
    saveNetworks();
    
    return updated;
  },

  // Удалить сеть
  async remove(id: NetworkId): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    // Проверяем, есть ли торговые точки в этой сети
    const network = networksData[index];
    if (network.pointsCount > 0) {
      throw new Error('Нельзя удалить сеть с привязанными торговыми точками');
    }
    
    networksData.splice(index, 1);
    saveNetworks();
    
    return true;
  },

  // Алиас для remove (для совместимости)
  async delete(id: NetworkId): Promise<boolean> {
    return this.remove(id);
  },

  // Обновить количество точек в сети
  async updatePointsCount(id: NetworkId, count: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const network = networksData.find(n => n.id === id);
    if (network) {
      network.pointsCount = count;
      network.updated_at = new Date().toISOString();
      saveNetworks();
    }
  },

  // Поиск сетей
  async search(query: string): Promise<Network[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!query.trim()) {
      return this.getAll();
    }
    
    const searchLower = query.toLowerCase();
    return networksData.filter(network => 
      network.name.toLowerCase().includes(searchLower) ||
      network.description.toLowerCase().includes(searchLower) ||
      network.type.toLowerCase().includes(searchLower)
    ).sort((a, b) => a.name.localeCompare(b.name));
  },

  // Получить статистику по сетям
  async getStatistics(): Promise<{
    totalNetworks: number;
    totalPoints: number;
    averagePointsPerNetwork: number;
    networksByType: Record<string, number>;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const totalNetworks = networksData.length;
    const totalPoints = networksData.reduce((sum, network) => sum + network.pointsCount, 0);
    const averagePointsPerNetwork = totalNetworks > 0 ? Math.round(totalPoints / totalNetworks * 100) / 100 : 0;
    
    const networksByType: Record<string, number> = {};
    networksData.forEach(network => {
      networksByType[network.type] = (networksByType[network.type] || 0) + 1;
    });
    
    return {
      totalNetworks,
      totalPoints,
      averagePointsPerNetwork,
      networksByType
    };
  }
};

// Экспорт store для обратной совместимости с существующим кодом
export const networksStore = {
  getAll: () => networksData,
  getById: (id: NetworkId) => networksData.find(n => n.id === id),
  create: (input: NetworkInput) => {
    const network: Network = {
      id: String(nextId++),
      name: input.name,
      description: input.description,
      type: input.type,
      pointsCount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    networksData.push(network);
    saveNetworks();
    return network;
  },
  update: (id: NetworkId, input: NetworkInput) => {
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return null;
    
    networksData[index] = {
      ...networksData[index],
      name: input.name,
      description: input.description,
      type: input.type,
      updated_at: new Date().toISOString()
    };
    
    saveNetworks();
    return networksData[index];
  },
  remove: (id: NetworkId) => {
    const index = networksData.findIndex(n => n.id === id);
    if (index === -1) return false;
    
    networksData.splice(index, 1);
    saveNetworks();
    return true;
  },
  updatePointsCount: (id: NetworkId, count: number) => {
    const network = networksData.find(n => n.id === id);
    if (network) {
      network.pointsCount = count;
      network.updated_at = new Date().toISOString();
      saveNetworks();
    }
  }
};