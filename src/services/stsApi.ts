/**
 * Сервис для работы с API СТС (pos.autooplata.ru/tms)
 */

interface STSApiConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
  token?: string;
  tokenExpiry?: number;
  refreshInterval: number;
  // networkId и tradingPointId теперь берутся из селекторов приложения
}

interface Tank {
  id: number;
  name: string;
  fuelType: string;
  currentLevelLiters: number;
  capacityLiters: number;
  minLevelPercent: number;
  criticalLevelPercent: number;
  temperature: number;
  waterLevelMm: number;
  sensors: Array<{ name: string; status: string; }>;
  lastCalibration: string;
  linkedPumps: Array<{ id: number; name: string; }>;
  notifications: {
    enabled: boolean;
    drainAlerts: boolean;
    levelAlerts: boolean;
  };
  thresholds: {
    criticalTemp: { min: number; max: number; };
    maxWaterLevel: number;
    notifications: {
      critical: boolean;
      minimum: boolean;
      temperature: boolean;
      water: boolean;
    };
  };
  apiData?: {
    number: number;
    fuel: number;
    fuel_name: string;
    state: number;
    volume_begin: number;
    volume_end: number;
    volume_max: number;
    volume_free: number;
    volume: number;
    amount_begin: number;
    amount_end: number;
    level: number;
    water: {
      volume: number;
      amount: number;
      level: number;
    };
    temperature: number;
    density: number;
    release: {
      volume: number;
      amount: number;
    };
    dt: string;
  };
}

interface Pump {
  id: number;
  name: string;
  status: string;
  fuelType: string;
  currentPrice: number;
  totalSales: number;
  dailySales: number;
  lastTransaction: string;
  nozzles: Array<{ id: number; name: string; status: string; }>;
}

interface Sale {
  id: number;
  date: string;
  pumpId: number;
  pumpName: string;
  fuelType: string;
  volume: number;
  price: number;
  total: number;
  cardNumber?: string;
  receiptNumber: string;
}

interface TerminalInfo {
  terminal: {
    id: string;
    name: string;
    version: string;
    status: 'online' | 'offline' | 'maintenance';
    uptime: number;
    lastHeartbeat: string;
    cpu: {
      usage: number;
      temperature: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
    };
    network: {
      ip: string;
      connected: boolean;
      speed: number;
    };
  };
  pumps: Array<{
    id: number;
    name: string;
    status: 'active' | 'offline' | 'error' | 'maintenance';
    fuelType: string;
    nozzles: Array<{
      id: number;
      status: 'ready' | 'dispensing' | 'error' | 'maintenance';
    }>;
  }>;
  tanks: Array<{
    id: number;
    name: string;
    fuelType: string;
    level: number;
    capacity: number;
    temperature: number;
    status: 'normal' | 'low' | 'critical' | 'error';
  }>;
  pos: {
    status: 'online' | 'offline' | 'error';
    version: string;
    lastTransaction: string;
    cashierConnected: boolean;
  };
  fiscal: {
    status: 'ready' | 'error' | 'maintenance';
    model: string;
    serialNumber: string;
    documentNumber: number;
  };
  shift?: {
    number: number;
    state: string;
    openedAt?: string;
  };
  devices?: {
    billAcceptor?: {
      status: 'online' | 'error';
      name: string;
      billCount?: number;
      billAmount?: number;
    };
    cardReader?: {
      status: 'online' | 'error';
      name: string;
    };
    mpsReader?: {
      status: 'online' | 'error';
      name: string;
    };
  };
}

interface Price {
  id: number;
  fuelType: string;
  price: number;
  effectiveDate: string;
  createdBy: string;
  status: string;
}

interface Transaction {
  id: number;
  transactionId: string;
  date: string;
  pumpId?: number;
  pumpName?: string;
  fuelType: string;
  volume: number;
  price: number;
  total: number;
  cardNumber?: string;
  receiptNumber?: string;
  status: string;
  operationType: string;
  paymentMethod?: string;
  networkId?: string;
  tradingPointId?: string;
  operatorName?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  apiData?: {
    // Сырые данные от API СТС
    [key: string]: any;
  };
}

class STSApiService {
  private config: STSApiConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('sts-api-config');
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        // Всегда обновляем конфигурацию из localStorage
        this.config = parsedConfig;
        console.log('🔍 STS API: Конфигурация обновлена из localStorage', {
          hasToken: !!parsedConfig.token,
          tokenExpiry: parsedConfig.tokenExpiry ? new Date(parsedConfig.tokenExpiry).toISOString() : 'не установлен'
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигурации СТС API:', error);
    }
  }

  private async refreshTokenIfNeeded(forceRefresh = false): Promise<boolean> {
    if (!this.config?.enabled) {
      console.log('🔍 STS API: API отключен, токен не нужен');
      return false;
    }
    
    const now = Date.now();
    const tokenExists = !!this.config.token;
    const tokenExpired = this.config.tokenExpiry ? this.config.tokenExpiry < now : true;
    
    console.log('🔍 STS API: Проверка токена:', {
      tokenExists,
      tokenExpired,
      forceRefresh,
      tokenExpiry: this.config.tokenExpiry ? new Date(this.config.tokenExpiry).toISOString() : 'не установлен',
      now: new Date(now).toISOString()
    });
    
    // Проверяем, нужно ли обновить токен
    if (!tokenExists || tokenExpired || forceRefresh) {
      console.log('🔍 STS API: Необходимо обновить токен', { forceRefresh });
      
      try {
        console.log('🔍 STS API: Отправляем запрос авторизации...');
        const response = await fetch(`${this.config.url}/v1/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: this.config.username,
            password: this.config.password
          }),
          signal: AbortSignal.timeout(this.config.timeout || 30000),
        });

        console.log(`🔍 STS API: Ответ авторизации: ${response.status} ${response.statusText}`);

        if (response.ok) {
          const tokenResponse = await response.text();
          const cleanToken = tokenResponse.replace(/"/g, '');
          // Уменьшаем время жизни токена до 20 минут для более частого обновления
          const newExpiry = Date.now() + (20 * 60 * 1000); // 20 минут вместо 24 часов
          
          console.log('🔍 STS API: Получен новый токен:', cleanToken.substring(0, 20) + '...');
          
          this.config.token = cleanToken;
          this.config.tokenExpiry = newExpiry;
          
          // Сохраняем обновленную конфигурацию
          localStorage.setItem('sts-api-config', JSON.stringify(this.config));
          
          console.log('🔍 STS API: Токен успешно обновлен и сохранен');
          console.log('🔍 STS API: Новое время истечения:', new Date(newExpiry).toISOString());
          return true;
        } else {
          const errorText = await response.text();
          console.error(`🔍 STS API: Ошибка авторизации HTTP ${response.status}:`, errorText);
          return false;
        }
      } catch (error) {
        console.error('🔍 STS API: Исключение при обновлении токена:', error);
        return false;
      }
    }
    
    console.log('🔍 STS API: Токен действителен, обновление не требуется');
    return !!this.config.token;
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}, contextParams?: {networkId?: string; tradingPointId?: string}): Promise<T> {
    console.log(`🔍 STS API: Выполняем запрос к ${endpoint}`);
    
    this.loadConfig(); // Обновляем конфигурацию перед запросом
    
    if (!this.config?.enabled) {
      console.error('🔍 STS API: API отключен в настройках');
      throw new Error('API СТС отключен в настройках');
    }

    // Используем параметры из контекста (селекторы приложения)
    const networkId = contextParams?.networkId?.trim();
    const tradingPointId = contextParams?.tradingPointId?.trim();

    console.log('🔍 STS API: Конфигурация загружена:', {
      url: this.config.url,
      networkId: networkId || 'не задан',
      tradingPointId: tradingPointId || 'не задан',
      hasToken: !!this.config.token,
      source: contextParams ? 'из контекста приложения' : 'из настроек API'
    });

    // Проверяем обязательные параметры для запросов к резервуарам, ТРК, продажам и транзакциям
    // Исключение: /v1/pos/prices/{station} не требует system параметр, так как station уже в URL
    if ((endpoint.includes('/v1/tanks') || endpoint.includes('/v1/pumps') || endpoint.includes('/v1/sales') || endpoint.includes('/v1/transactions') || (endpoint.includes('/v1/prices') && !endpoint.includes('/v1/pos/prices')))) {
      if (!networkId) {
        console.error('🔍 STS API: Отсутствует номер сети для запроса', endpoint);
        throw new Error(`Ошибка 422: Для запроса ${endpoint} требуется указать номер сети. Проверьте, что у выбранной сети заполнено поле "external_id" в настройках сетей.`);
      }
      
      // Проверяем, что network ID является числом или строкой, которая может быть числом
      if (isNaN(Number(networkId))) {
        console.error('🔍 STS API: Номер сети должен быть числом:', networkId);
        throw new Error(`Ошибка 422: Номер сети "${networkId}" должен быть числом. Проверьте поле "external_id" для выбранной сети.`);
      }
      
      // Для запросов транзакций обязательно требуется торговая точка
      if (endpoint.includes('/v1/transactions')) {
        if (!tradingPointId) {
          console.error('🔍 STS API: Отсутствует номер торговой точки для запроса транзакций');
          throw new Error(`Ошибка 422: Для запроса транзакций требуется указать номер торговой точки (station). Выберите конкретную торговую точку в селекторе.`);
        }
        if (isNaN(Number(tradingPointId))) {
          console.error('🔍 STS API: Номер торговой точки должен быть числом:', tradingPointId);
          throw new Error(`Ошибка 422: Номер торговой точки "${tradingPointId}" должен быть числом. Проверьте поле "external_id" для выбранной торговой точки.`);
        }
      }
      
      // Для некоторых запросов также требуется торговая точка
      if (endpoint.includes('/v1/tanks') && tradingPointId) {
        if (isNaN(Number(tradingPointId))) {
          console.warn('🔍 STS API: Номер торговой точки должен быть числом:', tradingPointId);
          console.warn('🔍 STS API: Игнорируем торговую точку и запрашиваем данные всех точек');
        }
      }
    }

    // Обновляем токен если нужно
    const tokenValid = await this.refreshTokenIfNeeded();
    if (!tokenValid) {
      console.error('🔍 STS API: Не удалось получить действительный токен');
      throw new Error('Не удалось получить действительный токен');
    }

    const url = new URL(`${this.config.url}${endpoint}`);
    
    // Добавляем параметры сети и торговой точки если они заданы
    if (networkId) {
      // Убеждаемся, что передаем число для system
      const systemParam = String(Number(networkId));
      url.searchParams.set('system', systemParam);
      console.log(`🔍 STS API: Добавлен параметр system = ${systemParam} (исходное: ${networkId})`);
    }
    if (tradingPointId && !isNaN(Number(tradingPointId))) {
      // Убеждаемся, что передаем число для station
      const stationParam = String(Number(tradingPointId));
      url.searchParams.set('station', stationParam);
      console.log(`🔍 STS API: Добавлен параметр station = ${stationParam} (исходное: ${tradingPointId})`);
    }

    console.log(`🔍 STS API: Итоговый URL: ${url.toString()}`);

    const headers = {
      'Authorization': `Bearer ${this.config.token}`,
      ...options.headers,
    };

    console.log('🔍 STS API: Заголовки запроса:', headers);

    const response = await fetch(url.toString(), {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    console.log(`🔍 STS API: Получен ответ: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔍 STS API: Ошибка HTTP ${response.status}:`, errorText);
      
      // Обрабатываем специфические ошибки
      if (response.status === 422) {
        console.error('🔍 STS API: Ошибка валидации параметров (422)');
        console.error('🔍 STS API: URL запроса:', url.toString());
        console.error('🔍 STS API: Тело ответа:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          console.error('🔍 STS API: Детали ошибки 422:', errorData);
          
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const missingFields = errorData.detail
              .filter((err: any) => err.msg === "field required")
              .map((err: any) => err.loc[err.loc.length - 1]);
            
            const invalidFields = errorData.detail
              .filter((err: any) => err.type === "type_error.integer")
              .map((err: any) => err.loc[err.loc.length - 1]);
            
            if (missingFields.includes('system')) {
              throw new Error(`Ошибка API СТС: Отсутствует обязательный параметр "system" (номер сети).\n\nПроверьте:\n1. Выбрана ли сеть в селекторе\n2. У выбранной сети заполнено поле "external_id"\n3. Значение external_id является числом`);
            }
            
            if (missingFields.includes('station')) {
              throw new Error(`Ошибка API СТС: Отсутствует обязательный параметр "station" (номер торговой точки).\n\nПроверьте:\n1. Выбрана ли торговая точка в селекторе\n2. Значение торговой точки является числом`);
            }
            
            if (invalidFields.includes('system')) {
              throw new Error(`Ошибка API СТС: Параметр "system" должен быть числом.\n\nТекущее значение: "${networkId}"\n\nПроверьте поле "external_id" для выбранной сети - оно должно содержать только цифры.`);
            }
            
            if (invalidFields.includes('station')) {
              throw new Error(`Ошибка API СТС: Параметр "station" должен быть числом.\n\nТекущее значение: "${tradingPointId}"\n\nПроверьте значение торговой точки - оно должно содержать только цифры.`);
            }
            
            // Если есть другие ошибки валидации, показываем их
            const otherErrors = errorData.detail
              .filter((err: any) => !missingFields.includes(err.loc[err.loc.length - 1]) && !invalidFields.includes(err.loc[err.loc.length - 1]))
              .map((err: any) => `${err.loc.join('.')}: ${err.msg}`);
            
            if (otherErrors.length > 0) {
              throw new Error(`Ошибка API СТС: Ошибки валидации параметров:\n${otherErrors.join('\n')}`);
            }
          }
          
          // Общая ошибка валидации без деталей
          throw new Error(`Ошибка API СТС (422): Неверные параметры запроса.\n\nURL: ${url.toString()}\n\nОтвет сервера: ${errorText}`);
          
        } catch (parseError) {
          console.error('🔍 STS API: Не удалось разобрать ошибку 422:', parseError);
          throw new Error(`Ошибка API СТС (422): Неверные параметры запроса.\n\nURL: ${url.toString()}\n\nПроверьте параметры system и station в настройках.`);
        }
      }
      
      // Если получили 401 - токен недействителен, пытаемся обновить его
      if (response.status === 401) {
        console.log('🔍 STS API: Получена ошибка 401, принудительно обновляем токен...');
        
        // Сбрасываем текущий токен
        if (this.config) {
          this.config.token = undefined;
          this.config.tokenExpiry = undefined;
          localStorage.setItem('sts-api-config', JSON.stringify(this.config));
        }
        
        // Принудительно получаем новый токен
        const tokenRefreshed = await this.refreshTokenIfNeeded(true);
        
        if (tokenRefreshed) {
          console.log('🔍 STS API: Токен обновлен, повторяем запрос...');
          
          // Повторяем запрос с новым токеном
          const retryHeaders = {
            'Authorization': `Bearer ${this.config?.token}`,
            ...options.headers,
          };
          
          const retryResponse = await fetch(url.toString(), {
            ...options,
            headers: retryHeaders,
            signal: AbortSignal.timeout(this.config?.timeout || 30000),
          });
          
          console.log(`🔍 STS API: Повторный запрос: ${retryResponse.status} ${retryResponse.statusText}`);
          
          if (retryResponse.ok) {
            const retryContentType = retryResponse.headers.get('content-type');
            if (retryContentType?.includes('application/json')) {
              const retryJsonData = await retryResponse.json();
              console.log('🔍 STS API: Данные JSON (повторный запрос):', retryJsonData);
              return retryJsonData;
            } else {
              const retryTextData = await retryResponse.text();
              console.log('🔍 STS API: Текстовые данные (повторный запрос):', retryTextData);
              return retryTextData as T;
            }
          } else {
            const retryErrorText = await retryResponse.text();
            console.error(`🔍 STS API: Повторный запрос также неуспешен ${retryResponse.status}:`, retryErrorText);
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
        }
      }
      
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('🔍 STS API: Content-Type ответа:', contentType);
    
    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      console.log('🔍 STS API: Данные JSON:', jsonData);
      return jsonData;
    } else {
      const textData = await response.text();
      console.log('🔍 STS API: Текстовые данные:', textData);
      return textData as T;
    }
  }

  /**
   * Получить список резервуаров
   */
  async getTanks(contextParams?: {networkId?: string; tradingPointId?: string}): Promise<Tank[]> {
    console.log('🔍 STS API: Начинаем загрузку резервуаров...');
    
    try {
      console.log('🔍 STS API: Выполняем запрос к /v1/tanks');
      const data = await this.apiRequest<any>('/v1/tanks', {}, contextParams);
      
      console.log('🔍 STS API: Получен ответ от API:', data);
      console.log('🔍 STS API: Тип ответа:', typeof data);
      console.log('🔍 STS API: Является ли массивом:', Array.isArray(data));
      
      // Преобразуем данные из API в формат приложения
      if (Array.isArray(data)) {
        console.log(`🔍 STS API: Обрабатываем ${data.length} резервуаров как массив`);
        const mappedTanks = data.map(this.mapApiTankToTank);
        console.log('🔍 STS API: Резервуары успешно преобразованы:', mappedTanks);
        return mappedTanks;
      } else if (data && typeof data === 'object' && data.tanks) {
        console.log(`🔍 STS API: Обрабатываем ${data.tanks.length} резервуаров из объекта`);
        const mappedTanks = data.tanks.map(this.mapApiTankToTank);
        console.log('🔍 STS API: Резервуары успешно преобразованы:', mappedTanks);
        return mappedTanks;
      } else {
        console.warn('🔍 STS API: Неожиданный формат ответа API для резервуаров:', data);
        console.warn('🔍 STS API: Возвращаем пустой массив');
        return [];
      }
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения резервуаров из API СТС:', error);
      throw error;
    }
  }

  /**
   * Получить данные конкретного резервуара
   */
  async getTank(tankId: number, contextParams?: {networkId?: string; tradingPointId?: string}): Promise<Tank | null> {
    try {
      const data = await this.apiRequest<any>(`/v1/tanks/${tankId}`, {}, contextParams);
      return this.mapApiTankToTank(data);
    } catch (error) {
      console.error(`Ошибка получения резервуара ${tankId} из API СТС:`, error);
      throw error;
    }
  }

  /**
   * Преобразует данные резервуара из API в формат приложения
   */
  private mapApiTankToTank(apiTank: any): Tank {
    console.log('🔍 STS API: Преобразуем резервуар:', apiTank);
    
    // ID и название на основе реальной структуры API
    const id = parseInt(apiTank.number || apiTank.id || Math.floor(Math.random() * 1000));
    const name = `Резервуар №${apiTank.number || id}`;
    
    // Тип топлива из реального API
    const fuelType = apiTank.fuel_name || 'Неизвестно';
    
    // Объемы из реального API (в литрах)
    const currentLevelLiters = parseFloat(apiTank.volume || '0');
    const capacityLiters = parseFloat(apiTank.volume_max || '50000');
    
    // Рассчитываем проценты
    const currentPercent = capacityLiters > 0 ? (currentLevelLiters / capacityLiters) * 100 : 0;
    const minLevelPercent = 20; // Стандартные пороги
    const criticalLevelPercent = 10;
    
    // Температура из реального API
    const temperature = parseFloat(apiTank.temperature || '15');
    
    // Уровень воды из реального API (конвертируем в мм)
    const waterLevelMm = parseFloat(apiTank.water?.level || '0');
    
    // Статус датчиков на основе состояния резервуара
    const sensors = [
      {
        name: 'Уровень',
        status: apiTank.state === 1 ? 'ok' : 'error'
      },
      {
        name: 'Температура', 
        status: apiTank.state === 1 ? 'ok' : 'error'
      }
    ];
    
    // Привязанные ТРК (пока заглушка, может быть в других endpoints)
    const linkedPumps: Array<{ id: number; name: string; }> = [];
    
    // Последняя калибровка (используем dt из API)
    const lastCalibration = apiTank.dt ? 
      new Date(apiTank.dt).toLocaleString('ru-RU') : 
      new Date().toLocaleDateString('ru-RU');

    const result = {
      id,
      name,
      fuelType,
      currentLevelLiters,
      capacityLiters,
      minLevelPercent,
      criticalLevelPercent,
      temperature,
      waterLevelMm,
      sensors,
      lastCalibration,
      linkedPumps,
      notifications: {
        enabled: true,
        drainAlerts: true,
        levelAlerts: true
      },
      thresholds: {
        criticalTemp: {
          min: -10,
          max: 40
        },
        maxWaterLevel: 10,
        notifications: {
          critical: true,
          minimum: true,
          temperature: true,
          water: true
        }
      },
      // Добавляем все параметры с API
      apiData: {
        number: apiTank.number,
        fuel: apiTank.fuel,
        fuel_name: apiTank.fuel_name,
        state: apiTank.state,
        volume_begin: parseFloat(apiTank.volume_begin || '0'),
        volume_end: parseFloat(apiTank.volume_end || '0'),
        volume_max: parseFloat(apiTank.volume_max || '0'),
        volume_free: parseFloat(apiTank.volume_free || '0'),
        volume: parseFloat(apiTank.volume || '0'),
        amount_begin: parseFloat(apiTank.amount_begin || '0'),
        amount_end: parseFloat(apiTank.amount_end || '0'),
        level: parseFloat(apiTank.level || '0'),
        water: {
          volume: parseFloat(apiTank.water?.volume || '0'),
          amount: parseFloat(apiTank.water?.amount || '0'),
          level: parseFloat(apiTank.water?.level || '0')
        },
        temperature: parseFloat(apiTank.temperature || '0'),
        density: parseFloat(apiTank.density || '0'),
        release: {
          volume: parseFloat(apiTank.release?.volume || '0'),
          amount: parseFloat(apiTank.release?.amount || '0')
        },
        dt: apiTank.dt
      }
    };

    console.log('🔍 STS API: Преобразованный резервуар:', result);
    return result;
  }

  /**
   * Преобразует статус датчика из API в формат приложения
   */
  private mapSensorStatus(apiStatus: any): string {
    if (typeof apiStatus === 'boolean') {
      return apiStatus ? 'ok' : 'error';
    }
    
    const status = String(apiStatus).toLowerCase();
    if (status === 'ok' || status === 'online' || status === 'active' || status === 'working') {
      return 'ok';
    }
    
    return 'error';
  }

  /**
   * Проверяет, настроен ли и включен ли API СТС
   */
  isConfigured(): boolean {
    return !!(this.config?.enabled && this.config?.url && this.config?.username && this.config?.password);
  }

  /**
   * Получает текущую конфигурацию
   */
  getConfig(): STSApiConfig | null {
    return this.config;
  }

  /**
   * Принудительно обновить токен
   */
  async forceRefreshToken(): Promise<boolean> {
    console.log('🔍 STS API: Принудительное обновление токена...');
    this.loadConfig(); // Перезагружаем конфигурацию
    
    if (this.config) {
      // Очищаем старый токен
      this.config.token = undefined;
      this.config.tokenExpiry = undefined;
      localStorage.setItem('sts-api-config', JSON.stringify(this.config));
    }
    
    return this.refreshTokenIfNeeded(true);
  }

  // ===========================================
  // МЕТОДЫ ДЛЯ ДРУГИХ РАЗДЕЛОВ
  // ===========================================

  /**
   * Получить список ТРК (топливораздаточных колонок)
   */
  async getPumps(contextParams?: {networkId?: string; tradingPointId?: string}): Promise<Pump[]> {
    console.log('🔍 STS API: Загружаем ТРК...');
    
    try {
      const data = await this.apiRequest<any>('/v1/pumps', {}, contextParams);
      console.log('🔍 STS API: Получены данные ТРК:', data);
      
      if (Array.isArray(data)) {
        return data.map(this.mapApiPumpToPump);
      } else if (data && typeof data === 'object' && data.pumps) {
        return data.pumps.map(this.mapApiPumpToPump);
      }
      
      console.warn('🔍 STS API: Неожиданный формат данных ТРК');
      return [];
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения ТРК:', error);
      throw error;
    }
  }

  /**
   * Получить список продаж
   */
  async getSales(contextParams?: {networkId?: string; tradingPointId?: string}, dateFrom?: string, dateTo?: string): Promise<Sale[]> {
    console.log('🔍 STS API: Загружаем продажи...');
    
    try {
      const endpoint = '/v1/sales';
      const data = await this.apiRequest<any>(endpoint, {}, contextParams);
      console.log('🔍 STS API: Получены данные продаж:', data);
      
      if (Array.isArray(data)) {
        return data.map(this.mapApiSaleToSale);
      } else if (data && typeof data === 'object' && data.sales) {
        return data.sales.map(this.mapApiSaleToSale);
      }
      
      console.warn('🔍 STS API: Неожиданный формат данных продаж');
      return [];
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения продаж:', error);
      throw error;
    }
  }

  /**
   * Получить информацию о статусах АЗС и терминального оборудования
   */
  async getTerminalInfo(contextParams?: {networkId?: string; tradingPointId?: string}): Promise<TerminalInfo> {
    console.log('🔍 STS API: Загружаем информацию о терминале...');
    
    if (!contextParams?.tradingPointId) {
      throw new Error('Для получения информации о терминале требуется номер торговой точки');
    }
    
    try {
      const endpoint = `/v2/info`;
      console.log('🔍 STS API: Запрашиваем информацию о терминале по endpoint:', endpoint);
      
      const data = await this.apiRequest<any>(endpoint, {}, contextParams);
      console.log('🔍 STS API: Получена информация о терминале:', data);
      
      return this.mapApiTerminalInfo(data);
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения информации о терминале:', error);
      // Возвращаем заглушку при ошибке
      return this.createMockTerminalInfo();
    }
  }

  /**
   * Преобразует данные о терминале из API в формат приложения
   */
  private mapApiTerminalInfo(apiData: any): TerminalInfo {
    // API возвращает массив, берем первый элемент
    const data = Array.isArray(apiData) ? apiData[0] : apiData;
    
    // Извлекаем информацию о POS терминале
    const posData = data?.pos?.[0] || {};
    const shiftData = data?.shift || posData?.shift || {};
    const devices = posData?.devices || [];
    
    // Находим устройства по имени
    const fiscalDevice = devices.find(d => d.name === 'Фискальный регистратор');
    const billAcceptor = devices.find(d => d.name === 'Купюроприемник');
    const cardReader = devices.find(d => d.name === 'Картридер');
    const mpsReader = devices.find(d => d.name === 'МПС-ридер');
    
    // Определяем статус устройства
    const getDeviceStatus = (device: any) => {
      // Проверяем различные возможные варианты статуса в API
      const stateParam = device?.params?.find(p => p.name === 'Состояние');
      const directValue = device?.value;
      const directStatus = device?.status;
      
      // Извлекаем значение статуса из разных источников
      const statusValue = stateParam?.value || directValue || directStatus;
      
      console.log('🔍 Анализ статуса устройства:', {
        deviceName: device?.name,
        stateParam: stateParam,
        directValue: directValue,
        directStatus: directStatus,
        finalStatusValue: statusValue
      });
      
      // Проверяем различные варианты положительного статуса
      if (statusValue === 'OK' || statusValue === 'ok' || 
          statusValue === 'online' || statusValue === 'active' ||
          statusValue === 'ready' || statusValue === 'working' ||
          statusValue === 'normal' || statusValue === 1 || statusValue === '1') {
        return 'online';
      }
      
      return 'error';
    };
    
    return {
      terminal: {
        id: `${data?.system || 0}-${data?.station || 0}`,
        name: `АЗС ${data?.station || 0}`,
        version: '2.1.4',
        status: posData?.dt_info ? 'online' : 'offline',
        uptime: posData?.uptime ? new Date(posData.uptime).getTime() : 0,
        lastHeartbeat: posData?.dt_info || new Date().toISOString(),
        cpu: {
          usage: 25, // Заглушка, так как в API нет этих данных
          temperature: 42
        },
        memory: {
          total: 8192,
          used: 3456,
          free: 4736
        },
        disk: {
          total: 250000,
          used: 125000, 
          free: 125000
        },
        network: {
          ip: '192.168.1.100',
          connected: true,
          speed: 1000
        }
      },
      pumps: [], // ТРК отображаются отдельно через getTanks
      tanks: [], // Резервуары отображаются отдельно через getTanks
      pos: {
        status: posData?.number ? 'online' : 'offline',
        version: `POS ${posData?.number || 1}`,
        lastTransaction: posData?.dt_info ? new Date(posData.dt_info).toLocaleTimeString('ru-RU') : '',
        cashierConnected: shiftData?.state === 'Открытая'
      },
      fiscal: {
        status: getDeviceStatus(fiscalDevice) === 'online' ? 'ready' : 'error',
        model: fiscalDevice ? 'Фискальный регистратор' : 'Unknown',
        serialNumber: `ID: ${fiscalDevice?.id || 0}`,
        documentNumber: shiftData?.number || 0
      },
      // Добавляем информацию о смене
      shift: {
        number: shiftData?.number || 0,
        state: shiftData?.state || 'Неизвестно',
        openedAt: shiftData?.dt_open || posData?.shift?.dt_open
      },
      // Добавляем информацию об устройствах
      devices: {
        billAcceptor: {
          status: getDeviceStatus(billAcceptor),
          name: billAcceptor?.name || 'Купюроприемник',
          // Извлекаем новые параметры для купюроприемника из V2 API
          billCount: billAcceptor?.params?.find(p => p.name === 'Количество купюр')?.value ? 
            parseInt(billAcceptor.params.find(p => p.name === 'Количество купюр').value) : undefined,
          billAmount: billAcceptor?.params?.find(p => p.name === 'Сумма купюр')?.value ?
            parseFloat(billAcceptor.params.find(p => p.name === 'Сумма купюр').value) : undefined
        },
        cardReader: {
          status: getDeviceStatus(cardReader),
          name: cardReader?.name || 'Картридер'
        },
        mpsReader: {
          status: getDeviceStatus(mpsReader),
          name: mpsReader?.name || 'МПС-ридер'
        }
      }
    };
  }

  /**
   * Создает заглушку информации о терминале
   */
  private createMockTerminalInfo(): TerminalInfo {
    return {
      terminal: {
        id: 'demo-terminal',
        name: 'Демо терминал',
        version: '2.1.4',
        status: 'online',
        uptime: 156789,
        lastHeartbeat: new Date().toISOString(),
        cpu: { usage: 25, temperature: 42 },
        memory: { total: 8192, used: 3456, free: 4736 },
        disk: { total: 250000, used: 125000, free: 125000 },
        network: { ip: '192.168.1.100', connected: true, speed: 1000 }
      },
      pumps: [
        { id: 1, name: 'ТРК-01', status: 'active', fuelType: 'АИ-92', nozzles: [{ id: 1, status: 'ready' }, { id: 2, status: 'ready' }] },
        { id: 2, name: 'ТРК-02', status: 'active', fuelType: 'АИ-95', nozzles: [{ id: 3, status: 'ready' }, { id: 4, status: 'maintenance' }] }
      ],
      tanks: [
        { id: 1, name: 'Резервуар №1', fuelType: 'АИ-92', level: 15000, capacity: 25000, temperature: 18, status: 'normal' },
        { id: 2, name: 'Резервуар №2', fuelType: 'АИ-95', level: 8500, capacity: 25000, temperature: 17, status: 'low' }
      ],
      pos: { status: 'online', version: '3.2.1', lastTransaction: new Date().toISOString(), cashierConnected: true },
      fiscal: { status: 'ready', model: 'АТОЛ 91Ф', serialNumber: 'FP123456789', documentNumber: 45123 }
    };
  }

  /**
   * Получить текущие цены на дату для конкретной торговой точки
   */
  async getPrices(contextParams?: {networkId?: string; tradingPointId?: string}): Promise<Price[]> {
    console.log('🔍 STS API: Загружаем цены...');
    
    if (!contextParams?.tradingPointId) {
      throw new Error('Для получения цен требуется номер торговой точки (station)');
    }
    
    try {
      // Используем правильный endpoint: /v1/pos/prices/{station_number}
      const endpoint = `/v1/pos/prices/${contextParams.tradingPointId}`;
      console.log('🔍 STS API: Запрашиваем цены по endpoint:', endpoint);
      
      const data = await this.apiRequest<any>(endpoint, {}, contextParams);
      console.log('🔍 STS API: Получены данные цен:', data);
      
      if (Array.isArray(data)) {
        return data.map(this.mapApiPriceToPrice);
      } else if (data && typeof data === 'object' && data.prices) {
        return data.prices.map(this.mapApiPriceToPrice);
      }
      
      console.warn('🔍 STS API: Неожиданный формат данных цен');
      return [];
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения цен:', error);
      throw error;
    }
  }

  /**
   * Получить список транзакций
   */
  async getTransactions(dateFrom?: string, dateTo?: string, limit?: number, contextParams?: {networkId?: string; tradingPointId?: string}): Promise<Transaction[]> {
    console.log('🔍 STS API: Загружаем транзакции...');
    
    try {
      const url = new URL('/v1/transactions', this.config?.url || '');
      
      // Добавляем дополнительные параметры фильтрации если они заданы
      if (dateFrom) {
        url.searchParams.set('date_from', dateFrom);
        console.log(`🔍 STS API: Добавлен параметр date_from = ${dateFrom}`);
      }
      if (dateTo) {
        url.searchParams.set('date_to', dateTo);
        console.log(`🔍 STS API: Добавлен параметр date_to = ${dateTo}`);
      }
      if (limit && limit > 0) {
        url.searchParams.set('limit', limit.toString());
        console.log(`🔍 STS API: Добавлен параметр limit = ${limit}`);
      }

      const endpoint = url.pathname + url.search;
      console.log('🔍 STS API: Конечная точка для транзакций:', endpoint);
      
      const data = await this.apiRequest<any>(endpoint, {}, contextParams);
      console.log('🔍 STS API: Получены данные транзакций:', data);
      
      if (Array.isArray(data)) {
        const mappedTransactions = data.map(tx => this.mapApiTransactionToTransaction(tx));
        console.log('🔍 STS API: Обработано транзакций:', mappedTransactions.length);
        return mappedTransactions;
      } else if (data && typeof data === 'object' && data.transactions) {
        const mappedTransactions = data.transactions.map(tx => this.mapApiTransactionToTransaction(tx));
        console.log('🔍 STS API: Обработано транзакций из объекта:', mappedTransactions.length);
        return mappedTransactions;
      }
      
      console.warn('🔍 STS API: Неожиданный формат данных транзакций:', data);
      return [];
    } catch (error) {
      console.error('🔍 STS API: Ошибка получения транзакций:', error);
      throw error;
    }
  }

  /**
   * Обновить цену топлива
   */
  async updatePrice(fuelType: string, price: number): Promise<boolean> {
    console.log(`🔍 STS API: Обновляем цену ${fuelType} на ${price}...`);
    
    try {
      const data = await this.apiRequest<any>('/v1/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuelType, price })
      });
      
      console.log('🔍 STS API: Цена обновлена:', data);
      return true;
    } catch (error) {
      console.error('🔍 STS API: Ошибка обновления цены:', error);
      throw error;
    }
  }

  // ===========================================
  // MAPPER ФУНКЦИИ ДЛЯ ПРЕОБРАЗОВАНИЯ ДАННЫХ
  // ===========================================

  private mapApiPumpToPump(apiPump: any): Pump {
    return {
      id: parseInt(apiPump.id || apiPump.pumpId || Math.random() * 1000),
      name: apiPump.name || apiPump.pumpName || `ТРК-${apiPump.id}`,
      status: this.mapSensorStatus(apiPump.status || apiPump.online),
      fuelType: apiPump.fuelType || apiPump.fuel_type || 'Неизвестно',
      currentPrice: parseFloat(apiPump.currentPrice || apiPump.price || '0'),
      totalSales: parseFloat(apiPump.totalSales || apiPump.total_sales || '0'),
      dailySales: parseFloat(apiPump.dailySales || apiPump.daily_sales || '0'),
      lastTransaction: apiPump.lastTransaction || apiPump.last_transaction || new Date().toISOString(),
      nozzles: Array.isArray(apiPump.nozzles) ? apiPump.nozzles.map((n: any, i: number) => ({
        id: n.id || i + 1,
        name: n.name || `Пистолет ${i + 1}`,
        status: this.mapSensorStatus(n.status || n.online)
      })) : []
    };
  }

  private mapApiSaleToSale(apiSale: any): Sale {
    return {
      id: parseInt(apiSale.id || apiSale.saleId || Math.random() * 1000),
      date: apiSale.date || apiSale.timestamp || new Date().toISOString(),
      pumpId: parseInt(apiSale.pumpId || apiSale.pump_id || '0'),
      pumpName: apiSale.pumpName || apiSale.pump_name || `ТРК-${apiSale.pumpId}`,
      fuelType: apiSale.fuelType || apiSale.fuel_type || 'Неизвестно',
      volume: parseFloat(apiSale.volume || apiSale.liters || '0'),
      price: parseFloat(apiSale.price || apiSale.pricePerLiter || '0'),
      total: parseFloat(apiSale.total || apiSale.amount || '0'),
      cardNumber: apiSale.cardNumber || apiSale.card_number,
      receiptNumber: apiSale.receiptNumber || apiSale.receipt_number || `${Date.now()}`
    };
  }

  private mapApiPriceToPrice(apiPrice: any): Price {
    console.log('🔍 Маппинг цены API -> Price:', apiPrice);
    
    // Словарь для маппинга кодов/номеров топлива в читаемые названия
    // Основано на правильном маппинге service_code -> service_name
    const fuelTypeMap: Record<string, string> = {
      // Правильные service_code из API
      '1': 'АИ-100',
      '2': 'АИ-92',
      '3': 'АИ-95',
      '4': 'АИ-98',
      '5': 'ДТ',
      '6': 'ДТ зим.',
      '7': 'СУГ',
      // Дополнительные варианты для совместимости
      'AI92': 'АИ-92',
      'AI95': 'АИ-95',
      'AI98': 'АИ-98',
      'AI100': 'АИ-100',
      'DT': 'ДТ',
      'SUG': 'СУГ',
      'diesel': 'ДТ',
      'petrol': 'АИ-95',
      'gas': 'СУГ',
      'lpg': 'СУГ'
    };
    
    // Пытаемся найти вид топлива в различных возможных полях
    let rawFuelType = apiPrice.service_name ||      // прямое название сервиса
                     apiPrice.service_code ||       // код сервиса для маппинга  
                     apiPrice.fuelType || 
                     apiPrice.fuel_type || 
                     apiPrice.type || 
                     apiPrice.fuel || 
                     apiPrice.name ||
                     apiPrice.product ||
                     apiPrice.fuel_name ||
                     apiPrice.fuel_id ||
                     apiPrice.id;
    
    // Преобразуем к строке для маппинга
    rawFuelType = String(rawFuelType || '').trim();
    
    // Пытаемся найти в словаре маппинга или используем как есть
    const fuelType = fuelTypeMap[rawFuelType] || 
                    fuelTypeMap[rawFuelType.toLowerCase()] || 
                    fuelTypeMap[rawFuelType.toUpperCase()] || 
                    (rawFuelType !== '' && rawFuelType !== 'undefined' ? rawFuelType : 'Неизвестно');
    
    console.log('🔍 Определили вид топлива:', fuelType, 'из исходных данных:', {
      rawFuelType: rawFuelType,
      service_name: apiPrice.service_name,      // НОВОЕ: прямое название
      service_code: apiPrice.service_code,      // НОВОЕ: код для маппинга
      fuelType: apiPrice.fuelType,
      fuel_type: apiPrice.fuel_type,
      type: apiPrice.type,
      fuel: apiPrice.fuel,
      name: apiPrice.name,
      product: apiPrice.product,
      fuel_name: apiPrice.fuel_name,
      fuel_id: apiPrice.fuel_id,
      id: apiPrice.id
    });
                    
    const mapped = {
      id: parseInt(apiPrice.id || Math.random() * 1000),
      fuelType: fuelType,
      price: parseFloat(apiPrice.price || apiPrice.amount || '0'),
      effectiveDate: apiPrice.effectiveDate || apiPrice.effective_date || new Date().toISOString(),
      createdBy: apiPrice.createdBy || apiPrice.created_by || 'Система',
      status: apiPrice.status || 'active'
    };
    
    console.log('🔍 Результат маппинга:', mapped);
    return mapped;
  }

  private mapApiTransactionToTransaction(apiTransaction: any): Transaction {
    console.log('🔍 STS API: Преобразуем транзакцию:', apiTransaction);
    
    // ID транзакции
    const id = parseInt(apiTransaction.id || apiTransaction.transaction_id || Math.floor(Math.random() * 1000000));
    const transactionId = apiTransaction.transaction_id || apiTransaction.id?.toString() || `TR-${id}`;
    
    // Дата и время из реальной структуры STS API
    const startTime = apiTransaction.dt || apiTransaction.start_time || apiTransaction.timestamp || new Date().toISOString();
    const endTime = apiTransaction.end_time || apiTransaction.completed_at || null;
    const date = startTime;
    
    // Информация о ТРК и топливе из реальной структуры
    const pumpId = apiTransaction.pos ? parseInt(apiTransaction.pos) : undefined;
    const pumpName = pumpId ? `ТРК-${pumpId}` : undefined;
    const fuelType = apiTransaction.fuel_name || apiTransaction.fuel_type || 'Неизвестно';
    
    // Объемы и стоимость из реальной структуры
    const volume = parseFloat(apiTransaction.quantity || '0');
    const price = parseFloat(apiTransaction.price || '0'); 
    const total = parseFloat(apiTransaction.cost || '0');
    
    // Дополнительные данные из реальной структуры
    const cardNumber = apiTransaction.card || apiTransaction.card_number || apiTransaction.cardNumber;
    const receiptNumber = apiTransaction.receipt_number || apiTransaction.receiptNumber || `R-${id}`;
    
    // Статус и тип операции
    const status = this.mapTransactionStatus(apiTransaction.status || apiTransaction.state || 'completed');
    const operationType = this.mapOperationType(apiTransaction.operation_type || apiTransaction.type || 'sale');
    
    // Способ оплаты из реальной структуры (pay_type.name)
    const paymentMethod = this.mapPaymentMethod(
      apiTransaction.pay_type?.name || 
      apiTransaction.payment_method || 
      apiTransaction.payment_type
    );
    
    // Локация
    const networkId = apiTransaction.network_id || apiTransaction.system_id;
    const tradingPointId = apiTransaction.station_id || apiTransaction.trading_point_id;
    
    // Оператор
    const operatorName = apiTransaction.operator_name || apiTransaction.operator || apiTransaction.cashier;
    
    // Длительность (в минутах)
    let duration: number | undefined;
    if (endTime && startTime) {
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      duration = (endMs - startMs) / (1000 * 60); // в минутах
    } else if (apiTransaction.duration) {
      duration = parseFloat(apiTransaction.duration);
    }

    const result: Transaction = {
      id,
      transactionId,
      date,
      startTime,
      endTime: endTime || undefined,
      pumpId,
      pumpName,
      fuelType,
      volume,
      price,
      total,
      cardNumber,
      receiptNumber,
      status,
      operationType,
      paymentMethod,
      networkId: networkId?.toString(),
      tradingPointId: tradingPointId?.toString(),
      operatorName,
      duration,
      // Сохраняем все исходные данные от API
      apiData: apiTransaction
    };

    console.log('🔍 STS API: Преобразованная транзакция:', result);
    return result;
  }

  /**
   * Преобразует статус транзакции из API в формат приложения
   */
  private mapTransactionStatus(apiStatus: any): string {
    if (!apiStatus) return 'pending';
    
    const status = String(apiStatus).toLowerCase();
    switch (status) {
      case 'completed':
      case 'success':
      case 'finished':
      case 'done':
        return 'completed';
      case 'in_progress':
      case 'processing':
      case 'active':
      case 'running':
        return 'in_progress';
      case 'failed':
      case 'error':
      case 'cancelled':
      case 'aborted':
        return 'failed';
      case 'pending':
      case 'waiting':
      case 'queued':
        return 'pending';
      default:
        return 'pending';
    }
  }

  /**
   * Преобразует тип операции из API в формат приложения
   */
  private mapOperationType(apiType: any): string {
    if (!apiType) return 'sale';
    
    const type = String(apiType).toLowerCase();
    switch (type) {
      case 'sale':
      case 'fuel_sale':
      case 'transaction':
        return 'sale';
      case 'refund':
      case 'return':
        return 'refund';
      case 'correction':
      case 'adjustment':
        return 'correction';
      case 'maintenance':
      case 'service':
        return 'maintenance';
      case 'tank_loading':
      case 'delivery':
        return 'tank_loading';
      case 'diagnostics':
      case 'test':
        return 'diagnostics';
      case 'calibration':
        return 'sensor_calibration';
      default:
        return 'sale';
    }
  }

  /**
   * Преобразует статус терминала из API
   */
  private mapTerminalStatus(status: any): 'online' | 'offline' | 'maintenance' {
    if (!status) return 'offline';
    const s = String(status).toLowerCase();
    if (s.includes('online') || s.includes('active') || s === '1') return 'online';
    if (s.includes('maintenance') || s.includes('service')) return 'maintenance';
    return 'offline';
  }

  /**
   * Преобразует статус POS из API
   */
  private mapPosStatus(status: any): 'online' | 'offline' | 'error' {
    if (!status) return 'offline';
    const s = String(status).toLowerCase();
    if (s.includes('online') || s.includes('active') || s === '1') return 'online';
    if (s.includes('error') || s.includes('fault')) return 'error';
    return 'offline';
  }

  /**
   * Преобразует статус фискального регистратора из API
   */
  private mapFiscalStatus(status: any): 'ready' | 'error' | 'maintenance' {
    if (!status) return 'error';
    const s = String(status).toLowerCase();
    if (s.includes('ready') || s.includes('ok') || s === '1') return 'ready';
    if (s.includes('maintenance') || s.includes('service')) return 'maintenance';
    return 'error';
  }

  /**
   * Преобразует информацию о ТРК из API для терминала
   */
  private mapApiPumpInfo = (apiPump: any) => {
    return {
      id: parseInt(apiPump.id || apiPump.number || 0),
      name: apiPump.name || `ТРК-${String(apiPump.id || apiPump.number || '00').padStart(2, '0')}`,
      status: this.mapPumpStatus(apiPump.status),
      fuelType: apiPump.fuelType || apiPump.fuel_name || 'Неизвестно',
      nozzles: Array.isArray(apiPump.nozzles) ? apiPump.nozzles.map((nozzle: any) => ({
        id: parseInt(nozzle.id || nozzle.number || 0),
        status: this.mapNozzleStatus(nozzle.status)
      })) : []
    };
  };

  /**
   * Преобразует информацию о резервуаре из API для терминала
   */
  private mapApiTankInfo = (apiTank: any) => {
    return {
      id: parseInt(apiTank.id || apiTank.number || 0),
      name: apiTank.name || `Резервуар №${apiTank.id || apiTank.number || '?'}`,
      fuelType: apiTank.fuelType || apiTank.fuel_name || 'Неизвестно',
      level: parseFloat(apiTank.level || apiTank.volume || 0),
      capacity: parseFloat(apiTank.capacity || apiTank.volume_max || 50000),
      temperature: parseFloat(apiTank.temperature || 15),
      status: this.mapTankStatus(apiTank.status, parseFloat(apiTank.level || 0), parseFloat(apiTank.capacity || 50000))
    };
  };

  /**
   * Преобразует статус ТРК из API
   */
  private mapPumpStatus(status: any): 'active' | 'offline' | 'error' | 'maintenance' {
    if (!status) return 'offline';
    const s = String(status).toLowerCase();
    if (s.includes('active') || s.includes('online') || s === '1') return 'active';
    if (s.includes('error') || s.includes('fault') || s.includes('alarm')) return 'error';
    if (s.includes('maintenance') || s.includes('service')) return 'maintenance';
    return 'offline';
  }

  /**
   * Преобразует статус пистолета из API
   */
  private mapNozzleStatus(status: any): 'ready' | 'dispensing' | 'error' | 'maintenance' {
    if (!status) return 'ready';
    const s = String(status).toLowerCase();
    if (s.includes('dispensing') || s.includes('fueling')) return 'dispensing';
    if (s.includes('error') || s.includes('fault')) return 'error';
    if (s.includes('maintenance') || s.includes('service')) return 'maintenance';
    return 'ready';
  }

  /**
   * Преобразует статус резервуара из API
   */
  private mapTankStatus(status: any, level: number, capacity: number): 'normal' | 'low' | 'critical' | 'error' {
    if (status && String(status).toLowerCase().includes('error')) return 'error';
    
    const percentage = capacity > 0 ? (level / capacity) * 100 : 0;
    if (percentage < 10) return 'critical';
    if (percentage < 20) return 'low';
    return 'normal';
  }

  /**
   * Преобразует способ оплаты из API в формат приложения
   */
  private mapPaymentMethod(apiMethod: any): string | undefined {
    if (!apiMethod) return undefined;
    
    const method = String(apiMethod).toLowerCase();
    switch (method) {
      case 'cash':
      case 'наличные':
        return 'cash';
      case 'card':
      case 'bank_card':
      case 'credit_card':
      case 'debit_card':
      case 'карта':
      case 'сбербанк':  // Добавляем Сбербанк из реальных данных
        return 'bank_card';
      case 'fuel_card':
      case 'топливная_карта':
      case 'fleet_card':
        return 'fuel_card';
      case 'online':
      case 'online_order':
      case 'digital':
      case 'мобил.п':      // Добавляем "Мобил.П" из реальных данных STS API
      case 'мобильная':
      case 'мобильная оплата':
      case 'mobile':
      case 'mobile_payment':
        return 'online_order';
      default:
        return 'cash'; // по умолчанию наличные
    }
  }
}

// Экспортируем типы
export type { Transaction, Tank, Pump, Sale, Price, TerminalInfo };

// Экспортируем единственный экземпляр сервиса
export const stsApiService = new STSApiService();
export default stsApiService;

