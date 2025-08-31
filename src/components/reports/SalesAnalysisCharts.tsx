import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data для графиков
const mockFuelData = [
  { name: "АИ-95", value: 45, amount: 1281234, color: "#60a5fa" },
  { name: "АИ-92", value: 35, amount: 996223, color: "#4ade80" },
  { name: "ДТ", value: 20, amount: 570178, color: "#9ca3af" }
];

const mockPaymentData = [
  { name: "Банк. карты", value: 65, amount: 1850763, color: "#3b82f6" },
  { name: "Наличные", value: 25, amount: 711909, color: "#10b981" },
  { name: "Корп. карты", value: 10, amount: 284963, color: "#6b7280" }
];

const mockTrendData = [
  { period: "01.12", revenue: 245000, transactions: 87 },
  { period: "02.12", revenue: 267000, transactions: 92 },
  { period: "03.12", revenue: 298000, transactions: 105 },
  { period: "04.12", revenue: 276000, transactions: 98 },
  { period: "05.12", revenue: 312000, transactions: 112 },
  { period: "06.12", revenue: 289000, transactions: 101 },
  { period: "07.12", revenue: 334000, transactions: 118 }
];

// Компонент загрузки
const ChartSkeleton = () => (
  <div className="w-full h-64 bg-slate-700 rounded-lg flex items-center justify-center">
    <div className="text-slate-400">Загрузка графика...</div>
  </div>
);

// Компонент графика топлива
const FuelChart = () => {
  const [isClient, setIsClient] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <ChartSkeleton />;
  }

  return (
    <React.Suspense fallback={<ChartSkeleton />}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={mockFuelData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {mockFuelData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </React.Suspense>
  );
};

// Компонент графика трендов
const TrendChart = () => {
  const [isClient, setIsClient] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <ChartSkeleton />;
  }

  return (
    <React.Suspense fallback={<ChartSkeleton />}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockTrendData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="period" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #475569',
              borderRadius: '6px',
              color: '#f1f5f9'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Выручка"
          />
          <Line 
            type="monotone" 
            dataKey="transactions" 
            stroke="#10b981" 
            strokeWidth={2}
            name="Транзакции"
          />
        </LineChart>
      </ResponsiveContainer>
    </React.Suspense>
  );
};

interface SalesAnalysisChartsProps {
  selectedNetwork?: string;
  selectedTradingPoint?: string;
}

export function SalesAnalysisCharts({ selectedNetwork, selectedTradingPoint }: SalesAnalysisChartsProps) {
  return (
    <div className="space-y-6">
      {/* Распределение по видам топлива */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Продажи по видам топлива</CardTitle>
          </CardHeader>
          <CardContent>
            <FuelChart />
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Тренд продаж</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart />
          </CardContent>
        </Card>
      </div>

      {/* Дополнительная аналитика */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Дополнительные метрики</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <h4 className="text-sm text-slate-400 mb-2">Топ продукт</h4>
              <p className="text-lg font-semibold">АИ-95 (45%)</p>
            </div>
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <h4 className="text-sm text-slate-400 mb-2">Пик продаж</h4>
              <p className="text-lg font-semibold">14:00 - 18:00</p>
            </div>
            <div className="text-center p-4 bg-slate-700 rounded-lg">
              <h4 className="text-sm text-slate-400 mb-2">Конверсия</h4>
              <p className="text-lg font-semibold">78.5%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}