/**
 * Сервис мониторинга онлайн-заказов MSTO в реальном времени
 *
 * Использует MSTO IntegratorService API для получения:
 * - Заказов в статусе "Ожидание" (wait)
 * - Выполненных заказов (success)
 * - Отменённых заказов (cancel, error)
 */

import { mstoProxyClient, getMstoTransactions, type GetMstoTransactionsParams } from './mstoProxyClient';
import type { MSTOTransaction } from '@/types/msto';

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
  /**
   * Коды точек MSTO (servicePointId) для строгой выборки заказов ПО ID.
   * Если задан (в т.ч. пустой массив) — заказы запрашиваются у MSTO с
   * server-side фильтром по каждому коду и помечаются именно этим кодом,
   * без сопоставления по названию точки. Пустой массив = нет привязок = пусто.
   */
  servicePointIds?: number[];
  /** @deprecated сопоставление по имени — ненадёжно (см. servicePointIds) */
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
    const { dateFrom, dateTo, servicePointIds, stationNames, operationResults } = filters;
    const dFrom = dateFrom || new Date().toISOString().split('T')[0];
    const dTo = dateTo || new Date().toISOString().split('T')[0];
    const byDateDesc = (a: OnlineOrder, b: OnlineOrder) =>
      new Date(b.date).getTime() - new Date(a.date).getTime();

    try {
      // ── Строгий режим: сопоставление заказа с точкой ТОЛЬКО по servicePointId ──
      // MSTO в транзакциях не отдаёт servicePointId, поэтому запрашиваем заказы по
      // каждому коду точки отдельно (MSTO фильтрует на сервере) и проставляем заказу
      // именно запрошенный код. БЕЗ угадывания по названию — иначе чужая точка с
      // похожим именем (напр. газовая «Непокоренных», Пропан-24) прилипает к нашей.
      if (servicePointIds !== undefined) {
        if (servicePointIds.length === 0) return [];

        // allSettled: транзиентный сбой MSTO (502) по одной точке не должен
        // ронять весь список — отдаём данные по успешным точкам, следующий
        // poll догрузит остальное. Бросаем только если упали ВСЕ точки.
        const settled = await Promise.allSettled<OnlineOrder[]>(
          servicePointIds.map(async (spId): Promise<OnlineOrder[]> => {
            const txs = await getMstoTransactions({
              dateFrom: dFrom,
              dateTo: dTo,
              servicePointIds: [spId],
              ...(operationResults && operationResults.length > 0 ? { operationResults } : {}),
            });
            // Авторитетно помечаем заказы кодом запрошенной точки
            return txs.map(transformMstoToOrder).map((o): OnlineOrder => ({ ...o, servicePointId: spId }));
          })
        );

        const fulfilled = settled.filter(
          (r): r is PromiseFulfilledResult<OnlineOrder[]> => r.status === 'fulfilled'
        );
        if (fulfilled.length === 0) {
          const firstRejected = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          throw firstRejected?.reason ?? new Error('Не удалось загрузить онлайн-заказы из MSTO');
        }

        const orders = fulfilled.flatMap((r) => r.value);
        orders.sort(byDateDesc);
        return orders;
      }

      // ── Legacy-режим (без указания точек): тянем всё, фильтр по имени (устар.) ──
      const params: GetMstoTransactionsParams = { dateFrom: dFrom, dateTo: dTo };
      if (operationResults && operationResults.length > 0) {
        params.operationResults = operationResults;
      }

      const transactions = await getMstoTransactions(params);
      let orders = transactions.map(transformMstoToOrder);

      if (stationNames && stationNames.length > 0) {
        orders = orders.filter(order =>
          stationNames.some(name =>
            order.stationName.toLowerCase().includes(name.toLowerCase())
          )
        );
      }

      orders.sort(byDateDesc);
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
