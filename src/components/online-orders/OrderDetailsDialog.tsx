/**
 * Диалог деталей онлайн-заказа MSTO
 *
 * Отображает полную информацию о заказе:
 * - Статус и время обработки
 * - Станция и колонка
 * - Топливо, объём, прогресс выполнения
 * - Финансы (оплата, возврат)
 * - Хронология событий (timeline)
 * - Техническая информация
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw,
  MapPin,
  Clock,
  Fuel,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  Timer,
  AlertCircle,
  Info
} from 'lucide-react';
import type { OnlineOrder } from '@/services/onlineOrdersService';
import { onlineOrdersService } from '@/services/onlineOrdersService';
import type { MSTOOrderDetailsResponse, MSTOTimelineEvent } from '@/types/mstoOrders';

// ============================================================================
// Константы
// ============================================================================

/** Цвета статусов */
const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  pending: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  failed: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  cancelled: 'bg-muted-foreground/20 text-muted-foreground border-border/30'
};

/** Метки статусов */
const STATUS_LABELS: Record<string, string> = {
  completed: 'Выполнен',
  pending: 'Ожидание',
  failed: 'Ошибка',
  cancelled: 'Отменён'
};

/** Иконки статусов */
const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="w-3 h-3" />,
  pending: <Timer className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  cancelled: <AlertCircle className="w-3 h-3" />
};

/** Цвета топлива */
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

// ============================================================================
// Утилиты форматирования
// ============================================================================

/**
 * Форматирует длительность в человекочитаемый вид
 * @param startMs - timestamp начала (ms)
 * @param endMs - timestamp окончания (ms)
 * @returns "1м 45с" или "—"
 */
function formatDuration(startMs: number | undefined, endMs: number | undefined): string {
  if (!startMs || !endMs) return '—';

  const diffMs = endMs - startMs;
  if (diffMs < 0) return '—';

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}с`;
  }
  return `${minutes}м ${seconds}с`;
}

/**
 * Форматирует timestamp в читаемую дату
 */
function formatTimestamp(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * Форматирует только время из timestamp
 */
function formatTime(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * Форматирует ISO дату
 */
function formatIsoDate(isoStr: string | undefined): string {
  if (!isoStr) return '—';
  try {
    const date = new Date(isoStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoStr;
  }
}

/**
 * Вычисляет процент выполнения заказа
 */
function calculateProgress(actual: number, ordered: number): number {
  if (!ordered || ordered <= 0) return 0;
  if (!actual || actual <= 0) return 0;
  const percent = (actual / ordered) * 100;
  return Math.min(Math.round(percent), 100);
}

// ============================================================================
// Типы
// ============================================================================

interface OrderDetailsDialogProps {
  /** Заказ из списка */
  order: OnlineOrder | null;
  /** Детальные данные из Orders API */
  orderDetails: MSTOOrderDetailsResponse | null;
  /** Флаг загрузки деталей */
  isLoadingDetails: boolean;
  /** Флаг обновления */
  isRefreshing: boolean;
  /** Обработчик закрытия диалога */
  onClose: () => void;
  /** Обработчик обновления данных */
  onRefresh: () => void;
}

// ============================================================================
// Компонент
// ============================================================================

export function OrderDetailsDialog({
  order,
  orderDetails,
  isLoadingDetails,
  isRefreshing,
  onClose,
  onRefresh
}: OrderDetailsDialogProps) {
  if (!order) return null;

  // Парсим JSON данных заказа
  const jsonData = parseOrderJson(order);

  // Получаем timeline
  const timeline = getOrderTimeline(order, orderDetails);

  // Вычисляем данные для отображения
  const orderedVolume = order.orderVolume;
  const actualVolume = order.volume > 0 ? order.volume : 0;
  const underfill = orderedVolume - actualVolume; // Неполучено
  const progress = calculateProgress(actualVolume, orderedVolume);

  const orderedSum = order.orderTotal;
  const actualSum = order.total > 0 ? order.total : 0;
  const refundSum = orderDetails?.finish?.refundSum ?? (orderedSum - actualSum);

  // Время обработки
  const startTime = orderDetails?.order?.dateTime ||
    (jsonData?.DateCreate ? new Date(jsonData.DateCreate).getTime() : undefined);
  const endTime = orderDetails?.finish?.dateTime ||
    (jsonData?.DateEnd ? new Date(jsonData.DateEnd).getTime() : undefined);
  const duration = formatDuration(startTime, endTime);

  // Техническая информация
  const orderId = orderDetails?.order?.orderId || order.id;
  const sessionId = order.externalId;
  const contractId = orderDetails?.order?.details?.ContractId || jsonData?.ContractId;

  // Информация об ошибке
  // Приоритет: details.Reason (от станции) > finish.error > order.error
  const detailsReason = orderDetails?.order?.details?.Reason;
  const errorMessage = detailsReason || orderDetails?.finish?.error || orderDetails?.order?.error || null;
  const errorCode = orderDetails?.order?.errorCode || null;
  
  // Детальный статус из API (например "Отменен станцией" вместо generic "Ошибка")
  const detailedStatusName = orderDetails?.order?.statusName || null;
  
  // Тип заказа (по литрам или по сумме)
  const orderType = orderDetails?.order?.details?.OrderType;

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] max-h-[90vh] bg-background border-border overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary dark:text-primary/70" />
              Детали заказа
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="mr-6"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-4">
            {/* ============================================================ */}
            {/* Шапка: Статус, ID, источник, время */}
            {/* ============================================================ */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className={`${STATUS_COLORS[order.status]} flex items-center gap-1 text-sm`}>
                  {STATUS_ICONS[order.status]}
                  {STATUS_LABELS[order.status]}
                </Badge>
                <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                  ID: {orderId}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  Источник: <span className="text-foreground">Агрегатор</span>
                </span>
                {duration !== '—' && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Обработка: <span className="text-foreground">{duration}</span>
                  </span>
                )}
              </div>
              {/* Даты создания и завершения */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  Создан: <span className="text-foreground">{startTime ? formatTimestamp(startTime) : '—'}</span>
                </span>
                {endTime && (
                  <span className="text-muted-foreground">
                    Завершён: <span className="text-foreground">{formatTimestamp(endTime)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* Причина ошибки (только для failed/cancelled) */}
            {/* ============================================================ */}
            {(order.status === 'failed' || order.status === 'cancelled') && (errorMessage || detailedStatusName) && (
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      {detailedStatusName && (
                        <p className="text-red-600 dark:text-red-400 font-medium">{detailedStatusName}</p>
                      )}
                      {errorMessage && (
                        <p className="text-foreground text-sm">
                          Причина: {errorMessage}
                        </p>
                      )}
                      {errorCode && (
                        <p className="text-red-600 dark:text-red-300/70 text-xs font-mono">
                          Код: {errorCode}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ============================================================ */}
            {/* Станция и колонка */}
            {/* ============================================================ */}
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">{order.stationName}</span>
                </div>
                {order.columnNumber && (
                  <div className="text-sm text-muted-foreground">
                    Колонка (ТРК): <span className="text-foreground">{order.columnNumber}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Топливо и объём с прогресс-баром */}
            {/* ============================================================ */}
            <Card className="bg-card/50 border-border">
              <CardContent className="p-4 space-y-4">
                {/* Топливо и цена */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-muted-foreground" />
                    <div className={`w-3 h-3 rounded-full ${FUEL_COLORS[order.fuelType] || 'bg-muted-foreground'}`} />
                    <span className="text-foreground font-medium">{order.fuelType}</span>
                    {orderType && (
                      <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                        {orderType === 'Liters' ? 'по литрам' : 'по сумме'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-foreground/80">{order.price.toFixed(2)} ₽/л</span>
                </div>

                {/* Прогресс-бар */}
                {actualVolume > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Выполнение</span>
                      <span className={`font-medium ${progress >= 95 ? 'text-green-600 dark:text-green-400' : progress >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                        {progress}%
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className="h-2 bg-secondary"
                    />
                  </div>
                )}

                {/* Объёмы */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Заказано</p>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{orderedVolume.toFixed(2)} л</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Отпущено</p>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {actualVolume > 0 ? `${actualVolume.toFixed(2)} л` : '—'}
                    </span>
                  </div>
                </div>

                {/* Неполучено (всегда показываем если есть отпуск) */}
                {actualVolume > 0 && underfill !== 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Неполучено</span>
                      <span className={`font-medium ${underfill > 0.5 ? 'text-red-600 dark:text-red-400' : 'text-foreground/80'}`}>
                        {underfill > 0 ? `${underfill.toFixed(2)} л` : `+${Math.abs(underfill).toFixed(2)} л`}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Финансы */}
            {/* ============================================================ */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Финансы
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Оплачено</p>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {onlineOrdersService.formatCurrency(orderedSum)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Фактически</p>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {actualSum > 0 ? onlineOrdersService.formatCurrency(actualSum) : '—'}
                    </span>
                  </div>
                </div>

                {/* Возврат (только если > 0) */}
                {refundSum > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Возврат клиенту</span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        {onlineOrdersService.formatCurrency(refundSum)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Хронология событий */}
            {/* ============================================================ */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Хронология
                  {isLoadingDetails && (
                    <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                  {orderDetails && (
                    <Badge variant="outline" className="text-xs text-green-500 border-green-500/30">
                      API
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isLoadingDetails ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-3 h-3 rounded-full bg-secondary" />
                        <div className="flex-1 space-y-1">
                          <div className="h-4 bg-secondary rounded w-1/2" />
                          <div className="h-3 bg-secondary rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            item.isError ? 'bg-red-500' :
                            item.status === 'completed' ? 'bg-emerald-500' :
                            item.status === 'active' ? 'bg-yellow-500 animate-pulse' :
                            'bg-muted-foreground'
                          }`} />
                          {index < timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-secondary mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className={`font-medium text-sm ${item.isError ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                            {item.event}
                          </p>
                          {item.description && (
                            <p className="text-muted-foreground text-xs">{item.description}</p>
                          )}
                          <p className="text-muted-foreground text-xs mt-1">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ============================================================ */}
            {/* Техническая информация */}
            {/* ============================================================ */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground/80 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Техническая информация
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="text-foreground font-mono text-xs break-all">{orderId}</span>
                  </div>
                  {sessionId && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground">Session ID</span>
                      <span className="text-foreground font-mono text-xs break-all">
                        {sessionId}
                      </span>
                    </div>
                  )}
                  {contractId && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground">Contract ID</span>
                      <span className="text-foreground font-mono text-xs">{contractId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Вспомогательные функции
// ============================================================================

/**
 * Парсит JSON данные заказа из MSTO
 */
function parseOrderJson(order: OnlineOrder): any {
  try {
    const apiData = order.apiData as any;
    if (apiData?.json) {
      return typeof apiData.json === 'string'
        ? JSON.parse(apiData.json)
        : apiData.json;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Формирует timeline событий заказа
 * Если есть данные из Orders API - используем их, иначе парсим JSON локально
 */
function getOrderTimeline(order: OnlineOrder, apiDetails: MSTOOrderDetailsResponse | null) {
  // Если есть данные из API - используем timeline оттуда
  if (apiDetails?.timeline && apiDetails.timeline.length > 0) {
    return apiDetails.timeline.map((event: MSTOTimelineEvent) => {
      let details = event.details || '';

      // Для finish-события: убираем "/ 0.00 руб" если MSTO вернул resultSum=0
      if (event.event === 'finish' && details) {
        details = details.replace(/\s*\/\s*0[.,]00\s*руб\.?/, '');
      }

      return {
        time: formatTime(event.time),
        event: event.label,
        description: details,
        status: event.isError ? 'pending' as const :
                event.event === 'finish' ? 'completed' as const :
                event.event.includes('action') ? 'completed' as const : 'completed' as const,
        isError: event.isError
      };
    });
  }

  // Fallback: парсим из JSON локально
  const jsonData = parseOrderJson(order);
  const timeline: Array<{
    time: string;
    event: string;
    description: string;
    status: 'completed' | 'pending' | 'active';
    isError?: boolean;
  }> = [];

  // Создание заказа
  if (jsonData?.dateCreate || jsonData?.DateCreate) {
    timeline.push({
      time: formatIsoDate(jsonData.dateCreate || jsonData.DateCreate),
      event: 'Заказ создан',
      description: `Тип: ${jsonData.orderType || jsonData.OrderType || '—'}`,
      status: 'completed'
    });
  }

  // Оплата
  const sumPaid = jsonData?.sumPaid || jsonData?.SumPaid || 0;
  if (sumPaid > 0) {
    timeline.push({
      time: formatIsoDate(jsonData.dateCreate || jsonData.DateCreate),
      event: 'Оплата получена',
      description: `${onlineOrdersService.formatCurrency(sumPaid)}`,
      status: 'completed'
    });
  }

  // В процессе (для ожидающих заказов)
  if (order.status === 'pending') {
    timeline.push({
      time: '—',
      event: 'Ожидание отпуска',
      description: `Заказано: ${order.orderVolume.toFixed(2)} л`,
      status: 'active'
    });
  }

  // Завершение
  if (jsonData?.dateEnd || jsonData?.DateEnd) {
    const litreCompleted = jsonData?.litreCompleted || jsonData?.LitreCompleted || order.volume;
    timeline.push({
      time: formatIsoDate(jsonData.dateEnd || jsonData.DateEnd),
      event: order.status === 'completed' ? 'Отпуск завершён' :
             order.status === 'cancelled' ? 'Заказ отменён' : 'Ошибка',
      description: `Отпущено: ${litreCompleted.toFixed(2)} л`,
      status: order.status === 'completed' ? 'completed' : 'pending'
    });
  }

  return timeline;
}

export default OrderDetailsDialog;
