/**
 * Prices Supabase Service - Новый подход к управлению ценами
 * УПРОЩЕН: Убраны все fallback режимы и checkConnection
 * Прямые вызовы Supabase с четкими ошибками
 * 
 * Особенности:
 * - Автоматическая синхронизация с резервуарами
 * - Прямая интеграция с Supabase
 * - Журнал изменений цен
 * - Нет сложных маппингов UUID
 */

// 🔥 НОВЫЙ ПОДХОД: Используем API торговой сети для получения цен и видов топлива
import { supabase } from './supabaseClientBrowser';
import { tradingNetworkAPI } from './tradingNetworkAPI';
import { httpClient } from './universalHttpClient';
import { nomenclatureService } from './nomenclatureService';

// Типы данных для нового сервиса цен
export interface FuelPrice {
  id: string;
  trading_point_id: string;
  fuel_type: string;
  fuel_code: string;
  price_net: number; // цена без НДС в копейках
  vat_rate: number; // ставка НДС в процентах
  price_gross: number; // цена с НДС в копейках  
  unit: string; // единица измерения (Л, кг)
  currency: string; // валюта (RUB)
  applied_from: string; // дата применения ISO
  status: 'active' | 'scheduled' | 'expired';
  source: 'manual' | 'api_sync' | 'import';
  created_at: string;
  updated_at: string;
  created_by?: string; // ID пользователя
}

export interface PriceHistoryEntry {
  id: string;
  trading_point_id: string;
  fuel_type: string;
  old_price?: number;
  new_price: number;
  action: 'create' | 'update' | 'sync' | 'import';
  source: 'manual' | 'api_sync' | 'import';
  created_at: string;
  created_by?: string;
  notes?: string;
}

export interface FuelTypeInfo {
  fuel_type: string;
  fuel_code: string;
  tanks_count: number;
  total_volume: number;
  current_level: number;
  has_price: boolean;
  current_price?: FuelPrice;
}

class PricesSupabaseService {
  /**
   * Получить маппинг номенклатуры для сети
   */
  private async getNomenclatureMapping(networkId: string): Promise<Map<string, { name: string, code: string }>> {
    console.log(`📚 [PRICES SERVICE] Загружаем номенклатуру для сети ${networkId}`);
    
    try {
      const nomenclature = await nomenclatureService.getNomenclature({ networkId, status: 'active' });
      const mapping = new Map<string, { name: string, code: string }>();
      
      nomenclature.forEach(item => {
        // Маппинг по network_api_code
        if (item.networkApiCode) {
          mapping.set(item.networkApiCode, { name: item.name, code: item.internalCode });
          console.log(`📚 [NOMENCLATURE] API код "${item.networkApiCode}" -> внутреннее название "${item.name}"`);
        }
        
        // Маппинг по внешним кодам
        item.externalCodes.forEach(extCode => {
          mapping.set(extCode.externalCode, { name: item.name, code: item.internalCode });
          console.log(`📚 [NOMENCLATURE] Внешний код "${extCode.externalCode}" (${extCode.systemType}) -> внутреннее название "${item.name}"`);
        });
      });
      
      console.log(`✅ [NOMENCLATURE] Загружен маппинг для ${mapping.size} кодов`);
      return mapping;
    } catch (error) {
      console.error('❌ [NOMENCLATURE] Ошибка загрузки номенклатуры:', error);
      return new Map();
    }
  }

  /**
   * Получить информацию о видах топлива для торговой точки
   * 🔥 НОВАЯ ЛОГИКА: Сопоставляем данные API с номенклатурой
   */
  async getFuelTypesInfo(tradingPointId: string): Promise<FuelTypeInfo[]> {
    console.log(`🔥 [PRICES SERVICE] Получение видов топлива из API торговой сети для ${tradingPointId}`);
    
    try {
      // 1. Получаем маппинг торговой точки на систему и станцию API
      const { data: tradingPoint, error: tpError } = await supabase
        .from('trading_points')
        .select('id, name, external_id, network_id')
        .eq('id', tradingPointId)
        .single();

      if (tpError || !tradingPoint) {
        console.error('❌ [PRICES SERVICE] Ошибка загрузки торговой точки:', tpError);
        // Если не найдена в БД, возвращаем стандартный набор
        return this.getStandardFuelTypes(tradingPointId);
      }

      console.log(`📍 [PRICES SERVICE] Торговая точка: ${tradingPoint.name}, external_id: ${tradingPoint.external_id}`);

      // 2. Получаем сеть для определения system ID
      const { data: network, error: netError } = await supabase
        .from('networks')
        .select('external_id')
        .eq('id', tradingPoint.network_id)
        .single();

      if (netError || !network) {
        console.error('❌ [PRICES SERVICE] Ошибка загрузки сети:', netError);
        return this.getStandardFuelTypes(tradingPointId);
      }

      const systemId = network.external_id || '15'; 
      const stationId = tradingPoint.external_id || '4';

      console.log(`🌐 [PRICES SERVICE] Запрашиваем цены из API: system=${systemId}, station=${stationId}`);

      // 3. Загружаем маппинг номенклатуры для сети  
      const nomenclatureMapping = await this.getNomenclatureMapping(tradingPoint.network_id);

      // 4. Запрашиваем цены из торгового API
      try {
        // Используем правильный endpoint для получения цен
        const pricesResponse = await httpClient.get<any>('/v1/prices', {
          destination: 'external-api',
          queryParams: {
            system: systemId,
            station: stationId
          }
        });

        console.log(`📊 [PRICES SERVICE] Ответ API:`, pricesResponse);
        console.log(`📊 [PRICES SERVICE] Тип данных:`, typeof pricesResponse.data);
        console.log(`📊 [PRICES SERVICE] Является массивом:`, Array.isArray(pricesResponse.data));
        console.log(`📊 [PRICES SERVICE] Ключи данных:`, pricesResponse.data ? Object.keys(pricesResponse.data) : 'нет данных');

        if (pricesResponse.success && pricesResponse.data) {
          return this.parseFuelTypesFromAPI(pricesResponse.data, tradingPointId, nomenclatureMapping);
        } else {
          throw new Error(`API вернул неуспешный ответ или пустые данные: ${pricesResponse.error || 'неизвестная ошибка'}`);
        }
      } catch (apiError) {
        console.error(`❌ [PRICES SERVICE] Ошибка получения данных из внешней системы:`, apiError);
        throw new Error(`Не удалось загрузить цены из внешней системы: ${apiError instanceof Error ? apiError.message : 'неизвестная ошибка'}`);
      }

    } catch (error) {
      console.error('❌ [PRICES SERVICE] Критическая ошибка при загрузке цен:', error);
      throw error; // Пробрасываем ошибку дальше, не скрываем её
    }
  }

  /**
   * Парсинг данных о топливе из API с использованием номенклатуры
   */
  private parseFuelTypesFromAPI(apiData: any, tradingPointId: string, nomenclatureMapping: Map<string, { name: string, code: string }>): FuelTypeInfo[] {
    console.log(`🔍 [PRICES SERVICE PARSER] Начинаем парсинг данных:`, apiData);
    console.log(`🔍 [PRICES SERVICE PARSER] Тип данных: ${typeof apiData}`);
    console.log(`🔍 [PRICES SERVICE PARSER] Является массивом: ${Array.isArray(apiData)}`);
    
    const fuelTypesInfo: FuelTypeInfo[] = [];

    // API может вернуть разные форматы
    if (Array.isArray(apiData)) {
      console.log(`🔍 [PRICES SERVICE PARSER] Обрабатываем как массив, длина: ${apiData.length}`);
      // Формат массива цен
      apiData.forEach((item: any, index: number) => {
        console.log(`🔍 [PRICES SERVICE PARSER] Элемент ${index}:`, item);
        console.log(`🔍 [PRICES SERVICE PARSER] Ключи элемента: ${Object.keys(item)}`);
        
        // Проверяем есть ли вложенный массив services
        if (item.services && Array.isArray(item.services)) {
          console.log(`🔍 [PRICES SERVICE PARSER] Найден массив services с ${item.services.length} элементами`);
          
          item.services.forEach((service: any, serviceIndex: number) => {
            console.log(`🔍 [PRICES SERVICE PARSER] Сервис ${serviceIndex}:`, service);
            console.log(`🔍 [PRICES SERVICE PARSER] Ключи сервиса: ${Object.keys(service)}`);
            
            // Получаем сырое название из API
            const apiName = service.fuel_name || 
                           service.fuel_type || 
                           service.name || 
                           service.type ||
                           service.product_name ||
                           service.product ||
                           service.fuel ||
                           service.title ||
                           service.description ||
                           service.label ||
                           service.service_name ||
                           service.service_type ||
                           service.good_name ||
                           service.good_type;
            
            console.log(`🔍 [PRICES SERVICE PARSER] Сырое название из API: "${apiName}"`);
            console.log(`🔍 [PRICES SERVICE PARSER] Все поля сервиса для отладки:`, service);
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА - не создаем фиктивные данные!
            if (!apiName) {
              const errorMsg = `❌ КРИТИЧЕСКАЯ ОШИБКА: Внешняя система не предоставила название топлива для сервиса ${serviceIndex}. Доступные поля: ${Object.keys(service).join(', ')}`;
              console.error(errorMsg);
              throw new Error(`Не удалось определить вид топлива из внешней системы. Проверьте настройки API.`);
            }
            
            // Ищем соответствие в номенклатуре
            let mappedFuel = null;
            if (apiName) {
              mappedFuel = nomenclatureMapping.get(apiName);
              if (!mappedFuel) {
                // Пробуем поиск без учета регистра
                for (const [key, value] of nomenclatureMapping) {
                  if (key.toLowerCase() === apiName.toLowerCase()) {
                    mappedFuel = value;
                    break;
                  }
                }
              }
            }
            
            // Финальное название - только реальные данные!
            const finalFuelName = mappedFuel?.name || apiName;
            const finalFuelCode = mappedFuel?.code || 
                                  service.fuel_code || 
                                  service.fuel_id?.toString() || 
                                  service.id?.toString() ||
                                  service.service_code?.toString() ||
                                  service.product_code?.toString();
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА - код топлива обязателен
            if (!finalFuelCode) {
              throw new Error(`Не удалось определить код топлива для "${finalFuelName}". Внешняя система должна предоставить одно из полей: fuel_code, fuel_id, id, service_code, product_code. Доступные поля: ${Object.keys(service).join(', ')}`);
            }
            
            console.log(`🔍 [PRICES SERVICE PARSER] Финальное название: "${finalFuelName}" ${mappedFuel ? '(из номенклатуры)' : '(из API)'}`);
            console.log(`🔍 [PRICES SERVICE PARSER] Финальный код: "${finalFuelCode}"`);
            
            // КРИТИЧЕСКАЯ ПРОВЕРКА - цена обязательна и должна быть положительной
            const priceValue = service.price;
            if (!priceValue || priceValue <= 0) {
              throw new Error(`Недопустимая цена для топлива "${finalFuelName}": ${priceValue}. Цена должна быть положительным числом.`);
            }
            
            console.log(`💰 [PRICES SERVICE PARSER] Цена из API: ${priceValue} руб/л`);
            
            const fuelInfo: FuelTypeInfo = {
              fuel_type: finalFuelName,
              fuel_code: finalFuelCode,
              tanks_count: 1,
              total_volume: 0,
              current_level: 0,
              has_price: true,
              current_price: {
                id: `api_${finalFuelCode}_${Date.now()}`,
                trading_point_id: tradingPointId,
                fuel_type: finalFuelName,
                fuel_code: finalFuelCode,
                price_net: Math.round(priceValue * 100),
                vat_rate: 20,
                price_gross: Math.round(priceValue * 100 * 1.2),
                unit: 'Л',
                currency: 'RUB',
                applied_from: new Date().toISOString(),
                status: 'active',
                source: 'api_sync',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            };
            fuelTypesInfo.push(fuelInfo);
          });
        } else {
          // Старая логика для прямых элементов
          const fuelName = item.fuel_name || item.fuel_type || `Топливо ${item.fuel_id || item.id}`;
          console.log(`🔍 [PRICES SERVICE PARSER] Название топлива из корня: ${fuelName}`);
          
          const fuelInfo: FuelTypeInfo = {
            fuel_type: fuelName,
            fuel_code: item.fuel_code || item.fuel_id?.toString() || item.id?.toString() || '',
            tanks_count: 1,
            total_volume: 0,
            current_level: 0,
            has_price: true,
            current_price: {
              id: `api_${item.fuel_id || item.id}_${Date.now()}`,
              trading_point_id: tradingPointId,
              fuel_type: fuelName,
              fuel_code: item.fuel_code || item.fuel_id?.toString() || '',
              price_net: Math.round((item.price || 0) * 100),
              vat_rate: 20,
              price_gross: Math.round((item.price || 0) * 100 * 1.2),
              unit: 'Л',
              currency: 'RUB',
              applied_from: new Date().toISOString(),
              status: 'active',
              source: 'api_sync',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
          fuelTypesInfo.push(fuelInfo);
        }
      });
    } else if (typeof apiData === 'object' && apiData.fuels) {
      console.log(`🔍 [PRICES SERVICE PARSER] Обнаружен объект с fuels`);
      console.log(`🔍 [PRICES SERVICE PARSER] apiData.fuels:`, apiData.fuels);
      // Формат с вложенным массивом fuels
      if (Array.isArray(apiData.fuels)) {
        console.log(`🔍 [PRICES SERVICE PARSER] apiData.fuels является массивом, длина: ${apiData.fuels.length}`);
        apiData.fuels.forEach((fuel: any) => {
          const fuelInfo: FuelTypeInfo = {
            fuel_type: fuel.name || fuel.fuel_name || fuel.type,
            fuel_code: fuel.code || fuel.id?.toString() || '',
            tanks_count: fuel.tanks_count || 1,
            total_volume: fuel.volume || 0,
            current_level: fuel.level || 0,
            has_price: !!fuel.price,
            current_price: fuel.price ? {
              id: `api_${fuel.id}_${Date.now()}`,
              trading_point_id: tradingPointId,
              fuel_type: fuel.name || fuel.fuel_name,
              fuel_code: fuel.code || fuel.id?.toString() || '',
              price_net: Math.round((fuel.price || 0) * 100),
              vat_rate: 20,
              price_gross: Math.round((fuel.price || 0) * 100 * 1.2),
              unit: 'Л',
              currency: 'RUB',
              applied_from: new Date().toISOString(),
              status: 'active',
              source: 'api_sync',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } : undefined
          };
          fuelTypesInfo.push(fuelInfo);
        });
      }
    } else if (typeof apiData === 'object') {
      console.log(`🔍 [PRICES SERVICE PARSER] Обрабатываем как объект с ключами`);
      console.log(`🔍 [PRICES SERVICE PARSER] Ключи объекта: ${Object.keys(apiData)}`);
      // Формат объекта с ценами по ключам
      Object.entries(apiData).forEach(([fuelType, priceData]: [string, any]) => {
        console.log(`🔍 [PRICES SERVICE PARSER] Ключ: ${fuelType}, Значение:`, priceData);
        if (typeof priceData === 'number' || (priceData && typeof priceData.price === 'number')) {
          const price = typeof priceData === 'number' ? priceData : priceData.price;
          const fuelInfo: FuelTypeInfo = {
            fuel_type: fuelType,
            fuel_code: fuelType,
            tanks_count: 1,
            total_volume: 0,
            current_level: 0,
            has_price: true,
            current_price: {
              id: `api_${fuelType}_${Date.now()}`,
              trading_point_id: tradingPointId,
              fuel_type: fuelType,
              fuel_code: fuelType,
              price_net: Math.round(price * 100),
              vat_rate: 20,
              price_gross: Math.round(price * 100 * 1.2),
              unit: 'Л',
              currency: 'RUB',
              applied_from: new Date().toISOString(),
              status: 'active',
              source: 'api_sync',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          };
          fuelTypesInfo.push(fuelInfo);
        }
      });
    }

    console.log(`✅ [PRICES SERVICE] Распарсено ${fuelTypesInfo.length} видов топлива из API`);
    return fuelTypesInfo;
  }

  /**
   * Получить стандартный набор видов топлива
   */
  private getStandardFuelTypes(tradingPointId: string): FuelTypeInfo[] {
    console.log(`📋 [PRICES SERVICE] Используем стандартный набор видов топлива (3 вида для АЗС)`);
    
    // Стандартный набор для АЗС - только 3 вида топлива
    const standardFuels = [
      { type: 'АИ-92', code: 'AI92' },
      { type: 'АИ-95', code: 'AI95' },
      { type: 'ДТ', code: 'DT' }
    ];

    return standardFuels.map(fuel => ({
      fuel_type: fuel.type,
      fuel_code: fuel.code,
      tanks_count: 0,
      total_volume: 0,
      current_level: 0,
      has_price: false,
      current_price: undefined
    }));
  }

  /**
   * Получить текущие активные цены для торговой точки
   */
  async getCurrentPrices(tradingPointId: string): Promise<FuelPrice[]> {
    console.log(`💰 [PRICES SERVICE] Получение текущих цен для ${tradingPointId}`);

    try {
      const { data, error } = await supabase
        .from('prices')
        .select('*')
        .eq('trading_point_id', tradingPointId)
        .eq('status', 'active')  // Используем поле status вместо is_active
        .order('applied_from', { ascending: false });  // И applied_from вместо valid_from

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('⚠️ [PRICES SERVICE] Таблица prices не найдена, возвращаем пустой массив');
          return [];
        }
        console.error('❌ [PRICES SERVICE] Database error getting current prices:', error);
        throw new Error(`Database unavailable: ${error.message}`);
      }

      console.log(`✅ [PRICES SERVICE] Получено ${data?.length || 0} активных цен`);
      return data || [];
    } catch (error) {
      console.warn('⚠️ [PRICES SERVICE] Ошибка получения цен, возвращаем пустой массив:', error);
      return [];
    }
  }

  /**
   * Синхронизация цен с торговым API
   */
  async syncPricesWithTradingAPI(tradingPointId: string): Promise<{
    success: boolean;
    syncedCount: number;
    errors?: string[];
  }> {
    console.log(`🔄 [PRICES SERVICE] Синхронизация цен с торговым API для ${tradingPointId}`);

    try {
      // Получаем свежие данные из API
      const fuelTypes = await this.getFuelTypesInfo(tradingPointId);
      
      let syncedCount = 0;
      const errors: string[] = [];

      // Сохраняем цены в БД
      for (const fuel of fuelTypes) {
        if (fuel.has_price && fuel.current_price) {
          try {
            await this.updatePrice(tradingPointId, fuel.fuel_type, fuel.current_price.price_gross / 100);
            syncedCount++;
          } catch (err) {
            errors.push(`Ошибка сохранения цены для ${fuel.fuel_type}: ${err}`);
          }
        }
      }

      console.log(`✅ [PRICES SERVICE] Синхронизировано ${syncedCount} цен`);
      
      return {
        success: syncedCount > 0,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ [PRICES SERVICE] Ошибка синхронизации:', error);
      return {
        success: false,
        syncedCount: 0,
        errors: [`Критическая ошибка: ${error}`]
      };
    }
  }

  /**
   * Обновить цену на топливо
   */
  async updatePrice(tradingPointId: string, fuelType: string, priceRubles: number): Promise<FuelPrice> {
    console.log(`💰 [PRICES SERVICE] Обновление цены: ${fuelType} = ${priceRubles}₽`);

    const priceData = {
      trading_point_id: tradingPointId,
      fuel_type: fuelType,
      fuel_code: fuelType,
      price_net: Math.round(priceRubles * 100 / 1.2), // Без НДС
      vat_rate: 20,
      price_gross: Math.round(priceRubles * 100), // С НДС
      unit: 'Л',
      currency: 'RUB',
      applied_from: new Date().toISOString(),
      status: 'active',
      source: 'manual' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Деактивируем старые цены
    await supabase
      .from('prices')
      .update({ status: 'expired' })
      .eq('trading_point_id', tradingPointId)
      .eq('fuel_type', fuelType)
      .eq('status', 'active');

    // Создаем новую цену
    const { data, error } = await supabase
      .from('prices')
      .insert(priceData)
      .select()
      .single();

    if (error) {
      console.error('❌ [PRICES SERVICE] Ошибка сохранения цены:', error);
      throw new Error(`Не удалось сохранить цену: ${error.message}`);
    }

    console.log(`✅ [PRICES SERVICE] Цена обновлена`);
    return data;
  }

  /**
   * Получить историю изменений цен
   */
  async getPriceHistory(tradingPointId: string, limit: number = 100): Promise<PriceHistoryEntry[]> {
    console.log(`📜 [PRICES SERVICE] Получение истории цен для ${tradingPointId}`);

    try {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('trading_point_id', tradingPointId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('⚠️ [PRICES SERVICE] Таблица price_history не найдена');
          return [];
        }
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [PRICES SERVICE] Ошибка получения истории:', error);
      return [];
    }
  }
}

// Экспорт singleton экземпляра
export const pricesSupabaseService = new PricesSupabaseService();

export default pricesSupabaseService;