/**
 * 🔄 ОБНОВЛЕННЫЙ СЕРВИС ДЛЯ РАБОТЫ С API ТОРГОВОЙ СЕТИ
 * 
 * Теперь использует универсальный HTTP клиент с автоматической конфигурацией
 * Все параметры берутся из раздела "Обмен данными"
 */

// Новые импорты для универсальной архитектуры
import { tanksApi, pricesApi, operationsApi } from './apiEndpoints';
import { httpClient } from './universalHttpClient';

// Импорт для получения данных о резервуарах
import { currentSupabaseEquipmentAPI } from './equipmentSupabase';
// Импорт сервиса маппинга для преобразования кодов топлива
import { tradingNetworkMappingService } from './tradingNetworkMappingService';
import { tradingNetworkConfigService } from './tradingNetworkConfigService';

// Базовый URL берется из системной конфигурации через универсальный клиент
// const BASE_URL - удален, теперь используется динамическая конфигурация


// Маппинг типов топлива на коды услуг
const FUEL_SERVICE_CODES: Record<string, number> = {
  'АИ-92': 1,
  'АИ-95': 2,
  'АИ-98': 3,
  'ДТ': 4,
  'АИ-100': 5
};



// Функция для получения видов топлива из резервуаров торговой точки
async function getFuelTypesFromTanks(stationNumber: number): Promise<string[]> {
  try {
    // Определяем trading_point_id по номеру станции
    // Маппинг: номер станции -> ID торговой точки
    // Маппинг: номер станции -> UUID торговой точки (основной)
    const stationToUuidMapping: Record<number, string> = {
      1: '9baf5375-9929-4774-8366-c0609b9f2a51',   // АЗС №001 - Центральная
      2: 'point2',   // АЗС №002 - Северная (временно, нужен UUID) 
      3: 'f2566905-c748-4240-ac31-47b626ab625d',   // АЗС №003 - Южная
      4: 'point4',   // АЗС №004 - Московское шоссе (временно, нужен UUID)
      5: 'f7963207-2732-4fae-988e-c73eef7645ca',   // АЗС №005 - Промзона
    };
    
    // Старый маппинг для обратной совместимости
    const legacyStationMapping: Record<number, string> = {
      1: 'point1',   // АЗС №001 - Центральная
      2: 'point2',   // АЗС №002 - Северная  
      3: 'point3',   // АЗС №003 - Южная
      4: 'point4',   // АЗС №004 - Московское шоссе
      5: 'point5',   // АЗС №005 - Промзона
    };
    
    // Сначала пробуем UUID маппинг, потом legacy
    const tradingPointId = stationToUuidMapping[stationNumber] || legacyStationMapping[stationNumber] || `point${stationNumber}`;
    
    console.log(`🏭 getFuelTypesFromTanks: станция ${stationNumber} → tradingPointId: ${tradingPointId}`);

    // Получаем оборудование для торговой точки
    const equipmentResponse = await currentSupabaseEquipmentAPI.list({
      trading_point_id: tradingPointId,
      limit: 100
    });

    console.log(`📋 Raw equipment data for ${tradingPointId}:`, equipmentResponse.data.map(eq => ({
      id: eq.id,
      name: eq.display_name,
      type: eq.system_type,
      fuelType: eq.params?.['Тип топлива'],
      status: eq.status
    })));

    // Фильтруем только активные резервуары и извлекаем типы топлива
    const fuelTypes = equipmentResponse.data
      .filter(eq => eq.system_type === 'fuel_tank' && eq.params?.['Тип топлива'] && eq.status !== 'deleted')
      .map(eq => eq.params['Тип топлива'])
      .filter((fuelType, index, array) => array.indexOf(fuelType) === index); // убираем дубликаты

    console.log(`🔍 Station ${stationNumber} (${tradingPointId}): найдено ${equipmentResponse.data.length} единиц оборудования`);
    console.log(`🔍 Station ${stationNumber} (${tradingPointId}): найдено ${fuelTypes.length} видов топлива:`, fuelTypes);

    return fuelTypes;
  } catch (error) {
    console.error('🚨 ОШИБКА получения типов топлива из резервуаров для станции', stationNumber, ':', error);
    throw new Error(`Не удалось получить типы топлива для станции ${stationNumber}. Проверьте подключение к базе данных и конфигурацию оборудования.`);
  }
}

// Типы для работы с API
export interface TradingNetworkPrice {
  service_code: number;
  service_name: string;
  price: number;
}

export interface TradingNetworkPricesResponse {
  prices: TradingNetworkPrice[];
}

export interface TradingNetworkService {
  service_code: number;
  service_name: string;
}

export interface SetPricesRequest {
  prices: Record<string, number>; // service_code -> price
  effective_date: string; // ISO 8601 format
}

// Класс для работы с API торговой сети
class TradingNetworkAPIService {
  private token: string | null = null;

  // ❌ УСТАРЕВШИЙ МЕТОД - используйте универсальный HTTP клиент
  async login(): Promise<string> {
    throw new Error('Прямая авторизация отключена. Используйте универсальный HTTP клиент с настройками из раздела "Обмен данными".');
    /*
    const response = await fetch(`BASEURL_FROM_CONFIG/v1/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain, application/json' // Принимаем оба формата
      },
      // Учетные данные берутся из конфигурации "Обмен данными"
      // body: JSON.stringify({ username, password })
      signal: AbortSignal.timeout(10000) // Таймаут 10 секунд
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Неизвестная ошибка');
      console.error('❌ Ошибка авторизации:', response.status, response.statusText, errorText);
      throw new Error(`Ошибка авторизации: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const token = await response.text();
    // Очищаем токен от лишних кавычек, которые могут добавляться от интерфейса
    this.token = token.replace(/^["']|["']$/g, '');
    
    console.log('✅ Авторизация успешна, токен получен');
    return token;
    */
  }

  // Проверка токена и повторная авторизация при необходимости
  private async ensureAuth(): Promise<void> {
    if (!this.token) {
      console.log('🔑 Отсутствует токен авторизации, выполняется вход...');
      await this.login();
    } else {
      console.log('🔑 Используется существующий токен авторизации');
    }
  }

  // Принудительная повторная авторизация
  async reauth(): Promise<string> {
    console.log('🔄 Принудительная повторная авторизация...');
    this.token = null;
    return await this.login();
  }

  // ❌ УСТАРЕВШИЙ МЕТОД - используйте newTradingNetworkAPI.getFuelPrices()
  async getPrices(
    stationNumber: number,
    systemId: number = 15,
    date?: string,
    networkId?: string
  ): Promise<TradingNetworkPricesResponse> {
    throw new Error('Устаревший метод. Используйте newTradingNetworkAPI.getFuelPrices() с настройками из раздела "Обмен данными".');
    /*
    console.log(`🔥 [TRADING API] tradingNetworkAPI.getPrices() вызван для станции ${stationNumber}`);
    

    await this.ensureAuth();

    try {
      const dateParam = date || new Date().toISOString();
      throw new Error('Прямые API вызовы отключены. Используйте универсальный HTTP клиент и новые методы (newTradingNetworkAPI.getFuelPrices).');
      
      const url = `BASEURL_FROM_CONFIG/v1/pos/prices/${stationNumber}?system=${systemId}&date=${encodeURIComponent(dateParam)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        // Попробуем повторно авторизоваться и повторить запрос
        if (response.status === 401) {
          await this.login();
          const retryResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Ошибка получения цен: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          const rawData = await retryResponse.json();
          return this.applyMappingToPrices(rawData, networkId);
        }
        throw new Error(`Ошибка получения цен: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      return this.applyMappingToPrices(rawData, networkId);
    } catch (error) {
      console.error('Ошибка при получении цен с АЗС:', error);
      throw new Error('Не удалось получить цены с торговой точки');
    }
    */
  }

  // Применение маппинга к полученным из API ценам
  private async applyMappingToPrices(
    apiResponse: any, 
    networkId?: string
  ): Promise<TradingNetworkPricesResponse> {
    console.log('🔄 Применяем маппинг к ценам от API...');
    
    if (!apiResponse.prices) {
      console.warn('⚠️ API ответ не содержит массив prices');
      return apiResponse;
    }

    try {
      // Инициализируем кэш маппинга, если он пуст
      const config = await tradingNetworkConfigService.getConfig();
      if (config.fuelMapping?.enabled) {
        await tradingNetworkMappingService.initializeCache(config);
      }

      // Преобразуем цены используя маппинг
      const mappedPrices: TradingNetworkPrice[] = apiResponse.prices.map((apiPrice: any) => {
        // Ищем маппинг по API коду
        const mapping = tradingNetworkMappingService.getMappingForApiCode(
          apiPrice.service_code, 
          networkId
        );

        if (mapping) {
          console.log(`🔄 Маппинг применен: API код ${apiPrice.service_code} (${apiPrice.service_name}) → ${mapping.internalCode} (${mapping.internalName})`);
          return {
            service_code: apiPrice.service_code,
            service_name: mapping.internalName, // Используем внутреннее название
            price: apiPrice.price,
            // Добавляем дополнительные поля для информации
            internal_code: mapping.internalCode,
            api_name: apiPrice.service_name
          };
        } else {
          console.warn(`⚠️ Маппинг не найден для API кода ${apiPrice.service_code}, используем исходные данные`);
          return apiPrice;
        }
      });

      console.log(`✅ Маппинг применен к ${mappedPrices.length} ценам`);
      return { prices: mappedPrices };

    } catch (error) {
      console.error('❌ Ошибка при применении маппинга к ценам:', error);
      // Возвращаем исходные данные при ошибке маппинга
      return apiResponse;
    }
  }

  // ❌ УСТАРЕВШИЙ МЕТОД - используйте newTradingNetworkAPI.setFuelPrices()
  async setPrices(
    stationNumber: number,
    prices: Record<string, number>,
    effectiveDate: string,
    systemId: number = 15
  ): Promise<void> {
    throw new Error('Устаревший метод. Используйте newTradingNetworkAPI.setFuelPrices() с настройками из раздела "Обмен данными".');
    /*
    */

    await this.ensureAuth();

    try {
      const url = `${BASE_URL}/v1/prices?system=${systemId}&station=${stationNumber}`;
      const body: SetPricesRequest = {
        prices,
        effective_date: effectiveDate
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        // Попробуем повторно авторизоваться и повторить запрос
        if (response.status === 401) {
          await this.login();
          const retryResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Ошибка установки цен: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          return;
        }
        throw new Error(`Ошибка установки цен: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Ошибка при установке цен на АЗС:', error);
      throw new Error('Не удалось установить цены на торговую точку');
    }
  }

  // Получение справочника услуг
  async getServices(systemId: number = 15, stationNumber?: number): Promise<TradingNetworkService[]> {

    await this.ensureAuth();

    try {
      const url = `${BASE_URL}/v1/services?system=${systemId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        // Попробуем повторно авторизоваться и повторить запрос
        if (response.status === 401) {
          await this.login();
          const retryResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          });
          
          if (!retryResponse.ok) {
            throw new Error(`Ошибка получения справочника услуг: ${retryResponse.status} ${retryResponse.statusText}`);
          }
          return await retryResponse.json();
        }
        throw new Error(`Ошибка получения справочника услуг: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении справочника услуг:', error);
      throw new Error('Не удалось получить справочник услуг');
    }
  }

  // Получить доступные API методы (из документации Swagger)
  async getAvailableAPIMethods(): Promise<TradingNetworkAPIMethod[]> {
    await this.ensureAuth();

    try {
      // Получаем Swagger документацию
      const url = `${BASE_URL}/docs/swagger.json`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback - возвращаем известные методы из документации
        return this.getKnownAPIMethods();
      }

      const swaggerDoc = await response.json();
      return this.parseSwaggerMethods(swaggerDoc);
      
    } catch (error) {
      console.warn('Не удалось получить Swagger документацию, используем известные методы:', error);
      return this.getKnownAPIMethods();
    }
  }

  // Получение транзакций с АЗС (НАЙДЕН В ДОКУМЕНТАЦИИ!)
  async getTransactions(
    systemId: number = 15,
    stationNumber?: number,
    startDate?: string,
    endDate?: string,
    shiftId?: string,
    posId?: string
  ): Promise<any[]> {
    console.log(`🔥 [TRADING API] tradingNetworkAPI.getTransactions() для системы ${systemId}, станция: ${stationNumber || 'все'}`);
    

    await this.ensureAuth();

    try {
      // Используем правильный endpoint из документации: GET /v1/transactions
      const params = new URLSearchParams();
      params.append('system', systemId.toString());
      
      // Параметр station обязателен. Если не указан, используем станцию 4 по умолчанию
      const actualStationNumber = stationNumber || 4;
      params.append('station', actualStationNumber.toString());
      
      console.log(`📍 Запрос для станции: ${actualStationNumber}`);
      if (startDate) params.append('date_from', startDate);
      if (endDate) params.append('date_to', endDate);
      if (shiftId) params.append('shift', shiftId);
      if (posId) params.append('pos', posId);

      const url = `${BASE_URL}/v1/transactions?${params.toString()}`;
      console.log(`🔍 Запрос транзакций: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Попробуем повторно авторизоваться и повторить запрос
        if (response.status === 401) {
          await this.login();
          const retryResponse = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/json'
            }
          });
          
          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            throw new Error(`Ошибка получения транзакций: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`);
          }
          
          const retryData = await retryResponse.json();
          console.log(`✅ Транзакции получены (после повторной авторизации):`, retryData?.length || 0);
          return retryData || [];
        }
        
        const errorText = await response.text();
        throw new Error(`Ошибка получения транзакций: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Транзакции получены:`, data?.length || 0);
      
      // ОТЛАДКА: показываем реальную структуру данных от API
      if (data && data.length > 0) {
        console.log('🔍 [API RAW] ПЕРВАЯ ТРАНЗАКЦИЯ ОТ ТОРГОВОГО API:', JSON.stringify(data[0], null, 2));
        console.log('🔍 [API RAW] КЛЮЧИ первой транзакции:', Object.keys(data[0]));
      }
      
      return data || [];

    } catch (error) {
      console.error('❌ Ошибка при получении транзакций:', error);
      throw error;
    }
  }

  // Загрузка транзакций (POST /v1/transactions)
  async uploadTransactions(
    systemId: number = 15,
    transactionsData: any[]
  ): Promise<boolean> {
    console.log(`🔥 [TRADING API] Загрузка транзакций в систему ${systemId}, количество: ${transactionsData.length}`);
    

    await this.ensureAuth();

    try {
      const response = await fetch(`${BASE_URL}/v1/transactions?system=${systemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionsData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка загрузки транзакций: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Транзакции загружены успешно`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка при загрузке транзакций:', error);
      throw error;
    }
  }

  // Управление сменами
  async openShift(systemId: number = 15, stationNumber: number): Promise<boolean> {
    console.log(`🔥 [TRADING API] Открытие смены для станции ${stationNumber}`);
    

    await this.ensureAuth();

    try {
      const response = await fetch(`${BASE_URL}/v1/control/shift_open?system=${systemId}&station=${stationNumber}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка открытия смены: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Смена открыта успешно для станции ${stationNumber}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка при открытии смены:', error);
      throw error;
    }
  }

  async closeShift(systemId: number = 15, stationNumber: number): Promise<boolean> {
    console.log(`🔥 [TRADING API] Закрытие смены для станции ${stationNumber}`);
    

    await this.ensureAuth();

    try {
      const response = await fetch(`${BASE_URL}/v1/control/shift_close?system=${systemId}&station=${stationNumber}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка закрытия смены: ${response.status} ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ Смена закрыта успешно для станции ${stationNumber}`);
      return true;

    } catch (error) {
      console.error('❌ Ошибка при закрытии смены:', error);
      throw error;
    }
  }

  // Получение информации о резервуарах
  async getTanks(systemId: number = 15, stationNumber?: number): Promise<any[]> {
    console.log(`🔥 [TRADING API] Получение данных резервуаров для системы ${systemId}, станция: ${stationNumber || 'все'}`);
    

    await this.ensureAuth();

    try {
      const params = new URLSearchParams();
      params.append('system', systemId.toString());
      if (stationNumber) params.append('station', stationNumber.toString());

      const url = `${BASE_URL}/v1/tanks?${params.toString()}`;
      console.log(`🔍 Запрос резервуаров: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка получения данных резервуаров: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Данные резервуаров получены:`, data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Ошибка при получении данных резервуаров:', error);
      throw error;
    }
  }

  // Получить известные методы из документации (fallback)
  private getKnownAPIMethods(): TradingNetworkAPIMethod[] {
    return [
      {
        id: 'login',
        name: 'Авторизация',
        method: 'POST',
        endpoint: '/v1/login',
        category: 'auth',
        description: 'Вход в систему с получением JWT токена',
        parameters: [
          { name: 'username', type: 'string', required: true, description: 'Имя пользователя' },
          { name: 'password', type: 'string', required: true, description: 'Пароль' }
        ]
      },
      {
        id: 'get_prices',
        name: 'Получение цен',
        method: 'GET', 
        endpoint: '/v1/pos/prices/{station_number}',
        category: 'prices',
        description: 'Получение текущих цен с торговой точки',
        parameters: [
          { name: 'station_number', type: 'number', required: true, description: 'Номер станции' },
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'date', type: 'string', required: false, description: 'Дата в формате ISO 8601' }
        ]
      },
      {
        id: 'set_prices',
        name: 'Установка цен',
        method: 'POST',
        endpoint: '/v1/prices',
        category: 'prices',
        description: 'Установка новых цен на торговой точке',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' },
          { name: 'prices', type: 'object', required: true, description: 'Объект с ценами' },
          { name: 'effective_date', type: 'string', required: true, description: 'Дата начала действия' }
        ]
      },
      {
        id: 'get_services',
        name: 'Справочник услуг',
        method: 'GET',
        endpoint: '/v1/services',
        category: 'reference',
        description: 'Получение справочника доступных услуг',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' }
        ]
      },
      {
        id: 'get_info',
        name: 'Статусы оборудования (краткие)',
        method: 'GET',
        endpoint: '/v1/info',
        category: 'monitoring',
        description: 'Получение сокращенного набора данных об оборудовании',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' }
        ]
      },
      {
        id: 'get_info_v2',
        name: 'Статусы оборудования (расширенные)',
        method: 'GET',
        endpoint: '/v2/info',
        category: 'monitoring',
        description: 'Получение расширенного набора данных об оборудовании',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' }
        ]
      },
      {
        id: 'restart_terminal',
        name: 'Перезагрузка терминала',
        method: 'POST',
        endpoint: '/v1/control/restart',
        category: 'control',
        description: 'Перезагрузка терминала на торговой точке',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' }
        ]
      },
      {
        id: 'get_transactions',
        name: 'Получение транзакций',
        method: 'GET',
        endpoint: '/v1/transactions',
        category: 'transactions',
        description: 'Получение списка транзакций с торговых точек',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: false, description: 'Номер станции (опционально)' },
          { name: 'date_from', type: 'string', required: false, description: 'Дата начала' },
          { name: 'date_to', type: 'string', required: false, description: 'Дата окончания' },
          { name: 'shift', type: 'string', required: false, description: 'ID смены' },
          { name: 'pos', type: 'string', required: false, description: 'ID POS терминала' }
        ]
      },
      {
        id: 'upload_transactions',
        name: 'Загрузка транзакций',
        method: 'POST',
        endpoint: '/v1/transactions',
        category: 'transactions',
        description: 'Загрузка транзакций в систему',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'body', type: 'array', required: true, description: 'Массив транзакций для загрузки' }
        ]
      },
      {
        id: 'get_tanks',
        name: 'Получение данных резервуаров',
        method: 'GET',
        endpoint: '/v1/tanks',
        category: 'monitoring',
        description: 'Получение информации о резервуарах',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: false, description: 'Номер станции (опционально)' }
        ]
      },
      {
        id: 'open_shift',
        name: 'Открыть смену',
        method: 'POST',
        endpoint: '/v1/control/shift_open',
        category: 'control',
        description: 'Открытие смены на торговой точке',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' }
        ]
      },
      {
        id: 'close_shift',
        name: 'Закрыть смену',
        method: 'POST',
        endpoint: '/v1/control/shift_close',
        category: 'control',
        description: 'Закрытие смены на торговой точке',
        parameters: [
          { name: 'system', type: 'number', required: true, description: 'ID системы' },
          { name: 'station', type: 'number', required: true, description: 'Номер станции' }
        ]
      }
    ];
  }

  // Парсинг методов из Swagger документации
  private parseSwaggerMethods(swaggerDoc: any): TradingNetworkAPIMethod[] {
    const methods: TradingNetworkAPIMethod[] = [];
    
    if (!swaggerDoc.paths) {
      return this.getKnownAPIMethods();
    }

    for (const path in swaggerDoc.paths) {
      const pathData = swaggerDoc.paths[path];
      
      for (const httpMethod in pathData) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(httpMethod.toLowerCase())) {
          const methodData = pathData[httpMethod];
          
          const method: TradingNetworkAPIMethod = {
            id: `${httpMethod}_${path}`.replace(/[^a-zA-Z0-9]/g, '_'),
            name: methodData.summary || methodData.operationId || `${httpMethod.toUpperCase()} ${path}`,
            method: httpMethod.toUpperCase(),
            endpoint: path,
            category: this.categorizeEndpoint(path),
            description: methodData.description || methodData.summary || `Метод ${httpMethod.toUpperCase()} для ${path}`,
            parameters: this.parseParameters(methodData.parameters || [])
          };
          
          methods.push(method);
        }
      }
    }

    return methods.length > 0 ? methods : this.getKnownAPIMethods();
  }

  // Категоризация endpoint'ов
  private categorizeEndpoint(path: string): string {
    if (path.includes('login') || path.includes('auth')) return 'auth';
    if (path.includes('price')) return 'prices';
    if (path.includes('service')) return 'reference';
    if (path.includes('info')) return 'monitoring';
    if (path.includes('control') || path.includes('restart')) return 'control';
    if (path.includes('transaction') || path.includes('sale') || path.includes('payment') || path.includes('receipt') || path.includes('history')) return 'transactions';
    return 'other';
  }

  // Парсинг параметров из Swagger
  private parseParameters(parameters: any[]): TradingNetworkAPIMethodParameter[] {
    return parameters.map(param => ({
      name: param.name,
      type: param.type || param.schema?.type || 'string',
      required: param.required || false,
      description: param.description || `Параметр ${param.name}`
    }));
  }
}

// Типы для API методов
export interface TradingNetworkAPIMethod {
  id: string;
  name: string;
  method: string; // GET, POST, etc.
  endpoint: string;
  category: string;
  description: string;
  parameters: TradingNetworkAPIMethodParameter[];
}

export interface TradingNetworkAPIMethodParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

// Экспорт экземпляра сервиса (LEGACY - для обратной совместимости)
export const tradingNetworkAPI = new TradingNetworkAPIService();

// === НОВЫЕ МЕТОДЫ С ИСПОЛЬЗОВАНИЕМ УНИВЕРСАЛЬНОГО HTTP КЛИЕНТА ===

/**
 * 🔄 ОБНОВЛЕННЫЕ МЕТОДЫ - используют универсальный HTTP клиент
 */

/**
 * 🛢️ Получить резервуары из торговой сети (НОВЫЙ МЕТОД)
 * Использует настройки из раздела "Обмен данными"
 */
export async function getTanksFromTradingNetwork(systemId: string, stationId: string) {
  console.log(`🛢️ Получение резервуаров из торговой сети: system=${systemId}, station=${stationId}`);
  
  try {
    const response = await tanksApi.getTanksFromTradingNetwork(systemId, stationId);
    
    if (response.success && response.data) {
      console.log(`✅ Получено ${response.data.length} резервуаров за ${response.responseTime}мс`);
      return response.data;
    } else {
      console.error('❌ Ошибка получения резервуаров:', response.error);
      throw new Error(response.error || 'Failed to fetch tanks');
    }
  } catch (error: any) {
    console.error('❌ Ошибка API резервуаров:', error.message);
    throw error;
  }
}

/**
 * 💰 Получить цены из торговой сети (НОВЫЙ МЕТОД)
 */
export async function getFuelPricesFromTradingNetwork(systemId: string, stationId: string): Promise<Record<string, number>> {
  console.log(`💰 Получение цен из торговой сети: system=${systemId}, station=${stationId}`);
  
  try {
    const response = await pricesApi.getPricesFromTradingNetwork(systemId, stationId);
    
    if (response.success && response.data) {
      console.log(`✅ Получены цены для ${Object.keys(response.data).length} видов топлива`);
      return response.data;
    } else {
      console.error('❌ Ошибка получения цен:', response.error);
      throw new Error(`Не удалось получить цены топлива: ${response.error}`);
    }
  } catch (error: any) {
    console.error('❌ Ошибка API цен:', error.message);
    throw error;
  }
}

/**
 * 📊 Установить цены в торговой сети (НОВЫЙ МЕТОД)
 */
export async function setFuelPricesInTradingNetwork(
  systemId: string, 
  stationId: string, 
  prices: Record<string, number>
): Promise<boolean> {
  console.log(`📊 Установка цен в торговой сети:`, prices);
  
  try {
    const response = await pricesApi.setPricesInTradingNetwork(systemId, stationId, prices);
    
    if (response.success) {
      console.log('✅ Цены успешно установлены');
      return true;
    } else {
      console.error('❌ Ошибка установки цен:', response.error);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Ошибка API установки цен:', error.message);
    return false;
  }
}

/**
 * 🧾 Получить операции из торговой сети (НОВЫЙ МЕТОД)
 */
export async function getOperationsFromTradingNetwork(
  systemId: string, 
  stationId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) {
  console.log(`🧾 Получение операций из торговой сети: system=${systemId}, station=${stationId}`, params);
  
  try {
    const response = await operationsApi.getOperationsFromTradingNetwork(systemId, stationId, params);
    
    if (response.success && response.data) {
      console.log(`✅ Получено ${response.data.length} операций за ${response.responseTime}мс`);
      return response.data;
    } else {
      console.error('❌ Ошибка получения операций:', response.error);
      throw new Error(response.error || 'Failed to fetch operations');
    }
  } catch (error: any) {
    console.error('❌ Ошибка API операций:', error.message);
    throw error;
  }
}

/**
 * 🧪 Тестировать подключение к торговой сети (НОВЫЙ МЕТОД)
 */
export async function testTradingNetworkConnection() {
  console.log('🧪 Тестирование подключения к торговой сети...');
  
  try {
    const response = await httpClient.testExternalApiConnection();
    
    if (response.success) {
      console.log(`✅ Подключение успешно: ${response.responseTime}мс`);
      return {
        success: true,
        responseTime: response.responseTime,
        data: response.data
      };
    } else {
      console.error('❌ Ошибка подключения:', response.error);
      return {
        success: false,
        error: response.error
      };
    }
  } catch (error: any) {
    console.error('❌ Критическая ошибка тестирования:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 📋 Получить информацию о конфигурации (НОВЫЙ МЕТОД)
 */
export async function getTradingNetworkConfig() {
  console.log('📋 Получение конфигурации торговой сети...');
  
  try {
    const configInfo = await httpClient.getConfigurationInfo();
    return configInfo.externalApi;
  } catch (error: any) {
    console.error('❌ Ошибка получения конфигурации:', error.message);
    return null;
  }
}

// Экспорт всех новых методов для удобства
export const newTradingNetworkAPI = {
  getTanks: getTanksFromTradingNetwork,
  getFuelPrices: getFuelPricesFromTradingNetwork,
  setFuelPrices: setFuelPricesInTradingNetwork,
  getOperations: getOperationsFromTradingNetwork,
  testConnection: testTradingNetworkConnection,
  getConfig: getTradingNetworkConfig,
};