import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

interface MobileShiftsTableProps {
  shifts: ShiftListItem[];
  onSelectShift: (shift: ShiftListItem) => void;
  loading?: boolean;
  selectedShiftIds?: string[];
  onToggleShiftSelection?: (shiftId: string) => void;
  onToggleAllShifts?: (selected: boolean) => void;
}

const MobileShiftsTable: React.FC<MobileShiftsTableProps> = ({
  shifts,
  onSelectShift,
  loading = false,
  selectedShiftIds = [],
  onToggleShiftSelection,
  onToggleAllShifts,
}) => {
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yy HH:mm', { locale: ru });
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
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-16">
        <div className="text-center px-4">
          <p className="text-base font-medium text-foreground">Смены не найдены</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Измените фильтры или период для отображения данных
          </p>
        </div>
      </div>
    );
  }

  const allSelected = shifts.length > 0 && selectedShiftIds.length === shifts.length;
  const someSelected = selectedShiftIds.length > 0 && !allSelected;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {onToggleAllShifts && (
            <TableHead className="w-10 px-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onToggleAllShifts(!!checked)}
                aria-label={allSelected ? 'Снять выбор со всех смен' : 'Выбрать все смены'}
                className="h-4 w-4 rounded-[2px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
            </TableHead>
          )}
          <TableHead>
            {allSelected ? 'Снять все' : someSelected ? `Выбрано: ${selectedShiftIds.length}` : 'Смена'}
          </TableHead>
          <TableHead className="text-right">Показатели</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {shifts.map((shift) => {
          const isSelected = selectedShiftIds.includes(shift.id);
          const status = getShiftStatusConfig(shift.status, shift.openedAt, shift.hasDiscrepancies);
          const StatusIcon = status.icon;

          return (
            <TableRow
              key={shift.id}
              className="cursor-pointer align-top"
              data-state={isSelected ? 'selected' : undefined}
              onClick={() => onSelectShift(shift)}
            >
              {onToggleShiftSelection && (
                <TableCell className="w-10 px-2 align-top" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleShiftSelection(shift.id)}
                    aria-label={`Выбрать смену ${shift.shiftNumber}`}
                    className="mt-0.5 h-4 w-4 rounded-[2px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </TableCell>
              )}
              <TableCell className="min-w-[180px] align-top">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {shift.stationName || `ТТ ${shift.stationCode}`}
                    </span>
                    <Badge className={`${getShiftStatusBadgeClass(status.tone)} inline-flex items-center gap-1 text-[11px]`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    #{shift.shiftNumber}
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Открыта: {formatDateTime(shift.openedAt)}</div>
                    <div>Закрыта: {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="min-w-[120px] align-top text-right">
                <div className="space-y-1.5">
                  <div className="font-mono text-sm text-foreground/80">
                    {formatInteger(shift.totalRevenue)} ₽
                  </div>
                  <div className="font-mono text-sm text-foreground/80">
                    {formatInteger(shift.totalVolume)} л
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {shift.transactionCount} чек.
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default MobileShiftsTable;
