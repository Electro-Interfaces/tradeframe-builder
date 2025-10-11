import React, { memo } from "react";
import { List } from "react-window";
import { Badge } from "@/components/ui/badge";
import { normalizePaymentMethod } from "@/utils/paymentUtils";

interface Operation {
  id: string;
  status: string;
  startTime: string;
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
        borderBottom: '1px solid rgb(51 65 85)',
        cursor: 'pointer'
      }}
      className={`hover:bg-slate-800 transition-colors ${
        record.isFromStsApi ? 'bg-blue-950/20' : 'bg-slate-900'
      }`}
      onClick={() => onRowClick?.(record)}
    >
      <div className="flex-shrink-0 w-24 px-2">{getStatusBadge(record.status)}</div>
      <div className="flex-shrink-0 w-32 px-2 text-slate-300 font-mono text-xs truncate">{record.id}</div>
      <div className="flex-shrink-0 w-36 px-2 text-slate-300 text-sm">
        {new Date(record.startTime).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      <div className="flex-shrink-0 w-20 px-2 text-slate-300 text-sm text-center">{record.nozzleNumber || '-'}</div>
      <div className="flex-shrink-0 w-28 px-2" style={{backgroundColor: 'rgba(30, 58, 138, 0.15)'}}>
        {record.fuelType ? (
          <Badge variant="outline" className="bg-slate-700 text-white border-slate-600">
            {record.fuelType}
          </Badge>
        ) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm text-right" style={{backgroundColor: 'rgba(30, 58, 138, 0.15)'}}>
        {record.actualQuantity ? record.actualQuantity.toFixed(2) : record.quantity ? record.quantity.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm text-right" style={{backgroundColor: 'rgba(30, 58, 138, 0.15)'}}>
        {record.price ? record.price.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm text-right" style={{backgroundColor: 'rgba(30, 58, 138, 0.15)'}}>
        {record.actualAmount ? record.actualAmount.toFixed(2) : record.totalCost ? record.totalCost.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm" style={{backgroundColor: 'rgba(30, 58, 138, 0.15)'}}>
        {normalizePaymentMethod(record.paymentMethod || '')}
      </div>
      <div className="flex-shrink-0 w-16 px-2 text-slate-300 text-sm text-center">{record.posNumber || '-'}</div>
      <div className="flex-shrink-0 w-20 px-2 text-slate-300 text-sm text-center">{record.shiftNumber || '-'}</div>
      <div className="flex-shrink-0 w-32 px-2 text-slate-300 text-sm font-mono truncate">{record.cardNumber || '-'}</div>
      <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm font-mono">{record.receiptNumber || '-'}</div>
      <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm">{record.operationType || '-'}</div>
      <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm text-right">
        {record.orderedQuantity ? record.orderedQuantity.toFixed(2) : '-'}
      </div>
      <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm text-right">
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

  return (
    <div className="w-full border border-slate-700 rounded-lg overflow-hidden">
      {/* Заголовок таблицы */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'rgb(51 65 85)',
          borderBottom: '1px solid rgb(71 85 105)',
          minHeight: '42px'
        }}
      >
        <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm font-medium">Статус</div>
        <div className="flex-shrink-0 w-32 px-2 text-slate-300 text-sm font-medium">ID</div>
        <div className="flex-shrink-0 w-36 px-2 text-slate-300 text-sm font-medium">Время начала</div>
        <div className="flex-shrink-0 w-20 px-2 text-slate-300 text-sm font-medium">Пист.</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium" style={{backgroundColor: 'rgba(30, 58, 138, 0.3)'}}>Вид топлива</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium" style={{backgroundColor: 'rgba(30, 58, 138, 0.3)'}}>Факт.(литры)</div>
        <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm font-medium" style={{backgroundColor: 'rgba(30, 58, 138, 0.3)'}}>Цена за л</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium" style={{backgroundColor: 'rgba(30, 58, 138, 0.3)'}}>Факт.(сумма)</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium" style={{backgroundColor: 'rgba(30, 58, 138, 0.3)'}}>Вид оплаты</div>
        <div className="flex-shrink-0 w-16 px-2 text-slate-300 text-sm font-medium">POS</div>
        <div className="flex-shrink-0 w-20 px-2 text-slate-300 text-sm font-medium">Смена</div>
        <div className="flex-shrink-0 w-32 px-2 text-slate-300 text-sm font-medium">Карта</div>
        <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm font-medium">№ чека</div>
        <div className="flex-shrink-0 w-24 px-2 text-slate-300 text-sm font-medium">Тип оп.</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium">Заказ (литры)</div>
        <div className="flex-shrink-0 w-28 px-2 text-slate-300 text-sm font-medium">Заказ (сумма)</div>
      </div>

      {/* Виртуализированное тело таблицы */}
      <List
        rowCount={operations.length}
        rowHeight={ROW_HEIGHT}
        rowProps={{ operations, onRowClick }}
        rowComponent={TableRowComponent}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        style={{ height: TABLE_HEIGHT, width: "100%" }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Проверяем, изменились ли операции
  return (
    prevProps.operations.length === nextProps.operations.length &&
    prevProps.operations === nextProps.operations
  );
});
