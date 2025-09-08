import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { Database, RefreshCw, Search } from 'lucide-react';

interface StorageData {
  key: string;
  data: any[];
  count: number;
}

export default function DataInspector() {
  const [storageData, setStorageData] = useState<StorageData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const clearAndResetData = () => {
    if (!confirm('⚠️ Это удалит ВСЕ данные из localStorage и перезагрузит страницу! Продолжить?')) {
      return;
    }
    
    console.log('🗑️ Очищаем localStorage...');
    
    // Очищаем все ключи localStorage (не только наши)
    localStorage.clear();
    
    console.log('✅ localStorage очищен полностью');
    console.log('🔄 Перезагружаем страницу для создания свежих данных...');
    
    // Перезагружаем страницу для пересоздания начальных данных
    window.location.reload();
  };

  const clearDataOnly = () => {
    if (!confirm('⚠️ Это удалит ВСЕ данные из localStorage БЕЗ перезагрузки! Инспектор покажет пустые данные до повторного обращения к сервисам.')) {
      return;
    }
    
    console.log('🗑️ Очищаем только localStorage...');
    localStorage.clear();
    console.log('✅ localStorage очищен');
    
    // Обновляем отображение без перезагрузки
    loadStorageData();
    setLastUpdate(new Date());
  };

  const recalculateNetworkCounts = async () => {
    console.log('📊 Пересчитываем счетчики торговых точек...');
    
    try {
      const { networksService } = await import('@/services/networksService');
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      
      const networks = await networksService.getAll();
      const points = await tradingPointsService.getAll();
      
      console.log('Найдено сетей:', networks.length, 'точек:', points.length);
      
      // Пересчитываем для каждой сети
      for (const network of networks) {
        const pointsCount = points.filter(p => p.networkId === network.id).length;
        console.log(`Сеть "${network.name}" (ID: ${network.id}): ${pointsCount} точек`);
        
        await networksService.updatePointsCount(network.id, pointsCount);
      }
      
      // Обновляем интерфейс
      loadStorageData();
      
      alert('✅ Счетчики торговых точек пересчитаны!');
      
    } catch (error) {
      console.error('❌ Ошибка пересчета:', error);
      alert('❌ Ошибка при пересчете счетчиков: ' + error.message);
    }
  };

  const forceLoadInitialData = async () => {
    console.log('🔄 Принудительная загрузка всех начальных данных...');
    
    try {
      // Импортируем все сервисы для инициализации
      const { networksService } = await import('@/services/networksService');
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const { usersSupabaseService } = await import('@/services/usersSupabaseService');
      const { currentEquipmentAPI } = await import('@/services/equipment');
      const { currentComponentsAPI } = await import('@/services/components');
      const { commandsService } = await import('@/services/commandsService');
      const { componentStatusService } = await import('@/services/componentStatusSupabaseService');
      const { pricesService } = await import('@/services/pricesSupabaseService');
      const { tanksService } = await import('@/services/tanksServiceSupabase');
      const { operationsService } = await import('@/services/operationsSupabaseService');
      
      console.log('📦 Инициализируем все сервисы...');
      
      // Импортируем дополнительные сервисы для шаблонов
      const { equipmentTypesAPI, convertToEquipmentTemplate } = await import('@/services/equipmentTypes');
      const { componentsSupabaseAPI } = await import('@/services/componentsSupabase');
      
      // Вызываем методы для инициализации данных в localStorage
      const [networks, points, users, equipment, components, commands, workflows, componentStatuses, fuelTypes, currentPrices, tanks, operations] = await Promise.all([
        networksService.getAll(),
        tradingPointsService.getAll(),
        usersSupabaseService.getAllUsers(),
        currentEquipmentAPI.list({ trading_point_id: '1' }),
        currentComponentsAPI.list({ }),
        commandsService.getAllCommands(),
        commandsService.getAllWorkflows(),
        componentStatusService.getAll(),
        pricesService.getFuelTypes(),
        pricesService.getCurrentPrices(),
        tanksService.getTanks(), // Исправлено: getAll -> getTanks
        operationsService.getAll() // Исправлено: getAllOperations -> getAll
      ]);
      
      // Загружаем и сохраняем шаблоны оборудования
      const equipmentTypes = await equipmentTypesAPI.list();
      const equipmentTemplates = equipmentTypes.map(convertToEquipmentTemplate);
      localStorage.setItem('tradeframe_equipmentTemplates', JSON.stringify(equipmentTemplates));
      
      // Загружаем и сохраняем шаблоны компонентов
      const componentTemplates = await componentsSupabaseAPI.getTemplates();
      localStorage.setItem('tradeframe_componentTemplates', JSON.stringify(componentTemplates));
      
      console.log('✅ Все данные загружены:', {
        networks: networks.length,
        points: points.length,
        users: users.length,
        equipment: equipment.data?.length || 0,
        components: components.data?.length || 0,
        commands: commands.length,
        workflows: workflows.length,
        componentStatuses: componentStatuses.length,
        fuelTypes: fuelTypes.length,
        currentPrices: currentPrices.length,
        tanks: tanks.length,
        operations: operations.length
      });
      
      // Обновляем интерфейс
      loadStorageData();
      
      const totalRecords = networks.length + points.length + users.length + 
        (equipment.data?.length || 0) + (components.data?.length || 0) + 
        commands.length + workflows.length + componentStatuses.length + 
        fuelTypes.length + currentPrices.length + tanks.length + operations.length +
        equipmentTemplates.length + componentTemplates.length;
      
      alert(`✅ Все начальные данные загружены! (${totalRecords} записей)\n` +
        `Сети: ${networks.length}\n` +
        `Точки: ${points.length}\n` +
        `Пользователи: ${users.length}\n` +
        `Оборудование: ${equipment.data?.length || 0}\n` +
        `Компоненты: ${components.data?.length || 0}\n` +
        `Шаблоны оборудования: ${equipmentTemplates.length}\n` +
        `Шаблоны компонентов: ${componentTemplates.length}\n` +
        `Команды: ${commands.length}\n` +
        `Процессы: ${workflows.length}\n` +
        `Статусы: ${componentStatuses.length}\n` +
        `Топливо: ${fuelTypes.length}\n` +
        `Цены: ${currentPrices.length}\n` +
        `Резервуары: ${tanks.length}\n` +
        `Операции: ${operations.length}`);
      
    } catch (error) {
      console.error('❌ Ошибка при загрузке данных:', error);
      alert('❌ Ошибка при загрузке начальных данных: ' + error.message);
    }
  };

  const addTestNetwork = async () => {
    console.log('🔄 Начинаем добавление тестовой сети...');
    
    try {
      // Импортируем сервисы и добавляем данные
      const { networksService } = await import('@/services/networksService');
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      
      console.log('📦 Сервисы импортированы');
      
      // Проверяем, нет ли уже тестовой сети
      const existingNetworks = await networksService.getAll();
      const existingTestNetwork = existingNetworks.find(n => 
        n.name.includes('Тестовая') || n.name.includes('тест')
      );
      
      if (existingTestNetwork) {
        console.log('⚠️ Тестовая сеть уже существует:', existingTestNetwork);
        alert('⚠️ Тестовая сеть уже существует: ' + existingTestNetwork.name);
        loadStorageData();
        return;
      }
      
      // Добавляем тестовую сеть
      console.log('🏢 Создаём тестовую сеть...');
      const testNetwork = await networksService.create({
        name: "Тестовая сеть 1",
        description: "Тестовая сеть для проверки функциональности",
        type: "АЗС"
      });
      
      console.log('✅ Тестовая сеть создана:', testNetwork);
      
      // Добавляем АЗС к тестовой сети
      console.log('⛽ Создаём АЗС...');
      const testStation = await tradingPointsService.create({
        name: "АЗС №3 Тестовая",
        description: "Тестовая АЗС для проверки функциональности",
        networkId: testNetwork.id,
        phone: "+7 (999) 123-45-67",
        email: "test@demo-azs.ru",
        isBlocked: false,
        geolocation: {
          latitude: 55.7558,
          longitude: 37.6176,
          region: "Тестовый регион",
          city: "г. Тест",
          address: "г. Тест, ул. Тестовая, 3"
        },
        schedule: {
          monday: "00:00-23:59",
          tuesday: "00:00-23:59", 
          wednesday: "00:00-23:59",
          thursday: "00:00-23:59",
          friday: "00:00-23:59",
          saturday: "00:00-23:59",
          sunday: "00:00-23:59",
          isAlwaysOpen: true
        },
        services: {
          selfServiceTerminal: true,
          airPump: true,
          carWash: false,
          shop: true,
          cafe: false,
          lubricants: false,
          waterService: false,
          gasBottleExchange: false,
          electricCharging: false,
          truckParking: false
        },
        externalCodes: []
      });
      
      console.log('✅ АЗС создана:', testStation);
      
      // Обновляем данные на странице
      console.log('🔄 Обновляем данные на странице...');
      loadStorageData();
      
      console.log('✅ Всё готово!');
      alert('✅ Тестовая сеть и АЗС добавлены успешно!\n\nСеть: ' + testNetwork.name + '\nАЗС: ' + testStation.name);
      
    } catch (error) {
      console.error('❌ Ошибка при добавлении:', error);
      alert('❌ Ошибка при добавлении тестовых данных: ' + error.message);
    }
  };

  const loadStorageData = () => {
    const keys = [
      'networks',
      'tradingPoints',
      'users',
      'operations',
      'equipment',
      'components',
      'equipmentTemplates',
      'componentTemplates',
      'shiftReports',
      'chatMessages',
      'supportTickets',
      'notifications',
      'notificationRules',
      'tanks',
      'prices',
      'commands',
      'workflows',
      'componentStatuses'
    ];

    const data: StorageData[] = [];

    keys.forEach(key => {
      try {
        // Проверяем сначала с префиксом PersistentStorage
        const prefixedKey = `tradeframe_${key}`;
        let stored = localStorage.getItem(prefixedKey);
        let isPrefixed = true;
        
        // Если нет данных с префиксом, проверяем без префикса (старые данные)
        if (!stored) {
          stored = localStorage.getItem(key);
          isPrefixed = false;
        }
        
        if (stored) {
          const parsed = JSON.parse(stored);
          // Если данные с префиксом, они имеют структуру {data: [...], metadata: {...}}
          const actualData = isPrefixed && parsed.data ? parsed.data : (Array.isArray(parsed) ? parsed : [parsed]);
          
          data.push({
            key,
            data: actualData,
            count: actualData.length
          });
        } else {
          data.push({
            key,
            data: [],
            count: 0
          });
        }
      } catch (error) {
        console.error(`Error parsing ${key}:`, error);
        data.push({
          key,
          data: [],
          count: 0
        });
      }
    });

    setStorageData(data);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  const findTestNetwork = () => {
    const networksData = storageData.find(d => d.key === 'networks');
    const testNetwork = networksData?.data.find((network: any) => 
      network.name?.toLowerCase().includes('тест') || 
      network.name?.toLowerCase().includes('test')
    );
    return testNetwork;
  };

  const findAllNetworks = () => {
    const networksData = storageData.find(d => d.key === 'networks');
    return networksData?.data || [];
  };

  const findRelatedTradingPoints = (networkId: string) => {
    const tradingPointsData = storageData.find(d => d.key === 'tradingPoints');
    return tradingPointsData?.data.filter((point: any) => 
      point.networkId === networkId || point.network_id === networkId
    ) || [];
  };

  const testNetwork = findTestNetwork();
  const allNetworks = findAllNetworks();
  const relatedPoints = testNetwork ? findRelatedTradingPoints(testNetwork.id) : [];

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8 text-blue-500" />
              Инспектор данных
            </h1>
            <p className="text-muted-foreground">
              Просмотр данных в localStorage
            </p>
            <p className="text-sm text-slate-400">
              Последнее обновление: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={loadStorageData} size="lg">
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить
            </Button>
            <Button 
              onClick={addTestNetwork} 
              variant="outline"
              size="lg"
            >
              ➕ Добавить тестовую сеть
            </Button>
            <Button 
              onClick={clearAndResetData} 
              variant="destructive"
              size="lg"
            >
              🗑️ Очистить и перезагрузить
            </Button>
            <Button 
              onClick={clearDataOnly} 
              variant="destructive"
              size="lg"
            >
              🗑️ Только очистить
            </Button>
            <Button 
              onClick={forceLoadInitialData} 
              variant="secondary"
              size="lg"
            >
              🔄 Загрузить начальные данные
            </Button>
            <Button 
              onClick={recalculateNetworkCounts} 
              variant="outline"
              size="lg"
            >
              📊 Пересчитать счетчики
            </Button>
          </div>
        </div>

        {/* Поиск тестовой сети */}
        {testNetwork && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <Search className="h-5 w-5" />
                Найдена тестовая сеть!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Сеть:</h3>
                  <pre className="bg-slate-800 p-3 rounded text-sm overflow-auto">
{JSON.stringify(testNetwork, null, 2)}
                  </pre>
                </div>
                
                {relatedPoints.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Связанные торговые точки ({relatedPoints.length}):</h3>
                    {relatedPoints.map((point: any, index: number) => (
                      <div key={index} className="bg-slate-800 p-3 rounded text-sm mb-2 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <strong className="text-white">{point.name}</strong>
                          <div className="flex gap-2">
                            <span className="text-xs bg-green-600 px-2 py-1 rounded">ID: {point.id}</span>
                            <span className="text-xs bg-orange-600 px-2 py-1 rounded">NetID: {point.networkId}</span>
                          </div>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {point.geolocation?.address || point.address || 'Адрес не указан'}
                        </div>
                        {point.phone && <div className="text-slate-500 text-xs mt-1">📞 {point.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {relatedPoints.length === 0 && (
                  <div className="text-amber-600">
                    ⚠️ Торговые точки для этой сети не найдены. Проверьте правильность networkId.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!testNetwork && (
          <Card className="mb-6 border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-amber-600">
                ⚠️ Тестовая сеть не найдена
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p>Тестовая сеть (содержащая "тест" в названии) не найдена в localStorage</p>
                
                <div>
                  <h4 className="font-medium mb-2">Найденные сети ({allNetworks.length}):</h4>
                  {allNetworks.map((network: any, index: number) => (
                    <div key={index} className="bg-slate-800 p-3 rounded text-sm mb-2 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <strong className="text-white">{network.name}</strong>
                        <span className="text-xs bg-blue-600 px-2 py-1 rounded">ID: {network.id}</span>
                      </div>
                      {network.description && <div className="text-slate-400 mb-2">{network.description}</div>}
                      <div className="text-xs text-slate-500">
                        Создана: {network.created_at ? new Date(network.created_at).toLocaleString() : 'н/д'}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-900/20 rounded border border-blue-500/20">
                  <h4 className="text-blue-400 font-medium mb-2">🔍 Возможные причины:</h4>
                  <ul className="text-sm space-y-1 text-blue-300">
                    <li>• Сеть была добавлена, но данные не сохранились в localStorage</li>
                    <li>• Сеть была перезаписана начальными данными при перезагрузке</li>
                    <li>• localStorage был очищен</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Все сети */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🏢 Все торговые сети</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Найдено сетей: {allNetworks.length}</p>
              {allNetworks.map((network: any, index: number) => (
                <div key={index} className="bg-slate-800 p-3 rounded text-sm border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-white">{network.name}</strong>
                    <span className="text-xs bg-blue-600 px-2 py-1 rounded">ID: {network.id}</span>
                  </div>
                  {network.description && <div className="text-slate-400 mb-2">{network.description}</div>}
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Тип: {network.type}</div>
                    <div>Точек: {network.pointsCount || 0}</div>
                    <div>Создана: {network.created_at ? new Date(network.created_at).toLocaleString() : 'н/д'}</div>
                  </div>
                </div>
              ))}
              {allNetworks.length === 0 && (
                <div className="text-amber-600 text-center py-4">
                  ⚠️ Сети не найдены
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Диагностика торговых точек */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔍 Диагностика торговых точек</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {storageData.find(d => d.key === 'tradingPoints')?.data.map((point: any, index: number) => (
                <div key={index} className="bg-slate-800 p-3 rounded text-sm border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-white">{point.name}</strong>
                    <div className="flex gap-2">
                      <span className="text-xs bg-green-600 px-2 py-1 rounded">ID: {point.id}</span>
                      <span className="text-xs bg-orange-600 px-2 py-1 rounded">NetID: {point.networkId}</span>
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs">
                    {point.geolocation?.address || point.address || 'Адрес не указан'}
                  </div>
                  <div className="text-slate-500 text-xs mt-1">
                    Сеть: {storageData.find(d => d.key === 'networks')?.data.find((n: any) => n.id === point.networkId)?.name || 'Не найдена'}
                  </div>
                </div>
              )) || []}
            </div>
          </CardContent>
        </Card>

        {/* Статистика оборудования и компонентов */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Оборудование */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="text-blue-600 flex items-center gap-2">
                ⚙️ Оборудование в системе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h4 className="text-slate-300 text-sm mb-2">Единиц оборудования</h4>
                    <div className="text-2xl font-bold text-blue-400">
                      {storageData.find(d => d.key === 'equipment')?.count || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h4 className="text-slate-300 text-sm mb-2">Шаблонов оборудования</h4>
                    <div className="text-2xl font-bold text-blue-400">
                      {storageData.find(d => d.key === 'equipmentTemplates')?.count || 0}
                    </div>
                  </div>
                </div>
                
                {storageData.find(d => d.key === 'equipment')?.data?.length > 0 && (
                  <div>
                    <h4 className="text-slate-300 text-sm mb-2">По статусам:</h4>
                    <div className="space-y-1 text-xs">
                      {(() => {
                        const equipment = storageData.find(d => d.key === 'equipment')?.data || [];
                        const statusCounts = equipment.reduce((acc: any, eq: any) => {
                          acc[eq.status] = (acc[eq.status] || 0) + 1;
                          return acc;
                        }, {});
                        return Object.entries(statusCounts).map(([status, count]) => (
                          <div key={status} className="flex justify-between">
                            <span className="text-slate-400 capitalize">{status}:</span>
                            <span className="text-white font-mono">{count}</span>
                          </div>
                        ));
                      })()} 
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Компоненты */}
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                🔧 Компоненты в системе
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h4 className="text-slate-300 text-sm mb-2">Компонентов</h4>
                    <div className="text-2xl font-bold text-green-400">
                      {storageData.find(d => d.key === 'components')?.count || 0}
                    </div>
                  </div>
                  <div className="bg-slate-800 p-3 rounded border border-slate-700">
                    <h4 className="text-slate-300 text-sm mb-2">Шаблонов компонентов</h4>
                    <div className="text-2xl font-bold text-green-400">
                      {storageData.find(d => d.key === 'componentTemplates')?.count || 0}
                    </div>
                  </div>
                </div>
                
                {storageData.find(d => d.key === 'components')?.data?.length > 0 && (
                  <div>
                    <h4 className="text-slate-300 text-sm mb-2">По статусам:</h4>
                    <div className="space-y-1 text-xs">
                      {(() => {
                        const components = storageData.find(d => d.key === 'components')?.data || [];
                        const statusCounts = components.reduce((acc: any, comp: any) => {
                          acc[comp.status] = (acc[comp.status] || 0) + 1;
                          return acc;
                        }, {});
                        return Object.entries(statusCounts).map(([status, count]) => (
                          <div key={status} className="flex justify-between">
                            <span className="text-slate-400 capitalize">{status}:</span>
                            <span className="text-white font-mono">{count}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Общая статистика */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {storageData.map((item) => (
            <Card key={item.key}>
              <CardContent className="pt-4">
                <div className="flex flex-col items-center text-center">
                  <h3 className="font-medium text-sm mb-2">{item.key}</h3>
                  <Badge variant={item.count > 0 ? "default" : "secondary"}>
                    {item.count} записей
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Подробные данные */}
        <div className="space-y-6">
          {storageData.map((item) => (
            <Card key={item.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {item.key}
                  <Badge variant={item.count > 0 ? "default" : "secondary"}>
                    {item.count} записей
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.count > 0 ? (
                  <pre className="bg-slate-800 p-3 rounded text-xs overflow-auto max-h-64">
{JSON.stringify(item.data, null, 2)}
                  </pre>
                ) : (
                  <div className="text-slate-500 text-sm">Нет данных</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}