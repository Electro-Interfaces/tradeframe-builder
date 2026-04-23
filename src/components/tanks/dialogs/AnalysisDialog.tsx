/**
 * Диалог анализа калибровки резервуара
 * Извлечено из TankCalibrationSettings.tsx
 */

import { useState } from 'react';
import type {
  TankCalibrationSettings as CalibrationSettings,
  CalibrationMethod,
  CalculateCalibrationTableResult,
  CalibrationTablePoint,
  ReceiptItem
} from '@/types/tanks';
import { createCalibrationTable, getCalibrationTables } from '@/services/calibrationTableService';
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
  LineChart,
  Save
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
  geometric_volume: number;
  trk_volume: number | undefined;
  difference: number | undefined;
  difference_percent: number | undefined;
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
  current_table?: CalibrationTablePoint[];
  analysis_settings_snapshot?: CalibrationSettings;
  geometry_model_comparison?: {
    compared_points: number;
    avg_difference_liters: number;
    avg_difference_percent: number;
    max_difference_liters: number;
    max_difference_percent: number;
    max_difference_level_mm?: number;
    status: 'aligned' | 'warning' | 'critical';
    title: string;
    description: string;
  };
  geometry_input_diagnosis?: {
    compared_points: number;
    avg_signed_difference_liters: number;
    avg_signed_difference_percent: number;
    avg_abs_difference_percent: number;
    offset_candidate_liters: number;
    offset_residual_percent: number;
    scale_factor: number;
    scale_residual_percent: number;
    low_zone_percent?: number;
    mid_zone_percent?: number;
    high_zone_percent?: number;
    pattern: 'aligned' | 'offset' | 'scale' | 'shape' | 'mixed';
    title: string;
    description: string;
    likely_causes: string[];
    checks: string[];
  };
  current_table_statistics?: {
    data_points_total: number;
    data_points_used: number;
    table_points: number;
    r_squared: number;
    rmse: number;
    max_error: number;
  };
  current_table_coverage?: {
    measurable_range_mm: number;
    observed_range_mm: number;
    observed_min_mm?: number;
    observed_max_mm?: number;
    range_coverage_percent: number;
    buckets_covered: number;
    total_buckets: number;
    bucket_coverage_percent: number;
    valid_measurements: number;
  };
  recommendation?: {
    status: 'insufficient_data' | 'review_required' | 'ready_for_approval';
    title: string;
    description: string;
    reasons: string[];
  };
  statistics?: {
    max_difference: number;
    avg_difference: number;
    max_difference_percent: number;
    avg_difference_percent: number;
  };
  trk_validation?: TRKValidationPoint[];
  debug?: {
    tankHistoryCount: number;
    transactionsCount: number;
    currentTablePoints: number;
    currentTableFiltered: number;
    calculatedTablePoints: number;
    calculatedTableFiltered: number;
    currentTableSize: number;
    calculatedTableSize: number;
    comparisonSize: number;
    levelRange?: {
      min: number;
      max: number;
    };
    volumeRange?: {
      min: number;
      max: number;
    };
    stepMm?: number;
    rawComparison?: Array<{
      level: number;
      sensor: number;
      trk: number;
      diff: number;
      diffPercent: string;
    }>;
  };
}

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tankId: string;
  tankName?: string;
  fuelType?: string;
  networkName?: string;
  stationName?: string;
  settings: CalibrationSettings;
  updateSetting: <K extends keyof CalibrationSettings>(key: K, value: CalibrationSettings[K]) => void;
  handleNumberInput: (key: keyof CalibrationSettings, value: string, isInteger?: boolean) => void;
  onTableSaved?: () => void;
}

/**
 * Валидация калибровки через ТРК (независимый эталон)
 */
function validateCalibrationByTRK(
  tankHistory: Array<{ dt: string; level: string; volume: string; number: number }>,
  transactions: Array<{ dt?: string; tank: number; fuel?: number; nozzle: number; quantity: string | number }>,
  receipts: ReceiptItem[],
  tankNumber: number,
  currentCalibrationMap: Map<number, number>,
  pollingIntervalMinutes: number = 10,
  fuelCode?: number
): TRKValidationPoint[] {
  const validationPoints: TRKValidationPoint[] = [];

  const searchWindowMinutes = pollingIntervalMinutes * 3;

  const sortedHistory = [...tankHistory].sort((a, b) =>
    new Date(a.dt).getTime() - new Date(b.dt).getTime()
  );

  const tankTransactions = transactions
    .filter(t => {
      if (!t.dt) return false;
      if (typeof fuelCode === 'number' && fuelCode > 0) {
        return t.fuel === fuelCode;
      }
      return t.tank === tankNumber;
    })
    .sort((a, b) => new Date(a.dt!).getTime() - new Date(b.dt!).getTime());

  const tankReceipts = receipts
    .filter(r => r.tank === tankNumber)
    .sort((a, b) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

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

    const receiptsInInterval = tankReceipts.filter(receipt => {
      const receiptTime = new Date(receipt.dt).getTime();
      return receiptTime > timeBefore && receiptTime < timeAfter;
    });

    if (receiptsInInterval.length > 0) continue;
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

function getTankLevelCapacity(settings: CalibrationSettings): number {
  switch (settings.tank_shape_type) {
    case 'vertical_cylinder':
    case 'rectangular':
      return settings.tank_height_mm;
    case 'spherical':
    case 'horizontal_cylinder':
    default:
      return settings.tank_diameter_mm;
  }
}

function buildCurrentTableCoverage(
  history: Array<{ level: string }>,
  settings: CalibrationSettings
): NonNullable<AnalysisResult['current_table_coverage']> {
  const tankCapacityMm = getTankLevelCapacity(settings);
  const minMeasurableLevel = Math.max(0, settings.sensor_blind_zone_bottom_mm || 0);
  const maxMeasurableLevel = Math.max(minMeasurableLevel, tankCapacityMm - (settings.sensor_blind_zone_top_mm || 0));
  const measurableRangeMm = Math.max(0, maxMeasurableLevel - minMeasurableLevel);
  const bucketStep = Math.max(10, settings.calibration_step_mm || 10);

  const validLevels = history
    .map((record) => parseFloat(record.level) * 10)
    .filter((level) =>
      Number.isFinite(level)
      && level >= minMeasurableLevel
      && level <= maxMeasurableLevel
    );

  if (!validLevels.length || measurableRangeMm === 0) {
    return {
      measurable_range_mm: measurableRangeMm,
      observed_range_mm: 0,
      range_coverage_percent: 0,
      buckets_covered: 0,
      total_buckets: 0,
      bucket_coverage_percent: 0,
      valid_measurements: 0,
    };
  }

  const observedMinMm = Math.min(...validLevels);
  const observedMaxMm = Math.max(...validLevels);
  const observedRangeMm = Math.max(0, observedMaxMm - observedMinMm);
  const totalBuckets = Math.max(1, Math.floor(measurableRangeMm / bucketStep) + 1);
  const coveredBuckets = new Set(
    validLevels.map((level) => {
      const clamped = Math.min(maxMeasurableLevel, Math.max(minMeasurableLevel, level));
      return Math.round((clamped - minMeasurableLevel) / bucketStep);
    })
  );

  return {
    measurable_range_mm: measurableRangeMm,
    observed_range_mm: observedRangeMm,
    observed_min_mm: observedMinMm,
    observed_max_mm: observedMaxMm,
    range_coverage_percent: Math.min(100, (observedRangeMm / measurableRangeMm) * 100),
    buckets_covered: coveredBuckets.size,
    total_buckets: totalBuckets,
    bucket_coverage_percent: Math.min(100, (coveredBuckets.size / totalBuckets) * 100),
    valid_measurements: validLevels.length,
  };
}

function buildAnalysisRecommendation(
  coverage: NonNullable<AnalysisResult['current_table_coverage']>,
  currentTableResult: ReturnType<typeof buildCurrentCalibrationTable>,
  calculatedTableResult: ReturnType<typeof runCalibrationAlgorithm>,
  statistics: AnalysisResult['statistics'],
  geometryModelComparison: AnalysisResult['geometry_model_comparison'],
  trkValidation: TRKValidationPoint[],
  settings: CalibrationSettings
): NonNullable<AnalysisResult['recommendation']> {
  const maxAcceptableDeviation = settings.max_acceptable_deviation_percent || 2;
  const avgTrkDeviationPercent = trkValidation.length > 0
    ? trkValidation.reduce((sum, point) => sum + Math.abs(point.deviation_percent), 0) / trkValidation.length
    : null;

  const reasons: string[] = [];

  if (coverage.range_coverage_percent < 50) {
    reasons.push(`Покрытие диапазона уровней пока слабое: ${coverage.range_coverage_percent.toFixed(1)}%`);
  }

  if (coverage.bucket_coverage_percent < 20) {
    reasons.push(`Слишком мало занятых диапазонов уровней: ${coverage.bucket_coverage_percent.toFixed(1)}% корзин`);
  }

  if (currentTableResult.filtered_points_count < 10) {
    reasons.push(`После фильтрации датчика осталось мало точек: ${currentTableResult.filtered_points_count}`);
  }

  if (calculatedTableResult.filtered_points_count < 5) {
    reasons.push(`Для ТРК-таблицы недостаточно валидных сегментов: ${calculatedTableResult.filtered_points_count}`);
  }

  if (trkValidation.length < 3) {
    reasons.push(`Проверок через ТРК мало: ${trkValidation.length}`);
  }

  if (!statistics) {
    reasons.push('Нет полного сравнения текущей таблицы датчика с расчетной таблицей ТРК');
  }

  if (statistics && statistics.avg_difference_percent > maxAcceptableDeviation) {
    reasons.push(
      `Среднее отклонение датчика от ТРК ${statistics.avg_difference_percent.toFixed(3)}% выше порога ${maxAcceptableDeviation}%`
    );
  }

  if (statistics && statistics.max_difference_percent > maxAcceptableDeviation * 2) {
    reasons.push(
      `Максимальное отклонение ${statistics.max_difference_percent.toFixed(3)}% слишком велико для уверенного применения`
    );
  }

  if (avgTrkDeviationPercent !== null && avgTrkDeviationPercent > maxAcceptableDeviation) {
    reasons.push(
      `Среднее отклонение проверок ТРК ${avgTrkDeviationPercent.toFixed(2)}% выше допустимого уровня`
    );
  }

  if (geometryModelComparison?.status === 'critical') {
    reasons.push(
      `Геометрическая модель не подтверждается фактическими данными: среднее расхождение ${geometryModelComparison.avg_difference_percent.toFixed(2)}%, максимум ${geometryModelComparison.max_difference_percent.toFixed(2)}%`
    );
  } else if (geometryModelComparison?.status === 'warning') {
    reasons.push(
      `Геометрическая модель заметно расходится с ТРК: среднее ${geometryModelComparison.avg_difference_percent.toFixed(2)}%, максимум ${geometryModelComparison.max_difference_percent.toFixed(2)}%`
    );
  }

  if (
    coverage.range_coverage_percent < 50
    || coverage.bucket_coverage_percent < 20
    || currentTableResult.filtered_points_count < 10
  ) {
    return {
      status: 'insufficient_data',
      title: 'Данных недостаточно',
      description: 'Сначала нужно накопить более широкий диапазон уровней и больше валидных измерений датчика.',
      reasons,
    };
  }

  if (
    statistics
    && coverage.range_coverage_percent >= 70
    && coverage.bucket_coverage_percent >= 30
    && trkValidation.length >= 3
    && statistics.avg_difference_percent <= maxAcceptableDeviation
    && statistics.max_difference_percent <= maxAcceptableDeviation * 2
    && avgTrkDeviationPercent !== null
    && avgTrkDeviationPercent <= maxAcceptableDeviation
    && geometryModelComparison?.status !== 'critical'
  ) {
    return {
      status: 'ready_for_approval',
      title: 'Можно отдавать на ревью',
      description: 'Данных достаточно для ручной проверки и сохранения baseline или draft-версии на утверждение.',
      reasons: reasons.length > 0 ? reasons : ['Качество покрытия и расхождения укладываются в допустимые пределы'],
    };
  }

  return {
    status: 'review_required',
    title: 'Нужна ручная проверка',
    description: geometryModelComparison?.status === 'critical'
      ? 'ТРК-данные собраны, но геометрическая модель не подтверждается фактическими данными. Перед применением нужно проверить размеры резервуара, нулевую точку и мертвые зоны.'
      : 'Базовые данные собраны, но перед применением нужно вручную проверить расхождения по уровням и ТРК.',
    reasons,
  };
}

function buildGeometryModelComparison(
  comparison: CalibrationComparison[] | undefined,
  settings: CalibrationSettings
): AnalysisResult['geometry_model_comparison'] {
  if (!comparison || comparison.length === 0) {
    return undefined;
  }

  const validPoints = comparison.filter((point) => (
    typeof point.trk_volume === 'number'
    && point.trk_volume > 0
    && Number.isFinite(point.geometric_volume)
  ));

  if (validPoints.length === 0) {
    return undefined;
  }

  const maxAcceptableDeviation = settings.max_acceptable_deviation_percent || 2;
  let totalAbsLiters = 0;
  let totalAbsPercent = 0;
  let maxAbsLiters = 0;
  let maxAbsPercent = 0;
  let maxDifferenceLevelMm: number | undefined;

  validPoints.forEach((point) => {
    const absLiters = Math.abs(point.geometric_volume - point.trk_volume!);
    const absPercent = point.trk_volume! > 0
      ? (absLiters / point.trk_volume!) * 100
      : 0;

    totalAbsLiters += absLiters;
    totalAbsPercent += absPercent;

    if (absLiters > maxAbsLiters) {
      maxAbsLiters = absLiters;
      maxDifferenceLevelMm = point.level_mm;
    }

    if (absPercent > maxAbsPercent) {
      maxAbsPercent = absPercent;
    }
  });

  const avgDifferenceLiters = totalAbsLiters / validPoints.length;
  const avgDifferencePercent = totalAbsPercent / validPoints.length;
  const status = avgDifferencePercent <= maxAcceptableDeviation && maxAbsPercent <= maxAcceptableDeviation * 2
    ? 'aligned'
    : avgDifferencePercent <= maxAcceptableDeviation * 2 && maxAbsPercent <= maxAcceptableDeviation * 3
      ? 'warning'
      : 'critical';

  return {
    compared_points: validPoints.length,
    avg_difference_liters: avgDifferenceLiters,
    avg_difference_percent: avgDifferencePercent,
    max_difference_liters: maxAbsLiters,
    max_difference_percent: maxAbsPercent,
    max_difference_level_mm: maxDifferenceLevelMm,
    status,
    title: status === 'aligned'
      ? 'Геометрическая модель близка к фактическим данным'
      : status === 'warning'
        ? 'Геометрическая модель требует проверки'
        : 'Геометрическая модель не подтверждается фактическими данными',
    description: status === 'aligned'
      ? 'Модель по размерам резервуара не противоречит ТРК на рабочем диапазоне.'
      : status === 'warning'
        ? 'Есть заметное расхождение между моделью по размерам и фактической ТРК-кривой. Использовать геометрию как ориентир нужно осторожно.'
        : 'Размеры или геометрические допущения не объясняют фактическую ТРК-кривую. Зеленую кривую нельзя трактовать как эталон.',
  };
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
  }

  return sorted[middleIndex];
}

function buildGeometryInputDiagnosis(
  comparison: CalibrationComparison[] | undefined,
  settings: CalibrationSettings
): AnalysisResult['geometry_input_diagnosis'] {
  if (!comparison || comparison.length === 0) {
    return undefined;
  }

  const validPoints = comparison
    .filter((point) => (
      typeof point.trk_volume === 'number'
      && point.trk_volume > 0
      && Number.isFinite(point.geometric_volume)
    ))
    .sort((a, b) => a.level_mm - b.level_mm);

  if (validPoints.length < 3) {
    return undefined;
  }

  const signedDiffsLiters = validPoints.map((point) => point.geometric_volume - point.trk_volume!);
  const signedDiffsPercent = validPoints.map((point) => (
    ((point.geometric_volume - point.trk_volume!) / point.trk_volume!) * 100
  ));
  const absDiffsPercent = signedDiffsPercent.map((value) => Math.abs(value));
  const avgSignedDifferenceLiters = calculateAverage(signedDiffsLiters);
  const avgSignedDifferencePercent = calculateAverage(signedDiffsPercent);
  const avgAbsDifferencePercent = calculateAverage(absDiffsPercent);
  const offsetCandidateLiters = calculateMedian(signedDiffsLiters);
  const offsetResidualPercent = calculateAverage(
    validPoints.map((point, index) => (
      Math.abs((signedDiffsLiters[index] - offsetCandidateLiters) / point.trk_volume!) * 100
    ))
  );

  const scaleNumerator = validPoints.reduce(
    (sum, point) => sum + point.geometric_volume * point.trk_volume!,
    0
  );
  const scaleDenominator = validPoints.reduce(
    (sum, point) => sum + point.geometric_volume * point.geometric_volume,
    0
  );
  const scaleFactor = scaleDenominator > 0 ? scaleNumerator / scaleDenominator : 1;
  const scaleResidualPercent = calculateAverage(
    validPoints.map((point) => (
      Math.abs((point.geometric_volume * scaleFactor - point.trk_volume!) / point.trk_volume!) * 100
    ))
  );

  const zoneBuckets = validPoints.reduce((acc, point, index) => {
    const zoneIndex = Math.min(2, Math.floor((index * 3) / validPoints.length));
    acc[zoneIndex].push(((point.geometric_volume - point.trk_volume!) / point.trk_volume!) * 100);
    return acc;
  }, [[], [], []] as number[][]);

  const [lowZoneValues, midZoneValues, highZoneValues] = zoneBuckets;
  const lowZonePercent = lowZoneValues.length > 0 ? calculateAverage(lowZoneValues) : undefined;
  const midZonePercent = midZoneValues.length > 0 ? calculateAverage(midZoneValues) : undefined;
  const highZonePercent = highZoneValues.length > 0 ? calculateAverage(highZoneValues) : undefined;
  const zoneValues = [lowZonePercent, midZonePercent, highZonePercent]
    .filter((value): value is number => typeof value === 'number');
  const zoneSpread = zoneValues.length > 0
    ? Math.max(...zoneValues) - Math.min(...zoneValues)
    : 0;
  const normalizedZoneSigns = zoneValues
    .map((value) => (Math.abs(value) < 0.5 ? 0 : Math.sign(value)))
    .filter((value) => value !== 0);
  const signChanges = normalizedZoneSigns.reduce((count, sign, index) => (
    index > 0 && sign !== normalizedZoneSigns[index - 1] ? count + 1 : count
  ), 0);

  const maxAcceptableDeviation = settings.max_acceptable_deviation_percent || 2;
  const hasOffsetCandidate = Math.abs(offsetCandidateLiters) >= Math.max(50, settings.min_change_for_calibration_liters * 0.25);
  const hasScaleCandidate = Math.abs(scaleFactor - 1) >= 0.03;
  const offsetLooksBetter = hasOffsetCandidate && offsetResidualPercent <= avgAbsDifferencePercent * 0.7;
  const scaleLooksBetter = hasScaleCandidate && scaleResidualPercent <= avgAbsDifferencePercent * 0.7;
  const shapeMismatch = signChanges > 0 || zoneSpread > maxAcceptableDeviation * 2;

  let pattern: AnalysisResult['geometry_input_diagnosis']['pattern'] = 'mixed';
  if (avgAbsDifferencePercent <= maxAcceptableDeviation) {
    pattern = 'aligned';
  } else if (shapeMismatch && !offsetLooksBetter && !scaleLooksBetter) {
    pattern = 'shape';
  } else if (offsetLooksBetter && (!scaleLooksBetter || offsetResidualPercent <= scaleResidualPercent)) {
    pattern = 'offset';
  } else if (scaleLooksBetter) {
    pattern = 'scale';
  } else if (shapeMismatch) {
    pattern = 'shape';
  }

  const modelDirection = avgSignedDifferenceLiters >= 0 ? 'above' : 'below';
  const likelyCauses: string[] = [];
  const checks: string[] = [];
  let title = 'Геометрия требует комплексной проверки';
  let description = 'Расхождение не объясняется одной простой причиной. Нужно проверить и размеры, и нулевую точку, и рабочий диапазон датчика.';

  if (pattern === 'aligned') {
    title = 'Паспортная геометрия выглядит согласованной';
    description = 'По рабочему диапазону введенные размеры резервуара не противоречат фактической ТРК-кривой.';
    likelyCauses.push('Крупного системного смещения геометрии относительно ТРК не видно');
    checks.push('Достаточно контролировать новые расхождения через baseline датчика и ТРК');
  }

  if (pattern === 'offset') {
    title = 'Похоже на смещение нуля или dead stock';
    description = avgSignedDifferenceLiters >= 0
      ? 'Геомодель почти везде выше ТРК примерно на постоянную величину. Обычно это означает заниженный dead stock или неверно заданную нижнюю точку отсчета.'
      : 'Геомодель почти везде ниже ТРК примерно на постоянную величину. Обычно это означает завышенный dead stock или смещенную вверх нулевую точку.';
    likelyCauses.push(
      avgSignedDifferenceLiters >= 0
        ? 'В параметрах может быть занижен мертвый остаток'
        : 'В параметрах может быть завышен мертвый остаток'
    );
    likelyCauses.push('Нижняя точка привязки уровня может не совпадать с реальным нулем резервуара');
    checks.push(`Проверить dead_stock_liters: текущая модель отличается примерно на ${Math.abs(offsetCandidateLiters).toFixed(0)} л`);
    checks.push('Проверить нижнюю слепую зону датчика и фактическую точку отсчета уровня');
  }

  if (pattern === 'scale') {
    title = 'Похоже на несоответствие паспортной емкости';
    description = modelDirection === 'above'
      ? 'Геомодель системно завышает рабочий объем относительно ТРК. Это похоже на завышенные паспортные размеры или на неверно выбранную форму резервуара.'
      : 'Геомодель системно занижает рабочий объем относительно ТРК. Это похоже на заниженные паспортные размеры или неполный учет рабочего объема.';
    likelyCauses.push(
      modelDirection === 'above'
        ? 'Паспортные размеры резервуара могут быть указаны больше фактических'
        : 'Паспортные размеры резервуара могут быть указаны меньше фактических'
    );
    likelyCauses.push('Нужно перепроверить тип формы резервуара и рабочую длину/диаметр');
    checks.push(`Эквивалентный масштаб рабочей емкости сейчас около ${(scaleFactor * 100).toFixed(1)}% от введенной модели`);
    checks.push('Сверить tank_shape_type, диаметр, длину/высоту и наличие наклона по паспорту и акту осмотра');
  }

  if (pattern === 'shape') {
    title = 'Похоже на неверную форму или профиль геометрии';
    description = 'Расхождение меняет характер по высоте резервуара: разные зоны ведут себя по-разному, поэтому проблема не выглядит как простой сдвиг или единый масштаб.';
    likelyCauses.push('Форма резервуара или одна из ключевых геометрических величин указана неверно');
    likelyCauses.push('Влияют наклон, деформация, неправильная высота нуля или неучтенные элементы внутри емкости');
    checks.push('Проверить tank_shape_type, диаметр, длину/высоту, угол наклона и реальные днища резервуара');
    checks.push('Сопоставить низ / середину / верх по фактическим промерам и ТРК-кривой');
  }

  if (pattern === 'mixed') {
    likelyCauses.push('Есть и системное смещение объема, и изменение профиля по высоте резервуара');
    likelyCauses.push('Одной правкой dead stock или одной правкой размеров проблему не объяснить');
    checks.push('Проверить паспортные размеры, мертвый остаток, слепые зоны и нулевую точку одним проходом');
    checks.push('Для принятия решения нужен осмотр резервуара или сверка с поверочной таблицей');
  }

  return {
    compared_points: validPoints.length,
    avg_signed_difference_liters: avgSignedDifferenceLiters,
    avg_signed_difference_percent: avgSignedDifferencePercent,
    avg_abs_difference_percent: avgAbsDifferencePercent,
    offset_candidate_liters: offsetCandidateLiters,
    offset_residual_percent: offsetResidualPercent,
    scale_factor: scaleFactor,
    scale_residual_percent: scaleResidualPercent,
    low_zone_percent: lowZonePercent,
    mid_zone_percent: midZonePercent,
    high_zone_percent: highZonePercent,
    pattern,
    title,
    description,
    likely_causes: likelyCauses,
    checks,
  };
}

function buildCalculatedTableNotes(
  analysisResult: AnalysisResult,
  analysisStartDate: string,
  analysisEndDate: string,
  analysisNotes: string
): string {
  const lines = [
    '[draft_trk_analysis]',
    `Период анализа: ${analysisStartDate} - ${analysisEndDate}.`,
  ];

  if (typeof analysisResult.current_table_version === 'number') {
    lines.push(`Сравнение выполнялось относительно активной версии v${analysisResult.current_table_version}.`);
  }

  if (analysisResult.recommendation) {
    lines.push(
      `Verdict: ${analysisResult.recommendation.status}. ${analysisResult.recommendation.title}. ${analysisResult.recommendation.description}`
    );
  }

  if (analysisResult.current_table_coverage) {
    lines.push(
      `Покрытие датчика: диапазон ${analysisResult.current_table_coverage.range_coverage_percent.toFixed(1)}%, корзины ${analysisResult.current_table_coverage.bucket_coverage_percent.toFixed(1)}%.`
    );
  }

  if (analysisResult.statistics) {
    lines.push(
      `Сравнение Датчик/ТРК: среднее ${analysisResult.statistics.avg_difference_percent.toFixed(3)}%, максимум ${analysisResult.statistics.max_difference_percent.toFixed(3)}%.`
    );
  }

  if (analysisResult.geometry_model_comparison) {
    lines.push(
      `Геометрическая модель vs ТРК: среднее ${analysisResult.geometry_model_comparison.avg_difference_percent.toFixed(2)}%, максимум ${analysisResult.geometry_model_comparison.max_difference_percent.toFixed(2)}%.`
    );
  }

  if (analysisResult.geometry_input_diagnosis) {
    lines.push(
      `Диагноз геометрии: ${analysisResult.geometry_input_diagnosis.pattern}. ${analysisResult.geometry_input_diagnosis.title}.`
    );
    lines.push(
      `Signed drift геомодели к ТРК: ${analysisResult.geometry_input_diagnosis.avg_signed_difference_liters >= 0 ? '+' : ''}${analysisResult.geometry_input_diagnosis.avg_signed_difference_liters.toFixed(1)} л, ${analysisResult.geometry_input_diagnosis.avg_signed_difference_percent >= 0 ? '+' : ''}${analysisResult.geometry_input_diagnosis.avg_signed_difference_percent.toFixed(2)}%.`
    );
  }

  if (analysisResult.trk_validation && analysisResult.trk_validation.length > 0) {
    const avgTrkDeviation = analysisResult.trk_validation.reduce(
      (sum, point) => sum + Math.abs(point.deviation_percent),
      0
    ) / analysisResult.trk_validation.length;
    lines.push(
      `Валидация ТРК: ${analysisResult.trk_validation.length} проверок, среднее отклонение ${avgTrkDeviation.toFixed(2)}%.`
    );
  }

  if (analysisResult.recommendation?.reasons?.length) {
    lines.push(`Причины: ${analysisResult.recommendation.reasons.join(' | ')}`);
  }

  if (analysisNotes.trim()) {
    lines.push(`Комментарий оператора: ${analysisNotes.trim()}`);
  }

  return lines.join('\n');
}

export function AnalysisDialog({
  open,
  onOpenChange,
  tankId,
  tankName,
  fuelType,
  networkName,
  stationName,
  settings,
  updateSetting,
  handleNumberInput,
  onTableSaved
}: AnalysisDialogProps) {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [analysisStartDate, setAnalysisStartDate] = useState('');
  const [analysisEndDate, setAnalysisEndDate] = useState('');
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingCurrentTable, setIsSavingCurrentTable] = useState(false);
  const [isSavingCalculatedTable, setIsSavingCalculatedTable] = useState(false);
  const [savedCurrentTableVersion, setSavedCurrentTableVersion] = useState<number | null>(null);
  const [savedCalculatedTableVersion, setSavedCalculatedTableVersion] = useState<number | null>(null);
  const [currentTableSaveError, setCurrentTableSaveError] = useState<string | null>(null);
  const [calculatedTableSaveError, setCalculatedTableSaveError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isApplyingGeometrySuggestion, setIsApplyingGeometrySuggestion] = useState(false);

  const performAnalysis = async (analysisSettings: CalibrationSettings = settings) => {
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
    setSavedCurrentTableVersion(null);
    setSavedCalculatedTableVersion(null);
    setCurrentTableSaveError(null);
    setCalculatedTableSaveError(null);

    try {
      // 1. Получаем текущую активную калибровочную таблицу (если есть)
      let activeTable;
      try {
        const currentTables = await getCalibrationTables(tankId);
        activeTable = currentTables.find(t => t.is_active);
      } catch {
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

      const fuelCode = tankHistory.find(record => record.number === tankNumber)?.fuel;

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

      // 4. Строим геометрическую модель по размерам резервуара
      const geometricTableResult = buildGeometricCalibrationTable(analysisSettings);

      // 5. Строим ТЕКУЩУЮ калибровочную таблицу из показаний API датчика
      const currentTableResult = buildCurrentCalibrationTable(tankHistory, analysisSettings);

      // 6. Строим РАССЧИТАННУЮ калибровочную таблицу на основе транзакций ТРК и поступлений
      const calculatedTableResult = runCalibrationAlgorithm(
        tankHistory,
        transactions,
        analysisSettings,
        tankNumber,
        receipts,
        activeTable?.table,
        fuelCode
      );

      if (calculatedTableResult.table.length === 0) {
        const details = calculatedTableResult.diagnostics?.warnings?.join(' ');
        throw new Error(details || 'Недостаточно реальных отпусков ТРК и показаний датчика для расчета калибровочной таблицы.');
      }

      // 7. Сравниваем геометрическую модель, текущую таблицу датчика и расчетную ТРК-таблицу
      let comparison: CalibrationComparison[] | undefined;
      let statistics: AnalysisResult['statistics'] | undefined;

      if (geometricTableResult.table.length > 0 && currentTableResult.table.length > 0) {
        comparison = [];
        let totalDiff = 0;
        let totalDiffPercent = 0;
        let maxDiff = 0;
        let maxDiffPercent = 0;
        let validCount = 0;

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
                  const denom = level2 - level1;
                  if (denom === 0) { current_volume = vol1; break; }
                  const t = (level_mm - level1) / denom;
                  current_volume = vol1 + t * (vol2 - vol1);
                  break;
                }
              }
            }
          }
          // Защита от NaN (может возникнуть при NaN в таблице датчика)
          if (current_volume !== null && isNaN(current_volume)) current_volume = null;

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
                  const denom = level2 - level1;
                  if (denom === 0) { trk_volume = vol1; break; }
                  const t = (level_mm - level1) / denom;
                  trk_volume = vol1 + t * (vol2 - vol1);
                  break;
                }
              }
            }
          }
          // Защита от NaN
          if (trk_volume !== null && isNaN(trk_volume)) trk_volume = null;

          const difference = current_volume !== null && trk_volume !== null
            ? trk_volume - current_volume
            : undefined;
          const differencePercent = difference !== undefined && current_volume !== null && current_volume > 0
            ? (difference / current_volume) * 100
            : undefined;

          comparison.push({
            level_mm: Math.round(level_mm),
            current_volume: current_volume ?? undefined,
            geometric_volume,
            trk_volume: trk_volume ?? undefined,
            difference,
            difference_percent: differencePercent,
          });

          if (difference !== undefined && differencePercent !== undefined) {
            totalDiff += Math.abs(difference);
            totalDiffPercent += Math.abs(differencePercent);
            maxDiff = Math.max(maxDiff, Math.abs(difference));
            maxDiffPercent = Math.max(maxDiffPercent, Math.abs(differencePercent));
            validCount++;
          }
        }

        if (validCount > 0) {
          statistics = {
            max_difference: maxDiff,
            avg_difference: totalDiff / validCount,
            max_difference_percent: maxDiffPercent,
            avg_difference_percent: totalDiffPercent / validCount,
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
        receipts,
        tankNumber,
        currentCalibrationMap,
        analysisSettings.data_polling_interval_minutes,
        fuelCode
      );
      const currentTableCoverage = buildCurrentTableCoverage(tankHistory, analysisSettings);
      const geometryModelComparison = buildGeometryModelComparison(comparison, analysisSettings);
      const geometryInputDiagnosis = buildGeometryInputDiagnosis(comparison, analysisSettings);
      const recommendation = buildAnalysisRecommendation(
        currentTableCoverage,
        currentTableResult,
        calculatedTableResult,
        statistics,
        geometryModelComparison,
        trkValidation,
        analysisSettings
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
        current_table: currentTableResult.table,
        analysis_settings_snapshot: analysisSettings,
        geometry_model_comparison: geometryModelComparison,
        geometry_input_diagnosis: geometryInputDiagnosis,
        current_table_statistics: {
          data_points_total: currentTableResult.data_points_count,
          data_points_used: currentTableResult.filtered_points_count,
          table_points: currentTableResult.table.length,
          r_squared: currentTableResult.quality_metrics?.r_squared ?? 0,
          rmse: currentTableResult.quality_metrics?.rmse ?? 0,
          max_error: currentTableResult.quality_metrics?.max_error ?? 0,
        },
        current_table_coverage: currentTableCoverage,
        recommendation,
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
          stepMm: analysisSettings.calibration_step_mm,
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

  const handleAnalysis = async () => {
    await performAnalysis(settings);
  };

  const handleApplyDeadStockSuggestion = async () => {
    if (!analysisResult?.success || !analysisResult.geometry_input_diagnosis) {
      return;
    }

    const baseSettings = analysisResult.analysis_settings_snapshot ?? settings;
    const suggestedDelta = Math.round(analysisResult.geometry_input_diagnosis.offset_candidate_liters / 10) * 10;

    if (!Number.isFinite(suggestedDelta) || suggestedDelta === 0) {
      return;
    }

    const nextDeadStock = Math.max(
      0,
      Math.round((baseSettings.dead_stock_liters + suggestedDelta) / 10) * 10
    );

    if (nextDeadStock === baseSettings.dead_stock_liters) {
      return;
    }

    const nextSettings: CalibrationSettings = {
      ...baseSettings,
      dead_stock_liters: nextDeadStock,
    };

    setIsApplyingGeometrySuggestion(true);
    updateSetting('dead_stock_liters', nextDeadStock);

    try {
      await performAnalysis(nextSettings);
    } finally {
      setIsApplyingGeometrySuggestion(false);
    }
  };

  const handleSaveCurrentTable = async () => {
    if (!analysisResult?.success || !analysisResult.current_table || analysisResult.current_table.length === 0) {
      return;
    }

    setIsSavingCurrentTable(true);
    setCurrentTableSaveError(null);

    try {
      const item = await createCalibrationTable({
        tank_id: tankId,
        table: analysisResult.current_table,
        analysis_start_date: analysisStartDate,
        analysis_end_date: analysisEndDate,
        creation_notes: [
          '[baseline_sensor]',
          `Восстановлено по фактическим level->volume датчика за период ${analysisStartDate} - ${analysisEndDate}.`,
          analysisNotes.trim(),
        ].filter(Boolean).join(' '),
        calibration_settings_snapshot: analysisResult.analysis_settings_snapshot ?? settings,
        statistics: analysisResult.current_table_statistics ? {
          data_points_total: analysisResult.current_table_statistics.data_points_total,
          data_points_filtered: Math.max(
            0,
            analysisResult.current_table_statistics.data_points_total - analysisResult.current_table_statistics.data_points_used
          ),
          data_points_used: analysisResult.current_table_statistics.data_points_used,
          average_deviation_percent: analysisResult.current_table_statistics.rmse,
          max_deviation_percent: analysisResult.current_table_statistics.max_error,
          r_squared: analysisResult.current_table_statistics.r_squared,
          rmse: analysisResult.current_table_statistics.rmse,
        } : undefined,
      });

      setSavedCurrentTableVersion(item.version);
      onTableSaved?.();
    } catch (error) {
      setCurrentTableSaveError(error instanceof Error ? error.message : 'Не удалось сохранить текущую таблицу датчика');
    } finally {
      setIsSavingCurrentTable(false);
    }
  };

  const handleSaveCalculatedTable = async () => {
    if (!analysisResult?.success || !analysisResult.table || analysisResult.table.length === 0) {
      return;
    }

    setIsSavingCalculatedTable(true);
    setCalculatedTableSaveError(null);

    try {
      const item = await createCalibrationTable({
        tank_id: tankId,
        table: analysisResult.table,
        analysis_start_date: analysisStartDate,
        analysis_end_date: analysisEndDate,
        creation_notes: buildCalculatedTableNotes(
          analysisResult,
          analysisStartDate,
          analysisEndDate,
          analysisNotes
        ),
        calibration_settings_snapshot: analysisResult.analysis_settings_snapshot ?? settings,
        statistics: {
          data_points_total: analysisResult.diagnostics?.totalPointsBeforeFilter ?? analysisResult.debug?.calculatedTablePoints ?? 0,
          data_points_filtered: Math.max(
            0,
            (analysisResult.diagnostics?.totalPointsBeforeFilter ?? analysisResult.debug?.calculatedTablePoints ?? 0)
            - (analysisResult.diagnostics?.totalPointsAfterFilter ?? analysisResult.debug?.calculatedTableFiltered ?? 0)
          ),
          data_points_used: analysisResult.diagnostics?.totalPointsAfterFilter ?? analysisResult.debug?.calculatedTableFiltered ?? 0,
          average_deviation_percent: analysisResult.quality_metrics?.rmse ?? 0,
          max_deviation_percent: analysisResult.quality_metrics?.max_error ?? 0,
          r_squared: analysisResult.quality_metrics?.r_squared ?? 0,
          rmse: analysisResult.quality_metrics?.rmse ?? 0,
        },
        diagnostics: analysisResult.diagnostics,
      });

      setSavedCalculatedTableVersion(item.version);
      onTableSaved?.();
    } catch (error) {
      setCalculatedTableSaveError(error instanceof Error ? error.message : 'Не удалось сохранить расчетную таблицу ТРК');
    } finally {
      setIsSavingCalculatedTable(false);
    }
  };

  const analysisSettingsSnapshot = analysisResult?.analysis_settings_snapshot ?? settings;
  const suggestedDeadStockDelta = analysisResult?.geometry_input_diagnosis
    ? Math.round(analysisResult.geometry_input_diagnosis.offset_candidate_liters / 10) * 10
    : null;
  const suggestedDeadStockValue = suggestedDeadStockDelta !== null
    ? Math.max(
      0,
      Math.round((analysisSettingsSnapshot.dead_stock_liters + suggestedDeadStockDelta) / 10) * 10
    )
    : null;
  const geometryDiagnosisPattern = analysisResult?.geometry_input_diagnosis?.pattern;
  const hasMeaningfulDeadStockSuggestion = suggestedDeadStockDelta !== null
    && suggestedDeadStockValue !== null
    && Math.abs(suggestedDeadStockDelta) >= 50;
  const canApplyDeadStockSuggestion = hasMeaningfulDeadStockSuggestion
    && geometryDiagnosisPattern === 'offset'
    && suggestedDeadStockValue !== analysisSettingsSnapshot.dead_stock_liters;
  const deadStockSuggestionBlockedReason = !hasMeaningfulDeadStockSuggestion
    ? null
    : geometryDiagnosisPattern !== 'offset'
      ? 'Быстрая поправка по dead_stock здесь не главный сценарий: текущий паттерн больше похож на несоответствие масштаба рабочей емкости или формы резервуара.'
      : suggestedDeadStockValue === analysisSettingsSnapshot.dead_stock_liters
        ? suggestedDeadStockDelta! < 0 && analysisSettingsSnapshot.dead_stock_liters <= 0
          ? 'Поправка уводит dead_stock ниже 0 л, поэтому применить ее нельзя. Для этого кейса нужно проверять размеры, форму резервуара и нулевую точку, а не уменьшать остаток ниже физически допустимого.'
          : 'Рекомендованная поправка не меняет значение dead_stock после округления, поэтому быстрый пересчет не даст нового результата.'
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
            <LineChart className="h-6 w-6 text-primary dark:text-primary/70" />
            Анализ Калибровки
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Расчет таблицы на основе реальных отпусков ТРК с последующим сравнением с текущей калибровкой
            <span className="mt-2 block text-primary dark:text-blue-300 font-semibold">
              {networkName || 'Компания не выбрана'} / {stationName || 'Станция не выбрана'} / {tankName || 'Резервуар'}{fuelType ? ` (${fuelType})` : ''}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор периода */}
          <Card className="bg-card/50 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary dark:text-primary/70" />
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
                    className="mt-1.5 bg-background border-border"
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
                    className="mt-1.5 bg-background border-border"
                  />
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-md p-2.5">
                <p className="text-xs text-primary dark:text-blue-300 flex items-center gap-2">
                  <span className="text-primary dark:text-primary/70">ℹ️</span>
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
                    <SelectItem value="direct_interpolation">Прямая интерполяция (рекомендуется)</SelectItem>
                    <SelectItem value="least_squares">МНК — кубическая регрессия</SelectItem>
                    <SelectItem value="moving_average">Скользящее среднее</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-card/50 border border-border rounded-md p-2.5">
                  <p className="text-xs text-foreground/80">
                    {settings.calibration_method === 'least_squares' && (
                      <>
                        <span className="font-semibold text-green-600 dark:text-green-400">МНК:</span> Квадратичная аппроксимация (y=ax²+bx+c).
                        Хорошо описывает S-кривую цилиндра. Рекомендуется для коммерческого учёта.
                      </>
                    )}
                    {settings.calibration_method === 'moving_average' && (
                      <>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">Скользящее среднее:</span> Сглаживает колебания данных усреднением.
                        Устойчив к выбросам, хорош для данных с шумом и частыми колебаниями.
                      </>
                    )}
                    {settings.calibration_method === 'direct_interpolation' && (
                      <>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">Прямая интерполяция:</span> Кусочно-линейная между реальными точками.
                        Максимальная точность при качественных данных.
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

                    {analysisResult.geometry_model_comparison && (
                      <div className={`rounded-md border p-4 ${
                        analysisResult.geometry_model_comparison.status === 'aligned'
                          ? 'bg-green-500/10 border-green-500/20'
                          : analysisResult.geometry_model_comparison.status === 'warning'
                            ? 'bg-yellow-500/10 border-yellow-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Геометрическая модель резервуара
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Это вспомогательная модель по введенным размерам резервуара, а не поверочный эталон.
                            </p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            analysisResult.geometry_model_comparison.status === 'aligned'
                              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                              : analysisResult.geometry_model_comparison.status === 'warning'
                                ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                          }`}>
                            {analysisResult.geometry_model_comparison.title}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-3">
                          {analysisResult.geometry_model_comparison.description}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Средн. расхождение</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_model_comparison.avg_difference_liters.toFixed(1)} л
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Макс. расхождение</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_model_comparison.max_difference_liters.toFixed(1)} л
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Средн. расхождение %</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_model_comparison.avg_difference_percent.toFixed(2)}%
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Рабочих уровней</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_model_comparison.compared_points}
                            </p>
                          </div>
                        </div>
                        {typeof analysisResult.geometry_model_comparison.max_difference_level_mm === 'number' && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Максимальное расхождение модели приходится на уровень {analysisResult.geometry_model_comparison.max_difference_level_mm} мм.
                          </p>
                        )}
                      </div>
                    )}

                    {analysisResult.geometry_input_diagnosis && (
                      <div className={`rounded-md border p-4 ${
                        analysisResult.geometry_input_diagnosis.pattern === 'aligned'
                          ? 'bg-green-500/10 border-green-500/20'
                          : analysisResult.geometry_input_diagnosis.pattern === 'shape' || analysisResult.geometry_input_diagnosis.pattern === 'mixed'
                            ? 'bg-red-500/10 border-red-500/20'
                            : 'bg-yellow-500/10 border-yellow-500/20'
                      }`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Проверка введенной геометрии
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Пытаемся понять, что именно не так во введенных параметрах: dead stock, масштаб емкости или сама форма резервуара.
                            </p>
                          </div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            analysisResult.geometry_input_diagnosis.pattern === 'aligned'
                              ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                              : analysisResult.geometry_input_diagnosis.pattern === 'shape' || analysisResult.geometry_input_diagnosis.pattern === 'mixed'
                                ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                          }`}>
                            {analysisResult.geometry_input_diagnosis.title}
                          </span>
                        </div>

                        <p className="text-sm text-foreground mt-3">
                          {analysisResult.geometry_input_diagnosis.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Signed drift</p>
                            <p className={`text-lg font-semibold ${
                              analysisResult.geometry_input_diagnosis.avg_signed_difference_liters > 0
                                ? 'text-red-600 dark:text-red-400'
                                : analysisResult.geometry_input_diagnosis.avg_signed_difference_liters < 0
                                  ? 'text-primary dark:text-blue-300'
                                  : 'text-foreground'
                            }`}>
                              {analysisResult.geometry_input_diagnosis.avg_signed_difference_liters > 0 ? '+' : ''}{analysisResult.geometry_input_diagnosis.avg_signed_difference_liters.toFixed(1)} л
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Геомодель {analysisResult.geometry_input_diagnosis.avg_signed_difference_liters >= 0 ? 'выше' : 'ниже'} ТРК в среднем
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Сдвиг уровня/остатка</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_input_diagnosis.offset_candidate_liters > 0 ? '+' : ''}{analysisResult.geometry_input_diagnosis.offset_candidate_liters.toFixed(0)} л
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Если считать расхождение почти постоянным
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Масштаб емкости</p>
                            <p className="text-lg font-semibold text-foreground">
                              {(analysisResult.geometry_input_diagnosis.scale_factor * 100).toFixed(1)}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Эквивалент рабочего объема модели
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Точек анализа</p>
                            <p className="text-lg font-semibold text-foreground">
                              {analysisResult.geometry_input_diagnosis.compared_points}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Общих уровней ТРК и геомодели
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Низ резервуара</p>
                            <p className="text-lg font-semibold text-foreground">
                              {typeof analysisResult.geometry_input_diagnosis.low_zone_percent === 'number'
                                ? `${analysisResult.geometry_input_diagnosis.low_zone_percent > 0 ? '+' : ''}${analysisResult.geometry_input_diagnosis.low_zone_percent.toFixed(2)}%`
                                : '—'}
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Середина</p>
                            <p className="text-lg font-semibold text-foreground">
                              {typeof analysisResult.geometry_input_diagnosis.mid_zone_percent === 'number'
                                ? `${analysisResult.geometry_input_diagnosis.mid_zone_percent > 0 ? '+' : ''}${analysisResult.geometry_input_diagnosis.mid_zone_percent.toFixed(2)}%`
                                : '—'}
                            </p>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs text-muted-foreground mb-1">Верх резервуара</p>
                            <p className="text-lg font-semibold text-foreground">
                              {typeof analysisResult.geometry_input_diagnosis.high_zone_percent === 'number'
                                ? `${analysisResult.geometry_input_diagnosis.high_zone_percent > 0 ? '+' : ''}${analysisResult.geometry_input_diagnosis.high_zone_percent.toFixed(2)}%`
                                : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs font-medium text-foreground mb-2">Что это может значить</p>
                            <div className="space-y-1.5">
                              {analysisResult.geometry_input_diagnosis.likely_causes.map((item, index) => (
                                <p key={index} className="text-sm text-foreground/90">
                                  • {item}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="bg-background border border-border rounded-md p-3">
                            <p className="text-xs font-medium text-foreground mb-2">Что проверить в резервуаре</p>
                            <div className="space-y-1.5">
                              {analysisResult.geometry_input_diagnosis.checks.map((item, index) => (
                                <p key={index} className="text-sm text-foreground/90">
                                  • {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>

                        {canApplyDeadStockSuggestion && suggestedDeadStockDelta !== null && suggestedDeadStockValue !== null && (
                          <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Быстрая проверка гипотезы по `dead_stock`
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Текущее значение: {analysisSettingsSnapshot.dead_stock_liters.toFixed(0)} л. Рекомендуемая поправка: {suggestedDeadStockDelta > 0 ? '+' : ''}{suggestedDeadStockDelta} л.
                                  После подстановки будет {suggestedDeadStockValue.toFixed(0)} л, и анализ запустится повторно.
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={handleApplyDeadStockSuggestion}
                                disabled={isAnalyzing || isApplyingGeometrySuggestion}
                                className="md:min-w-72"
                              >
                                {isApplyingGeometrySuggestion ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Пересчет с новым dead stock...
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Применить {suggestedDeadStockDelta > 0 ? '+' : ''}{suggestedDeadStockDelta} л и пересчитать
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {deadStockSuggestionBlockedReason && (
                          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-3">
                            <p className="text-sm font-medium text-foreground">
                              Гипотеза по `dead_stock` не подходит для быстрого пересчета
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {deadStockSuggestionBlockedReason}
                            </p>
                            {suggestedDeadStockDelta !== null && suggestedDeadStockValue !== null && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Текущее значение: {analysisSettingsSnapshot.dead_stock_liters.toFixed(0)} л. Формальная поправка была бы {suggestedDeadStockDelta > 0 ? '+' : ''}{suggestedDeadStockDelta} л, что дает {suggestedDeadStockValue.toFixed(0)} л.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Покрытие текущей таблицы датчика */}
                    {(analysisResult.current_table_coverage || analysisResult.current_table_statistics) && (
                      <div className="bg-background border border-border rounded-md p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">
                              Текущая таблица датчика
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              Baseline по фактическим парам уровень → объем из истории датчика за выбранный период.
                            </p>
                            {typeof analysisResult.current_table_version === 'number' && (
                              <p className="text-xs text-primary dark:text-blue-300 mt-2">
                                Активная версия в системе: v{analysisResult.current_table_version}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            onClick={handleSaveCurrentTable}
                            disabled={
                              isSavingCurrentTable
                              || !analysisResult.current_table
                              || analysisResult.current_table.length === 0
                            }
                            className="md:min-w-56"
                          >
                            {isSavingCurrentTable ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Сохранение baseline...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить текущую таблицу
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                          {analysisResult.current_table_coverage && (
                            <>
                              <div className="bg-card border border-border rounded-md p-3">
                                <p className="text-xs text-muted-foreground mb-1">Покрытие диапазона</p>
                                <p className="text-lg font-semibold text-foreground">
                                  {analysisResult.current_table_coverage.range_coverage_percent.toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-card border border-border rounded-md p-3">
                                <p className="text-xs text-muted-foreground mb-1">Покрытие корзин</p>
                                <p className="text-lg font-semibold text-foreground">
                                  {analysisResult.current_table_coverage.bucket_coverage_percent.toFixed(1)}%
                                </p>
                              </div>
                              <div className="bg-card border border-border rounded-md p-3">
                                <p className="text-xs text-muted-foreground mb-1">Диапазон уровней</p>
                                <p className="text-lg font-semibold text-foreground">
                                  {(analysisResult.current_table_coverage.observed_range_mm / 10).toFixed(1)} см
                                </p>
                              </div>
                              <div className="bg-card border border-border rounded-md p-3">
                                <p className="text-xs text-muted-foreground mb-1">Корзин занято</p>
                                <p className="text-lg font-semibold text-foreground">
                                  {analysisResult.current_table_coverage.buckets_covered}/{analysisResult.current_table_coverage.total_buckets}
                                </p>
                              </div>
                              <div className="bg-card border border-border rounded-md p-3">
                                <p className="text-xs text-muted-foreground mb-1">Замеров датчика</p>
                                <p className="text-lg font-semibold text-foreground">
                                  {analysisResult.current_table_coverage.valid_measurements}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {analysisResult.current_table_statistics && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">Точек в baseline</p>
                              <p className="text-lg font-semibold text-foreground">
                                {analysisResult.current_table_statistics.table_points}
                              </p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">После фильтрации</p>
                              <p className="text-lg font-semibold text-foreground">
                                {analysisResult.current_table_statistics.data_points_used}
                              </p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">R² baseline</p>
                              <p className="text-lg font-semibold text-foreground">
                                {analysisResult.current_table_statistics.r_squared.toFixed(4)}
                              </p>
                            </div>
                            <div className="bg-card border border-border rounded-md p-3">
                              <p className="text-xs text-muted-foreground mb-1">RMSE baseline</p>
                              <p className="text-lg font-semibold text-foreground">
                                {analysisResult.current_table_statistics.rmse.toFixed(2)} л
                              </p>
                            </div>
                          </div>
                        )}

                        {(savedCurrentTableVersion || currentTableSaveError) && (
                          <div className={`mt-3 rounded-md border p-3 text-sm ${
                            savedCurrentTableVersion
                              ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
                              : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                          }`}>
                            {savedCurrentTableVersion
                              ? `Baseline датчика сохранен как версия v${savedCurrentTableVersion}.`
                              : currentTableSaveError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Рекомендация по качеству данных */}
                    {analysisResult.recommendation && (
                      <div className={`rounded-md border p-4 ${
                        analysisResult.recommendation.status === 'ready_for_approval'
                          ? 'bg-green-500/10 border-green-500/20'
                          : analysisResult.recommendation.status === 'review_required'
                            ? 'bg-yellow-500/10 border-yellow-500/20'
                            : 'bg-red-500/10 border-red-500/20'
                      }`}>
                        <h4 className={`text-sm font-semibold ${
                          analysisResult.recommendation.status === 'ready_for_approval'
                            ? 'text-green-700 dark:text-green-300'
                            : analysisResult.recommendation.status === 'review_required'
                              ? 'text-yellow-700 dark:text-yellow-300'
                              : 'text-red-700 dark:text-red-300'
                        }`}>
                          {analysisResult.recommendation.title}
                        </h4>
                        <p className="text-sm text-foreground mt-1">
                          {analysisResult.recommendation.description}
                        </p>
                        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
                          <Button
                            onClick={handleSaveCalculatedTable}
                            disabled={
                              isSavingCalculatedTable
                              || !analysisResult.table
                              || analysisResult.table.length === 0
                            }
                            className="md:min-w-72"
                          >
                            {isSavingCalculatedTable ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Сохранение draft ТРК...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Сохранить расчетную таблицу ТРК
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Сохранит draft-версию с verdict, покрытием датчика и метриками сравнения в notes.
                          </p>
                        </div>
                        {analysisResult.recommendation.reasons.length > 0 && (
                          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                            {analysisResult.recommendation.reasons.map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        )}
                        {(savedCalculatedTableVersion || calculatedTableSaveError) && (
                          <div className={`mt-3 rounded-md border p-3 text-sm ${
                            savedCalculatedTableVersion
                              ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300'
                              : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                          }`}>
                            {savedCalculatedTableVersion
                              ? `Расчетная ТРК-таблица сохранена как draft-версия v${savedCalculatedTableVersion}.`
                              : calculatedTableSaveError}
                          </div>
                        )}
                      </div>
                    )}

                    {(analysisResult.debug || analysisResult.diagnostics) && (
                      <details className="rounded-md border border-border bg-muted/20 p-3">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          Технические подробности
                        </summary>
                        <div className="mt-3 space-y-3">
                          {analysisResult.debug && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-300 mb-2">Отладочная информация</p>
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
                                    <strong className="text-yellow-600 dark:text-yellow-300">Сравнение объемов (датчик vs ТРК):</strong>
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

                          {analysisResult.diagnostics && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3">
                              <p className="text-sm font-semibold text-purple-600 dark:text-purple-300 mb-2">Диагностика алгоритма</p>
                              <div className="grid grid-cols-2 gap-2 text-xs text-purple-700 dark:text-purple-200">
                                <div>Сегментов обработано: <strong>{analysisResult.diagnostics.segmentsCount}</strong></div>
                                <div>Поступлений учтено: <strong>{analysisResult.diagnostics.receiptsProcessed}</strong></div>
                                <div>Точек до фильтрации: <strong>{analysisResult.diagnostics.totalPointsBeforeFilter}</strong></div>
                                <div>Точек после фильтрации: <strong>{analysisResult.diagnostics.totalPointsAfterFilter}</strong></div>
                                <div>Транзакций обработано: <strong>{analysisResult.diagnostics.transactionsProcessed}</strong></div>
                                <div>Отфильтровано (слепые зоны): <strong>{analysisResult.diagnostics.blindZonesFiltered}</strong></div>
                                <div className="col-span-2">
                                  Температурная коррекция: <strong>{analysisResult.diagnostics.temperatureCorrectionApplied ? 'Применена' : 'Не применена'}</strong>
                                </div>
                              </div>

                              {analysisResult.diagnostics.warnings && analysisResult.diagnostics.warnings.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-purple-500/20">
                                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-300 mb-2">Предупреждения ({analysisResult.diagnostics.warnings.length})</p>
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
                        </div>
                      </details>
                    )}

                    {/* Информация о версии текущей таблицы */}
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
                      <p className="text-sm text-primary dark:text-blue-300">
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
                                  name === 'geometric_volume'
                                    ? '🟢 Геометрическая модель'
                                    : name === 'trk_volume'
                                      ? '🔵 Калибровка ТРК'
                                      : '🟠 Датчик (текущий)'
                                ]}
                                labelFormatter={(label) => `Уровень: ${label} мм`}
                              />
                              <Legend
                                wrapperStyle={{ color: 'hsl(var(--muted-foreground))' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="geometric_volume"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 2 }}
                                activeDot={{ r: 5 }}
                                name="Геометрическая модель"
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
                            🟢 <strong>Зеленая</strong> — геометрическая модель по размерам резервуара,
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
                        .filter((p: CalibrationComparison) => p.current_volume !== undefined && p.current_volume > 0 && p.trk_volume !== undefined && p.trk_volume > 0)
                        .map((p: CalibrationComparison) => ({
                          level_mm: p.level_mm,
                          diff_liters: Math.round(p.trk_volume! - p.current_volume!),
                          diff_percent: ((p.trk_volume! - p.current_volume!) / p.current_volume! * 100)
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
                            <th className="px-3 py-2 text-right text-foreground/80 font-medium">ТРК (л)</th>
                            <th className="px-3 py-2 text-right text-foreground/80 font-medium">Геомодель (л)</th>
                            <th className="px-3 py-2 text-right text-foreground/80 font-medium">ТРК - Датчик (л)</th>
                            <th className="px-3 py-2 text-right text-foreground/80 font-medium">ТРК - Датчик (%)</th>
                              </tr>
                            </thead>
                            <tbody className="bg-background">
                              {analysisResult.comparison.map((row, idx) => (
                                <tr
                                  key={idx}
                                  className={`border-t border-border ${row.difference_percent !== undefined && Math.abs(row.difference_percent) > 1 ? 'bg-red-500/10' :
                                      row.difference_percent !== undefined && Math.abs(row.difference_percent) > 0.5 ? 'bg-yellow-500/10' :
                                        ''
                                    }`}
                                >
                                  <td className="px-3 py-2 text-foreground">{row.level_mm}</td>
                                  <td className="px-3 py-2 text-right text-foreground">
                                    {row.current_volume?.toFixed(2) ?? '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-foreground">
                                    {row.trk_volume?.toFixed(2) ?? '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right text-foreground">
                                    {row.geometric_volume.toFixed(2)}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-medium ${row.difference !== undefined && Math.abs(row.difference) > 50 ? 'text-red-600 dark:text-red-400' :
                                      row.difference !== undefined && Math.abs(row.difference) > 20 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {row.difference !== undefined ? `${row.difference > 0 ? '+' : ''}${row.difference.toFixed(2)}` : '—'}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-medium ${row.difference_percent !== undefined && Math.abs(row.difference_percent) > 1 ? 'text-red-600 dark:text-red-400' :
                                      row.difference_percent !== undefined && Math.abs(row.difference_percent) > 0.5 ? 'text-yellow-600 dark:text-yellow-400' :
                                        'text-green-600 dark:text-green-400'
                                    }`}>
                                    {row.difference_percent !== undefined ? `${row.difference_percent > 0 ? '+' : ''}${row.difference_percent.toFixed(3)}%` : '—'}
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
                      <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                        <p className="text-sm text-primary dark:text-blue-300">
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
