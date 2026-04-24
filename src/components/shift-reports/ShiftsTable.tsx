import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertTriangle, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftListItem } from '@/types/shift-reports-v2';

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
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₽';
  };

  const formatVolume = (value: number) => {
    return value.toFixed(0) + ' л';
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd.MM.yyyy HH:mm', { locale: ru });
  };

  const getStatusBadge = (status: ShiftListItem['status']) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-emerald-500/10 text-green-600 dark:text-green-400 border-green-500/30 inline-flex items-center gap-1 text-xs px-2.5 py-0.5">
            <ClockIcon className="w-3 h-3" />
            Открыта
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-primary/10 text-primary dark:text-primary/70 border-primary/30 inline-flex items-center gap-1 text-xs px-2.5 py-0.5">
            <CheckCircle className="w-3 h-3" />
            Закрыта
          </Badge>
        );
      case 'synchronized':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 inline-flex items-center gap-1 text-xs px-2.5 py-0.5">
            <CheckCircle className="w-3 h-3" />
            Синхронизирована
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted-foreground/10 text-muted-foreground border-border/30 inline-flex items-center gap-1 text-xs px-2.5 py-0.5">
            Неизвестно
          </Badge>
        );
    }
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
      <table className="w-full text-sm border-separate border-spacing-y-0.5">
        <thead>
          <tr>
            <th className="px-5 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ТТ</th>
            <th className="px-5 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">СМЕНА №</th>
            <th className="px-5 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ОТКРЫТА</th>
            <th className="px-5 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ЗАКРЫТА</th>
            <th className="px-5 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">СТАТУС</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((shift) => (
            <tr
              key={shift.id}
              className="bg-di-surface-low hover:bg-di-surface-high transition-colors cursor-pointer group"
              onClick={() => {
                onSelectShift(shift);
              }}
            >
              {/* ТТ */}
              <td className="px-5 py-4 rounded-l-xl">
                <div className="text-foreground">
                  {shift.stationName || `ТТ ${shift.stationCode}`}
                </div>
              </td>

              {/* Номер смены */}
              <td className="px-5 py-4">
                <span className="text-foreground font-semibold text-base">
                  #{shift.shiftNumber}
                </span>
              </td>

              {/* Дата открытия */}
              <td className="px-5 py-4">
                <div className="text-foreground">{formatDateTime(shift.openedAt)}</div>
              </td>

              {/* Дата закрытия */}
              <td className="px-5 py-4">
                <div className="text-foreground">
                  {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}
                </div>
              </td>

              {/* Статус */}
              <td className="px-5 py-4 text-center rounded-r-xl">
                {getStatusBadge(shift.status)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShiftsTable;
