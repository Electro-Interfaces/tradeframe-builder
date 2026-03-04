/**
 * Компонент карточки резервуара
 * ОПТИМИЗИРОВАНО: Добавлена мемоизация для предотвращения лишних ре-рендеров
 */

import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Gauge, Droplets, Fuel, LineChart, Settings, Lock, AlertTriangle } from "lucide-react";

/**
 * Порог блокировки отпуска топлива (литры)
 * При уровне ниже этого значения отпуск топлива должен быть заблокирован
 */
const BLOCK_THRESHOLD_LITERS = 800;
import { TankProgressIndicator } from "./TankProgressIndicator";
import { TankAnalysisDialog } from "./TankAnalysisDialog";
import { TankCalibrationDialog } from "./TankCalibrationDialog";
import type { Tank, TankStatus } from "@/types/tanks";

interface TankCardProps {
  tank: Tank;
  isMobile: boolean;
}

/**
 * Вычисляет процент заполнения
 */
function getPercentage(current: number, capacity: number): number {
  return Math.round((current / capacity) * 100);
}

/**
 * Определяет статус резервуара
 */
function getTankStatus(percentage: number, minLevel: number, criticalLevel: number): TankStatus {
  if (percentage > minLevel) return 'normal';
  if (percentage >= criticalLevel) return 'warning';
  return 'critical';
}

const TankCardComponent = ({ tank, isMobile }: TankCardProps) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const currentLevel = tank.currentLevelLiters || 0;
  const capacity = tank.capacityLiters || 0;
  const percentage = capacity > 0 ? getPercentage(currentLevel, capacity) : 0;
  const freeSpace = capacity - currentLevel;
  const tankStatus = getTankStatus(percentage, tank.minLevelPercent || 20, tank.criticalLevelPercent || 10);
  const isBlocked = !tank.noSensorData && currentLevel < BLOCK_THRESHOLD_LITERS;

  return (
    <Card className={`bg-gradient-to-br from-card to-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm ${isBlocked ? 'border-2 border-red-500 ring-2 ring-red-500/30' : 'border border-border/50'}`}>
      <CardHeader className={isMobile ? 'pb-3 px-3 pt-3' : 'pb-4'}>
        {/* Кнопки действий — доступны всем авторизованным пользователям */}
        <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'} mb-3`}>
          <Button
            variant="outline"
            size={isMobile ? 'sm' : 'default'}
            className="flex-1 hover:bg-accent/50"
            onClick={() => setShowAnalysis(true)}
          >
            <LineChart className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            {!isMobile && 'Детальный анализ'}
            {isMobile && 'Анализ'}
          </Button>

          <Button
            variant="outline"
            size={isMobile ? 'sm' : 'default'}
            className="flex-1 hover:bg-accent/50"
            onClick={() => setShowCalibration(true)}
          >
            <Settings className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
            Параметры
          </Button>
        </div>

        {/* Баннер блокировки отпуска */}
        {isBlocked && (
          <div className={`flex items-center gap-2 bg-red-100 dark:bg-red-900/40 border border-red-500/50 rounded-lg mb-3 ${isMobile ? 'p-2' : 'p-3'}`}>
            <Lock className={`text-red-600 dark:text-red-400 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <div className="min-w-0 flex-1">
              <span className={`text-red-600 dark:text-red-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                ОТПУСК ЗАБЛОКИРОВАН
              </span>
              <p className={`text-red-600 dark:text-red-300/80 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                Уровень {currentLevel.toLocaleString()} л &lt; 800 л
              </p>
            </div>
          </div>
        )}

        {/* Баннер: нет данных уровнемера */}
        {tank.noSensorData && (
          <div className={`flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-500/50 rounded-lg mb-3 ${isMobile ? 'p-2' : 'p-3'}`}>
            <AlertTriangle className={`text-yellow-600 dark:text-yellow-400 flex-shrink-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            <div className="min-w-0 flex-1">
              <span className={`text-yellow-600 dark:text-yellow-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Нет данных уровнемера
              </span>
              <p className={`text-yellow-600 dark:text-yellow-300/80 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                Книжный остаток: {(tank.apiData?.volume_begin || 0).toLocaleString()} л − отпуск {(tank.apiData?.release?.volume || 0).toLocaleString()} л = {currentLevel.toLocaleString()} л
              </p>
            </div>
          </div>
        )}

        {/* Заголовок резервуара */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-3 h-8 rounded-full shadow-md flex-shrink-0 ${isBlocked ? 'bg-gradient-to-b from-red-400 to-red-600' : tank.noSensorData ? 'bg-gradient-to-b from-yellow-400 to-yellow-600' : 'bg-gradient-to-b from-blue-400 to-blue-600'}`}></div>
            <div className="min-w-0 flex-1">
              <CardTitle className={`text-foreground font-bold truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
                {tank.name}
              </CardTitle>
              <p
                className={`font-semibold truncate ${isMobile ? 'text-xs' : 'text-sm'} ${
                  isBlocked
                    ? 'text-red-600 dark:text-red-400'
                    : tank.noSensorData
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : tankStatus === 'normal'
                    ? 'text-green-600 dark:text-green-400'
                    : tankStatus === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isBlocked ? '🔒 Блокировка' : tank.noSensorData ? '📖 Книжный остаток' : tankStatus === 'normal' ? 'Активно' : tankStatus === 'warning' ? 'Низкий' : 'Критично'}
              </p>
            </div>
          </div>
          <Badge
            className={`font-bold rounded-lg shadow-md border transition-all flex-shrink-0 whitespace-nowrap ${isBlocked ? 'bg-gradient-to-r from-red-600 to-red-700 text-white border-red-500/50' : 'bg-slate-700 dark:bg-slate-600 text-white border-slate-600/50 dark:border-slate-500/50'} ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'}`}
          >
            {tank.fuelType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={isMobile ? 'space-y-3 px-3 pb-3' : 'space-y-4'}>
        {/* Volume and Progress */}
        <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex justify-between items-center gap-2">
              <span className={`font-bold text-foreground truncate ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                {currentLevel.toLocaleString()} л
              </span>
              {tank.noSensorData ? (
                <span className={`font-bold text-yellow-600 dark:text-yellow-400 flex-shrink-0 ${isMobile ? 'text-xs' : 'text-lg'}`}>
                  (книж.)
                </span>
              ) : (
                <span className={`font-bold text-foreground/80 flex-shrink-0 ${isMobile ? 'text-xs' : 'text-lg'}`}>
                  ({percentage}%)
                </span>
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              {tank.noSensorData ? (
                <span className="truncate">Книжный нач: {(tank.apiData?.volume_begin || 0).toLocaleString()} л</span>
              ) : (
                <span className="truncate">Макс: {capacity.toLocaleString()} л</span>
              )}
            </div>
          </div>

          {/* Vertical Progress Bar (скрываем при отсутствии данных уровнемера) */}
          {!tank.noSensorData && (
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <TankProgressIndicator
                percentage={percentage}
                minLevel={tank.minLevelPercent}
                criticalLevel={tank.criticalLevelPercent}
                isMobile={isMobile}
              />
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{percentage}%</span>
            </div>
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className={`grid grid-cols-2 ${isMobile ? 'gap-2' : 'gap-3'}`}>
          <div className={`bg-secondary/30 rounded-lg border border-border/20 ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className={isMobile ? 'w-3 h-3 text-orange-600 dark:text-orange-400' : 'w-4 h-4 text-orange-600 dark:text-orange-400'} />
              <span className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Температура</span>
            </div>
            <div className={`text-foreground font-bold truncate ${isMobile ? 'text-xs' : 'text-base'}`}>
              {parseFloat(tank.apiData?.temperature?.toString() || tank.temperature?.toString() || '0').toFixed(1)}°C
            </div>
          </div>

          <div className={`bg-secondary/30 rounded-lg border border-border/20 ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Gauge className={isMobile ? 'w-3 h-3 text-blue-600 dark:text-blue-400' : 'w-4 h-4 text-blue-600 dark:text-blue-400'} />
              <span className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Уровень</span>
            </div>
            <div className={`text-foreground font-bold truncate ${isMobile ? 'text-xs' : 'text-base'}`}>
              {parseFloat(tank.apiData?.level?.toString() || '126.2').toFixed(1)} мм
            </div>
          </div>

          <div className={`bg-secondary/30 rounded-lg border border-border/20 ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Droplets className={isMobile ? 'w-3 h-3 text-cyan-600 dark:text-cyan-400' : 'w-4 h-4 text-cyan-600 dark:text-cyan-400'} />
              <span className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Вода</span>
            </div>
            <div className={`text-foreground font-bold truncate ${isMobile ? 'text-xs' : 'text-base'}`}>
              {parseFloat(tank.apiData?.water?.level?.toString() || tank.waterLevelMm?.toString() || '0').toFixed(1)} мм
            </div>
          </div>

          <div className={`bg-secondary/30 rounded-lg border border-border/20 ${isMobile ? 'p-2' : 'p-3'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Fuel className={isMobile ? 'w-3 h-3 text-green-600 dark:text-green-400' : 'w-4 h-4 text-green-600 dark:text-green-400'} />
              <span className={`text-muted-foreground truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>Свободно</span>
            </div>
            <div className={`text-foreground font-bold truncate ${isMobile ? 'text-xs' : 'text-base'}`}>{freeSpace.toLocaleString()} л</div>
          </div>
        </div>

        {/* Additional Stats - Complete API Data */}
        <div className="border-t border-border/30 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Row 1 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Плотность:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.density?.toString() || tank.density?.toString() || '823.32').toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Масса:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.amount_begin?.toString() || tank.mass?.toString() || '0').toFixed(0)} кг
              </span>
            </div>

            {/* Row 2 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Состояние:</span>
              <span
                className={`font-medium ${
                  tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Активно' : 'Ошибка'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Код топлива:</span>
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                {tank.apiData?.fuel || tank.id}
              </span>
            </div>

            {/* Row 3 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Объем нач:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.volume_begin?.toString() || '0').toLocaleString()} л
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Отпуск об:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.release?.volume?.toString() || '0').toLocaleString()} л
              </span>
            </div>

            {/* Row 4 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Объем кон:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.volume_end?.toString() || '0').toLocaleString()} л
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Отпуск м:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.release?.amount?.toString() || '0').toLocaleString()} кг
              </span>
            </div>

            {/* Row 5 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Масса нач:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.amount_begin?.toString() || '0').toLocaleString()} кг
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Масса кон:</span>
              <span className="text-foreground/80 font-medium">
                {parseFloat(tank.apiData?.amount_end?.toString() || '0').toLocaleString()} кг
              </span>
            </div>

            {/* Row 6 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Обновлено:</span>
              <span className="text-foreground/80 font-medium">
                {tank.apiData?.dt
                  ? new Date(tank.apiData.dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Состояние:</span>
              <span className="text-foreground/80 font-medium">
                {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Норма' : 'Проверка'}
              </span>
            </div>
          </div>
        </div>

      </CardContent>

      {/* Диалог анализа */}
      <TankAnalysisDialog
        tank={tank}
        open={showAnalysis}
        onOpenChange={setShowAnalysis}
      />

      {/* Диалог калибровки */}
      <TankCalibrationDialog
        tank={tank}
        open={showCalibration}
        onOpenChange={setShowCalibration}
      />
    </Card>
  );
};

// Мемоизированный экспорт для предотвращения лишних ре-рендеров
export const TankCard = memo(TankCardComponent, (prevProps, nextProps) => {
  // Сравниваем только значимые поля для оптимизации
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
