import { Network, NetworkId, NetworkInput } from '@/types/network';
import { networksStore } from '@/mock/networksStore';
import { tradingPointsStore } from '@/mock/tradingPointsStore';

export interface NetworksRepo {
  list(): Promise<Network[]>;
  create(input: NetworkInput): Promise<Network>;
  update(id: NetworkId, input: NetworkInput): Promise<Network>;
  remove(id: NetworkId): Promise<void>; // каскад: удаляет связанные точки
  getPointsCount(id: NetworkId): Promise<number>;
}

class MockNetworksRepo implements NetworksRepo {
  async list(): Promise<Network[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const networks = networksStore.getAll();
    // Update points count for each network
    networks.forEach(network => {
      const count = tradingPointsStore.getCountByNetworkId(network.id);
      networksStore.updatePointsCount(network.id, count);
    });
    
    return networksStore.getAll();
  }

  async create(input: NetworkInput): Promise<Network> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!input.name.trim()) {
      throw new Error('Название сети обязательно');
    }
    
    return networksStore.create(input);
  }

  async update(id: NetworkId, input: NetworkInput): Promise<Network> {
    // Simulate API delay  
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!input.name.trim()) {
      throw new Error('Название сети обязательно');
    }
    
    const updated = networksStore.update(id, input);
    if (!updated) {
      throw new Error('Сеть не найдена');
    }
    
    return updated;
  }

  async remove(id: NetworkId): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const network = networksStore.getById(id);
    if (!network) {
      throw new Error('Сеть не найдена');
    }
    
    // Cascade delete: remove all trading points
    tradingPointsStore.removeByNetworkId(id);
    
    // Remove the network
    networksStore.remove(id);
  }

  async getPointsCount(id: NetworkId): Promise<number> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return tradingPointsStore.getCountByNetworkId(id);
  }
}

export function createMockNetworksRepo(): NetworksRepo {
  return new MockNetworksRepo();
}