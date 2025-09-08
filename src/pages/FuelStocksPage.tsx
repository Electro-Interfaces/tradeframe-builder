import React, { useState, useMemo, useEffect } from "react";

// Отладка загрузки модуля
console.log('🚀 FuelStocksPage: Модуль загружается!');
console.log('📅 FuelStocksPage: Время загрузки модуля:', new Date().toISOString());
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, Download, AlertTriangle, Droplets, Gauge, Calendar } from "lucide-react";
import { fuelStocksHistoryService, FuelStockSnapshot } from "@/services/fuelStocksHistoryService";
import { nomenclatureService } from "@/services/nomenclatureService";
import { FuelStocksChart } from "@/components/charts/FuelStocksChart";
import { HelpButton } from "@/components/help/HelpButton";
import { errorLogService } from "@/services/errorLogService";

interface FuelStockRecord {
  id: string;
  tankNumber: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  percentage: number;
  lastUpdated: string;
  tradingPoint?: string;
  status: 'normal' | 'low' | 'critical' | 'overfill';
  temperature: number;
  density: number;
  operationMode?: string;
  consumptionRate?: number;
  fillRate?: number;
}

// ❌ MOCK ДАННЫЕ УДАЛЕНЫ - используются только реальные данные из базы

// Статический список будет заменен на динамический
const statusTypes = ["Все", "normal", "low", "critical", "overfill"];

export default function FuelStocksPage() {
  console.log('🔥 FuelStocksPage: Компонент загружается!');
  console.log('🌐 Текущий URL:', window.location.href);
  console.log('⏰ Время загрузки:', new Date().toISOString());
  
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  console.log('📊 FuelStocksPage: Контекст загружен:', {
    selectedNetworkExists: !!selectedNetwork,
    selectedNetworkId: selectedNetwork?.id,
    selectedNetworkName: selectedNetwork?.name,
    selectedTradingPoint,
    isMobile
  });
  
  // Добавим дополнительные логи для отслеживания состояния
  console.log('🔍 FuelStocksPage: Детальное состояние:', {
    hasSelectedNetwork: selectedNetwork !== null,
    networkId: selectedNetwork?.id || 'НЕТ',
    networkName: selectedNetwork?.name || 'НЕТ',
    tradingPoint: selectedTradingPoint || 'НЕТ',
    shouldLoadData: !!selectedNetwork
  });
  
  // Состояние данных
  const [historicalData, setHistoricalData] = useState<FuelStockSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    // Устанавливаем дату по умолчанию на конец августа 2025, 16:00 местного времени
    return '2025-08-30T16:00'; // Формат для datetime-local
  });
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  
  // Фильтры (убрали фильтр по статусу)
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Состояние для видов топлива из номенклатуры
  const [fuelTypes, setFuelTypes] = useState<string[]>(["Все"]);

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Загружаем данные при изменении даты/времени или выбора точки
  // Изменяем: загружаем данные всегда, не только когда сеть выбрана
  useEffect(() => {
    loadHistoricalData();
  }, [selectedDateTime, selectedNetwork, selectedTradingPoint]);

  // Автоматическое обновление данных каждые 2 часа
  // Изменяем: работает всегда, не только для выбранной сети
  useEffect(() => {
    const REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 часа в миллисекундах
    
    // Устанавливаем время следующего обновления при первой загрузке
    const now = new Date();
    setLastRefreshTime(now);
    setNextRefreshTime(new Date(now.getTime() + REFRESH_INTERVAL));
    
    const intervalId = setInterval(() => {
      console.log('🔄 Автоматическое обновление данных остатков топлива...');
      const refreshTime = new Date();
      setLastRefreshTime(refreshTime);
      setNextRefreshTime(new Date(refreshTime.getTime() + REFRESH_INTERVAL));
      loadHistoricalData();
    }, REFRESH_INTERVAL);

    return () => {
      clearInterval(intervalId);
      setLastRefreshTime(null);
      setNextRefreshTime(null);
    };
  }, [selectedTradingPoint]); // зависимости без selectedDateTime и selectedNetwork

  // Загружаем виды топлива из номенклатуры
  useEffect(() => {
    const loadFuelTypes = async () => {
      try {
        const nomenclature = await nomenclatureService.getAll();
        
        // Фильтруем только активные виды топлива для выбранной сети
        const networkId = selectedNetwork?.id; // Используем только выбранную сеть
        const activeFuelTypes = nomenclature
          .filter(item => 
            item.status === 'active' && 
            (networkId ? item.networkId === networkId : true)
          )
          .map(item => item.name)
          .sort();
          
        console.log('📋 Загружены виды топлива из номенклатуры для FuelStocksPage:', activeFuelTypes);
        setFuelTypes(["Все", ...activeFuelTypes]);
      } catch (error) {
        console.error('Ошибка загрузки номенклатуры:', error);
        // ❌ КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить номенклатуру
        await errorLogService.logCriticalError(
          'FuelStocksPage',
          'loadFuelTypes',
          error instanceof Error ? error : new Error(String(error)),
          {
            user_id: selectedNetwork?.id,
            trading_point_id: selectedTradingPoint,
            metadata: { component: 'FuelStocksPage', action: 'loadNomenclature' }
          }
        );
        throw new Error('Номенклатура топлива недоступна');
      }
    };

    loadFuelTypes();
  }, [selectedNetwork]);

  const loadHistoricalData = async () => {
    console.log('🔄 FuelStocksPage: Загрузка исторических данных...', selectedDateTime);
    try {
      setLoading(true);
      
      // Принудительно очищаем кэш при первом запуске для обеспечения свежих данных
      console.log('🗑️ Очищаем кэш исторических данных...');
      fuelStocksHistoryService.clearCache();
      
      console.log('📊 FuelStocksPage: Получаем снимки на', selectedDateTime);
      // Try to get historical snapshots
      let snapshots = await fuelStocksHistoryService.getSnapshotAtDateTime(selectedDateTime);
      console.log('📊 FuelStocksPage: Получено снимков:', snapshots.length);
      
      if (snapshots.length > 0) {
        console.log('📋 Первые снимки:', snapshots.slice(0, 3).map(s => ({
          id: s.id,
          tankName: s.tankName,
          fuelType: s.fuelType,
          tradingPointId: s.tradingPointId,
          currentLevel: s.currentLevelLiters
        })));
      }
      
      // ❌ БЕЗ FALLBACK: Если нет данных - показываем ошибку
      if (snapshots.length === 0) {
        throw new Error(`Нет данных об остатках топлива на ${selectedDateTime}`);
      }
      
      console.log('📊 FuelStocksPage: Устанавливаем данные:', snapshots.length, 'снимков');
      setHistoricalData(snapshots);
    } catch (error) {
      // ❌ КРИТИЧЕСКАЯ ОШИБКА: не удалось загрузить данные об остатках топлива
      await errorLogService.logCriticalError(
        'FuelStocksPage',
        'loadHistoricalData', 
        error instanceof Error ? error : new Error(String(error)),
        {
          user_id: selectedNetwork?.id,
          trading_point_id: selectedTradingPoint,
          metadata: { 
            component: 'FuelStocksPage', 
            action: 'loadHistoricalData',
            selectedDateTime,
            networkId: selectedNetwork?.id
          }
        }
      );
      throw new Error(`Не удалось загрузить данные об остатках топлива: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Конвертируем исторические данные в формат FuelStockRecord
  const convertToFuelStockRecords = (snapshots: FuelStockSnapshot[]): FuelStockRecord[] => {
    return snapshots
      .filter(snapshot => {
        // Фильтруем по выбранной торговой точке
        // Если selectedTradingPoint пуст или равен 'all', показываем все записи
        if (selectedTradingPoint && selectedTradingPoint !== 'all') {
          return snapshot.tradingPointId === selectedTradingPoint;
        }
        return true;
      })
      .map(snapshot => {
        const status = getStatusFromPercentage(snapshot.levelPercent);
        return {
          id: snapshot.id,
          tankNumber: snapshot.tankName,
          fuelType: snapshot.fuelType,
          capacity: snapshot.capacityLiters,
          currentLevel: snapshot.currentLevelLiters,
          percentage: snapshot.levelPercent,
          lastUpdated: new Date(snapshot.timestamp).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          tradingPoint: getPointNameById(snapshot.tradingPointId),
          status,
          temperature: snapshot.temperature,
          density: snapshot.density,
          operationMode: snapshot.operationMode,
          consumptionRate: snapshot.consumptionRate,
          fillRate: snapshot.fillRate
        };
      });
  };

  const getStatusFromPercentage = (percentage: number): 'normal' | 'low' | 'critical' | 'overfill' => {
    if (percentage >= 95) return 'overfill';
    if (percentage >= 20) return 'normal';
    if (percentage >= 10) return 'low';
    return 'critical';
  };

  const getPointNameById = (pointId: string): string => {
    const pointNames: Record<string, string> = {
      'point1': 'АЗС №001 - Центральная',
      'point2': 'АЗС №002 - Северная', 
      'point3': 'АЗС №003 - Южная',
      'point4': 'АЗС №004 - Московское шоссе',
      'point5': 'АЗС №005 - Промзона'
    };
    return pointNames[pointId] || `Торговая точка ${pointId}`;
  };

  // ✅ ТОЛЬКО реальные данные - БЕЗ mock fallback
  const currentFuelStocks = convertToFuelStockRecords(historicalData);
    
  // ✅ Отладка реальных данных
  console.log('🔍 FuelStocksPage - только реальные данные:', {
    selectedNetworkId: selectedNetwork?.id,
    historicalDataCount: historicalData.length,
    currentFuelStocksCount: currentFuelStocks.length,
    loading: loading
  });


  // Фильтрация данных (убрали фильтр по статусу)
  const filteredStocks = useMemo(() => {
    return currentFuelStocks.filter(record => {
      // Фильтр по типу топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.tankNumber.toLowerCase().includes(query) ||
          record.fuelType.toLowerCase().includes(query) ||
          (record.tradingPoint && record.tradingPoint.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [currentFuelStocks, selectedFuelType, searchQuery]);

  // KPI данные - сумма объемов по типам топлива
  const fuelKpis = useMemo(() => {
    const totals: Record<string, number> = {};
    
    filteredStocks.forEach(record => {
      if (!totals[record.fuelType]) {
        totals[record.fuelType] = 0;
      }
      totals[record.fuelType] += record.currentLevel;
    });

    return Object.entries(totals).map(([fuelType, volume]) => ({
      fuelType,
      volume
    }));
  }, [filteredStocks]);

  const getStatusBadge = (status: string, percentage: number) => {
    switch (status) {
      case 'normal':
        return <Badge className="bg-slate-600 text-slate-200">Норма</Badge>;
      case 'low':
        return <Badge className="bg-slate-600 text-slate-200">Низкий</Badge>;
      case 'critical':
        return <Badge className="bg-slate-700 text-slate-300">Критичный</Badge>;
      case 'overfill':
        return <Badge className="bg-slate-700 text-slate-300">Переполнение</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 50) return "text-slate-300";
    if (percentage >= 20) return "text-slate-300";
    return "text-slate-400";
  };

  const formatVolume = (volume: number) => volume.toLocaleString('ru-RU') + " л";

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 pb-8">
        {/* Заголовок страницы */}
        <div className="mb-6 px-4 md:px-6 lg:px-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Остатки топлива</h1>
              <p className="text-slate-400 mt-2">
                {isNetworkOnly && "Отчет по остаткам топлива торговой сети"}
                {isTradingPointSelected && "Отчет по остаткам топлива торговой точки"}
                {!selectedNetwork && "Выберите сеть для просмотра остатков топлива"}
              </p>
              
              {/* Отладочная информация */}
              <div className="mt-3 p-2 bg-blue-900/20 rounded-lg text-xs text-blue-300">
                <div>🔍 Отладка: Компонент загружен</div>
                <div>📊 Сеть: {selectedNetwork?.name || 'НЕТ'} (ID: {selectedNetwork?.id || 'НЕТ'})</div>
                <div>🏪 Точка: {selectedTradingPoint || 'не выбрана'}</div>
                <div>📅 Время: {selectedDateTime}</div>
                <div>📈 Истор. данные: {historicalData.length} снимков</div>
                <div>🏪 Тек. остатки: {currentFuelStocks.length} записей</div>
                <div>📁 Mock данные: {mockFuelStocks.length} записей</div>
                <div>🔄 Загрузка: {loading ? 'Да' : 'Нет'}</div>
                <div>✅ Есть сеть: {selectedNetwork ? 'Да' : 'НЕТ'}</div>
                <div>🎛️ Источник данных: {historicalData.length > 0 ? 'Исторические' : 'Mock'}</div>
                <div>📊 Фильтрованных: {filteredStocks.length} записей</div>
              </div>
              

            </div>
            <HelpButton helpKey="fuel-stocks" />
          </div>
        </div>

        {/* Показываем интерфейс всегда, не только для выбранной сети */}
        <>
          {/* График динамики остатков */}
          <div className="report-margins">
            <div className="grid grid-cols-1 gap-4">
              <FuelStocksChart 
                selectedNetwork={selectedNetwork?.id || null}
                selectedTradingPoint={selectedTradingPoint}
              />
              
              {/* Компактные фильтры для таблицы */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Calendar className="w-4 h-4" />
                      Остатки на время
                      <Button variant="outline" className="ml-auto flex-shrink-0 text-sm">
                        <Download className="w-3 h-3 mr-1" />
                        Экспорт
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-3'}`}>
                      {/* Компактный селектор даты и времени */}
                      <div>
                        <Label className="text-slate-300 flex items-center gap-1 mb-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          Дата и время
                          {loading && <span className="text-xs text-slate-500">(загрузка...)</span>}
                        </Label>
                        <Input
                          type="datetime-local"
                          value={selectedDateTime}
                          onChange={(e) => setSelectedDateTime(e.target.value)}
                          min="2025-08-01T00:00"
                          max="2025-08-31T23:59"
                          className="bg-slate-700 border-slate-600 text-white text-sm h-9 [&::-webkit-datetime-edit-text]:text-white [&::-webkit-datetime-edit-month-field]:text-white [&::-webkit-datetime-edit-day-field]:text-white [&::-webkit-datetime-edit-year-field]:text-white [&::-webkit-datetime-edit-hour-field]:text-white [&::-webkit-datetime-edit-minute-field]:text-white"
                        />
                        <div className="text-xs mt-1 space-y-0.5">
                          <p className="text-slate-300">Август 2025, шаг 4ч</p>
                          {lastRefreshTime && (
                            <p className="text-green-400">
                              ↻ Обновлено: {lastRefreshTime.toLocaleTimeString('ru-RU')}
                            </p>
                          )}
                          {nextRefreshTime && (
                            <p className="text-blue-400">
                              ⏰ Следующее: {nextRefreshTime.toLocaleTimeString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Фильтр по топливу</Label>
                        <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fuelTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-300 text-sm">Поиск по резервуарам</Label>
                        <Input
                          placeholder="Название резервуара..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 text-sm h-9"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* KPI - Объемы топлива */}
            <div className="report-margins">
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'}`}>
              {fuelKpis.map(({ fuelType, volume }) => (
                <Card key={fuelType} className="bg-slate-800 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-3 pt-3">
                    <CardTitle className="text-xs font-medium text-slate-200">
                      {fuelType}
                    </CardTitle>
                    <Fuel className="h-3 w-3 text-slate-400" />
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <div className="text-lg font-bold text-white">
                      {formatVolume(volume)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Общий объем
                    </p>
                  </CardContent>
                </Card>
              ))}
              {fuelKpis.length === 0 && (
                <Card className="bg-slate-800 border-slate-700 col-span-full">
                  <CardContent className="p-4 text-center">
                    <div className="text-sm text-slate-400">
                      Нет данных по выбранным фильтрам
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            </div>

            {/* Таблица остатков */}
            <div className="report-margins">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Fuel className="w-5 h-5" />
                  Остатки топлива
                  <Badge variant="secondary" className="ml-auto">
                    {filteredStocks.length} резервуаров
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {filteredStocks.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Gauge className="w-4 h-4 text-slate-400" />
                              <span className="font-medium text-white">{record.tankNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.status === 'critical' && <AlertTriangle className="w-4 h-4 text-slate-400" />}
                              {record.status === 'low' && <Droplets className="w-4 h-4 text-slate-400" />}
                              {getStatusBadge(record.status, record.percentage)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-slate-600 text-slate-200">
                              {record.fuelType}
                            </Badge>
                            <span className="text-xs text-slate-400">{record.lastUpdated}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-400">Объем:</span>
                              <span className="text-white font-mono">
                                {formatVolume(record.currentLevel)} / {formatVolume(record.capacity)}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Заполнение:</span>
                                <span className={`font-mono text-sm ${getPercentageColor(record.percentage)}`}>
                                  {record.percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full ${
                                    record.percentage >= 50 ? 'bg-slate-400' :
                                    record.percentage >= 20 ? 'bg-slate-500' : 'bg-slate-600'
                                  }`}
                                  style={{ width: `${Math.min(record.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Температура:</span>
                              <span className="text-white font-mono ml-1">{record.temperature}°C</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Плотность:</span>
                              <span className="text-white font-mono ml-1">{record.density} г/см³</span>
                            </div>
                            {record.operationMode && (
                              <div className="col-span-2">
                                <span className="text-slate-400">Режим:</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {record.operationMode === 'normal' ? 'Норм.' :
                                   record.operationMode === 'filling' ? 'Заправка' :
                                   record.operationMode === 'draining' ? 'Слив' : 
                                   record.operationMode === 'maintenance' ? 'ТО' : record.operationMode}
                                </Badge>
                              </div>
                            )}
                          </div>
                          
                          {isNetworkOnly && record.tradingPoint && (
                            <div className="text-sm border-t border-slate-600 pt-2">
                              <span className="text-slate-400">Торговая точка:</span>
                              <div className="text-slate-300 font-medium">{record.tradingPoint}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {filteredStocks.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет данных по выбранным фильтрам
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Резервуар</TableHead>
                          <TableHead className="text-slate-300">Топливо</TableHead>
                          <TableHead className="text-slate-300">Емкость</TableHead>
                          <TableHead className="text-slate-300">Текущий объем</TableHead>
                          <TableHead className="text-slate-300">Заполнение</TableHead>
                          <TableHead className="text-slate-300">Температура</TableHead>
                          <TableHead className="text-slate-300">Плотность</TableHead>
                          <TableHead className="text-slate-300">Режим</TableHead>
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                          <TableHead className="text-slate-300">Время снимка</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStocks.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell className="text-white font-medium">
                              <div className="flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-slate-400" />
                                {record.tankNumber}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                {record.fuelType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatVolume(record.capacity)}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatVolume(record.currentLevel)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-600 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      record.percentage >= 50 ? 'bg-green-500' :
                                      record.percentage >= 20 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(record.percentage, 100)}%` }}
                                  />
                                </div>
                                <span className={`font-mono text-sm ${getPercentageColor(record.percentage)}`}>
                                  {record.percentage}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono">
                              {record.temperature}°C
                            </TableCell>
                            <TableCell className="text-slate-300 font-mono">
                              {record.density} г/см³
                            </TableCell>
                            <TableCell>
                              {record.operationMode && (
                                <Badge variant="outline" className="text-xs">
                                  {record.operationMode === 'normal' ? 'Норма' :
                                   record.operationMode === 'filling' ? 'Заправка' :
                                   record.operationMode === 'draining' ? 'Слив' :
                                   record.operationMode === 'maintenance' ? 'ТО' : record.operationMode}
                                </Badge>
                              )}
                            </TableCell>
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300 max-w-xs">
                                <div className="truncate" title={record.tradingPoint}>
                                  {record.tradingPoint}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {record.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                {record.status === 'low' && <Droplets className="w-4 h-4 text-yellow-400" />}
                                {getStatusBadge(record.status, record.percentage)}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300 text-sm">
                              {record.lastUpdated}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredStocks.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет данных по выбранным фильтрам
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
        </>

        {/* Ошибка при отсутствии данных */}
        {!selectedNetwork && (
          <div className="report-margins">
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-400 mb-2">Данные недоступны</h3>
              <p className="text-red-300">Для отображения остатков топлива необходимо выбрать торговую сеть</p>
            </CardContent>
          </Card>
          </div>
        )}
        
        {currentFuelStocks.length === 0 && selectedNetwork && (
          <div className="report-margins">
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-400 mb-2">Нет данных об остатках топлива</h3>
              <p className="text-red-300">Данные на выбранную дату/время отсутствуют в системе</p>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}