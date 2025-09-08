import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CreditCard, Fuel, Users, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { tradingPointsService } from "@/services/tradingPointsService";
import { Network } from "@/types/network";
import { TradingPoint } from "@/types/tradingpoint";

interface SalesAnalysisData {
  totalRevenue: number;
  totalTransactions: number;
  totalFuelLiters: number;
  averageTicket: number;
  cashlessPercentage: number;
  loading: boolean;
}

interface SalesAnalysisProps {
  selectedNetwork?: Network | null;
  selectedTradingPoint?: string;
  dateFrom?: string;
  dateTo?: string;
  groupBy?: string;
}

export function SalesAnalysisSimple({ selectedNetwork, selectedTradingPoint, dateFrom, dateTo, groupBy }: SalesAnalysisProps) {
  const isMobile = useIsMobile();
  
  const [salesData, setSalesData] = useState<SalesAnalysisData>({
    totalRevenue: 0,
    totalTransactions: 0,
    totalFuelLiters: 0,
    averageTicket: 0,
    cashlessPercentage: 0,
    loading: true
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Загрузка данных операций
  useEffect(() => {
    async function loadSalesData() {
      if (!selectedNetwork) {
        setSalesData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setSalesData(prev => ({ ...prev, loading: true }));

        // Подготавливаем фильтры
        const filters: any = {};
        
        // Если выбрана конкретная торговая точка
        if (selectedTradingPoint && selectedTradingPoint !== "all") {
          // Используем UUID торговой точки напрямую для фильтрации
          filters.tradingPointId = selectedTradingPoint;
          console.log('🎯 Фильтруем по торговой точке (UUID):', { 
            selectedTradingPoint
          });
        } else {
          console.log('📊 Загружаем данные по всей сети');
        }

        // Фильтр по завершенным операциям с переданными датами или за последнюю неделю
        let startDateValue, endDateValue;
        
        if (dateFrom && dateTo) {
          startDateValue = dateFrom;
          endDateValue = dateTo;
          console.log('📅 Using provided date range:', { dateFrom, dateTo });
        } else {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          startDateValue = startDate.toISOString().split('T')[0];
          endDateValue = endDate.toISOString().split('T')[0];
          console.log('📅 Using default 7-day range:', { startDateValue, endDateValue });
        }
        
        filters.status = 'completed';
        filters.startDate = startDateValue;
        filters.endDate = endDateValue;
        
        if (groupBy) {
          console.log('📊 Grouping by:', groupBy);
          filters.groupBy = groupBy;
        }

        console.log('🔍 Loading sales data with filters:', filters);
        
        // Получаем операции из Supabase
        let operations = await operationsSupabaseService.getOperations(filters);
        
        // Если выбрана вся сеть (не конкретная торговая точка), то фильтруем по торговым точкам этой сети
        if (selectedNetwork && (!selectedTradingPoint || selectedTradingPoint === "all")) {
          console.log('🏪 Фильтруем операции по всей сети:', selectedNetwork.id);
          
          try {
            // Получаем торговые точки для выбранной сети
            const tradingPoints = await tradingPointsService.getByNetworkId(selectedNetwork.id);
            const networkTradingPointIds = tradingPoints.map(tp => tp.id);
            
            console.log('🏪 UUID торговых точек сети:', networkTradingPointIds);
            
            // Фильтруем операции по UUID торговых точек сети
            operations = operations.filter(op => 
              op.tradingPointId && networkTradingPointIds.includes(op.tradingPointId)
            );
            
            console.log('🏪 Операций после фильтрации по сети:', operations.length);
            
          } catch (error) {
            console.error('❌ Ошибка при получении торговых точек сети:', error);
          }
        }

        console.log('📊 Loaded operations for analysis:', operations.length);
        
        // Логируем уникальные торговые точки в полученных операциях
        const uniqueTradingPoints = [...new Set(operations.map(op => op.tradingPointId).filter(Boolean))];
        console.log('🏪 Уникальные торговые точки в операциях:', uniqueTradingPoints);
        
        // Детальное логирование для диагностики фильтрации по торговой точке
        if (selectedTradingPoint && selectedTradingPoint !== "all") {
          console.log('🔍 Диагностика фильтрации по торговой точке:');
          console.log('   - Выбранная торговая точка:', selectedTradingPoint);
          console.log('   - Тип выбранной торговой точки:', typeof selectedTradingPoint);
          console.log('   - Уникальные торговые точки в операциях:', uniqueTradingPoints);
          console.log('   - Типы торговых точек в операциях:', uniqueTradingPoints.map(id => typeof id));
          
          const exactMatches = operations.filter(op => op.tradingPointId === selectedTradingPoint);
          const stringMatches = operations.filter(op => String(op.tradingPointId) === String(selectedTradingPoint));
          
          console.log(`   - Точных совпадений (===): ${exactMatches.length}`);
          console.log(`   - Строковых совпадений: ${stringMatches.length}`);
          console.log('   - Образцы операций с точкой:', operations.slice(0, 3).map(op => ({
            id: op.id,
            tradingPointId: op.tradingPointId,
            tradingPointIdType: typeof op.tradingPointId
          })));
        }

        // Вычисляем метрики
        const totalRevenue = operations.reduce((sum, op) => sum + (op.totalCost || 0), 0);
        const totalTransactions = operations.length;
        const totalFuelLiters = operations.reduce((sum, op) => sum + (op.quantity || 0), 0);
        const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        // Процент безналичных операций
        const cashlessOperations = operations.filter(op => 
          op.paymentMethod === 'bank_card' || 
          op.paymentMethod === 'corporate_card'
        ).length;
        const cashlessPercentage = totalTransactions > 0 ? (cashlessOperations / totalTransactions) * 100 : 0;

        setSalesData({
          totalRevenue,
          totalTransactions,
          totalFuelLiters,
          averageTicket,
          cashlessPercentage,
          loading: false
        });

        console.log('✅ Sales data calculated:', {
          totalRevenue,
          totalTransactions,
          totalFuelLiters,
          averageTicket,
          cashlessPercentage: `${cashlessPercentage.toFixed(1)}%`
        });

      } catch (error) {
        console.error('❌ Error loading sales data:', error);
        setSalesData(prev => ({ ...prev, loading: false }));
      }
    }

    loadSalesData();
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo, groupBy]);

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
              {salesData.loading ? (
                <div className="animate-pulse bg-slate-600 h-8 w-24 rounded"></div>
              ) : (
                formatCurrency(salesData.totalRevenue)
              )}
            </div>
            <p className="text-xs text-green-400">
              {selectedTradingPoint ? 'За неделю по точке' : 'За неделю по сети'}
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
              {salesData.loading ? (
                <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
              ) : (
                salesData.totalTransactions.toLocaleString()
              )}
            </div>
            <p className="text-xs text-blue-400">
              {selectedTradingPoint ? 'Операций по точке' : 'Операций по сети'}
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
              {salesData.loading ? (
                <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
              ) : (
                `${salesData.totalFuelLiters.toLocaleString()} л`
              )}
            </div>
            <p className="text-xs text-orange-400">
              {selectedTradingPoint ? 'Литров по точке' : 'Литров по сети'}
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
              {salesData.loading ? (
                <div className="animate-pulse bg-slate-600 h-8 w-20 rounded"></div>
              ) : (
                formatCurrency(salesData.averageTicket)
              )}
            </div>
            <p className="text-xs text-purple-400">
              Средняя стоимость операции
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
              {salesData.loading ? (
                <div className="animate-pulse bg-slate-600 h-8 w-16 rounded"></div>
              ) : (
                `${salesData.cashlessPercentage.toFixed(1)}%`
              )}
            </div>
            <p className="text-xs text-cyan-400">
              Безналичные платежи
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}