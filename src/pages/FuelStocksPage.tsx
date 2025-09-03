import React, { useState, useMemo, useEffect } from "react";
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
import { FuelStocksChart } from "@/components/charts/FuelStocksChart";
import { HelpButton } from "@/components/help/HelpButton";

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

// Mock данные остатков топлива
const mockFuelStocks: FuelStockRecord[] = [
  {
    id: "1",
    tankNumber: "Резервуар №1",
    fuelType: "АИ-95",
    capacity: 50000,
    currentLevel: 42500,
    percentage: 85,
    lastUpdated: "2024-12-07 14:30",
    tradingPoint: "АЗС №001 - Московское шоссе",
    status: 'normal',
    temperature: 15.2,
    density: 0.755
  },
  {
    id: "2",
    tankNumber: "Резервуар №2", 
    fuelType: "АИ-92",
    capacity: 40000,
    currentLevel: 8500,
    percentage: 21,
    lastUpdated: "2024-12-07 14:25",
    tradingPoint: "АЗС №001 - Московское шоссе",
    status: 'low',
    temperature: 14.8,
    density: 0.745
  },
  {
    id: "3",
    tankNumber: "Резервуар №3",
    fuelType: "ДТ",
    capacity: 30000,
    currentLevel: 2100,
    percentage: 7,
    lastUpdated: "2024-12-07 14:20",
    tradingPoint: "АЗС №001 - Московское шоссе",
    status: 'critical',
    temperature: 16.1,
    density: 0.840
  },
  {
    id: "4",
    tankNumber: "Резервуар №1",
    fuelType: "АИ-95",
    capacity: 45000,
    currentLevel: 38250,
    percentage: 85,
    lastUpdated: "2024-12-07 14:35",
    tradingPoint: "АЗС №002 - Ленинградский проспект",
    status: 'normal',
    temperature: 15.5,
    density: 0.752
  },
  {
    id: "5",
    tankNumber: "Резервуар №2",
    fuelType: "АИ-92", 
    capacity: 35000,
    currentLevel: 28700,
    percentage: 82,
    lastUpdated: "2024-12-07 14:32",
    tradingPoint: "АЗС №002 - Ленинградский проспект",
    status: 'normal',
    temperature: 14.9,
    density: 0.748
  },
  {
    id: "6",
    tankNumber: "Резервуар №3",
    fuelType: "ДТ",
    capacity: 40000,
    currentLevel: 35600,
    percentage: 89,
    lastUpdated: "2024-12-07 14:28",
    tradingPoint: "АЗС №002 - Ленинградский проспект",
    status: 'normal',
    temperature: 15.8,
    density: 0.838
  },
  {
    id: "7",
    tankNumber: "Резервуар №1",
    fuelType: "АИ-95",
    capacity: 35000,
    currentLevel: 1750,
    percentage: 5,
    lastUpdated: "2024-12-07 14:18",
    tradingPoint: "АЗС №003 - Садовое кольцо",
    status: 'critical',
    temperature: 15.0,
    density: 0.758
  }
];

const fuelTypes = ["Все", "АИ-95", "АИ-92", "ДТ"];
const statusTypes = ["Все", "normal", "low", "critical", "overfill"];

export default function FuelStocksPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных
  const [historicalData, setHistoricalData] = useState<FuelStockSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    const now = new Date('2025-08-30T16:00:00Z'); // По умолчанию конец августа
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  });
  
  // Фильтры (убрали фильтр по статусу)
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Загружаем данные при изменении даты/времени или выбора точки
  useEffect(() => {
    if (selectedNetwork) {
      loadHistoricalData();
    }
  }, [selectedDateTime, selectedNetwork, selectedTradingPoint]);

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      
      // Try to get historical snapshots
      let snapshots = await fuelStocksHistoryService.getSnapshotAtDateTime(selectedDateTime);
      
      // If no historical data, try to generate some or fall back to tank-based data
      if (snapshots.length === 0) {
        // Try to get all historical data to trigger generation
        const allHistoricalData = await fuelStocksHistoryService.getHistoricalData();
        
        // Try again to get snapshots after generation
        snapshots = await fuelStocksHistoryService.getSnapshotAtDateTime(selectedDateTime);
        
        // If still no data, generate basic snapshots from current tank data
        if (snapshots.length === 0) {
          const { tanksService } = await import('@/services/tanksService');
          const tanks = await tanksService.getTanks();
          
          // Generate snapshots from current tank data
          snapshots = tanks.map(tank => ({
            id: `fallback_${tank.id}_${Date.now()}`,
            tankId: tank.id,
            tankName: tank.name,
            fuelType: tank.fuelType,
            tradingPointId: tank.trading_point_id,
            timestamp: selectedDateTime,
            currentLevelLiters: tank.currentLevelLiters,
            capacityLiters: tank.capacityLiters,
            levelPercent: Math.round((tank.currentLevelLiters / tank.capacityLiters) * 100 * 100) / 100,
            temperature: tank.temperature,
            waterLevelMm: tank.waterLevelMm,
            density: tank.density,
            status: tank.status,
            consumptionRate: 150,
            fillRate: 0,
            operationMode: 'normal' as const
          }));
        }
      }
      
      setHistoricalData(snapshots);
    } catch (error) {
      console.error('❌ Ошибка загрузки исторических данных:', error);
      
      // On error, try to show tank data as fallback
      try {
        const { tanksService } = await import('@/services/tanksService');
        const tanks = await tanksService.getTanks();
        
        const fallbackSnapshots = tanks.map(tank => ({
          id: `error_fallback_${tank.id}`,
          tankId: tank.id,
          tankName: tank.name,
          fuelType: tank.fuelType,
          tradingPointId: tank.trading_point_id,
          timestamp: selectedDateTime,
          currentLevelLiters: tank.currentLevelLiters,
          capacityLiters: tank.capacityLiters,
          levelPercent: Math.round((tank.currentLevelLiters / tank.capacityLiters) * 100 * 100) / 100,
          temperature: tank.temperature,
          waterLevelMm: tank.waterLevelMm,
          density: tank.density,
          status: tank.status,
          consumptionRate: 150,
          fillRate: 0,
          operationMode: 'normal' as const
        }));
        
        setHistoricalData(fallbackSnapshots);
      } catch (fallbackError) {
        console.error('Ошибка генерации резервных данных:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Конвертируем исторические данные в формат FuelStockRecord
  const convertToFuelStockRecords = (snapshots: FuelStockSnapshot[]): FuelStockRecord[] => {
    return snapshots
      .filter(snapshot => {
        // Фильтруем по выбранной торговой точке
        if (selectedTradingPoint) {
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

  // Используем либо исторические данные, либо mock данные
  const currentFuelStocks = selectedNetwork 
    ? convertToFuelStockRecords(historicalData)
    : mockFuelStocks;


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
              

            </div>
            <HelpButton helpKey="fuel-stocks" />
          </div>
        </div>

        {selectedNetwork && (
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
                          className="bg-slate-700 border-slate-600 text-white text-sm h-9"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Август 2025, шаг 4ч
                        </p>
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
        )}

        {/* Сообщение о выборе сети */}
        {!selectedNetwork && (
          <div className="report-margins">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Fuel className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра остатков топлива</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}