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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-muted-foreground">Загрузка смен...</div>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-muted-foreground text-lg mb-2">Смены не найдены</p>
          <p className="text-muted-foreground text-sm">
            Измените фильтры или период для отображения данных
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">ТТ</TableHead>
            <TableHead className="text-muted-foreground">Смена №</TableHead>
            <TableHead className="text-muted-foreground">Открыта</TableHead>
            <TableHead className="text-muted-foreground">Закрыта</TableHead>
            <TableHead className="text-muted-foreground text-right">Выручка</TableHead>
            <TableHead className="text-muted-foreground text-right">Объём</TableHead>
            <TableHead className="text-muted-foreground text-center">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => {
            const status = getShiftStatusConfig(shift.status, shift.openedAt, shift.hasDiscrepancies);
            const StatusIcon = status.icon;

            return (
            <TableRow
              key={shift.id}
              className="border-border transition-colors cursor-pointer hover:bg-secondary"
              onClick={() => {
                onSelectShift(shift);
              }}
            >
              <TableCell>
                <div className="text-foreground font-medium text-sm">
                  {shift.stationName || `ТТ ${shift.stationCode}`}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-foreground font-semibold font-mono text-sm">
                  #{shift.shiftNumber}
                </span>
              </TableCell>
              <TableCell className="text-foreground/80 text-sm whitespace-nowrap">
                {formatDateTime(shift.openedAt)}
              </TableCell>
              <TableCell className="text-foreground/80 text-sm whitespace-nowrap">
                  {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-foreground/80 text-sm">
                {shift.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
              </TableCell>
              <TableCell className="text-right font-mono text-foreground/80 text-sm">
                {shift.totalVolume.toFixed(0)} л
              </TableCell>
              <TableCell className="text-center">
                <Badge className={`${getShiftStatusBadgeClass(status.tone)} inline-flex items-center gap-1 text-xs px-2.5 py-0.5`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
};

export default ShiftsTable;
