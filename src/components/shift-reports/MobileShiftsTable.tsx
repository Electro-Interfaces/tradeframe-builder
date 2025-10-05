import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertTriangle, CheckCircle, Clock as ClockIcon } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftListItem } from '@/types/shift-reports-v2';

interface MobileShiftsTableProps {
  shifts: ShiftListItem[];
  onSelectShift: (shiftNumber: number) => void;
  loading?: boolean;
}

const MobileShiftsTable: React.FC<MobileShiftsTableProps> = ({
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

  return (
    <div className="space-y-3">
      {shifts.map((shift) => (
        <Card
          key={shift.id}
          className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors cursor-pointer"
          onClick={() => onSelectShift(shift.shiftNumber)}
        >
          <CardContent className="p-4">
            {/* Заголовок карточки */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <span className="text-white font-semibold text-base">
                  Смена #{shift.shiftNumber}
                </span>
              </div>
              {getStatusBadge(shift.status)}
            </div>

            {/* Даты */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Открыта:</span>
                <div className="text-white">{formatDateTime(shift.openedAt)}</div>
              </div>
              <div>
                <span className="text-slate-400">Закрыта:</span>
                <div className="text-white">
                  {shift.closedAt ? formatDateTime(shift.closedAt) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MobileShiftsTable;
