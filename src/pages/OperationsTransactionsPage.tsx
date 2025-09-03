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
import { Activity, Download, Filter, Clock, CheckCircle, XCircle, PlayCircle, PauseCircle, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { operationsService, Operation } from "@/services/operationsService";

// Получение правильных типов операций из сервиса
const operationTypeMap = {
  'sale': 'Продажа',
  'refund': 'Возврат',
  'correction': 'Коррекция',
  'maintenance': 'Обслуживание',
  'tank_loading': 'Загрузка резервуара',
  'diagnostics': 'Диагностика',
  'sensor_calibration': 'Калибровка датчиков'
};

const statusTypes = ["Все", "completed", "in_progress", "failed", "pending", "cancelled"];
const allowedPaymentMethods = ["cash", "bank_card", "fuel_card", "online_order"];

const paymentMethodMap = {
  'bank_card': 'Банковские карты',
  'cash': 'Наличные',
  'fuel_card': 'Топливные карты',
  'online_order': 'Онлайн заказы'
};

export default function OperationsTransactionsPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных операций
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Фильтры
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState("2025-08-31");

  const isNetworkOnly = selectedNetwork && (!selectedTradingPoint || selectedTradingPoint === "all");
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint && selectedTradingPoint !== "all";

  // Загрузка операций при монтировании компонента
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        // Проверяем, есть ли данные в localStorage
        const hasStoredData = localStorage.getItem('tradeframe_operations');
        
        if (!hasStoredData) {
          // Если нет сохраненных данных, принудительно загружаем демо-данные
          console.log('Нет сохраненных операций, загружаем демо-данные');
          // Принудительно очищаем кэш и перезагружаем данные
          localStorage.removeItem('tradeframe_operations');
        }
        
        const data = await operationsService.getAll();
        console.log('Загружено операций:', data.length);
        console.log('Данные операций:', data);
        console.log('Уникальные виды топлива:', [...new Set(data.map(op => op.fuelType).filter(Boolean))]);
        console.log('Уникальные способы оплаты:', [...new Set(data.map(op => op.paymentMethod).filter(Boolean))]);
        console.log('localStorage tradeframe_operations:', localStorage.getItem('tradeframe_operations'));
        setOperations(data);
      } catch (error) {
        console.error('Ошибка загрузки операций:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperations();
  }, []);

  // Функция для перезагрузки операций
  const reloadOperations = async () => {
    try {
      setLoading(true);
      await operationsService.forceReload();
      const data = await operationsService.getAll();
      setOperations(data);
      
      const statusStats = await operationsService.getStatusStatistics();
      console.log('📊 Обновленная статистика по статусам:', statusStats);
    } catch (error) {
      console.error('Ошибка при перезагрузке операций:', error);
    } finally {
      setLoading(false);
    }
  };

  // Автообновление данных каждые 5 секунд
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await operationsService.getAll();
        setOperations(data);
      } catch (error) {
        console.error('Ошибка обновления операций:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Фильтрация данных
  const filteredOperations = useMemo(() => {
    return operations.filter(record => {
      // Исключаем операции с нежелательными способами оплаты
      const excludedPaymentMethods = ['supplier_delivery', 'corporate_card', 'mobile_payment'];
      if (record.paymentMethod && excludedPaymentMethods.includes(record.paymentMethod)) {
        return false;
      }
      
      // Фильтр по торговой точке (если выбрана конкретная точка)
      if (selectedTradingPoint && selectedTradingPoint !== "all") {
        // Выбрана конкретная торговая точка - показываем только её операции
        if (record.tradingPointId !== selectedTradingPoint) return false;
      }
      // Если выбрана только сеть или не выбрано ничего,
      // показываем операции всех точек (все операции в демо-данных)
      
      
      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;
      
      // Фильтр по виду топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по виду оплаты - работает только для выбранных в фильтре типов
      if (selectedPaymentMethod !== "Все") {
        if (record.paymentMethod !== selectedPaymentMethod) return false;
      }
      
      // Не фильтруем дополнительно операции по способу оплаты
      
      // Фильтр по датам
      if (dateFrom || dateTo) {
        const recordDate = new Date(record.startTime);
        const recordDateStr = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (dateFrom && recordDateStr < dateFrom) {
          return false;
        }
        
        if (dateTo && recordDateStr > dateTo) {
          return false;
        }
      }
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.id.toLowerCase().includes(query) ||
          record.details.toLowerCase().includes(query) ||
          (record.deviceId && record.deviceId.toLowerCase().includes(query)) ||
          (record.transactionId && record.transactionId.toLowerCase().includes(query)) ||
          (record.tradingPointName && record.tradingPointName.toLowerCase().includes(query)) ||
          (record.operatorName && record.operatorName.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [operations, selectedStatus, selectedFuelType, selectedPaymentMethod, searchQuery, dateFrom, dateTo, selectedNetwork, selectedTradingPoint]);

  // Отладочная информация
  console.log('Всего операций:', operations.length);
  console.log('Отфильтрованных операций:', filteredOperations.length);
  console.log('Фильтры:', { selectedStatus, selectedFuelType, selectedPaymentMethod, searchQuery, dateFrom, dateTo });

  // Получаем уникальные виды топлива из операций
  const fuelTypes = useMemo(() => {
    const types = new Set(operations.filter(op => op.fuelType).map(op => op.fuelType));
    return ["Все", ...Array.from(types).sort()];
  }, [operations]);

  // Получаем только разрешенные способы оплаты для фильтра (но показываем все операции)
  const paymentMethods = useMemo(() => {
    const methods = new Set(operations.filter(op => op.paymentMethod && allowedPaymentMethods.includes(op.paymentMethod)).map(op => op.paymentMethod));
    return ["Все", ...allowedPaymentMethods.filter(method => methods.has(method))];
  }, [operations]);

  // KPI данные - по видам операций (суммы денег)
  const operationKpis = useMemo(() => {
    const operationStats: Record<string, { revenue: number; operations: number }> = {};
    
    filteredOperations.forEach(op => {
      if (op.operationType && op.status === 'completed' && op.totalCost) {
        const displayType = operationTypeMap[op.operationType] || op.operationType;
        if (!operationStats[displayType]) {
          operationStats[displayType] = { revenue: 0, operations: 0 };
        }
        operationStats[displayType].revenue += op.totalCost;
        operationStats[displayType].operations += 1;
      }
    });
    
    return operationStats;
  }, [filteredOperations]);

  // KPI данные - по видам топлива
  const fuelKpis = useMemo(() => {
    const fuelStats: Record<string, { volume: number; revenue: number; operations: number }> = {};
    
    filteredOperations.forEach(op => {
      if (op.fuelType && op.status === 'completed' && op.quantity) {
        if (!fuelStats[op.fuelType]) {
          fuelStats[op.fuelType] = { volume: 0, revenue: 0, operations: 0 };
        }
        fuelStats[op.fuelType].volume += op.quantity;
        fuelStats[op.fuelType].revenue += op.totalCost || 0;
        fuelStats[op.fuelType].operations += 1;
      }
    });
    
    return fuelStats;
  }, [filteredOperations]);

  // KPI данные - по видам оплаты
  const paymentKpis = useMemo(() => {
    const paymentStats: Record<string, { revenue: number; operations: number }> = {};
    
    filteredOperations.forEach(op => {
      if (op.paymentMethod && op.status === 'completed' && op.totalCost) {
        const displayMethod = paymentMethodMap[op.paymentMethod] || op.paymentMethod;
        if (!paymentStats[displayMethod]) {
          paymentStats[displayMethod] = { revenue: 0, operations: 0 };
        }
        paymentStats[displayMethod].revenue += op.totalCost;
        paymentStats[displayMethod].operations += 1;
      }
    });
    
    return paymentStats;
  }, [filteredOperations]);


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-slate-600 text-slate-200">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-slate-600 text-slate-200">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-600 text-slate-200">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-slate-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      case 'pending':
        return <PauseCircle className="w-4 h-4 text-slate-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };


  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1) {
      return `${Math.round(duration * 60)} сек`;
    }
    return `${duration.toFixed(1)} мин`;
  };

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Операции</h1>
              <p className="text-slate-400 mt-2">
                {isNetworkOnly && selectedNetwork && `Real-time состояние операций сети "${selectedNetwork.name}"`}
                {isTradingPointSelected && `Real-time состояние операций торговой точки`}
                {!selectedNetwork && "Real-time состояние операций демо сети АЗС"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={reloadOperations}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Обновление...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Обновить данные
                  </>
                )}
              </Button>
              <HelpButton route="/network/operations-transactions" className="flex-shrink-0" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Автообновление' : 'Включить автообновление'}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                localStorage.removeItem('tradeframe_operations');
                setOperations([]);
                const data = await operationsService.getAll();
                setOperations(data);
                console.log('Данные операций принудительно перезагружены');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Перезагрузить демо-данные
            </Button>
          </div>
        </div>

        <>
          {/* Фильтры */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" className="flex-shrink-0">
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-shrink-0"
                      onClick={() => {
                        if (confirm('Очистить все сохраненные операции и вернуться к демо-данным?')) {
                          localStorage.removeItem('tradeframe_operations');
                          window.location.reload();
                        }
                      }}
                    >
                      Очистить данные
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-6 gap-4'}`}>

                  <div>
                    <Label className="text-slate-300">Статус</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все</SelectItem>
                        <SelectItem value="completed">Завершено</SelectItem>
                        <SelectItem value="in_progress">Выполняется</SelectItem>
                        <SelectItem value="failed">Ошибка</SelectItem>
                        <SelectItem value="pending">Ожидание</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Вид топлива</Label>
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
                    <Label className="text-slate-300">Вид оплаты</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method} value={method}>
                            {method === "Все" ? "Все" : (paymentMethodMap[method] || method)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Дата с</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Дата по</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Поиск</Label>
                    <Input
                      placeholder="Поиск по операции, устройству, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* KPI - Суммы по видам операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам операций
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'}`}>
                {Object.entries(operationKpis).map(([operationType, stats]) => (
                  <Card key={operationType} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{operationType}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Суммы по видам оплаты */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам оплаты
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
                {Object.entries(paymentKpis).map(([paymentMethod, stats]) => (
                  <Card key={paymentMethod} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{paymentMethod}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Объемы топлива */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам топлива
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                {Object.entries(fuelKpis).map(([fuelType, stats]) => (
                  <Card key={fuelType} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{fuelType}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.volume.toFixed(0)} л</p>
                      <p className="text-xs text-blue-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>


            {/* Таблица операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700 w-full max-w-none">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Текущие операции
                  <Badge variant="secondary" className="ml-auto">
                    {filteredOperations.length} операций
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {filteredOperations.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className="font-medium text-white">{operationTypeMap[record.operationType] || record.operationType}</span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                          {record.transactionId && (
                            <div className="text-xs text-slate-400 mt-1">{record.transactionId}</div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {record.deviceId || 'N/A'}
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">{record.lastUpdated}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Дата:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Начало:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleTimeString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Завершение:</span>
                              <span className="text-white font-mono ml-1">{record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Тип записи:</span>
                              <Badge className="ml-1 bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-slate-400">Топливо:</span>
                              <span className="text-white ml-1">{record.fuelType || '—'}</span>
                            </div>
                          </div>
                          
                          {(record.quantity || record.price || record.totalCost) && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-slate-400">Кол-во:</span>
                                <div className="text-white font-mono">
                                  {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Цена:</span>
                                <div className="text-white font-mono">
                                  {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Сумма:</span>
                                <div className="text-white font-mono">
                                  {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                                </div>
                              </div>
                            </div>
                          )}

                          {record.paymentMethod && (
                            <div className="text-sm">
                              <span className="text-slate-400">Вид оплаты:</span>
                              <span className="text-white ml-1">
                                {paymentMethodMap[record.paymentMethod] || record.paymentMethod}
                              </span>
                            </div>
                          )}

                          {record.status === 'in_progress' && record.progress !== undefined && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Прогресс:</span>
                                <span className="text-sm text-blue-400">{Math.round(record.progress)}%</span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${record.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {record.duration && record.status !== 'in_progress' && (
                            <div className="text-sm">
                              <span className="text-slate-400">Длительность:</span>
                              <span className="text-white font-mono ml-1">{formatDuration(record.duration)}</span>
                            </div>
                          )}
                          
                          <div className="text-sm border-t border-slate-600 pt-2">
                            <div className="flex items-start gap-1">
                              <span className="text-slate-400">Детали:</span>
                              <span className="text-slate-300 flex-1">
                                {record.details}
                                {record.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400 inline ml-1" />}
                              </span>
                            </div>
                          </div>
                          
                          {isNetworkOnly && record.tradingPointName && (
                            <div className="text-sm border-t border-slate-600 pt-2">
                              <span className="text-slate-400">Торговая точка:</span>
                              <div className="text-slate-300 font-medium">{record.tradingPointName}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {loading ? (
                      <div className="text-center py-8 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                          Загрузка операций...
                        </div>
                      </div>
                    ) : filteredOperations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <div>Нет операций по выбранным фильтрам</div>
                        {operations.length === 0 && (
                          <div className="mt-2 text-sm">
                            <button 
                              onClick={() => {
                                localStorage.removeItem('tradeframe_operations');
                                window.location.reload();
                              }}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Загрузить демо-данные
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                          <TableHead className="text-slate-300">Тип записи</TableHead>
                          <TableHead className="text-slate-300">Дата</TableHead>
                          <TableHead className="text-slate-300">Время начала</TableHead>
                          <TableHead className="text-slate-300">Время завершения</TableHead>
                          <TableHead className="text-slate-300">Вид топлива</TableHead>
                          <TableHead className="text-slate-300">Количество</TableHead>
                          <TableHead className="text-slate-300">Цена</TableHead>
                          <TableHead className="text-slate-300">Стоимость</TableHead>
                          <TableHead className="text-slate-300">Вид оплаты</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOperations.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300 max-w-xs">
                                <div className="truncate" title={record.tradingPointName}>
                                  {record.tradingPointName}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(record.status)}
                                {getStatusBadge(record.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <Badge className="bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleTimeString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.fuelType || '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.paymentMethod ? (paymentMethodMap[record.paymentMethod] || record.paymentMethod) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {loading ? (
                      <div className="text-center py-8 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                          Загрузка операций...
                        </div>
                      </div>
                    ) : filteredOperations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <div>Нет операций по выбранным фильтрам</div>
                        {operations.length === 0 && (
                          <div className="mt-2 text-sm">
                            <button 
                              onClick={() => {
                                localStorage.removeItem('tradeframe_operations');
                                window.location.reload();
                              }}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Загрузить демо-данные
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
        </>
      </div>
    </MainLayout>
  );
}