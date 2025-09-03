// Сервис для кэширования цен с localStorage
import { PersistentStorage } from '@/utils/persistentStorage';
import { tradingNetworkAPI, TradingNetworkPrice } from './tradingNetworkAPI';

export interface CachedFuelPrice {
  id: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number; // в копейках
  vatRate: number;
  priceGross: number; // в копейках
  unit: string;
  appliedFrom: string;
  status: 'active' | 'scheduled' | 'expired';
  tradingPoint: string;
  networkId: string;
  tradingPointId: string;
  lastUpdated: string; // ISO timestamp
  source: 'cache' | 'network';
}

export interface PricesCacheEntry {
  tradingPointId: string;
  prices: CachedFuelPrice[];
  lastUpdated: string;
  lastNetworkSync: string;
}

class PricesCacheService {
  private readonly CACHE_KEY = 'prices_cache';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 минут в миллисекундах

  // Получить цены для торговой точки (сначала из кэша)
  async getPricesForTradingPoint(tradingPointId: string): Promise<CachedFuelPrice[]> {
    console.log(`💰 Получение цен для торговой точки: ${tradingPointId}`);
    
    // Сначала пытаемся загрузить из кэша
    const cached = this.getCachedPrices(tradingPointId);
    
    if (cached && this.isCacheValid(cached)) {
      console.log(`💰 Найдены валидные цены в кэше (${cached.prices.length} цен)`);
      return cached.prices.map(price => ({ ...price, source: 'cache' as const }));
    }

    console.log(`💰 Кэш пуст или устарел, загружаем из сети...`);
    // Если кэша нет или он устарел, загружаем из сети
    return this.fetchAndCachePrices(tradingPointId);
  }

  // Принудительное обновление цен из сети
  async refreshPricesFromNetwork(tradingPointId: string): Promise<CachedFuelPrice[]> {
    console.log(`🔄 Принудительное обновление цен для торговой точки: ${tradingPointId}`);
    return this.fetchAndCachePrices(tradingPointId);
  }

  // Загрузка из сети и сохранение в кэш
  private async fetchAndCachePrices(tradingPointId: string): Promise<CachedFuelPrice[]> {
    try {
      // Определяем номер станции из торговой точки
      const stationNumber = this.getStationNumber(tradingPointId);
      
      // Получаем цены с торговой точки через API
      const networkResponse = await tradingNetworkAPI.getPrices(stationNumber);
      
      if (!networkResponse.prices || networkResponse.prices.length === 0) {
        console.log(`⚠️ Нет цен для станции ${stationNumber}`);
        return [];
      }

      // Преобразуем сетевые цены в формат кэша
      const cachedPrices: CachedFuelPrice[] = networkResponse.prices.map((netPrice, index) => {
        return {
          id: `${tradingPointId}_${netPrice.service_code}_${Date.now()}`,
          fuelType: netPrice.service_name,
          fuelCode: netPrice.service_name.replace('-', ''),
          priceNet: Math.round(netPrice.price * 100 / 1.2), // Примерное извлечение цены без НДС
          vatRate: 20,
          priceGross: Math.round(netPrice.price * 100), // Цена в копейках
          unit: "Л",
          appliedFrom: new Date().toLocaleString('ru-RU'),
          status: 'active' as const,
          tradingPoint: this.getTradingPointName(tradingPointId),
          networkId: tradingPointId,
          tradingPointId,
          lastUpdated: new Date().toISOString(),
          source: 'network' as const
        };
      });

      // Сохраняем в кэш
      this.savePricesToCache(tradingPointId, cachedPrices);

      console.log(`💰 Загружено и закэшировано ${cachedPrices.length} цен`);
      return cachedPrices;

    } catch (error) {
      console.error('Ошибка при загрузке цен из сети:', error);
      
      // Возвращаем устаревшие данные из кэша, если есть
      const cached = this.getCachedPrices(tradingPointId);
      if (cached) {
        console.log(`⚠️ Возвращаем устаревшие данные из кэша`);
        return cached.prices.map(price => ({ ...price, source: 'cache' as const }));
      }
      
      return [];
    }
  }

  // Получить данные из кэша
  private getCachedPrices(tradingPointId: string): PricesCacheEntry | null {
    try {
      const allCache = PersistentStorage.load<Record<string, PricesCacheEntry>>(this.CACHE_KEY, {});
      return allCache[tradingPointId] || null;
    } catch (error) {
      console.error('Ошибка при чтении кэша:', error);
      return null;
    }
  }

  // Сохранить цены в кэш
  private savePricesToCache(tradingPointId: string, prices: CachedFuelPrice[]): void {
    try {
      const allCache = PersistentStorage.load<Record<string, PricesCacheEntry>>(this.CACHE_KEY, {});
      const now = new Date().toISOString();
      
      allCache[tradingPointId] = {
        tradingPointId,
        prices,
        lastUpdated: now,
        lastNetworkSync: now
      };

      PersistentStorage.save(this.CACHE_KEY, allCache);
      console.log(`💾 Цены сохранены в кэш для ${tradingPointId}`);
    } catch (error) {
      console.error('Ошибка при сохранении в кэш:', error);
    }
  }

  // Проверить валидность кэша
  private isCacheValid(cacheEntry: PricesCacheEntry): boolean {
    const now = Date.now();
    const cacheTime = new Date(cacheEntry.lastUpdated).getTime();
    const age = now - cacheTime;
    
    return age < this.CACHE_TTL;
  }

  // Получить номер станции по ID торговой точки
  private getStationNumber(tradingPointId: string): number {
    const stationMapping: Record<string, number> = {
      'point1': 77,  // АЗС №001 - Центральная
      'point2': 78,  // АЗС №002 - Северная  
      'point3': 79,  // АЗС №003 - Южная
      'point4': 80,  // АЗС №004 - Московское шоссе
      'point5': 81,  // АЗС №005 - Промзона
    };
    
    return stationMapping[tradingPointId] || 77;
  }

  // Получить имя торговой точки
  private getTradingPointName(tradingPointId: string): string {
    const nameMapping: Record<string, string> = {
      'point1': 'АЗС №001 - Центральная',
      'point2': 'АЗС №002 - Северная',
      'point3': 'АЗС №003 - Южная', 
      'point4': 'АЗС №004 - Московское шоссе',
      'point5': 'АЗС №005 - Промзона',
    };
    
    return nameMapping[tradingPointId] || `Торговая точка ${tradingPointId}`;
  }

  // Очистить кэш для торговой точки
  clearCache(tradingPointId?: string): void {
    if (tradingPointId) {
      const allCache = PersistentStorage.load<Record<string, PricesCacheEntry>>(this.CACHE_KEY, {});
      delete allCache[tradingPointId];
      PersistentStorage.save(this.CACHE_KEY, allCache);
      console.log(`🗑️ Кэш очищен для ${tradingPointId}`);
    } else {
      PersistentStorage.remove(this.CACHE_KEY);
      console.log(`🗑️ Весь кэш цен очищен`);
    }
  }

  // Получить информацию о кэше
  getCacheInfo(): { totalEntries: number; entries: Array<{ tradingPointId: string; lastUpdated: string; pricesCount: number }> } {
    const allCache = PersistentStorage.load<Record<string, PricesCacheEntry>>(this.CACHE_KEY, {});
    const entries = Object.values(allCache).map(entry => ({
      tradingPointId: entry.tradingPointId,
      lastUpdated: entry.lastUpdated,
      pricesCount: entry.prices.length
    }));

    return {
      totalEntries: entries.length,
      entries
    };
  }
}

// Экспортируем экземпляр сервиса
export const pricesCacheService = new PricesCacheService();

// Очищаем кэш при изменении конфигурации резервуаров
if (typeof window !== 'undefined') {
  console.log('🧹 Очищаем кэш цен при загрузке модуля...');
  pricesCacheService.clearCache();
}