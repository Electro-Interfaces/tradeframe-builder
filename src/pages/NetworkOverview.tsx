import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { SalesAnalysisSimple } from "@/components/reports/SalesAnalysisSimple";
import { SalesAnalysisChartsSimple } from "@/components/reports/SalesAnalysisChartsSimple";
import { MainLayout } from "@/components/layout/MainLayout";
import { DollarSign, Users, Fuel, Monitor, CreditCard, Store, Database, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MetricCard = ({ title, value, icon: IconComponent, color, status, trend }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  status?: { online: number; offline: number };
  trend?: string;
}) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-200">
          {title}
        </CardTitle>
        <IconComponent className={`h-4 w-4 text-${color}-400`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {value}
        </div>
        {trend && (
          <p className={`text-xs ${trend.startsWith('+') ? 'text-green-400' : trend.startsWith('-') ? 'text-red-400' : 'text-slate-400'}`}>
            {trend}
          </p>
        )}
        {status && (
          <div className="flex items-center gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-slate-300">{status.online} онлайн</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-slate-300">{status.offline} офлайн</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function NetworkOverview() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояния фильтров
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-07");
  const [groupBy, setGroupBy] = useState("7days");

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Заголовок страницы */}
          <div className="mb-6 pt-4">
            <h1 className="text-2xl font-semibold text-white">Обзор сети</h1>
            <p className="text-slate-400 mt-2">Общая информация и аналитика по торговой сети</p>
          </div>

          <div className="space-y-6">

          {/* Главная сетка плиток */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <MetricCard
            title="Точки торговли"
            value="0"
            icon={Store}
            color="blue"
            trend="Активных точек в сети"
          />
          
          <MetricCard
            title="Резервуары"
            value="0"
            icon={Database}
            color="green"
            trend="Общее количество резервуаров"
          />
          
          <MetricCard
            title="Пользователи"
            value="0"
            icon={UserCheck}
            color="purple"
            trend="Активных пользователей системы"
          />
          
          <MetricCard
            title="Общий остаток топлива"
            value="0 л"
            icon={Fuel}
            color="orange"
            trend="Текущий остаток в резервуарах"
          />
          </div>
          
            {/* Фильтры - только если выбрана сеть */}
          {selectedNetwork && (
          <div className={`bg-slate-800 border border-slate-600 rounded-lg ${isMobile ? 'p-4' : 'p-6'} w-full`}>
            <div className={`flex items-center gap-3 ${isMobile ? 'mb-3' : 'mb-4'}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>Фильтры анализа</h2>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
              {/* Дата начала */}
              <div>
                <Label htmlFor="dateFrom" className="text-sm text-slate-400 mb-2 block">Дата начала</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              {/* Дата окончания */}
              <div>
                <Label htmlFor="dateTo" className="text-sm text-slate-400 mb-2 block">Дата окончания</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              {/* Группировка */}
              <div>
                <Label className="text-sm text-slate-400 mb-2 block">Группировка</Label>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Выберите группировку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">7 дней</SelectItem>
                    <SelectItem value="month">Месяц</SelectItem>
                    <SelectItem value="quarter">Квартал</SelectItem>
                    <SelectItem value="year">Год</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

          {/* Компоненты анализа продаж - только если выбрана сеть */}
          {selectedNetwork && (
          <div className="space-y-8">
            <SalesAnalysisSimple 
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
            <SalesAnalysisChartsSimple 
              selectedNetwork={selectedNetwork}
              selectedTradingPoint={selectedTradingPoint}
            />
          </div>
        )}

          {/* Сообщение о выборе сети */}
          {!selectedNetwork && (
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center w-full">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-slate-400 text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра отчетов</h3>
              <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}