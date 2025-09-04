import React, { useState, useMemo, useEffect, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Minus, Download, Filter, Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { priceHistoryService, PriceHistoryUI, PriceHistoryFilters } from "@/services/priceHistoryService";

const fuelTypes = ["Все", "АИ-95", "АИ-92", "ДТ"];
const changeReasons = ["Все", "Изменение оптовых цен", "Корректировка маржи", "Снижение для повышения конкурентоспособности", "Плановое повышение"];

export default function PriceHistoryPageUpdated() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных
  const [priceHistory, setPriceHistory] = useState<PriceHistoryUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  
  // Фильтры
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-08");
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedReason, setSelectedReason] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  // Загрузка данных
  const loadPriceHistory = useCallback(async (page: number = 1) => {
    if (!selectedNetwork) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const filters: PriceHistoryFilters = {
        networkId: selectedNetwork.id,
        startDate: dateFrom,
        endDate: dateTo
      };
      
      // Добавляем фильтр по торговой точке если выбрана
      if (selectedTradingPoint) {
        filters.tradingPointId = selectedTradingPoint.id;
      }
      
      // Добавляем фильтр по типу топлива если выбран
      if (selectedFuelType !== "Все") {
        filters.fuelTypeId = mapFuelTypeNameToId(selectedFuelType);
      }

      const result = await priceHistoryService.getPriceHistory(filters, {
        page,
        limit: pagination.limit
      });
      
      setPriceHistory(result.data);
      setPagination(result.pagination);
      
    } catch (err: any) {
      console.error('Failed to load price history:', err);
      setError(err.message || 'Не удалось загрузить историю цен');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo, selectedFuelType, pagination.limit]);

  // Загружаем данные при изменении фильтров
  useEffect(() => {
    loadPriceHistory(1);
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo, selectedFuelType]);

  // Фильтрация данных на клиенте (для причины изменения и поиска)
  const filteredHistory = useMemo(() => {
    return priceHistory.filter(record => {
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
  }, [priceHistory, selectedReason, searchQuery]);

  // Экспорт данных
  const handleExport = async () => {
    try {
      // TODO: Реализовать экспорт через API
      console.log('Export functionality to be implemented');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Обновление данных
  const handleRefresh = () => {
    loadPriceHistory(pagination.page);
  };

  // Смена страницы
  const handlePageChange = (newPage: number) => {
    loadPriceHistory(newPage);
  };

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

  const mapFuelTypeNameToId = (name: string): string => {
    const map: Record<string, string> = {
      'АИ-95': 'ai95',
      'АИ-92': 'ai92', 
      'ДТ': 'dt'
    };
    return map[name] || name.toLowerCase();
  };

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
            {/* Ошибка */}
            {error && (
              <div className="mx-4 md:mx-6 lg:mx-8">
                <Alert className="bg-red-900/20 border-red-800 text-red-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      className="ml-2 h-6"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Повторить
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Фильтры */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="flex-shrink-0"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Обновить
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleExport}
                      className="flex-shrink-0"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                    </Button>
                  </div>
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
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Дата по</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Тип топлива</Label>
                    <Select value={selectedFuelType} onValueChange={setSelectedFuelType} disabled={loading}>
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
                    <Select value={selectedReason} onValueChange={setSelectedReason} disabled={loading}>
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
                    disabled={loading}
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
                    {loading ? '...' : `${filteredHistory.length} записей`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  // Skeleton loading
                  <div className="p-4 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-12 w-12 rounded bg-slate-700" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4 bg-slate-700" />
                          <Skeleton className="h-4 w-1/2 bg-slate-700" />
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
                    
                    {filteredHistory.length === 0 && !loading && (
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
                    
                    {filteredHistory.length === 0 && !loading && (
                      <div className="text-center py-8 text-slate-400">
                        Нет записей за выбранный период
                      </div>
                    )}
                  </div>
                )}

                {/* Пагинация */}
                {pagination.pages > 1 && (
                  <div className="p-4 border-t border-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-400">
                        Страница {pagination.page} из {pagination.pages} 
                        ({pagination.total} записей)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1 || loading}
                          onClick={() => handlePageChange(pagination.page - 1)}
                        >
                          Назад
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.pages || loading}
                          onClick={() => handlePageChange(pagination.page + 1)}
                        >
                          Вперед
                        </Button>
                      </div>
                    </div>
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

/**
 * МИГРАЦИЯ:
 * 
 * 1. Переименовать файлы:
 *    mv src/pages/PriceHistoryPage.tsx src/pages/PriceHistoryPage.old.tsx
 *    mv src/pages/PriceHistoryPage.updated.tsx src/pages/PriceHistoryPage.tsx
 * 
 * 2. Протестировать переключение между mock и API режимами
 * 
 * 3. Добавить Price History routes в API server:
 *    import { priceHistoryRouter } from './routes/price-history';
 *    app.use('/api/v1/price-history', priceHistoryRouter);
 */