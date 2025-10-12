/**
 * Страница оборудования
 * Отрефакторенная версия с использованием хуков и компонентов
 */

import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MobileTable } from "@/components/ui/mobile-table";
import {
  Settings,
  Loader2,
  RefreshCw,
  Thermometer,
  Database,
  Fuel,
  Gauge,
  Power,
  AlertTriangle
} from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { BillAcceptorCard } from "@/components/equipment/BillAcceptorCard";

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;
const INDICATOR_APPEAR_THRESHOLD = 30;

/**
 * Получить цвет индикатора заполнения
 */
function getFillLevelColor(level: number) {
  if (level <= 10) return 'bg-red-500';
  if (level <= 30) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint, isInitialized } = useSelection();
  const isMobile = useIsMobile();

  // Хук для загрузки оборудования
  const {
    equipment,
    tanks,
    loading,
    error,
    refreshEquipment,
    restartTerminal,
    restartingTerminal
  } = useEquipment({
    networkId: selectedNetwork?.external_id,
    tradingPointId: selectedTradingPoint,
    autoLoad: true,
    showToasts: !isMobile
  });

  // Хук для pull-to-refresh
  const {
    pullState,
    pullDistance,
    scrollContainerRef
  } = usePullToRefresh({
    onRefresh: refreshEquipment,
    enabled: isMobile,
    pullThreshold: PULL_THRESHOLD,
    maxPullDistance: MAX_PULL_DISTANCE,
    indicatorAppearThreshold: INDICATOR_APPEAR_THRESHOLD
  });

  // Loading state пока контекст не инициализирован
  if (!isInitialized) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Инициализация данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Empty state если не выбрана торговая точка
  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full space-y-6 px-4 md:px-6 lg:px-8 pt-6">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
            <p className="text-slate-400 mt-2">
              Выберите торговую точку для просмотра оборудования
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <Settings className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Ошибка загрузки данных</h2>
            <p className="text-slate-400 mb-4">{error.message}</p>
            <Button onClick={refreshEquipment} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить попытку
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Разделяем купюроприемник и остальное оборудование
  const billAcceptor = equipment.find(eq => eq.name === 'Купюроприемник');
  const otherEquipment = equipment.filter(eq => eq.name !== 'Купюроприемник');

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        data-pull-to-refresh="true"
        className={`w-full space-y-6 ${isMobile ? 'px-2 py-4' : 'px-4 md:px-6 lg:px-8 py-6'} relative overflow-hidden`}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= INDICATOR_APPEAR_THRESHOLD && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{
              transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`,
              opacity: Math.min(1, (pullDistance - INDICATOR_APPEAR_THRESHOLD) / 40)
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-2">
              {pullState === 'refreshing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">Обновление...</span>
                </>
              ) : pullState === 'canRefresh' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Отпустите для обновления</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className="w-4 h-4 text-slate-500"
                    style={{ transform: `rotate(${pullDistance * 2}deg)` }}
                  />
                  <span className="text-sm font-medium">Потяните для обновления</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
            {!isMobile && (
              <div className="flex gap-3">
                {/* Кнопка обновления данных */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshEquipment}
                  disabled={loading}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>

                {/* Кнопка перезагрузки терминала */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restartingTerminal || !selectedNetwork?.external_id || !selectedTradingPoint}
                      className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
                    >
                      {restartingTerminal ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4 mr-2" />
                      )}
                      {restartingTerminal ? 'Перезагрузка...' : 'Перезагрузить'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border border-slate-600">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        Подтверждение перезагрузки терминала
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-300">
                        Вы уверены, что хотите перезагрузить терминал?
                        <br />
                        <br />
                        <strong className="text-yellow-400">⚠️ ВНИМАНИЕ:</strong>
                        <br />
                        • Терминал будет недоступен во время перезагрузки
                        <br />
                        • Все активные операции будут прерваны
                        <br />
                        • Процесс может занять до 2-3 минут
                        <br />
                        <br />
                        <span className="text-white">
                          Сеть: <strong>{selectedNetwork?.name}</strong>
                          <br />
                          Торговая точка: <strong>{selectedTradingPoint}</strong>
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
                        Отмена
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={restartTerminal}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Да, перезагрузить терминал
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>

        {/* Терминальное оборудование */}
        <Card className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
            <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
              <Settings className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-blue-400`} />
              Терминальное оборудование
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && equipment.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Загрузка данных оборудования...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Купюроприемник - отдельная большая карточка */}
                {billAcceptor && (
                  <BillAcceptorCard billAcceptor={billAcceptor} isMobile={isMobile} />
                )}

                {/* Остальное оборудование в сетке */}
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
                  {otherEquipment.map((eq) => (
                    <EquipmentCard key={eq.id} equipment={eq} isMobile={isMobile} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Резервуары */}
        <Card className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
            <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
              <Database className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-400`} />
              Резервуары
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && tanks.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Загрузка данных резервуаров...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <MobileTable showScrollHint={true}>
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="text-left border-b border-slate-600">
                        <tr>
                          <th className="pb-3 text-slate-300 font-medium">Резервуар</th>
                          <th className="pb-3 text-slate-300 font-medium">Топливо</th>
                          <th className="pb-3 text-slate-300 font-medium">Объем емкости</th>
                          <th className="pb-3 text-slate-300 font-medium">Факт</th>
                          <th className="pb-3 text-slate-300 font-medium">Заполнение</th>
                          <th className="pb-3 text-slate-300 font-medium">Температура</th>
                          <th className="pb-3 text-slate-300 font-medium">Вода</th>
                          <th className="pb-3 text-slate-300 font-medium">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tanks.map((tank) => {
                          const fillLevel = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
                          const tankStatus = fillLevel < tank.criticalLevelPercent ? 'critical' : fillLevel < tank.minLevelPercent ? 'warning' : 'normal';

                          return (
                            <tr key={tank.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <Database className="w-4 h-4 text-green-500" />
                                  <span className="text-white font-medium">{tank.name}</span>
                                </div>
                              </td>
                              <td className="py-4 text-slate-300">{tank.fuelType}</td>
                              <td className="py-4 text-slate-300">{tank.capacityLiters.toLocaleString()} л</td>
                              <td className="py-4 text-slate-300">{tank.currentLevelLiters.toLocaleString()} л</td>
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-slate-600 rounded-full h-2 min-w-[60px]">
                                    <div
                                      className={`h-2 rounded-full ${getFillLevelColor(fillLevel)}`}
                                      style={{ width: `${Math.max(fillLevel, 2)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-slate-300 min-w-[35px]">{Math.round(fillLevel)}%</span>
                                </div>
                              </td>
                              <td className="py-4 text-slate-300">
                                <div className="flex items-center gap-1">
                                  <Thermometer className="w-4 h-4 text-blue-400" />
                                  {tank.temperature}°C
                                </div>
                              </td>
                              <td className="py-4 text-slate-300">{tank.waterLevelMm} мм</td>
                              <td className="py-4">
                                <Badge
                                  className={`${
                                    tankStatus === 'normal'
                                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                                      : tankStatus === 'warning'
                                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                >
                                  {tankStatus === 'normal' ? 'Норма' : tankStatus === 'warning' ? 'Мало' : 'Критично'}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </MobileTable>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {tanks.map((tank) => {
                    const fillLevel = tank.capacityLiters > 0 ? (tank.currentLevelLiters / tank.capacityLiters) * 100 : 0;
                    const tankStatus = fillLevel < tank.criticalLevelPercent ? 'critical' : fillLevel < tank.minLevelPercent ? 'warning' : 'normal';

                    return (
                      <div key={tank.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-green-500" />
                            <span className="text-white font-medium text-base">{tank.name}</span>
                          </div>
                          <Badge
                            className={`text-xs px-2 py-1 ${
                              tankStatus === 'normal'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : tankStatus === 'warning'
                                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {tankStatus === 'normal' ? 'Норма' : tankStatus === 'warning' ? 'Мало' : 'Критично'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <Fuel className="w-3 h-3 text-blue-400" />
                          <span className="text-slate-300 font-medium text-sm">{tank.fuelType}</span>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-slate-400">Заполнение</span>
                            <span className="text-xs text-white font-medium">{Math.round(fillLevel)}%</span>
                          </div>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${getFillLevelColor(fillLevel)}`}
                              style={{ width: `${Math.max(fillLevel, 2)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>{tank.currentLevelLiters.toLocaleString()} л</span>
                            <span>{tank.capacityLiters.toLocaleString()} л</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <Thermometer className="w-3 h-3 text-blue-400" />
                            <div>
                              <div className="text-xs text-slate-400">Температура</div>
                              <div className="text-xs text-white font-medium">{tank.temperature}°C</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Gauge className="w-3 h-3 text-cyan-400" />
                            <div>
                              <div className="text-xs text-slate-400">Вода</div>
                              <div className="text-xs text-white font-medium">{tank.waterLevelMm} мм</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
