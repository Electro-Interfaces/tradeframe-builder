/**
 * Компонент карточки остатка резервуара для мобильного отображения
 */

import { Card, CardContent } from '@/components/ui/card';
import { Fuel } from 'lucide-react';
import type { TankInventory } from '@/services/fuelInventoryService';
import { formatNumber } from '../utils/fuelInventoryHelpers';

interface TankInventoryCardProps {
  tank: TankInventory;
}

export const TankInventoryCard = ({ tank }: TankInventoryCardProps) => {
  // Цветовая индикация по уровню заполнения
  const getProgressColor = (fillPercent: number) => {
    if (fillPercent >= 20) return 'bg-green-500';  // >= 20% - зеленый (норма)
    if (fillPercent >= 10) return 'bg-yellow-500'; // 10-20% - желтый (внимание)
    return 'bg-red-500';                            // < 10% - красный (критический)
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-slate-400" />
            <div>
              <div className="text-sm font-semibold text-white">
                ТТ {tank.station} • Р{tank.tankNumber}
              </div>
              <div className="text-xs text-slate-400">{tank.fuelName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Заполнение</div>
            <div className="text-sm font-bold text-white">{tank.fillPercent.toFixed(1)}%</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(tank.fillPercent)}`}
            style={{ width: `${tank.fillPercent}%` }}
          ></div>
        </div>

        {/* Volumes Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-[10px] text-slate-400 mb-0.5">Начальный</div>
            <div className="text-sm font-mono text-slate-300">
              {formatNumber(tank.volumeBegin)} л
            </div>
            {tank.initialShift && (
              <div className="text-[9px] text-slate-500 mt-0.5">
                Смена #{tank.initialShift.number}
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-[10px] text-slate-400 mb-0.5">Книжный</div>
            <div className="text-sm font-mono font-semibold text-white">
              {formatNumber(tank.volumeBook)} л
            </div>
          </div>

          <div className="bg-green-900/20 rounded p-2 border border-green-700/30">
            <div className="text-[10px] text-green-400 mb-0.5">Поступления</div>
            <div className="text-sm font-mono text-green-400">
              +{formatNumber(tank.volumeReceipts)} л
            </div>
          </div>

          <div className="bg-blue-900/20 rounded p-2 border border-blue-700/30">
            <div className="text-[10px] text-blue-400 mb-0.5">Реализация</div>
            <div className="text-sm font-mono text-blue-400">
              -{formatNumber(tank.volumeSales)} л
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-slate-500 text-right">
          Обновлено: {new Date(tank.lastUpdate).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </CardContent>
    </Card>
  );
};
