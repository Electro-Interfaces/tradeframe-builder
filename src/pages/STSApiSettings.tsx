import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  Save,
  RotateCcw,
  AlertTriangle,
  Globe,
  Key,
  User,
  ChevronDown,
  ChevronRight,
  Play,
  Code,
  Tag,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useForm } from 'react-hook-form';

interface STSApiConfig {
  url: string;
  username: string;
  password: string;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
  token?: string;
  tokenExpiry?: number;
  refreshInterval: number; // в минутах
  networkId?: string;
  tradingPointId?: string;
}

const defaultConfig: STSApiConfig = {
  url: 'https://pos.autooplata.ru/tms',
  username: 'UserApi',
  password: 'lHQfLZHzB3tn',
  enabled: true,
  timeout: 30000,
  retryAttempts: 3,
  refreshInterval: 30 // 30 минут по умолчанию
};

export default function STSApiSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<STSApiConfig>(defaultConfig);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; error?: string; responseTime?: number } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [apiMethods, setApiMethods] = useState<any[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [testingMethod, setTestingMethod] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<STSApiConfig>({
    defaultValues: config
  });

  const watchedValues = watch();

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Проверяем изменения в форме
    const hasChanges = JSON.stringify(watchedValues) !== JSON.stringify(config);
    setHasChanges(hasChanges);
  }, [watchedValues, config]);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem('sts-api-config');
      if (savedConfig) {
        const parsedConfig = { ...defaultConfig, ...JSON.parse(savedConfig) };
        setConfig(parsedConfig);
        reset(parsedConfig);
        // Запускаем автообновление токена если настройки включены
        if (parsedConfig.enabled) {
          startTokenRefresh(parsedConfig);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигурации СТС API:', error);
    }
  };

  const refreshToken = async (apiConfig: STSApiConfig): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), apiConfig.timeout);

      const loginResponse = await fetch(`${apiConfig.url}/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: apiConfig.username,
          password: apiConfig.password
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (loginResponse.ok) {
        const token = await loginResponse.text();
        
        const updatedConfig = {
          ...apiConfig,
          token: token.replace(/"/g, ''),
          tokenExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
        };
        
        localStorage.setItem('sts-api-config', JSON.stringify(updatedConfig));
        setConfig(updatedConfig);
        
        console.log('JWT токен обновлен автоматически');
        return true;
      } else {
        console.error('Ошибка автообновления токена:', loginResponse.status);
        return false;
      }
    } catch (error) {
      console.error('Ошибка автообновления токена:', error);
      return false;
    }
  };

  const startTokenRefresh = (apiConfig: STSApiConfig) => {
    // Останавливаем предыдущий таймер если есть
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    if (!apiConfig.enabled) return;

    // Обновляем токен сразу при запуске если его нет или он истек
    if (!apiConfig.token || (apiConfig.tokenExpiry && apiConfig.tokenExpiry < Date.now())) {
      refreshToken(apiConfig);
    }

    // Устанавливаем интервал автообновления
    const interval = setInterval(() => {
      if (apiConfig.enabled) {
        refreshToken(apiConfig);
      }
    }, apiConfig.refreshInterval * 60 * 1000); // конвертируем минуты в миллисекунды

    setRefreshTimer(interval);
  };

  const stopTokenRefresh = () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      setRefreshTimer(null);
    }
  };

  // Загружаем методы API при изменении конфигурации
  useEffect(() => {
    if (config.url && config.enabled) {
      loadApiMethods();
    }
  }, [config.url, config.enabled]);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      stopTokenRefresh();
    };
  }, []);

  const loadApiMethods = async () => {
    setIsLoadingMethods(true);
    // Очищаем предыдущие результаты тестирования
    setTestResults({});
    
    try {
      const response = await fetch(`${config.url}/openapi.json`);
      if (response.ok) {
        const openApiSpec = await response.json();
        const methods = parseOpenApiMethods(openApiSpec);
        setApiMethods(methods);
        
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки методов API:', error);
      
      toast({
        title: "Ошибка загрузки методов API",
        description: error.message,
        variant: "destructive"
      });
      
      setApiMethods([]);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const parseOpenApiMethods = (spec: any): any[] => {
    const methods: any[] = [];
    
    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathData]: [string, any]) => {
        Object.entries(pathData).forEach(([method, methodData]: [string, any]) => {
          if (method !== 'parameters') {
            methods.push({
              id: `${method.toUpperCase()}_${path}`,
              method: method.toUpperCase(),
              path: path,
              summary: methodData.summary || '',
              description: methodData.description || '',
              tags: methodData.tags || [],
              parameters: methodData.parameters || [],
              responses: methodData.responses || {},
              security: methodData.security || [],
              operationId: methodData.operationId,
              requestBody: methodData.requestBody || null
            });
          }
        });
      });
    }
    
    return methods.sort((a, b) => a.path.localeCompare(b.path));
  };

  const buildRequestBody = (method: any, config: STSApiConfig): any => {
    const body: any = {};
    
    // Анализируем requestBody из OpenAPI схемы
    if (method.requestBody?.content?.['application/json']?.schema) {
      const schema = method.requestBody.content['application/json'].schema;
      
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
          // Подставляем значения на основе имени поля и наших параметров
          const value = getFieldValue(fieldName, fieldSchema, config);
          if (value !== undefined) {
            body[fieldName] = value;
          }
        });
        
        // Обязательно добавляем все required поля, даже если не смогли определить значение
        if (schema.required && Array.isArray(schema.required)) {
          schema.required.forEach((requiredField: string) => {
            if (body[requiredField] === undefined) {
              const fieldSchema = schema.properties[requiredField];
              body[requiredField] = getDefaultValueForType(fieldSchema, requiredField, config);
            }
          });
        }
      }
    }
    
    // Если схема не найдена, создаем базовые поля на основе имени метода и пути
    if (Object.keys(body).length === 0) {
      body = generateDefaultRequestBody(method, config);
    }
    
    console.log('Построили тело запроса для', method.path, ':', {
      body: body,
      requiredFields: method.requestBody?.content?.['application/json']?.schema?.required || [],
      allFields: Object.keys(method.requestBody?.content?.['application/json']?.schema?.properties || {})
    });
    return body;
  };

  const getFieldValue = (fieldName: string, fieldSchema: any, config: STSApiConfig): any => {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Подстановка значений на основе имени поля
    if (lowerFieldName.includes('network') && lowerFieldName.includes('id')) {
      return config.networkId ? parseInt(config.networkId) : 1;
    }
    
    if (lowerFieldName.includes('trading') && lowerFieldName.includes('point')) {
      return config.tradingPointId ? parseInt(config.tradingPointId) : 101;
    }
    
    if (lowerFieldName.includes('station') && lowerFieldName.includes('id')) {
      return config.tradingPointId ? parseInt(config.tradingPointId) : 101;
    }
    
    if (lowerFieldName.includes('point') && lowerFieldName.includes('id')) {
      return config.tradingPointId ? parseInt(config.tradingPointId) : 101;
    }
    
    // Подстановка на основе типа поля
    if (fieldSchema.type === 'string') {
      if (lowerFieldName.includes('name')) return 'Test Name';
      if (lowerFieldName.includes('description')) return 'Test Description';
      if (lowerFieldName.includes('comment')) return 'Test Comment';
      return 'test';
    }
    
    if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
      if (fieldSchema.minimum !== undefined) return fieldSchema.minimum;
      if (fieldSchema.default !== undefined) return fieldSchema.default;
      return 1;
    }
    
    if (fieldSchema.type === 'boolean') {
      return fieldSchema.default !== undefined ? fieldSchema.default : true;
    }
    
    if (fieldSchema.type === 'array') {
      return [];
    }
    
    if (fieldSchema.type === 'object') {
      return {};
    }
    
    return undefined;
  };

  const getDefaultValueForType = (fieldSchema: any, fieldName: string, config: STSApiConfig): any => {
    const lowerFieldName = fieldName.toLowerCase();
    
    // Специальные значения для конкретных полей
    if (lowerFieldName === 'system' || lowerFieldName === 'sys') {
      return config.networkId ? parseInt(config.networkId) : 1;
    }
    
    if (lowerFieldName === 'station' || lowerFieldName === 'point') {
      return config.tradingPointId ? parseInt(config.tradingPointId) : 1;
    }
    
    if (lowerFieldName === 'field') {
      return 'test_field';
    }
    
    if (lowerFieldName === 'query') {
      return 'test_query';
    }
    
    if (lowerFieldName === 'command' || lowerFieldName === 'cmd') {
      return 'status';
    }
    
    if (lowerFieldName === 'value') {
      return 'test_value';
    }
    
    if (lowerFieldName === 'data') {
      return { test: true };
    }
    
    // Значения по умолчанию на основе типа
    if (fieldSchema?.type === 'string') {
      if (fieldSchema.enum && fieldSchema.enum.length > 0) {
        return fieldSchema.enum[0]; // Берем первое значение из enum
      }
      return 'test_string';
    }
    
    if (fieldSchema?.type === 'integer' || fieldSchema?.type === 'number') {
      if (fieldSchema.minimum !== undefined) return fieldSchema.minimum;
      if (fieldSchema.default !== undefined) return fieldSchema.default;
      return 1;
    }
    
    if (fieldSchema?.type === 'boolean') {
      return fieldSchema.default !== undefined ? fieldSchema.default : true;
    }
    
    if (fieldSchema?.type === 'array') {
      return [];
    }
    
    if (fieldSchema?.type === 'object') {
      return {};
    }
    
    // Если тип неизвестен, пытаемся угадать по имени поля
    if (lowerFieldName.includes('id')) {
      return 1;
    }
    
    if (lowerFieldName.includes('count') || lowerFieldName.includes('number')) {
      return 1;
    }
    
    if (lowerFieldName.includes('name') || lowerFieldName.includes('title')) {
      return 'Test Name';
    }
    
    if (lowerFieldName.includes('description') || lowerFieldName.includes('comment')) {
      return 'Test Description';
    }
    
    // По умолчанию - строка
    return 'test_value';
  };

  const generateDefaultRequestBody = (method: any, config: STSApiConfig): any => {
    const body: any = {};
    const path = method.path.toLowerCase();
    
    // Базовые поля на основе пути API
    if (config.networkId) {
      if (path.includes('network')) {
        body.networkId = parseInt(config.networkId);
      }
    }
    
    if (config.tradingPointId) {
      if (path.includes('station') || path.includes('point') || path.includes('trading')) {
        body.tradingPointId = parseInt(config.tradingPointId);
        body.stationId = parseInt(config.tradingPointId);
      }
    }
    
    // Дополнительные поля в зависимости от типа операции
    if (method.method === 'POST') {
      if (path.includes('price')) {
        body.fuelType = 1;
        body.price = 50.00;
      }
      
      if (path.includes('sale') || path.includes('transaction')) {
        body.amount = 10.0;
        body.volume = 10.0;
        body.fuelType = 1;
      }
      
      if (path.includes('tank')) {
        body.tankNumber = 1;
        body.volume = 1000;
      }
    }
    
    return body;
  };

  const addRequiredQueryParams = (url: URL, method: any, config: STSApiConfig) => {
    // Проверяем параметры из схемы OpenAPI
    if (method.parameters && Array.isArray(method.parameters)) {
      method.parameters.forEach((param: any) => {
        if (param.in === 'query' && param.required && !url.searchParams.has(param.name)) {
          const value = getQueryParamValue(param.name, param.schema, config);
          if (value !== undefined) {
            url.searchParams.set(param.name, value.toString());
            console.log(`Добавили обязательный query параметр: ${param.name}=${value}`);
          }
        }
      });
    }
    
    // Добавляем стандартные параметры если их нет
    const path = method.path.toLowerCase();
    
    // Для endpoints связанных с точками, добавляем system и station если их нет
    if (path.includes('points') || path.includes('stations')) {
      if (config.networkId && !url.searchParams.has('system')) {
        url.searchParams.set('system', config.networkId);
        console.log('Добавили параметр system:', config.networkId);
      }
      
      if (config.tradingPointId && !url.searchParams.has('station')) {
        url.searchParams.set('station', config.tradingPointId);
        console.log('Добавили параметр station:', config.tradingPointId);
      }
    }
  };

  const getQueryParamValue = (paramName: string, paramSchema: any, config: STSApiConfig): any => {
    const lowerParamName = paramName.toLowerCase();
    
    // Специфичные параметры
    if (lowerParamName === 'system' || lowerParamName === 'sys') {
      return config.networkId ? parseInt(config.networkId) : 1;
    }
    
    if (lowerParamName === 'station' || lowerParamName === 'point') {
      return config.tradingPointId ? parseInt(config.tradingPointId) : 1;
    }
    
    if (lowerParamName === 'limit') {
      return 10;
    }
    
    if (lowerParamName === 'offset' || lowerParamName === 'skip') {
      return 0;
    }
    
    if (lowerParamName === 'page') {
      return 1;
    }
    
    // Значения на основе типа
    if (paramSchema?.type === 'integer' || paramSchema?.type === 'number') {
      if (paramSchema.default !== undefined) return paramSchema.default;
      if (paramSchema.minimum !== undefined) return paramSchema.minimum;
      return 1;
    }
    
    if (paramSchema?.type === 'string') {
      if (paramSchema.enum && paramSchema.enum.length > 0) {
        return paramSchema.enum[0];
      }
      if (paramSchema.default !== undefined) return paramSchema.default;
      return 'test';
    }
    
    if (paramSchema?.type === 'boolean') {
      return paramSchema.default !== undefined ? paramSchema.default : true;
    }
    
    return 'test';
  };

  const testApiMethod = async (method: any) => {
    if (!config.token) {
      toast({
        title: "Нет токена",
        description: "Сначала получите JWT токен через тест подключения",
        variant: "destructive"
      });
      return;
    }

    setTestingMethod(method.id);
    
    // Используем текущие значения из формы
    const currentValues = watchedValues;
    
    console.log('Тестирование метода:', method.path, 'с параметрами:', {
      networkId: currentValues.networkId,
      tradingPointId: currentValues.tradingPointId
    });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentValues.timeout);

      // Подставляем параметры в путь если они указаны
      let urlPath = method.path;
      console.log('Исходный путь:', urlPath);
      
      if (currentValues.networkId && urlPath.includes('{networkId}')) {
        urlPath = urlPath.replace('{networkId}', currentValues.networkId);
        console.log('Заменили {networkId} на:', currentValues.networkId);
      }
      if (currentValues.tradingPointId && urlPath.includes('{tradingPointId}')) {
        urlPath = urlPath.replace('{tradingPointId}', currentValues.tradingPointId);
        console.log('Заменили {tradingPointId} на:', currentValues.tradingPointId);
      }

      // Добавляем query параметры если они не в пути
      const url = new URL(`${currentValues.url}${urlPath}`);
      console.log('URL после подстановки пути:', url.toString());
      
      if (currentValues.networkId && !urlPath.includes(currentValues.networkId)) {
        // Проверяем, нужен ли параметр networkId для этого метода
        const needsNetworkId = method.parameters?.some((p: any) => p.name === 'networkId' || p.name === 'network_id');
        console.log('Нужен параметр networkId:', needsNetworkId, 'Параметры метода:', method.parameters?.map((p: any) => p.name));
        if (needsNetworkId) {
          url.searchParams.set('networkId', currentValues.networkId);
          console.log('Добавили networkId в query параметры');
        }
      }
      if (currentValues.tradingPointId && !urlPath.includes(currentValues.tradingPointId)) {
        // Проверяем, нужен ли параметр tradingPointId для этого метода  
        const needsTradingPointId = method.parameters?.some((p: any) => p.name === 'tradingPointId' || p.name === 'trading_point_id');
        console.log('Нужен параметр tradingPointId:', needsTradingPointId, 'Параметры метода:', method.parameters?.map((p: any) => p.name));
        if (needsTradingPointId) {
          url.searchParams.set('tradingPointId', currentValues.tradingPointId);
          console.log('Добавили tradingPointId в query параметры');
        }
      }
      
      console.log('Финальный URL:', url.toString());

      // Базовые заголовки
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.token}`,
      };

      // Подготавливаем тело запроса для POST/PUT методов
      let requestBody = undefined;
      if (method.method === 'POST' || method.method === 'PUT' || method.method === 'PATCH') {
        headers['Content-Type'] = 'application/json';
        const body = buildRequestBody(method, currentValues);
        requestBody = JSON.stringify(body);
        console.log('Отправляем тело запроса:', requestBody);
      }

      // Для GET запросов проверяем, нужны ли дополнительные query параметры
      if (method.method === 'GET') {
        addRequiredQueryParams(url, method, currentValues);
        console.log('GET запрос с параметрами:', url.toString());
      }

      const fetchOptions: RequestInit = {
        method: method.method,
        headers,
        signal: controller.signal,
      };

      if (requestBody) {
        fetchOptions.body = requestBody;
      }

      console.log('Параметры запроса:', {
        method: method.method,
        url: url.toString(),
        headers: headers,
        body: requestBody
      });

      const response = await fetch(url.toString(), fetchOptions);

      clearTimeout(timeoutId);
      
      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      
      try {
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
        }
      } catch (parseError) {
        responseData = 'Ошибка парсинга ответа';
        console.error('Ошибка парсинга ответа:', parseError);
      }

      // Показываем данные в тосте
      let description = `Status: ${response.status} ${response.statusText}`;
      
      if (response.status === 422) {
        // Специальная обработка для 422 ошибок
        if (responseData && typeof responseData === 'object' && responseData.message) {
          description += ` | ${responseData.message}`;
        } else if (responseData && typeof responseData === 'object' && responseData.errors) {
          const errors = Array.isArray(responseData.errors) 
            ? responseData.errors.join(', ')
            : JSON.stringify(responseData.errors);
          description += ` | ${errors}`;
        } else if (responseData) {
          description += ` | ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`;
        }
      } else if (responseData && typeof responseData === 'object') {
        const dataInfo = Array.isArray(responseData) 
          ? `${responseData.length} элементов`
          : `${Object.keys(responseData).length} полей`;
        description += ` | ${dataInfo}`;
      }

      toast({
        title: `${method.method} ${urlPath}`,
        description,
        variant: response.ok ? "default" : "destructive"
      });

      // Сохраняем результат теста
      const testResult = {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        usedNetworkId: currentValues.networkId,
        usedTradingPointId: currentValues.tradingPointId,
        data: responseData,
        timestamp: new Date().toISOString(),
        success: response.ok
      };

      setTestResults(prev => ({
        ...prev,
        [method.id]: testResult
      }));

      console.log(`API Test - ${method.method} ${urlPath}:`, testResult);

    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' 
        ? 'Превышен таймаут'
        : error.message || 'Неизвестная ошибка';
        
      console.error('Ошибка при выполнении запроса:', error);
      
      // Сохраняем результат с ошибкой
      const errorResult = {
        status: 0,
        statusText: 'Network Error',
        url: `${currentValues.url}${method.path}`,
        usedNetworkId: currentValues.networkId,
        usedTradingPointId: currentValues.tradingPointId,
        data: { error: errorMessage },
        timestamp: new Date().toISOString(),
        success: false
      };

      setTestResults(prev => ({
        ...prev,
        [method.id]: errorResult
      }));
      
      toast({
        title: `Ошибка - ${method.method} ${method.path}`,
        description: errorMessage,
        variant: "destructive"
      });

    } finally {
      setTestingMethod(null);
    }
  };

  const toggleMethodExpansion = (methodId: string) => {
    const newExpanded = new Set(expandedMethods);
    if (newExpanded.has(methodId)) {
      newExpanded.delete(methodId);
    } else {
      newExpanded.add(methodId);
    }
    setExpandedMethods(newExpanded);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400 dark:border-green-400/20';
      case 'POST': return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-400/20';
      case 'PUT': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:text-yellow-400 dark:border-yellow-400/20';
      case 'DELETE': return 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400 dark:border-red-400/20';
      case 'PATCH': return 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-400/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const saveConfig = (newConfig: STSApiConfig) => {
    try {
      localStorage.setItem('sts-api-config', JSON.stringify(newConfig));
      const oldUrl = config.url;
      setConfig(newConfig);
      setHasChanges(false);
      
      // Перезапускаем автообновление с новыми настройками
      if (newConfig.enabled) {
        startTokenRefresh(newConfig);
        
        // Если URL изменился, обновляем методы API
        if (oldUrl !== newConfig.url) {
          setTimeout(() => loadApiMethods(), 500); // Небольшая задержка для обновления состояния
        }
      } else {
        stopTokenRefresh();
      }
      
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация СТС API успешно обновлена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    const currentValues = watchedValues;
    
    try {
      const startTime = Date.now();
      
      // Пытаемся получить JWT токен через /v1/login
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), currentValues.timeout);

      const loginResponse = await fetch(`${currentValues.url}/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentValues.username,
          password: currentValues.password
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (loginResponse.ok) {
        const token = await loginResponse.text();
        
        // Сохраняем токен и время получения
        const newConfig = {
          ...currentValues,
          token: token.replace(/"/g, ''), // Убираем кавычки если есть
          tokenExpiry: Date.now() + (24 * 60 * 60 * 1000) // 24 часа
        };
        setConfig(newConfig);
        localStorage.setItem('sts-api-config', JSON.stringify(newConfig));
        
        setTestResult({ 
          success: true, 
          responseTime 
        });
        
        toast({
          title: "Подключение успешно",
          description: `JWT токен получен. Время ответа: ${responseTime}мс`,
        });
      } else if (loginResponse.status === 401) {
        throw new Error('Неверные учетные данные');
      } else {
        throw new Error(`HTTP ${loginResponse.status}: ${loginResponse.statusText}`);
      }
    } catch (error: any) {
      const errorMessage = error.name === 'AbortError' 
        ? 'Превышен таймаут подключения'
        : error.message || 'Неизвестная ошибка';
        
      setTestResult({ 
        success: false, 
        error: errorMessage 
      });
      
      toast({
        title: "Ошибка подключения",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const resetToDefaults = () => {
    reset(defaultConfig);
    toast({
      title: "Настройки сброшены",
      description: "Восстановлены значения по умолчанию",
    });
  };

  const onSubmit = (data: STSApiConfig) => {
    saveConfig(data);
  };

  const getStatusIcon = () => {
    if (isTestingConnection) {
      return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    
    if (testResult?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    
    if (testResult?.success === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Globe className="h-4 w-4 text-gray-400" />;
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full report-full-width">
        {/* Заголовок */}
        <div className="mb-6 pt-4 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <h1 className="text-3xl font-bold text-foreground">
            Настройки API СТС
          </h1>
          <p className="text-muted-foreground">
            Конфигурация подключения к внешнему API торговой сети СТС
          </p>
        </div>

        {/* Статус подключения */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mx-4 md:mx-6 lg:mx-8 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Статус подключения</CardTitle>
              {getStatusIcon()}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {testResult?.success === true ? 'ДОСТУПНО' : 
                 testResult?.success === false ? 'НЕДОСТУПНО' : 'НЕ ПРОВЕРЕНО'}
              </div>
              <p className="text-xs text-muted-foreground">
                {testResult?.responseTime && `Время ответа: ${testResult.responseTime}мс`}
                {testResult?.error && `Ошибка: ${testResult.error}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Endpoint</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold truncate">
                {config.url}
              </div>
              <p className="text-xs text-muted-foreground">
                Торговая сеть СТС
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">JWT Токен</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {config.token ? (
                  <Badge variant="default" className="bg-green-600">
                    АКТИВЕН
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    НЕ ПОЛУЧЕН
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {config.token && config.tokenExpiry 
                  ? `Истекает: ${new Date(config.tokenExpiry).toLocaleString('ru-RU')}`
                  : 'Нажмите "Тест подключения" для получения токена'
                }
                {config.enabled && refreshTimer && (
                  <><br />Автообновление: каждые {config.refreshInterval} мин.</>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Состояние</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={config.enabled ? "default" : "secondary"}>
                  {config.enabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasChanges ? 'Есть несохраненные изменения' : 'Настройки актуальны'}
              </p>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Основные настройки */}
          <Card className="mx-4 md:mx-6 lg:mx-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Параметры подключения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Основные настройки подключения */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="url" className="text-sm">URL API *</Label>
                  <Input
                    id="url"
                    {...register('url', { 
                      required: 'URL обязателен',
                      pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'Неверный формат URL'
                      }
                    })}
                    placeholder="https://pos.autooplata.ru/tms"
                    className="h-8"
                  />
                  {errors.url && (
                    <p className="text-xs text-red-500">{errors.url.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="username" className="text-sm">Имя пользователя *</Label>
                  <Input
                    id="username"
                    {...register('username', { required: 'Обязательное поле' })}
                    placeholder="UserApi"
                    className="h-8"
                  />
                  {errors.username && (
                    <p className="text-xs text-red-500">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm">Пароль *</Label>
                  <Input
                    id="password"
                    type="password"
                    {...register('password', { required: 'Обязательное поле' })}
                    placeholder="••••••••••••"
                    className="h-8"
                  />
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>
              </div>

              {/* Параметры для тестирования API */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <Label htmlFor="networkId" className="text-sm">Номер сети (для тестов)</Label>
                  <Input
                    id="networkId"
                    {...register('networkId')}
                    placeholder="Например: 1"
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется в API запросах для тестирования
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tradingPointId" className="text-sm">Номер торговой точки (для тестов)</Label>
                  <Input
                    id="tradingPointId"
                    {...register('tradingPointId')}
                    placeholder="Например: 101"
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Используется в API запросах для тестирования
                  </p>
                </div>
              </div>

              {/* Дополнительные настройки */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="timeout" className="text-sm">Таймаут (мс)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    {...register('timeout', { 
                      min: { value: 1000, message: 'Мин: 1000' },
                      max: { value: 120000, message: 'Макс: 120000' }
                    })}
                    min="1000"
                    max="120000"
                    step="1000"
                    className="h-8"
                  />
                  {errors.timeout && (
                    <p className="text-xs text-red-500">{errors.timeout.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="retryAttempts" className="text-sm">Попытки</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    {...register('retryAttempts', { 
                      min: { value: 1, message: 'Мин: 1' },
                      max: { value: 10, message: 'Макс: 10' }
                    })}
                    min="1"
                    max="10"
                    className="h-8"
                  />
                  {errors.retryAttempts && (
                    <p className="text-xs text-red-500">{errors.retryAttempts.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="refreshInterval" className="text-sm">Обновление (мин)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    {...register('refreshInterval', { 
                      min: { value: 5, message: 'Мин: 5' },
                      max: { value: 720, message: 'Макс: 720' }
                    })}
                    min="5"
                    max="720"
                    step="5"
                    className="h-8"
                  />
                  {errors.refreshInterval && (
                    <p className="text-xs text-red-500">{errors.refreshInterval.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-5">
                  <Switch
                    id="enabled"
                    {...register('enabled')}
                  />
                  <Label htmlFor="enabled" className="text-sm">Включено</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Действия */}
          <div className="mx-4 md:mx-6 lg:mx-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-2 justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testConnection}
                      disabled={isTestingConnection}
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {isTestingConnection ? 'Тестирую...' : 'Тест подключения'}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetToDefaults}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      По умолчанию
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit"
                    disabled={!hasChanges}
                    className="sm:ml-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Сохранить настройки
                  </Button>
                </div>
                
                {hasChanges && (
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-4 w-4" />
                      У вас есть несохраненные изменения. Не забудьте сохранить настройки.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </form>

        {/* Методы API */}
        {config.enabled && (
          <div className="mx-4 md:mx-6 lg:mx-8 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Методы API
                      {isLoadingMethods && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CardTitle>
                    <CardDescription>
                      Список всех доступных методов API из OpenAPI спецификации
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadApiMethods()}
                      disabled={isLoadingMethods}
                    >
                      {isLoadingMethods ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Обновить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTestResults({});
                        toast({
                          title: "Результаты очищены",
                          description: "Все результаты тестирования удалены",
                        });
                      }}
                      disabled={Object.keys(testResults).length === 0}
                    >
                      Очистить результаты
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingMethods ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Загрузка методов API...</span>
                  </div>
                ) : apiMethods.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Методы API не найдены. Проверьте подключение.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiMethods.map((method) => (
                      <div key={method.id} className="border rounded-lg">
                        <div 
                          className="p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between"
                          onClick={() => toggleMethodExpansion(method.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant="outline" 
                              className={`${getMethodColor(method.method)} text-xs font-mono`}
                            >
                              {method.method}
                            </Badge>
                            <code className="text-sm font-mono">{method.path}</code>
                            {method.summary && (
                              <span className="text-sm text-muted-foreground">{method.summary}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                testApiMethod(method);
                              }}
                              disabled={testingMethod === method.id || !config.token}
                            >
                              {testingMethod === method.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                            {expandedMethods.has(method.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        
                        {expandedMethods.has(method.id) && (
                          <div className="border-t bg-muted/30 p-3">
                            {method.description && (
                              <div className="mb-3">
                                <strong className="text-sm">Описание:</strong>
                                <p className="text-sm text-muted-foreground mt-1">{method.description}</p>
                              </div>
                            )}
                            
                            {method.tags && method.tags.length > 0 && (
                              <div className="mb-3">
                                <strong className="text-sm">Теги:</strong>
                                <div className="flex gap-1 mt-1">
                                  {method.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {method.parameters && method.parameters.length > 0 && (
                              <div className="mb-3">
                                <strong className="text-sm">Параметры:</strong>
                                <div className="mt-1 space-y-1">
                                  {method.parameters.map((param: any, idx: number) => (
                                    <div key={idx} className="text-xs font-mono bg-background p-2 rounded border">
                                      <span className="font-semibold">{param.name}</span>
                                      {param.required && <Badge variant="destructive" className="ml-2 text-xs">required</Badge>}
                                      {param.description && (
                                        <p className="text-muted-foreground mt-1">{param.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {method.requestBody && method.requestBody.content?.['application/json']?.schema && (
                              <div className="mb-3">
                                <strong className="text-sm">Тело запроса (JSON):</strong>
                                <div className="mt-1 space-y-1">
                                  {method.requestBody.content['application/json'].schema.properties && 
                                    Object.entries(method.requestBody.content['application/json'].schema.properties).map(([fieldName, fieldSchema]: [string, any]) => (
                                      <div key={fieldName} className="text-xs font-mono bg-background p-2 rounded border">
                                        <span className="font-semibold">{fieldName}</span>
                                        <span className="ml-2 text-blue-600">({fieldSchema.type || 'any'})</span>
                                        {method.requestBody.content['application/json'].schema.required?.includes(fieldName) && (
                                          <Badge variant="destructive" className="ml-2 text-xs">required</Badge>
                                        )}
                                        {fieldSchema.description && (
                                          <p className="text-muted-foreground mt-1">{fieldSchema.description}</p>
                                        )}
                                      </div>
                                    ))
                                  }
                                </div>
                              </div>
                            )}

                            {method.security && method.security.length > 0 && (
                              <div className="mb-3">
                                <strong className="text-sm">Безопасность:</strong>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Требует аутентификации: {method.security.map((s: any) => Object.keys(s).join(', ')).join(', ')}
                                </p>
                              </div>
                            )}

                            {/* Результаты тестирования */}
                            {testResults[method.id] && (
                              <div className="mt-3 p-3 border rounded bg-background/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <strong className="text-sm">Результат тестирования:</strong>
                                  <Badge variant={testResults[method.id].success ? "default" : "destructive"} className="text-xs">
                                    {testResults[method.id].status} {testResults[method.id].statusText}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(testResults[method.id].timestamp).toLocaleTimeString('ru-RU')}
                                  </span>
                                </div>
                                
                                {testResults[method.id].usedNetworkId && (
                                  <p className="text-xs text-muted-foreground">
                                    Сеть: {testResults[method.id].usedNetworkId}
                                  </p>
                                )}
                                
                                {testResults[method.id].usedTradingPointId && (
                                  <p className="text-xs text-muted-foreground">
                                    ТТ: {testResults[method.id].usedTradingPointId}
                                  </p>
                                )}

                                <p className="text-xs text-muted-foreground mb-2">
                                  URL: {testResults[method.id].url}
                                </p>

                                {testResults[method.id].data && (
                                  <div>
                                    <strong className="text-xs">Данные ответа:</strong>
                                    <pre className="text-xs bg-muted/50 p-2 rounded mt-1 overflow-x-auto max-h-32 overflow-y-auto">
                                      {typeof testResults[method.id].data === 'string' 
                                        ? testResults[method.id].data
                                        : JSON.stringify(testResults[method.id].data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}