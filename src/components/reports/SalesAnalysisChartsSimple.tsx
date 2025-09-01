import React from "react";
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

// Простая круговая диаграмма с CSS
const FuelChart = () => {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center px-2">
      {/* Диаграмма */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="w-32 h-32 rounded-full relative overflow-hidden flex-shrink-0">
          {/* Сегменты */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(
                #60a5fa 0deg ${mockFuelData[0].value * 3.6}deg,
                #4ade80 ${mockFuelData[0].value * 3.6}deg ${(mockFuelData[0].value + mockFuelData[1].value) * 3.6}deg,
                #9ca3af ${(mockFuelData[0].value + mockFuelData[1].value) * 3.6}deg 360deg
              )`
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
          {mockFuelData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{item.name}</div>
                <div className="text-xs text-slate-400 truncate">{item.value}% • {item.amount.toLocaleString()} ₽</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Диаграмма способов оплаты
const PaymentChart = () => {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center px-2">
      {/* Диаграмма */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="w-32 h-32 rounded-full relative overflow-hidden flex-shrink-0">
          {/* Сегменты */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(
                #3b82f6 0deg ${mockPaymentData[0].value * 3.6}deg,
                #10b981 ${mockPaymentData[0].value * 3.6}deg ${(mockPaymentData[0].value + mockPaymentData[1].value) * 3.6}deg,
                #6b7280 ${(mockPaymentData[0].value + mockPaymentData[1].value) * 3.6}deg 360deg
              )`
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
          {mockPaymentData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">{item.name}</div>
                <div className="text-xs text-slate-400 truncate">{item.value}% • {item.amount.toLocaleString()} ₽</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Простой столбчатый график
const TrendChart = () => {
  const maxRevenue = Math.max(...mockTrendData.map(d => d.revenue));
  
  return (
    <div className="w-full h-64 p-4">
      <div className="h-48 flex items-end justify-between gap-1">
        {mockTrendData.map((item, index) => (
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

// Дополнительные метрики
const MetricsGrid = () => {
  const metrics = [
    { label: "Пиковые часы", value: "14:00-18:00", icon: "⏰", trend: "+5%" },
    { label: "Конверсия", value: "78.5%", icon: "📈", trend: "+2.1%" },
    { label: "Средняя очередь", value: "3.2 мин", icon: "⏱️", trend: "-0.8%" },
    { label: "Повторные клиенты", value: "45%", icon: "🔄", trend: "+12%" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-slate-700 rounded-lg p-4 text-center hover:bg-slate-600 transition-colors">
          <div className="text-2xl mb-2">{metric.icon}</div>
          <div className="text-white font-semibold">{metric.value}</div>
          <div className="text-slate-400 text-sm mb-1">{metric.label}</div>
          <div className={`text-xs font-medium ${metric.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
            {metric.trend}
          </div>
        </div>
      ))}
    </div>
  );
};

interface SalesAnalysisChartsSimpleProps {
  selectedNetwork?: string;
  selectedTradingPoint?: string;
}

export function SalesAnalysisChartsSimple({ selectedNetwork, selectedTradingPoint }: SalesAnalysisChartsSimpleProps) {
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
            <FuelChart />
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
            <TrendChart />
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
            <PaymentChart />
          </CardContent>
        </Card>
        </div>
      </div>

    </div>
  );
}