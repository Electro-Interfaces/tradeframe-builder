import { TradingPoint, TradingPointId, TradingPointInput, TradingPointUpdateInput, NetworkId } from '@/types/tradingpoint';
import { tradingPointsStore } from '@/mock/tradingPointsStore';
import { networksStore } from '@/mock/networksStore';

const MOCK_API_DELAY = 150;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const tradingPointsRepo = {
  async getAll(): Promise<TradingPoint[]> {
    await delay(MOCK_API_DELAY);
    return tradingPointsStore.getAll();
  },

  async getById(id: TradingPointId): Promise<TradingPoint | null> {
    await delay(MOCK_API_DELAY);
    return tradingPointsStore.getById(id) || null;
  },

  async getByNetworkId(networkId: NetworkId): Promise<TradingPoint[]> {
    await delay(MOCK_API_DELAY);
    return tradingPointsStore.getByNetworkId(networkId);
  },

  async create(networkId: NetworkId, input: TradingPointInput): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    if (!input.name?.trim()) {
      throw new Error('Название торговой точки обязательно');
    }

    const tradingPointInput: TradingPointInput = {
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked,
      schedule: input.schedule,
      services: input.services
    };

    const created = tradingPointsStore.create(tradingPointInput);
    
    // Update network points count
    const count = tradingPointsStore.getCountByNetworkId(networkId);
    networksStore.updatePointsCount(networkId, count);
    
    return created;
  },

  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    if (!input.name?.trim()) {
      throw new Error('Название торговой точки обязательно');
    }

    const tradingPointInput: TradingPointInput = {
      name: input.name,
      description: input.description,
      geolocation: input.geolocation,
      phone: input.phone,
      email: input.email,
      website: input.website,
      isBlocked: input.isBlocked,
      schedule: input.schedule,
      services: input.services
    };

    const updated = tradingPointsStore.update(id, tradingPointInput);
    if (!updated) {
      throw new Error('Торговая точка не найдена');
    }
    
    return updated;
  },

  async delete(id: TradingPointId): Promise<void> {
    await delay(MOCK_API_DELAY);
    
    // Get the trading point to find its network ID before deletion
    const tradingPoint = tradingPointsStore.getById(id);
    if (!tradingPoint) {
      throw new Error('Торговая точка не найдена');
    }
    
    const networkId = tradingPoint.networkId;
    const success = tradingPointsStore.remove(id);
    if (!success) {
      throw new Error('Торговая точка не найдена');
    }
    
    // Update network points count after deletion
    const count = tradingPointsStore.getCountByNetworkId(networkId);
    networksStore.updatePointsCount(networkId, count);
  },

  // Simplified methods - remove complex functionality for now
  async addExternalCode(pointId: TradingPointId, system: string, code: string, description?: string): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    const point = tradingPointsStore.getById(pointId);
    if (!point) {
      throw new Error('Торговая точка не найдена');
    }
    return point;
  },

  async removeExternalCode(pointId: TradingPointId, externalCodeId: string): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    const point = tradingPointsStore.getById(pointId);
    if (!point) {
      throw new Error('Торговая точка не найдена');
    }
    return point;
  }
};