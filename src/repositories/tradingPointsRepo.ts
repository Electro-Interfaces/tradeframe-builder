import { TradingPoint, TradingPointId, TradingPointInput, TradingPointUpdateInput, NetworkId } from '@/types/tradingpoint';
import { tradingPointsStore } from '@/mock/pointsStore';

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
    
    if (!input.geolocation?.latitude || !input.geolocation?.longitude) {
      throw new Error('Координаты обязательны');
    }

    if (input.phone && !input.phone.match(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/)) {
      throw new Error('Неверный формат телефона. Используйте формат: +7 (XXX) XXX-XX-XX');
    }

    if (input.email && !input.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Неверный формат email');
    }

    return tradingPointsStore.create(networkId, input);
  },

  async update(id: TradingPointId, input: TradingPointUpdateInput): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    if (!input.name?.trim()) {
      throw new Error('Название торговой точки обязательно');
    }
    
    if (!input.geolocation?.latitude || !input.geolocation?.longitude) {
      throw new Error('Координаты обязательны');
    }

    if (input.phone && !input.phone.match(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/)) {
      throw new Error('Неверный формат телефона. Используйте формат: +7 (XXX) XXX-XX-XX');
    }

    if (input.email && !input.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Неверный формат email');
    }

    const updated = tradingPointsStore.update(id, input);
    if (!updated) {
      throw new Error('Торговая точка не найдена');
    }
    
    return updated;
  },

  async delete(id: TradingPointId): Promise<void> {
    await delay(MOCK_API_DELAY);
    
    const success = tradingPointsStore.remove(id);
    if (!success) {
      throw new Error('Торговая точка не найдена');
    }
  },

  async block(id: TradingPointId, reason: string): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    if (!reason?.trim()) {
      throw new Error('Причина блокировки обязательна');
    }

    const blocked = tradingPointsStore.block(id, reason);
    if (!blocked) {
      throw new Error('Торговая точка не найдена');
    }
    
    return blocked;
  },

  async unblock(id: TradingPointId): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    const unblocked = tradingPointsStore.unblock(id);
    if (!unblocked) {
      throw new Error('Торговая точка не найдена');
    }
    
    return unblocked;
  },

  async addExternalCode(pointId: TradingPointId, system: string, code: string, description?: string): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    if (!system?.trim()) {
      throw new Error('Система обязательна');
    }
    
    if (!code?.trim()) {
      throw new Error('Код обязателен');
    }

    const updated = tradingPointsStore.addExternalCode(pointId, {
      system,
      code,
      description,
      isActive: true
    });
    
    if (!updated) {
      throw new Error('Торговая точка не найдена');
    }
    
    return updated;
  },

  async removeExternalCode(pointId: TradingPointId, externalCodeId: string): Promise<TradingPoint> {
    await delay(MOCK_API_DELAY);
    
    const updated = tradingPointsStore.removeExternalCode(pointId, externalCodeId);
    if (!updated) {
      throw new Error('Торговая точка или внешний код не найдены');
    }
    
    return updated;
  }
};