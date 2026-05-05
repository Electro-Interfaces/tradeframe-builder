import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
        <div className="text-center px-4">
          <p className="text-muted-foreground text-base mb-2">Смены не найдены</p>
          <p className="text-muted-foreground text-sm">
            Измените фильтры или период для отображения данных
          </p>
        </div>
      </div>
    );
  }

  const allSelected = shifts.length > 0 && selectedShiftIds.length === shifts.length;
  const someSelected = selectedShiftIds.length > 0 && !allSelected;

  return (
    <div className="space-y-3">
      {/* Заголовок с чекбоксом "Выбрать все" */}
      {onToggleAllShifts && shifts.length > 0 && (
        <div className="flex items-center gap-3 px-2 py-2 bg-secondary/50 rounded-lg">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onToggleAllShifts(!!checked)}
            aria-label="Выбрать все смены"
            className="h-4 w-4 rounded-[2px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <span className="text-sm text-foreground/80">
            {allSelected ? 'Снять все' : someSelected ? `Выбрано: ${selectedShiftIds.length}` : 'Выбрать все'}
          </span>
        </div>
      )}

      <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
        {shifts.map((shift) => {
          const isSelected = selectedShiftIds.includes(shift.id);
          const status = getShiftStatusConfig(shift.status, shift.openedAt, shift.hasDiscrepancies);
          const StatusIcon = status.icon;

          return (
            <div
              key={shift.id}
              onClick={() => onSelectShift(shift)}
              className={`p-4 transition-colors cursor-pointer active:bg-secondary ${
                isSelected ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                {onToggleShiftSelection && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleShiftSelection(shift.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Выбрать смену ${shift.shiftNumber}`}
                    className="mt-0.5 h-4 w-4 rounded-[2px] border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {shift.stationName || `ТТ ${shift.stationCode}`}
                      </span>
                      <Badge className={`${getShiftStatusBadgeClass(status.tone)} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(shift.openedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <span className="font-mono">#{shift.shiftNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {shift.closedAt ? `Закрыта ${formatDateTime(shift.closedAt)}` : 'Смена активна'}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {shift.transactionCount} чек.
                    </span>
                  </div>

                  <div className="text-sm space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Объём: {shift.totalVolume.toFixed(0)} л</span>
                      <span className="font-medium text-di-on-surface font-mono">
                        {shift.totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽
                      </span>
                    </div>
                    {shift.hasDiscrepancies && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Статус смены</span>
                        <span className="font-medium text-red-600 dark:text-red-400">Есть расхождения</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobileShiftsTable;
