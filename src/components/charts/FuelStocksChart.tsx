import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Fuel } from 'lucide-react';
import { fuelStocksHistoryService, FuelStockSnapshot } from '@/services/fuelStocksHistoryService';
import { getFuelColor } from '@/types/shift-dashboard';

interface FuelStocksChartProps {
  selectedNetwork: string | null;
  selectedTradingPoint: string;
}

const TIME_PERIODS = [
  { value: '7days', label: '7 дней', days: 7 },
  { value: '14days', label: '2 недели', days: 14 },
  { value: '1month', label: '1 месяц', days: 31 },
  { value: '3months', label: '3 месяца', days: 90 },
  { value: '6months', label: '6 месяцев', days: 180 },
  { value: '1year', label: '1 год', days: 365 }
];

interface ChartDataPoint {
  time: string;
  timestamp: string;
  totalVolume: number;
  tankCount: number;
  averageLevel: number;
  details: FuelStockSnapshot[];
}

// FUEL_COLORS удалён — используется getFuelColor() из shift-dashboard
const ALL_FUEL_COLOR = '#64748b'; // slate — для "Все"

export function FuelStocksChart({ selectedNetwork, selectedTradingPoint }: FuelStocksChartProps) {
  const [selectedFuelType, setSelectedFuelType] = useState('Все');
  const [selectedPeriod, setSelectedPeriod] = useState('1month'); // По умолчанию 1 месяц
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableFuelTypes, setAvailableFuelTypes] = useState<string[]>(['Все']);

  // Загружаем исторические данные за выбранный период
  useEffect(() => {
    if (selectedNetwork) {
      loadChartData();
    }
  }, [selectedNetwork, selectedTradingPoint, selectedFuelType, selectedPeriod]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      
      // Определяем период на основе выбора
      const selectedPeriodConfig = TIME_PERIODS.find(p => p.value === selectedPeriod) || TIME_PERIODS[2];
      const endDate = '2025-08-31T23:59:59Z';
      const endDateTime = new Date(endDate);
      const startDateTime = new Date(endDateTime);
      startDateTime.setDate(startDateTime.getDate() - selectedPeriodConfig.days + 1);
      
      // Ограничиваем начало августом 2025
      const augustStart = new Date('2025-08-01T00:00:00Z');
      if (startDateTime < augustStart) {
        startDateTime.setTime(augustStart.getTime());
      }
      
      const startDate = startDateTime.toISOString();
      
      // ВРЕМЕННО: показываем данные по всем резервуарам сети независимо от торговой точки
      const rawData = await fuelStocksHistoryService.getHistoricalData(
        startDate,
        endDate,
        undefined,
        undefined // Убираем фильтрацию по торговой точке
      );

      // Группируем данные по времени
      const groupedData = new Map<string, FuelStockSnapshot[]>();
      rawData.forEach(snapshot => {
        const timeKey = snapshot.timestamp;
        if (!groupedData.has(timeKey)) {
          groupedData.set(timeKey, []);
        }
        groupedData.get(timeKey)!.push(snapshot);
      });

      // Получаем доступные типы топлива
      const fuelTypes = new Set<string>();
      rawData.forEach(s => fuelTypes.add(s.fuelType));
      const sortedFuelTypes = ['Все', ...Array.from(fuelTypes).sort()];
      setAvailableFuelTypes(sortedFuelTypes);

      // Определяем интервал отображения данных в зависимости от периода
      let dataInterval = 1; // По умолчанию показываем все точки
      
      // Для больших периодов берем не все точки, чтобы график был читаемым
      if (selectedPeriodConfig.days > 90) {
        dataInterval = 4; // Для периодов больше 3 месяцев - каждая 4-я точка (раз в 16 часов)
      } else if (selectedPeriodConfig.days > 30) {
        dataInterval = 2; // Для периодов больше месяца - каждая 2-я точка (раз в 8 часов)
      }

      // Преобразуем в данные для графика
      const allChartPoints: ChartDataPoint[] = Array.from(groupedData.entries())
        .map(([timestamp, snapshots]) => {
          // Фильтруем по типу топлива если выбран конкретный
          const filteredSnapshots = selectedFuelType === 'Все' 
            ? snapshots 
            : snapshots.filter(s => s.fuelType === selectedFuelType);

          const totalVolume = filteredSnapshots.reduce((sum, s) => sum + s.currentLevelLiters, 0);
          const averageLevel = filteredSnapshots.length > 0 
            ? filteredSnapshots.reduce((sum, s) => sum + s.levelPercent, 0) / filteredSnapshots.length 
            : 0;

          return {
            time: new Date(timestamp).toLocaleString('ru-RU', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp,
            totalVolume: Math.round(totalVolume),
            tankCount: filteredSnapshots.length,
            averageLevel: Math.round(averageLevel * 10) / 10,
            details: filteredSnapshots
          };
        })
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Применяем интервал для отображения
      const chartPoints = allChartPoints.filter((_, index) => index % dataInterval === 0);

      setChartData(chartPoints);
    } catch (error) {
      console.error('Ошибка загрузки данных графика:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}М л`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(0)}К л`;
    }
    return `${volume.toLocaleString('ru-RU')} л`;
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground/80 text-sm font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: (selectedFuelType === 'Все' ? ALL_FUEL_COLOR : getFuelColor(selectedFuelType)) }}
              />
              <span className="text-foreground font-mono">
                {formatVolume(data.totalVolume)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Резервуаров: {data.tankCount} | Средний уровень: {data.averageLevel}%
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const currentTotal = chartData.length > 0 ? chartData[chartData.length - 1].totalVolume : 0;
  const previousTotal = chartData.length > 1 ? chartData[chartData.length - 2].totalVolume : 0;
  const changeLiters = currentTotal - previousTotal;
  const changePercent = previousTotal > 0 ? (changeLiters / previousTotal) * 100 : 0;

  return (
    <Card className="bg-card border-border col-span-full overflow-visible">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-foreground flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Динамика остатков топлива
            {loading && <span className="text-sm text-muted-foreground">(загрузка...)</span>}
          </CardTitle>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Селектор периода */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Период:</span>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="bg-secondary border-border text-foreground w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Показатель изменения */}
              {chartData.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Изменение:</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      changePercent > 0 ? 'text-green-600 dark:text-green-400 border-green-400' :
                      changePercent < 0 ? 'text-red-600 dark:text-red-400 border-red-400' : 
                      'text-muted-foreground border-border'
                    }`}
                  >
                    {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
                  </Badge>
                </div>
              )}

              {/* Селектор типа топлива */}
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-muted-foreground" />
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger className="bg-secondary border-border text-foreground w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  {availableFuelTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: (type === 'Все' ? ALL_FUEL_COLOR : getFuelColor(type)) }}
                        />
                        {type}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="time" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(value) => {
                    // Для периодов больше недели показываем дату, иначе время
                    const periodConfig = TIME_PERIODS.find(p => p.value === selectedPeriod);
                    if (periodConfig && periodConfig.days > 7) {
                      return value.split(' ')[0]; // Показываем только дату
                    }
                    return value.split(' ')[1]; // Показываем только время
                  }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={formatVolume}
                />
                <Tooltip content={customTooltip} />
                <Line 
                  type="monotone" 
                  dataKey="totalVolume" 
                  stroke={(selectedFuelType === 'Все' ? ALL_FUEL_COLOR : getFuelColor(selectedFuelType))}
                  strokeWidth={2}
                  dot={{ fill: (selectedFuelType === 'Все' ? ALL_FUEL_COLOR : getFuelColor(selectedFuelType)), strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: (selectedFuelType === 'Все' ? ALL_FUEL_COLOR : getFuelColor(selectedFuelType)) }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="text-muted-foreground mb-2">
                {loading ? 'Загрузка данных...' : 'Нет данных для отображения'}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedPeriod === '1month' ? 'Данные за август 2025' : 
                 `Данные за ${TIME_PERIODS.find(p => p.value === selectedPeriod)?.label || ''} (август 2025)`}
              </div>
            </div>
          </div>
        )}

        {/* Краткая статистика под графиком */}
        {chartData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-foreground">
                  {formatVolume(currentTotal)}
                </div>
                <div className="text-xs text-muted-foreground">Текущий объем</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {chartData[chartData.length - 1]?.tankCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Резервуаров</div>
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {chartData[chartData.length - 1]?.averageLevel || 0}%
                </div>
                <div className="text-xs text-muted-foreground">Средний уровень</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${
                  changeLiters > 0 ? 'text-green-600 dark:text-green-400' :
                  changeLiters < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                }`}>
                  {changeLiters > 0 ? '+' : ''}{formatVolume(Math.abs(changeLiters))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {changeLiters > 0 ? 'Прирост' : changeLiters < 0 ? 'Расход' : 'Без изменений'}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}