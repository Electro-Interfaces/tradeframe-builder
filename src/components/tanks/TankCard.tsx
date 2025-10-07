/**
 * Компонент карточки резервуара
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Gauge, Droplets, Fuel } from "lucide-react";
import { TankProgressIndicator } from "./TankProgressIndicator";
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

export function TankCard({ tank, isMobile }: TankCardProps) {
  const percentage = getPercentage(tank.currentLevelLiters, tank.capacityLiters);
  const freeSpace = tank.capacityLiters - tank.currentLevelLiters;
  const tankStatus = getTankStatus(percentage, tank.minLevelPercent, tank.criticalLevelPercent);

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-md"></div>
            <div>
              <CardTitle className="text-white text-lg font-bold">{tank.name}</CardTitle>
              <p
                className={`text-sm font-semibold ${
                  tankStatus === 'normal'
                    ? 'text-green-400'
                    : tankStatus === 'warning'
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {tankStatus === 'normal' ? 'Активно' : tankStatus === 'warning' ? 'Низкий' : 'Критично'}
              </p>
            </div>
          </div>
          <Badge className="px-4 py-2 text-sm font-bold rounded-lg shadow-md bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50 shadow-slate-500/25 transition-all">
            {tank.fuelType}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Volume and Progress */}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-white">
                {tank.currentLevelLiters.toLocaleString()} л
              </span>
              <span className="text-lg font-bold text-slate-300">({percentage}%)</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Макс: {tank.capacityLiters.toLocaleString()} л</span>
            </div>
          </div>

          {/* Vertical Progress Bar */}
          <div className="flex flex-col items-center gap-2">
            <TankProgressIndicator
              percentage={percentage}
              minLevel={tank.minLevelPercent}
              criticalLevel={tank.criticalLevelPercent}
              isMobile={isMobile}
            />
            <span className="text-xs text-slate-400 font-medium">{percentage}%</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-slate-400">Температура</span>
            </div>
            <div className="text-white font-bold">
              {parseFloat(tank.apiData?.temperature?.toString() || tank.temperature?.toString() || '0').toFixed(1)}°C
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
            <div className="flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Уровень</span>
            </div>
            <div className="text-white font-bold">
              {parseFloat(tank.apiData?.level?.toString() || '126.2').toFixed(1)} мм
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Вода</span>
            </div>
            <div className="text-white font-bold">
              {parseFloat(tank.apiData?.water?.level?.toString() || tank.waterLevelMm?.toString() || '0').toFixed(1)} мм
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/20">
            <div className="flex items-center gap-2 mb-1">
              <Fuel className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Свободно</span>
            </div>
            <div className="text-white font-bold">{freeSpace.toLocaleString()} л</div>
          </div>
        </div>

        {/* Additional Stats - Complete API Data */}
        <div className="border-t border-slate-600/30 pt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Row 1 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Плотность:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.density?.toString() || tank.density?.toString() || '823.32').toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Масса:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.amount_begin?.toString() || tank.mass?.toString() || '0').toFixed(0)} кг
              </span>
            </div>

            {/* Row 2 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Состояние:</span>
              <span
                className={`font-medium ${
                  tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Активно' : 'Ошибка'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Код топлива:</span>
              <span className="text-orange-400 font-semibold">
                {tank.apiData?.fuel || tank.id}
              </span>
            </div>

            {/* Row 3 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Объем нач:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.volume_begin?.toString() || '0').toLocaleString()} л
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Отпуск об:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.release?.volume?.toString() || '0').toLocaleString()} л
              </span>
            </div>

            {/* Row 4 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Объем кон:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.volume_end?.toString() || '0').toLocaleString()} л
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Отпуск м:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.release?.amount?.toString() || '0').toLocaleString()} кг
              </span>
            </div>

            {/* Row 5 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Масса нач:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.amount_begin?.toString() || '0').toLocaleString()} кг
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Масса кон:</span>
              <span className="text-slate-300 font-medium">
                {parseFloat(tank.apiData?.amount_end?.toString() || '0').toLocaleString()} кг
              </span>
            </div>

            {/* Row 6 */}
            <div className="flex justify-between">
              <span className="text-slate-400">Обновлено:</span>
              <span className="text-slate-300 font-medium">
                {tank.apiData?.dt
                  ? new Date(tank.apiData.dt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
                  : '21:37'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Состояние:</span>
              <span className="text-slate-300 font-medium">
                {tank.apiData?.state === 'OK' || tank.apiData?.state === 1 ? 'Норма' : 'Проверка'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
