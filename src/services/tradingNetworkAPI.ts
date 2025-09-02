// Сервис для работы с API торговой сети (pos.autooplata.ru/tms)
const BASE_URL = 'https://pos.autooplata.ru/tms';

// Импорт для получения данных о резервуарах
import { mockEquipmentAPI } from './equipment';

// Стандартные цены по типам топлива (базовые значения)
const DEFAULT_FUEL_PRICES: Record<string, number> = {
  'АИ-92': 56.20,
  'АИ-95': 59.80,
  'АИ-98': 65.40,
  'ДТ': 61.90,
  'АИ-100': 68.50
};

// Маппинг типов топлива на коды услуг
const FUEL_SERVICE_CODES: Record<string, number> = {
  'АИ-92': 1,
  'АИ-95': 2,
  'АИ-98': 3,
  'ДТ': 4,
  'АИ-100': 5
};

// Хранилище установленных цен (имитация базы данных)
const STORED_PRICES: Record<string, Record<string, number>> = {};

// Проверка на демо режим (если нет реального токена или API недоступен)
const USE_MOCK_MODE = true; // Для демо всегда используем mock данные

// Функция для получения видов топлива из резервуаров торговой точки
async function getFuelTypesFromTanks(stationNumber: number): Promise<string[]> {
  try {
    // Определяем trading_point_id по номеру станции
    // Маппинг: номер станции -> ID торговой точки
    const stationMapping: Record<number, string> = {
      77: 'point1',  // АЗС №001 - Центральная
      78: 'point2',  // АЗС №002 - Северная  
      79: 'point3',  // АЗС №003 - Южная
      80: 'point4',  // АЗС №004 - Московское шоссе
      81: 'point5',  // АЗС №005 - Промзона
    };
    
    const tradingPointId = stationMapping[stationNumber] || `point${stationNumber}`;

    // Получаем оборудование для торговой точки
    const equipmentResponse = await mockEquipmentAPI.list({
      trading_point_id: tradingPointId,
      limit: 100
    });

    // Фильтруем только активные резервуары и извлекаем типы топлива
    const fuelTypes = equipmentResponse.data
      .filter(eq => eq.system_type === 'fuel_tank' && eq.params?.fuelType && eq.status !== 'deleted')
      .map(eq => eq.params.fuelType)
      .filter((fuelType, index, array) => array.indexOf(fuelType) === index); // убираем дубликаты

    return fuelTypes;
  } catch (error) {
    console.error('Ошибка получения типов топлива из резервуаров:', error);
    return ['АИ-92', 'АИ-95', 'ДТ']; // Fallback
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

  // Авторизация в системе
  async login(): Promise<string> {
    try {
      const response = await fetch(`${BASE_URL}/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'UserTest',
          password: 'sys5tem6'
        })
      });

      if (!response.ok) {
        throw new Error(`Ошибка авторизации: ${response.status} ${response.statusText}`);
      }

      const token = await response.text();
      this.token = token;
      return token;
    } catch (error) {
      console.error('Ошибка при авторизации в API торговой сети:', error);
      throw new Error('Не удалось авторизоваться в API торговой сети');
    }
  }

  // Проверка токена и повторная авторизация при необходимости
  private async ensureAuth(): Promise<void> {
    if (!this.token) {
      await this.login();
    }
  }

  // Получение цен с АЗС
  async getPrices(
    stationNumber: number,
    systemId: number = 15,
    date?: string
  ): Promise<TradingNetworkPricesResponse> {
    // В демо режиме возвращаем данные на основе резервуаров
    if (USE_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 300)); // Имитация задержки сети
      
      // Получаем виды топлива из резервуаров
      const fuelTypes = await getFuelTypesFromTanks(stationNumber);
      
      // Формируем цены на основе резервуаров
      const prices: TradingNetworkPrice[] = fuelTypes.map(fuelType => {
        const serviceCode = FUEL_SERVICE_CODES[fuelType] || 1;
        const stationKey = `station_${stationNumber}`;
        const storedPrice = STORED_PRICES[stationKey]?.[fuelType];
        const price = storedPrice || DEFAULT_FUEL_PRICES[fuelType] || 50.0;
        
        return {
          service_code: serviceCode,
          service_name: fuelType,
          price
        };
      });
      
      return { prices };
    }

    await this.ensureAuth();

    try {
      const dateParam = date || new Date().toISOString();
      const url = `${BASE_URL}/v1/pos/prices/${stationNumber}?system=${systemId}&date=${encodeURIComponent(dateParam)}`;

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
          return await retryResponse.json();
        }
        throw new Error(`Ошибка получения цен: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении цен с АЗС:', error);
      throw new Error('Не удалось получить цены с торговой точки');
    }
  }

  // Установка цен на АЗС
  async setPrices(
    stationNumber: number,
    prices: Record<string, number>,
    effectiveDate: string,
    systemId: number = 15
  ): Promise<void> {
    // В демо режиме имитируем успешную установку цен
    if (USE_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Имитация задержки сети
      
      const stationKey = `station_${stationNumber}`;
      if (!STORED_PRICES[stationKey]) {
        STORED_PRICES[stationKey] = {};
      }
      
      // Получаем виды топлива из резервуаров для валидации
      const availableFuelTypes = await getFuelTypesFromTanks(stationNumber);
      
      // Сохраняем цены только для доступных видов топлива
      for (const [serviceCodeStr, price] of Object.entries(prices)) {
        const serviceCode = parseInt(serviceCodeStr);
        // Находим тип топлива по коду услуги
        const fuelType = Object.entries(FUEL_SERVICE_CODES).find(([fuel, code]) => code === serviceCode)?.[0];
        
        if (fuelType && availableFuelTypes.includes(fuelType)) {
          STORED_PRICES[stationKey][fuelType] = price;
        }
      }
      
      console.log(`Mock: Цены установлены для АЗС ${stationNumber}:`, STORED_PRICES[stationKey]);
      return;
    }

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
    // В демо режиме возвращаем данные на основе всех возможных видов топлива
    if (USE_MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Имитация задержки сети
      
      // Если указан номер станции, получаем топливо только для этой станции
      if (stationNumber) {
        const fuelTypes = await getFuelTypesFromTanks(stationNumber);
        return fuelTypes.map(fuelType => ({
          service_code: FUEL_SERVICE_CODES[fuelType] || 1,
          service_name: fuelType
        }));
      }
      
      // Иначе возвращаем все доступные виды топлива
      return Object.entries(FUEL_SERVICE_CODES).map(([fuelType, serviceCode]) => ({
        service_code: serviceCode,
        service_name: fuelType
      }));
    }

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

// Экспорт экземпляра сервиса
export const tradingNetworkAPI = new TradingNetworkAPIService();