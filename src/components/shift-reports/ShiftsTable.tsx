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
          <Badge className="bg-emerald-500/10 text-green-600 dark:text-green-400 border-green-500 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Открыта
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Закрыта
          </Badge>
        );
      case 'synchronized':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Синхронизирована
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted-foreground/10 text-muted-foreground border-border">
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/80">
          <tr>
            <th className="px-6 py-4 text-left text-foreground font-medium">ТТ</th>
            <th className="px-6 py-4 text-left text-foreground font-medium">СМЕНА №</th>
            <th className="px-6 py-4 text-left text-foreground font-medium">ОТКРЫТА</th>
            <th className="px-6 py-4 text-left text-foreground font-medium">ЗАКРЫТА</th>
            <th className="px-6 py-4 text-center text-foreground font-medium">СТАТУС</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {shifts.map((shift) => (
            <tr
              key={shift.id}
              className="border-b border-border hover:bg-secondary/50 transition-colors cursor-pointer"
              onClick={() => {
                onSelectShift(shift);
              }}
            >
              {/* ТТ */}
              <td className="px-6 py-4">
                <div className="text-foreground">
                  {shift.stationName || `ТТ ${shift.stationCode}`}
                </div>
              </td>

              {/* Номер смены */}
              <td className="px-6 py-4">
                <span className="text-foreground font-semibold text-base">
                  #{shift.shiftNumber}
                </span>
              </td>

              {/* Дата открытия */}
              <td className="px-6 py-4">
                <div className="text-foreground">{formatDateTime(shift.openedAt)}</div>
              </td>

              {/* Дата закрытия */}
              <td className="px-6 py-4">
                <div className="text-foreground">
                  {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}
                </div>
              </td>

              {/* Статус */}
              <td className="px-6 py-4 text-center">
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
