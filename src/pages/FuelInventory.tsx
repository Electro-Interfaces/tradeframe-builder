/**
 * Страница "Остатки топлива"
 * Показывает текущие остатки по всем резервуарам сети с аналитикой и динамикой
 */

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Fuel, TrendingUp, TrendingDown, Droplets, Thermometer, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useSelection } from '@/contexts/SelectionContext';
import { getNetworkInventory, aggregateByFuel, type TankInventory, type FuelInventorySummary } from '@/services/fuelInventoryService';
import { stsProxyRequest } from '@/services/stsProxyClient';
import type { TankHistoryRecord } from '@/types/tanks';

export default function FuelInventory() {
  const { selectedNetwork, selectedStation } = useSelection();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<TankInventory[]>([]);
  const [fuelSummaries, setFuelSummaries] = useState<FuelInventorySummary[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<string>('all');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Данные для графиков
  const [chartDataByFuel, setChartDataByFuel] = useState<Map<number, any[]>>(new Map());
  const [loadingCharts, setLoadingCharts] = useState(false);

  // Фильтры дат - по умолчанию последние 90 дней
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 90);
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Форматировать дату для API (YYYY-MM-DD HH:MM:SS)
  const formatDateForApi = (dateStr: string, isEndOfDay: boolean = false): string => {
    const date = new Date(dateStr);
    if (isEndOfDay) {
      date.setHours(23, 59, 59);
    } else {
      date.setHours(0, 0, 0);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Загрузка данных для графиков по каждому виду топлива
  const loadChartData = async (summaries: FuelInventorySummary[]) => {
    if (!selectedNetwork || summaries.length === 0) return;

    setLoadingCharts(true);
    const chartData = new Map<number, any[]>();

    try {
      // Получаем список всех ТТ сети
      const { tradingPointsService } = await import('@/services/tradingPointsService');
      const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);

      // Запрашиваем данные для каждой ТТ параллельно
      const requests = tradingPoints.map(async (point) => {
        if (!point.external_id) return [];

        try {
          const history = await stsProxyRequest<TankHistoryRecord[]>('/v1/tank_history', {
            method: 'GET',
            params: {
              system: parseInt(selectedNetwork.external_id),
              station: parseInt(point.external_id),
              dt_beg: formatDateForApi(dateFrom, false),
              dt_end: formatDateForApi(dateTo, true)
            }
          });
          return history;
        } catch (error) {
          return [];
        }
      });

      const results = await Promise.all(requests);
      const allHistory = results.flat();

      console.log(`📊 График: получено ${allHistory.length} записей истории`);

      // Группируем по виду топлива
      const historyByFuel = new Map<number, TankHistoryRecord[]>();
      allHistory.forEach(record => {
        const fuelCode = record.fuel;
        if (!historyByFuel.has(fuelCode)) {
          historyByFuel.set(fuelCode, []);
        }
        historyByFuel.get(fuelCode)!.push(record);
      });

      console.log(`📊 График: виды топлива:`, Array.from(historyByFuel.keys()));

      // Для каждого вида топлива создаем данные графика
      summaries.forEach(summary => {
        const fuelHistory = historyByFuel.get(summary.fuelCode) || [];

        // Сортируем по дате
        fuelHistory.sort((a, b) => new Date(a.dt).getTime() - new Date(b.dt).getTime());

        // Группируем по дням и берем последнюю запись каждого резервуара за день
        const timeMap = new Map<string, Map<string, TankHistoryRecord>>();

        fuelHistory.forEach(record => {
          const timeKey = new Date(record.dt).toISOString().split('T')[0]; // группируем по дням
          const tankKey = `${record.number}`; // ключ резервуара

          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, new Map());
          }

          const dayTanks = timeMap.get(timeKey)!;
          const existingRecord = dayTanks.get(tankKey);

          // Берем последнюю запись за день для этого резервуара
          if (!existingRecord || new Date(record.dt) > new Date(existingRecord.dt)) {
            dayTanks.set(tankKey, record);
          }
        });

        // Преобразуем в массив для графика - суммируем остатки всех резервуаров за день
        const chartPoints = Array.from(timeMap.entries())
          .map(([dateKey, tankRecords]) => {
            const totalVolume = Array.from(tankRecords.values())
              .reduce((sum, record) => sum + parseFloat(record.volume), 0);

            return {
              time: new Date(dateKey).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
              volume: Math.round(totalVolume),
              dateKey
            };
          })
          .sort((a, b) => new Date(a.dateKey).getTime() - new Date(b.dateKey).getTime());

        console.log(`📊 График ${summary.fuelName}: ${chartPoints.length} точек`, chartPoints.slice(0, 3));
        chartData.set(summary.fuelCode, chartPoints);
      });

      setChartDataByFuel(chartData);
    } catch (err) {
      console.error('Ошибка загрузки данных для графиков:', err);
    } finally {
      setLoadingCharts(false);
    }
  };

  // Загрузка данных
  const loadInventory = async () => {
    if (!selectedNetwork) {
      setError('Не выбрана торговая сеть');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getNetworkInventory({
        system: parseInt(selectedNetwork.external_id),
        networkId: selectedNetwork.id,
        station: selectedStation ? parseInt(selectedStation.external_id) : undefined,
        dt_beg: formatDateForApi(dateFrom, false),
        dt_end: formatDateForApi(dateTo, true)
      });

      setInventory(data);
      const summaries = aggregateByFuel(data);
      setFuelSummaries(summaries);

      if (data.length === 0) {
        setError('Нет данных об остатках топлива');
      }

      // Загружаем данные для графиков
      await loadChartData(summaries);
    } catch (err: any) {
      const errorMessage = err?.message || 'Ошибка загрузки остатков';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [selectedNetwork, selectedStation]);

  // Фильтрация данных
  const filteredInventory = inventory.filter(tank => {
    // Пропускаем резервуары с некорректными данными
    if (isNaN(tank.volumeActual) || isNaN(tank.capacity) || tank.capacity === 0) {
      return false;
    }

    if (selectedFuel !== 'all' && tank.fuelCode.toString() !== selectedFuel) {
      return false;
    }
    if (selectedStationFilter !== 'all' && tank.station.toString() !== selectedStationFilter) {
      return false;
    }
    return true;
  });

  // Уникальные ТТ для фильтра
  const uniqueStations = Array.from(new Set(inventory.map(t => t.station)));

  // Получить нейтральный цвет для прогресс-баров
  const getProgressColor = () => 'bg-slate-500';

  // Форматирование числа с разделителями
  const formatNumber = (num: number) => num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return (
    <MainLayout>
      <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Остатки топлива</h1>
          <p className="text-slate-400 mt-1">
            Текущие остатки по всем резервуарам сети {selectedNetwork?.name}
          </p>
        </div>

        {/* Фильтры */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Дата от */}
              <div>
                <Label htmlFor="date-from" className="text-xs text-slate-400">Дата от</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              {/* Дата до */}
              <div>
                <Label htmlFor="date-to" className="text-xs text-slate-400">Дата до</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>

              {/* Кнопка применить */}
              <div className="flex items-end">
                <Button
                  onClick={loadInventory}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Применить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
        {fuelSummaries.map(summary => (
          <Card key={summary.fuelCode} className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg text-white">
                    {summary.fuelName}
                  </CardTitle>
                  <CardDescription>
                    {summary.tankCount} {summary.tankCount === 1 ? 'резервуар' : 'резервуаров'}
                  </CardDescription>
                </div>
                <Fuel className="h-8 w-8 text-slate-500" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Остаток фактический */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Фактический остаток:</span>
                  <span className="text-white font-semibold">
                    {formatNumber(summary.totalVolumeActual)} л
                  </span>
                </div>
                {/* Прогресс-бар */}
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor()}`}
                    style={{ width: `${(summary.totalVolumeActual / summary.totalCapacity) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{((summary.totalVolumeActual / summary.totalCapacity) * 100).toFixed(1)}%</span>
                  <span>Вместимость: {formatNumber(summary.totalCapacity)} л</span>
                </div>
              </div>

              {/* Дополнительная информация */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-700">
                <div>
                  <div className="text-slate-500">Свободно:</div>
                  <div className="text-slate-300">{formatNumber(summary.totalFree)} л</div>
                </div>
                <div>
                  <div className="text-slate-500 flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    Температура:
                  </div>
                  <div className="text-slate-300">{summary.averageTemperature.toFixed(1)}°C</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {fuelSummaries.length === 0 && !loading && (
          <Card className="bg-slate-800 border-slate-700 col-span-3">
            <CardContent className="py-12 text-center text-slate-400">
              Нет данных об остатках
            </CardContent>
          </Card>
        )}
      </div>

      {/* Таблица остатков */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Остатки по резервуарам</CardTitle>
            <div className="flex gap-2">
              {/* Фильтр по ТТ */}
              <Select value={selectedStationFilter} onValueChange={setSelectedStationFilter}>
                <SelectTrigger className="w-[200px] bg-slate-900">
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
                <SelectTrigger className="w-[200px] bg-slate-900">
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
          <div className="rounded-md border border-slate-700">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-slate-800/50 border-slate-700">
                  <TableHead className="text-slate-300">ТТ</TableHead>
                  <TableHead className="text-slate-300">Резервуар</TableHead>
                  <TableHead className="text-slate-300">Топливо</TableHead>
                  <TableHead className="text-right text-slate-300">Фактический остаток</TableHead>
                  <TableHead className="text-right text-slate-300">Заполнение</TableHead>
                  <TableHead className="text-right text-slate-300">Вместимость</TableHead>
                  <TableHead className="text-right text-slate-300">Температура</TableHead>
                  <TableHead className="text-right text-slate-300">Вода</TableHead>
                  <TableHead className="text-slate-300">Обновлено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((tank, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-700/30 border-slate-700">
                    <TableCell className="text-slate-100">ТТ {tank.station}</TableCell>
                    <TableCell className="text-slate-100">Р{tank.tankNumber}</TableCell>
                    <TableCell>
                      <span className="text-slate-100">{tank.fuelName}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-100">
                      {formatNumber(tank.volumeActual)} л
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-slate-100">{tank.fillPercent.toFixed(1)}%</span>
                        <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor()}`}
                            style={{ width: `${tank.fillPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-400">
                      {formatNumber(tank.capacity)} л
                    </TableCell>
                    <TableCell className="text-right text-slate-100">
                      {tank.temperature.toFixed(1)}°C
                    </TableCell>
                    <TableCell className="text-right text-slate-100">
                      {tank.waterLevel.toFixed(1)} см
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

                {filteredInventory.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                      Нет данных по выбранным фильтрам
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Графики остатков по видам топлива */}
      {!loadingCharts && fuelSummaries.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-100">Динамика остатков</h2>

          {fuelSummaries.map(summary => {
            const chartData = chartDataByFuel.get(summary.fuelCode) || [];

            if (chartData.length === 0) return null;

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
                      <div className="text-sm text-slate-400">Текущий остаток</div>
                      <div className="text-xl font-bold text-white">{formatNumber(summary.totalVolumeActual)} л</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
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
                          color: '#f1f5f9'
                        }}
                        formatter={(value: number) => [`${formatNumber(value)} л`, 'Остаток']}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
