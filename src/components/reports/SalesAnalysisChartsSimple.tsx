import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Network } from "@/types/network";
import { TradingPoint } from "@/types/tradingpoint";

interface FuelData {
  name: string;
  value: number;
  amount: number;
  color: string;
}

interface PaymentData {
  name: string;
  value: number;
  amount: number;
  color: string;
}

interface TrendData {
  period: string;
  revenue: number;
  transactions: number;
}

interface ChartsData {
  fuelData: FuelData[];
  paymentData: PaymentData[];
  trendData: TrendData[];
  loading: boolean;
}

// Простая круговая диаграмма с CSS
const FuelChart = ({ data, loading }: { data: FuelData[], loading: boolean }) => {
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="w-32 h-32 bg-slate-600 rounded-full mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-600 rounded w-24"></div>
            <div className="h-4 bg-slate-600 rounded w-20"></div>
            <div className="h-4 bg-slate-600 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div>Нет данных для отображения</div>
        </div>
      </div>
    );
  }

  // Вычисляем углы для conic-gradient
  let currentAngle = 0;
  const gradientStops = data.map((item) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (item.value * 3.6);
    currentAngle = endAngle;
    return `${item.color} ${startAngle}deg ${endAngle}deg`;
  }).join(', ');

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center px-2">
      {/* Диаграмма */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="w-32 h-32 rounded-full relative overflow-hidden flex-shrink-0">
          {/* Сегменты */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${gradientStops})`
            }}
          />
          {/* Центральный круг */}
          <div className="absolute inset-5 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700">
            <div className="text-center text-white">
              <div className="text-base font-bold">100%</div>
              <div className="text-xs text-slate-400">Топливо</div>
            </div>
          </div>
        </div>
        
        {/* Легенда */}
        <div className="space-y-2 min-w-0 flex-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{item.name}</div>
                <div className="text-xs text-slate-400 truncate">{item.value.toFixed(1)}% • {item.amount.toLocaleString()} ₽</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Диаграмма способов оплаты
const PaymentChart = ({ data, loading }: { data: PaymentData[], loading: boolean }) => {
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-pulse space-y-3">
          <div className="w-32 h-32 bg-slate-600 rounded-full mx-auto"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-600 rounded w-24"></div>
            <div className="h-4 bg-slate-600 rounded w-20"></div>
            <div className="h-4 bg-slate-600 rounded w-28"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-lg mb-2">💳</div>
          <div>Нет данных для отображения</div>
        </div>
      </div>
    );
  }

  // Вычисляем углы для conic-gradient
  let currentAngle = 0;
  const gradientStops = data.map((item) => {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (item.value * 3.6);
    currentAngle = endAngle;
    return `${item.color} ${startAngle}deg ${endAngle}deg`;
  }).join(', ');

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center px-2">
      {/* Диаграмма */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="w-32 h-32 rounded-full relative overflow-hidden flex-shrink-0">
          {/* Сегменты */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${gradientStops})`
            }}
          />
          {/* Центральный круг */}
          <div className="absolute inset-5 bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-700">
            <div className="text-center text-white">
              <div className="text-base font-bold">100%</div>
              <div className="text-xs text-slate-400">Оплата</div>
            </div>
          </div>
        </div>
        
        {/* Легенда */}
        <div className="space-y-2 min-w-0 flex-1">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{item.name}</div>
                <div className="text-xs text-slate-400 truncate">{item.value.toFixed(1)}% • {item.amount.toLocaleString()} ₽</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Простой столбчатый график
const TrendChart = ({ data, loading }: { data: TrendData[], loading: boolean }) => {
  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-pulse flex space-x-2">
          <div className="w-8 h-32 bg-slate-600 rounded"></div>
          <div className="w-8 h-24 bg-slate-600 rounded"></div>
          <div className="w-8 h-40 bg-slate-600 rounded"></div>
          <div className="w-8 h-28 bg-slate-600 rounded"></div>
          <div className="w-8 h-36 bg-slate-600 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <div>Нет данных для отображения</div>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  
  return (
    <div className="w-full h-64 p-4">
      <div className="h-48 flex items-end justify-between gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center group">
            <div className="relative w-full max-w-8">
              <div 
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-500 hover:to-blue-300 relative"
                style={{ 
                  height: `${(item.revenue / maxRevenue) * 180}px`,
                  minHeight: '10px'
                }}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap border border-slate-600 z-10">
                  <div>{item.revenue.toLocaleString()} ₽</div>
                  <div className="text-slate-400">{item.transactions} транз.</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-2 text-center">{item.period}</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Ось Y */}
      <div className="absolute left-0 top-4 h-48 flex flex-col justify-between text-xs text-slate-500">
        <span>{(maxRevenue / 1000).toFixed(0)}k</span>
        <span>{(maxRevenue / 2000).toFixed(0)}k</span>
        <span>0</span>
      </div>
    </div>
  );
};

// 🚨 УДАЛЕН: Дополнительные метрики с демо данными
// ❌ БЕЗОПАСНОСТЬ: Блок содержал фиктивные демо показатели:
// - "Пиковые часы: 14:00-18:00" 
// - "Конверсия: 78.5%" 
// - "Средняя очередь: 3.2 мин"
// - "Повторные клиенты: 45%"
// 
// ✅ FAIL-SECURE: В физической топливной системе показ фиктивных метрик
// может привести к неверным управленческим решениям и финансовым потерям.
// Удален полностью до реализации реальных расчетов метрик.

interface SalesAnalysisChartsSimpleProps {
  selectedNetwork?: Network | null;
  selectedTradingPoint?: string;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: string;
}

export function SalesAnalysisChartsSimple({ selectedNetwork, selectedTradingPoint, dateFrom, dateTo, groupBy }: SalesAnalysisChartsSimpleProps) {
  const [chartsData, setChartsData] = useState<ChartsData>({
    fuelData: [],
    paymentData: [],
    trendData: [],
    loading: true
  });

  // Загрузка данных для графиков
  useEffect(() => {
    async function loadChartsData() {
      if (!selectedNetwork) {
        setChartsData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setChartsData(prev => ({ ...prev, loading: true }));

        // Подготавливаем фильтры
        const filters: any = {};
        
        // Если выбрана конкретная торговая точка
        if (selectedTradingPoint && selectedTradingPoint !== "all") {
          // Используем UUID торговой точки напрямую для фильтрации
          filters.tradingPointId = selectedTradingPoint;
          console.log('🎯 Charts: Фильтруем по торговой точке (UUID):', { 
            selectedTradingPoint
          });
        } else {
          console.log('📊 Charts: Загружаем данные по всей сети');
        }

        // Фильтр по завершенным операциям с переданными датами или за последнюю неделю
        let startDateValue, endDateValue;
        
        if (dateFrom && dateTo) {
          startDateValue = dateFrom;
          endDateValue = dateTo;
          console.log('📅 Charts using provided date range:', { dateFrom, dateTo });
        } else {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDateValue = startDate.toISOString().split('T')[0];
          endDateValue = endDate.toISOString().split('T')[0];
          console.log('📅 Charts using default 7-day range:', { startDateValue, endDateValue });
        }
        
        filters.status = 'completed';
        filters.startDate = startDateValue;
        filters.endDate = endDateValue;
        
        if (groupBy) {
          console.log('📊 Charts grouping by:', groupBy);
          filters.groupBy = groupBy;
        }

        console.log('📊 Charts: Loading operations with filters:', filters);
        
        // Получаем операции из Supabase
        const operations = await operationsSupabaseService.getOperations(filters);
        
        console.log('📊 Charts: Loaded operations:', operations.length);
        
        // Детальное логирование для диагностики
        if (selectedTradingPoint && selectedTradingPoint !== "all") {
          const uniqueTradingPoints = [...new Set(operations.map(op => op.tradingPointId).filter(Boolean))];
          console.log('📊 Charts: Диагностика фильтрации по торговой точке:');
          console.log('   - Выбранная торговая точка:', selectedTradingPoint);
          console.log('   - Операций получено после фильтрации:', operations.length);
          console.log('   - Уникальные торговые точки в операциях:', uniqueTradingPoints);
        }
        
        // Обрабатываем данные по видам топлива
        const fuelStats: Record<string, { count: number, amount: number }> = {};
        const paymentStats: Record<string, { count: number, amount: number }> = {};
        const dailyStats: Record<string, { revenue: number, transactions: number }> = {};

        operations.forEach(op => {
          const cost = op.totalCost || 0;
          
          // Статистика по топливу
          if (op.fuelType) {
            if (!fuelStats[op.fuelType]) {
              fuelStats[op.fuelType] = { count: 0, amount: 0 };
            }
            fuelStats[op.fuelType].count++;
            fuelStats[op.fuelType].amount += cost;
          }

          // Статистика по оплате
          if (op.paymentMethod) {
            const paymentName = op.paymentMethod === 'bank_card' ? 'Банк. карты' :
                               op.paymentMethod === 'cash' ? 'Наличные' :
                               op.paymentMethod === 'corporate_card' ? 'Корп. карты' : 'Другое';
            
            if (!paymentStats[paymentName]) {
              paymentStats[paymentName] = { count: 0, amount: 0 };
            }
            paymentStats[paymentName].count++;
            paymentStats[paymentName].amount += cost;
          }

          // Статистика по дням
          const day = new Date(op.startTime).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
          if (!dailyStats[day]) {
            dailyStats[day] = { revenue: 0, transactions: 0 };
          }
          dailyStats[day].revenue += cost;
          dailyStats[day].transactions++;
        });

        // Конвертируем в нужный формат
        const totalAmount = operations.reduce((sum, op) => sum + (op.totalCost || 0), 0);
        
        const fuelColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const fuelData: FuelData[] = Object.entries(fuelStats).map(([name, stats], index) => ({
          name,
          value: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
          amount: stats.amount,
          color: fuelColors[index % fuelColors.length]
        }));

        const paymentColors = ['#3b82f6', '#10b981', '#6b7280'];
        const paymentData: PaymentData[] = Object.entries(paymentStats).map(([name, stats], index) => ({
          name,
          value: totalAmount > 0 ? (stats.amount / totalAmount) * 100 : 0,
          amount: stats.amount,
          color: paymentColors[index % paymentColors.length]
        }));

        const trendData: TrendData[] = Object.entries(dailyStats)
          .map(([period, stats]) => ({ period, ...stats }))
          .sort((a, b) => a.period.localeCompare(b.period));

        setChartsData({
          fuelData,
          paymentData,
          trendData,
          loading: false
        });

      } catch (error) {
        console.error('❌ Error loading charts data:', error);
        setChartsData(prev => ({ ...prev, loading: false }));
      }
    }

    loadChartsData();
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo, groupBy]);

  return (
    <div className="space-y-6">
      {/* Основные графики */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base lg:text-lg">
              <span>⛽</span>
              Продажи по видам топлива
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <FuelChart data={chartsData.fuelData} loading={chartsData.loading} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base lg:text-lg">
              <span>📊</span>
              Динамика продаж
            </CardTitle>
          </CardHeader>
          <CardContent className="relative p-4">
            <TrendChart data={chartsData.trendData} loading={chartsData.loading} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center gap-2 text-base lg:text-lg">
              <span>💳</span>
              Продажи по видам оплаты
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <PaymentChart data={chartsData.paymentData} loading={chartsData.loading} />
          </CardContent>
        </Card>
        </div>
      </div>

    </div>
  );
}