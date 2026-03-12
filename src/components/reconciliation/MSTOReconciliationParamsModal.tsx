/**
 * Модальное окно параметров сверки MSTO онлайн-заказов
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Calendar,
  Building2,
  Smartphone,
  Play,
  CheckCircle2,
  Layers,
  ArrowRight,
  Wifi
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useSelection } from '@/contexts/SelectionContext';
import { tradingPointsService } from '@/services/tradingPointsService';
import { getSystemId } from '@/config/stsConfig';
import type { TradingPoint } from '@/types/tradingpoint';
import type { MSTOReconciliationParams } from '@/types/mstoReconciliation';

interface MSTOReconciliationParamsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: MSTOReconciliationParams) => void;
  isLoading?: boolean;
}

export function MSTOReconciliationParamsModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false
}: MSTOReconciliationParamsModalProps) {
  const { selectedNetwork, selectedNetworkIds } = useSelection();

  // Состояние формы
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [allStations, setAllStations] = useState(true);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>([]); // external_id это строка
  const [showAllShifts, setShowAllShifts] = useState(false);

  // Загрузка станций сети
  const [availableStations, setAvailableStations] = useState<TradingPoint[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);

  // Загружаем станции при открытии модального окна
  useEffect(() => {
    if (open && selectedNetworkIds.length > 0) {
      setLoadingStations(true);
      Promise.all(
        selectedNetworkIds.map(id => tradingPointsService.getByNetworkId(id).catch(() => [] as TradingPoint[]))
      )
        .then(results => setAvailableStations(results.flat()))
        .catch(() => setAvailableStations([]))
        .finally(() => setLoadingStations(false));
    }
  }, [open, selectedNetworkIds]);

  // Сбрасываем выбор станций при смене набора сетей
  useEffect(() => {
    setSelectedStationIds([]);
    setAllStations(true);
  }, [selectedNetworkIds]);

  // Обработчик переключения станции (external_id - строка)
  const toggleStation = (stationExternalId: string) => {
    setSelectedStationIds(prev =>
      prev.includes(stationExternalId)
        ? prev.filter(id => id !== stationExternalId)
        : [...prev, stationExternalId]
    );
  };

  // Обработчик отправки формы
  const handleSubmit = () => {
    const systemId = getSystemId(selectedNetwork);
    if (!systemId) return; // Сеть не выбрана

    // Формируем информацию о станциях из настроек торговых точек
    // external_id это строка типа "1", "2" и соответствует коду станции в STS API
    // mstoServicePointIds берём из externalCodes с system="msto"
    const stationsInfo = availableStations.map(station => {
      const code = station.external_id || '';
      const stsStationId = parseInt(code, 10) || 0;

      // Извлекаем MSTO servicePointId из externalCodes (может быть несколько)
      const mstoIds = (station.externalCodes || [])
        .filter(ec => ec.system?.toLowerCase() === 'msto' && ec.isActive)
        .map(ec => parseInt(ec.code, 10))
        .filter(id => id > 0);

      return {
        code,
        name: station.name || `АЗС ${code}`,
        description: station.description,
        stsStationId,
        // Берём первый MSTO ID (основной)
        mstoServicePointId: mstoIds[0],
        // Все MSTO ID (включая альтернативные)
        mstoServicePointIds: mstoIds.length > 0 ? mstoIds : undefined
      };
    });

    // Формируем stationIds как числа (STS station IDs)
    // При выборе "Все станции" отправляем все, иначе - только выбранные
    const stationIdsToSend = allStations
      ? stationsInfo.map(s => s.stsStationId).filter(id => id > 0)
      : selectedStationIds.map(id => parseInt(id, 10)).filter(id => id > 0);

    // Фильтруем информацию о станциях для выбранных ID
    const filteredStationsInfo = allStations
      ? stationsInfo.filter(s => s.stsStationId > 0)
      : stationsInfo.filter(s => stationIdsToSend.includes(s.stsStationId));

    onSubmit({
      dateFrom,
      dateTo,
      stationIds: stationIdsToSend,
      showAllShifts,
      stations: filteredStationsInfo,
      systemId
    });
  };

  // Форматирование даты для отображения
  const formatDisplayDate = (date: string) => {
    try {
      return format(new Date(date), 'd MMMM', { locale: ru });
    } catch {
      return date;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-[calc(100%-2rem)] max-h-[90vh] p-0 gap-0 overflow-hidden bg-background border-border flex flex-col">
        {/* Заголовок с градиентом */}
        <div className="relative px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 bg-gradient-to-br from-cyan-600/20 via-teal-600/10 to-background flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/20">
              <Smartphone className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Сверка онлайн-заказов</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{selectedNetwork?.name || 'Торговая сеть'}</p>
            </div>
          </div>

          {/* Схема сверки */}
          <div className="flex items-center justify-center gap-2 mt-5 text-xs">
            <Badge className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30">
              <Wifi className="h-3 w-3 mr-1" />
              MSTO
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge className="bg-emerald-100 dark:bg-emerald-500/20 text-green-600 dark:text-green-300 border-green-500/30 hover:bg-emerald-500/30">
              Смена
            </Badge>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
          {/* Период */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <div className="p-1.5 rounded-md bg-cyan-500/20">
                <Calendar className="h-4 w-4 text-foreground" />
              </div>
              Период сверки
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mstoDateFrom" className="text-muted-foreground text-xs font-medium mb-1.5 block">с</Label>
                <div className="relative">
                  <Input
                    id="mstoDateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={isLoading}
                    className="h-10 bg-card border-border text-foreground pr-10
                             [&::-webkit-calendar-picker-indicator]:opacity-0
                             [&::-webkit-calendar-picker-indicator]:absolute
                             [&::-webkit-calendar-picker-indicator]:right-2
                             [&::-webkit-calendar-picker-indicator]:w-6
                             [&::-webkit-calendar-picker-indicator]:h-6
                             [&::-webkit-calendar-picker-indicator]:cursor-pointer
                             focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              <div>
                <Label htmlFor="mstoDateTo" className="text-muted-foreground text-xs font-medium mb-1.5 block">по</Label>
                <div className="relative">
                  <Input
                    id="mstoDateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={isLoading}
                    className="h-10 bg-card border-border text-foreground pr-10
                             [&::-webkit-calendar-picker-indicator]:opacity-0
                             [&::-webkit-calendar-picker-indicator]:absolute
                             [&::-webkit-calendar-picker-indicator]:right-2
                             [&::-webkit-calendar-picker-indicator]:w-6
                             [&::-webkit-calendar-picker-indicator]:h-6
                             [&::-webkit-calendar-picker-indicator]:cursor-pointer
                             focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Станции */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20">
                <Building2 className="h-4 w-4 text-foreground" />
              </div>
              Станции
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => !isLoading && setAllStations(true)}
                className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${allStations
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'border-border bg-card/30 hover:border-border hover:bg-card/50'
                  }`}
              >
                {allStations && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                )}
                <Layers className={`h-5 w-5 mb-1.5 sm:mb-2 ${allStations ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'}`} />
                <div className={`text-sm sm:text-base font-medium ${allStations ? 'text-foreground' : 'text-foreground/80'}`}>
                  Все станции
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {availableStations.length} АЗС
                </div>
              </button>

              <button
                type="button"
                onClick={() => !isLoading && setAllStations(false)}
                className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left
                  ${!allStations
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'border-border bg-card/30 hover:border-border hover:bg-card/50'
                  }`}
              >
                {!allStations && (
                  <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                )}
                <Building2 className={`h-5 w-5 mb-1.5 sm:mb-2 ${!allStations ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'}`} />
                <div className={`text-sm sm:text-base font-medium ${!allStations ? 'text-foreground' : 'text-foreground/80'}`}>
                  Выбрать
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedStationIds.length} из {availableStations.length}
                </div>
              </button>
            </div>

            {/* Список станций */}
            {!allStations && (
              <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto p-3 rounded-xl bg-card/30 border border-border/50">
                {loadingStations ? (
                  <div className="col-span-2 flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-600 dark:text-cyan-400" />
                    <span className="ml-2 text-sm text-muted-foreground">Загрузка...</span>
                  </div>
                ) : availableStations.length > 0 ? (
                  availableStations.map((station) => {
                    const externalId = station.external_id || '';
                    const isSelected = selectedStationIds.includes(externalId);
                    return (
                      <div
                        key={station.id}
                        onClick={() => toggleStation(externalId)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all
                          ${isSelected
                            ? 'bg-cyan-500/20 border border-cyan-500/40'
                            : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
                          }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          disabled={isLoading}
                          className="pointer-events-none data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                        />
                        <span className={`text-sm truncate ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                          {station.name || `АЗС ${externalId}`}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center text-muted-foreground py-4 text-sm">
                    Нет доступных станций
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Опция показа всех смен */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-card/30 border border-border/50">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
                <Layers className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Все смены</div>
                <div className="text-xs text-muted-foreground">Включая без онлайн-заказов</div>
              </div>
            </div>
            <Switch
              checked={showAllShifts}
              onCheckedChange={setShowAllShifts}
              disabled={isLoading}
              className="data-[state=checked]:bg-cyan-500"
            />
          </div>

          {/* Информация */}
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-start gap-2">
              <Wifi className="h-4 w-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p>Сверка сравнивает данные MSTO IntegratorService (онлайн-заказы Яндекс, FuelUp и др.)
                   с выручкой онлайн из сменных отчетов.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-card/50 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDisplayDate(dateFrom)}</span>
            <span>—</span>
            <span>{formatDisplayDate(dateTo)}</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 sm:flex-initial text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || (!allStations && selectedStationIds.length === 0)}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400
                       text-foreground shadow-lg shadow-cyan-500/25 sm:min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сверка...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Запустить
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
