/**
 * Сервис мониторинга онлайн-заказов MSTO в реальном времени
 *
 * Использует MSTO IntegratorService API для получения:
 * - Заказов в статусе "Ожидание" (wait)
 * - Выполненных заказов (success)
 * - Отменённых заказов (cancel, error)
 */

import { mstoProxyClient, getMstoTransactions, type GetMstoTransactionsParams } from './mstoProxyClient';
import type { MSTOTransaction } from '@/types/mstoReconciliation';

// Типы данных онлайн-заказа
export interface OnlineOrder {
  id: string;
  externalId: string;
  date: string;
  stationName: string;
  servicePointId?: number;
  fuelType: string;
  volume: number;
  orderVolume: number;
  price: number;
  total: number;
  orderTotal: number;
  aggregator: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  columnNumber?: number;
  apiData?: MSTOTransaction;
}

// Статистика по онлайн-заказам
export interface OnlineOrdersStats {
  totalOrders: number;
  totalRevenue: number;
  totalVolume: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  averageOrderValue: number;
  byStation: Record<string, {
    stationName: string;
    orders: number;
    revenue: number;
    volume: number;
  }>;
  byFuel: Record<string, {
    fuelType: string;
    orders: number;
    revenue: number;
    volume: number;
  }>;
  byAggregator: Record<string, {
    aggregator: string;
    orders: number;
    revenue: number;
  }>;
}

// Фильтры для онлайн-заказов
export interface OnlineOrdersFilters {
  dateFrom?: string;
  dateTo?: string;
  stationNames?: string[];
  operationResults?: ('wait' | 'success' | 'cancel' | 'error')[];
}

/**
 * Маппинг статусов MSTO на наши
 */
function mapMstoStatus(operationResult: string): OnlineOrder['status'] {
  switch (operationResult?.toLowerCase()) {
    case 'wait':
      return 'pending';
    case 'success':
      return 'completed';
    case 'cancel':
      return 'cancelled';
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}

/**
 * Преобразование транзакции MSTO в OnlineOrder
 */
function transformMstoToOrder(tx: MSTOTransaction): OnlineOrder {
  return {
    id: String(tx.id || tx.externalId),
    externalId: tx.externalId || '',
    date: tx.orderDate || tx.completedAt || new Date().toISOString(),
    stationName: tx.servicePointName || 'Неизвестная станция',
    servicePointId: tx.servicePointId,
    fuelType: tx.fuelName || 'Неизвестно',
    volume: tx.resultValue || 0,
    orderVolume: tx.orderValue || 0,
    price: tx.price || 0,
    total: tx.resultSum || 0,
    orderTotal: tx.orderSum || 0,
    aggregator: tx.tariffName || 'Неизвестный агрегатор',
    status: mapMstoStatus(tx.operationResult),
    columnNumber: tx.columnNumber,
    apiData: tx
  };
}

class OnlineOrdersService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastOrderIds: Set<string> = new Set();

  /**
   * Получить онлайн-заказы из MSTO за период
   */
  async getOnlineOrders(filters: OnlineOrdersFilters): Promise<OnlineOrder[]> {
    const { dateFrom, dateTo, stationNames, operationResults } = filters;

    try {
      // Формируем параметры для MSTO API
      const params: GetMstoTransactionsParams = {
        dateFrom: dateFrom || new Date().toISOString().split('T')[0],
        dateTo: dateTo || new Date().toISOString().split('T')[0],
      };

      // Фильтр по статусам
      if (operationResults && operationResults.length > 0) {
        params.operationResults = operationResults;
      }

      // Получаем транзакции из MSTO
      const transactions = await getMstoTransactions(params);

      // Преобразуем в наш формат
      let orders = transactions.map(transformMstoToOrder);

      // Фильтруем по станциям если указано
      if (stationNames && stationNames.length > 0) {
        orders = orders.filter(order =>
          stationNames.some(name =>
            order.stationName.toLowerCase().includes(name.toLowerCase())
          )
        );
      }

      // Сортируем по дате (свежие сверху)
      orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return orders;

    } catch (error) {
      console.error('Ошибка загрузки онлайн-заказов из MSTO:', error);
      throw error;
    }
  }

  /**
   * Получить только заказы в ожидании (wait)
   */
  async getPendingOrders(filters: Omit<OnlineOrdersFilters, 'operationResults'> = {}): Promise<OnlineOrder[]> {
    return this.getOnlineOrders({
      ...filters,
      operationResults: ['wait']
    });
  }

  /**
   * Получить статистику по онлайн-заказам
   */
  calculateStats(orders: OnlineOrder[]): OnlineOrdersStats {
    const stats: OnlineOrdersStats = {
      totalOrders: orders.length,
      totalRevenue: 0,
      totalVolume: 0,
      completedOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      averageOrderValue: 0,
      byStation: {},
      byFuel: {},
      byAggregator: {}
    };

    for (const order of orders) {
      // Используем заказанные суммы для pending, фактические для completed
      const revenue = order.status === 'completed' ? order.total : order.orderTotal;
      const volume = order.status === 'completed' ? order.volume : order.orderVolume;

      stats.totalRevenue += revenue;
      stats.totalVolume += volume;

      if (order.status === 'completed') {
        stats.completedOrders++;
      } else if (order.status === 'pending') {
        stats.pendingOrders++;
      } else if (order.status === 'failed' || order.status === 'cancelled') {
        stats.failedOrders++;
      }

      // По станциям
      const stationKey = order.stationName;
      if (!stats.byStation[stationKey]) {
        stats.byStation[stationKey] = {
          stationName: order.stationName,
          orders: 0,
          revenue: 0,
          volume: 0
        };
      }
      stats.byStation[stationKey].orders++;
      stats.byStation[stationKey].revenue += revenue;
      stats.byStation[stationKey].volume += volume;

      // По топливу
      if (!stats.byFuel[order.fuelType]) {
        stats.byFuel[order.fuelType] = {
          fuelType: order.fuelType,
          orders: 0,
          revenue: 0,
          volume: 0
        };
      }
      stats.byFuel[order.fuelType].orders++;
      stats.byFuel[order.fuelType].revenue += revenue;
      stats.byFuel[order.fuelType].volume += volume;

      // По агрегаторам
      if (!stats.byAggregator[order.aggregator]) {
        stats.byAggregator[order.aggregator] = {
          aggregator: order.aggregator,
          orders: 0,
          revenue: 0
        };
      }
      stats.byAggregator[order.aggregator].orders++;
      stats.byAggregator[order.aggregator].revenue += revenue;
    }

    stats.averageOrderValue = stats.totalOrders > 0
      ? stats.totalRevenue / stats.totalOrders
      : 0;

    return stats;
  }

  /**
   * Запустить мониторинг в реальном времени
   */
  startMonitoring(
    filters: OnlineOrdersFilters,
    onUpdate: (orders: OnlineOrder[], newOrders: OnlineOrder[]) => void,
    intervalMs: number = 10000,
    onError?: (error: string) => void
  ): () => void {
    // Очищаем предыдущий интервал
    this.stopMonitoring();

    const poll = async () => {
      try {
        const orders = await this.getOnlineOrders(filters);

        // Определяем новые заказы
        const currentIds = new Set(orders.map(o => o.id));
        const newOrders = orders.filter(order => !this.lastOrderIds.has(order.id));

        // Обновляем кэш ID
        this.lastOrderIds = currentIds;

        onUpdate(orders, newOrders);
      } catch (error) {
        console.error('Ошибка polling онлайн-заказов MSTO:', error);
        if (onError) {
          const msg = error instanceof Error ? error.message : 'Ошибка загрузки данных из MSTO';
          onError(msg);
        }
      }
    };

    // Начальная загрузка
    poll();

    // Запускаем интервал
    this.pollingInterval = setInterval(poll, intervalMs);

    // Возвращаем функцию остановки
    return () => this.stopMonitoring();
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Форматирование суммы
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Форматирование объёма
   */
  formatVolume(value: number): string {
    return `${value.toFixed(2)} л`;
  }
}

export const onlineOrdersService = new OnlineOrdersService();
export default onlineOrdersService;
