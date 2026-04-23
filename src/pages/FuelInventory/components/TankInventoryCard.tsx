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
    if (fillPercent >= 20) return 'bg-emerald-600';  // >= 20% - зеленый (норма)
    if (fillPercent >= 10) return 'bg-yellow-500'; // 10-20% - желтый (внимание)
    return 'bg-red-500';                            // < 10% - красный (критический)
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold text-foreground">
                ТТ {tank.station} • Р{tank.tankNumber}
              </div>
              <div className="text-xs text-muted-foreground">{tank.fuelName}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Заполнение</div>
            <div className="text-sm font-bold text-foreground">
              {tank.capacity > 0 ? `${tank.fillPercent.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Progress Bar — только если ёмкость известна */}
        {tank.capacity > 0 && (
          <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getProgressColor(tank.fillPercent)}`}
              style={{ width: `${Math.max(0, Math.min(100, tank.fillPercent))}%` }}
            ></div>
          </div>
        )}

        {/* Volumes Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">Начальный</div>
            <div className="text-sm font-mono text-foreground/80">
              {formatNumber(tank.volumeBegin)} л
            </div>
            {tank.initialShift && (
              <div className="text-[9px] text-muted-foreground mt-0.5">
                Смена #{tank.initialShift.number}
              </div>
            )}
          </div>

          <div className="bg-background/50 rounded p-2">
            <div className="text-[10px] text-muted-foreground mb-0.5">Книжный</div>
            <div className="text-sm font-mono font-semibold text-foreground">
              {formatNumber(tank.volumeBook)} л
            </div>
          </div>

          <div className="bg-emerald-100 dark:bg-emerald-900/20 rounded p-2 border border-green-300 dark:border-green-700/30">
            <div className="text-[10px] text-green-600 dark:text-green-400 mb-0.5">Поступления</div>
            <div className="text-sm font-mono text-green-600 dark:text-green-400">
              +{formatNumber(tank.volumeReceipts)} л
            </div>
          </div>

          <div className="bg-primary/10 dark:bg-blue-900/20 rounded p-2 border border-primary/30 dark:border-blue-700/30">
            <div className="text-[10px] text-primary dark:text-primary/70 mb-0.5">Реализация</div>
            <div className="text-sm font-mono text-primary dark:text-primary/70">
              -{formatNumber(tank.volumeSales)} л
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-muted-foreground text-right">
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
