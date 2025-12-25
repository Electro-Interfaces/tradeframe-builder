/**
 * Страница "Остатки топлива" (рефакторинг v1.7.1)
 * Показывает текущие остатки по всем резервуарам сети с аналитикой и динамикой
 * Модульная архитектура с разделением на components, hooks, utils
 */

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowUpDown, ArrowUp, ArrowDown, Fuel, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { useSelection } from '@/contexts/SelectionContext';
import { useIsMobile } from '@/hooks/use-mobile';

// Импорты из локальных модулей
import { useFuelInventory } from './hooks/useFuelInventory';
import { useChartData } from './hooks/useChartData';
import { FuelInventoryFilters } from './components/FuelInventoryFilters';
import { FuelSummaryCards } from './components/FuelSummaryCards';
import { TankInventoryCard } from './components/TankInventoryCard';
import {
  formatNumber,
  filterInventory,
  sortInventory,
  calculateTotals,
  getUniqueStations
} from './utils/fuelInventoryHelpers';

export default function FuelInventory() {
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();

  // Состояние фильтров
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');

  // Состояние сортировки (по умолчанию - по ТТ по возрастанию)
  const [sortColumn, setSortColumn] = useState<'station' | 'fuel'>('station');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Фильтры дат - по умолчанию последние 7 дней (оптимально для производительности)
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Используем хуки для загрузки данных - загружаем ВСЕ станции (фильтр на клиенте)
  const { loading, inventory, fuelSummaries, error, loadInventory, loadingProgress } = useFuelInventory(dateFrom, dateTo);
  const { chartDataByFuel, loadingCharts, loadChartData } = useChartData(dateFrom, dateTo, fuelSummaries);

  // Обработчик клика на заголовок столбца для сортировки
  const handleSort = (column: 'station' | 'fuel') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Фильтрация и сортировка данных
  // Фильтруем по виду топлива И по станции (клиентская фильтрация быстрая)
  const filteredInventory = filterInventory(inventory, selectedFuel, selectedStationFilter);
  const sortedInventory = sortInventory(filteredInventory, sortColumn, sortDirection);

  // Расчет суммарных значений для выбранного фильтра (только когда выбран конкретный вид топлива)
  const totals = selectedFuel !== 'all' ? calculateTotals(sortedInventory) : null;

  // Уникальные ТТ для фильтра
  const uniqueStations = getUniqueStations(inventory);

  // Вспомогательные функции
  const getProgressColor = () => 'bg-slate-500';

  const getSortIcon = (column: 'station' | 'fuel') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="h-3 w-3" /> :
      <ArrowDown className="h-3 w-3" />;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Остатки</h1>
              <p className="text-slate-400 mt-1">
                Книжные остатки по всем резервуарам на основании данных сменных отчетов
              </p>
            </div>
          </div>

          {/* Фильтры */}
          <FuelInventoryFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onApply={loadInventory}
            loading={loading}
          />
        </div>

        {/* Индикатор прогресса загрузки смен */}
        {loading && (
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex-1">
                  <p className="text-blue-400 font-medium mb-2">
                    {loadingProgress.total === 0
                      ? 'Подготовка данных...'
                      : `Загрузка сменных отчетов: ${loadingProgress.loaded} / ${loadingProgress.total}`
                    }
                  </p>
                  {loadingProgress.total > 0 && (
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                {loadingProgress.total > 0 && (
                  <div className="text-blue-400 font-mono text-sm">
                    {Math.round((loadingProgress.loaded / loadingProgress.total) * 100)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Сообщение об ошибке */}
        {error && (
          <Card className="bg-red-900/20 border-red-700">
            <CardContent className="py-4">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Карточки суммарных остатков по видам топлива */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FuelSummaryCards summaries={fuelSummaries} loading={loading} />
        </div>

        {/* Таблица/Карточки остатков */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-row justify-between items-center'}`}>
              <CardTitle className="text-white">Остатки по резервуарам</CardTitle>
              <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-row'} gap-2`}>
                {/* Фильтр по ТТ */}
                <Select
                  value={selectedStationFilter}
                  onValueChange={setSelectedStationFilter}
                >
                  <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[200px]'} bg-slate-900`}>
                    <SelectValue placeholder="Все ТТ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все ТТ</SelectItem>
                    {uniqueStations.map(station => (
                      <SelectItem key={station} value={station.toString()}>
                        ТТ {station}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Фильтр по виду топлива */}
                <Select value={selectedFuel} onValueChange={setSelectedFuel}>
                  <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[200px]'} bg-slate-900`}>
                    <SelectValue placeholder="Все виды топлива" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все виды</SelectItem>
                    {fuelSummaries.map(summary => (
                      <SelectItem key={summary.fuelCode} value={summary.fuelCode.toString()}>
                        {summary.fuelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              /* Мобильный вид - карточки */
              <div className="space-y-3">
                {sortedInventory.length === 0 && !loading ? (
                  <div className="text-center py-8 text-slate-400">
                    Нет данных для отображения
                  </div>
                ) : (
                  sortedInventory.map((tank, idx) => (
                    <TankInventoryCard key={idx} tank={tank} />
                  ))
                )}

                {/* Итоговая карточка для мобильных */}
                {totals && (
                  <Card className="bg-slate-900/70 border-slate-600 border-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-sm font-semibold text-white mb-3">
                        ИТОГО ({totals.tankCount} {totals.tankCount === 1 ? 'резервуар' : totals.tankCount < 5 ? 'резервуара' : 'резервуаров'})
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800 rounded p-2">
                          <div className="text-[10px] text-slate-400 mb-0.5">Начальный</div>
                          <div className="text-sm font-mono text-slate-300 font-semibold">
                            {formatNumber(totals.volumeBegin)} л
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded p-2">
                          <div className="text-[10px] text-slate-400 mb-0.5">Книжный</div>
                          <div className="text-sm font-mono text-white font-bold">
                            {formatNumber(totals.volumeBook)} л
                          </div>
                        </div>
                        <div className="bg-green-900/20 rounded p-2 border border-green-700/30">
                          <div className="text-[10px] text-green-400 mb-0.5">Поступления</div>
                          <div className="text-sm font-mono text-green-400 font-semibold">
                            +{formatNumber(totals.volumeReceipts)} л
                          </div>
                        </div>
                        <div className="bg-red-900/20 rounded p-2 border border-red-700/30">
                          <div className="text-[10px] text-red-400 mb-0.5">Реализация</div>
                          <div className="text-sm font-mono text-red-400 font-semibold">
                            -{formatNumber(totals.volumeSales)} л
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 text-right mt-2">
                        Заполнение: {((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Десктопный вид - таблица */
              <div className="rounded-md border border-slate-700">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-slate-800/50 border-slate-700">
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort('station')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          ТТ
                          {getSortIcon('station')}
                        </button>
                      </TableHead>
                      <TableHead className="text-slate-300">Резервуар</TableHead>
                      <TableHead className="text-slate-300">
                        <button
                          onClick={() => handleSort('fuel')}
                          className="flex items-center gap-1 hover:text-white transition-colors"
                        >
                          Топливо
                          {getSortIcon('fuel')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right text-slate-300">Начальный остаток</TableHead>
                      <TableHead className="text-right text-slate-300">Поступления</TableHead>
                      <TableHead className="text-right text-slate-300">Реализация</TableHead>
                      <TableHead className="text-right text-slate-300">Книжный остаток</TableHead>
                      <TableHead className="text-slate-300">Обновлено</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInventory.map((tank, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-700/30 border-slate-700">
                        <TableCell className="text-slate-100">{tank.station}</TableCell>
                        <TableCell className="text-slate-100">Р{tank.tankNumber}</TableCell>
                        <TableCell>
                          <span className="text-slate-100">{tank.fuelName}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-0.5">
                            <div className="font-mono text-slate-400">
                              {formatNumber(tank.volumeBegin)} л
                            </div>
                            {tank.initialShift && (
                              <div className="text-xs text-slate-500">
                                Смена #{tank.initialShift.number}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400">
                          +{formatNumber(tank.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-400">
                          -{formatNumber(tank.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-slate-100 font-semibold">
                              {formatNumber(tank.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-slate-400">{tank.fillPercent.toFixed(1)}%</span>
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor()}`}
                                  style={{ width: `${tank.fillPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(tank.lastUpdate).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Итоговая строка (только когда выбран конкретный вид топлива) */}
                    {totals && (
                      <TableRow className="bg-slate-800/70 border-t-2 border-slate-600 hover:bg-slate-800">
                        <TableCell colSpan={3} className="text-slate-100 font-semibold">
                          ИТОГО ({totals.tankCount} {totals.tankCount === 1 ? 'резервуар' : totals.tankCount < 5 ? 'резервуара' : 'резервуаров'})
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300 font-semibold">
                          {formatNumber(totals.volumeBegin)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400 font-semibold">
                          +{formatNumber(totals.volumeReceipts)} л
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-400 font-semibold">
                          -{formatNumber(totals.volumeSales)} л
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="font-mono text-slate-100 font-bold">
                              {formatNumber(totals.volumeBook)} л
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <span className="text-xs text-slate-400 font-semibold">
                                {((totals.volumeBook / totals.capacity) * 100).toFixed(1)}%
                              </span>
                              <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${getProgressColor()}`}
                                  style={{ width: `${(totals.volumeBook / totals.capacity) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">—</TableCell>
                      </TableRow>
                    )}

                    {sortedInventory.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                          Нет данных для отображения
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Графики остатков по видам топлива */}
        {!loadingCharts && fuelSummaries.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-100">Динамика остатков</h2>

            {fuelSummaries.map(summary => {
              const chartData = chartDataByFuel.get(summary.fuelCode) || [];

              if (chartData.length === 0) return null;

              // Аналитика графика
              const volumes = chartData.map(d => d.volume);
              const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
              const minVolume = Math.min(...volumes);
              const maxVolume = Math.max(...volumes);
              const firstVolume = volumes[0];
              const lastVolume = volumes[volumes.length - 1];
              const trend = lastVolume - firstVolume;
              const trendPercent = ((trend / firstVolume) * 100).toFixed(1);

              // Считаем количество поступлений за период
              const totalReceiptCount = chartData.reduce((sum, d) => sum + (d.receiptCount || 0), 0);

              return (
                <Card key={summary.fuelCode} className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Fuel className="h-6 w-6 text-slate-400" />
                        <div>
                          <CardTitle className="text-white">{summary.fuelName}</CardTitle>
                          <CardDescription>
                            Суммарные остатки по {summary.tankCount} {summary.tankCount === 1 ? 'резервуару' : 'резервуарам'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Текущий книжный остаток</div>
                        <div className="text-xl font-bold text-white">{formatNumber(summary.totalVolumeBook)} л</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Аналитика */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Среднее</div>
                        <div className="text-lg font-semibold text-blue-400">{formatNumber(Math.round(avgVolume))} л</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Минимум</div>
                        <div className="text-lg font-semibold text-orange-400">{formatNumber(minVolume)} л</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Максимум</div>
                        <div className="text-lg font-semibold text-green-400">{formatNumber(maxVolume)} л</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Изменение</div>
                        <div className={`text-lg font-semibold flex items-center gap-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {trend >= 0 ? '+' : ''}{formatNumber(Math.round(trend))} л
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Тренд</div>
                        <div className={`text-lg font-semibold ${parseFloat(trendPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(trendPercent) >= 0 ? '+' : ''}{trendPercent}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400 mb-1">📦 Поступлений</div>
                        <div className="text-lg font-semibold text-purple-400">{totalReceiptCount} раз</div>
                      </div>
                    </div>

                    {/* График */}
                    <div className="-mx-6 px-2 md:mx-0 md:px-0">
                      <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id={`volumeGradient-${summary.fuelCode}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis
                          dataKey="time"
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8' }}
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8' }}
                          style={{ fontSize: '12px' }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#f1f5f9',
                            padding: '12px'
                          }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const data = payload[0].payload;
                            return (
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-slate-200 border-b border-slate-600 pb-1 mb-2">
                                  {data.time}
                                </div>
                                <div className="text-sm">
                                  <span className="text-slate-400">Остаток:</span>{' '}
                                  <span className="font-medium text-emerald-400">{formatNumber(data.volume)} л</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-slate-400">Реализация:</span>{' '}
                                  <span className="font-medium text-orange-400">{formatNumber(data.sales)} л</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-slate-400">Поступления:</span>{' '}
                                  <span className="font-medium text-blue-400">{formatNumber(data.receipts)} л</span>
                                </div>
                                {data.receiptCount > 0 && (
                                  <div className="text-xs text-slate-500 border-t border-slate-700 pt-1 mt-1">
                                    📦 Количество поступлений: {data.receiptCount}
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                        {/* Линия среднего значения */}
                        <ReferenceLine
                          y={avgVolume}
                          stroke="#3b82f6"
                          strokeDasharray="5 5"
                          strokeWidth={1}
                          label={{
                            value: 'Среднее',
                            position: 'insideTopRight',
                            fill: '#3b82f6',
                            fontSize: 12
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="volume"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill={`url(#volumeGradient-${summary.fuelCode})`}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {loadingCharts && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="py-12 text-center">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Загрузка данных для графиков...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
