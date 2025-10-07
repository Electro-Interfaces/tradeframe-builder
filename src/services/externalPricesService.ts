/**
 * Сервис для получения цен из внешнего API (по аналогии с резервуарами)
 */

import { supabaseClient } from '@/lib/supabase/client';

// Типы для цен из внешнего API
export interface ExternalPrice {
  id: string;
  fuel_type: string;
  fuel_code: string;
  price_net: number;
  vat_rate: number;
  price_gross: number;
  unit: string;
  valid_from: string;
  valid_to?: string;
  status: 'active' | 'scheduled' | 'expired' | 'cancelled';
  trading_point_id?: string;
  trading_point_name?: string;
  network_id?: string;
  created_at: string;
  updated_at: string;
}

interface ExternalPricesConfig {
  url: string;
  apiKey: string;
}

class ExternalPricesService {
  private config: ExternalPricesConfig | null = null;

  /**
   * Получение конфигурации из localStorage
   */
  private getConfig(): ExternalPricesConfig {
    if (this.config) return this.config;

    const savedSettings = localStorage.getItem('externalDatabase');
    if (!savedSettings) {
      throw new Error('Настройки подключения к внешней базе данных не найдены');
    }

    try {
      const parsed = JSON.parse(savedSettings);
      if (!parsed.url || !parsed.apiKey) {
        throw new Error('Неполные настройки подключения к базе данных');
      }
      
      this.config = {
        url: parsed.url,
        apiKey: parsed.apiKey
      };
      
      return this.config;
    } catch (error) {
      throw new Error('Ошибка чтения настроек подключения к базе данных');
    }
  }

  /**
   * Проверка настройки сервиса
   */
  isConfigured(): boolean {
    try {
      this.getConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получение цен из внешнего API (Supabase)
   */
  async getPrices(params: {
    networkId?: string;
    tradingPointId?: string;
    fuelTypes?: string[];
    status?: string[];
  } = {}): Promise<ExternalPrice[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Сервис внешних цен не настроен');
      }


      // Используем улучшенный Supabase клиент
      if (!supabaseClient.isInitialized()) {
        const initialized = supabaseClient.initialize();
        if (!initialized) {
          throw new Error('Не удалось инициализировать Supabase клиент');
        }
      }

      // Строим фильтры для запроса
      const filters: Record<string, any> = {};
      
      if (params.networkId) {
        filters.network_id = params.networkId;
      }
      
      if (params.tradingPointId && params.tradingPointId !== 'all') {
        filters.trading_point_id = params.tradingPointId;
      }

      if (params.status && params.status.length > 0) {
        // Для множественных значений используем оператор in
        // Но пока оставим простую фильтрацию
        filters.status = params.status[0];
      } else {
        // По умолчанию показываем только активные и запланированные
        filters.status = 'active';
      }

      const { data: prices, error } = await supabaseClient.select<ExternalPrice>(
        'fuel_prices', // название таблицы в Supabase
        '*',
        {
          filters,
          orderBy: { column: 'valid_from', ascending: false },
          limit: 100,
          retryOptions: {
            maxRetries: 3,
            delay: 1000,
            backoff: true
          }
        }
      );

      if (error) {
        console.error('❌ Ошибка получения цен:', error);
        throw new Error(`Ошибка API: ${error.message}`);
      }

      if (!prices || prices.length === 0) {
        return [];
      }

      return prices;

    } catch (error: any) {
      console.error('❌ Ошибка в getPrices:', error);
      throw error;
    }
  }

  /**
   * Получение конкретной цены по ID
   */
  async getPriceById(id: string): Promise<ExternalPrice | null> {
    try {
      if (!supabaseClient.isInitialized()) {
        supabaseClient.initialize();
      }

      const { data: prices, error } = await supabaseClient.select<ExternalPrice>(
        'fuel_prices',
        '*',
        {
          filters: { id },
          limit: 1
        }
      );

      if (error) {
        throw new Error(`Ошибка API: ${error.message}`);
      }

      return prices && prices.length > 0 ? prices[0] : null;
    } catch (error: any) {
      console.error('❌ Ошибка в getPriceById:', error);
      throw error;
    }
  }

  /**
   * Создание новой цены
   */
  async createPrice(priceData: Omit<ExternalPrice, 'id' | 'created_at' | 'updated_at'>): Promise<ExternalPrice> {
    try {
      if (!supabaseClient.isInitialized()) {
        supabaseClient.initialize();
      }

      const newPrice = {
        ...priceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: prices, error } = await supabaseClient.insert<ExternalPrice>(
        'fuel_prices',
        newPrice
      );

      if (error) {
        throw new Error(`Ошибка создания цены: ${error.message}`);
      }

      if (!prices || prices.length === 0) {
        throw new Error('Не удалось создать цену');
      }

      return prices[0];
    } catch (error: any) {
      console.error('❌ Ошибка в createPrice:', error);
      throw error;
    }
  }

  /**
   * Обновление цены
   */
  async updatePrice(id: string, updates: Partial<ExternalPrice>): Promise<ExternalPrice> {
    try {
      if (!supabaseClient.isInitialized()) {
        supabaseClient.initialize();
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data: prices, error } = await supabaseClient.update<ExternalPrice>(
        'fuel_prices',
        updateData,
        { id }
      );

      if (error) {
        throw new Error(`Ошибка обновления цены: ${error.message}`);
      }

      if (!prices || prices.length === 0) {
        throw new Error('Цена не найдена');
      }

      return prices[0];
    } catch (error: any) {
      console.error('❌ Ошибка в updatePrice:', error);
      throw error;
    }
  }

  /**
   * Получение статистики по ценам
   */
  async getPricesStats(params: {
    networkId?: string;
    tradingPointId?: string;
  } = {}): Promise<{
    total: number;
    active: number;
    scheduled: number;
    expired: number;
    avgPrice: number;
  }> {
    try {
      const allPrices = await this.getPrices({
        ...params,
        status: undefined // получаем все статусы для статистики
      });

      const stats = {
        total: allPrices.length,
        active: allPrices.filter(p => p.status === 'active').length,
        scheduled: allPrices.filter(p => p.status === 'scheduled').length,
        expired: allPrices.filter(p => p.status === 'expired').length,
        avgPrice: 0
      };

      // Вычисляем среднюю цену активных цен
      const activePrices = allPrices.filter(p => p.status === 'active');
      if (activePrices.length > 0) {
        stats.avgPrice = activePrices.reduce((sum, p) => sum + p.price_gross, 0) / activePrices.length;
      }

      return stats;
    } catch (error) {
      console.error('❌ Ошибка получения статистики цен:', error);
      return { total: 0, active: 0, scheduled: 0, expired: 0, avgPrice: 0 };
    }
  }

  /**
   * Проверка подключения к внешнему API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Сервис не настроен' };
      }

      const testResult = await supabaseClient.testConnection();
      return testResult;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Получение уникальных типов топлива
   */
  async getFuelTypes(): Promise<string[]> {
    try {
      const prices = await this.getPrices();
      const fuelTypes = [...new Set(prices.map(p => p.fuel_type))];
      return fuelTypes.sort();
    } catch (error) {
      console.error('❌ Ошибка получения типов топлива:', error);
      return [];
    }
  }
}

export const externalPricesService = new ExternalPricesService();