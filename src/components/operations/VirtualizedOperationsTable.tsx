import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FuelBadge } from "@/components/common/FuelBadge";
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

function formatExact(value?: number): string {
  if (value === undefined || value === null) {
    return "—";
  }

  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-secondary text-foreground">Завершено</Badge>;
    case "in_progress":
      return <Badge className="bg-secondary text-foreground">Выполняется</Badge>;
    case "failed":
      return <Badge className="border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">Ошибка</Badge>;
    case "pending":
      return <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">Ожидание</Badge>;
    case "cancelled":
      return <Badge className="bg-secondary text-foreground">Отменено</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export const VirtualizedOperationsTable = memo(function VirtualizedOperationsTable({
  operations,
  onRowClick,
}: VirtualizedOperationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">Дата/время</TableHead>
            <TableHead className="text-muted-foreground">ТТ</TableHead>
            <TableHead className="text-muted-foreground">Топливо</TableHead>
            <TableHead className="text-muted-foreground text-right">Факт</TableHead>
            <TableHead className="text-muted-foreground text-right">Цена</TableHead>
            <TableHead className="text-muted-foreground text-right">Сумма</TableHead>
            <TableHead className="text-muted-foreground">Оплата</TableHead>
            <TableHead className="text-muted-foreground text-center">POS</TableHead>
            <TableHead className="text-muted-foreground text-center">Смена</TableHead>
            <TableHead className="text-muted-foreground">Статус</TableHead>
            <TableHead className="text-muted-foreground text-center">Пистолет</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((record) => (
            <TableRow
              key={record.id}
              onClick={() => onRowClick?.(record)}
              className={`cursor-pointer border-border transition-colors ${record.isFromStsApi ? "bg-primary/5" : "hover:bg-secondary"}`}
            >
              <TableCell className="whitespace-nowrap text-foreground/80 text-sm">
                {new Date(record.startTime).toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                <div className="space-y-0.5">
                  <div className="font-medium text-foreground">{record.stationName || `АЗС ${record.stationNumber || "—"}`}</div>
                  <div className="font-mono text-xs text-muted-foreground">ID: {record.id}</div>
                </div>
              </TableCell>
              <TableCell>
                {record.fuelType ? <FuelBadge fuel={record.fuelType} /> : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground/80">
                {(record.actualQuantity ?? record.quantity) ? `${formatExact(record.actualQuantity ?? record.quantity)} л` : "—"}
              </TableCell>
              <TableCell className="text-right text-foreground/80">
                {record.price ? `${formatExact(record.price)} ₽` : "—"}
              </TableCell>
              <TableCell className="text-right font-medium text-foreground">
                {(record.actualAmount ?? record.totalCost) ? `${formatExact(record.actualAmount ?? record.totalCost)} ₽` : "—"}
              </TableCell>
              <TableCell className="text-foreground/80">
                {normalizePaymentMethod(record.paymentMethod || "") || "—"}
              </TableCell>
              <TableCell className="text-center text-foreground/80 font-medium">
                {record.posNumber || "—"}
              </TableCell>
              <TableCell className="text-center text-foreground/80 font-medium">
                {record.shiftNumber || "—"}
              </TableCell>
              <TableCell>{getStatusBadge(record.status)}</TableCell>
              <TableCell className="text-center text-foreground/80 font-medium">
                {record.nozzleNumber || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.operations.length === nextProps.operations.length && prevProps.operations === nextProps.operations;
});
