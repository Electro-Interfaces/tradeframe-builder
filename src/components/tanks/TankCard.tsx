/**
 * Карточка резервуара — Deep Intel стиль
 * Компактная карточка с progress bar, телеметрией и действиями
 */

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fuel, LineChart, Settings, Lock, AlertTriangle } from "lucide-react";
import { TankAnalysisDialog } from "./TankAnalysisDialog";
import { TankCalibrationDialog } from "./TankCalibrationDialog";
import type { Tank, TankStatus } from "@/types/tanks";

const BLOCK_THRESHOLD_LITERS = 800;

function getTankStatus(percentage: number, minLevel: number, criticalLevel: number): TankStatus {
  if (percentage > minLevel) return 'normal';
  if (percentage >= criticalLevel) return 'warning';
  return 'critical';
}

const TankCardComponent = ({ tank, isMobile }: { tank: Tank; isMobile: boolean }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

  const currentLevel = tank.currentLevelLiters || 0;
  const capacity = tank.capacityLiters || 0;
  const percentage = capacity > 0 ? Math.round((currentLevel / capacity) * 100) : 0;
  const tankStatus = getTankStatus(percentage, tank.minLevelPercent || 20, tank.criticalLevelPercent || 10);
  const isBlocked = !tank.noSensorData && currentLevel < BLOCK_THRESHOLD_LITERS;

  const temp = tank.temperature || tank.apiData?.temperature || 0;
  const density = tank.density || tank.apiData?.density || 0;
  const waterMm = tank.waterLevelMm || tank.apiData?.water?.level || 0;

  // Status
  const statusText = isBlocked ? 'БЛОК' : tank.noSensorData ? 'КНИЖ.' : tankStatus === 'critical' ? 'КРИТ.' : tankStatus === 'warning' ? 'НИЗКИЙ' : 'OK';
  const statusColor = isBlocked || tankStatus === 'critical' ? 'text-red-600 dark:text-[#f87171]' : tankStatus === 'warning' ? 'text-amber-600 dark:text-[#fbbf24]' : 'text-green-600 dark:text-[#4ade80]';
  const dotColor = isBlocked || tankStatus === 'critical' ? 'bg-red-500' : tankStatus === 'warning' ? 'bg-amber-500' : 'bg-green-500 dark:bg-[#4ade80]';
  const barColor = isBlocked || tankStatus === 'critical' ? 'bg-red-500 dark:bg-[#f87171]' : tankStatus === 'warning' ? 'bg-amber-500 dark:bg-[#fbbf24]' : 'bg-blue-600 dark:bg-di-primary-light';
  const borderClass = isBlocked ? 'border-red-500/30 dark:border-red-500/30' : 'border-border/30 dark:border-di-outline-variant/15';

  return (
    <div className={`bg-card dark:bg-di-surface-mid rounded-xl border ${borderClass} transition-all hover:shadow-md dark:hover:shadow-none ${isMobile ? 'p-4' : 'p-5'}`}>
      {/* Blocked banner */}
      {isBlocked && (
        <div className={`flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg mb-3 ${isMobile ? 'p-2' : 'p-2.5'}`}>
          <Lock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span className="text-xs font-bold text-red-600 dark:text-red-400">ОТПУСК ЗАБЛОКИРОВАН ({currentLevel.toLocaleString()} л)</span>
        </div>
      )}

      {/* No sensor banner */}
      {tank.noSensorData && (
        <div className={`flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-lg mb-3 ${isMobile ? 'p-2' : 'p-2.5'}`}>
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Книжный остаток</span>
        </div>
      )}

      {/* Header: Name + Fuel type + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-di-primary/10 flex items-center justify-center shrink-0">
            <Fuel className="w-4 h-4 text-blue-600 dark:text-di-primary-light" />
          </div>
          <div className="min-w-0">
            <h3 className={`font-headline font-bold text-foreground truncate ${isMobile ? 'text-sm' : 'text-base'}`}>{tank.name}</h3>
            <p className="text-[10px] text-muted-foreground dark:text-di-on-surface-variant uppercase tracking-wider">{tank.fuelType}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
          <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{statusText}</span>
        </div>
      </div>

      {/* Volume + Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="font-headline font-extrabold text-foreground text-xl tracking-tight">
            {currentLevel.toLocaleString('ru-RU')} <span className="text-xs font-medium text-muted-foreground">л</span>
          </span>
          {!tank.noSensorData && (
            <span className="font-headline font-bold text-foreground text-sm">{percentage}%</span>
          )}
        </div>
        {!tank.noSensorData && (
          <div className="w-full h-1.5 bg-secondary dark:bg-di-surface-highest rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(percentage, 2)}%` }} />
          </div>
        )}
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{tank.noSensorData ? 'Книжный остаток' : `Ёмкость: ${capacity.toLocaleString('ru-RU')} л`}</span>
          {!tank.noSensorData && <span>Свободно: {(capacity - currentLevel).toLocaleString('ru-RU')} л</span>}
        </div>
      </div>

      {/* Telemetry grid */}
      <div className={`grid grid-cols-4 gap-2 mb-4 ${isMobile ? '' : ''}`}>
        <div>
          <p className="text-[8px] font-bold text-muted-foreground dark:text-di-on-surface-variant/50 uppercase mb-0.5">Темп</p>
          <p className="font-headline font-bold text-foreground text-xs">{temp ? `${temp.toFixed(1)}°C` : '—'}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-muted-foreground dark:text-di-on-surface-variant/50 uppercase mb-0.5">Плотн.</p>
          <p className="font-headline font-bold text-foreground text-xs">{density ? density.toFixed(1) : '—'}</p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-muted-foreground dark:text-di-on-surface-variant/50 uppercase mb-0.5">Вода</p>
          <p className={`font-headline font-bold text-xs ${waterMm > 0 ? 'text-amber-600 dark:text-[#fbbf24]' : 'text-green-600 dark:text-[#4ade80]'}`}>
            {waterMm > 0 ? `${waterMm.toFixed(1)}мм` : 'нет'}
          </p>
        </div>
        <div>
          <p className="text-[8px] font-bold text-muted-foreground dark:text-di-on-surface-variant/50 uppercase mb-0.5">Масса</p>
          <p className="font-headline font-bold text-foreground text-xs">
            {(tank.apiData?.amount_begin || tank.mass || 0).toLocaleString('ru-RU')}
          </p>
        </div>
      </div>

      {/* Additional data — compact */}
      <div className="border-t border-border/20 dark:border-di-outline-variant/10 pt-3 mb-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Уровень:</span>
            <span className="text-foreground font-medium">{parseFloat(tank.apiData?.level?.toString() || '0').toFixed(1)} мм</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Состояние:</span>
            <span className={`font-medium ${tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Норма' : 'Проверка'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Объём нач:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.volume_begin || 0).toLocaleString('ru-RU')} л</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Объём кон:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.volume_end || 0).toLocaleString('ru-RU')} л</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Отпуск об:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.release?.volume || 0).toLocaleString('ru-RU')} л</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Отпуск м:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.release?.amount || 0).toLocaleString('ru-RU')} кг</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Масса нач:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.amount_begin || 0).toLocaleString('ru-RU')} кг</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Масса кон:</span>
            <span className="text-foreground font-medium">{(tank.apiData?.amount_end || 0).toLocaleString('ru-RU')} кг</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Код:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{tank.apiData?.fuel || tank.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Обновлено:</span>
            <span className="text-foreground font-medium">
              {tank.apiData?.dt ? new Date(tank.apiData.dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-border/30 dark:border-di-outline-variant/20 text-muted-foreground hover:bg-secondary dark:hover:bg-di-surface-high transition-colors duration-200"
          onClick={() => setShowAnalysis(true)}
        >
          <LineChart className="w-3.5 h-3.5 mr-1.5" />
          Анализ
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs border-border/30 dark:border-di-outline-variant/20 text-muted-foreground hover:bg-secondary dark:hover:bg-di-surface-high transition-colors duration-200"
          onClick={() => setShowCalibration(true)}
        >
          <Settings className="w-3.5 h-3.5 mr-1.5" />
          Калибровка
        </Button>
      </div>

      <TankAnalysisDialog tank={tank} open={showAnalysis} onOpenChange={setShowAnalysis} />
      <TankCalibrationDialog tank={tank} open={showCalibration} onOpenChange={setShowCalibration} />
    </div>
  );
};

export const TankCard = memo(TankCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.isMobile === nextProps.isMobile &&
    prevProps.tank.id === nextProps.tank.id &&
    prevProps.tank.currentLevelLiters === nextProps.tank.currentLevelLiters &&
    prevProps.tank.capacityLiters === nextProps.tank.capacityLiters &&
    prevProps.tank.temperature === nextProps.tank.temperature &&
    prevProps.tank.noSensorData === nextProps.tank.noSensorData &&
    prevProps.tank.apiData?.dt === nextProps.tank.apiData?.dt
  );
});
