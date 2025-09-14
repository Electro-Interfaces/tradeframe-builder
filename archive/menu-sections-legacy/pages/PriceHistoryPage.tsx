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
import { TrendingUp, TrendingDown, Minus, Download, Filter, Calendar, AlertCircle } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { priceHistoryService, PriceHistoryUI } from "@/services/priceHistoryService";
import { Skeleton } from "@/components/ui/skeleton";

// Используем типы из priceHistoryService
type PriceHistoryRecord = PriceHistoryUI;

// Mock данные истории цен
const mockPriceHistory: PriceHistoryRecord[] = [
  {
    id: "1",
    date: "2024-12-07",
    time: "09:15",
    fuelType: "АИ-95",
    oldPrice: 52.50,
    newPrice: 53.20,
    changeReason: "Изменение оптовых цен",
    changedBy: "Администратор сети",
    status: 'applied'
  },
  {
    id: "2", 
    date: "2024-12-07",
    time: "09:15",
    fuelType: "АИ-92",
    oldPrice: 49.80,
    newPrice: 50.45,
    changeReason: "Изменение оптовых цен",
    changedBy: "Администратор сети",
    status: 'applied'
  },
  {
    id: "3",
    date: "2024-12-06",
    time: "14:30",
    fuelType: "ДТ",
    oldPrice: 51.20,
    newPrice: 51.95,
    changeReason: "Корректировка маржи",
    changedBy: "Менеджер АЗС №001",
    tradingPoint: "АЗС №001 - Московское шоссе",
    status: 'applied'
  },
  {
    id: "4",
    date: "2024-12-05", 
    time: "16:45",
    fuelType: "АИ-95",
    oldPrice: 52.80,
    newPrice: 52.50,
    changeReason: "Снижение для повышения конкурентоспособности",
    changedBy: "Директор сети",
    status: 'applied'
  },
  {
    id: "5",
    date: "2024-12-04",
    time: "11:20",
    fuelType: "АИ-92",
    oldPrice: 50.10,
    newPrice: 49.80,
    changeReason: "Снижение для повышения конкурентоспособности", 
    changedBy: "Директор сети",
    status: 'applied'
  },
  {
    id: "6",
    date: "2024-12-08",
    time: "08:00",
    fuelType: "АИ-95", 
    oldPrice: 53.20,
    newPrice: 53.80,
    changeReason: "Плановое повышение",
    changedBy: "Система",
    status: 'pending'
  }
];

const fuelTypes = ["Все", "АИ-95", "АИ-92", "ДТ"];
const changeReasons = ["Все", "Изменение оптовых цен", "Корректировка маржи", "Снижение для повышения конкурентоспособности", "Плановое повышение"];

export default function PriceHistoryPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-08");
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedReason, setSelectedReason] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Загрузка данных
  useEffect(() => {
    const loadPriceHistory = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const filters = {
          startDate: dateFrom,
          endDate: dateTo,
          tradingPointId: selectedTradingPoint?.id,
          // networkId можно добавить при необходимости
        };
        
        const pagination = {
          page: 1,
          limit: 100
        };
        
        const result = await priceHistoryService.getPriceHistory(filters, pagination);
        setPriceHistory(result.data);
      } catch (error) {
        console.error('Failed to load price history:', error);
        setError('Ошибка загрузки истории цен');
        // При ошибке используем mock данные как fallback
        setPriceHistory(mockPriceHistory);
      } finally {
        setLoading(false);
      }
    };

    loadPriceHistory();
  }, [dateFrom, dateTo, selectedTradingPoint]);

  // Фильтрация данных
  const filteredHistory = useMemo(() => {
    return priceHistory.filter(record => {
      // Дата уже отфильтрована на уровне API, но добавим локальную проверку
      if (dateFrom && record.date < dateFrom) return false;
      if (dateTo && record.date > dateTo) return false;
      
      // Фильтр по типу топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по причине
      if (selectedReason !== "Все" && record.changeReason !== selectedReason) return false;
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.fuelType.toLowerCase().includes(query) ||
          record.changeReason.toLowerCase().includes(query) ||
          record.changedBy.toLowerCase().includes(query) ||
          (record.tradingPoint && record.tradingPoint.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [priceHistory, dateFrom, dateTo, selectedFuelType, selectedReason, searchQuery]);

  const getPriceChangeIcon = (oldPrice: number, newPrice: number) => {
    if (newPrice > oldPrice) return <TrendingUp className="w-4 h-4 text-slate-400" />;
    if (newPrice < oldPrice) return <TrendingDown className="w-4 h-4 text-slate-400" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getPriceChangeColor = (oldPrice: number, newPrice: number) => {
    if (newPrice < oldPrice) return "text-slate-300";
    return "text-slate-400";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge className="bg-slate-600 text-slate-200">Применено</Badge>;
      case 'pending':
        return <Badge className="bg-slate-600 text-slate-200">Ожидает</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-700 text-slate-300">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPrice = (price: number) => price.toFixed(2) + " ₽";

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">История цен</h1>
              <p className="text-slate-400 mt-2">
                {isNetworkOnly && "История изменений цен по торговой сети"}
                {isTradingPointSelected && "История изменений цен торговой точки"}
                {!selectedNetwork && "Выберите сеть для просмотра истории цен"}
              </p>
            </div>
            <HelpButton route="/network/price-history" variant="text" className="flex-shrink-0" />
          </div>
        </div>

        {selectedNetwork && (
          <>
            {/* Фильтры */}
            <div className="mx-4 md:mx-6 lg:mx-8">
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
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-4 gap-4'}`}>
                  <div>
                    <Label className="text-slate-300">Дата с</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Дата по</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

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
                    <Label className="text-slate-300">Причина изменения</Label>
                    <Select value={selectedReason} onValueChange={setSelectedReason}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {changeReasons.map(reason => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Input
                    placeholder="Поиск по топливу, причине, пользователю..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Таблица истории */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  История изменений цен
                  <Badge variant="secondary" className="ml-auto">
                    {filteredHistory.length} записей
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {error && (
                  <div className="p-4">
                    <Alert className="bg-red-900/20 border-red-700">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-300">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {loading ? (
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded bg-slate-700" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[200px] bg-slate-700" />
                          <Skeleton className="h-4 w-[150px] bg-slate-700" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {filteredHistory.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-600 text-slate-200">
                                {record.fuelType}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {new Date(record.date).toLocaleDateString('ru-RU')} {record.time}
                              </span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-sm text-slate-400">Старая цена:</span>
                              <div className="text-white font-mono">{formatPrice(record.oldPrice)}</div>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400">Новая цена:</span>
                              <div className="text-white font-mono">{formatPrice(record.newPrice)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center py-2">
                            <div className={`flex items-center gap-2 ${getPriceChangeColor(record.oldPrice, record.newPrice)}`}>
                              {getPriceChangeIcon(record.oldPrice, record.newPrice)}
                              <span className="font-mono text-lg font-medium">
                                {record.newPrice > record.oldPrice ? '+' : ''}
                                {formatPrice(record.newPrice - record.oldPrice)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2 border-t border-slate-600 pt-2">
                            <div>
                              <span className="text-sm text-slate-400">Причина изменения:</span>
                              <div className="text-slate-300">{record.changeReason}</div>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400">Кто изменил:</span>
                              <div className="text-slate-300 font-medium">{record.changedBy}</div>
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
                    
                    {filteredHistory.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет записей за выбранный период
                      </div>
                    )}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Дата/Время</TableHead>
                          <TableHead className="text-slate-300">Топливо</TableHead>
                          <TableHead className="text-slate-300">Старая цена</TableHead>
                          <TableHead className="text-slate-300">Новая цена</TableHead>
                          <TableHead className="text-slate-300">Изменение</TableHead>
                          <TableHead className="text-slate-300">Причина</TableHead>
                          <TableHead className="text-slate-300">Кто изменил</TableHead>
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            <TableCell className="text-white">
                              <div>{new Date(record.date).toLocaleDateString('ru-RU')}</div>
                              <div className="text-sm text-slate-400">{record.time}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-slate-600 text-slate-200">
                                {record.fuelType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatPrice(record.oldPrice)}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {formatPrice(record.newPrice)}
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-2 ${getPriceChangeColor(record.oldPrice, record.newPrice)}`}>
                                {getPriceChangeIcon(record.oldPrice, record.newPrice)}
                                <span className="font-mono">
                                  {record.newPrice > record.oldPrice ? '+' : ''}
                                  {formatPrice(record.newPrice - record.oldPrice)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300 max-w-xs">
                              <div className="truncate" title={record.changeReason}>
                                {record.changeReason}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.changedBy}
                            </TableCell>
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300">
                                {record.tradingPoint || "Вся сеть"}
                              </TableCell>
                            )}
                            <TableCell>
                              {getStatusBadge(record.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {filteredHistory.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        Нет записей за выбранный период
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
          <div className="mx-4 md:mx-6 lg:mx-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра истории цен</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </MainLayout>
  );
}