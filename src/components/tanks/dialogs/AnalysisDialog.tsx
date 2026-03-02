/**
 * Диалог анализа калибровки резервуара
 * Извлечено из TankCalibrationSettings.tsx
 */

import { useState } from 'react';
import type {
  TankCalibrationSettings as CalibrationSettings,
  CalibrationMethod,
  CalculateCalibrationTableResult,
  ReceiptItem
} from '@/types/tanks';
import { getCalibrationTables } from '@/services/calibrationTableService';
import {
  calculateCalibrationTable as runCalibrationAlgorithm,
  buildCurrentCalibrationTable,
  buildGeometricCalibrationTable
} from '@/utils/calibrationAlgorithm';
import { getTankHistory } from '@/services/tankHistoryService';
import { getTransactions, getReceipts } from '@/services/tankBookService';
import { interpolateVolume } from '@/utils/calibrationHelpers';
import { useSelection } from '@/contexts/SelectionContext';
import { Card, CardContent, CardTitle, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Clock,
  AlertTriangle,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  FileSpreadsheet,
  LineChart
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from 'recharts';

// Интерфейс для результата сравнения калибровочных таблиц
interface CalibrationComparison {
  level_mm: number;
  current_volume: number | undefined;
  calculated_volume: number;
  trk_volume: number | undefined;
  difference: number;
  difference_percent: number;
}

// Интерфейс для валидации через ТРК
interface TRKValidationPoint {
  timestamp: string;
  level_before_mm: number;
  level_after_mm: number;
  volume_by_sensor: number;
  volume_by_trk: number;
  deviation: number;
  deviation_percent: number;
  nozzle: number;
}

interface AnalysisResult extends CalculateCalibrationTableResult {
  comparison?: CalibrationComparison[];
  current_table_version?: number;
  statistics?: {
    max_difference: number;
    avg_difference: number;
    max_difference_percent: number;
    avg_difference_percent: number;
  };
  trk_validation?: TRKValidationPoint[];
}

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tankId: string;
  settings: CalibrationSettings;
  updateSetting: <K extends keyof CalibrationSettings>(key: K, value: CalibrationSettings[K]) => void;
  handleNumberInput: (key: keyof CalibrationSettings, value: string, isInteger?: boolean) => void;
}

/**
 * Валидация калибровки через ТРК (независимый эталон)
 */
function validateCalibrationByTRK(
  tankHistory: Array<{ dt: string; level: string; volume: string; number: number }>,
  transactions: Array<{ dt?: string; tank: number; nozzle: number; quantity: string | number }>,
  tankNumber: number,
  currentCalibrationMap: Map<number, number>,
  pollingIntervalMinutes: number = 10
): TRKValidationPoint[] {
  const validationPoints: TRKValidationPoint[] = [];

  const searchWindowMinutes = pollingIntervalMinutes * 3;

  const sortedHistory = [...tankHistory].sort((a, b) =>
    new Date(a.dt).getTime() - new Date(b.dt).getTime()
  );

  const tankTransactions = transactions
    .filter(t => t.tank === tankNumber && t.dt)
    .sort((a, b) => new Date(a.dt!).getTime() - new Date(b.dt!).getTime());

  for (let i = 0; i < sortedHistory.length - 1; i++) {
    const recordBefore = sortedHistory[i];
    const recordAfter = sortedHistory[i + 1];

    const timeBefore = new Date(recordBefore.dt).getTime();
    const timeAfter = new Date(recordAfter.dt).getTime();
    const intervalMinutes = (timeAfter - timeBefore) / (1000 * 60);

    if (intervalMinutes > searchWindowMinutes) continue;

    const transactionsInInterval = tankTransactions.filter(t => {
      const transactionTime = new Date(t.dt!).getTime();
      return transactionTime > timeBefore && transactionTime < timeAfter;
    });

    if (transactionsInInterval.length === 0) continue;

    let totalVolumeTRK = 0;
    const nozzlesUsed = new Set<number>();

    for (const transaction of transactionsInInterval) {
      const volumeTRK = typeof transaction.quantity === 'string'
        ? parseFloat(transaction.quantity)
        : transaction.quantity;

      if (!isNaN(volumeTRK) && volumeTRK > 0) {
        totalVolumeTRK += volumeTRK;
        nozzlesUsed.add(transaction.nozzle);
      }
    }

    if (totalVolumeTRK <= 0) continue;

    const levelBefore = parseFloat(recordBefore.level) * 10;
    const levelAfter = parseFloat(recordAfter.level) * 10;

    if (isNaN(levelBefore) || isNaN(levelAfter)) continue;
    if (levelBefore <= levelAfter) continue;

    const volumeBefore = interpolateVolume(levelBefore, currentCalibrationMap);
    const volumeAfter = interpolateVolume(levelAfter, currentCalibrationMap);

    if (volumeBefore === null || volumeAfter === null) continue;

    const volumeBySensor = volumeBefore - volumeAfter;
    const deviation = volumeBySensor - totalVolumeTRK;
    const deviationPercent = totalVolumeTRK > 0 ? (deviation / totalVolumeTRK) * 100 : 0;

    const middleTimestamp = new Date((timeBefore + timeAfter) / 2).toISOString();

    validationPoints.push({
      timestamp: middleTimestamp,
      level_before_mm: Math.round(levelBefore),
      level_after_mm: Math.round(levelAfter),
      volume_by_sensor: volumeBySensor,
      volume_by_trk: totalVolumeTRK,
      deviation,
      deviation_percent: deviationPercent,
      nozzle: nozzlesUsed.size > 1 ? -1 : Array.from(nozzlesUsed)[0]
    });
  }

  return validationPoints;
}

export function AnalysisDialog({
  open,
  onOpenChange,
  tankId,
  settings,
  updateSetting,
  handleNumberInput
}: AnalysisDialogProps) {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [analysisStartDate, setAnalysisStartDate] = useState('');
  const [analysisEndDate, setAnalysisEndDate] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleAnalysis = async () => {
    if (!analysisStartDate || !analysisEndDate) {
      setAnalysisResult({
        success: false,
        error: 'Необходимо указать начальную и конечную дату периода анализа',
      });
      return;
    }

    if (new Date(analysisStartDate) > new Date(analysisEndDate)) {
      setAnalysisResult({
        success: false,
        error: 'Начальная дата не может быть позже конечной',
      });
      return;
    }

    if (!selectedNetwork || !selectedTradingPoint) {
      setAnalysisResult({
        success: false,
        error: 'Необходимо выбрать сеть и торговую точку',
      });
      return;
    }

    let tradingPointExternalId: string | null = null;
    try {
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      tradingPointExternalId = tradingPoint?.external_id || null;
    } catch (err) {
      setAnalysisResult({
        success: false,
        error: 'Ошибка загрузки данных торговой точки',
      });
      return;
    }

    if (!selectedNetwork.external_id || !tradingPointExternalId) {
      setAnalysisResult({
        success: false,
        error: `У выбранной сети или торговой точки отсутствует external_id для API запросов. Network ID: ${selectedNetwork.external_id}, Station ID: ${tradingPointExternalId}`,
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // 1. Получаем текущую активную калибровочную таблицу (если есть)
      let activeTable;
      try {
        const currentTables = await getCalibrationTables(tankId);
        activeTable = currentTables.find(t => t.is_active && t.status === 'applied');
      } catch (error) {
        activeTable = undefined;
      }

      // 2. Получаем историю резервуара за период (фильтрация по tank на стороне STS API)
      const tankNumber = parseInt(tankId, 10);
      const historyParams = {
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        tank: tankNumber,
        dt_beg: `${analysisStartDate} 00:00:00`,
        dt_end: `${analysisEndDate} 23:59:59`
      };

      const tankHistory = await getTankHistory(historyParams);

      if (tankHistory.length === 0) {
        throw new Error('Нет данных истории резервуара за выбранный период');
      }

      // 3. Получаем транзакции (отпуски ТРК) за период
      const transactionsResponse = await getTransactions({
        system: selectedNetwork.external_id,
        station: tradingPointExternalId,
        dt_beg: `${analysisStartDate} 00:00:00`,
        dt_end: `${analysisEndDate} 23:59:59`
      });

      const transactions = transactionsResponse.items || [];

      // 3.1 Получаем поступления (receipts) за период
      let receipts: ReceiptItem[] = [];
      try {
        const receiptsResponse = await getReceipts({
          system: selectedNetwork.external_id,
          station: tradingPointExternalId,
          dt_beg: `${analysisStartDate} 00:00:00`,
          dt_end: `${analysisEndDate} 23:59:59`
        });
        receipts = receiptsResponse.shifts?.flatMap(shift => shift.receipt || []) || [];
      } catch {
        // Если не удалось получить поступления - продолжаем без них
      }

      // 4. Строим ГЕОМЕТРИЧЕСКУЮ (эталонную) калибровочную таблицу
      const geometricTableResult = buildGeometricCalibrationTable(settings);

      // 5. Строим ТЕКУЩУЮ калибровочную таблицу из показаний API датчика
      const currentTableResult = buildCurrentCalibrationTable(tankHistory, settings);

      // 6. Строим РАССЧИТАННУЮ калибровочную таблицу на основе транзакций ТРК и поступлений
      const calculatedTableResult = runCalibrationAlgorithm(
        tankHistory,
        transactions,
        settings,
        tankNumber,
        receipts,
        activeTable?.table
      );

      // 7. Сравниваем ГЕОМЕТРИЧЕСКУЮ (эталон) с ТЕКУЩЕЙ (датчик)
      let comparison: CalibrationComparison[] | undefined;
      let statistics: AnalysisResult['statistics'] | undefined;

      if (geometricTableResult.table.length > 0 && currentTableResult.table.length > 0) {
        comparison = [];
        let totalDiff = 0;
        let totalDiffPercent = 0;
        let maxDiff = 0;
        let maxDiffPercent = 0;

        const geometricMap = new Map(
          geometricTableResult.table.map(point => [point.level_mm, point.volume_liters])
        );
        const currentMap = new Map(
          currentTableResult.table.map(point => [point.level_mm, point.volume_liters])
        );
        const calculatedMap = new Map(
          calculatedTableResult.table.map(point => [point.level_mm, point.volume_liters])
        );

        const levelsToCompare = geometricTableResult.table.map(p => p.level_mm);

        for (const level_mm of levelsToCompare) {
          const geometric_volume = geometricMap.get(level_mm) || 0;

          let current_volume: number | null = null;
          const sortedCurrentLevels = Array.from(currentMap.keys()).sort((a, b) => a - b);
          const minHistoricalLevel = sortedCurrentLevels[0];
          const maxHistoricalLevel = sortedCurrentLevels[sortedCurrentLevels.length - 1];

          if (level_mm >= minHistoricalLevel && level_mm <= maxHistoricalLevel) {
            if (currentMap.has(level_mm)) {
              current_volume = currentMap.get(level_mm)!;
            } else {
              for (let i = 0; i < sortedCurrentLevels.length - 1; i++) {
                if (level_mm >= sortedCurrentLevels[i] && level_mm <= sortedCurrentLevels[i + 1]) {
                  const level1 = sortedCurrentLevels[i];
                  const level2 = sortedCurrentLevels[i + 1];
                  const vol1 = currentMap.get(level1)!;
                  const vol2 = currentMap.get(level2)!;
                  const t = (level_mm - level1) / (level2 - level1);
                  current_volume = vol1 + t * (vol2 - vol1);
                  break;
                }
              }
            }
          }

          let trk_volume: number | null = null;
          const sortedCalculatedLevels = Array.from(calculatedMap.keys()).sort((a, b) => a - b);
          const minCalculatedLevel = sortedCalculatedLevels[0];
          const maxCalculatedLevel = sortedCalculatedLevels[sortedCalculatedLevels.length - 1];

          const referenceLevel = calculatedTableResult.diagnostics?.referencePoint?.level_mm ?? maxCalculatedLevel;
          const effectiveMaxLevel = Math.min(maxCalculatedLevel, referenceLevel);

          if (sortedCalculatedLevels.length > 0 && level_mm >= minCalculatedLevel && level_mm <= effectiveMaxLevel) {
            if (calculatedMap.has(level_mm)) {
              trk_volume = calculatedMap.get(level_mm)!;
            } else {
              for (let i = 0; i < sortedCalculatedLevels.length - 1; i++) {
                if (level_mm >= sortedCalculatedLevels[i] && level_mm <= sortedCalculatedLevels[i + 1]) {
                  const level1 = sortedCalculatedLevels[i];
                  const level2 = sortedCalculatedLevels[i + 1];
                  const vol1 = calculatedMap.get(level1)!;
                  const vol2 = calculatedMap.get(level2)!;
                  const t = (level_mm - level1) / (level2 - level1);
                  trk_volume = vol1 + t * (vol2 - vol1);
                  break;
                }
              }
            }
          }

          const difference = current_volume !== null ? geometric_volume - current_volume : 0;
          const differencePercent = current_volume !== null && current_volume > 0
            ? (difference / current_volume) * 100
            : 0;

          comparison.push({
            level_mm: Math.round(level_mm),
            current_volume: current_volume ?? undefined,
            calculated_volume: geometric_volume,
            trk_volume: trk_volume ?? undefined,
            difference,
            difference_percent: differencePercent,
          });

          if (current_volume !== null) {
            totalDiff += Math.abs(difference);
            totalDiffPercent += Math.abs(differencePercent);
            maxDiff = Math.max(maxDiff, Math.abs(difference));
            maxDiffPercent = Math.max(maxDiffPercent, Math.abs(differencePercent));
          }
        }

        if (comparison.length > 0) {
          statistics = {
            max_difference: maxDiff,
            avg_difference: totalDiff / comparison.length,
            max_difference_percent: maxDiffPercent,
            avg_difference_percent: totalDiffPercent / comparison.length,
          };
        }
      }

      // 7. Валидация калибровки через ТРК
      const currentCalibrationMap = new Map(
        currentTableResult.table.map(point => [point.level_mm, point.volume_liters])
      );
      const trkValidation = validateCalibrationByTRK(
        tankHistory,
        transactions,
        tankNumber,
        currentCalibrationMap,
        settings.data_polling_interval_minutes
      );

      // 8. Формируем результат
      setAnalysisResult({
        success: true,
        table: calculatedTableResult.table,
        calibration_id: '',
        data_points_used: calculatedTableResult.data_points_count,
        quality_metrics: calculatedTableResult.quality_metrics,
        comparison,
        current_table_version: activeTable?.version,
        statistics,
        trk_validation: trkValidation,
        diagnostics: calculatedTableResult.diagnostics,
        debug: {
          tankHistoryCount: tankHistory.length,
          transactionsCount: transactions.length,
          currentTablePoints: currentTableResult.data_points_count,
          currentTableFiltered: currentTableResult.filtered_points_count,
          calculatedTablePoints: calculatedTableResult.data_points_count,
          calculatedTableFiltered: calculatedTableResult.filtered_points_count,
          currentTableSize: currentTableResult.table.length,
          calculatedTableSize: calculatedTableResult.table.length,
          comparisonSize: comparison?.length || 0,
          levelRange: {
            min: Math.min(...tankHistory.map(r => parseFloat(r.level))),
            max: Math.max(...tankHistory.map(r => parseFloat(r.level)))
          },
          volumeRange: {
            min: Math.min(...tankHistory.map(r => parseFloat(r.volume))),
            max: Math.max(...tankHistory.map(r => parseFloat(r.volume)))
          },
          stepMm: settings.calibration_step_mm,
          rawComparison: comparison && comparison.length > 0 ? (() => {
            const validPoints = comparison.filter(p => p.current_volume !== undefined && p.current_volume > 0 && p.trk_volume !== undefined && p.trk_volume > 0);
            const step = Math.max(1, Math.floor(validPoints.length / 5));
            return validPoints
              .filter((_, i) => i % step === 0)
              .filter(p => p.current_volume !== undefined && p.trk_volume !== undefined)
              .slice(0, 5)
              .map(p => ({
                level: p.level_mm,
                sensor: Math.round(p.current_volume!),
                trk: Math.round(p.trk_volume!),
                diff: Math.round(p.trk_volume! - p.current_volume!),
                diffPercent: ((p.trk_volume! - p.current_volume!) / p.current_volume! * 100).toFixed(2)
              }));
          })() : []
        }
      });
    } catch (error) {
      setAnalysisResult({
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка анализа',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LineChart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Анализ Калибровки
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Расчет таблицы на основе реальных отпусков ТРК с последующим сравнением с текущей калибровкой
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор периода */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Период анализа данных
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="analysis_start_date" className="text-sm text-foreground/80">📅 Начальная дата</Label>
                  <Input
                    id="analysis_start_date"
                    type="date"
                    value={analysisStartDate}
                    onChange={(e) => setAnalysisStartDate(e.target.value)}
                    max={analysisEndDate || undefined}
                    className="mt-1.5 bg-background border-border [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
                <div>
                  <Label htmlFor="analysis_end_date" className="text-sm text-foreground/80">📅 Конечная дата</Label>
                  <Input
                    id="analysis_end_date"
                    type="date"
                    value={analysisEndDate}
                    onChange={(e) => setAnalysisEndDate(e.target.value)}
                    min={analysisStartDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    className="mt-1.5 bg-background border-border [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-2.5">
                <p className="text-xs text-blue-600 dark:text-blue-300 flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
                  Данные из /v1/tank_history (обновление каждые 10 минут)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Параметры расчета */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                Параметры расчета
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="analysis_calibration_method" className="text-sm font-medium text-foreground">
                  🧮 Алгоритм расчета
                </Label>
                <Select
                  value={settings.calibration_method}
                  onValueChange={(value) => updateSetting('calibration_method', value as CalibrationMethod)}
                >
                  <SelectTrigger id="analysis_calibration_method" className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear_regression">Линейная регрессия</SelectItem>
                    <SelectItem value="least_squares">Метод наименьших квадратов (МНК)</SelectItem>
                    <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-card/50 border border-border rounded-md p-2.5">
                  <p className="text-xs text-foreground/80">
                    {settings.calibration_method === 'linear_regression' && (
                      <>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">Линейная регрессия:</span> Строит линейную зависимость между уровнем и объемом.
                        Быстрый и простой метод, подходит для резервуаров с простой геометрией.
                      </>
                    )}
                    {settings.calibration_method === 'least_squares' && (
                      <>
                        <span className="font-semibold text-green-600 dark:text-green-400">МНК:</span> Минимизирует сумму квадратов отклонений.
                        Наиболее точный метод, учитывает все точки данных. Рекомендуется для коммерческого учета.
                      </>
                    )}
                    {settings.calibration_method === 'moving_average' && (
                      <>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением.
                        Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                <h5 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  Фильтрация данных
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-background rounded-md border border-border">
                    <Label htmlFor="analysis_outlier_filter" className="text-sm cursor-pointer">
                      🎯 Фильтр выбросов
                    </Label>
                    <Switch
                      id="analysis_outlier_filter"
                      checked={settings.outlier_filter_enabled}
                      onCheckedChange={(checked) => updateSetting('outlier_filter_enabled', checked)}
                    />
                  </div>

                  {settings.outlier_filter_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="analysis_outlier_sigma" className="text-sm text-foreground/80">σ Сигма</Label>
                      <Input
                        id="analysis_outlier_sigma"
                        type="number"
                        step="0.1"
                        value={settings.outlier_filter_sigma || ''}
                        onChange={(e) => handleNumberInput('outlier_filter_sigma', e.target.value)}
                        className="bg-background border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        3σ = 99.7% данных
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              <div className="space-y-2 mb-6">
                <Label htmlFor="analysis_calibration_step" className="text-sm font-semibold text-foreground">
                  📏 Шаг построения таблицы (мм)
                </Label>
                <Input
                  id="analysis_calibration_step"
                  type="number"
                  step="10"
                  min="10"
                  max="1000"
                  value={settings.calibration_step_mm || ''}
                  onChange={(e) => handleNumberInput('calibration_step_mm', e.target.value)}
                  className="bg-background border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Шаг между точками калибровочной таблицы. Рекомендуется 50-100 мм для коммерческого учёта.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Примечания */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Примечания к анализу
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="analysis_notes"
                placeholder="Укажите причину анализа калибровки..."
                value={analysisNotes}
                onChange={(e) => setAnalysisNotes(e.target.value)}
                rows={3}
                className="bg-background border-border resize-none"
              />
            </CardContent>
          </Card>

          {/* Кнопка анализа */}
          <Button
            onClick={handleAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Выполняется анализ...
              </>
            ) : (
              <>
                <LineChart className="w-4 h-4 mr-2" />
                Выполнить анализ
              </>
            )}
          </Button>

          {/* Результаты анализа */}
          {analysisResult && (
            <Card className="bg-card/50 border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {analysisResult.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">Анализ выполнен успешно</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="text-red-600 dark:text-red-400">Ошибка анализа</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResult.success ? (
                  <div className="space-y-4">
                    {/* Статистика сравнения */}
                    {analysisResult.statistics && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-background border border-border rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-1">Макс. отклонение</p>
                          <p className="text-lg font-semibold text-foreground">
                            {analysisResult.statistics.max_difference.toFixed(2)} л
                          </p>
                        </div>
                        <div className="bg-background border border-border rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-1">Средн. отклонение</p>
                          <p className="text-lg font-semibold text-foreground">
                            {analysisResult.statistics.avg_difference.toFixed(2)} л
                          </p>
                        </div>
                        <div className="bg-background border border-border rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-1">Макс. отклонение %</p>
                          <p className="text-lg font-semibold text-foreground">
                            {analysisResult.statistics.max_difference_percent.toFixed(3)}%
                          </p>
                        </div>
                        <div className="bg-background border border-border rounded-md p-3">
                          <p className="text-xs text-muted-foreground mb-1">Средн. отклонение %</p>
                          <p className="text-lg font-semibold text-foreground">
                            {analysisResult.statistics.avg_difference_percent.toFixed(3)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Отладочная информация */}
                    {analysisResult.debug && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                        <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-300 mb-2">🔍 Отладочная информация:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-yellow-700 dark:text-yellow-200">
                          <div>История резервуара: <strong>{analysisResult.debug.tankHistoryCount}</strong> записей</div>
                          <div>Транзакции ТРК: <strong>{analysisResult.debug.transactionsCount}</strong></div>
                          <div>Текущая таблица - точек данных: <strong>{analysisResult.debug.currentTablePoints}</strong></div>
                          <div>Текущая таблица - после фильтрации: <strong>{analysisResult.debug.currentTableFiltered}</strong></div>
                          <div>Рассчитанная таблица - точек данных: <strong>{analysisResult.debug.calculatedTablePoints}</strong></div>
                          <div>Рассчитанная таблица - после фильтрации: <strong>{analysisResult.debug.calculatedTableFiltered}</strong></div>
                          <div>Размер текущей таблицы: <strong>{analysisResult.debug.currentTableSize}</strong> точек</div>
                          <div>Размер рассчитанной таблицы: <strong>{analysisResult.debug.calculatedTableSize}</strong> точек</div>
                          <div className="col-span-2">Сравнение: <strong>{analysisResult.debug.comparisonSize}</strong> точек</div>
                          {analysisResult.debug.levelRange && (
                            <div className="col-span-2 border-t border-yellow-500/20 pt-2 mt-2">
                              <strong>Диапазон уровней:</strong> {analysisResult.debug.levelRange.min.toFixed(1)} - {analysisResult.debug.levelRange.max.toFixed(1)} см
                            </div>
                          )}
                          {analysisResult.debug.volumeRange && (
                            <div className="col-span-2">
                              <strong>Диапазон объемов:</strong> {analysisResult.debug.volumeRange.min.toFixed(0)} - {analysisResult.debug.volumeRange.max.toFixed(0)} л
                            </div>
                          )}
                          {analysisResult.debug.stepMm && (
                            <div className="col-span-2">
                              <strong>Шаг таблицы:</strong> {analysisResult.debug.stepMm} мм
                            </div>
                          )}
                          {analysisResult.debug.rawComparison && analysisResult.debug.rawComparison.length > 0 && (
                            <div className="col-span-2 border-t border-yellow-500/20 pt-2 mt-2">
                              <strong className="text-yellow-600 dark:text-yellow-300">📊 Сравнение объёмов (Датчик vs ТРК):</strong>
                              <table className="w-full mt-2 text-xs">
                                <thead>
                                  <tr className="text-yellow-600 dark:text-yellow-400">
                                    <th className="text-left">Уровень</th>
                                    <th className="text-right">Датчик</th>
                                    <th className="text-right">ТРК</th>
                                    <th className="text-right">Разница</th>
                                    <th className="text-right">%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {analysisResult.debug.rawComparison.map((row: { level: number, sensor: number, trk: number, diff: number, diffPercent: string }, i: number) => (
                                    <tr key={i} className="text-yellow-700 dark:text-yellow-200">
                                      <td>{row.level} мм</td>
                                      <td className="text-right">{row.sensor} л</td>
                                      <td className="text-right">{row.trk} л</td>
                                      <td className={`text-right ${row.diff > 0 ? 'text-green-600 dark:text-green-400' : row.diff < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        {row.diff > 0 ? '+' : ''}{row.diff} л
                                      </td>
                                      <td className={`text-right ${parseFloat(row.diffPercent) > 0 ? 'text-green-600 dark:text-green-400' : parseFloat(row.diffPercent) < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                        {row.diffPercent}%
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Диагностика алгоритма калибровки */}
                    {analysisResult.diagnostics && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3 mb-3">
                        <p className="text-sm font-semibold text-purple-600 dark:text-purple-300 mb-2">🔬 Диагностика алгоритма калибровки:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs text-purple-700 dark:text-purple-200">
                          <div>Сегментов обработано: <strong>{analysisResult.diagnostics.segmentsCount}</strong></div>
                          <div>Поступлений учтено: <strong>{analysisResult.diagnostics.receiptsProcessed}</strong></div>
                          <div>Точек до фильтрации: <strong>{analysisResult.diagnostics.totalPointsBeforeFilter}</strong></div>
                          <div>Точек после фильтрации: <strong>{analysisResult.diagnostics.totalPointsAfterFilter}</strong></div>
                          <div>Транзакций обработано: <strong>{analysisResult.diagnostics.transactionsProcessed}</strong></div>
                          <div>Отфильтровано (слепые зоны): <strong>{analysisResult.diagnostics.blindZonesFiltered}</strong></div>
                          <div className="col-span-2">
                            Температурная коррекция: <strong>{analysisResult.diagnostics.temperatureCorrectionApplied ? '✅ Применена' : '❌ Не применена'}</strong>
                          </div>
                        </div>

                        {analysisResult.diagnostics.warnings && analysisResult.diagnostics.warnings.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-purple-500/20">
                            <p className="text-sm font-semibold text-amber-600 dark:text-amber-300 mb-2">⚠️ Предупреждения ({analysisResult.diagnostics.warnings.length}):</p>
                            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-200">
                              {analysisResult.diagnostics.warnings.map((warning, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-amber-600 dark:text-amber-400">•</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Информация о версии текущей таблицы */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        ℹ️ Сравнение рассчитанной калибровочной таблицы с реальными показаниями датчика уровня за выбранный период
                      </p>
                    </div>

                    {/* График разницы по уровням */}
                    {analysisResult.comparison && analysisResult.comparison.length > 0 && (() => {
                      return (
                        <div className="bg-background border border-border rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            📊 График зависимости объема от уровня
                          </h4>
                          <ResponsiveContainer width="100%" height={400}>
                            <RechartsLineChart
                              data={analysisResult.comparison}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="level_mm"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="hsl(var(--muted-foreground))"
                                label={{ value: 'Уровень (мм)', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                label={{ value: 'Объем (л)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px',
                                  color: 'hsl(var(--foreground))'
                                }}
                                formatter={(value: number, name: string) => [
                                  `${value.toFixed(0)} л`,
                                  name === 'calculated_volume' ? '🟢 Геометрия (эталон)' : '🟠 Датчик (текущий)'
                                ]}
                                labelFormatter={(label) => `Уровень: ${label} мм`}
                              />
                              <Legend
                                wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="calculated_volume"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Геометрия (эталон)"
                              />
                              <Line
                                type="monotone"
                                dataKey="current_volume"
                                stroke="#f97316"
                                strokeWidth={2}
                                dot={{ fill: '#f97316', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Датчик (текущий)"
                              />
                              <Line
                                type="monotone"
                                dataKey="trk_volume"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Калибровка ТРК"
                              />
                              {analysisResult?.diagnostics?.referencePoint &&
                                !isNaN(analysisResult.diagnostics.referencePoint.level_mm) &&
                                !isNaN(analysisResult.diagnostics.referencePoint.volume_liters) && (
                                  <>
                                    <ReferenceLine
                                      x={analysisResult.diagnostics.referencePoint.level_mm}
                                      stroke="#ef4444"
                                      strokeDasharray="5 5"
                                      strokeWidth={2}
                                      ifOverflow="visible"
                                      label={{
                                        value: `⭐ Опорная ${analysisResult.diagnostics.referencePoint.level_mm.toFixed(0)}мм`,
                                        position: 'insideTopRight',
                                        fill: '#ef4444',
                                        fontSize: 11
                                      }}
                                    />
                                    <ReferenceDot
                                      x={analysisResult.diagnostics.referencePoint.level_mm}
                                      y={analysisResult.diagnostics.referencePoint.volume_liters}
                                      r={10}
                                      fill="#ef4444"
                                      stroke="#ffffff"
                                      strokeWidth={3}
                                      ifOverflow="visible"
                                    />
                                  </>
                                )}
                            </RechartsLineChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            🟢 <strong>Зеленая</strong> — геометрия (эталон),
                            🟠 <strong>Оранжевая</strong> — датчик (текущая калибровка),
                            🔵 <strong>Синяя</strong> — калибровка ТРК,
                            🔴 <strong>Красная точка</strong> — опорная точка (здесь синяя и оранжевая совпадают).
                          </p>
                        </div>
                      );
                    })()}

                    {/* График отклонений Датчик vs ТРК */}
                    {analysisResult.comparison && analysisResult.comparison.length > 0 && (() => {
                      const deviationData = analysisResult.comparison
                        .filter((p: CalibrationComparison) => p.current_volume > 0 && p.trk_volume > 0)
                        .map((p: CalibrationComparison) => ({
                          level_mm: p.level_mm,
                          diff_liters: Math.round(p.trk_volume - p.current_volume),
                          diff_percent: ((p.trk_volume - p.current_volume) / p.current_volume * 100)
                        }));

                      if (deviationData.length === 0) return null;

                      const maxAbsDiff = Math.max(...deviationData.map((d: { diff_liters: number }) => Math.abs(d.diff_liters)));
                      const minDiff = Math.min(...deviationData.map((d: { diff_liters: number }) => d.diff_liters));
                      const maxDiff = Math.max(...deviationData.map((d: { diff_liters: number }) => d.diff_liters));

                      return (
                        <div className="bg-background border border-border rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            📉 Отклонение: ТРК минус Датчик (литры)
                          </h4>
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-card rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Мин. отклонение</p>
                              <p className={`text-lg font-bold ${minDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {minDiff > 0 ? '+' : ''}{minDiff} л
                              </p>
                            </div>
                            <div className="bg-card rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Макс. отклонение</p>
                              <p className={`text-lg font-bold ${maxDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                {maxDiff > 0 ? '+' : ''}{maxDiff} л
                              </p>
                            </div>
                            <div className="bg-card rounded p-2 text-center">
                              <p className="text-xs text-muted-foreground">Макс. |отклонение|</p>
                              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{maxAbsDiff} л</p>
                            </div>
                          </div>
                          <ResponsiveContainer width="100%" height={250}>
                            <RechartsLineChart
                              data={deviationData}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="level_mm"
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                label={{ value: 'Уровень (мм)', position: 'bottom', fill: 'hsl(var(--muted-foreground))', fontSize: 12, offset: -5 }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                label={{ value: 'Отклонение (л)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                domain={[-maxAbsDiff * 1.1, maxAbsDiff * 1.1]}
                              />
                              <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  color: 'hsl(var(--foreground))'
                                }}
                                formatter={(value: number, name: string) => {
                                  if (name === 'diff_liters') {
                                    return [`${value > 0 ? '+' : ''}${value} л`, 'ТРК - Датчик'];
                                  }
                                  return [value, name];
                                }}
                                labelFormatter={(label) => `Уровень: ${label} мм`}
                              />
                              <Line
                                type="monotone"
                                dataKey="diff_liters"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                dot={{ fill: '#f59e0b', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="diff_liters"
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            📊 Если линия <strong>ниже нуля</strong> — датчик завышает объём относительно ТРК.
                            Если <strong>выше нуля</strong> — датчик занижает.
                          </p>
                        </div>
                      );
                    })()}

                    {/* График валидации калибровки через ТРК */}
                    {analysisResult.trk_validation && analysisResult.trk_validation.length > 0 && (() => {
                      const trkData = analysisResult.trk_validation;

                      const nozzleGroups = trkData.reduce((acc, point) => {
                        if (!acc[point.nozzle]) {
                          acc[point.nozzle] = [];
                        }
                        acc[point.nozzle].push(point);
                        return acc;
                      }, {} as Record<number, TRKValidationPoint[]>);

                      const avgDeviation = trkData.reduce((sum, p) => sum + Math.abs(p.deviation), 0) / trkData.length;
                      const maxDeviation = Math.max(...trkData.map(p => Math.abs(p.deviation)));
                      const avgDeviationPercent = trkData.reduce((sum, p) => sum + Math.abs(p.deviation_percent), 0) / trkData.length;

                      const chartData = [...trkData].sort((a, b) =>
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                      );

                      return (
                        <div className="bg-background border border-border rounded-md p-4 mb-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            🎯 Валидация калибровки через ТРК (независимый эталон)
                          </h4>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">Всего проверок</p>
                              <p className="text-lg font-semibold text-foreground">{trkData.length}</p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">Средн. отклонение</p>
                              <p className="text-lg font-semibold text-foreground">{avgDeviation.toFixed(2)} л</p>
                              <p className="text-xs text-muted-foreground">({avgDeviationPercent.toFixed(2)}%)</p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">Макс. отклонение</p>
                              <p className="text-lg font-semibold text-foreground">{maxDeviation.toFixed(2)} л</p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">Пистолетов</p>
                              <p className="text-lg font-semibold text-foreground">{Object.keys(nozzleGroups).filter(n => n !== '-1').length}</p>
                              <p className="text-xs text-muted-foreground">
                                {Object.keys(nozzleGroups)
                                  .filter(n => n !== '-1')
                                  .map(n => `№${n}`)
                                  .join(', ')}
                                {nozzleGroups[-1] && nozzleGroups[-1].length > 0 &&
                                  ` (+${nozzleGroups[-1].length} групповых)`}
                              </p>
                            </div>
                          </div>

                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsLineChart
                              data={chartData.map((point, idx) => ({
                                index: idx + 1,
                                timestamp: new Date(point.timestamp).toLocaleTimeString('ru-RU', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }),
                                deviation_percent: point.deviation_percent,
                                volume_by_trk: point.volume_by_trk,
                                volume_by_sensor: point.volume_by_sensor,
                                nozzle: point.nozzle
                              }))}
                              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="index"
                                stroke="hsl(var(--muted-foreground))"
                                label={{ value: 'Номер отпуска', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <YAxis
                                stroke="hsl(var(--muted-foreground))"
                                label={{ value: 'Отклонение (%)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '6px',
                                  color: 'hsl(var(--foreground))'
                                }}
                                formatter={(value: number, name: string) => {
                                  if (name === 'deviation_percent') return [`${value.toFixed(2)}%`, 'Отклонение'];
                                  if (name === 'volume_by_trk') return [`${value.toFixed(2)} л`, 'ТРК'];
                                  if (name === 'volume_by_sensor') return [`${value.toFixed(2)} л`, 'Датчик'];
                                  return [value, name];
                                }}
                                labelFormatter={(label) => `Отпуск №${label}`}
                              />
                              <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }} />
                              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                              <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: '+2%', fill: '#f59e0b' }} />
                              <ReferenceLine y={-2} stroke="#f59e0b" strokeDasharray="2 2" label={{ value: '-2%', fill: '#f59e0b' }} />
                              <Line
                                type="monotone"
                                dataKey="deviation_percent"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                dot={{ fill: '#8b5cf6', r: 3 }}
                                activeDot={{ r: 6 }}
                                name="Отклонение датчика от ТРК"
                              />
                            </RechartsLineChart>
                          </ResponsiveContainer>

                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            🎯 Сравнение показаний датчика уровня (через калибровочную таблицу) с фактическими отпусками через ТРК.
                            ТРК — метрологически поверенные приборы (±0.25% ГОСТ), служат независимым эталоном для проверки калибровки.
                          </p>

                          {avgDeviationPercent > 2 && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 mt-3">
                              <p className="text-sm text-yellow-600 dark:text-yellow-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                <strong>Внимание:</strong> Среднее отклонение {avgDeviationPercent.toFixed(2)}% превышает допустимые 2%.
                                Рекомендуется повторная калибровка резервуара.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Таблица сравнения */}
                    {analysisResult.comparison && analysisResult.comparison.length > 0 && (
                      <div className="border border-border rounded-md overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-card sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-foreground/80 font-medium">Уровень (мм)</th>
                                <th className="px-3 py-2 text-right text-foreground/80 font-medium">Датчик (л)</th>
                                <th className="px-3 py-2 text-right text-foreground/80 font-medium">Калибровка (л)</th>
                                <th className="px-3 py-2 text-right text-foreground/80 font-medium">Разница (л)</th>
                                <th className="px-3 py-2 text-right text-foreground/80 font-medium">Разница (%)</th>
                              </tr>
                            </thead>
                            <tbody className="bg-background">
                              {analysisResult.comparison.map((row, idx) => (
                                <tr
                                  key={idx}
                                  className={`border-t border-border ${Math.abs(row.difference_percent) > 1 ? 'bg-red-500/10' :
                                      Math.abs(row.difference_percent) > 0.5 ? 'bg-yellow-500/10' :
                                        ''
                                    }`}
                                >
                                  <td className="px-3 py-2 text-foreground">{row.level_mm}</td>
                                  <td className="px-3 py-2 text-right text-foreground">
                                    {row.current_volume?.toFixed(2) ?? '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-foreground">
                                    {row.calculated_volume.toFixed(2)}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-medium ${Math.abs(row.difference) > 50 ? 'text-red-600 dark:text-red-400' :
                                      Math.abs(row.difference) > 20 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {row.difference > 0 ? '+' : ''}{row.difference.toFixed(2)}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-medium ${Math.abs(row.difference_percent) > 1 ? 'text-red-600 dark:text-red-400' :
                                      Math.abs(row.difference_percent) > 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {row.difference_percent > 0 ? '+' : ''}{row.difference_percent.toFixed(3)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Нет текущей таблицы для сравнения */}
                    {!analysisResult.comparison && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4">
                        <p className="text-sm text-blue-600 dark:text-blue-300">
                          ℹ️ Показаны результаты расчета калибровочной таблицы без сравнения с реальными показаниями датчика.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4" />
                    <span>Ошибка: {analysisResult.error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
