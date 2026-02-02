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
    if (fillPercent >= 20) return 'bg-emerald-500';  // >= 20% - зеленый (норма)
    if (fillPercent >= 10) return 'bg-yellow-500'; // 10-20% - желтый (внимание)
    return 'bg-red-500';                            // < 10% - красный (критический)
  };

  if (summaries.length === 0 && !loading) {
    return (
      <Card className="bg-slate-800 border-slate-700 col-span-3">
        <CardContent className="py-12 text-center text-slate-400">
          Нет данных об остатках
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {summaries.map(summary => (
        <Card key={summary.fuelCode} className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg text-white">
                  {summary.fuelName}
                </CardTitle>
                <CardDescription>
                  {summary.tankCount} {summary.tankCount === 1 ? 'резервуар' : 'резервуаров'}
                </CardDescription>
              </div>
              <Fuel className="h-8 w-8 text-slate-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Остаток книжный */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Книжный остаток:</span>
                <span className="text-white font-semibold">
                  {formatNumber(summary.totalVolumeBook)} л
                </span>
              </div>
              {/* Прогресс-бар */}
              <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor((summary.totalVolumeBook / summary.totalCapacity) * 100)}`}
                  style={{ width: `${(summary.totalVolumeBook / summary.totalCapacity) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{((summary.totalVolumeBook / summary.totalCapacity) * 100).toFixed(1)}%</span>
                <span>Вместимость: {formatNumber(summary.totalCapacity)} л</span>
              </div>
            </div>

            {/* Расчет книжного остатка */}
            <div className="text-xs space-y-1 pt-2 border-t border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Начальный остаток:</span>
                <span className="text-slate-300">{formatNumber(summary.totalVolumeBegin)} л</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">+ Поступления:</span>
                <span className="text-green-400">+{formatNumber(summary.totalReceipts)} л</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">- Реализация:</span>
                <span className="text-blue-400">-{formatNumber(summary.totalSales)} л</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-700">
                <span className="text-slate-400 font-medium">= Остаток:</span>
                <span className="text-white font-semibold">{formatNumber(summary.totalVolumeBook)} л</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};
