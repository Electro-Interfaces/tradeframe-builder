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
import {
  Settings,
  Loader2,
  RefreshCw,
  Power,
  AlertTriangle
} from "lucide-react";
import { useEquipment } from "@/hooks/useEquipment";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { EquipmentCard } from "@/components/equipment/EquipmentCard";
import { BillAcceptorCard } from "@/components/equipment/BillAcceptorCard";
import { FuelLevelThresholdsCard } from "@/components/equipment/FuelLevelThresholdsCard";
import { useState, useEffect } from "react";
import { tradingPointsService } from "@/services/tradingPointsService";
import type { TradingPoint, BillAcceptorThresholds, FuelLevelThresholds } from "@/types/tradingpoint";

const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;
const INDICATOR_APPEAR_THRESHOLD = 30;

export default function Equipment() {
  const { selectedNetwork, selectedTradingPoint, isInitialized } = useSelection();
  const isMobile = useIsMobile();
  const [tradingPointData, setTradingPointData] = useState<TradingPoint | null>(null);

  // Загрузка данных торговой точки для получения пороговых значений
  useEffect(() => {
    if (selectedTradingPoint) {
      tradingPointsService.getById(selectedTradingPoint)
        .then(data => setTradingPointData(data))
        .catch(err => console.error('Ошибка загрузки данных торговой точки:', err));
    }
  }, [selectedTradingPoint]);

  // Функция сохранения порогов купюроприемника (вызывается из BillAcceptorCard)
  const handleSaveBillAcceptorThresholds = async (thresholds: BillAcceptorThresholds) => {
    if (!selectedTradingPoint) return;

    try {
      // Обновление торговой точки с новыми порогами
      await tradingPointsService.updateBillAcceptorThresholds(selectedTradingPoint, thresholds);

      // Перезагрузка данных торговой точки
      const updatedData = await tradingPointsService.getById(selectedTradingPoint);
      setTradingPointData(updatedData);
    } catch (error) {
      console.error('Ошибка сохранения порогов купюроприемника:', error);
      throw error; // Пробрасываем ошибку для обработки в BillAcceptorCard
    }
  };

  // Функция сохранения порогов топлива (вызывается из FuelLevelThresholdsCard)
  const handleSaveFuelThresholds = async (thresholds: FuelLevelThresholds) => {
    if (!selectedTradingPoint) return;

    try {
      // Обновление торговой точки с новыми порогами
      await tradingPointsService.updateFuelLevelThresholds(selectedTradingPoint, thresholds);

      // Перезагрузка данных торговой точки
      const updatedData = await tradingPointsService.getById(selectedTradingPoint);
      setTradingPointData(updatedData);
    } catch (error) {
      console.error('Ошибка сохранения порогов топлива:', error);
      throw error; // Пробрасываем ошибку для обработки в FuelLevelThresholdsCard
    }
  };

  // Хук для загрузки оборудования
  const {
    terminalInfo,
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
            <div>
              <h1 className="text-2xl font-semibold text-white">Оборудование</h1>
              {terminalInfo?.pos?.lastUpdate && (
                <p className="text-sm text-slate-400 mt-1">
                  Последняя передача данных: {new Date(terminalInfo.pos.lastUpdate).toLocaleString('ru-RU')}
                  {(() => {
                    const now = new Date();
                    const lastUpdate = new Date(terminalInfo.pos.lastUpdate);
                    const diffMs = now.getTime() - lastUpdate.getTime();
                    const diffMinutes = Math.floor(diffMs / 60000);

                    if (diffMinutes < 11) {
                      return <span className="text-green-400 ml-2">(✓ актуально)</span>;
                    } else {
                      return <span className="text-red-400 ml-2">(⚠️ {diffMinutes} мин назад)</span>;
                    }
                  })()}
                </p>
              )}
            </div>
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
                  <BillAcceptorCard
                    billAcceptor={billAcceptor}
                    isMobile={isMobile}
                    thresholds={tradingPointData?.billAcceptorThresholds}
                    onSaveThresholds={handleSaveBillAcceptorThresholds}
                  />
                )}

                {/* Пороги уровня топлива - отдельная карточка */}
                {tanks.length > 0 && (
                  <FuelLevelThresholdsCard
                    tanks={tanks}
                    isMobile={isMobile}
                    thresholds={tradingPointData?.fuelLevelThresholds}
                    onSaveThresholds={handleSaveFuelThresholds}
                    networkId={selectedNetwork?.external_id}
                    stationCode={tradingPointData?.external_id}
                  />
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

      </div>
    </MainLayout>
  );
}
