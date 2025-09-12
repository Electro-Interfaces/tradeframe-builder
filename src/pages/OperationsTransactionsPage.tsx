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
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { nomenclatureService } from "@/services/nomenclatureService";

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
  
  // Debug: показать информацию о мобильном режиме
  console.log('📱 isMobile:', isMobile, 'window.innerWidth:', typeof window !== 'undefined' ? window.innerWidth : 'undefined');
  
  // Принудительный мобильный режим для тестирования
  const isMobileForced = true;
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

  // Загрузка операций из Supabase при первом открытии страницы
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        console.log('🔄 Loading operations from Supabase...');
        
        // Загружаем операции напрямую из Supabase
        const supabaseOperations = await operationsSupabaseService.getOperations();
        setOperations(supabaseOperations);
        
        console.log('✅ Loaded operations:', supabaseOperations.length);
      } catch (error) {
        console.error('❌ Error loading operations:', error);
        
        // Fallback на старый сервис при ошибке
        try {
          const data = await operationsService.getAll();
          setOperations(data);
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          setOperations([]);
        }
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
      console.log('🔄 Reloading operations from Supabase...');
      
      // Загружаем операции напрямую из Supabase
      const supabaseOperations = await operationsSupabaseService.getOperations();
      setOperations(supabaseOperations);
      
      // Получаем статистику
      const statusStats = await operationsSupabaseService.getStatusStatistics();
      console.log('📊 Обновленная статистика по статусам:', statusStats);
      console.log('✅ Reloaded operations:', supabaseOperations.length);
    } catch (error) {
      console.error('❌ Error reloading operations:', error);
      
      // Fallback на старый сервис
      try {
        await operationsService.forceReload();
        const data = await operationsService.getAll();
        setOperations(data);
      } catch (fallbackError) {
        console.error('❌ Fallback reload also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  // ВРЕМЕННО ОТКЛЮЧЕНО автообновление данных
  // useEffect(() => {
  //   if (!autoRefresh) return;
    
  //   const interval = setInterval(async () => {
  //     try {
  //       const data = await operationsService.getAll();
  //       setOperations(data);
  //     } catch (error) {
  //       console.error('Ошибка обновления операций:', error);
  //     }
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [autoRefresh]);

  // Фильтрация данных
  const filteredOperations = useMemo(() => {
    return operations.filter(record => {
      // Исключаем операции с нежелательными способами оплаты
      const excludedPaymentMethods = ['supplier_delivery', 'corporate_card', 'mobile_payment'];
      if (record.paymentMethod && excludedPaymentMethods.includes(record.paymentMethod)) {
        return false;
      }
      
      // ВРЕМЕННО ОТКЛЮЧЕН ФИЛЬТР ПО ТОРГОВЫМ ТОЧКАМ - ПОКАЗЫВАЕМ ВСЕ ОПЕРАЦИИ
      // Фильтр по торговой точке (если выбрана конкретная точка)
      // if (selectedTradingPoint && selectedTradingPoint !== "all") {
      //   // Конвертируем ID торговой точки для сопоставления
      //   // point1 -> station_01, point2 -> station_02, etc.
      //   let stationId;
      //   if (selectedTradingPoint === 'point1') stationId = 'station_01';
      //   else if (selectedTradingPoint === 'point2') stationId = 'station_02';
      //   else if (selectedTradingPoint === 'point3') stationId = 'station_03';
      //   else if (selectedTradingPoint === 'point4') stationId = 'station_04';
      //   else if (selectedTradingPoint === 'point5') stationId = 'station_05';
      //   else if (selectedTradingPoint === 'point6') stationId = 'station_06';
      //   else stationId = selectedTradingPoint;
      //   console.log('🔍 Фильтр торговых точек:', { selectedTradingPoint, stationId, recordTradingPointId: record.tradingPointId });
      //   if (record.tradingPointId !== stationId) return false;
      // }
      // Показываем операции всех торговых точек
      
      
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
        
        // Отладочная информация для первых 3 записей
        if (filteredOperations.length < 3) {
          console.log('🗓️ Date filter debug:', {
            recordId: record.id,
            startTime: record.startTime,
            recordDateStr,
            dateFrom,
            dateTo,
            fromCheck: dateFrom ? `${recordDateStr} < ${dateFrom} = ${recordDateStr < dateFrom}` : 'skip',
            toCheck: dateTo ? `${recordDateStr} > ${dateTo} = ${recordDateStr > dateTo}` : 'skip'
          });
        }
        
        // Проверяем, что дата записи находится в заданном диапазоне
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

  // Отладочная информация убрана для предотвращения зависания

  // Состояние для видов топлива из номенклатуры
  const [fuelTypes, setFuelTypes] = useState<string[]>(["Все"]);
  
  // Загружаем виды топлива из номенклатуры
  useEffect(() => {
    const loadFuelTypes = async () => {
      try {
        const nomenclature = await nomenclatureService.getNomenclature();
        
        // Фильтруем только активные виды топлива для выбранной сети
        const networkId = selectedNetwork?.id || '1'; // По умолчанию демо сеть
        const activeFuelTypes = nomenclature
          .filter(item => 
            item.status === 'active' && 
            item.networkId === networkId
          )
          .map(item => item.name)
          .sort();
          
        console.log('📋 Загружены виды топлива из номенклатуры:', activeFuelTypes);
        setFuelTypes(["Все", ...activeFuelTypes]);
      } catch (error) {
        console.error('Ошибка загрузки номенклатуры:', error);
        // Fallback на статический список
        setFuelTypes(["Все", "АИ-92", "АИ-95", "АИ-98", "ДТ", "АИ-100"]);
      }
    };

    loadFuelTypes();
  }, [selectedNetwork]);

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

  // Отладка KPI убрана для предотвращения зависания

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
        return <Badge className="bg-slate-700 border-slate-600 text-slate-200">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-slate-700 border-slate-600 text-slate-200">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-700 border-slate-600 text-slate-200">Отменено</Badge>;
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
      <div className={`w-full ${isMobileForcedForced ? 'space-y-3' : 'space-y-6'} report-full-width`}>
        {/* Заголовок страницы */}
        <div className={`${isMobileForcedForced ? 'mb-3 px-0' : 'mb-6 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8'}`}>
          <div className={`flex ${isMobileForced ? 'flex-col gap-1' : 'items-start justify-between'}`}>
            <div>
              <h1 className={`${isMobileForced ? 'text-lg' : 'text-2xl'} font-semibold text-white`}>Операции</h1>
              <p className={`text-slate-400 ${isMobileForced ? 'text-xs' : 'mt-2'}`}>
                {isNetworkOnly && selectedNetwork && `Real-time состояние операций сети "${selectedNetwork.name}"`}
                {isTradingPointSelected && `Real-time состояние операций торговой точки`}
                {!selectedNetwork && "Real-time состояние операций демо сети АЗС"}
              </p>
            </div>
            <div className={`flex items-center ${isMobileForced ? 'gap-1 self-start mt-1' : 'gap-2'}`}>
              {!isMobileForced && (
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
              )}
              {isMobileForced && (
                <HelpButton route="/network/operations-transactions" variant="icon" size="sm" className="flex-shrink-0" />
              )}
              {!isMobileForced && <HelpButton route="/network/operations-transactions" variant="text" className="flex-shrink-0" />}
            </div>
          </div>
          {!isMobileForced && (
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                size="default"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Автообновление' : 'Включить автообновление'}
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={async () => {
                  localStorage.removeItem('tradeframe_operations');
                  setOperations([]);
                  await reloadOperations();
                  console.log('Данные операций принудительно перезагружены из Supabase');
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Перезагрузить данные
              </Button>
            </div>
          )}
        </div>

        <>
          {/* Фильтры */}
            <div className={`${isMobileForced ? 'mx-0' : 'mx-4 md:mx-6 lg:mx-8'}`}>
            <Card className="bg-slate-800 border border-slate-700 rounded-lg hover:shadow-xl transition-all duration-200">
              <CardHeader>
                <CardTitle className={`text-white flex ${isMobileForced ? 'flex-col gap-3' : 'items-center gap-2'}`}>
                  <div className="flex items-center gap-2">
                    <Filter className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    <span className={isMobileForced ? 'text-lg' : ''}>Фильтры</span>
                  </div>
                  <div className={`${isMobileForced ? 'flex gap-1 self-start' : 'ml-auto flex gap-2'}`}>
                    {!isMobileForced && (
                      <Button variant="outline" className="flex-shrink-0">
                        <Download className="w-4 h-4 mr-2" />
                        Экспорт
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size={isMobileForced ? "sm" : "default"}
                      className={`flex-shrink-0 ${isMobileForced ? 'text-xs' : ''}`}
                      onClick={async () => {
                        if (confirm('Очистить все сохраненные операции и вернуться к демо-данным?')) {
                          localStorage.removeItem('tradeframe_operations');
                          await reloadOperations();
                          
                          // Принудительно перезагрузить виды топлива
                          try {
                            const nomenclature = await nomenclatureService.getNomenclature();
                            const networkId = selectedNetwork?.id || '1';
                            const activeFuelTypes = nomenclature
                              .filter(item => 
                                item.status === 'active' && 
                                item.networkId === networkId
                              )
                              .map(item => item.name)
                              .sort();
                            setFuelTypes(["Все", ...activeFuelTypes]);
                          } catch (error) {
                            console.error('Ошибка перезагрузки номенклатуры:', error);
                            setFuelTypes(["Все", "АИ-92", "АИ-95", "АИ-98", "ДТ", "АИ-100"]);
                          }
                        }
                      }}
                    >
                      {isMobileForced ? "Очистить" : "Очистить данные"}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobileForced ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-6 gap-4'}`}>

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
            <div className={`${isMobileForced ? 'mx-0' : 'mx-4 md:mx-6 lg:mx-8'}`}>
              <h3 className={`${isMobileForced ? 'text-sm' : 'text-lg'} font-semibold text-white ${isMobileForced ? 'mb-2' : 'mb-4'} flex items-center gap-2`}>
                <Activity className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                {isMobileForced ? 'Суммы операций' : 'Суммы по видам операций'}
              </h3>
              <div className={`grid ${isMobileForced ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'}`}>
                {Object.entries(operationKpis).map(([operationType, stats]) => (
                  <Card key={operationType} className="bg-slate-800 border border-slate-700 rounded-lg hover:shadow-xl transition-all duration-200">
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobileForced ? 'pb-1 px-3 pt-2' : 'pb-2'}`}>
                      <CardTitle className={`${isMobileForced ? 'text-xs' : 'text-sm'} font-medium text-slate-200`}>{operationType}</CardTitle>
                      <Activity className={`${isMobileForced ? 'h-3 w-3' : 'h-4 w-4'} text-slate-400`} />
                    </CardHeader>
                    <CardContent className={isMobileForced ? 'px-3 pb-2 pt-0' : ''}>
                      <div className={`${isMobileForced ? 'text-sm' : 'text-2xl'} font-bold text-white`}>{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} оп.</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Суммы по видам оплаты */}
            <div className={`${isMobileForced ? 'mx-0' : 'mx-4 md:mx-6 lg:mx-8'}`}>
              <h3 className={`${isMobileForced ? 'text-sm' : 'text-lg'} font-semibold text-white ${isMobileForced ? 'mb-2' : 'mb-4'} flex items-center gap-2`}>
                <Activity className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                {isMobileForced ? 'Суммы оплат' : 'Суммы по видам оплаты'}
              </h3>
              <div className={`grid ${isMobileForced ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
                {Object.entries(paymentKpis).map(([paymentMethod, stats]) => (
                  <Card key={paymentMethod} className="bg-slate-800 border border-slate-700 rounded-lg hover:shadow-xl transition-all duration-200">
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobileForced ? 'pb-1 px-3 pt-2' : 'pb-2'}`}>
                      <CardTitle className={`${isMobileForced ? 'text-xs' : 'text-sm'} font-medium text-slate-200`}>{paymentMethod}</CardTitle>
                      <Activity className={`${isMobileForced ? 'h-3 w-3' : 'h-4 w-4'} text-slate-400`} />
                    </CardHeader>
                    <CardContent className={isMobileForced ? 'px-3 pb-2 pt-0' : ''}>
                      <div className={`${isMobileForced ? 'text-sm' : 'text-2xl'} font-bold text-white`}>{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} оп.</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Объемы топлива */}
            <div className={`${isMobileForced ? 'mx-0' : 'mx-4 md:mx-6 lg:mx-8'}`}>
              <h3 className={`${isMobileForced ? 'text-sm' : 'text-lg'} font-semibold text-white ${isMobileForced ? 'mb-2' : 'mb-4'} flex items-center gap-2`}>
                <Activity className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                {isMobileForced ? 'Объемы топлива' : 'Суммы по видам топлива'}
              </h3>
              <div className={`grid ${isMobileForced ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                {Object.entries(fuelKpis).map(([fuelType, stats]) => (
                  <Card key={fuelType} className="bg-slate-800 border border-slate-700 rounded-lg hover:shadow-xl transition-all duration-200">
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${isMobileForced ? 'pb-1 px-3 pt-2' : 'pb-2'}`}>
                      <CardTitle className={`${isMobileForced ? 'text-xs' : 'text-sm'} font-medium text-slate-200`}>{fuelType}</CardTitle>
                      <Activity className={`${isMobileForced ? 'h-3 w-3' : 'h-4 w-4'} text-slate-400`} />
                    </CardHeader>
                    <CardContent className={isMobileForced ? 'px-3 pb-2 pt-0' : ''}>
                      <div className={`${isMobileForced ? 'text-sm' : 'text-2xl'} font-bold text-white`}>{stats.volume.toFixed(0)} л</div>
                      <p className={`${isMobileForced ? 'text-xs' : 'text-sm'} text-slate-400`}>{stats.revenue.toFixed(0)} ₽</p>
                      <p className="text-xs text-blue-400">{stats.operations} оп.</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>


            {/* Таблица операций */}
            <div className={`${isMobileForced ? 'mx-0' : 'mx-4 md:mx-6 lg:mx-8'}`}>
            <Card className={`bg-slate-800 border border-slate-700 rounded-lg w-full max-w-none ${isMobileForced ? 'mx-0' : ''}`}>
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
                {isMobileForced ? (
                  // Mobile card layout
                  <div className={`${isMobileForced ? 'space-y-1 -mx-4 px-4' : 'space-y-3 p-0'}`}>
                    {filteredOperations.map((record) => (
                      <Card key={record.id} className="bg-slate-800 border border-slate-700 rounded-lg w-full mx-0 hover:bg-slate-700 transition-colors">
                        <CardHeader className={`${isMobileForced ? 'pb-0 px-3 pt-1' : 'pb-2'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {getStatusIcon(record.status)}
                              <span className="font-medium text-white text-xs truncate">{operationTypeMap[record.operationType] || record.operationType}</span>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(record.status)}
                            </div>
                          </div>
                          {record.transactionId && (
                            <div className="text-xs text-slate-400 mt-0.5 truncate">{record.transactionId}</div>
                          )}
                        </CardHeader>
                        <CardContent className={`${isMobileForced ? 'pt-1 px-3 pb-1 space-y-0.5' : 'pt-0 space-y-2'}`}>
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className={`text-blue-400 border-blue-400 ${isMobileForced ? 'text-xs px-1 py-0' : 'text-xs'}`}>
                              {record.deviceId || 'N/A'}
                            </Badge>
                            <span className={`text-slate-400 font-mono ${isMobileForced ? 'text-xs' : 'text-xs'}`}>{record.lastUpdated}</span>
                          </div>
                          
                          <div className={`${isMobileForced ? 'space-y-0' : 'space-y-1'} text-xs`}>
                            <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                              <span className="text-slate-400">Дата:</span>
                              <span className="text-white font-mono">{new Date(record.startTime).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                              <span className="text-slate-400">Начало:</span>
                              <span className="text-white font-mono">{new Date(record.startTime).toLocaleTimeString('ru-RU')}</span>
                            </div>
                            <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                              <span className="text-slate-400">Завершение:</span>
                              <span className="text-white font-mono">{record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}</span>
                            </div>
                          </div>
                          
                          <div className={`${isMobileForced ? 'space-y-0' : 'space-y-1'} text-xs`}>
                            <div className={`flex justify-between items-center ${isMobileForced ? 'py-0' : ''}`}>
                              <span className="text-slate-400">Тип записи:</span>
                              <Badge className="bg-slate-700 border-slate-600 text-slate-200 text-xs">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </div>
                            <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                              <span className="text-slate-400">Топливо:</span>
                              <span className="text-white">{record.fuelType || '—'}</span>
                            </div>
                          </div>
                          
                          {(record.quantity || record.price || record.totalCost) && (
                            <div className={`${isMobileForced ? 'space-y-0' : 'space-y-1'} text-xs`}>
                              <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                                <span className="text-slate-400">Кол-во:</span>
                                <span className="text-white font-mono">
                                  {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                                </span>
                              </div>
                              <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                                <span className="text-slate-400">Цена:</span>
                                <span className="text-white font-mono">
                                  {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                                </span>
                              </div>
                              <div className={`flex justify-between ${isMobileForced ? 'py-0' : ''}`}>
                                <span className="text-slate-400">Сумма:</span>
                                <span className="text-white font-mono font-bold">
                                  {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                                </span>
                              </div>
                            </div>
                          )}

                          {record.paymentMethod && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Вид оплаты:</span>
                              <span className="text-white">
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
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Длительность:</span>
                              <span className="text-white font-mono">{formatDuration(record.duration)}</span>
                            </div>
                          )}
                          
                          <div className="text-xs border-t border-slate-600 pt-2">
                            <div className="space-y-1">
                              <span className="text-slate-400 text-xs">Детали:</span>
                              <div className="text-slate-300 text-xs leading-relaxed">
                                {record.details}
                                {record.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400 inline ml-1" />}
                              </div>
                            </div>
                          </div>
                          
                          {isNetworkOnly && record.tradingPointName && (
                            <div className="text-xs border-t border-slate-600 pt-2">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Торговая точка:</span>
                                <span className="text-slate-300 font-medium text-right truncate max-w-[150px]">{record.tradingPointName}</span>
                              </div>
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
                        <TableRow className="border-b border-slate-600">
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
                          <TableRow key={record.id} className="border-b border-slate-600 hover:bg-slate-700 transition-colors">
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
                              <Badge className="bg-slate-700 border-slate-600 text-slate-200">
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