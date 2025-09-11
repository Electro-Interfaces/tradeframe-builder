import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/context/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { stsApiService, TerminalInfo, Tank } from "@/services/stsApi";
import { MobileButton } from "@/components/ui/mobile-button";
import { MobileTable } from "@/components/ui/mobile-table";
import { 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw,
  Thermometer,
  Gauge,
  Fuel,
  Database,
  Banknote,
  CreditCard
} from "lucide-react";

interface TerminalEquipmentItem {
  id: string;
  name: string;
  code: string;
  location: string;
  status: 'online' | 'offline' | 'error';
  statusText: string;
  billCount?: number;
  billAmount?: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'online':
    case 'normal':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case 'offline':
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Settings className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online':
    case 'normal':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'offline':
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const getFillLevelColor = (level: number) => {
  if (level >= 70) return 'bg-green-500';
  if (level >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [terminalEquipment, setTerminalEquipment] = useState<TerminalEquipmentItem[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [terminalInfo, setTerminalInfo] = useState<TerminalInfo | null>(null);

  // Загружаем данные при монтировании или изменении торговой точки
  // Упрощенная автоматическая загрузка данных оборудования при инициализации
  useEffect(() => {
    console.log('🔧 Инициализация раздела оборудования...');
    
    // Обеспечиваем правильную настройку STS API
    ensureSTSApiConfigured();
    
    // Автоматически загружаем данные оборудования при выборе торговой точки
    if (selectedTradingPoint && selectedTradingPoint !== 'all' && selectedNetwork?.external_id) {
      console.log('🚀 Автоматическая загрузка данных оборудования для торговой точки:', selectedTradingPoint);
      loadEquipmentData();
    }
  }, [selectedTradingPoint, selectedNetwork]);

  // Функция для настройки STS API с правильными параметрами
  const ensureSTSApiConfigured = () => {
    console.log('🔧 Проверяем и настраиваем STS API конфигурацию...');
    
    const correctConfig = {
      url: 'https://pos.autooplata.ru/tms',
      username: 'UserApi',
      password: 'lHQfLZHzB3tn',
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      refreshInterval: 20 * 60 * 1000 // 20 минут
    };
    
    // Проверяем текущую конфигурацию
    const currentConfig = localStorage.getItem('sts-api-config');
    let needsUpdate = false;
    
    if (currentConfig) {
      try {
        const parsed = JSON.parse(currentConfig);
        // Проверяем, что все нужные параметры совпадают
        if (parsed.url !== correctConfig.url || 
            parsed.username !== correctConfig.username || 
            parsed.password !== correctConfig.password ||
            !parsed.enabled) {
          needsUpdate = true;
        }
      } catch {
        needsUpdate = true;
      }
    } else {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('🔧 Обновляем конфигурацию STS API с правильными параметрами');
      localStorage.setItem('sts-api-config', JSON.stringify(correctConfig));
    }
    
    return correctConfig;
  };

  const loadEquipmentData = async () => {
    if (!selectedTradingPoint || !selectedNetwork?.external_id) return;
    
    setLoading(true);
    try {
      // Обеспечиваем правильную настройку STS API
      ensureSTSApiConfigured();
      
      // Параметры для API
      const contextParams = {
        networkId: selectedNetwork.external_id,
        tradingPointId: selectedTradingPoint
      };

      console.log('🔄 Загружаем данные оборудования из STS API...');

      // Загружаем данные параллельно (stsApiService сам управляет авторизацией)
      const [terminalInfoData, tanksData] = await Promise.all([
        stsApiService.getTerminalInfo(contextParams),
        stsApiService.getTanks(contextParams)
      ]);

      setTerminalInfo(terminalInfoData);
      setTanks(tanksData);
      
      // Преобразуем данные терминала в формат для отображения
      const equipmentItems = mapTerminalInfoToEquipment(terminalInfoData);
      setTerminalEquipment(equipmentItems);

      toast({
        title: "Данные загружены",
        description: "Информация об оборудовании успешно получена от СТС"
      });
    } catch (error) {
      console.error('Ошибка загрузки данных оборудования:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные оборудования. Используются демо-данные.",
        variant: "destructive"
      });
      // При ошибке показываем заглушку
      setTerminalEquipment(getMockTerminalEquipment());
      setTanks(getMockTanks());
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadEquipmentData();
  };

  // Преобразует данные из TerminalInfo в формат для отображения
  const mapTerminalInfoToEquipment = (info: TerminalInfo): TerminalEquipmentItem[] => {
    const equipment: TerminalEquipmentItem[] = [];

    // АЗС (основной терминал)
    equipment.push({
      id: 'azs',
      name: 'АЗС',
      code: info.terminal.name || 'АЗС',
      location: '',
      status: info.terminal.status,
      statusText: info.terminal.status === 'online' ? 'Онлайн' : 'Офлайн'
    });

    // POS терминал
    equipment.push({
      id: 'pos',
      name: 'POS',
      code: info.pos.version || 'POS 1',
      location: '',
      status: info.pos.status,
      statusText: info.pos.status === 'online' ? 'Онлайн' : 'Офлайн'
    });

    // QR (на основе статуса смены)
    equipment.push({
      id: 'qr',
      name: 'QR',
      code: 'Готов',
      location: info.shift ? `Смена №${info.shift.number}` : '',
      status: info.shift?.state === 'Открытая' ? 'online' : 'offline',
      statusText: 'Готов'
    });

    // Купюроприемник с данными о купюрах
    if (info.devices?.billAcceptor) {
      // Используем уже обработанный статус из STS API сервиса
      const deviceStatus = info.devices.billAcceptor.status; // 'online' или 'error'
      const isOnline = deviceStatus === 'online';
      
      console.log('🎯 Статус купюроприемника (обработанный):', {
        status: deviceStatus,
        isOnline: isOnline,
        billCount: info.devices.billAcceptor.billCount,
        billAmount: info.devices.billAcceptor.billAmount,
        name: info.devices.billAcceptor.name
      });
      
      equipment.push({
        id: 'bill-acceptor',
        name: 'Купюроприемник',
        code: `ID: ${info.devices.billAcceptor.name}`,
        location: `Устройство ${info.devices.billAcceptor.name}`,
        status: deviceStatus, // Используем уже правильно обработанный статус
        statusText: isOnline ? 'Готов' : 'Ошибка',
        billCount: info.devices.billAcceptor.billCount,
        billAmount: info.devices.billAcceptor.billAmount
      });
    }

    // Картридер
    if (info.devices?.cardReader) {
      equipment.push({
        id: 'card-reader',
        name: 'Картридер',
        code: info.devices.cardReader.status === 'online' ? 'Готов' : 'Ошибка',
        location: `ID: ${info.devices.cardReader.name}`,
        status: info.devices.cardReader.status,
        statusText: info.devices.cardReader.status === 'online' ? 'Готов' : 'Ошибка'
      });
    }

    // МПС-ридер
    if (info.devices?.mpsReader) {
      equipment.push({
        id: 'mps-reader',
        name: 'МПС-ридер',
        code: info.devices.mpsReader.status === 'online' ? 'Готов' : 'Ошибка',
        location: `ID: ${info.devices.mpsReader.name}`,
        status: info.devices.mpsReader.status,
        statusText: info.devices.mpsReader.status === 'online' ? 'Готов' : 'Ошибка'
      });
    }

    return equipment;
  };

  // Fallback mock данные
  const getMockTerminalEquipment = (): TerminalEquipmentItem[] => [
    { id: 'azs-1', name: 'АЗС', code: 'АЗК 4', location: 'ТК Т-4', status: 'offline', statusText: 'Офлайн' },
    { id: 'pos-1', name: 'POS', code: 'POS 1', location: '', status: 'online', statusText: 'Онлайн' },
    { id: 'qr-1', name: 'QR', code: 'Готов', location: 'Смена №13', status: 'online', statusText: 'Готов' },
    { id: 'inspector-1', name: 'Купюроприемник', code: 'ID: 10', location: 'Устройство 10', status: 'online', statusText: 'Готов', billCount: 341, billAmount: 153450 },
    { id: 'card-reader-1', name: 'Картридер', code: 'Готов', location: 'ID: 11', status: 'online', statusText: 'Готов' },
    { id: 'mps-river-1', name: 'МПС-ривер', code: 'Готов', location: 'ID: 15', status: 'online', statusText: 'Готов' }
  ];

  const getMockTanks = (): Tank[] => [
    {
      id: 1, name: 'Резервуар №1', fuelType: 'Дизельное топливо',
      currentLevelLiters: 7595.83, capacityLiters: 10129.88, minLevelPercent: 20, criticalLevelPercent: 10,
      temperature: 19.0, waterLevelMm: 0, sensors: [], lastCalibration: '', linkedPumps: [],
      notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
      thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 10, notifications: { critical: true, minimum: true, temperature: true, water: true } }
    },
    {
      id: 2, name: 'Резервуар №2', fuelType: 'АИ-95',
      currentLevelLiters: 4287.96, capacityLiters: 10303.61, minLevelPercent: 20, criticalLevelPercent: 10,
      temperature: 18.6, waterLevelMm: 0.58, sensors: [], lastCalibration: '', linkedPumps: [],
      notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
      thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 10, notifications: { critical: true, minimum: true, temperature: true, water: true } }
    },
    {
      id: 3, name: 'Резервуар №3', fuelType: 'АИ-92',
      currentLevelLiters: 6266.36, capacityLiters: 10489.90, minLevelPercent: 20, criticalLevelPercent: 10,
      temperature: 19.0, waterLevelMm: 0, sensors: [], lastCalibration: '', linkedPumps: [],
      notifications: { enabled: true, drainAlerts: true, levelAlerts: true },
      thresholds: { criticalTemp: { min: -10, max: 40 }, maxWaterLevel: 10, notifications: { critical: true, minimum: true, temperature: true, water: true } }
    }
  ];

  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
            <p className="text-slate-400 mt-2">Выберите торговую точку для просмотра оборудования</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
              <p className="text-slate-400 mt-1 hidden md:block">{selectedNetwork?.name || 'БТО АЗС №4'}</p>
            </div>
            <div className="flex items-center gap-2">
              <MobileButton
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
                className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="hidden md:inline ml-2">Обновить STS данные</span>
                <span className="md:hidden ml-2">STS</span>
              </MobileButton>
            </div>
          </div>
        </div>

        {/* Терминальное оборудование */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Терминальное оборудование</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">8 ед.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Фильтруем оборудование: купюроприемник отдельно, остальное в сетке */}
            {(() => {
              const billAcceptor = terminalEquipment.find(eq => eq.name === 'Купюроприемник');
              const otherEquipment = terminalEquipment.filter(eq => eq.name !== 'Купюроприемник');
              
              return (
                <div className="space-y-6">
                  {/* Купюроприемник - отдельная большая карточка */}
                  {billAcceptor && (
                    <div className="bg-slate-700 rounded-lg p-6 border border-slate-600 hover:border-slate-500 transition-colors">
                      <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between gap-6'}`}>
                        {/* Название и ID */}
                        <div className={`flex items-center gap-3 ${isMobile ? 'w-full justify-center' : ''}`}>
                          <Banknote className="w-6 h-6 text-green-400" />
                          <div className={isMobile ? 'text-center' : ''}>
                            <h3 className="text-lg font-semibold text-white">{billAcceptor.name}</h3>
                            <p className="text-sm text-slate-400">{billAcceptor.location}</p>
                          </div>
                        </div>
                        
                        {/* Данные и статус */}
                        <div className={`${isMobile ? 'w-full grid grid-cols-3 gap-4' : 'flex gap-6'}`}>
                          {/* Количество купюр */}
                          <div className="text-center">
                            <div className="text-3xl font-bold text-green-400">
                              {billAcceptor.billCount || 0}
                            </div>
                            <div className="text-sm text-slate-300">купюр</div>
                          </div>
                          
                          {/* Сумма */}
                          <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">
                              {(billAcceptor.billAmount || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-300">₽</div>
                          </div>
                          
                          {/* Статус */}
                          <div className="flex flex-col items-center gap-2">
                            {getStatusIcon(billAcceptor.status)}
                            <Badge 
                              className={`${
                                billAcceptor.status === 'online' 
                                  ? 'bg-green-600 text-white hover:bg-green-700 text-base px-3 py-1 font-semibold' 
                                  : 'bg-red-600 text-white hover:bg-red-700 text-base px-3 py-1 font-semibold'
                              }`}
                            >
                              {billAcceptor.statusText}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Остальное оборудование в сетке */}
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
                    {otherEquipment.map((equipment) => (
                      <div
                        key={equipment.id}
                        className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{equipment.name}</span>
                          {getStatusIcon(equipment.status)}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-slate-300">{equipment.code}</div>
                          {equipment.location && (
                            <div className="text-xs text-slate-400">{equipment.location}</div>
                          )}
                        </div>
                        
                        <div className="mt-3">
                          <Badge 
                            className={`text-xs font-semibold ${
                              equipment.status === 'online' && equipment.statusText === 'Готов'
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : equipment.status === 'online'
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {equipment.statusText}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Резервуары */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">Резервуары</CardTitle>
                  <p className="text-sm text-slate-400 mt-1 hidden md:block">Всего резервуаров: 3</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                Обновить
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <MobileTable showScrollHint={true}>
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="text-left border-b border-slate-600">
                    <tr>
                      <th className="pb-3 text-slate-300 font-medium">Резервуар</th>
                      <th className="pb-3 text-slate-300 font-medium">Топливо</th>
                      <th className="pb-3 text-slate-300 font-medium">Объем емкости</th>
                      <th className="pb-3 text-slate-300 font-medium">Уровень</th>
                      <th className="pb-3 text-slate-300 font-medium">Заполнение</th>
                      <th className="pb-3 text-slate-300 font-medium">Температура</th>
                      <th className="pb-3 text-slate-300 font-medium">Вода</th>
                      <th className="pb-3 text-slate-300 font-medium">Датчики</th>
                      <th className="pb-3 text-slate-300 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tanks.map((tank) => {
                      const fillLevel = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
                      const tankStatus = fillLevel < tank.criticalLevelPercent ? 'critical' : fillLevel < tank.minLevelPercent ? 'warning' : 'normal';
                      
                      return (
                        <tr key={tank.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-green-500" />
                              <span className="text-white font-medium">{tank.name}</span>
                            </div>
                          </td>
                          <td className="py-4 text-slate-300">{tank.fuelType}</td>
                          <td className="py-4 text-slate-300">{tank.capacityLiters.toLocaleString()} л</td>
                          <td className="py-4 text-slate-300">{tank.currentLevelLiters.toLocaleString()} л</td>
                          <td className="py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-600 rounded-full h-2 min-w-[60px]">
                                <div
                                  className={`h-2 rounded-full ${getFillLevelColor(fillLevel)}`}
                                  style={{ width: `${Math.max(fillLevel, 2)}%` }}
                                />
                              </div>
                              <span className="text-sm text-slate-300 min-w-[35px]">{Math.round(fillLevel)}%</span>
                            </div>
                          </td>
                          <td className="py-4 text-slate-300">
                            <div className="flex items-center gap-1">
                              <Thermometer className="w-4 h-4 text-blue-400" />
                              {tank.temperature}°C
                            </div>
                          </td>
                          <td className="py-4 text-slate-300">{tank.waterLevelMm} мм</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                                <span className="text-xs text-slate-400">Уровень</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-400 rounded-full" />
                                <span className="text-xs text-slate-400">Температура</span>
                              </div>
                              {tank.waterLevelMm > 0 && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                                  <span className="text-xs text-slate-400">Подтоварная вода</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge 
                              variant={tankStatus === 'normal' ? 'default' : 'secondary'}
                              className={`${
                                tankStatus === 'normal' 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                  : tankStatus === 'warning'
                                  ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {tankStatus === 'normal' ? 'Норма' : tankStatus === 'warning' ? 'Мало' : 'Критично'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </MobileTable>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {tanks.map((tank) => {
                const fillLevel = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
                const tankStatus = fillLevel < tank.criticalLevelPercent ? 'critical' : fillLevel < tank.minLevelPercent ? 'warning' : 'normal';
                
                return (
                  <div key={tank.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    {/* Tank Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-500" />
                        <span className="text-white font-medium text-lg">{tank.name}</span>
                      </div>
                      <Badge 
                        variant={tankStatus === 'normal' ? 'default' : 'secondary'}
                        className={`${
                          tankStatus === 'normal' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : tankStatus === 'warning'
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {tankStatus === 'normal' ? 'Норма' : tankStatus === 'warning' ? 'Мало' : 'Критично'}
                      </Badge>
                    </div>

                    {/* Fuel Type */}
                    <div className="flex items-center gap-2 mb-3">
                      <Fuel className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 font-medium">{tank.fuelType}</span>
                    </div>

                    {/* Fill Level Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-400">Заполнение</span>
                        <span className="text-sm text-white font-medium">{Math.round(fillLevel)}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${getFillLevelColor(fillLevel)}`}
                          style={{ width: `${Math.max(fillLevel, 2)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{tank.currentLevelLiters.toLocaleString()} л</span>
                        <span>{tank.capacityLiters.toLocaleString()} л</span>
                      </div>
                    </div>

                    {/* Temperature and Water */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Thermometer className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-xs text-slate-400">Температура</div>
                          <div className="text-sm text-white font-medium">{tank.temperature}°C</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-400 rounded-full" />
                        <div>
                          <div className="text-xs text-slate-400">Вода</div>
                          <div className="text-sm text-white font-medium">{tank.waterLevelMm} мм</div>
                        </div>
                      </div>
                    </div>

                    {/* Sensors */}
                    <div>
                      <div className="text-xs text-slate-400 mb-2">Датчики</div>
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1 bg-slate-600/50 rounded px-2 py-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full" />
                          <span className="text-xs text-slate-300">Уровень</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-600/50 rounded px-2 py-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                          <span className="text-xs text-slate-300">Температура</span>
                        </div>
                        {tank.waterLevelMm > 0 && (
                          <div className="flex items-center gap-1 bg-slate-600/50 rounded px-2 py-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-xs text-slate-300">Подтоварная вода</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}