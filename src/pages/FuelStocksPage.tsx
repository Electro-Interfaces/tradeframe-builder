import React, { useState, useMemo } from "react";
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
import { Fuel, Download, Filter, AlertTriangle, Droplets, Gauge } from "lucide-react";

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
  
  // Фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Фильтрация данных
  const filteredStocks = useMemo(() => {
    return mockFuelStocks.filter(record => {
      // Фильтр по типу топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;
      
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
  }, [selectedFuelType, selectedStatus, searchQuery]);

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
        return <Badge className="bg-green-600 text-white">Норма</Badge>;
      case 'low':
        return <Badge className="bg-yellow-600 text-white">Низкий</Badge>;
      case 'critical':
        return <Badge className="bg-red-600 text-white">Критичный</Badge>;
      case 'overfill':
        return <Badge className="bg-purple-600 text-white">Переполнение</Badge>;
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
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Остатки топлива</h1>
          <p className="text-slate-400 mt-2">
            {isNetworkOnly && "Отчет по остаткам топлива торговой сети"}
            {isTradingPointSelected && "Отчет по остаткам топлива торговой точки"}
            {!selectedNetwork && "Выберите сеть для просмотра остатков топлива"}
          </p>
        </div>

        {selectedNetwork && (
          <>
            {/* Фильтры */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                  <Button variant="outline" className="ml-auto flex-shrink-0">
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                  <div>
                    <Label className="text-slate-300">Тип топлива</Label>
                    <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
                    <Label className="text-slate-300">Статус</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все</SelectItem>
                        <SelectItem value="normal">Норма</SelectItem>
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="critical">Критичный</SelectItem>
                        <SelectItem value="overfill">Переполнение</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Поиск</Label>
                    <Input
                      placeholder="Поиск по резервуару, топливу..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* KPI - Объемы топлива */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
              {fuelKpis.map(({ fuelType, volume }) => (
                <Card key={fuelType} className="bg-slate-800 border-slate-700">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-200">
                      {fuelType}
                    </CardTitle>
                    <Fuel className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">
                      {formatVolume(volume)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Общий объем в резервуарах
                    </p>
                  </CardContent>
                </Card>
              ))}
              {fuelKpis.length === 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <div className="text-slate-400">
                      Нет данных по выбранным фильтрам
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Таблица остатков */}
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
                              <Gauge className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">{record.tankNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.status === 'critical' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                              {record.status === 'low' && <Droplets className="w-4 h-4 text-yellow-400" />}
                              {getStatusBadge(record.status, record.percentage)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
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
                                    record.percentage >= 50 ? 'bg-green-500' :
                                    record.percentage >= 20 ? 'bg-yellow-500' : 'bg-red-500'
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
                  <div className="overflow-x-auto">
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
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                          <TableHead className="text-slate-300">Обновлено</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStocks.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell className="text-white font-medium">
                              <div className="flex items-center gap-2">
                                <Gauge className="w-4 h-4 text-blue-400" />
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
          </>
        )}

        {/* Сообщение о выборе сети */}
        {!selectedNetwork && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Fuel className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра остатков топлива</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}