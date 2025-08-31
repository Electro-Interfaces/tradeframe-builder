import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CreditCard, Fuel, Users, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

// Mock data без графиков
const mockKpiData = {
  totalRevenue: 2847635,
  totalTransactions: 1247,
  totalFuelLiters: 45832,
  averageTicket: 2284,
  cashlessPercentage: 78.5
};

interface SalesAnalysisProps {
  selectedNetwork?: string;
  selectedTradingPoint?: string;
}

export function SalesAnalysisSimple({ selectedNetwork, selectedTradingPoint }: SalesAnalysisProps) {
  const isMobile = useIsMobile();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Общая выручка
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(selectedTradingPoint ? mockKpiData.totalRevenue / 5 : mockKpiData.totalRevenue)}
            </div>
            <p className="text-xs text-green-400">
              +12% к предыдущему периоду
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Транзакции
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(selectedTradingPoint ? Math.floor(mockKpiData.totalTransactions / 5) : mockKpiData.totalTransactions).toLocaleString()}
            </div>
            <p className="text-xs text-blue-400">
              +8% к предыдущему периоду
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Топлива отпущено
            </CardTitle>
            <Fuel className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {(selectedTradingPoint ? Math.floor(mockKpiData.totalFuelLiters / 5) : mockKpiData.totalFuelLiters).toLocaleString()} л
            </div>
            <p className="text-xs text-orange-400">
              +5% к предыдущему периоду
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Средний чек
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(mockKpiData.averageTicket)}
            </div>
            <p className="text-xs text-purple-400">
              +3% к предыдущему периоду
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">
              Доля безналичных
            </CardTitle>
            <CreditCard className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {mockKpiData.cashlessPercentage}%
            </div>
            <p className="text-xs text-cyan-400">
              +2% к предыдущему периоду
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}