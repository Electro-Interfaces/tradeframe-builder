import React, { memo } from "react";
import { List } from "react-window";
import { Badge } from "@/components/ui/badge";
import { normalizePaymentMethod } from "@/utils/paymentUtils";

interface Operation {
  id: string;
  status: string;
  startTime: string;
  stationNumber?: string;
  stationName?: string;
  nozzleNumber?: string;
  fuelType?: string;
  actualQuantity?: number;
  quantity?: number;
  price?: number;
  actualAmount?: number;
  totalCost?: number;
  paymentMethod?: string;
  posNumber?: string;
  shiftNumber?: string;
  cardNumber?: string;
  receiptNumber?: string;
  operationType?: string;
  orderedQuantity?: number;
  orderedAmount?: number;
  isFromStsApi?: boolean;
}

interface VirtualizedOperationsTableProps {
  operations: Operation[];
  onRowClick?: (operation: Operation) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-secondary text-foreground">Завершено</Badge>;
    case 'in_progress':
      return <Badge className="bg-secondary text-foreground">Выполняется</Badge>;
    case 'failed':
      return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
    case 'cancelled':
      return <Badge className="bg-secondary text-foreground">Отменено</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

// Мемоизированный компонент строки для оптимизации
const TableRowComponent = memo(({ index, style, operations, onRowClick }: {
  index: number;
  style: React.CSSProperties;
  operations: Operation[];
  onRowClick?: (op: Operation) => void;
}) => {
  const record = operations[index];

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer'
      }}
      className={`border-b border-border hover:bg-accent transition-colors ${
        record.isFromStsApi ? 'bg-primary/5' : 'bg-card'
      }`}
      onClick={() => onRowClick?.(record)}
    >
      <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm text-center">{record.stationNumber || '-'}</div>
      <div className="flex-shrink-0 w-24 px-2">{getStatusBadge(record.status)}</div>
      <div className="flex-shrink-0 w-32 px-2 text-foreground/80 font-mono text-xs truncate">{record.id}</div>
      <div className="flex-shrink-0 w-36 px-2 text-foreground/80 text-sm">
        {new Date(record.startTime).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm text-center">{record.nozzleNumber || '-'}</div>
      <div className="flex-shrink-0 w-28 px-2" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
        {record.fuelType ? (
          <Badge variant="outline" className="bg-secondary text-foreground border-border">
            {record.fuelType}
          </Badge>
        ) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
        {record.actualQuantity ? record.actualQuantity.toFixed(2) : record.quantity ? record.quantity.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
        {record.price ? record.price.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
        {record.actualAmount ? record.actualAmount.toFixed(2) : record.totalCost ? record.totalCost.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
        {normalizePaymentMethod(record.paymentMethod || '')}
      </div>
      <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm text-center">{record.posNumber || '-'}</div>
      <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm text-center">{record.shiftNumber || '-'}</div>
      <div className="flex-shrink-0 w-32 px-2 text-foreground/80 text-sm font-mono truncate">{record.cardNumber || '-'}</div>
      <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-mono">{record.receiptNumber || '-'}</div>
      <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm">{record.operationType || '-'}</div>
      <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right">
        {record.orderedQuantity ? record.orderedQuantity.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right">
        {record.orderedAmount ? record.orderedAmount.toFixed(2) : '-'}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Кастомное сравнение для оптимизации
  const prevOp = prevProps.operations[prevProps.index];
  const nextOp = nextProps.operations[nextProps.index];
  return prevOp?.id === nextOp?.id && prevProps.style === nextProps.style;
});

TableRowComponent.displayName = 'TableRowComponent';

// Главный компонент виртуализированной таблицы
export const VirtualizedOperationsTable = memo(function VirtualizedOperationsTable({
  operations,
  onRowClick
}: VirtualizedOperationsTableProps) {

  // Высота одной строки
  const ROW_HEIGHT = 48;

  // Максимальная высота таблицы (viewport height - отступы)
  const TABLE_HEIGHT = Math.min(
    window.innerHeight - 400, // Вычитаем высоту заголовка, фильтров и т.д.
    operations.length * ROW_HEIGHT
  );

  // Минимальная ширина контента таблицы (сумма всех колонок ~1750px)
  const MIN_TABLE_WIDTH = 1800;

  return (
    <div className="w-full border border-border rounded-lg">
      {/* Единый контейнер с горизонтальным скроллом */}
      <div
        className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-secondary scrollbar-track-card"
        style={{ maxHeight: TABLE_HEIGHT + 42 }}
      >
        <div style={{ width: MIN_TABLE_WIDTH }}>
          {/* Заголовок таблицы */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: '42px',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}
            className="bg-muted border-b border-border"
          >
            <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm font-medium">ТТ</div>
            <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-medium">Статус</div>
            <div className="flex-shrink-0 w-32 px-2 text-foreground/80 text-sm font-medium">ID</div>
            <div className="flex-shrink-0 w-36 px-2 text-foreground/80 text-sm font-medium">Время начала</div>
            <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm font-medium">Пист.</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium" style={{backgroundColor: 'hsl(var(--primary) / 0.08)'}}>Вид топлива</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium" style={{backgroundColor: 'hsl(var(--primary) / 0.08)'}}>Факт.(литры)</div>
            <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-medium" style={{backgroundColor: 'hsl(var(--primary) / 0.08)'}}>Цена за л</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium" style={{backgroundColor: 'hsl(var(--primary) / 0.08)'}}>Факт.(сумма)</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium" style={{backgroundColor: 'hsl(var(--primary) / 0.08)'}}>Вид оплаты</div>
            <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm font-medium">POS</div>
            <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm font-medium">Смена</div>
            <div className="flex-shrink-0 w-32 px-2 text-foreground/80 text-sm font-medium">Карта</div>
            <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-medium">№ чека</div>
            <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-medium">Тип оп.</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium">Заказ (литры)</div>
            <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm font-medium">Заказ (сумма)</div>
          </div>

          {/* Тело таблицы */}
          <div style={{ height: TABLE_HEIGHT, overflowY: 'auto' }} className="scrollbar-thin scrollbar-thumb-secondary scrollbar-track-card">
            {operations.map((record, index) => (
              <div
                key={record.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: ROW_HEIGHT
                }}
                className={`border-b border-border hover:bg-accent transition-colors ${
                  record.isFromStsApi ? 'bg-primary/5' : (index % 2 === 0 ? 'bg-card' : 'bg-muted/50')
                }`}
                onClick={() => onRowClick?.(record)}
              >
                <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm text-center">{record.stationNumber || '-'}</div>
                <div className="flex-shrink-0 w-24 px-2">{getStatusBadge(record.status)}</div>
                <div className="flex-shrink-0 w-32 px-2 text-foreground/80 font-mono text-xs truncate">{record.id}</div>
                <div className="flex-shrink-0 w-36 px-2 text-foreground/80 text-sm">
                  {new Date(record.startTime).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm text-center">{record.nozzleNumber || '-'}</div>
                <div className="flex-shrink-0 w-28 px-2" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
                  {record.fuelType ? (
                    <Badge variant="outline" className="bg-secondary text-foreground border-border">
                      {record.fuelType}
                    </Badge>
                  ) : '-'}
                </div>
                <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
                  {record.actualQuantity ? record.actualQuantity.toFixed(2) : record.quantity ? record.quantity.toFixed(2) : '-'}
                </div>
                <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
                  {record.price ? record.price.toFixed(2) : '-'}
                </div>
                <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
                  {record.actualAmount ? record.actualAmount.toFixed(2) : record.totalCost ? record.totalCost.toFixed(2) : '-'}
                </div>
                <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm" style={{backgroundColor: 'hsl(var(--primary) / 0.04)'}}>
                  {normalizePaymentMethod(record.paymentMethod || '')}
                </div>
                <div className="flex-shrink-0 w-16 px-2 text-foreground/80 text-sm text-center">{record.posNumber || '-'}</div>
                <div className="flex-shrink-0 w-20 px-2 text-foreground/80 text-sm text-center">{record.shiftNumber || '-'}</div>
                <div className="flex-shrink-0 w-32 px-2 text-foreground/80 text-sm font-mono truncate">{record.cardNumber || '-'}</div>
                <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm font-mono">{record.receiptNumber || '-'}</div>
                <div className="flex-shrink-0 w-24 px-2 text-foreground/80 text-sm">{record.operationType || '-'}</div>
                <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right">
                  {record.orderedQuantity ? record.orderedQuantity.toFixed(2) : '-'}
                </div>
                <div className="flex-shrink-0 w-28 px-2 text-foreground/80 text-sm text-right">
                  {record.orderedAmount ? record.orderedAmount.toFixed(2) : '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Проверяем, изменились ли операции
  return (
    prevProps.operations.length === nextProps.operations.length &&
    prevProps.operations === nextProps.operations
  );
});
