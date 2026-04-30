import { useEffect, useRef, useState } from 'react';
import {
  TankCalibrationSettings as CalibrationSettings,
  DEFAULT_CALIBRATION_SETTINGS,
  CalibrationFuelType,
  CalibrationMethod,
  TankShapeType,
  TankLocationType,
  LevelSensorType,
  TankShape,
  CalibrationTable
} from '@/types/tanks';
import {
  calculateTankVolume,
  getSensorAccuracyDefaults,
  getSensorAccuracyHint,
  getDispenserAccuracyHint,
  FUEL_COEFFICIENTS,
  interpolateVolume
} from '@/utils/calibrationHelpers';
import {
  applyCalibrationTable,
  approveCalibrationTable,
  getCalibrationTables
} from '@/services/calibrationTableService';
import { CalculationDialog } from './dialogs/CalculationDialog';
import { AnalysisDialog } from './dialogs/AnalysisDialog';
import { CalibrationTablesHistory } from './CalibrationTablesHistory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Thermometer,
  Droplets,
  Clock,
  AlertTriangle,
  Calculator,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Loader2,
  Bell,
  Gauge,
  LineChart
} from 'lucide-react';

interface TankCalibrationSettingsProps {
  tankId: string;
  tankName: string;
  tankCapacity: number;
  networkName?: string;
  stationName?: string;
  fuelType?: string;
  initialSettings?: CalibrationSettings;
  onSave: (settings: CalibrationSettings) => Promise<void>;
}

export function TankCalibrationSettingsComponent({
  tankId,
  tankName,
  tankCapacity,
  networkName,
  stationName,
  fuelType,
  initialSettings,
  onSave
}: TankCalibrationSettingsProps) {
  const [settings, setSettings] = useState<CalibrationSettings>(() => {
    // Если есть initialSettings - используем их как приоритетные
    if (initialSettings) {
      return {
        tank_id: tankId,
        ...DEFAULT_CALIBRATION_SETTINGS,
        ...initialSettings,
        // Сохраняем calibration_status из initialSettings или устанавливаем 'never'
        calibration_status: initialSettings.calibration_status || 'never'
      } as CalibrationSettings;
    }

    // Если нет initialSettings - используем дефолты
    return {
      tank_id: tankId,
      ...DEFAULT_CALIBRATION_SETTINGS,
      calibration_status: 'never' as const
    } as CalibrationSettings;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Состояния для расчета таблицы
  const [showCalculationDialog, setShowCalculationDialog] = useState(false);

  // Состояние для диалога анализа калибровки
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [calibrationTables, setCalibrationTables] = useState<CalibrationTable[]>([]);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [summaryActionInProgress, setSummaryActionInProgress] = useState<string | null>(null);
  const [summaryActionFeedback, setSummaryActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmApplyTableId, setConfirmApplyTableId] = useState<string | null>(null);
  const [highlightedTableId, setHighlightedTableId] = useState<string | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);

  // Вычисляемый градиент: объём резервуара × коэффициент расширения
  const calculatedGradient = (tankCapacity * settings.thermal_expansion_coefficient).toFixed(2);

  // Автоматически рассчитанный объем резервуара (литры)
  const calculatedVolume = calculateTankVolume(settings);

  const updateSetting = <K extends keyof CalibrationSettings>(
    key: K,
    value: CalibrationSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Хелпер для безопасной обработки числовых input'ов
  const handleNumberInput = (key: keyof CalibrationSettings, inputValue: string, isInteger: boolean = false) => {
    if (inputValue === '') {
      updateSetting(key as any, 0 as any);
      return;
    }
    const parsed = isInteger ? parseInt(inputValue) : parseFloat(inputValue);
    updateSetting(key as any, (isNaN(parsed) ? 0 : parsed) as any);
  };

  const handleSensorTypeChange = (sensorType: LevelSensorType) => {
    updateSetting('level_sensor_type', sensorType);
  };

  const applyRecommendedAccuracy = () => {
    const defaults = getSensorAccuracyDefaults(settings.level_sensor_type);
    setSettings(prev => ({
      ...prev,
      level_sensor_error_percent: defaults.error_percent,
      level_sensor_accuracy_mm: defaults.accuracy_mm
    }));
  };

  const handleFuelTypeChange = (fuelType: CalibrationFuelType) => {
    const coef = FUEL_COEFFICIENTS[fuelType] || FUEL_COEFFICIENTS.gasoline;
    setSettings(prev => ({
      ...prev,
      fuel_type: fuelType,
      thermal_expansion_coefficient: coef.thermal,
      natural_loss_summer_percent: coef.summer_loss,
      natural_loss_winter_percent: coef.winter_loss
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      tank_id: tankId,
      ...DEFAULT_CALIBRATION_SETTINGS,
      calibration_status: 'never'
    } as CalibrationSettings);
  };

  useEffect(() => {
    let isMounted = true;

    const loadTables = async () => {
      try {
        setIsTablesLoading(true);
        const tables = await getCalibrationTables(tankId);
        if (isMounted) {
          setCalibrationTables(tables);
        }
      } catch {
        if (isMounted) {
          setCalibrationTables([]);
        }
      } finally {
        if (isMounted) {
          setIsTablesLoading(false);
        }
      }
    };

    loadTables();

    return () => {
      isMounted = false;
    };
  }, [tankId, historyRefreshKey]);

  const sortedTables = [...calibrationTables].sort((left, right) => right.version - left.version);
  const activeTable = sortedTables.find((table) => table.is_active) || null;
  const latestTable = sortedTables[0] || null;
  const latestDraftTrkTable = sortedTables.find((table) => table.creation_notes?.includes('[draft_trk_analysis]')) || null;
  const latestApprovedInactiveTable = sortedTables.find((table) => table.status === 'approved' && !table.is_active) || null;
  const baselineTablesCount = calibrationTables.filter((table) => table.creation_notes?.includes('[baseline_sensor]')).length;
  const draftTrkTablesCount = calibrationTables.filter((table) => table.creation_notes?.includes('[draft_trk_analysis]')).length;
  const approvedTablesCount = calibrationTables.filter((table) => table.status === 'approved').length;
  const draftTablesCount = calibrationTables.filter((table) => table.status === 'draft').length;

  const workflowBadge = activeTable
    ? { variant: 'default' as const, label: `Активна v${activeTable.version}` }
    : draftTablesCount > 0
      ? { variant: 'secondary' as const, label: 'Есть черновики' }
      : settings.calibration_status === 'completed'
        ? { variant: 'default' as const, label: 'Откалиброван' }
        : settings.calibration_status === 'in_progress'
          ? { variant: 'secondary' as const, label: 'В процессе' }
          : settings.calibration_status === 'failed'
            ? { variant: 'destructive' as const, label: 'Ошибка' }
            : { variant: 'outline' as const, label: 'Не настроено' };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTablesChanged = () => {
    setHistoryRefreshKey((current) => current + 1);
  };

  const getStatusLabel = (status: CalibrationTable['status']) => {
    switch (status) {
      case 'draft':
        return 'черновик';
      case 'pending_approval':
        return 'на утверждении';
      case 'approved':
        return 'утверждена';
      case 'rejected':
        return 'отклонена';
      case 'archived':
        return 'архив';
      default:
        return status;
    }
  };

  const getTableSourceMeta = (table: CalibrationTable | null) => {
    if (!table) {
      return { label: 'Нет версии', className: 'border-border text-muted-foreground' };
    }

    const notes = table.creation_notes?.trim() || '';
    if (notes.includes('[baseline_sensor]')) {
      return {
        label: 'Baseline датчика',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      };
    }

    if (notes.includes('[draft_trk_analysis]')) {
      return {
        label: 'Draft ТРК',
        className: 'border-primary/30 bg-primary/10 text-primary dark:text-blue-300'
      };
    }

    return {
      label: 'Ручная версия',
      className: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300'
    };
  };

  const buildTableComparisonSummary = (
    currentTable: CalibrationTable | null,
    nextTable: CalibrationTable | null
  ) => {
    if (!currentTable || !nextTable) {
      return null;
    }

    const currentMap = new Map(currentTable.table.map((point) => [point.level_mm, point.volume_liters]));
    const nextMap = new Map(nextTable.table.map((point) => [point.level_mm, point.volume_liters]));
    const levels = Array.from(new Set([
      ...currentTable.table.map((point) => point.level_mm),
      ...nextTable.table.map((point) => point.level_mm),
    ])).sort((left, right) => left - right);

    const maxPercentThreshold = settings.max_acceptable_deviation_percent > 0
      ? settings.max_acceptable_deviation_percent
      : 0.5;
    const maxLitersThreshold = settings.max_acceptable_deviation_liters > 0
      ? settings.max_acceptable_deviation_liters
      : 50;

    let comparedPoints = 0;
    let changedPoints = 0;
    let totalAbsLiters = 0;
    let totalAbsPercent = 0;
    let totalSignedLiters = 0;
    let maxAbsLiters = 0;
    let maxAbsPercent = 0;
    let maxDifferenceLevel: number | null = null;
    const comparisonPoints: Array<{
      level: number;
      diffLiters: number;
      absLiters: number;
      diffPercent: number;
    }> = [];
    const zoneStats = {
      low: { totalAbsLiters: 0, count: 0 },
      middle: { totalAbsLiters: 0, count: 0 },
      high: { totalAbsLiters: 0, count: 0 },
    };
    const minLevel = levels[0];
    const maxLevel = levels[levels.length - 1];
    const zoneSize = Math.max(1, (maxLevel - minLevel) / 3);

    levels.forEach((level) => {
      const currentVolume = interpolateVolume(level, currentMap);
      const nextVolume = interpolateVolume(level, nextMap);

      if (currentVolume === null || nextVolume === null) {
        return;
      }

      const diffLiters = nextVolume - currentVolume;
      const absLiters = Math.abs(diffLiters);
      const absPercent = currentVolume > 0 ? (absLiters / currentVolume) * 100 : 0;

      comparedPoints += 1;
      totalAbsLiters += absLiters;
      totalAbsPercent += absPercent;
      totalSignedLiters += diffLiters;
      comparisonPoints.push({
        level,
        diffLiters,
        absLiters,
        diffPercent: absPercent,
      });

      const zoneKey = level < minLevel + zoneSize
        ? 'low'
        : level < minLevel + zoneSize * 2
          ? 'middle'
          : 'high';
      zoneStats[zoneKey].totalAbsLiters += absLiters;
      zoneStats[zoneKey].count += 1;

      if (absLiters > maxAbsLiters) {
        maxAbsLiters = absLiters;
        maxDifferenceLevel = level;
      }

      if (absPercent > maxAbsPercent) {
        maxAbsPercent = absPercent;
      }

      if (absLiters >= maxLitersThreshold || absPercent >= maxPercentThreshold) {
        changedPoints += 1;
      }
    });

    if (comparedPoints === 0) {
      return null;
    }

    const status = changedPoints === 0
      ? 'safe'
      : maxAbsLiters >= maxLitersThreshold * 2 || maxAbsPercent >= maxPercentThreshold * 2
        ? 'review_required'
        : 'attention';

    return {
      comparedPoints,
      changedPoints,
      averageAbsLiters: totalAbsLiters / comparedPoints,
      averageAbsPercent: totalAbsPercent / comparedPoints,
      averageSignedLiters: totalSignedLiters / comparedPoints,
      maxAbsLiters,
      maxAbsPercent,
      maxDifferenceLevel,
      litersThreshold: maxLitersThreshold,
      percentThreshold: maxPercentThreshold,
      status,
      chartPoints: (() => {
        if (comparisonPoints.length <= 32) {
          return comparisonPoints;
        }

        const step = Math.ceil(comparisonPoints.length / 32);
        return comparisonPoints.filter((_, index) => (
          index === 0
          || index === comparisonPoints.length - 1
          || index % step === 0
        ));
      })(),
      zones: {
        low: zoneStats.low.count > 0 ? zoneStats.low.totalAbsLiters / zoneStats.low.count : 0,
        middle: zoneStats.middle.count > 0 ? zoneStats.middle.totalAbsLiters / zoneStats.middle.count : 0,
        high: zoneStats.high.count > 0 ? zoneStats.high.totalAbsLiters / zoneStats.high.count : 0,
      },
    };
  };

  const buildMiniChartData = (
    points: Array<{ level: number; diffLiters: number }>
  ) => {
    if (points.length === 0) {
      return null;
    }

    const width = 320;
    const height = 92;
    const paddingX = 10;
    const paddingY = 10;
    const minLevel = points[0].level;
    const maxLevel = points[points.length - 1].level;
    const maxAbsDiff = Math.max(
      1,
      ...points.map((point) => Math.abs(point.diffLiters))
    );
    const zeroY = height / 2;

    const normalizedPoints = points.map((point) => {
      const x = maxLevel === minLevel
        ? width / 2
        : paddingX + ((point.level - minLevel) / (maxLevel - minLevel)) * (width - paddingX * 2);
      const y = zeroY - (point.diffLiters / maxAbsDiff) * ((height / 2) - paddingY);

      return { x, y, ...point };
    });

    const polyline = normalizedPoints.map((point) => `${point.x},${point.y}`).join(' ');
    const maxPoint = normalizedPoints.reduce((currentMax, point) => (
      Math.abs(point.diffLiters) > Math.abs(currentMax.diffLiters) ? point : currentMax
    ), normalizedPoints[0]);

    return {
      width,
      height,
      zeroY,
      polyline,
      maxPoint,
    };
  };

  const handleQuickApprove = async () => {
    if (!latestDraftTrkTable || latestDraftTrkTable.status !== 'draft') {
      return;
    }

    setSummaryActionInProgress(latestDraftTrkTable.id);
    setSummaryActionFeedback(null);

    try {
      await approveCalibrationTable(latestDraftTrkTable.id, 'Утверждено из сводки калибровки');
      setSummaryActionFeedback({
        type: 'success',
        text: `Draft ТРК v${latestDraftTrkTable.version} утвержден.`
      });
      handleTablesChanged();
    } catch (error) {
      setSummaryActionFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось утвердить draft ТРК'
      });
    } finally {
      setSummaryActionInProgress(null);
    }
  };

  const handleQuickApply = async () => {
    if (!confirmApplyTableId) {
      return;
    }

    setSummaryActionInProgress(confirmApplyTableId);
    setSummaryActionFeedback(null);

    try {
      const appliedTable = await applyCalibrationTable(confirmApplyTableId);
      setSummaryActionFeedback({
        type: 'success',
        text: `Версия v${appliedTable.version} применена как активная.`
      });
      handleTablesChanged();
    } catch (error) {
      setSummaryActionFeedback({
        type: 'error',
        text: error instanceof Error ? error.message : 'Не удалось применить таблицу'
      });
    } finally {
      setSummaryActionInProgress(null);
      setConfirmApplyTableId(null);
    }
  };

  const handleOpenDetailedComparison = () => {
    if (!latestApprovedInactiveTable) {
      return;
    }

    setHighlightedTableId(latestApprovedInactiveTable.id);
    historySectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const activeSourceMeta = getTableSourceMeta(activeTable);
  const latestDraftSourceMeta = getTableSourceMeta(latestDraftTrkTable);
  const latestApprovedSourceMeta = getTableSourceMeta(latestApprovedInactiveTable);
  const readyToApplyComparison = buildTableComparisonSummary(activeTable, latestApprovedInactiveTable);
  const readyToApplyChart = readyToApplyComparison
    ? buildMiniChartData(readyToApplyComparison.chartPoints)
    : null;
  const locationContextLabel = `${networkName || 'Компания не выбрана'} / ${stationName || 'Станция не выбрана'}`;


  return (
    <div className="space-y-4">
      <AlertDialog open={confirmApplyTableId !== null} onOpenChange={(open) => { if (!open) setConfirmApplyTableId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Применить следующую версию?</AlertDialogTitle>
            <AlertDialogDescription>
              {latestApprovedInactiveTable
                ? `Версия v${latestApprovedInactiveTable.version} станет активной. Текущая активная таблица будет заменена.`
                : 'Выбранная версия станет активной для резервуара.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleQuickApply} disabled={summaryActionInProgress !== null}>
              {summaryActionInProgress !== null ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Применение...
                </>
              ) : (
                'Применить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Калибровка резервуара</h3>
          <p className="text-sm text-muted-foreground">
            {networkName || 'Компания не выбрана'} / {stationName || 'Станция не выбрана'} / {tankName}{fuelType ? ` / ${fuelType}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={workflowBadge.variant}>
            {workflowBadge.label}
          </Badge>
        </div>
      </div>

      <Card className="border-border bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Состояние калибровки
          </CardTitle>
          <CardDescription>
            Рабочая сводка по активной версии, черновикам и следующему шагу по резервуару.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Активная версия</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {activeTable ? `v${activeTable.version}` : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Всего версий</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{calibrationTables.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Baseline</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{baselineTablesCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Draft ТРК</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{draftTrkTablesCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Утверждено</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{approvedTablesCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Последняя версия</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {latestTable ? `v${latestTable.version}` : '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Последнее применение</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(activeTable?.applied_at || settings.last_calibration_date)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Последний расчет</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {formatDateTime(latestTable?.created_at)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Следующий шаг</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {activeTable
                  ? 'Можно запускать новый анализ и готовить следующую версию.'
                  : draftTrkTablesCount > 0
                    ? 'Проверьте draft ТРК и при необходимости утвердите его.'
                    : calibrationTables.length > 0
                      ? 'Проверьте историю версий и выберите таблицу для применения.'
                      : 'Сначала выполните анализ или расчет таблицы.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Активная версия</p>
                {activeTable && (
                  <Badge variant="outline" className={activeSourceMeta.className}>
                    {activeSourceMeta.label}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {activeTable ? `v${activeTable.version}` : '—'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {activeTable
                  ? `Применена ${formatDateTime(activeTable.applied_at || activeTable.updated_at)}`
                  : 'Активная таблица пока не выбрана.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locationContextLabel}
              </p>
              {activeTable?.statistics && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Точек: {activeTable.statistics.data_points_used}, R²: {activeTable.statistics.r_squared?.toFixed(3) ?? '—'}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Последний draft ТРК</p>
                {latestDraftTrkTable && (
                  <Badge variant="outline" className={latestDraftSourceMeta.className}>
                    {latestDraftSourceMeta.label}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {latestDraftTrkTable ? `v${latestDraftTrkTable.version}` : '—'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {latestDraftTrkTable
                  ? `Статус: ${getStatusLabel(latestDraftTrkTable.status)}`
                  : 'Draft ТРК еще не создавался.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locationContextLabel}
              </p>
              {latestDraftTrkTable?.comparison_with_previous?.has_previous && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Макс. изменение к прошлой версии: {latestDraftTrkTable.comparison_with_previous.max_difference_percent?.toFixed(2) ?? '—'}%
                </p>
              )}
              {latestDraftTrkTable?.status === 'draft' && (
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  onClick={handleQuickApprove}
                  disabled={summaryActionInProgress === latestDraftTrkTable.id}
                >
                  {summaryActionInProgress === latestDraftTrkTable.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Утверждение...
                    </>
                  ) : (
                    'Утвердить draft'
                  )}
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Готово к применению</p>
                {latestApprovedInactiveTable && (
                  <Badge variant="outline" className={latestApprovedSourceMeta.className}>
                    {latestApprovedSourceMeta.label}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {latestApprovedInactiveTable ? `v${latestApprovedInactiveTable.version}` : '—'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {latestApprovedInactiveTable
                  ? `Утверждена ${formatDateTime(latestApprovedInactiveTable.approved_at || latestApprovedInactiveTable.updated_at)}`
                  : 'Нет утвержденной версии, ожидающей применения.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {locationContextLabel}
              </p>
              {latestApprovedInactiveTable?.statistics && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Точек: {latestApprovedInactiveTable.statistics.data_points_used}, R²: {latestApprovedInactiveTable.statistics.r_squared?.toFixed(3) ?? '—'}
                </p>
              )}
              {latestApprovedInactiveTable && (
                <Button
                  variant="outline"
                  className="mt-3 w-full"
                  size="sm"
                  onClick={() => setConfirmApplyTableId(latestApprovedInactiveTable.id)}
                  disabled={summaryActionInProgress === latestApprovedInactiveTable.id}
                >
                  {summaryActionInProgress === latestApprovedInactiveTable.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Применение...
                    </>
                  ) : (
                    'Применить версию'
                  )}
                </Button>
              )}
            </div>
          </div>

          {summaryActionFeedback && (
            <div className={`rounded-md border p-3 text-sm ${
              summaryActionFeedback.type === 'success'
                ? 'border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300'
                : 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}>
              {summaryActionFeedback.text}
            </div>
          )}

          {readyToApplyComparison && activeTable && latestApprovedInactiveTable && (
            <div className={`rounded-lg border p-4 ${
              readyToApplyComparison.status === 'safe'
                ? 'border-green-500/20 bg-green-500/10'
                : readyToApplyComparison.status === 'attention'
                  ? 'border-yellow-500/20 bg-yellow-500/10'
                  : 'border-red-500/20 bg-red-500/10'
            }`}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Сравнение активной v{activeTable.version} и готовой v{latestApprovedInactiveTable.version}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Перед применением видно, насколько новая утвержденная версия отличается от текущей рабочей таблицы.
                  </p>
                </div>
                <Badge variant="outline" className={
                  readyToApplyComparison.status === 'safe'
                    ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                    : readyToApplyComparison.status === 'attention'
                      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                }>
                  {readyToApplyComparison.status === 'safe'
                    ? 'Изменения умеренные'
                    : readyToApplyComparison.status === 'attention'
                      ? 'Нужна проверка'
                      : 'Высокое расхождение'}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Среднее расхождение</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {readyToApplyComparison.averageAbsLiters.toFixed(1)} л
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Макс. расхождение</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {readyToApplyComparison.maxAbsLiters.toFixed(1)} л
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Среднее расхождение %</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {readyToApplyComparison.averageAbsPercent.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Значимых точек</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {readyToApplyComparison.changedPoints}/{readyToApplyComparison.comparedPoints}
                  </p>
                </div>
              </div>

              {readyToApplyChart && (
                <div className="mt-3 rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-foreground">
                      Где новая версия уходит от активной
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {readyToApplyComparison.averageSignedLiters >= 0 ? 'Новая версия в среднем выше' : 'Новая версия в среднем ниже'}
                    </p>
                  </div>
                  <svg
                    viewBox={`0 0 ${readyToApplyChart.width} ${readyToApplyChart.height}`}
                    className="mt-3 h-28 w-full"
                    role="img"
                    aria-label="Мини-график расхождения по уровням"
                  >
                    <line
                      x1="10"
                      y1={readyToApplyChart.zeroY}
                      x2={readyToApplyChart.width - 10}
                      y2={readyToApplyChart.zeroY}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      opacity="0.45"
                    />
                    <line
                      x1={readyToApplyChart.width / 3}
                      y1="10"
                      x2={readyToApplyChart.width / 3}
                      y2={readyToApplyChart.height - 10}
                      stroke="hsl(var(--border))"
                    />
                    <line
                      x1={(readyToApplyChart.width / 3) * 2}
                      y1="10"
                      x2={(readyToApplyChart.width / 3) * 2}
                      y2={readyToApplyChart.height - 10}
                      stroke="hsl(var(--border))"
                    />
                    <polyline
                      fill="none"
                      stroke={readyToApplyComparison.status === 'review_required' ? '#ef4444' : readyToApplyComparison.status === 'attention' ? '#f59e0b' : '#22c55e'}
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={readyToApplyChart.polyline}
                    />
                    <circle
                      cx={readyToApplyChart.maxPoint.x}
                      cy={readyToApplyChart.maxPoint.y}
                      r="4"
                      fill="#2563eb"
                    />
                  </svg>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md border border-border px-2 py-1.5 text-center">
                      <p className="text-muted-foreground">Низ</p>
                      <p className="font-semibold text-foreground">{readyToApplyComparison.zones.low.toFixed(1)} л</p>
                    </div>
                    <div className="rounded-md border border-border px-2 py-1.5 text-center">
                      <p className="text-muted-foreground">Середина</p>
                      <p className="font-semibold text-foreground">{readyToApplyComparison.zones.middle.toFixed(1)} л</p>
                    </div>
                    <div className="rounded-md border border-border px-2 py-1.5 text-center">
                      <p className="text-muted-foreground">Верх</p>
                      <p className="font-semibold text-foreground">{readyToApplyComparison.zones.high.toFixed(1)} л</p>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-muted-foreground">
                Порог значимого изменения: {readyToApplyComparison.litersThreshold.toFixed(0)} л или {readyToApplyComparison.percentThreshold.toFixed(2)}%.
                {typeof readyToApplyComparison.maxDifferenceLevel === 'number' && ` Максимум на уровне ${readyToApplyComparison.maxDifferenceLevel} мм.`}
              </p>
              <div className="mt-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenDetailedComparison}
                >
                  Открыть подробное сравнение
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              onClick={() => setShowAnalysisDialog(true)}
              className="md:min-w-56"
            >
              <LineChart className="w-4 h-4 mr-2" />
              Анализ калибровки
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCalculationDialog(true)}
              className="md:min-w-56"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Расчет таблицы
            </Button>
            <div className="flex items-center text-xs text-muted-foreground">
              {isTablesLoading ? 'Загружаем историю версий...' : 'История и сводка обновляются после сохранения и применения таблиц.'}
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={historySectionRef}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Версии калибровки
          </CardTitle>
          <CardDescription>
            Baseline датчика, draft ТРК и примененные версии в одном месте.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CalibrationTablesHistory
            tankId={tankId}
            refreshKey={historyRefreshKey}
            onChanged={handleTablesChanged}
            highlightedTableId={highlightedTableId}
          />
        </CardContent>
      </Card>
      </div>

      <Separator />

      {/* Табы с параметрами */}
      <Tabs defaultValue="equipment" className="w-full">
        <TabsList className="flex flex-wrap gap-1 w-full h-auto p-1 mb-4 md:grid md:grid-cols-6">
          <TabsTrigger value="equipment" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Оборудование</span>
          </TabsTrigger>
          <TabsTrigger value="accuracy" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Погрешности</span>
          </TabsTrigger>
          <TabsTrigger value="temperature" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <Thermometer className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Температура</span>
          </TabsTrigger>
          <TabsTrigger value="losses" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <Droplets className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Потери</span>
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Время</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-1 min-h-[40px] flex-1 min-w-[60px]">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Пороги</span>
          </TabsTrigger>
        </TabsList>

        {/* Контейнер с фиксированной высотой и прокруткой */}
        <div className="h-[520px] overflow-y-auto">
          {/* Погрешности оборудования */}
          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Характеристики резервуара и оборудования
                </CardTitle>
                <CardDescription>
                  Физические характеристики резервуара, геометрические параметры и тип датчика уровня
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tank_shape_type">Тип резервуара по форме</Label>
                    <Select
                      value={settings.tank_shape_type}
                      onValueChange={(value: TankShapeType) => updateSetting('tank_shape_type', value)}
                    >
                      <SelectTrigger id="tank_shape_type">
                        <SelectValue placeholder="Выберите тип резервуара" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal_cylinder">Горизонтальный цилиндрический</SelectItem>
                        <SelectItem value="vertical_cylinder">Вертикальный цилиндрический</SelectItem>
                        <SelectItem value="spherical">Сферический (СУГ)</SelectItem>
                        <SelectItem value="rectangular">Прямоугольный</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Форма резервуара влияет на расчёт калибровочной таблицы
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tank_location_type">Расположение резервуара</Label>
                    <Select
                      value={settings.tank_location_type}
                      onValueChange={(value: TankLocationType) => updateSetting('tank_location_type', value)}
                    >
                      <SelectTrigger id="tank_location_type">
                        <SelectValue placeholder="Выберите расположение" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="underground">🔽 Подземный</SelectItem>
                        <SelectItem value="surface">🔼 Наземный</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Влияет на температурный режим и условия эксплуатации
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nozzles_count">Количество пистолетов (ТРК)</Label>
                    <Input
                      id="nozzles_count"
                      type="number"
                      min="1"
                      value={settings.nozzles_count || ''}
                      onChange={(e) => handleNumberInput('nozzles_count', e.target.value, true)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Количество раздаточных пистолетов, подключённых к резервуару
                    </p>
                  </div>
                </div>

                {/* Геометрические параметры резервуара */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Диаметр - только для цилиндрических и сферических */}
                  {(settings.tank_shape_type === 'horizontal_cylinder' ||
                    settings.tank_shape_type === 'vertical_cylinder' ||
                    settings.tank_shape_type === 'spherical') && (
                      <div className="space-y-2">
                        <Label htmlFor="tank_diameter_mm">Диаметр резервуара (мм)</Label>
                        <Input
                          id="tank_diameter_mm"
                          type="number"
                          min="1000"
                          value={settings.tank_diameter_mm || ''}
                          onChange={(e) => handleNumberInput('tank_diameter_mm', e.target.value, true)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Внутренний диаметр резервуара. Типовые: 2500, 2600, 3000 мм
                        </p>
                      </div>
                    )}

                  {/* Длина - для горизонтальных цилиндров и прямоугольных */}
                  {(settings.tank_shape_type === 'horizontal_cylinder' ||
                    settings.tank_shape_type === 'rectangular') && (
                      <div className="space-y-2">
                        <Label htmlFor="tank_length_mm">Длина резервуара (мм)</Label>
                        <Input
                          id="tank_length_mm"
                          type="number"
                          min="1000"
                          value={settings.tank_length_mm || ''}
                          onChange={(e) => handleNumberInput('tank_length_mm', e.target.value, true)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Длина резервуара. Типовые: 6300, 7800 мм
                        </p>
                      </div>
                    )}

                  {/* Ширина - только для прямоугольных */}
                  {settings.tank_shape_type === 'rectangular' && (
                    <div className="space-y-2">
                      <Label htmlFor="tank_width_mm">Ширина резервуара (мм)</Label>
                      <Input
                        id="tank_width_mm"
                        type="number"
                        min="1000"
                        value={settings.tank_width_mm || ''}
                        onChange={(e) => handleNumberInput('tank_width_mm', e.target.value, true)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ширина прямоугольного резервуара
                      </p>
                    </div>
                  )}

                  {/* Высота - для вертикальных цилиндров и прямоугольных */}
                  {(settings.tank_shape_type === 'vertical_cylinder' ||
                    settings.tank_shape_type === 'rectangular') && (
                      <div className="space-y-2">
                        <Label htmlFor="tank_height_mm">Высота резервуара (мм)</Label>
                        <Input
                          id="tank_height_mm"
                          type="number"
                          min="1000"
                          value={settings.tank_height_mm || ''}
                          onChange={(e) => handleNumberInput('tank_height_mm', e.target.value, true)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Высота резервуара
                        </p>
                      </div>
                    )}

                  {/* Угол наклона - только для горизонтальных цилиндров */}
                  {settings.tank_shape_type === 'horizontal_cylinder' && (
                    <div className="space-y-2">
                      <Label htmlFor="tank_tilt_angle_degrees">Угол наклона (градусы)</Label>
                      <Input
                        id="tank_tilt_angle_degrees"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={settings.tank_tilt_angle_degrees || ''}
                        onChange={(e) => handleNumberInput('tank_tilt_angle_degrees', e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Угол наклона для слива остатков. Обычно 0-3°
                      </p>
                    </div>
                  )}
                </div>

                {/* Автоматически рассчитанный объем */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-6 w-6 text-primary dark:text-primary/70" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary dark:text-blue-300">Расчетный объем резервуара</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {settings.tank_shape_type === 'horizontal_cylinder' && 'Формула: V = π × (D/2)² × L'}
                        {settings.tank_shape_type === 'vertical_cylinder' && 'Формула: V = π × (D/2)² × H'}
                        {settings.tank_shape_type === 'spherical' && 'Формула: V = (4/3) × π × (D/2)³'}
                        {settings.tank_shape_type === 'rectangular' && 'Формула: V = L × W × H'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">{calculatedVolume.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground">литров</p>
                    </div>
                  </div>
                </div>

                {/* Источник опорной точки */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground/80">Алгоритм калибровки</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference_source">Источник опорной точки</Label>
                      <Select
                        value={settings.reference_source || 'geometry'}
                        onValueChange={(value: any) => updateSetting('reference_source', value)}
                      >
                        <SelectTrigger id="reference_source">
                          <SelectValue placeholder="Выберите источник" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="geometry">📐 Геометрия (по размерам)</SelectItem>
                          <SelectItem value="current_table">📊 Текущая таблица (плавный переход)</SelectItem>
                          <SelectItem value="manual">✍️ Вручную (метрошток)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Откуда брать объем для верхней точки заполнения
                      </p>
                    </div>

                    {settings.reference_source === 'manual' && (
                      <div className="space-y-2">
                        <Label htmlFor="manual_reference_volume">Объем опорной точки (л)</Label>
                        <Input
                          id="manual_reference_volume"
                          type="number"
                          min="0"
                          value={settings.manual_reference_volume || ''}
                          onChange={(e) => handleNumberInput('manual_reference_volume', e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          Введите точный объем при максимальном заполнении
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Тип датчика уровня */}
                <div className="space-y-2">
                  <Label htmlFor="level_sensor_type">Тип датчика уровня</Label>
                  <Select
                    value={settings.level_sensor_type}
                    onValueChange={handleSensorTypeChange}
                  >
                    <SelectTrigger id="level_sensor_type">
                      <SelectValue placeholder="Выберите тип датчика" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="radar">Радарный (±1мм)</SelectItem>
                      <SelectItem value="float">Поплавковый (±1мм)</SelectItem>
                      <SelectItem value="capacitive">Емкостной (±3мм)</SelectItem>
                      <SelectItem value="hydrostatic">Гидростатический (±3мм)</SelectItem>
                      <SelectItem value="other">Другой</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Для каждого типа доступны рекомендуемые погрешности на основе ГОСТ и данных производителей (раздел "Погрешности")
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Погрешности измерительного оборудования */}
          <TabsContent value="accuracy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Погрешности измерительного оборудования
                </CardTitle>
                <CardDescription>
                  Метрологические параметры ТРК и датчиков уровня по ГОСТ Р 8.579-2001
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Информационный badge с текущими настройками */}
                <div className="bg-card/50 border border-border rounded-lg p-3 flex items-center justify-between gap-4">
                  <p className="text-sm text-foreground/80">
                    <span className="font-semibold">Текущий датчик:</span> {getSensorAccuracyHint()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyRecommendedAccuracy}
                    className="shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Применить рекомендуемые
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dispensers_error_percent">Погрешность ТРК (%)</Label>
                    <Input
                      id="dispensers_error_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={settings.dispensers_error_percent || ''}
                      onChange={(e) => handleNumberInput('dispensers_error_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {getDispenserAccuracyHint()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level_sensor_error_percent">Погрешность уровнемера (%)</Label>
                    <Input
                      id="level_sensor_error_percent"
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={settings.level_sensor_error_percent || ''}
                      onChange={(e) => handleNumberInput('level_sensor_error_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Можно указать свое значение или применить рекомендуемое для выбранного типа датчика
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level_sensor_accuracy_mm">Точность уровнемера (мм)</Label>
                    <Input
                      id="level_sensor_accuracy_mm"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={settings.level_sensor_accuracy_mm || ''}
                      onChange={(e) => handleNumberInput('level_sensor_accuracy_mm', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Коммерческий учет: ±3мм (ГОСТ), высокоточные радарные: ±1мм
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bias_offset_percent">Колебание (%)</Label>
                    <Input
                      id="bias_offset_percent"
                      type="number"
                      step="0.001"
                      value={settings.bias_offset_percent || ''}
                      onChange={(e) => handleNumberInput('bias_offset_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Допустимое колебание показаний для фильтрации выбросов (может быть отрицательным, точность до 0.001%)
                    </p>
                  </div>
                </div>

                {/* Метод интерполяции */}
                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="calibration_method">Метод интерполяции</Label>
                  <Select
                    value={settings.calibration_method}
                    onValueChange={(value) => updateSetting('calibration_method', value as CalibrationMethod)}
                  >
                    <SelectTrigger id="calibration_method">
                      <SelectValue placeholder="Выберите метод" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct_interpolation">Прямая интерполяция (рекомендуется)</SelectItem>
                      <SelectItem value="least_squares">МНК — кубическая регрессия</SelectItem>
                      <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {settings.calibration_method === 'least_squares' && 'Квадратичная аппроксимация (y=ax²+bx+c). Хорошо описывает S-кривую цилиндра, рекомендуется для коммерческого учёта.'}
                    {settings.calibration_method === 'moving_average' && 'Сглаживает колебания усреднением. Устойчив к выбросам, хорош для зашумлённых данных.'}
                    {settings.calibration_method === 'direct_interpolation' && 'Кусочно-линейная интерполяция между реальными точками. Максимальная точность при качественных данных.'}
                  </p>
                </div>

                {/* Шаг калибровки */}
                <div className="space-y-2">
                  <Label htmlFor="calibration_step_mm">Шаг калибровки (мм)</Label>
                  <Input
                    id="calibration_step_mm"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={settings.calibration_step_mm || ''}
                    onChange={(e) => handleNumberInput('calibration_step_mm', e.target.value, true)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Шаг уровня для генерации строк таблицы. Меньший шаг = больше точек и выше точность. Типовые: 5, 10, 20 мм.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Температурные параметры */}
          <TabsContent value="temperature" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="h-5 w-5" />
                  Температурные параметры
                </CardTitle>
                <CardDescription>
                  Коэффициенты теплового расширения топлива
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">Тип топлива</Label>
                    <Select
                      value={settings.fuel_type}
                      onValueChange={(value) => handleFuelTypeChange(value as CalibrationFuelType)}
                    >
                      <SelectTrigger id="fuel_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasoline">Бензин</SelectItem>
                        <SelectItem value="diesel">Дизельное топливо</SelectItem>
                        <SelectItem value="propane">Пропан (СУГ)</SelectItem>
                        <SelectItem value="gas">Газ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thermal_expansion_coefficient">Коэффициент расширения (1/°C)</Label>
                    <Input
                      id="thermal_expansion_coefficient"
                      type="number"
                      step="0.0001"
                      value={settings.thermal_expansion_coefficient || ''}
                      onChange={(e) => handleNumberInput('thermal_expansion_coefficient', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      АИ-92/95: 0.00083, ДТ: 0.00074, Пропан: 0.003, Керосин: 0.001
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_temperature">Базовая температура (°C)</Label>
                    <Input
                      id="base_temperature"
                      type="number"
                      value={settings.base_temperature || ''}
                      onChange={(e) => handleNumberInput('base_temperature', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Обычно 15°C или 20°C
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp_gradient_liters_per_degree">Градиент (л/°C)</Label>
                    <Input
                      id="temp_gradient_liters_per_degree"
                      type="text"
                      value={calculatedGradient}
                      readOnly
                      className="bg-card cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Автоматический расчет: {tankCapacity} л × {settings.thermal_expansion_coefficient}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="working_temp_min">Мин. температура (°C)</Label>
                    <Input
                      id="working_temp_min"
                      type="number"
                      value={settings.working_temp_min || ''}
                      onChange={(e) => handleNumberInput('working_temp_min', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="working_temp_max">Макс. температура (°C)</Label>
                    <Input
                      id="working_temp_max"
                      type="number"
                      value={settings.working_temp_max || ''}
                      onChange={(e) => handleNumberInput('working_temp_max', e.target.value)}
                    />
                  </div>
                </div>

                {/* Теплоизоляция */}
                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-card/30">
                  <div className="space-y-1">
                    <Label htmlFor="has_thermal_insulation" className="text-base font-medium">
                      Наличие теплоизоляции
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Улучшает стабильность температуры, снижает суточные колебания и влияние внешних факторов
                    </p>
                  </div>
                  <Switch
                    id="has_thermal_insulation"
                    checked={settings.has_thermal_insulation}
                    onCheckedChange={(checked) => updateSetting('has_thermal_insulation', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Испарение и потери */}
          <TabsContent value="losses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5" />
                  Испарение и естественная убыль
                </CardTitle>
                <CardDescription>
                  Параметры потерь топлива при хранении и отпуске
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="natural_loss_summer_percent">Убыль летом (%)</Label>
                    <Input
                      id="natural_loss_summer_percent"
                      type="number"
                      step="0.1"
                      value={settings.natural_loss_summer_percent || ''}
                      onChange={(e) => handleNumberInput('natural_loss_summer_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Весенне-летний (01.04-30.09): Бензин 0.08%, ДТ 0.05%, Пропан ~0.12% (Приказ № 281)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="natural_loss_winter_percent">Убыль зимой (%)</Label>
                    <Input
                      id="natural_loss_winter_percent"
                      type="number"
                      step="0.1"
                      value={settings.natural_loss_winter_percent || ''}
                      onChange={(e) => handleNumberInput('natural_loss_winter_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Осенне-зимний (01.10-31.03): Бензин 0.03%, ДТ 0.02%, Пропан ~0.74% (Приказ № 281)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discharge_loss_percent">Потери при сливе (%)</Label>
                    <Input
                      id="discharge_loss_percent"
                      type="number"
                      step="0.01"
                      value={settings.discharge_loss_percent || ''}
                      onChange={(e) => handleNumberInput('discharge_loss_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Обычно 0.1-0.2%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Временные параметры */}
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Временные интервалы
                </CardTitle>
                <CardDescription>
                  Периоды усреднения и анализа данных
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_polling_interval_minutes">Интервал получения данных (мин)</Label>
                    <Input
                      id="data_polling_interval_minutes"
                      type="number"
                      value={settings.data_polling_interval_minutes || ''}
                      onChange={(e) => handleNumberInput('data_polling_interval_minutes', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Частота опроса остатков резервуара (5, 10, 15 минут)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="averaging_period_minutes">Период усреднения (мин)</Label>
                    <Input
                      id="averaging_period_minutes"
                      type="number"
                      value={settings.averaging_period_minutes || ''}
                      onChange={(e) => handleNumberInput('averaging_period_minutes', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Интервал усреднения показаний датчика (15, 30, 60 минут)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tank_rest_time_minutes">Время покоя резервуара (мин)</Label>
                    <Input
                      id="tank_rest_time_minutes"
                      type="number"
                      value={settings.tank_rest_time_minutes || ''}
                      onChange={(e) => handleNumberInput('tank_rest_time_minutes', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Время стабилизации после приёма/отпуска топлива (обычно 30 мин)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Пороговые значения */}
          <TabsContent value="thresholds" className="space-y-4">
            {/* Пороговые уведомления */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Пороги уведомлений
                </CardTitle>
                <CardDescription>
                  Настройка уровней для автоматических уведомлений (как на странице Оборудование)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_level_warning_percent">Порог предупреждения (%)</Label>
                    <Input
                      id="fuel_level_warning_percent"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.fuel_level_warning_percent || ''}
                      onChange={(e) => handleNumberInput('fuel_level_warning_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Уведомление при уровне ≤ указанного %
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_level_critical_percent">Критический порог (%)</Label>
                    <Input
                      id="fuel_level_critical_percent"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.fuel_level_critical_percent || ''}
                      onChange={(e) => handleNumberInput('fuel_level_critical_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Критическое уведомление при уровне ≤ указанного %
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_level_max_percent">🔼 Максимальный уровень (%)</Label>
                    <Input
                      id="fuel_level_max_percent"
                      type="number"
                      min="80"
                      max="100"
                      value={settings.fuel_level_max_percent || ''}
                      onChange={(e) => handleNumberInput('fuel_level_max_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Бензин/ДТ: 95%, Пропан (СУГ): 85% - безопасность заполнения
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Мёртвый остаток и зоны датчика */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5" />
                  Мёртвый остаток и зоны измерений
                </CardTitle>
                <CardDescription>
                  Технический остаток и мёртвые зоны датчика уровня (ГОСТ 8.346-2000)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dead_stock_liters">Мёртвый остаток (л)</Label>
                    <Input
                      id="dead_stock_liters"
                      type="number"
                      min="0"
                      value={settings.dead_stock_liters || ''}
                      onChange={(e) => handleNumberInput('dead_stock_liters', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Объём под заливной трубой, не откачиваемый (для 25 м³: ~1500 л)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dead_stock_percent">Мёртвый остаток (%)</Label>
                    <Input
                      id="dead_stock_percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.dead_stock_percent || ''}
                      onChange={(e) => handleNumberInput('dead_stock_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Обычно 0-6% от объёма резервуара
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sensor_blind_zone_bottom_mm">Мёртвая зона снизу (мм)</Label>
                    <Input
                      id="sensor_blind_zone_bottom_mm"
                      type="number"
                      min="0"
                      value={settings.sensor_blind_zone_bottom_mm || ''}
                      onChange={(e) => handleNumberInput('sensor_blind_zone_bottom_mm', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Зона где датчик не работает (снизу), обычно 100-200 мм
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sensor_blind_zone_top_mm">Мёртвая зона сверху (мм)</Label>
                    <Input
                      id="sensor_blind_zone_top_mm"
                      type="number"
                      min="0"
                      value={settings.sensor_blind_zone_top_mm || ''}
                      onChange={(e) => handleNumberInput('sensor_blind_zone_top_mm', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Зона где датчик не работает (сверху), обычно 100-200 мм
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="critical_water_level_mm">Критический уровень воды (мм)</Label>
                    <Input
                      id="critical_water_level_mm"
                      type="number"
                      min="0"
                      value={settings.critical_water_level_mm || ''}
                      onChange={(e) => handleNumberInput('critical_water_level_mm', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      При превышении требуется откачка, обычно 30-50 мм
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Пороговые значения мониторинга */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Пороги мониторинга работы резервуара
                </CardTitle>
                <CardDescription>
                  Допустимые отклонения при работе. При нарушении система сигнализирует о необходимости калибровки
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_change_for_calibration_liters">Мин. изменение для калибровки (л)</Label>
                    <Input
                      id="min_change_for_calibration_liters"
                      type="number"
                      value={settings.min_change_for_calibration_liters || ''}
                      onChange={(e) => handleNumberInput('min_change_for_calibration_liters', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Минимальное изменение объёма для учёта в калибровке
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_acceptable_deviation_percent">Макс. допустимое расхождение (%)</Label>
                    <Input
                      id="max_acceptable_deviation_percent"
                      type="number"
                      step="0.1"
                      value={settings.max_acceptable_deviation_percent || ''}
                      onChange={(e) => handleNumberInput('max_acceptable_deviation_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Максимально допустимое расхождение от калибровки
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_acceptable_deviation_liters">Макс. допустимое расхождение (л)</Label>
                    <Input
                      id="max_acceptable_deviation_liters"
                      type="number"
                      value={settings.max_acceptable_deviation_liters || ''}
                      onChange={(e) => handleNumberInput('max_acceptable_deviation_liters', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Максимально допустимое расхождение в литрах
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="critical_error_threshold_percent">Критическая ошибка (%)</Label>
                    <Input
                      id="critical_error_threshold_percent"
                      type="number"
                      step="0.1"
                      value={settings.critical_error_threshold_percent || ''}
                      onChange={(e) => handleNumberInput('critical_error_threshold_percent', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      При превышении требуется ручная проверка калибровки
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Сбросить
        </Button>

        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Сохранено</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Ошибка</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Модальное окно расчета таблицы */}
      <CalculationDialog
        open={showCalculationDialog}
        onOpenChange={setShowCalculationDialog}
        tankId={tankId}
        tankName={tankName}
        fuelType={fuelType}
        networkName={networkName}
        stationName={stationName}
        settings={settings}
        updateSetting={updateSetting}
        handleNumberInput={handleNumberInput}
        onTableSaved={handleTablesChanged}
      />

      {/* Модальное окно анализа калибровки */}
      <AnalysisDialog
        open={showAnalysisDialog}
        onOpenChange={setShowAnalysisDialog}
        tankId={tankId}
        tankName={tankName}
        fuelType={fuelType}
        networkName={networkName}
        stationName={stationName}
        settings={settings}
        updateSetting={updateSetting}
        handleNumberInput={handleNumberInput}
        onTableSaved={handleTablesChanged}
      />
    </div>
  );
}
