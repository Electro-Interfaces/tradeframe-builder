/**
 * Диалог детального анализа резервуара с графиками
 */

import { useState, useEffect } from 'react';
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
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Tank, TankHistoryRecord, TankHistoryStats, AnalysisPeriod, TransactionV2Response, ReceiptResponse } from '@/types/tanks';
import { getTankAnalysis, getPeriodDates } from '@/services/tankHistoryService';
import { getBookData } from '@/services/tankBookService';
import { useSelection } from '@/contexts/SelectionContext';
import {
  normalizeTransactions,
  normalizeReceipts,
  calculateInitialValues,
  calculateChartData,
  recalculateVolumeBookStats
} from '@/services/tankAnalysisCalculations';

interface TankAnalysisDialogProps {
  tank: Tank;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Быстрые фильтры периодов
const PERIOD_FILTERS: { value: AnalysisPeriod; label: string }[] = [
  { value: '24h', label: '24 часа' },
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' }
];

export function TankAnalysisDialog({ tank, open, onOpenChange }: TankAnalysisDialogProps) {
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
        dt_beg: dates.dt_beg,
        dt_end: dates.dt_end
      };

      setLoadingStage('Загрузка данных с сервера...');

      // Параллельно загружаем историю резервуара, транзакции и поступления
      const [historyResult, bookData] = await Promise.all([
        getTankAnalysis(params, tankNumber, period).then(result => {
          setLoadingProgress(prev => ({ ...prev, tankHistory: true }));
          return result;
        }),
        getBookData(params, tankNumber).then(result => {
          setLoadingProgress(prev => ({ ...prev, transactions: true, receipts: true }));
          return result;
        })
      ]);

      setLoadingStage('Обработка данных...');

      setHistory(historyResult.history);
      setStats(historyResult.stats);
      setTransactions(bookData.transactions);
      setReceipts(bookData.receipts);
      setBookRelease(bookData.bookRelease);
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

  // ═══════════════════════════════════════════════════════════════════
  // НОВАЯ ЛОГИКА: Используем оптимизированные функции из tankAnalysisCalculations.ts
  // ═══════════════════════════════════════════════════════════════════

  const tankNumber = typeof tank.id === 'number' ? tank.id : parseInt(tank.id.toString());

  // Нормализуем данные (фильтрация по резервуару, датам, парсинг, сортировка)
  const normalizedTransactions = normalizeTransactions(
    transactions,
    tankNumber,
    periodDates?.dt_beg,
    periodDates?.dt_end
  );
  const normalizedReceipts = normalizeReceipts(
    receipts,
    tankNumber,
    periodDates?.dt_beg,
    periodDates?.dt_end
  );

  // Вычисляем начальные значения
  const initialValues = calculateInitialValues(
    history[0],
    normalizedTransactions,
    normalizedReceipts
  );

  // Вычисляем данные для графиков с ПРАВИЛЬНЫМ учетом поступлений
  const chartData = calculateChartData(
    history,
    normalizedTransactions,
    normalizedReceipts,
    initialValues
  );

  // Пересчитываем статистику книжного остатка на основе chartData
  const volumeBookStats = recalculateVolumeBookStats(chartData);
  if (stats) {
    stats.volumeBook = volumeBookStats;
  }

  // Логирование итоговых значений графика

  // 📊 График "Погрешность" - используем те же точки что и chartData
  // Для каждой точки вычисляем: Книжная реализация - Фактическая реализация
  const minusaChartData = chartData.map(point => ({
    ...point,
    // Погрешность = Книжная - Фактическая
    minusa: point.releaseBook - point.releaseActual
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {tank.name} - Детальная аналитика
            <Badge className="bg-gradient-to-r from-slate-600 to-slate-700">
              {tank.fuelType}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Анализ динамики резервуара за выбранный период
          </DialogDescription>
        </DialogHeader>

        {/* Фильтры периода */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {PERIOD_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={period === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(filter.value)}
              disabled={loading}
              className="min-w-[70px]"
            >
              {filter.label}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
            className="ml-auto min-w-[100px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="mb-4 overflow-x-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-750">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-400">Показатель</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-400">Текущее</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-400">Мин</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-400">Макс</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-slate-400">Среднее</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-400">Тренд</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {/* Остатки */}
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Фактический остаток</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{stats.volume.current.toFixed(2)} л</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.volume.min.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.volume.max.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.volume.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {stats.volume.current > stats.volume.avg ? (
                        <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                      ) : stats.volume.current < stats.volume.avg ? (
                        <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Книжный остаток</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{(stats.volumeBook?.current || 0).toFixed(2)} л</td>
                    <td className="py-2 px-3 text-right text-slate-400">{(stats.volumeBook?.min || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{(stats.volumeBook?.max || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{(stats.volumeBook?.avg || 0).toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {(stats.volumeBook?.current || 0) > (stats.volumeBook?.avg || 0) ? (
                        <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (stats.volumeBook?.current || 0) < (stats.volumeBook?.avg || 0) ? (
                        <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>

                  {/* Физические параметры */}
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Температура</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{stats.temperature.current.toFixed(2)} °C</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.temperature.min.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.temperature.max.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.temperature.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {stats.temperature.current > stats.temperature.avg ? (
                        <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                      ) : stats.temperature.current < stats.temperature.avg ? (
                        <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Плотность</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{stats.density.current.toFixed(2)} кг/м³</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.density.min.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.density.max.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.density.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {stats.density.current > stats.density.avg ? (
                        <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                      ) : stats.density.current < stats.density.avg ? (
                        <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Уровень воды</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{stats.waterLevel.current.toFixed(2)} см</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.waterLevel.min.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.waterLevel.max.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.waterLevel.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">
                      {stats.waterLevel.current > stats.waterLevel.avg ? (
                        <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                      ) : stats.waterLevel.current < stats.waterLevel.avg ? (
                        <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>

                  {/* Реализация */}
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Фактическая реализация</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{stats.release.total.toFixed(2)} л</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">{stats.release.avg.toFixed(2)}</td>
                    <td className="py-2 px-3 text-center">-</td>
                  </tr>
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Книжная реализация (транзакции)</td>
                    <td className="py-2 px-3 text-right font-semibold text-white">{(bookRelease || 0).toFixed(2)} л</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-center">-</td>
                  </tr>
                  <tr className="hover:bg-slate-750/50">
                    <td className="py-2 px-3 text-slate-300">Поступления</td>
                    <td className="py-2 px-3 text-right font-semibold text-cyan-400">{(bookReceipts || 0).toFixed(2)} л</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-center">
                      {bookReceipts > 0 ? (
                        <TrendingUp className="w-4 h-4 text-cyan-400 mx-auto" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-750/50 bg-slate-750/30">
                    <td className="py-2 px-3 text-slate-300 font-semibold">Разница реализации (факт - транзакции)</td>
                    <td className="py-2 px-3 text-right font-bold">
                      {(() => {
                        const difference = stats.release.total - (bookRelease || 0);
                        const isPositive = difference >= 0;
                        return (
                          <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                            {isPositive ? '+' : ''}{difference.toFixed(2)} л
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-right text-slate-400">-</td>
                    <td className="py-2 px-3 text-center">
                      {(() => {
                        const difference = stats.release.total - (bookRelease || 0);
                        return difference >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400 mx-auto" />
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Состояние загрузки/ошибки */}
        {loading && (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
            <div className="text-center">
              <p className="text-slate-300 text-sm mb-3">{loadingStage}</p>
              <div className="flex gap-6 text-xs">
                <div className={`flex items-center gap-2 ${loadingProgress.tankHistory ? 'text-green-400' : 'text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingProgress.tankHistory ? 'bg-emerald-400' : 'bg-slate-600 animate-pulse'}`} />
                  История резервуара
                </div>
                <div className={`flex items-center gap-2 ${loadingProgress.transactions ? 'text-green-400' : 'text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingProgress.transactions ? 'bg-emerald-400' : 'bg-slate-600 animate-pulse'}`} />
                  Транзакции
                </div>
                <div className={`flex items-center gap-2 ${loadingProgress.receipts ? 'text-green-400' : 'text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${loadingProgress.receipts ? 'bg-emerald-400' : 'bg-slate-600 animate-pulse'}`} />
                  Поступления
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Графики */}
        {!loading && !error && chartData.length > 0 && (
          <Tabs defaultValue="release" className="w-full">
            <TabsList className="flex flex-wrap gap-1 w-full bg-slate-800 h-auto p-1 md:grid md:grid-cols-6">
              <TabsTrigger value="release" className="flex-1 min-w-[80px] text-xs md:text-sm">Реализация</TabsTrigger>
              <TabsTrigger value="minusa" className="flex-1 min-w-[80px] text-xs md:text-sm">Погрешность</TabsTrigger>
              <TabsTrigger value="volume" className="flex-1 min-w-[80px] text-xs md:text-sm">Остатки</TabsTrigger>
              <TabsTrigger value="temperature" className="flex-1 min-w-[80px] text-xs md:text-sm">Температура</TabsTrigger>
              <TabsTrigger value="density" className="flex-1 min-w-[80px] text-xs md:text-sm">Плотность</TabsTrigger>
              <TabsTrigger value="water" className="flex-1 min-w-[80px] text-xs md:text-sm">Вода</TabsTrigger>
            </TabsList>

            {/* График остатков */}
            <TabsContent value="volume" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Объем (л)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
            <TabsContent value="temperature" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Температура (°C)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
            <TabsContent value="density" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="densityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Плотность (кг/м³)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    domain={[
                      (dataMin: number) => Math.floor(dataMin - 2),
                      (dataMax: number) => Math.ceil(dataMax + 2)
                    ]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
            <TabsContent value="water" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    label={{ value: 'Уровень воды (см)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
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
            <TabsContent value="release" className="mt-6">
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    label={{ value: 'Литры', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
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
            <TabsContent value="minusa" className="mt-6">
              <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold">График погрешности учета:</span> Разница между книжной и фактической реализацией.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span className="text-slate-400">Погрешность = Книжная реализация - Фактическая реализация</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span className="text-slate-400">Положительные значения - недоучет, отрицательные - переучет</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={minusaChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="time"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8' }}
                    label={{ value: 'Литры (разница)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value: any) => {
                      if (typeof value === 'number') {
                        return value.toFixed(2) + ' л';
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
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

        {!loading && !error && chartData.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Нет данных за выбранный период
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
