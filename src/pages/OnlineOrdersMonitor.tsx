/**
 * Страница мониторинга онлайн-заказов MSTO в реальном времени
 *
 * Функциональность:
 * - Real-time таблица онлайн-заказов (polling 10 сек)
 * - KPI dashboard (количество, сумма, статистика по станциям)
 * - Фильтрация по датам, станциям, статусам
 * - Визуальное выделение новых заказов
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSelection } from '@/contexts/SelectionContext';
import { tradingPointsService } from '@/services/tradingPointsService';
import type { TradingPoint } from '@/types/tradingpoint';
import {
  Smartphone,
  RefreshCw,
  TrendingUp,
  Fuel,
  MapPin,
  Clock,
  Activity,
  Pause,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
  Timer,
  Info
} from 'lucide-react';
import {
  onlineOrdersService,
  OnlineOrder,
  OnlineOrdersStats,
  OnlineOrdersFilters
} from '@/services/onlineOrdersService';
import { getMstoOrderDetails } from '@/services/mstoProxyClient';
import type { MSTOOrderDetailsResponse } from '@/types/mstoOrders';
import { OrderDetailsDialog } from '@/components/online-orders/OrderDetailsDialog';

/**
 * Извлекает MSTO servicePointId из externalCodes торговой точки
 */
function getMstoServicePointId(tradingPoint: TradingPoint | null): number | null {
  if (!tradingPoint?.externalCodes) return null;
  
  const mstoCode = tradingPoint.externalCodes.find(
    ec => ec.system?.toLowerCase() === 'msto' && ec.isActive
  );
  
  if (mstoCode) {
    const id = parseInt(mstoCode.code, 10);
    return id > 0 ? id : null;
  }
  
  return null;
}

/**
 * Извлекает все MSTO servicePointId из списка торговых точек
 */
function getAllMstoServicePointIds(tradingPoints: TradingPoint[]): number[] {
  const ids: number[] = [];
  
  for (const tp of tradingPoints) {
    if (!tp.externalCodes) continue;
    
    for (const ec of tp.externalCodes) {
      if (ec.system?.toLowerCase() === 'msto' && ec.isActive) {
        const id = parseInt(ec.code, 10);
        if (id > 0) {
          ids.push(id);
        }
      }
    }
  }
  
  return ids;
}

// Цвета для статусов (палитра как на странице оборудования)
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-600 text-white',
  pending: 'bg-amber-600 text-foreground',
  failed: 'bg-red-600 text-white',
  cancelled: 'bg-secondary text-foreground'
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Выполнен',
  pending: 'Ожидание',
  failed: 'Ошибка',
  cancelled: 'Отменён'
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3" />,
  pending: <Timer className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  cancelled: <AlertCircle className="w-3 h-3" />
};

// Цвета для топлива
const FUEL_COLORS: Record<string, string> = {
  'АИ-92': 'bg-emerald-500',
  'АИ-95': 'bg-primary',
  'АИ-98': 'bg-purple-500',
  'ДТ': 'bg-amber-500',
  'ДТЗ': 'bg-orange-500',
  'Пропан': 'bg-cyan-500',
  'Газ': 'bg-cyan-500',
  'Метан': 'bg-teal-500'
};

export default function OnlineOrdersMonitor() {
  const isMobile = useIsMobile();

  // Глобальные селекторы БТО (сеть и торговая точка)
  const { selectedNetwork, selectedNetworkIds, selectedStation: globalSelectedStation, isAllTradingPoints } = useSelection();

  // Торговые точки сети (для получения MSTO ID)
  const [networkTradingPoints, setNetworkTradingPoints] = useState<TradingPoint[]>([]);

  // Состояние данных
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [stats, setStats] = useState<OnlineOrdersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Находим выбранный заказ из текущего списка
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [selectedOrderId, orders]);

  // Детальная информация о заказе из Orders API
  const [orderDetails, setOrderDetails] = useState<MSTOOrderDetailsResponse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Состояние мониторинга
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Фильтры
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedFuel, setSelectedFuel] = useState<string>('all');

  // Загружаем торговые точки всех выбранных сетей
  useEffect(() => {
    if (selectedNetworkIds.length === 0) {
      setNetworkTradingPoints([]);
      return;
    }

    Promise.all(
      selectedNetworkIds.map(id => tradingPointsService.getByNetworkId(id).catch(() => [] as TradingPoint[]))
    )
      .then(results => setNetworkTradingPoints(results.flat()))
      .catch(() => setNetworkTradingPoints([]));
  }, [selectedNetworkIds]);

  // Сброс фильтра топлива при смене станции/сети
  useEffect(() => {
    setSelectedFuel('all');
  }, [globalSelectedStation?.id, isAllTradingPoints]);

  // Рефы
  const stopMonitoringRef = useRef<(() => void) | null>(null);

  // Получаем MSTO servicePointId для глобально выбранной торговой точки
  // Теперь используем externalCodes из торговой точки
  const globalMstoServicePointId = useMemo(() => {
    if (isAllTradingPoints || !globalSelectedStation) return null;
    return getMstoServicePointId(globalSelectedStation);
  }, [globalSelectedStation, isAllTradingPoints]);

  // Получаем список servicePointId для всей сети (когда "Все станции")
  // Теперь используем externalCodes из всех торговых точек сети
  const networkMstoServicePointIds = useMemo(() => {
    if (!isAllTradingPoints || networkTradingPoints.length === 0) return null;
    const ids = getAllMstoServicePointIds(networkTradingPoints);
    return ids.length > 0 ? ids : null;
  }, [isAllTradingPoints, networkTradingPoints]);

  // Флаг: MSTO не настроен для текущей сети/станции
  const mstoNotConfigured = useMemo(() => {
    if (networkTradingPoints.length === 0) return false; // ещё загружаются
    if (isAllTradingPoints) return networkMstoServicePointIds === null;
    if (globalSelectedStation) return globalMstoServicePointId === null;
    return false;
  }, [isAllTradingPoints, networkMstoServicePointIds, globalSelectedStation, globalMstoServicePointId, networkTradingPoints]);

  // Список видов топлива из заказов (для фильтра)
  // Формируется из заказов, уже отфильтрованных по станциям сети
  const fuelOptions = useMemo(() => {
    const fuels = new Set<string>();

    // Если нет MSTO кодов для фильтрации - возвращаем пустой список
    if (!isAllTradingPoints && globalSelectedStation && globalMstoServicePointId === null) {
      return [];
    }
    if (isAllTradingPoints && networkMstoServicePointIds === null) {
      return [];
    }

    orders.forEach(order => {
      // Применяем тот же фильтр по станциям что и для заказов
      let matchesStation = true;

      if (globalMstoServicePointId !== null) {
        matchesStation = order.servicePointId === globalMstoServicePointId;
      } else if (networkMstoServicePointIds !== null) {
        matchesStation = networkMstoServicePointIds.includes(order.servicePointId || 0);
      }

      if (matchesStation && order.fuelType) {
        fuels.add(order.fuelType);
      }
    });

    return Array.from(fuels).sort();
  }, [orders, globalMstoServicePointId, networkMstoServicePointIds, isAllTradingPoints, globalSelectedStation]);

  // Фильтрованные заказы
  // Применяем глобальный фильтр БТО + локальные фильтры (статус, топливо)
  const filteredOrders = useMemo(() => {
    // Если выбрана конкретная станция, но у неё нет MSTO кода - показываем пустой список
    if (!isAllTradingPoints && globalSelectedStation && globalMstoServicePointId === null) {
      return [];
    }

    // Если "Все станции", но ни у одной нет MSTO кода - показываем пустой список
    if (isAllTradingPoints && networkMstoServicePointIds === null) {
      return [];
    }

    return orders.filter(order => {
      // Фильтр по конкретной торговой точке (из хедера)
      if (globalMstoServicePointId !== null) {
        if (order.servicePointId !== globalMstoServicePointId) {
          return false;
        }
      }
      // Фильтр по всем станциям сети (когда "Все станции")
      else if (networkMstoServicePointIds !== null) {
        if (!networkMstoServicePointIds.includes(order.servicePointId || 0)) {
          return false;
        }
      }

      // Фильтр по статусу
      if (selectedStatus !== 'all' && order.status !== selectedStatus) {
        return false;
      }

      // Фильтр по виду топлива
      if (selectedFuel !== 'all' && order.fuelType !== selectedFuel) {
        return false;
      }

      return true;
    });
  }, [orders, selectedStatus, selectedFuel, globalMstoServicePointId, networkMstoServicePointIds, isAllTradingPoints, globalSelectedStation]);

  // Статистика по фильтрованным заказам
  const filteredStats = useMemo(() => {
    return onlineOrdersService.calculateStats(filteredOrders);
  }, [filteredOrders]);

  // Callback для обновления данных
  const handleOrdersUpdate = useCallback((
    newOrders: OnlineOrder[],
    justAdded: OnlineOrder[]
  ) => {
    setOrders(newOrders);
    setStats(onlineOrdersService.calculateStats(newOrders));
    setLastUpdate(new Date());
    setLoading(false);
    setError(null);

    // Выделяем новые заказы
    if (justAdded.length > 0) {
      const newIds = new Set(justAdded.map(o => o.id));
      setNewOrderIds(newIds);

      // Убираем выделение через 5 секунд
      setTimeout(() => {
        setNewOrderIds(new Set());
      }, 5000);
    }
  }, []);

  // Запуск/остановка мониторинга
  // Останавливаем polling когда открыто модальное окно
  useEffect(() => {
    if (!isMonitoring || selectedOrderId) {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
        stopMonitoringRef.current = null;
      }
      return;
    }

    setLoading(true);
    setError(null);

    const filters: OnlineOrdersFilters = {
      dateFrom,
      dateTo,
      // Показываем все статусы, фильтрация на UI
    };

    stopMonitoringRef.current = onlineOrdersService.startMonitoring(
      filters,
      handleOrdersUpdate,
      10000, // 10 секунд
      (errorMsg) => {
        setError(errorMsg);
        setLoading(false);
      }
    );

    return () => {
      if (stopMonitoringRef.current) {
        stopMonitoringRef.current();
        stopMonitoringRef.current = null;
      }
    };
  }, [isMonitoring, dateFrom, dateTo, handleOrdersUpdate, selectedOrderId]);

  // Ручное обновление (с индикатором загрузки)
  const handleManualRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: OnlineOrdersFilters = {
        dateFrom,
        dateTo,
      };
      const newOrders = await onlineOrdersService.getOnlineOrders(filters);
      handleOrdersUpdate(newOrders, []);
    } catch (err) {
      setError('Ошибка загрузки данных из MSTO');
      setLoading(false);
    }
  };

  // Тихое обновление (без мигания UI) - для модального окна
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleSilentRefresh = async () => {
    setIsRefreshing(true);
    try {
      const filters: OnlineOrdersFilters = {
        dateFrom,
        dateTo,
      };
      const newOrders = await onlineOrdersService.getOnlineOrders(filters);
      setOrders(newOrders);
      setStats(onlineOrdersService.calculateStats(newOrders));
      setLastUpdate(new Date());
    } catch (err) {
      // Тихо игнорируем ошибку
    } finally {
      setIsRefreshing(false);
    }
  };

  // Загрузка детальной информации о заказе из Orders API
  // externalId в OnlineOrder это sessionId в MSTO
  useEffect(() => {
    if (!selectedOrder?.externalId) {
      setOrderDetails(null);
      return;
    }

    const loadOrderDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const details = await getMstoOrderDetails(selectedOrder.externalId);
        setOrderDetails(details);
      } catch (err) {
        console.error('[OrderDetails] Ошибка загрузки:', err);
        setOrderDetails(null);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadOrderDetails();
  }, [selectedOrder?.externalId]);

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование времени последнего обновления
  const formatLastUpdate = () => {
    if (!lastUpdate) return '—';
    return lastUpdate.toLocaleTimeString('ru-RU');
  };

  return (
    <MainLayout>
      {/* Модальное окно деталей заказа */}
      <OrderDetailsDialog
        order={selectedOrder}
        orderDetails={orderDetails}
        isLoadingDetails={isLoadingDetails}
        isRefreshing={isRefreshing}
        onClose={() => setSelectedOrderId(null)}
        onRefresh={handleSilentRefresh}
      />

      <div className="space-y-4 p-4">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
              <Smartphone className="w-6 h-6 text-primary dark:text-primary/70" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Онлайн заказы</h1>
              {!isAllTradingPoints && globalSelectedStation && (
                <p className="text-sm text-foreground/80">
                  {globalSelectedStation.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Статус мониторинга */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-card rounded-lg">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              <span className="text-xs sm:text-sm text-foreground/80 hidden sm:inline">
                {isMonitoring ? 'Активен' : 'Остановлен'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatLastUpdate()}
              </span>
            </div>

            {/* Кнопки управления */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMonitoring(!isMonitoring)}
              className="px-2 sm:px-3"
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-2 sm:px-3"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* KPI карточки */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {loading ? <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" /> : filteredStats.totalOrders}
                  </p>
                  <p className="text-xs text-muted-foreground">Всего</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Timer className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {loading ? <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" /> : filteredStats.pendingOrders}
                  </p>
                  <p className="text-xs text-muted-foreground">Ожидание</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {loading ? <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" /> : filteredStats.completedOrders}
                  </p>
                  <p className="text-xs text-muted-foreground">Выполнено</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <p className="text-base sm:text-xl font-bold text-foreground">
                    {loading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-24" />
                    ) : (
                      onlineOrdersService.formatCurrency(filteredStats.totalRevenue)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Выручка</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <Fuel className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary/70" />
                </div>
                <div>
                  <p className="text-base sm:text-xl font-bold text-foreground">
                    {loading ? (
                      <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
                    ) : (
                      `${filteredStats.totalVolume.toFixed(1)} л`
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Объём</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Фильтры */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Дата от</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Дата до</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-secondary border-border text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Топливо</Label>
                <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все виды</SelectItem>
                    {fuelOptions.map(fuel => (
                      <SelectItem key={fuel} value={fuel}>
                        {fuel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Статус</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="pending">Ожидание</SelectItem>
                    <SelectItem value="completed">Выполнено</SelectItem>
                    <SelectItem value="cancelled">Отменено</SelectItem>
                    <SelectItem value="failed">Ошибка</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Таблица заказов */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Заказы
              {filteredOrders.length > 0 && (
                <Badge variant="secondary" className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-300">
                  {filteredOrders.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {mstoNotConfigured ? (
              <div className="p-8 text-center">
                <Info className="w-12 h-12 text-primary mx-auto mb-3" />
                <p className="text-base font-medium text-foreground mb-1">Сервис онлайн-заказов не настроен</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Для работы с онлайн-заказами необходимо указать коды MSTO
                  в настройках торговых точек (раздел «Сети и ТТ» → внешние коды).
                </p>
              </div>
            ) : loading && orders.length === 0 ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground/80 mb-2">Загрузка онлайн-заказов...</p>
                <p className="text-sm text-muted-foreground">
                  Первая загрузка может занять несколько секунд.<br />
                  Последующие обновления будут мгновенными.
                </p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  className="mt-4"
                >
                  Повторить
                </Button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Нет заказов за выбранный период</p>
              </div>
            ) : isMobile ? (
              // Мобильное представление - карточки
              <div className="divide-y divide-border">
                {filteredOrders.slice(0, 50).map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 transition-colors cursor-pointer active:bg-secondary ${
                      newOrderIds.has(order.id)
                        ? 'bg-primary/10 animate-pulse'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                          {order.stationName}
                        </span>
                        <Badge className={`${STATUS_COLORS[order.status]} flex items-center gap-1`}>
                          {STATUS_ICONS[order.status]}
                          {STATUS_LABELS[order.status]}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.date)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            FUEL_COLORS[order.fuelType] || 'bg-muted-foreground'
                          }`}
                        />
                        <span className="text-sm text-foreground/80">{order.fuelType}</span>
                        {order.columnNumber && (
                          <span className="text-xs text-muted-foreground">ТРК {order.columnNumber}</span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {order.price.toFixed(2)} ₽/л
                      </span>
                    </div>
                    <div className="text-sm space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Заказ: {order.orderVolume.toFixed(2)} л</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {onlineOrdersService.formatCurrency(order.orderTotal)}
                        </span>
                      </div>
                      {order.volume > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Факт: {order.volume.toFixed(2)} л</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {onlineOrdersService.formatCurrency(order.total)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredOrders.length > 50 && (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    Показано 50 из {filteredOrders.length}
                  </div>
                )}
              </div>
            ) : (
              // Десктопное представление - таблица
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Дата/время</TableHead>
                      <TableHead className="text-muted-foreground">Станция</TableHead>
                      <TableHead className="text-muted-foreground">Топливо</TableHead>
                      <TableHead className="text-muted-foreground text-right">Заказано</TableHead>
                      <TableHead className="text-muted-foreground text-right">Отпущено</TableHead>
                      <TableHead className="text-muted-foreground text-right">Цена</TableHead>
                      <TableHead className="text-muted-foreground text-right">Сумма заказа</TableHead>
                      <TableHead className="text-muted-foreground text-right">Сумма отпуска</TableHead>
                      <TableHead className="text-muted-foreground">Статус</TableHead>
                      <TableHead className="text-muted-foreground text-center">Колонка</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.slice(0, 100).map(order => (
                      <TableRow
                        key={order.id}
                        onClick={() => setSelectedOrderId(order.id)}
                        className={`border-border transition-colors cursor-pointer ${
                          newOrderIds.has(order.id)
                            ? 'bg-primary/10 animate-pulse'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        <TableCell className="text-foreground/80 text-sm whitespace-nowrap">
                          {formatDate(order.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground font-medium truncate max-w-[180px]">
                              {order.stationName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                FUEL_COLORS[order.fuelType] || 'bg-muted-foreground'
                              }`}
                            />
                            <span className="text-foreground/80">{order.fuelType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {order.orderVolume.toFixed(2)} л
                        </TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {order.volume > 0 ? `${order.volume.toFixed(2)} л` : '—'}
                        </TableCell>
                        <TableCell className="text-right text-foreground/80">
                          {order.price.toFixed(2)} ₽
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">
                          {onlineOrdersService.formatCurrency(order.orderTotal)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                          {order.total > 0 ? onlineOrdersService.formatCurrency(order.total) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${STATUS_COLORS[order.status]} flex items-center gap-1 w-fit`}>
                            {STATUS_ICONS[order.status]}
                            {STATUS_LABELS[order.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-foreground/80 font-medium">
                          {order.columnNumber || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
