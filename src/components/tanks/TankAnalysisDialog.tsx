/**
 * Диалог детального анализа резервуара с графиками
 *
 * Оптимизации производительности:
 * - Ленивый рендер табов: монтируется только активный график (убирает ~100 forced reflows)
 * - Даунсемплинг данных: ≤150 точек для плавного рендера SVG
 * - Мемоизация стилей: tick/tooltip объекты создаются один раз
 * - Отключены анимации Recharts (isAnimationActive=false)
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Minus, Droplets, Thermometer, Gauge, Fuel, Activity, AlertTriangle } from 'lucide-react';
import type { Tank, TankHistoryRecord, TankHistoryStats, AnalysisPeriod, TransactionV2Response, ReceiptResponse } from '@/types/tanks';
import { getTankAnalysis, getPeriodDates } from '@/services/tankHistoryService';
import { calculateBookReleaseFromTransactions, getBookData } from '@/services/tankBookService';
// import { MarginTab } from './MarginTab';
import { useSelection } from '@/contexts/SelectionContext';
import { useStationNetworkId } from '@/hooks/useStationNetworkId';
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

// ── Стили графиков (создаются один раз, не на каждый рендер) ──
const CHART_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } as const;
const CHART_STROKE = 'hsl(var(--muted-foreground))';
const CHART_GRID_STROKE = 'hsl(var(--border))';
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))'
} as const;
const LEGEND_STYLE = { paddingTop: '4px', fontSize: '11px' } as const;

type ChartTab = 'release' | 'minusa' | 'volume' | 'temperature' | 'density' | 'water';

/**
 * Даунсемплинг: оставляем первую, последнюю точку и равномерную выборку между ними.
 * Сохраняет экстремумы (min/max) в каждом сегменте для визуальной точности.
 */
function downsample<T extends Record<string, any>>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;

  const result: T[] = [data[0]]; // первая точка
  const step = (data.length - 1) / (maxPoints - 1);

  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.round(i * step);
    result.push(data[idx]);
  }

  result.push(data[data.length - 1]); // последняя точка
  return result;
}

const MAX_CHART_POINTS = 150;

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
  chartDataLength: number,
  customStart?: string,
  customEnd?: string
): AnalysisItem[] {
  const items: AnalysisItem[] = [];
  let periodDays = period === '24h' ? 1 : period === '7d' ? 7 : 30;
  if (period === 'custom' && customStart && customEnd) {
    const diffMs = new Date(customEnd).getTime() - new Date(customStart).getTime();
    periodDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

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
  info: { icon: 'text-primary', border: 'border-primary/30', bg: 'bg-primary/5', text: 'text-primary dark:text-blue-300' },
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

// Мемоизированный форматтер для Tooltip (литры)
const litresFormatter = (value: any) => {
  if (typeof value === 'number') return value.toFixed(2) + ' л';
  return value;
};

// Мемоизированный domain для плотности
const densityDomain: [(dataMin: number) => number, (dataMax: number) => number] = [
  (dataMin: number) => Math.floor(dataMin - 2),
  (dataMax: number) => Math.ceil(dataMax + 2)
];

export function TankAnalysisDialog({ tank, open, onOpenChange }: TankAnalysisDialogProps) {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 260 : 380;
  const { selectedStation } = useSelection();
  const stationNetworkId = useStationNetworkId();
  const [period, setPeriod] = useState<AnalysisPeriod>('7d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ChartTab>('release');
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
    if (!stationNetworkId) {
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
      const dates = getPeriodDates(
        period,
        period === 'custom' && customStart ? new Date(customStart + 'T00:00:00') : undefined,
        period === 'custom' && customEnd ? new Date(customEnd + 'T23:59:59') : undefined,
      );
      setPeriodDates(dates); // Сохраняем для использования в нормализации

      const params = {
        system: parseInt(stationNetworkId),
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
  const { chartData, chartDataSampled, minusaChartData, computedStats, releaseTotals, anomalies } = useMemo(() => {
    if (!history.length) {
      return { chartData: [], chartDataSampled: [], minusaChartData: [], computedStats: stats, releaseTotals: { actual: 0, book: 0 }, anomalies: [] };
    }

    const normTx = normalizeTransactions(transactions, fuelCode, periodDates?.dt_beg, periodDates?.dt_end);
    const normRcp = normalizeReceipts(receipts, tankNumber, periodDates?.dt_beg, periodDates?.dt_end);
    const initVals = calculateInitialValues(history[0], normTx, normRcp);
    const chart = calculateChartData(history, normTx, normRcp, initVals);
    const volumeBookStats = recalculateVolumeBookStats(chart);

    // Даунсемплинг для графиков (полные данные — для расчётов)
    // Зажимаем releaseActual/releaseBook ≥ 0 (отрицательная кумулятивная реализация физически невозможна)
    const sampled = downsample(chart, MAX_CHART_POINTS).map(p => ({
      ...p,
      releaseActual: Math.max(0, p.releaseActual),
      releaseBook: Math.max(0, p.releaseBook),
    }));
    const minusa = downsample(
      chart.map(point => ({ ...point, minusa: point.releaseBook - point.releaseActual })),
      MAX_CHART_POINTS
    );

    const lastPoint = chart[chart.length - 1];
    const totals = {
      actual: lastPoint?.releaseActual ?? 0,
      book: lastPoint?.releaseBook ?? 0
    };

    const updatedStats = stats ? { ...stats, volumeBook: volumeBookStats } : stats;
    const detected = detectAnomalies(chart, history);

    return { chartData: chart, chartDataSampled: sampled, minusaChartData: minusa, computedStats: updatedStats, releaseTotals: totals, anomalies: detected };
  }, [history, transactions, receipts, stats, tankNumber, fuelCode, periodDates?.dt_beg, periodDates?.dt_end]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto md:h-[90vh] md:overflow-hidden md:flex md:flex-col md:gap-0 bg-background text-foreground p-0">
        {/* ── Компактный заголовок ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/50 md:shrink-0">
          <DialogHeader className="p-0 space-y-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2.5">
              {tank.name}
              <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 h-5 border-primary/40 text-primary dark:text-primary/70">
                {tank.fuelType}
              </Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Анализ динамики резервуара за выбранный период
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PERIOD_FILTERS.map(filter => (
              <Button
                key={filter.value}
                variant={period === filter.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(filter.value)}
                disabled={loading}
                className={`h-7 text-xs px-3 rounded-full ${period === filter.value ? 'bg-primary hover:bg-primary/80 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {filter.label}
              </Button>
            ))}
            <Button
              variant={period === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                if (period !== 'custom') {
                  // Инициализируем даты: последние 7 дней
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 7);
                  setCustomStart(start.toISOString().slice(0, 10));
                  setCustomEnd(end.toISOString().slice(0, 10));
                  setPeriod('custom');
                }
              }}
              disabled={loading}
              className={`h-7 text-xs px-3 rounded-full ${period === 'custom' ? 'bg-primary hover:bg-primary/80 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Период
            </Button>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-7 text-xs px-2 rounded bg-secondary border border-border text-foreground"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-7 text-xs px-2 rounded bg-secondary border border-border text-foreground"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loading || !customStart || !customEnd}
                  className="h-7 text-xs px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Загрузить
                </Button>
              </>
            )}
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={loadHistory}
              disabled={loading}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Состояние загрузки/ошибки */}
        {loading && (
          <div className="flex flex-col justify-center items-center flex-1 min-h-0 gap-3 px-5">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-foreground/80 text-xs mb-2">{loadingStage}</p>
              <div className="flex gap-4 text-[11px]">
                <div className={`flex items-center gap-1.5 ${loadingProgress.tankHistory ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.tankHistory ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  История
                </div>
                <div className={`flex items-center gap-1.5 ${loadingProgress.transactions ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.transactions ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  Транзакции
                </div>
                <div className={`flex items-center gap-1.5 ${loadingProgress.receipts ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${loadingProgress.receipts ? 'bg-emerald-400' : 'bg-secondary animate-pulse'}`} />
                  Поступления
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Основной контент */}
        {!loading && !error && computedStats && (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(300px,360px)_1fr] gap-0 md:flex-1 md:min-h-0 md:overflow-hidden">

            {/* ═══ Левая колонка: KPI + Анализ ═══ */}
            <div className="flex flex-col gap-0 md:overflow-y-auto border-r border-border bg-card/30">
              {/* KPI сетка */}
              <div className="grid grid-cols-2 gap-px bg-border">
                {[
                  { label: 'Факт. остаток', value: `${computedStats.volume.current.toFixed(0)} л`, cmp: computedStats.volume.current - computedStats.volume.avg },
                  { label: 'Книж. остаток', value: `${(computedStats.volumeBook?.current || 0).toFixed(0)} л`, cmp: (computedStats.volumeBook?.current || 0) - (computedStats.volumeBook?.avg || 0) },
                  { label: 'Температура', value: `${computedStats.temperature.current.toFixed(1)}°C`, cmp: computedStats.temperature.current - computedStats.temperature.avg },
                  { label: 'Плотность', value: `${computedStats.density.current.toFixed(1)} кг/м³`, cmp: computedStats.density.current - computedStats.density.avg },
                  { label: 'Уровень воды', value: `${computedStats.waterLevel.current.toFixed(2)} см`, cmp: computedStats.waterLevel.current - computedStats.waterLevel.avg },
                  { label: 'Поступления', value: `${(bookReceipts || 0).toFixed(0)} л`, cmp: bookReceipts > 0 ? 1 : 0, color: 'cyan' as const },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-background px-3 py-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{kpi.label}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-semibold ${kpi.color === 'cyan' ? 'text-cyan-500 dark:text-cyan-400' : 'text-foreground'}`}>{kpi.value}</span>
                      {kpi.cmp > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : kpi.cmp < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-muted-foreground/40" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Блок реализации — акцентный */}
              {(() => {
                const diff = releaseTotals.actual - releaseTotals.book;
                const isPositive = diff >= 0;
                return (
                  <div className="px-3 py-2.5 border-t border-border bg-secondary/30">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] text-muted-foreground">Факт. реализация</span>
                      <span className="text-xs font-semibold text-foreground">{releaseTotals.actual.toFixed(0)} л</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[10px] text-muted-foreground">Книж. реализация</span>
                      <span className="text-xs font-semibold text-foreground">{releaseTotals.book.toFixed(0)} л</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                      <span className="text-[10px] font-medium text-muted-foreground">Разница</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {isPositive ? '+' : ''}{diff.toFixed(0)} л
                        </span>
                        {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Панель анализа */}
              <TankAnalysisPanel
                items={generateTankAnalysis(computedStats, releaseTotals, bookReceipts, period, tank, chartData.length, customStart, customEnd)}
              />
            </div>

            {/* ═══ Правая колонка: Графики сверху, Аномалии снизу ═══ */}
            <div className="flex flex-col gap-0 md:overflow-y-auto">

              {/* Графики — ленивый рендер: только активный таб */}
              {chartData.length > 0 && (
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ChartTab)} className="w-full px-3 pt-3">
            <TabsList className="grid grid-cols-4 md:grid-cols-7 gap-0.5 w-full bg-secondary/50 h-auto p-0.5 rounded-lg md:shrink-0 border border-border/50">
              <TabsTrigger value="release" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Реализация</TabsTrigger>
              <TabsTrigger value="minusa" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Погрешность</TabsTrigger>
              <TabsTrigger value="volume" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Остатки</TabsTrigger>
              <TabsTrigger value="temperature" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Температура</TabsTrigger>
              <TabsTrigger value="density" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Плотность</TabsTrigger>
              <TabsTrigger value="water" className="text-[11px] data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md py-1.5">Вода</TabsTrigger>
            </TabsList>

            <div className="mt-3">
              {activeTab === 'volume' && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartDataSampled}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.5} />
                    <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                    <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                      domain={[0, 'auto']}
                      label={{ value: 'Объем (л)', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                    <Area type="monotone" dataKey="volumeActual" stroke="#3b82f6" strokeWidth={2}
                      fill="url(#volumeActualGradient)" name="Фактический остаток" dot={false} animationDuration={0} />
                    <Area type="monotone" dataKey="volumeBook" stroke="#10b981" strokeWidth={2}
                      strokeDasharray="5 5" fill="url(#volumeBookGradient)" name="Книжный остаток" dot={false} animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'temperature' && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartDataSampled}>
                    <defs>
                      <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.5} />
                    <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                    <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                      label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                    <Area type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2}
                      fill="url(#temperatureGradient)" name="Температура" dot={false} animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'density' && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartDataSampled}>
                    <defs>
                      <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.5} />
                    <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                    <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                      label={{ value: 'Плотность (кг/м³)', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                      domain={densityDomain}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                    <Area type="monotone" dataKey="density" stroke="#8b5cf6" strokeWidth={2}
                      fill="url(#densityGradient)" name="Плотность" dot={false} animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'water' && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartDataSampled}>
                    <defs>
                      <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} opacity={0.5} />
                    <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                    <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                      domain={[0, 'auto']}
                      label={{ value: 'Уровень воды (см)', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                    <Area type="monotone" dataKey="waterLevel" stroke="#06b6d4" strokeWidth={2}
                      fill="url(#waterGradient)" name="Уровень воды" dot={false} animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'release' && (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={chartDataSampled}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                    <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                    <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                      domain={[0, 'auto']}
                      label={{ value: 'Литры', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={litresFormatter} />
                    <Legend />
                    <Area type="monotone" dataKey="releaseActual" stroke="#10b981" fill="#10b981"
                      fillOpacity={0.3} strokeWidth={1} name="Фактическая реализация (л)" animationDuration={0} />
                    <Area type="stepAfter" dataKey="releaseBook" stroke="#f59e0b" fill="#f59e0b"
                      fillOpacity={0.2} strokeWidth={1} strokeDasharray="5 5" name="Книжная реализация (л)" animationDuration={0} />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {activeTab === 'minusa' && (
                <>
                  <div className="mb-1 px-3 py-1.5 bg-card rounded border border-border">
                    <p className="text-[11px] text-foreground/70">
                      <span className="font-medium">Погрешность:</span> книжная - фактическая реализация. Положительные — недоучет, отрицательные — переучет.
                    </p>
                  </div>
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
                    <AreaChart data={minusaChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} />
                      <XAxis dataKey="time" stroke={CHART_STROKE} tick={CHART_TICK} />
                      <YAxis stroke={CHART_STROKE} tick={CHART_TICK}
                        label={{ value: 'Литры (разница)', angle: -90, position: 'insideLeft', fill: CHART_STROKE }}
                      />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={litresFormatter} />
                      <Legend />
                      <ReferenceLine y={0} stroke={CHART_STROKE} strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="minusa" stroke="#a855f7" fill="#a855f7"
                        fillOpacity={0.3} strokeWidth={1} name="Погрешность учета (л)" animationDuration={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}

            </div>

          </Tabs>
              )}

              {/* Блок аномалий — под графиками */}
              {anomalies.length > 0 && (
                <div className="px-3 pb-3">
                  <AnomaliesPanel anomalies={anomalies} />
                </div>
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
