/**
 * Карточки суммарных остатков по видам топлива
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel } from 'lucide-react';
import type { FuelInventorySummary } from '@/services/fuelInventoryService';
import { formatNumber } from '../utils/fuelInventoryHelpers';

interface FuelSummaryCardsProps {
  summaries: FuelInventorySummary[];
  loading?: boolean;
}

export const FuelSummaryCards = ({ summaries, loading = false }: FuelSummaryCardsProps) => {
  // Цветовая индикация по уровню заполнения
  const getProgressColor = (fillPercent: number) => {
    if (fillPercent >= 20) return 'bg-emerald-600';  // >= 20% - зеленый (норма)
    if (fillPercent >= 10) return 'bg-yellow-500'; // 10-20% - желтый (внимание)
    return 'bg-red-500';                            // < 10% - красный (критический)
  };

  if (summaries.length === 0 && !loading) {
    return (
      <Card className="bg-card border-border col-span-3">
        <CardContent className="py-12 text-center text-muted-foreground">
          Нет данных об остатках
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {summaries.map(summary => (
        <Card key={summary.fuelCode} className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg text-foreground">
                  {summary.fuelName}
                </CardTitle>
                <CardDescription>
                  {summary.tankCount} {summary.tankCount === 1 ? 'резервуар' : 'резервуаров'}
                </CardDescription>
              </div>
              <Fuel className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Остаток книжный */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Книжный остаток:</span>
                <span className="text-foreground font-semibold">
                  {formatNumber(summary.totalVolumeBook)} л
                </span>
              </div>
              {/* Прогресс-бар — только если известна ёмкость */}
              {summary.totalCapacity > 0 ? (
                <>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor((summary.totalVolumeBook / summary.totalCapacity) * 100)}`}
                      style={{ width: `${Math.max(0, Math.min(100, (summary.totalVolumeBook / summary.totalCapacity) * 100))}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{((summary.totalVolumeBook / summary.totalCapacity) * 100).toFixed(1)}%</span>
                    <span>Вместимость: {formatNumber(summary.totalCapacity)} л</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">Ёмкость резервуаров не задана</div>
              )}
            </div>

            {/* Расчет книжного остатка */}
            <div className="text-xs space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Начальный остаток:</span>
                <span className="text-foreground/80">{formatNumber(summary.totalVolumeBegin)} л</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">+ Поступления:</span>
                <span className="text-green-600 dark:text-green-400">+{formatNumber(summary.totalReceipts)} л</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">- Реализация:</span>
                <span className="text-primary dark:text-primary/70">-{formatNumber(summary.totalSales)} л</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground font-medium">= Остаток:</span>
                <span className="text-foreground font-semibold">{formatNumber(summary.totalVolumeBook)} л</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};
