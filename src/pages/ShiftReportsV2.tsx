import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { useSelection } from "@/contexts/SelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DollarSign, Fuel, Receipt, TrendingUp, Clock, FileDown } from "lucide-react";
import { shiftReportsV2Service } from "@/services/shiftReportsV2Service";
import type { ShiftListItem, ShiftFilters as ShiftFiltersType, ShiftDetails } from "@/types/shift-reports-v2";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Компоненты
import KPIShiftCard from "@/components/shift-reports/KPIShiftCard";
import ShiftFilters from "@/components/shift-reports/ShiftFilters";
import ShiftsTable from "@/components/shift-reports/ShiftsTable";
import MobileShiftsTable from "@/components/shift-reports/MobileShiftsTable";
import ShiftDetailsModal from "@/components/shift-reports/ShiftDetailsModal";
import { ExportDialog } from "@/components/shift-reports/ExportDialog";

// Сервис экспорта
import { exportMultipleShifts, type ExportFormat, type ExportMode } from "@/services/shiftReportExportService";

export default function ShiftReportsV2() {
  const { selectedNetwork, selectedTradingPoint: selectedTradingPointId } = useSelection();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Состояния
  const [shifts, setShifts] = useState<ShiftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShiftNumber, setSelectedShiftNumber] = useState<number | null>(null);
  const [selectedTradingPoint, setSelectedTradingPoint] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);

  // Фильтры
  const [filters, setFilters] = useState<ShiftFiltersType>(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const today = new Date();

    return {
      dateFrom: weekAgo.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
      status: 'all',
    };
  });

  // Загрузка объекта торговой точки по ID
  useEffect(() => {
    const loadTradingPoint = async () => {
      if (!selectedTradingPointId || !selectedNetwork) {
        setSelectedTradingPoint(null);
        return;
      }

      try {
        const tradingPointsService = (await import('@/services/tradingPointsService')).default;
        const points = await tradingPointsService.getByNetworkId(selectedNetwork.id);
        const point = points.find(p => p.id === selectedTradingPointId);
        setSelectedTradingPoint(point || null);
      } catch (error) {
        console.error('❌ Ошибка загрузки торговой точки', error);
        setSelectedTradingPoint(null);
      }
    };

    loadTradingPoint();
  }, [selectedTradingPointId, selectedNetwork]);

  // Загрузка смен
  useEffect(() => {
    const loadShifts = async () => {
      if (!selectedTradingPoint) {
        setShifts([]);
        return;
      }

      try {
        setLoading(true);

        // Извлекаем номер станции из торговой точки
        let stationNumber: number | undefined;

        // 1. Проверяем external_id
        if (selectedTradingPoint.external_id && !isNaN(parseInt(selectedTradingPoint.external_id))) {
          stationNumber = parseInt(selectedTradingPoint.external_id);
        }
        // 2. Ищем код для системы STS в externalCodes
        else {
          const stsCode = selectedTradingPoint.externalCodes?.find(
            code => code.system === 'sts' && code.isActive
          );
          if (stsCode && !isNaN(parseInt(stsCode.code))) {
            stationNumber = parseInt(stsCode.code);
          }
        }

        // 3. Пытаемся извлечь номер из ID (например, bto-azs-4 -> 4)
        if (!stationNumber && selectedTradingPoint.id) {
          const match = selectedTradingPoint.id.match(/(\d+)$/);
          if (match) {
            stationNumber = parseInt(match[1]);
          }
        }

        // Если номер станции не найден - показываем ошибку пользователю
        if (!stationNumber) {
          console.error('Не настроен номер станции STS API для торговой точки:', selectedTradingPoint);
          alert(`Ошибка: Для торговой точки "${selectedTradingPoint.name}" не настроен номер станции в STS API.\n\nНеобходимо добавить:\n- external_id с номером станции\n- или код в externalCodes с system='sts'`);
          setShifts([]);
          setLoading(false);
          return;
        }

        const requestParams = {
          system: 15, // Код системы - можно получить из контекста
          station: stationNumber,
          // Не передаём даты - API вернёт все доступные смены
          // dt_beg: filters.dateFrom,
          // dt_end: filters.dateTo,
        };

        const data = await shiftReportsV2Service.getShifts(
          requestParams,
          selectedTradingPoint.name
        );

        setShifts(data);
      } catch (error) {
        console.error('Ошибка загрузки смен:', error);
        // Сервис уже возвращает mock данные при ошибке, но на всякий случай
        setShifts([]);
      } finally {
        setLoading(false);
      }
    };

    loadShifts();
  }, [selectedTradingPoint]); // Убрали зависимость от дат - фильтрация на клиенте

  // Фильтрация и сортировка смен
  const filteredShifts = useMemo(() => {
    let filtered = shiftReportsV2Service.filterShifts(shifts, {
      status: filters.status !== 'all' ? filters.status : undefined,
      shiftNumber: filters.shiftNumber,
    });

    // Фильтрация по датам на клиенте
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt).setHours(0, 0, 0, 0);
        return shiftDate >= dateFrom;
      });
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      filtered = filtered.filter(shift => {
        const shiftDate = new Date(shift.openedAt).getTime();
        return shiftDate <= dateTo;
      });
    }

    // Сортировка: самые свежие наверху (по дате открытия, DESC)
    filtered.sort((a, b) => {
      const dateA = new Date(a.openedAt).getTime();
      const dateB = new Date(b.openedAt).getTime();
      return dateB - dateA; // DESC - новые сверху
    });

    return filtered;
  }, [shifts, filters]);

  // KPI метрики
  const kpiMetrics = useMemo(() => {
    return shiftReportsV2Service.calculateKPIMetrics(filteredShifts);
  }, [filteredShifts]);

  // Обработка выбора смены
  const handleSelectShift = (shiftNumber: number) => {
    setSelectedShiftNumber(shiftNumber);
  };

  // Обработка закрытия модального окна
  const handleCloseModal = () => {
    setSelectedShiftNumber(null);
  };

  // Обработка обновления данных
  const handleRefresh = () => {
    // Принудительная перезагрузка через изменение фильтров
    setFilters({ ...filters });
  };

  // Обработка выбора смен
  const handleToggleShiftSelection = (shiftId: string) => {
    setSelectedShiftIds(prev =>
      prev.includes(shiftId)
        ? prev.filter(id => id !== shiftId)
        : [...prev, shiftId]
    );
  };

  const handleToggleAllShifts = (selected: boolean) => {
    if (selected) {
      setSelectedShiftIds(filteredShifts.map(shift => shift.id));
    } else {
      setSelectedShiftIds([]);
    }
  };

  // Обработка экспорта
  const handleExport = async (format: ExportFormat, mode: ExportMode, folderHandle?: any) => {
    // Проверка: должны быть выбраны конкретные смены
    if (selectedShiftIds.length === 0) {
      toast({
        title: "Не выбраны сменные отчеты",
        description: "Выберите один или несколько сменных отчетов для экспорта с помощью чекбоксов",
        variant: "destructive",
      });
      return;
    }

    // Определяем смены для экспорта
    const shiftsToExport = filteredShifts.filter(shift => selectedShiftIds.includes(shift.id));

    if (shiftsToExport.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выбранные смены не найдены",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      // Получаем полные данные для каждой смены
      const shiftDetails: ShiftDetails[] = [];

      for (const shift of shiftsToExport) {
        const details = await shiftReportsV2Service.getShiftDetails({
          system: 15,
          station: shift.stationCode,
          shift: shift.shiftNumber,
        });

        if (details) {
          shiftDetails.push(details);
        }
      }

      // Экспортируем смены
      const results = await exportMultipleShifts(
        shiftDetails,
        { format, mode, folderHandle }
      );

      // Подсчет результатов
      const successCount = results.filter(r => r.success && !r.skipped).length;
      const skippedCount = results.filter(r => r.skipped).length;
      const errorCount = results.filter(r => !r.success).length;

      // Уведомление
      if (successCount > 0) {
        toast({
          title: "Экспорт завершен",
          description: `Экспортировано: ${successCount}, пропущено: ${skippedCount}, ошибок: ${errorCount}`,
        });
      } else if (skippedCount > 0) {
        toast({
          title: "Все файлы уже экспортированы",
          description: `Пропущено файлов: ${skippedCount}`,
        });
      } else {
        toast({
          title: "Ошибка экспорта",
          description: "Не удалось экспортировать файлы",
          variant: "destructive",
        });
      }

      setExportDialogOpen(false);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      toast({
        title: "Ошибка экспорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Форматирование
  const formatCurrency = (value: number) => {
    return value.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' ₽';
  };

  const formatVolume = (value: number) => {
    return value.toFixed(0) + ' л';
  };

  // Проверка выбора торговой точки
  if (!selectedTradingPoint) {
    return (
      <MainLayout fullWidth={true}>
        <div className="w-full h-full px-4 md:px-6 lg:px-8">
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Сменные отчеты</h1>
          </div>
          <div className="bg-slate-800 mb-6 w-full rounded-lg">
            <div className="px-4 md:px-6 py-4">
              <EmptyState
                title="Выберите торговую точку"
                description="Для просмотра сменных отчетов необходимо выбрать торговую точку из выпадающего списка выше"
                className="py-16"
              />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Сменные отчеты</h1>
          <p className="text-slate-400 mt-2">
            {selectedTradingPoint.name}
            {loading && <span className="text-slate-500 ml-2">• Загрузка...</span>}
          </p>
        </div>

        {/* Фильтры */}
        <div className="mb-6">
          <ShiftFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={handleRefresh}
            loading={loading}
          />
        </div>

        {/* Журнал смен */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Журнал смен
              <span className="text-slate-400 ml-2 font-normal text-sm">
                ({filteredShifts.length} из {shifts.length})
              </span>
              {selectedShiftIds.length > 0 && (
                <span className="text-trade-blue ml-2 font-normal text-sm">
                  • Выбрано: {selectedShiftIds.length}
                </span>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              disabled={selectedShiftIds.length === 0 || loading}
              title={selectedShiftIds.length === 0 ? "Выберите смены для экспорта" : `Экспортировать ${selectedShiftIds.length} смен(у/ы)`}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Экспорт {selectedShiftIds.length > 0 ? `(${selectedShiftIds.length})` : ''}
            </Button>
          </div>

          {/* Таблица или карточки */}
          {isMobile ? (
            <MobileShiftsTable
              shifts={filteredShifts}
              onSelectShift={handleSelectShift}
              loading={loading}
              selectedShiftIds={selectedShiftIds}
              onToggleShiftSelection={handleToggleShiftSelection}
              onToggleAllShifts={handleToggleAllShifts}
            />
          ) : (
            <ShiftsTable
              shifts={filteredShifts}
              onSelectShift={handleSelectShift}
              loading={loading}
              selectedShiftIds={selectedShiftIds}
              onToggleShiftSelection={handleToggleShiftSelection}
              onToggleAllShifts={handleToggleAllShifts}
            />
          )}
        </div>

        {/* Модальное окно деталей смены */}
        {selectedTradingPoint && (
          <ShiftDetailsModal
            isOpen={selectedShiftNumber !== null}
            onClose={handleCloseModal}
            shiftNumber={selectedShiftNumber}
            system={15}
            station={(() => {
              // Извлекаем номер станции тем же способом что и при загрузке смен
              if (selectedTradingPoint.external_id && !isNaN(parseInt(selectedTradingPoint.external_id))) {
                return parseInt(selectedTradingPoint.external_id);
              }
              const stsCode = selectedTradingPoint.externalCodes?.find(
                code => code.system === 'sts' && code.isActive
              );
              if (stsCode && !isNaN(parseInt(stsCode.code))) {
                return parseInt(stsCode.code);
              }
              if (selectedTradingPoint.id) {
                const match = selectedTradingPoint.id.match(/(\d+)$/);
                if (match) {
                  return parseInt(match[1]);
                }
              }
              return 0;
            })()}
            stationName={selectedTradingPoint.name}
          />
        )}

        {/* Диалог экспорта */}
        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          onExport={handleExport}
          isExporting={isExporting}
        />
      </div>
    </MainLayout>
  );
}
