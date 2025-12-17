import React, { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Smartphone, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PaymentStat {
  type: string;
  displayName: string;
  operations: number;
  revenue: number;
  volume: number;
  avgCheck: number;
  share: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface PaymentDistributionChartProps {
  data: PaymentStat[];
  isMobile?: boolean;
}

// Цвета для способов оплаты
const PAYMENT_COLORS = {
  cash: '#10b981',           // green-500
  bank_card: '#3b82f6',      // blue-500
  online_order: '#8b5cf6',   // purple-500
  fuel_card: '#f59e0b',      // amber-500
  corporate_card: '#ef4444', // red-500 - корпоративные карты
  coupon: '#ec4899',         // pink-500 - купоны
  default: '#6b7280'         // gray-500
};

// Иконки для способов оплаты
const getPaymentIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return <Banknote className="w-5 h-5" />;
    case 'bank_card':
      return <CreditCard className="w-5 h-5" />;
    case 'online_order':
      return <Smartphone className="w-5 h-5" />;
    default:
      return <CreditCard className="w-5 h-5" />;
  }
};

// Получить цвет для способа оплаты
const getPaymentColor = (type: string): string => {
  return PAYMENT_COLORS[type as keyof typeof PAYMENT_COLORS] || PAYMENT_COLORS.default;
};

// Иконка тренда
const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

export const PaymentDistributionChart = memo(function PaymentDistributionChart({
  data,
  isMobile = false
}: PaymentDistributionChartProps) {

  if (!data || data.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-400" />
            Распределение способов оплаты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>Нет данных</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Подготовка данных для Pie Chart
  const pieData = data.map(payment => ({
    name: payment.displayName,
    value: payment.revenue,
    count: payment.operations,
    volume: payment.volume,
    share: payment.share
  }));

  // Вычисляем итоговые значения
  const totalOperations = data.reduce((sum, p) => sum + p.operations, 0);
  const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0);
  const totalVolume = data.reduce((sum, p) => sum + p.volume, 0);

  // Вычисляем примерную комиссию эквайринга (1.5% от суммы по картам)
  const cardRevenue = data.find(p => p.type === 'bank_card')?.revenue || 0;
  const acquiringFee = cardRevenue * 0.015; // 1.5% комиссия

  // Custom label для pie chart
  const renderCustomLabel = (entry: any) => {
    return `${entry.share.toFixed(0)}%`;
  };

  return (
    <Card className={`bg-slate-800 border-slate-600 ${isMobile ? '' : 'lg:h-full lg:flex lg:flex-col'}`}>
      <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
        <CardTitle className={`text-white ${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
          <CreditCard className="h-5 w-5 text-blue-400" />
          Способы оплаты
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-3 ${isMobile ? '' : 'lg:flex-1 lg:flex lg:flex-col'}`}>
        {/* Круговая диаграмма */}
        <div className="w-full" style={{ height: isMobile ? '180px' : '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={isMobile ? 60 : 70}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getPaymentColor(entry.type)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium mb-2">{data.name}</p>
                      <div className="space-y-1 text-xs">
                        <p className="text-slate-300">
                          Выручка: <span className="font-medium">{data.value.toLocaleString('ru-RU')}₽</span>
                        </p>
                        <p className="text-slate-300">
                          Операций: <span className="font-medium">{data.count}</span>
                        </p>
                        <p className="text-slate-300">
                          Объем: <span className="font-medium">{data.volume.toFixed(0)} л</span>
                        </p>
                        <p className="text-blue-400">
                          Доля: <span className="font-medium">{data.share.toFixed(1)}%</span>
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Легенда */}
        <div className="space-y-2">
          {data.map((payment) => (
            <div key={payment.type} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getPaymentColor(payment.type) }}
                />
                <span className="text-slate-300">{payment.displayName}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">{payment.operations} оп.</span>
                <span className="text-white font-medium">{payment.share.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Оптимизация: пересчитываем только если данные изменились
  return (
    prevProps.data === nextProps.data &&
    prevProps.isMobile === nextProps.isMobile
  );
});
