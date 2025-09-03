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
import { HelpButton } from "@/components/help/HelpButton";

// Debug log for module loading
console.log('🚀 FuelStocksPageFixed: Модуль загружается!');

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
  }
];

const fuelTypes = ["Все", "АИ-95", "АИ-92", "ДТ"];

export default function FuelStocksPageFixed() {
  console.log('🔥 FuelStocksPageFixed: Компонент загружается!');
  
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  console.log('📊 FuelStocksPageFixed: Контекст загружен:', {
    selectedNetworkExists: !!selectedNetwork,
    selectedNetworkId: selectedNetwork?.id,
    selectedNetworkName: selectedNetwork?.name,
    selectedTradingPoint,
    isMobile
  });
  
  // Состояние данных
  const [historicalData, setHistoricalData] = useState<FuelStockSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    const now = new Date('2025-08-30T16:00:00Z'); // По умолчанию конец августа
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm format
  });
  
  // Фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Используем только mock данные для начала
  const currentFuelStocks = mockFuelStocks;
  
  console.log('📋 FuelStocksPageFixed: Mock данные:', {
    mockDataLength: mockFuelStocks.length,
    currentFuelStocksLength: currentFuelStocks.length
  });

  // Фильтрация данных
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
        return <Badge className="bg-green-600 text-green-100">Норма</Badge>;
      case 'low':
        return <Badge className="bg-yellow-600 text-yellow-100">Низкий</Badge>;
      case 'critical':
        return <Badge className="bg-red-600 text-red-100">Критичный</Badge>;
      case 'overfill':
        return <Badge className="bg-orange-600 text-orange-100">Переполнение</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 50) return "text-green-400";
    if (percentage >= 20) return "text-yellow-400";
    return "text-red-400";
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
                <div>🏪 Тек. остатки: {currentFuelStocks.length} записей</div>
                <div>📁 Mock данные: {mockFuelStocks.length} записей</div>
                <div>📊 Фильтрованных: {filteredStocks.length} записей</div>
                <div>🎛️ Источник данных: Mock</div>
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="report-margins">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Calendar className="w-4 h-4" />
                Фильтры
                <Button variant="outline" className="ml-auto flex-shrink-0 text-sm">
                  <Download className="w-3 h-3 mr-1" />
                  Экспорт
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'}`}>
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
            {/* Desktop table layout */}
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
          </CardContent>
        </Card>
        </div>

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