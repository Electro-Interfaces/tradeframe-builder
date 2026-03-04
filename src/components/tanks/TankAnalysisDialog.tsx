/**
 * Диалог детального анализа резервуара с графиками
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LabelList
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Droplets, Thermometer, Gauge, Fuel, Activity, AlertTriangle } from 'lucide-react';
import type { Tank, TankHistoryRecord, TankHistoryStats, AnalysisPeriod, TransactionV2Response, ReceiptResponse } from '@/types/tanks';
import { getTankAnalysis, getPeriodDates } from '@/services/tankHistoryService';
import { getBookData } from '@/services/tankBookService';
import { useSelection } from '@/contexts/SelectionContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  normalizeTransactions,
  normalizeReceipts,
  calculateInitialValues,
  calculateChartData,
  recalculateVolumeBookStats,
  detectAnomalies,
  type DetectedAnomaly,
  type AnomalySeverity
} from '@/services/tankAnalysisCalculations';

interface TankAnalysisDialogProps {
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AnalysisStatus = 'ok' | 'warning' | 'danger';

interface AnalysisItem {
  title: string;
  text: string;
  status: AnalysisStatus;
  icon: React.ReactNode;
}

function generateTankAnalysis(
  computedStats: TankHistoryStats,
  releaseTotals: { actual: number; book: number },
  bookReceipts: number,
  period: AnalysisPeriod,
  tank: Tank,
  chartDataLength: number
): AnalysisItem[] {
  const items: AnalysisItem[] = [];
  const periodDays = period === '24h' ? 1 : period === '7d' ? 7 : 30;

  // 1. Баланс резервуара
  const diff = releaseTotals.actual - releaseTotals.book;
  const diffPct = releaseTotals.book > 0 ? (diff / releaseTotals.book) * 100 : 0;
  const balanceStatus: AnalysisStatus = Math.abs(diffPct) < 1 ? 'ok' : Math.abs(diffPct) < 3 ? 'warning' : 'danger';
  items.push({
    title: 'Баланс реализации',
    text: `Разница факт/книга: ${diff >= 0 ? '+' : ''}${diff.toFixed(0)} л (${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(2)}%) — ${balanceStatus === 'ok' ? 'в норме' : balanceStatus === 'warning' ? 'требует внимания' : 'критическое отклонение'}`,
    status: balanceStatus,
    icon: <Activity className="w-4 h-4" />
  });

  // 2. Запас топлива
  const avgDailyRelease = releaseTotals.actual / periodDays;
  const currentVolume = computedStats.volume.current;
  const daysLeft = avgDailyRelease > 0 ? currentVolume / avgDailyRelease : Infinity;
  const supplyStatus: AnalysisStatus = daysLeft > 3 ? 'ok' : daysLeft > 1 ? 'warning' : 'danger';
  items.push({
    title: 'Запас топлива',
    text: `Остаток: ${currentVolume.toFixed(0)} л. ${avgDailyRelease > 0 ? `При расходе ~${avgDailyRelease.toFixed(0)} л/день — запас на ~${daysLeft === Infinity ? '∞' : daysLeft.toFixed(1)} дн.` : 'Нет данных о расходе'}`,
    status: supplyStatus,
    icon: <Fuel className="w-4 h-4" />
  });

  // 3. Температурный режим
  const temp = computedStats.temperature;
  const fuelType = tank.fuelType?.toLowerCase() || '';
  const isDiesel = fuelType.includes('дт') || fuelType.includes('диз');
  const tempStatus: AnalysisStatus = isDiesel && temp.current < -20 ? 'danger' : temp.current < -15 ? 'warning' : 'ok';
  items.push({
    title: 'Температурный режим',
    text: `Текущая: ${temp.current.toFixed(1)}°C, диапазон ${temp.min.toFixed(1)}..${temp.max.toFixed(1)}°C${isDiesel && temp.current < -15 ? ' — риск парафинизации ДТ' : ''}`,
    status: tempStatus,
    icon: <Thermometer className="w-4 h-4" />
  });

  // 4. Плотность
  const density = computedStats.density;
  const densityDelta = Math.abs(density.current - density.avg);
  const densityStatus: AnalysisStatus = densityDelta < 2 ? 'ok' : densityDelta < 5 ? 'warning' : 'danger';
  items.push({
    title: 'Плотность',
    text: `Текущая: ${density.current.toFixed(1)} кг/м³, средняя: ${density.avg.toFixed(1)} кг/м³. Отклонение: ${densityDelta.toFixed(1)} кг/м³`,
    status: densityStatus,
    icon: <Gauge className="w-4 h-4" />
  });

  // 5. Подтоварная вода
  const water = computedStats.waterLevel;
  const waterStatus: AnalysisStatus = water.current < 0.5 ? 'ok' : water.current < 1.0 ? 'warning' : 'danger';
  items.push({
    title: 'Подтоварная вода',
    text: `Уровень: ${water.current.toFixed(2)} см${water.max > 0 ? `, макс за период: ${water.max.toFixed(2)} см` : ''}. ${waterStatus === 'ok' ? 'В норме' : waterStatus === 'warning' ? 'Повышенный уровень' : 'Критический уровень — требуется откачка'}`,
    status: waterStatus,
    icon: <Droplets className="w-4 h-4" />
  });

  // 6. Интенсивность продаж
  const avgHourly = avgDailyRelease / 24;
  items.push({
    title: 'Интенсивность продаж',
    text: `Средняя реализация: ~${avgDailyRelease.toFixed(0)} л/день (~${avgHourly.toFixed(0)} л/час). Поступления за период: ${bookReceipts > 0 ? bookReceipts.toFixed(0) + ' л' : 'нет'}`,
    status: 'ok',
    icon: <Activity className="w-4 h-4" />
  });

  return items;
}

const statusConfig: Record<AnalysisStatus, { dot: string; bg: string }> = {
  ok: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/5' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-500/5' },
  danger: { dot: 'bg-red-500', bg: 'bg-red-500/5' }
};

function TankAnalysisPanel({ items }: { items: AnalysisItem[] }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-secondary px-2.5 py-1 border-b border-border">
        <span className="text-[11px] font-medium text-muted-foreground">Анализ</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item, i) => {
          const cfg = statusConfig[item.status];
          return (
            <div key={i} className={`px-2.5 py-1.5 ${cfg.bg}`}>
              <div className="flex items-start gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0 mt-[3px]`} />
                <div className="min-w-0">
                  <span className="text-[11px] font-medium text-foreground">{item.title}: </span>
                  <span className="text-[11px] text-foreground/60 leading-tight">{item.text}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const anomalySeverityConfig: Record<AnomalySeverity, { icon: string; border: string; bg: string; text: string }> = {
  info: { icon: 'text-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-700 dark:text-blue-300' },
  warning: { icon: 'text-amber-500', border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-700 dark:text-amber-300' },
  critical: { icon: 'text-red-500', border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-700 dark:text-red-300' }
};

function AnomalyDetail({ anomaly }: { anomaly: DetectedAnomaly }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = anomalySeverityConfig[anomaly.severity];

  return (
    <div className={`px-2.5 py-2 ${cfg.bg}`}>
      <div
        className="flex items-start gap-1.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <AlertTriangle className={`w-3 h-3 shrink-0 mt-[1px] ${cfg.icon}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-foreground">{anomaly.title}</span>
            <span className="text-[10px] text-muted-foreground">{anomaly.timeRange.from} — {anomaly.timeRange.to}</span>
            <span className="text-[10px] text-muted-foreground/60 ml-auto">{expanded ? '▾' : '▸'}</span>
          </div>
          <p className="text-[11px] text-foreground/60 leading-tight mt-0.5">{anomaly.description}</p>
        </div>
      </div>

      {expanded && (
        <div className="ml-4.5 mt-2 space-y-2">
          {anomaly.causes?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">Возможные причины:</p>
              <ul className="space-y-0.5">
                {anomaly.causes.map((cause, j) => (
                  <li key={j} className="text-[10px] text-foreground/60 leading-tight flex gap-1">
                    <span className="shrink-0 text-foreground/40">{j + 1}.</span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {anomaly.actions?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-foreground/80 mb-0.5">Что проверить:</p>
              <ul className="space-y-0.5">
                {anomaly.actions.map((action, j) => (
                  <li key={j} className="text-[10px] text-foreground/60 leading-tight flex gap-1">
                    <span className="shrink-0">→</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AnomaliesPanel({ anomalies }: { anomalies: DetectedAnomaly[] }) {
  if (anomalies.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden md:shrink-0">
      <div className="bg-secondary px-2.5 py-1 border-b border-border flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3 text-amber-500" />
        <span className="text-[11px] font-medium text-muted-foreground">
          Аномалии ({anomalies.length})
        </span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">нажмите для деталей</span>
      </div>
      <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
        {anomalies.map((anomaly, i) => (
          <AnomalyDetail key={i} anomaly={anomaly} />
        ))}
      </div>
    </div>
  );
}

// Быстрые фильтры периодов
const PERIOD_FILTERS: { value: AnalysisPeriod; label: string }[] = [
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' }
];

export function TankAnalysisDialog({ tank, open, onOpenChange }: TankAnalysisDialogProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 260 : 380;
  // Используем selectedStation из контекста - там уже есть external_id
  const { selectedNetwork, selectedStation } = useSelection();
  const [period, setPeriod] = useState<AnalysisPeriod>('7d');
  const [history, setHistory] = useState<TankHistoryRecord[]>([]);
  const [stats, setStats] = useState<TankHistoryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Прогресс загрузки
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<{
    tankHistory: boolean;
    transactions: boolean;
    receipts: boolean;
  }>({ tankHistory: false, transactions: false, receipts: false });

  // Данные для книжной реализации
  const [transactions, setTransactions] = useState<TransactionV2Response | null>(null);
  const [receipts, setReceipts] = useState<ReceiptResponse | null>(null);
  const [bookRelease, setBookRelease] = useState<number>(0);
  const [bookReceipts, setBookReceipts] = useState<number>(0);
  const [periodDates, setPeriodDates] = useState<{ dt_beg: string; dt_end: string } | null>(null);

  // Загрузка данных
  const loadHistory = async () => {
    if (!selectedNetwork?.external_id) {
      setError('Не выбрана сеть с external_id');
      return;
    }

    if (!selectedStation?.external_id) {
      setError('У торговой точки отсутствует external_id');
      return;
    }

    // Получаем номер резервуара
    const tankNumber = typeof tank.id === 'number' ? tank.id : parseInt(tank.id.toString());

    setLoading(true);
    setError(null);
    setLoadingStage('Подготовка запросов...');
    setLoadingProgress({ tankHistory: false, transactions: false, receipts: false });

    try {
      // Вычисляем даты периода
      const dates = getPeriodDates(period);
      setPeriodDates(dates); // Сохраняем для использования в нормализации

      const params = {
        system: parseInt(selectedNetwork.external_id),
        station: parseInt(selectedStation.external_id),
        tank: tankNumber,
        dt_beg: dates.dt_beg,
        dt_end: dates.dt_end
      };

      setLoadingStage('Загрузка данных с сервера...');

      // Код топлива из STS данных резервуара (маппинг tank в транзакциях ≠ физическим резервуарам)
      const fuelCode = tank.apiData?.fuel ?? tank.stsData?.fuelCode ?? 0;

      // Параллельно загружаем историю резервуара, транзакции и поступления
      const [historyResult, bookData] = await Promise.all([
        getTankAnalysis(params, tankNumber).then(result => {
          setLoadingProgress(prev => ({ ...prev, tankHistory: true }));
          // Если fuelCode не был в stsData, берём из первой записи history
          return result;
        }),
        getBookData(params, tankNumber, fuelCode).then(result => {
          setLoadingProgress(prev => ({ ...prev, transactions: true, receipts: true }));
          return result;
        })
      ]);

      setLoadingStage('Обработка данных...');

      // Если fuelCode не был доступен из stsData, пересчитываем bookRelease с fuel из history
      let finalBookRelease = bookData.bookRelease;
      if (!fuelCode && historyResult.history.length > 0) {
        const historyFuelCode = historyResult.history[0].fuel;
        if (historyFuelCode) {
          const { calculateBookReleaseFromTransactions } = await import('@/services/tankBookService');
          finalBookRelease = calculateBookReleaseFromTransactions(bookData.transactions, historyFuelCode);
        }
      }

      setHistory(historyResult.history);
      setStats(historyResult.stats);
      setTransactions(bookData.transactions);
      setReceipts(bookData.receipts);
      setBookRelease(finalBookRelease);
      setBookReceipts(bookData.bookReceipts);

    } catch (err) {
      console.error('❌ Ошибка загрузки данных анализа:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при открытии диалога, смене периода или станции
  useEffect(() => {
    // Предотвращаем повторные вызовы если уже идет загрузка
    if (open && selectedStation?.external_id && !loading) {
      loadHistory();
    }
  }, [open, period, selectedStation?.external_id]);

  const tankNumber = typeof tank.id === 'number' ? tank.id : parseInt(tank.id.toString());
  // Код топлива для фильтрации транзакций (из apiData.fuel, stsData или из первой записи history)
  const fuelCode = (tank.apiData?.fuel ?? tank.stsData?.fuelCode) || (history.length > 0 ? history[0].fuel : 0);

  // Мемоизация тяжёлых вычислений — пересчёт только при изменении данных
  const { chartData, minusaChartData, computedStats, releaseTotals, anomalies } = useMemo(() => {
    if (!history.length) {
      return { chartData: [], minusaChartData: [], computedStats: stats, releaseTotals: { actual: 0, book: 0 }, anomalies: [] };
    }

    const normTx = normalizeTransactions(transactions, fuelCode, periodDates?.dt_beg, periodDates?.dt_end);
    const normRcp = normalizeReceipts(receipts, tankNumber, periodDates?.dt_beg, periodDates?.dt_end);
    const initVals = calculateInitialValues(history[0], normTx, normRcp);
    const chart = calculateChartData(history, normTx, normRcp, initVals);
    const volumeBookStats = recalculateVolumeBookStats(chart);
    const minusa = chart.map(point => ({
      ...point,
      minusa: point.releaseBook - point.releaseActual
    }));

    // Итоговые значения реализации из последней точки графика (согласованы с графиком)
    const lastPoint = chart[chart.length - 1];
    const totals = {
      actual: lastPoint?.releaseActual ?? 0,
      book: lastPoint?.releaseBook ?? 0
    };

    // Создаём новый объект stats с обновлённым volumeBook (без мутации)
    const updatedStats = stats ? { ...stats, volumeBook: volumeBookStats } : stats;

    // Обнаружение аномалий
    const detected = detectAnomalies(chart, history);

    return { chartData: chart, minusaChartData: minusa, computedStats: updatedStats, releaseTotals: totals, anomalies: detected };
  }, [history, transactions, receipts, stats, tankNumber, fuelCode, periodDates?.dt_beg, periodDates?.dt_end]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto md:h-[90vh] md:overflow-hidden md:flex md:flex-col md:gap-2 bg-background text-foreground">
        <DialogHeader className="md:shrink-0 pb-0">
          <DialogTitle className="text-base md:text-lg flex items-center gap-2">
            {tank.name}
            <Badge variant="outline" className="text-xs font-medium">
              {tank.fuelType}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Анализ динамики резервуара за выбранный период
          </DialogDescription>
        </DialogHeader>

        {/* Фильтры периода */}
        <div className="flex flex-wrap items-center gap-1.5 md:shrink-0">
          {PERIOD_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={period === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(filter.value)}
              disabled={loading}
              className="h-7 text-xs px-3"
            >
              {filter.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
            className="ml-auto h-7 text-xs px-3"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Состояние загрузки/ошибки */}
        {loading && (
          <div className="flex flex-col justify-center items-center flex-1 min-h-0 gap-3">
            <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-foreground/80 text-xs mb-2">{loadingStage}</p>
              <div className="flex gap-4 text-[11px]">
                <div className={`flex items-center gap-1.5 ${loadingProgress.tankHistory ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.tankHistory ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  История
                </div>
                <div className={`flex items-center gap-1.5 ${loadingProgress.transactions ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.transactions ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  Транзакции
                </div>
                <div className={`flex items-center gap-1.5 ${loadingProgress.receipts ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.receipts ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  Поступления
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-600 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Основной контент: 2 колонки — левая (статистика+анализ), правая (аномалии+графики) */}
        {!loading && !error && computedStats && (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(280px,340px)_1fr] gap-3 md:flex-1 md:min-h-0 md:overflow-hidden">

            {/* ═══ Левая колонка: Статистика + Анализ ═══ */}
            <div className="flex flex-col gap-3 md:overflow-y-auto">
              {/* Таблица показателей */}
              <div className="overflow-x-auto">
                <div className="border border-border rounded-lg overflow-hidden w-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary">
                        <th className="text-left py-1 px-2.5 text-[11px] font-medium text-muted-foreground">Показатель</th>
                        <th className="text-right py-1 px-2.5 text-[11px] font-medium text-muted-foreground">Текущее</th>
                        <th className="text-center py-1 px-1 text-[11px] font-medium text-muted-foreground w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Факт. остаток</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{computedStats.volume.current.toFixed(0)} л</td>
                        <td className="py-1 px-1 text-center">
                          {computedStats.volume.current > computedStats.volume.avg ? (
                            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                          ) : computedStats.volume.current < computedStats.volume.avg ? (
                            <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Книж. остаток</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{(computedStats.volumeBook?.current || 0).toFixed(0)} л</td>
                        <td className="py-1 px-1 text-center">
                          {(computedStats.volumeBook?.current || 0) > (computedStats.volumeBook?.avg || 0) ? (
                            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                          ) : (computedStats.volumeBook?.current || 0) < (computedStats.volumeBook?.avg || 0) ? (
                            <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Температура</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{computedStats.temperature.current.toFixed(1)} °C</td>
                        <td className="py-1 px-1 text-center">
                          {computedStats.temperature.current > computedStats.temperature.avg ? (
                            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                          ) : computedStats.temperature.current < computedStats.temperature.avg ? (
                            <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Плотность</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{computedStats.density.current.toFixed(1)} кг/м³</td>
                        <td className="py-1 px-1 text-center">
                          {computedStats.density.current > computedStats.density.avg ? (
                            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                          ) : computedStats.density.current < computedStats.density.avg ? (
                            <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Уровень воды</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{computedStats.waterLevel.current.toFixed(2)} см</td>
                        <td className="py-1 px-1 text-center">
                          {computedStats.waterLevel.current > computedStats.waterLevel.avg ? (
                            <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                          ) : computedStats.waterLevel.current < computedStats.waterLevel.avg ? (
                            <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Факт. реализация</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{releaseTotals.actual.toFixed(0)} л</td>
                        <td className="py-1 px-1 text-center"><Minus className="w-3 h-3 text-muted-foreground mx-auto" /></td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Книж. реализация</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-foreground text-[11px]">{releaseTotals.book.toFixed(0)} л</td>
                        <td className="py-1 px-1 text-center"><Minus className="w-3 h-3 text-muted-foreground mx-auto" /></td>
                      </tr>
                      <tr className="hover:bg-secondary/50">
                        <td className="py-1 px-2.5 text-foreground/80 text-[11px]">Поступления</td>
                        <td className="py-1 px-2.5 text-right font-semibold text-cyan-600 dark:text-cyan-400 text-[11px]">{(bookReceipts || 0).toFixed(0)} л</td>
                        <td className="py-1 px-1 text-center">
                          {bookReceipts > 0 ? (
                            <TrendingUp className="w-3 h-3 text-cyan-600 dark:text-cyan-400 mx-auto" />
                          ) : (
                            <Minus className="w-3 h-3 text-muted-foreground mx-auto" />
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-secondary/50 bg-secondary/30">
                        <td className="py-1 px-2.5 text-foreground/80 font-semibold text-[11px]">Разница (факт - книга)</td>
                        <td className="py-1 px-2.5 text-right font-bold text-[11px]">
                          {(() => {
                            const difference = releaseTotals.actual - releaseTotals.book;
                            const isPositive = difference >= 0;
                            return (
                              <span className={isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {isPositive ? '+' : ''}{difference.toFixed(0)} л
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-1 px-1 text-center">
                          {(() => {
                            const difference = releaseTotals.actual - releaseTotals.book;
                            return difference >= 0 ? (
                              <TrendingUp className="w-3 h-3 text-green-600 dark:text-green-400 mx-auto" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400 mx-auto" />
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Панель анализа */}
              <TankAnalysisPanel
                items={generateTankAnalysis(computedStats, releaseTotals, bookReceipts, period, tank, chartData.length)}
              />
            </div>

            {/* ═══ Правая колонка: Аномалии + Графики ═══ */}
            <div className="flex flex-col gap-3 md:overflow-y-auto">
              {/* Блок аномалий */}
              {anomalies.length > 0 && (
                <AnomaliesPanel anomalies={anomalies} />
              )}

              {/* Графики */}
              {chartData.length > 0 && (
                <Tabs defaultValue="release" className="w-full">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1 w-full bg-card h-auto p-1 md:shrink-0">
              <TabsTrigger value="release" className="text-xs">Реализация</TabsTrigger>
              <TabsTrigger value="minusa" className="text-xs">Погрешность</TabsTrigger>
              <TabsTrigger value="volume" className="text-xs">Остатки</TabsTrigger>
              <TabsTrigger value="temperature" className="text-xs">Температура</TabsTrigger>
              <TabsTrigger value="density" className="text-xs">Плотность</TabsTrigger>
              <TabsTrigger value="water" className="text-xs">Вода</TabsTrigger>
            </TabsList>

            {/* График остатков */}
            <TabsContent value="volume" className="mt-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="volumeActualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="volumeBookGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'Объем (л)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="volumeActual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#volumeActualGradient)"
                    name="Фактический остаток"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="volumeBook"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="url(#volumeBookGradient)"
                    name="Книжный остаток"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* График температуры */}
            <TabsContent value="temperature" className="mt-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#temperatureGradient)"
                    name="Температура"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* График плотности */}
            <TabsContent value="density" className="mt-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'Плотность (кг/м³)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                    domain={[
                      (dataMin: number) => Math.floor(dataMin - 2),
                      (dataMax: number) => Math.ceil(dataMax + 2)
                    ]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="density"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#densityGradient)"
                    name="Плотность"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* График уровня воды */}
            <TabsContent value="water" className="mt-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    label={{ value: 'Уровень воды (см)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '4px', fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="waterLevel"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#waterGradient)"
                    name="Уровень воды"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* График реализации */}
            <TabsContent value="release" className="mt-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Литры', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return value.toFixed(2) + ' л';
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="releaseActual"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    strokeWidth={1}
                    name="Фактическая реализация (л)"
                  />
                  <Area
                    type="stepAfter"
                    dataKey="releaseBook"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Книжная реализация (л)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

            {/* График Погрешности - разница между книгой и фактом */}
            <TabsContent value="minusa" className="mt-2">
              <div className="mb-1 px-3 py-1.5 bg-card rounded border border-border">
                <p className="text-[11px] text-foreground/70">
                  <span className="font-medium">Погрешность:</span> книжная - фактическая реализация. Положительные — недоучет, отрицательные — переучет.
                </p>
              </div>

              <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
                <AreaChart data={minusaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="time"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Литры (разница)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return value.toFixed(2) + ' л';
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="minusa"
                    stroke="#a855f7"
                    fill="#a855f7"
                    fillOpacity={0.3}
                    strokeWidth={1}
                    name="Погрешность учета (л)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>

          </Tabs>
              )}
            </div>
          </div>
        )}

        {!loading && !error && chartData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
            Нет данных за выбранный период
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
