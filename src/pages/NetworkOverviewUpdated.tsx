import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { SalesAnalysisSimple } from "@/components/reports/SalesAnalysisSimple";
import { SalesAnalysisChartsSimple } from "@/components/reports/SalesAnalysisChartsSimple";
import { MainLayout } from "@/components/layout/MainLayout";
import { HelpButton } from "@/components/help/HelpButton";
import { DollarSign, Users, Fuel, Monitor, CreditCard, Store, Database, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import services
import { tradingPointsService } from "@/services/tradingPointsService";
import { equipmentSupabaseService } from "@/services/equipmentSupabase";
import { usersService } from "@/services/usersService";

interface NetworkStats {
  tradingPoints: number;
  tanks: number;
  users: number;
  totalFuelVolume: number;
  tanksByFuelType: Record<string, number>;
  loading: boolean;
}

const MetricCard = ({ title, value, icon: IconComponent, color, status, trend, loading }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  status?: { online: number; offline: number };
  trend?: string;
  loading?: boolean;
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
          {loading ? (
            <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
          ) : (
            value
          )}
        </div>
        {trend && !loading && (
          <p className={`text-xs ${trend.startsWith('+') ? 'text-green-400' : trend.startsWith('-') ? 'text-red-400' : 'text-slate-400'}`}>
            {trend}
          </p>
        )}
        {status && !loading && (
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

export default function NetworkOverviewUpdated() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояния фильтров
  const [dateFrom, setDateFrom] = useState("2024-12-01");
  const [dateTo, setDateTo] = useState("2024-12-07");
  const [groupBy, setGroupBy] = useState("7days");
  
  // Состояние статистики
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    tradingPoints: 0,
    tanks: 0,
    users: 0,
    totalFuelVolume: 0,
    tanksByFuelType: {},
    loading: true
  });

  // Загрузка статистики
  useEffect(() => {
    async function loadNetworkStats() {
      if (!selectedNetwork) {
        setNetworkStats(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setNetworkStats(prev => ({ ...prev, loading: true }));

        // Параллельная загрузка данных
        const [tradingPointsData, equipmentData, usersData] = await Promise.all([
          tradingPointsService.getAll({ network_id: selectedNetwork.id }),
          equipmentSupabaseService.getAll(),
          usersService.getAll()
        ]);

        // Фильтруем equipment по торговым точкам выбранной сети
        const networkTradingPointIds = tradingPointsData.map(tp => tp.id);
        const networkEquipment = equipmentData.filter(eq => 
          networkTradingPointIds.includes(eq.trading_point_id)
        );

        // Подсчитываем статистику по видам топлива и объемам
        const fuelTypeStats: Record<string, number> = {};
        let totalVolume = 0;

        networkEquipment.forEach(equipment => {
          if (equipment.params) {
            // Тип топлива
            const fuelType = equipment.params['Тип топлива'] || 'Неизвестно';
            fuelTypeStats[fuelType] = (fuelTypeStats[fuelType] || 0) + 1;

            // Объем топлива
            const currentLevel = equipment.params['Текущий уровень (л)'];
            if (typeof currentLevel === 'number') {
              totalVolume += currentLevel;
            }
          }
        });

        setNetworkStats({
          tradingPoints: tradingPointsData.length,
          tanks: networkEquipment.length,
          users: usersData.length,
          totalFuelVolume: totalVolume,
          tanksByFuelType: fuelTypeStats,
          loading: false
        });

      } catch (error) {
        console.error('Error loading network stats:', error);
        setNetworkStats(prev => ({ ...prev, loading: false }));
      }
    }

    loadNetworkStats();
  }, [selectedNetwork]);

  const formatFuelVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}М л`;
    } else if (volume >= 1000) {
      return `${Math.round(volume / 1000)}К л`;
    } else {
      return `${Math.round(volume)} л`;
    }
  };

  // Определяем статус танков (пример: 85% онлайн)
  const tankStatus = {
    online: Math.floor(networkStats.tanks * 0.85),
    offline: Math.ceil(networkStats.tanks * 0.15)
  };

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Заголовок страницы */}
          <div className="mb-6 pt-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white">Обзор сети</h1>
                <p className="text-slate-400 mt-2">
                  {selectedNetwork 
                    ? `Общая информация по сети: ${selectedNetwork.name}`
                    : 'Общая информация и аналитика по торговой сети'
                  }
                </p>
              </div>
              <HelpButton route="/dashboard" variant="text" className="flex-shrink-0" />
            </div>
          </div>

          <div className="space-y-6">
            {/* Главная сетка плиток */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <MetricCard
                title="Точки торговли"
                value={networkStats.tradingPoints.toString()}
                icon={Store}
                color="blue"
                trend={networkStats.tradingPoints > 0 ? "Активных точек в сети" : "Выберите сеть для просмотра"}
                loading={networkStats.loading}
              />
              
              <MetricCard
                title="Резервуары"
                value={networkStats.tanks.toString()}
                icon={Database}
                color="green"
                trend={networkStats.tanks > 0 ? "Общее количество резервуаров" : "Ожидание данных"}
                status={networkStats.tanks > 0 ? tankStatus : undefined}
                loading={networkStats.loading}
              />
              
              <MetricCard
                title="Пользователи"
                value={networkStats.users.toString()}
                icon={UserCheck}
                color="purple"
                trend={networkStats.users > 0 ? "Пользователей в системе" : "Ожидание данных"}
                loading={networkStats.loading}
              />
              
              <MetricCard
                title="Общий остаток топлива"
                value={formatFuelVolume(networkStats.totalFuelVolume)}
                icon={Fuel}
                color="orange"
                trend={networkStats.totalFuelVolume > 0 ? "Текущий остаток в резервуарах" : "Ожидание данных"}
                loading={networkStats.loading}
              />
            </div>

            {/* Дополнительная информация по видам топлива */}
            {selectedNetwork && Object.keys(networkStats.tanksByFuelType).length > 0 && (
              <div className="bg-slate-800 border border-slate-600 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Распределение резервуаров по видам топлива</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(networkStats.tanksByFuelType).map(([fuelType, count]) => (
                    <div key={fuelType} className="bg-slate-700 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-white">{count}</div>
                      <div className="text-sm text-slate-300">{fuelType}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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