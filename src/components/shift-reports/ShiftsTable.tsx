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
          <Badge className="bg-emerald-500/10 text-green-400 border-green-500 flex items-center gap-1">
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
            Синхронизирована
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/10 text-slate-400 border-slate-500">
            Неизвестно
          </Badge>
        );
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
        <div className="text-center">
          <p className="text-slate-400 text-lg mb-2">Смены не найдены</p>
          <p className="text-slate-500 text-sm">
            Измените фильтры или период для отображения данных
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-600">
      <table className="w-full text-sm">
        <thead className="bg-slate-700/80">
          <tr>
            <th className="px-6 py-4 text-left text-slate-100 font-medium">ТТ</th>
            <th className="px-6 py-4 text-left text-slate-100 font-medium">СМЕНА №</th>
            <th className="px-6 py-4 text-left text-slate-100 font-medium">ОТКРЫТА</th>
            <th className="px-6 py-4 text-left text-slate-100 font-medium">ЗАКРЫТА</th>
            <th className="px-6 py-4 text-center text-slate-100 font-medium">СТАТУС</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800">
          {shifts.map((shift) => (
            <tr
              key={shift.id}
              className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => {
                onSelectShift(shift);
              }}
            >
              {/* ТТ */}
              <td className="px-6 py-4">
                <div className="text-white">
                  {shift.stationName || `ТТ ${shift.stationCode}`}
                </div>
              </td>

              {/* Номер смены */}
              <td className="px-6 py-4">
                <span className="text-white font-semibold text-base">
                  #{shift.shiftNumber}
                </span>
              </td>

              {/* Дата открытия */}
              <td className="px-6 py-4">
                <div className="text-white">{formatDateTime(shift.openedAt)}</div>
              </td>

              {/* Дата закрытия */}
              <td className="px-6 py-4">
                <div className="text-white">
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
