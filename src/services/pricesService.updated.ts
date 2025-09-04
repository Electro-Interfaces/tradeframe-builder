/**
 * Обновленный сервис для работы с ценами топлива
 * Переключается между localStorage и Supabase в зависимости от конфигурации
 */

import { PersistentStorage } from '@/utils/persistentStorage';
import { pricesSupabaseService } from './pricesSupabaseService';
import { apiConfigService } from './apiConfigService';

// Основные типы (совместимые с UI)
export interface FuelPrice {
  id: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number; // без НДС в копейках
  vatRate: number; // процент НДС
  priceGross: number; // с НДС в копейках (рассчитывается)
  unit: string; // Л/Кг
  appliedFrom: string; // дата-время применения
  status: 'active' | 'scheduled' | 'expired';
  tradingPoint: string;
  networkId: string;
  tradingPointId: string;
  packageId?: string;
  created_at: string;
  updated_at: string;
}

export interface PricePackage {
  id: string;
  tradingPointId: string;
  tradingPointName: string;
  applyAt: string;
  authorName: string;
  authorId: string;
  createdAt: string;
  status: 'draft' | 'scheduled' | 'active' | 'cancelled';
  lines: PricePackageLine[];
  notes?: string;
}

export interface PricePackageLine {
  id: string;
  fuelId: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number;
  vatRate: number;
  priceGross: number;
  unit: string;
  status: 'active' | 'scheduled' | 'cancelled';
}

export interface PriceJournalEntry {
  id: string;
  timestamp: string;
  fuelType: string;
  fuelCode: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  source: 'manual' | 'import' | 'api' | 'package';
  packageId?: string;
  status: 'applied' | 'scheduled' | 'cancelled';
  authorName: string;
  authorId: string;
  tradingPoint: string;
  tradingPointId: string;
  networkId: string;
  notes?: string;
}

export interface FuelType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  created_at: string;
}

class PricesService {
  private isSupabaseMode(): boolean {
    return !apiConfigService.isMockMode() && import.meta.env.VITE_SUPABASE_URL;
  }

  /**
   * Трансформирует данные из Supabase в формат для UI
   */
  private transformSupabasePriceToUI(supabasePrice: any): FuelPrice {
    return {
      id: supabasePrice.id,
      fuelType: supabasePrice.fuel_types?.name || 'Unknown',
      fuelCode: supabasePrice.fuel_types?.code || '',
      priceNet: supabasePrice.price_net,
      vatRate: supabasePrice.vat_rate,
      priceGross: supabasePrice.price_gross,
      unit: supabasePrice.unit || 'L',
      appliedFrom: supabasePrice.valid_from,
      status: supabasePrice.is_active ? 'active' : 'expired',
      tradingPoint: supabasePrice.trading_points?.name || 'Unknown',
      networkId: supabasePrice.trading_point_id, // Временно, пока не добавим network_id
      tradingPointId: supabasePrice.trading_point_id,
      packageId: supabasePrice.package_id,
      created_at: supabasePrice.created_at,
      updated_at: supabasePrice.updated_at
    };
  }

  private transformSupabaseFuelType(supabaseFuelType: any): FuelType {
    return {
      id: supabaseFuelType.id,
      name: supabaseFuelType.name,
      code: supabaseFuelType.code,
      isActive: supabaseFuelType.is_active,
      created_at: supabaseFuelType.created_at
    };
  }

  // Получить типы топлива
  async getFuelTypes(): Promise<FuelType[]> {
    if (this.isSupabaseMode()) {
      console.log('🔄 Loading fuel types from Supabase...');
      try {
        const supabaseFuelTypes = await pricesSupabaseService.getFuelTypes();
        return supabaseFuelTypes.map(ft => this.transformSupabaseFuelType(ft));
      } catch (error) {
        console.error('Error loading fuel types from Supabase:', error);
        // Fallback к localStorage
      }
    }

    // Fallback или mock режим
    console.log('🔄 Loading fuel types from localStorage...');
    return this.getFuelTypesFromLocalStorage();
  }

  private getFuelTypesFromLocalStorage(): FuelType[] {
    const initialFuelTypes: FuelType[] = [
      { 
        id: "ai95", 
        name: "АИ-95", 
        code: "AI95", 
        isActive: true,
        created_at: new Date('2024-01-15').toISOString()
      },
      { 
        id: "ai92", 
        name: "АИ-92", 
        code: "AI92", 
        isActive: true,
        created_at: new Date('2024-02-20').toISOString()
      },
      { 
        id: "dt", 
        name: "ДТ", 
        code: "DT", 
        isActive: true,
        created_at: new Date('2024-03-10').toISOString()
      },
      { 
        id: "ai98", 
        name: "АИ-98", 
        code: "AI98", 
        isActive: true,
        created_at: new Date('2024-04-05').toISOString()
      },
      { 
        id: "ai100", 
        name: "АИ-100", 
        code: "AI100", 
        isActive: true,
        created_at: new Date('2024-03-01').toISOString()
      }
    ];

    return PersistentStorage.load<FuelType>('fuelTypes', initialFuelTypes)
      .filter(fuel => fuel.isActive);
  }

  // Получить текущие цены
  async getCurrentPrices(tradingPointId?: string, networkId?: string): Promise<FuelPrice[]> {
    if (this.isSupabaseMode()) {
      console.log('🔄 Loading current prices from Supabase...');
      try {
        const supabasePrices = await pricesSupabaseService.getCurrentPrices({
          tradingPointId,
          networkId
        });
        
        return supabasePrices.map(price => this.transformSupabasePriceToUI(price));
      } catch (error) {
        console.error('Error loading prices from Supabase:', error);
        // Fallback к localStorage
      }
    }

    // Fallback или mock режим
    console.log('🔄 Loading current prices from localStorage...');
    return this.getCurrentPricesFromLocalStorage(tradingPointId, networkId);
  }

  private getCurrentPricesFromLocalStorage(tradingPointId?: string, networkId?: string): FuelPrice[] {
    // Mock данные как в оригинальном сервисе
    const mockPrices: FuelPrice[] = [
      {
        id: "price_point1_ai95",
        fuelType: "АИ-95",
        fuelCode: "AI95",
        priceNet: 5320,
        vatRate: 20,
        priceGross: 6384,
        unit: "Л",
        appliedFrom: "2024-12-07T08:00:00Z",
        status: "active",
        tradingPoint: "АЗС №001 - Центральная",
        tradingPointId: "point1",
        networkId: "1",
        packageId: "pkg_point1_1",
        created_at: new Date('2024-01-15').toISOString(),
        updated_at: new Date('2024-12-07').toISOString()
      }
      // Добавить остальные mock данные при необходимости
    ];

    let prices = PersistentStorage.load<FuelPrice>('currentPrices', mockPrices);
    
    if (tradingPointId) {
      prices = prices.filter(price => price.tradingPointId === tradingPointId);
    }
    
    if (networkId) {
      prices = prices.filter(price => price.networkId === networkId);
    }
    
    return prices.sort((a, b) => a.fuelType.localeCompare(b.fuelType));
  }

  // Создать/обновить цену
  async upsertPrice(price: {
    fuelCode: string;
    tradingPointId: string;
    priceNet: number;
    vatRate: number;
    unit: string;
    appliedFrom: string;
    status: 'active' | 'scheduled' | 'expired';
    tradingPoint: string;
    networkId: string;
    packageId?: string;
  }): Promise<FuelPrice> {
    if (this.isSupabaseMode()) {
      console.log('🔄 Creating/updating price in Supabase...');
      try {
        // Получаем fuel_type_id по коду
        const fuelTypes = await pricesSupabaseService.getFuelTypes();
        const fuelType = fuelTypes.find(ft => ft.code === price.fuelCode);
        
        if (!fuelType) {
          throw new Error(`Fuel type with code ${price.fuelCode} not found`);
        }

        const currentUser = this.getCurrentUser();
        
        const supabasePrice = await pricesSupabaseService.upsertPrice({
          trading_point_id: price.tradingPointId,
          fuel_type_id: fuelType.id,
          price_net: price.priceNet,
          vat_rate: price.vatRate,
          source: 'manual',
          valid_from: price.appliedFrom,
          created_by: currentUser.id,
          reason: 'Price update via UI'
        });
        
        if (supabasePrice) {
          // Добавляем запись в историю
          await pricesSupabaseService.addPriceHistoryEntry({
            trading_point_id: price.tradingPointId,
            fuel_type_id: fuelType.id,
            price: supabasePrice.price_gross,
            effective_date: price.appliedFrom,
            reason: 'Price update via UI',
            set_by: currentUser.id
          });
          
          return this.transformSupabasePriceToUI(supabasePrice);
        }
        
        throw new Error('Failed to create price in Supabase');
        
      } catch (error) {
        console.error('Error creating price in Supabase:', error);
        // Fallback к localStorage
      }
    }

    // Fallback или mock режим
    console.log('🔄 Creating/updating price in localStorage...');
    return this.upsertPriceInLocalStorage(price);
  }

  private upsertPriceInLocalStorage(price: any): FuelPrice {
    // Логика как в оригинальном сервисе
    const priceGross = Math.round(price.priceNet * (1 + price.vatRate / 100));
    const now = new Date().toISOString();
    
    const newPrice: FuelPrice = {
      id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fuelType: this.getFuelNameByCode(price.fuelCode),
      fuelCode: price.fuelCode,
      priceNet: price.priceNet,
      vatRate: price.vatRate,
      priceGross,
      unit: price.unit,
      appliedFrom: price.appliedFrom,
      status: price.status,
      tradingPoint: price.tradingPoint,
      tradingPointId: price.tradingPointId,
      networkId: price.networkId,
      packageId: price.packageId,
      created_at: now,
      updated_at: now
    };

    const currentPrices = PersistentStorage.load<FuelPrice>('currentPrices', []);
    currentPrices.push(newPrice);
    PersistentStorage.save('currentPrices', currentPrices);
    
    return newPrice;
  }

  // Удалить цену
  async deletePrice(id: string): Promise<void> {
    if (this.isSupabaseMode()) {
      console.log('🔄 Deleting price in Supabase...');
      try {
        // В Supabase обычно деактивируем, а не удаляем
        // Пока оставим заглушку
        console.warn('Price deletion not implemented for Supabase mode');
        return;
      } catch (error) {
        console.error('Error deleting price in Supabase:', error);
      }
    }

    // Fallback или mock режим
    console.log('🔄 Deleting price in localStorage...');
    const currentPrices = PersistentStorage.load<FuelPrice>('currentPrices', []);
    const updatedPrices = currentPrices.filter(price => price.id !== id);
    PersistentStorage.save('currentPrices', updatedPrices);
  }

  // Получить историю изменений цен
  async getPriceJournal(tradingPointId?: string, fuelCode?: string, limit = 50): Promise<PriceJournalEntry[]> {
    if (this.isSupabaseMode()) {
      console.log('🔄 Loading price history from Supabase...');
      try {
        const fuelTypeId = fuelCode ? await this.getFuelTypeIdByCode(fuelCode) : undefined;
        
        const history = await pricesSupabaseService.getPriceHistory({
          tradingPointId,
          fuelTypeId,
          limit
        });
        
        return history.map(entry => ({
          id: entry.id,
          timestamp: entry.effective_date,
          fuelType: entry.fuel_types?.name || 'Unknown',
          fuelCode: entry.fuel_types?.code || '',
          priceNet: Math.round(entry.price / 1.2), // Приблизительно
          priceGross: entry.price,
          vatRate: 20,
          source: 'manual',
          status: 'applied',
          authorName: entry.users?.name || 'Unknown',
          authorId: entry.set_by || '',
          tradingPoint: entry.trading_points?.name || 'Unknown',
          tradingPointId: entry.trading_point_id,
          networkId: entry.trading_point_id, // Временно
          notes: entry.reason
        }));
        
      } catch (error) {
        console.error('Error loading price history from Supabase:', error);
        // Fallback к localStorage
      }
    }

    // Fallback или mock режим
    console.log('🔄 Loading price history from localStorage...');
    
    const initialJournal: PriceJournalEntry[] = [];
    let journal = PersistentStorage.load<PriceJournalEntry>('priceJournal', initialJournal);
    
    if (tradingPointId) {
      journal = journal.filter(entry => entry.tradingPointId === tradingPointId);
    }
    
    if (fuelCode) {
      journal = journal.filter(entry => entry.fuelCode === fuelCode);
    }
    
    return journal
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // Вспомогательные методы
  private async getFuelTypeIdByCode(code: string): Promise<string | undefined> {
    const fuelTypes = await pricesSupabaseService.getFuelTypes();
    return fuelTypes.find(ft => ft.code === code)?.id;
  }

  private getFuelNameByCode(code: string): string {
    const map: Record<string, string> = {
      'AI95': 'АИ-95',
      'AI92': 'АИ-92', 
      'DT': 'ДТ',
      'AI98': 'АИ-98',
      'AI100': 'АИ-100'
    };
    return map[code] || code;
  }

  private getCurrentUser() {
    // Получаем текущего пользователя из контекста или localStorage
    // Пока заглушка
    return {
      id: 'user-1',
      name: 'Текущий пользователь'
    };
  }
}

// Экспортируем singleton
export const pricesService = new PricesService();