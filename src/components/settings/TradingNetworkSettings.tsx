/**
 * Компонент настроек подключения к API торговой сети
 * ОБНОВЛЕННЫЙ ДИЗАЙН: Применена спокойная палитра приложения и улучшена навигация
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  tradingNetworkConfigService, 
  TradingNetworkConfig,
  ConnectionTestResult
} from '@/services/tradingNetworkConfigService';
import { universalMappingService, EntityMapping, MappingSyncResult } from '@/services/universalMappingService';
import { 
  Network, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle,
  Save,
  RotateCcw,
  Activity,
  Fuel,
  Receipt,
  RefreshCw,
  Link2,
  AlertCircle,
  Key,
  Edit3,
  Trash2,
  Plus,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const TradingNetworkSettings: React.FC = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<TradingNetworkConfig>(() => {
    const loadedConfig = tradingNetworkConfigService.getConfigSync();
    // Убеждаемся что endpoints всегда определен
    if (!loadedConfig.endpoints) {
      loadedConfig.endpoints = {
        tanks: '/tanks',
        transactions: '/transactions'
      };
    }
    return loadedConfig;
  });
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Тестовые параметры для проверки подключения
  const [testSystemId, setTestSystemId] = useState('1');
  const [testStationId, setTestStationId] = useState('15');
  
  // Состояние для универсального маппинга
  const [isSyncingMappings, setIsSyncingMappings] = useState(false);
  const [mappingSyncResult, setMappingSyncResult] = useState<MappingSyncResult | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('');
  const [selectedMappingType, setSelectedMappingType] = useState<string>('fuel');
  const [showMappingEditor, setShowMappingEditor] = useState(false);
  
  // Управление развернутыми секциями
  const [expandedSection, setExpandedSection] = useState<string>('mapping');

  // Загрузка конфигурации при инициализации
  useEffect(() => {
    loadConfig();
    // Если конфигурация пуста или нет настроек маппинга, загружаем по умолчанию
    const currentConfig = tradingNetworkConfigService.getConfigSync();
    if (!currentConfig.universalMapping?.enabled || !currentConfig.baseUrl) {
      console.log('🔄 Первый запуск: применяем настройки по умолчанию');
      const defaultConfig = tradingNetworkConfigService.resetToDefault();
      setConfig(defaultConfig);
    }
  }, []);

  // Отслеживание изменений
  useEffect(() => {
    const savedConfig = tradingNetworkConfigService.getConfigSync();
    setHasUnsavedChanges(JSON.stringify(config) !== JSON.stringify(savedConfig));
  }, [config]);

  const loadConfig = () => {
    try {
      const loadedConfig = tradingNetworkConfigService.getConfigSync();
      // Убеждаемся что endpoints всегда определен
      if (!loadedConfig.endpoints) {
        loadedConfig.endpoints = {
          tanks: '/tanks',
          transactions: '/transactions'
        };
      }
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Failed to load trading network config:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить настройки торговой сети",
        variant: "destructive"
      });
    }
  };

  const saveConfig = async () => {
    try {
      // Валидация перед сохранением
      const validation = tradingNetworkConfigService.validateConfig(config);
      if (!validation.valid) {
        toast({
          title: "Ошибка валидации",
          description: validation.errors.join(', '),
          variant: "destructive"
        });
        return;
      }

      await tradingNetworkConfigService.saveConfig(config);
      setHasUnsavedChanges(false);
      toast({
        title: "Настройки сохранены",
        description: "Конфигурация торговой сети успешно обновлена",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message || "Не удалось сохранить настройки",
        variant: "destructive"
      });
    }
  };

  const resetConfig = () => {
    const resetConfig = tradingNetworkConfigService.resetToDefaultSync();
    console.log('🔄 Resetting to default config:', resetConfig);
    setConfig(resetConfig);
    toast({
      title: "Настройки сброшены",
      description: "Восстановлены настройки по умолчанию",
    });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      // Получаем актуальную конфигурацию из сервиса
      const actualConfig = tradingNetworkConfigService.getConfigSync();
      
      console.log('🧪 Тест подключения с конфигурацией из состояния компонента:', {
        authType: config.authType,
        username: config.username,
        password: config.password ? '***' + config.password.slice(-3) : 'НЕТ ПАРОЛЯ',
        hasPassword: !!config.password,
        baseUrl: config.baseUrl
      });
      
      console.log('🧪 Тест подключения с актуальной конфигурацией из сервиса:', {
        authType: actualConfig.authType,
        username: actualConfig.username,
        password: actualConfig.password ? '***' + actualConfig.password.slice(-3) : 'НЕТ ПАРОЛЯ',
        hasPassword: !!actualConfig.password,
        baseUrl: actualConfig.baseUrl
      });
      
      // 🔄 ОБНОВЛЕНО: Используем новый метод с HTTP клиентом и тестовыми параметрами
      const { testTradingNetworkConnectionWithParams } = await import('../../services/tradingNetworkConfigService');
      const result = await testTradingNetworkConnectionWithParams(actualConfig, testSystemId, testStationId);
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Подключение успешно",
          description: `Получен ответ за ${result.responseTime}мс. ${result.data && Array.isArray(result.data) ? `Найдено ${result.data.length} резервуаров.` : ''}`,
        });
      } else {
        toast({
          title: "Ошибка подключения",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'Неизвестная ошибка'
      };
      setTestResult(errorResult);
      
      toast({
        title: "Ошибка подключения",
        description: error.message || 'Сетевая ошибка',
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateConfig = (updates: Partial<TradingNetworkConfig>) => {
    console.log('🔧 Updating config:', updates);
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      console.log('🔧 New config state:', newConfig);
      
      // Автосохранение критически важных полей аутентификации
      if (updates.username !== undefined || updates.password !== undefined || updates.authType !== undefined) {
        console.log('💾 Автосохранение полей аутентификации...');
        tradingNetworkConfigService.saveConfigSync(newConfig);
      }
      
      return newConfig;
    });
  };

  const getStatusIcon = () => {
    if (isTestingConnection) {
      return <Clock className="h-4 w-4 text-amber-500 animate-spin" />;
    }
    
    if (testResult?.success) {
      return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
    
    if (testResult?.success === false) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    
    return <Activity className="h-4 w-4 text-slate-400" />;
  };

  // Функция для переключения секций
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и общий переключатель */}
      <Card className="bg-slate-800 border-slate-700 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold flex items-center gap-3 text-slate-200">
                <div className="p-2 rounded-lg bg-blue-400/10">
                  <Network className="h-6 w-6 text-blue-400" />
                </div>
                API Торговой сети
              </h3>
              <p className="text-sm text-slate-400 max-w-2xl">
                Интеграция с внешними системами торговых сетей для получения данных о резервуарах, транзакциях и синхронизации справочников
              </p>
            </div>
            <div className="flex items-center gap-3">
              {config.enabled && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    testResult?.success 
                      ? 'bg-blue-500 animate-pulse' 
                      : testResult === null 
                        ? 'bg-slate-400' 
                        : 'bg-red-500'
                  }`} />
                  <Badge 
                    variant={testResult?.success ? "default" : "secondary"}
                    className={testResult?.success 
                      ? "bg-blue-400/10 text-blue-300 border-blue-800" 
                      : "bg-slate-700 text-slate-300 border-slate-600"}
                  >
                    {testResult?.success ? '🟢 Подключено' : testResult === null ? '⚫ Не проверено' : '🔴 Ошибка'}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="main-switch" className="text-sm font-medium text-slate-300">
                  {config.enabled ? 'Включено' : 'Отключено'}
                </Label>
                <Switch
                  id="main-switch"
                  checked={config.enabled}
                  onCheckedChange={(enabled) => updateConfig({ enabled })}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <div className="space-y-4">
          {/* Секция настроек подключения */}
          <Card className="bg-slate-800 border-slate-700 hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3">
              <button 
                onClick={() => toggleSection('connection')}
                className="flex items-center justify-between w-full text-left hover:bg-slate-700/50 -m-4 p-4 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-400/10">
                    <Settings className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-200">Настройки подключения</CardTitle>
                    <CardDescription className="text-slate-400">
                      URL, аутентификация и параметры API
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {expandedSection === 'connection' && (
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection();
                        }}
                        disabled={isTestingConnection}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {isTestingConnection ? '🔄 Тестирую...' : '🧪 Проверить'}
                      </Button>
                    </div>
                  )}
                  {expandedSection === 'connection' ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
            </CardHeader>

            {expandedSection === 'connection' && (
              <CardContent className="space-y-6 bg-slate-800/20 rounded-b-lg border-t bg-slate-800 border-slate-700">
                {/* Основные настройки */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    Основные параметры
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="baseUrl" className="text-sm font-medium text-slate-300">Базовый URL API *</Label>
                      <Input
                        id="baseUrl"
                        value={config.baseUrl}
                        onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                        placeholder="https://pos.autooplata.ru/tms"
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* systemId и defaultStationId убраны - теперь берутся динамически из селекторов сети и торговой точки */}

                    <div className="space-y-2">
                      <Label htmlFor="timeout" className="text-sm font-medium text-slate-300">Timeout (мс)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={config.timeout}
                        onChange={(e) => updateConfig({ timeout: parseInt(e.target.value) || 30000 })}
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Настройки аутентификации */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    Аутентификация
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="authType" className="text-sm font-medium text-slate-300">Тип аутентификации</Label>
                    <Select 
                      value={config.authType} 
                      onValueChange={(value: any) => updateConfig({ authType: value })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="none">🔓 Без аутентификации</SelectItem>
                        <SelectItem value="basic">👤 Basic Auth</SelectItem>
                        <SelectItem value="bearer">🔑 Bearer Token</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {config.authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium text-slate-300">👤 Логин</Label>
                        <Input
                          id="username"
                          value={config.username || ''}
                          onChange={(e) => updateConfig({ username: e.target.value })}
                          placeholder="UserApi"
                          className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-300">🔒 Пароль</Label>
                        <Input
                          id="password"
                          type="password"
                          value={config.password || ''}
                          onChange={(e) => {
                            console.log('🔐 Пароль изменен:', e.target.value ? '***' + e.target.value.slice(-2) : 'ПУСТОЕ ПОЛЕ');
                            updateConfig({ password: e.target.value });
                          }}
                          placeholder="••••••••"
                          className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {config.authType === 'bearer' && (
                    <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-full bg-blue-400/10">
                          <Key className="h-4 w-4 text-blue-400" />
                        </div>
                        <Label className="text-sm font-medium text-slate-300">🔑 Bearer Token</Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apiKey" className="text-sm font-medium text-slate-300">API ключ</Label>
                        <Input
                          id="apiKey"
                          type="text"
                          value={config.apiKey || ''}
                          onChange={(e) => {
                            console.log('🔑 Bearer token изменен:', e.target.value ? 'eyJ...' + e.target.value.slice(-10) : 'ПУСТОЕ ПОЛЕ');
                            updateConfig({ apiKey: e.target.value });
                          }}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                        />
                        <p className="text-xs text-slate-400">
                          Введите Bearer token для авторизации в API
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Информация о динамических параметрах */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Динамические параметры системы
                  </h4>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-slate-300 mb-3">
                      <strong>System ID</strong> и <strong>Station ID</strong> теперь определяются автоматически:
                    </p>
                    <ul className="text-xs text-slate-400 space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        <strong>System ID</strong> - берется из external_id выбранной сети в селекторе приложения
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                        <strong>Station ID</strong> - берется из external_id выбранной торговой точки в селекторе приложения
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                        Параметры подставляются автоматически при каждом запросе к API
                      </li>
                    </ul>
                  </div>
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Эндпоинты */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    Эндпоинты API
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tanksEndpoint" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-blue-400" />
                        Эндпоинт резервуаров
                      </Label>
                      <Input
                        id="tanksEndpoint"
                        value={config.endpoints.tanks}
                        onChange={(e) => updateConfig({ 
                          endpoints: { ...config.endpoints, tanks: e.target.value } 
                        })}
                        placeholder="/v1/tanks"
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transactionsEndpoint" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                        Эндпоинт транзакций
                      </Label>
                      <Input
                        id="transactionsEndpoint"
                        value={config.endpoints.transactions}
                        onChange={(e) => updateConfig({ 
                          endpoints: { ...config.endpoints, transactions: e.target.value } 
                        })}
                        placeholder="/v1/transactions"
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Параметры по умолчанию */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                    Параметры по умолчанию
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="refreshInterval" className="text-sm font-medium text-slate-300">⏱️ Интервал обновления (сек)</Label>
                      <Input
                        id="refreshInterval"
                        type="number"
                        value={config.defaultParams.refreshInterval}
                        onChange={(e) => updateConfig({ 
                          defaultParams: { 
                            ...config.defaultParams, 
                            refreshInterval: parseInt(e.target.value) || 60 
                          } 
                        })}
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxRecords" className="text-sm font-medium text-slate-300">📊 Макс. записей</Label>
                      <Input
                        id="maxRecords"
                        type="number"
                        value={config.defaultParams.maxRecords}
                        onChange={(e) => updateConfig({ 
                          defaultParams: { 
                            ...config.defaultParams, 
                            maxRecords: parseInt(e.target.value) || 1000 
                          } 
                        })}
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retryAttempts" className="text-sm font-medium text-slate-300">🔄 Попыток повтора</Label>
                      <Input
                        id="retryAttempts"
                        type="number"
                        value={config.retryAttempts}
                        onChange={(e) => updateConfig({ retryAttempts: parseInt(e.target.value) || 3 })}
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-200 dark:bg-slate-700" />

                {/* Параметры для тестирования */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-300 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                    Параметры тестирования
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="testSystemId" className="text-sm font-medium text-slate-300">System ID для теста</Label>
                      <Input
                        id="testSystemId"
                        value={testSystemId}
                        onChange={(e) => setTestSystemId(e.target.value)}
                        placeholder="1"
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400">ID системы для тестирования подключения</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="testStationId" className="text-sm font-medium text-slate-300">Station ID для теста</Label>
                      <Input
                        id="testStationId"
                        value={testStationId}
                        onChange={(e) => setTestStationId(e.target.value)}
                        placeholder="15"
                        className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-400">ID станции для тестирования подключения (например, 15 для "Норд Лайн")</p>
                    </div>
                  </div>
                </div>

                {/* Результат тестирования */}
                {testResult && (
                  <div className={`p-4 rounded-lg border-l-4 ${
                    testResult.success 
                      ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/20 dark:border-blue-600' 
                      : 'bg-red-50 border-red-400 dark:bg-red-950/20 dark:border-red-600'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full ${
                        testResult.success
                          ? 'bg-blue-500/10 dark:bg-blue-400/10'
                          : 'bg-red-500/10 dark:bg-red-400/10'
                      }`}>
                        {testResult.success ? (
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        {testResult.success ? (
                          <div>
                            <div className="font-semibold text-blue-800 dark:text-blue-200 text-base">
                              ✅ Подключение успешно
                            </div>
                            <div className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                              ⚡ Время ответа: {testResult.responseTime}мс
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-semibold text-red-800 dark:text-red-200 text-base">
                              ❌ Ошибка подключения
                            </div>
                            <div className="text-red-700 dark:text-red-300 text-sm mt-1">
                              {testResult.error}
                            </div>
                          </div>
                        )}
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono">
                          🌐 Эндпоинт: {testResult.endpoint}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Секция универсального маппинга */}
          <Card className="bg-slate-800 border-slate-700 hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3">
              <button 
                onClick={() => toggleSection('mapping')}
                className="flex items-center justify-between w-full text-left hover:bg-slate-700/50 -m-4 p-4 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-md bg-blue-500/10 dark:bg-blue-400/10">
                    <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-slate-200">Универсальное маппинг сущностей</CardTitle>
                    <CardDescription className="text-slate-400">
                      Соответствие кодов между приложением и API торговой сети
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor="mapping-switch" 
                      className="text-sm font-medium text-slate-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {config.universalMapping?.enabled ? '🟢 Включено' : '⚫ Отключено'}
                    </Label>
                    <Switch
                      id="mapping-switch"
                      checked={config.universalMapping?.enabled || false}
                      onCheckedChange={(enabled) => {
                        updateConfig({ 
                          universalMapping: { 
                            ...config.universalMapping, 
                            enabled 
                          } 
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                  {expandedSection === 'mapping' ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>
            </CardHeader>

            {expandedSection === 'mapping' && (
              <CardContent className="space-y-6 bg-slate-800/20 rounded-b-lg border-t bg-slate-800 border-slate-700">
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-blue-950/30 to-blue-900/20 rounded-lg border border-blue-800/50">
                    <p className="text-sm text-slate-300 leading-relaxed">
                      📋 <strong>Универсальное сопоставление:</strong> Настройте соответствие между кодами и названиями всех типов сущностей 
                      в приложении и API торговой сети. Это позволяет корректно отображать и обрабатывать данные из внешних систем.
                    </p>
                  </div>

                  {/* Описание типов маппинга */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🛢️</span>
                        <h5 className="font-medium text-slate-300">Топливо</h5>
                      </div>
                      <p className="text-xs text-slate-400">АИ-92, АИ-95, ДТ и др.</p>
                    </div>
                    
                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">💳</span>
                        <h5 className="font-medium text-slate-300">Оплата</h5>
                      </div>
                      <p className="text-xs text-slate-400">Наличные, карта, талоны</p>
                    </div>

                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">⛽</span>
                        <h5 className="font-medium text-slate-300">ТРК</h5>
                      </div>
                      <p className="text-xs text-slate-400">Диспенсеры и колонки</p>
                    </div>

                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🖥️</span>
                        <h5 className="font-medium text-slate-300">ТЮД</h5>
                      </div>
                      <p className="text-xs text-slate-400">Терминалы управления</p>
                    </div>

                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔧</span>
                        <h5 className="font-medium text-slate-300">Оборудование</h5>
                      </div>
                      <p className="text-xs text-slate-400">Дополнительное оборудование</p>
                    </div>

                    <div className="p-3 bg-slate-700/50 border bg-slate-800 border-slate-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🛠️</span>
                        <h5 className="font-medium text-slate-300">Услуги</h5>
                      </div>
                      <p className="text-xs text-slate-400">Доп. услуги и сервисы</p>
                    </div>
                  </div>

                  {/* Параметры синхронизации */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-300 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      Параметры синхронизации
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="networkSelect" className="text-sm font-medium text-slate-300">🏢 Торговая сеть</Label>
                        <Input
                          id="networkSelect"
                          value={selectedNetworkId}
                          onChange={(e) => setSelectedNetworkId(e.target.value)}
                          placeholder="ID торговой сети"
                          className="bg-slate-700 border-slate-600 focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="mappingTypeSelect" className="text-sm font-medium text-slate-300">📋 Тип маппинга</Label>
                        <Select 
                          value={selectedMappingType} 
                          onValueChange={setSelectedMappingType}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="fuel">🛢️ Топливо</SelectItem>
                            <SelectItem value="payment">💳 Способы оплаты</SelectItem>
                            <SelectItem value="dispenser">⛽ ТРК (диспенсеры)</SelectItem>
                            <SelectItem value="terminal">🖥️ ТЮД (терминалы)</SelectItem>
                            <SelectItem value="equipment">🔧 Оборудование</SelectItem>
                            <SelectItem value="service">🛠️ Услуги</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="syncStrategy" className="text-sm font-medium text-slate-300">⚙️ Стратегия синхронизации</Label>
                        <Select 
                          value={config.universalMapping?.syncStrategy || 'hybrid'} 
                          onValueChange={(value: any) => updateConfig({ 
                            universalMapping: { 
                              ...config.universalMapping, 
                              syncStrategy: value 
                            } 
                          })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="manual">👤 Ручная</SelectItem>
                            <SelectItem value="auto">🤖 Автоматическая</SelectItem>
                            <SelectItem value="hybrid">⚖️ Смешанная</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="conflictResolution" className="text-sm font-medium text-slate-300">⚡ При конфликтах</Label>
                        <Select 
                          value={config.universalMapping?.conflictResolution || 'prefer_internal'} 
                          onValueChange={(value: any) => updateConfig({ 
                            universalMapping: { 
                              ...config.universalMapping, 
                              conflictResolution: value 
                            } 
                          })}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="prefer_api">🌐 Приоритет API</SelectItem>
                            <SelectItem value="prefer_internal">🏠 Приоритет приложения</SelectItem>
                            <SelectItem value="manual">👨‍💻 Ручное разрешение</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Кнопки управления маппингом */}
                  <div className="flex gap-3 flex-wrap">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {/* Здесь будет логика синхронизации */}}
                      disabled={isSyncingMappings || !selectedNetworkId}
                      className="bg-slate-700 border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncingMappings ? 'animate-spin' : ''}`} />
                      {isSyncingMappings ? '🔄 Синхронизация...' : '🔄 Синхр. все типы'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {/* Здесь будет логика автосоздания */}}
                      disabled={!selectedNetworkId}
                      className="bg-slate-700 border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      ⚡ Автосоздание для {selectedMappingType}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowMappingEditor(!showMappingEditor)}
                      className="bg-slate-700 border-slate-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {showMappingEditor ? '📋 Скрыть редактор' : '✏️ Открыть редактор'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* Кнопки сохранения и управления */}
      <Card className="bg-slate-50/50 dark:bg-slate-800/50 bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={resetConfig}
              className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              🔄 Сбросить к настройкам по умолчанию
            </Button>
            
            <div className="flex items-center gap-4">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                    ⚠️ Есть несохраненные изменения
                  </span>
                </div>
              )}
              <Button 
                onClick={saveConfig} 
                disabled={!hasUnsavedChanges}
                className={`min-w-[140px] ${
                  hasUnsavedChanges 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                }`}
              >
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges ? '💾 Сохранить изменения' : '✅ Все сохранено'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};