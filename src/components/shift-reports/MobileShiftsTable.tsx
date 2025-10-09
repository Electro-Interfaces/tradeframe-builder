import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, AlertTriangle, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftListItem } from '@/types/shift-reports-v2';

interface MobileShiftsTableProps {
  shifts: ShiftListItem[];
  onSelectShift: (shiftNumber: number) => void;
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
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '0.00 ₽';
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₽';
  };

  const formatVolume = (value: number | null | undefined) => {
    if (value == null) return '0 л';
    return value.toFixed(0) + ' л';
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yy HH:mm', { locale: ru });
  };

  const getStatusBadge = (status: ShiftListItem['status']) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-green-500/10 text-green-400 border-green-500 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Открыта
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Закрыта
          </Badge>
        );
      case 'synchronized':
        return (
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Синхр.
          </Badge>
        );
      default:
        return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500">—</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-400">Загрузка смен...</div>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center px-4">
          <p className="text-slate-400 text-base mb-2">Смены не найдены</p>
          <p className="text-slate-500 text-sm">
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
        <div className="flex items-center gap-3 px-2 py-2 bg-slate-700/50 rounded-lg">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onToggleAllShifts(!!checked)}
            aria-label="Выбрать все смены"
            className="border-slate-500"
          />
          <span className="text-sm text-slate-300">
            {allSelected ? 'Снять все' : someSelected ? `Выбрано: ${selectedShiftIds.length}` : 'Выбрать все'}
          </span>
        </div>
      )}

      {shifts.map((shift) => {
        const isSelected = selectedShiftIds.includes(shift.id);

        return (
          <Card
            key={shift.id}
            className={`border transition-all ${
              isSelected
                ? 'bg-blue-900/20 border-blue-500/50'
                : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
            }`}
          >
            <CardContent className="p-3">
              {/* Заголовок карточки с чекбоксом */}
              <div className="flex items-start gap-3 mb-3">
                {onToggleShiftSelection && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleShiftSelection(shift.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Выбрать смену ${shift.shiftNumber}`}
                    className="mt-0.5 border-slate-500"
                  />
                )}

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectShift(shift.shiftNumber)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-white font-semibold text-base">
                      Смена #{shift.shiftNumber}
                    </span>
                    {getStatusBadge(shift.status)}
                  </div>

                  {/* Даты - компактный вид */}
                  <div className="space-y-1 text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Открыта:</span>
                      <span className="text-slate-200">{formatDateTime(shift.openedAt)}</span>
                    </div>
                    {shift.closedAt && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Закрыта:</span>
                        <span className="text-slate-200">{formatDateTime(shift.closedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Метрики - компактный вид */}
                  <div className="grid grid-cols-2 gap-2 text-sm bg-slate-800/50 rounded-md p-2">
                    <div>
                      <div className="text-slate-400 text-xs">Выручка</div>
                      <div className="text-white font-semibold">{formatCurrency(shift.totalRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">Объем</div>
                      <div className="text-white font-semibold">{formatVolume(shift.totalVolume)}</div>
                    </div>
                  </div>

                  {/* Кнопка просмотра */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShift(shift.shiftNumber);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Подробнее
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileShiftsTable;
