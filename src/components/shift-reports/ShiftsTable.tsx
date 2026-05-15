import React from 'react';
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftListItem } from '@/types/shift-reports-v2';
import { getShiftStatusBadgeClass, getShiftStatusConfig } from './shiftStatus';

interface ShiftsTableProps {
  shifts: ShiftListItem[];
  onSelectShift: (shift: ShiftListItem) => void;
  loading?: boolean;
}

const ShiftsTable: React.FC<ShiftsTableProps> = ({
  shifts,
  onSelectShift,
  loading = false,
}) => {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: ru });
  };

  const formatInteger = (value: number) => {
    return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Загрузка смен...</div>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16">
          <div className="text-center">
            <p className="text-lg font-medium text-foreground">Смены не найдены</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Измените фильтры или период для отображения данных
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ТТ</TableHead>
            <TableHead>Смена №</TableHead>
            <TableHead>Открыта</TableHead>
            <TableHead>Закрыта</TableHead>
            <TableHead className="text-right">Выручка</TableHead>
            <TableHead className="text-right">Объём</TableHead>
            <TableHead className="text-center">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const status = getShiftStatusConfig(shift.status, shift.openedAt, shift.hasDiscrepancies);
            const StatusIcon = status.icon;

            return (
              <TableRow
                key={shift.id}
                className="cursor-pointer"
                onClick={() => {
                  onSelectShift(shift);
                }}
              >
                <TableCell className="font-medium text-foreground">
                  {shift.stationName || `ТТ ${shift.stationCode}`}
                </TableCell>
                <TableCell className="font-mono font-semibold text-foreground">
                  #{shift.shiftNumber}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground/80">
                  {formatDateTime(shift.openedAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-foreground/80">
                  {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-foreground/80">
                  {formatInteger(shift.totalRevenue)} ₽
                </TableCell>
                <TableCell className="text-right font-mono text-foreground/80">
                  {formatInteger(shift.totalVolume)} л
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={`${getShiftStatusBadgeClass(status.tone)} inline-flex items-center gap-1 text-xs`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
          )})}
        </TableBody>
      </Table>
  );
};

export default ShiftsTable;
