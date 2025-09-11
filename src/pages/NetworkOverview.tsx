import React, { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { DollarSign, Users, Fuel, Monitor, CreditCard, Loader2, RefreshCw, Activity, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { stsApiService, Transaction } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
import { useToast } from "@/hooks/use-toast";
import { SalesForecast } from "@/components/charts/SalesForecast";


export default function NetworkOverview() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const { toast } = useToast();
  
  // Даты по умолчанию
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(today.getMonth() - 1);
  
  // Состояния фильтров
  const [dateFrom, setDateFrom] = useState(monthAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);

  // Состояния данных
  const [transactions, setTransactions] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [terminalInfo, setTerminalInfo] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;
  

  // Функция загрузки транзакций
  const loadTransactions = async () => {
    if (!selectedNetwork?.external_id) {
      toast({
        title: "Ошибка",
        description: "Выберите сеть с настроенным external_id",
        variant: "destructive",
      });
      return;
    }

    if (!stsApiService.isConfigured()) {
      toast({
        title: "Ошибка",
        description: "STS API не настроен. Перейдите в Настройки → API СТС",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Начинаем загрузку данных для NetworkOverview (только STS API)...');
      
      // Очищаем предыдущие данные
      setTransactions([]);
      setTanks([]);
      setTerminalInfo(null);
      setPrices([]);
      
      console.log('🔐 Проверяем авторизацию STS API...');
      
      // ЯВНОЕ ОБНОВЛЕНИЕ ТОКЕНА ПЕРЕД ЗАПРОСОМ
      try {
        // Принудительно обновляем токен через логин/пароль
        console.log('🔍 Принудительно обновляем токен STS API...');
        const tokenRefreshed = await stsApiService.forceRefreshToken();
        
        if (!tokenRefreshed) {
          throw new Error('Ошибка авторизации в STS API. Проверьте настройки логина/пароля.');
        }
        
        console.log('✅ Токен STS API успешно обновлен');
      } catch (authError) {
        console.error('❌ Ошибка авторизации STS API:', authError);
        toast({
          title: "Ошибка авторизации",
          description: "Не удалось авторизоваться в STS API. Проверьте логин/пароль в настройках.",
          variant: "destructive",
        });
        throw authError;
      }

      // Загружаем данные из STS API
      // Используем правильную логику получения contextParams как в Tanks.tsx
      let contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: undefined
      };

      // Если выбрана конкретная торговая точка (не 'all'), получаем её полные данные
      if (selectedTradingPoint && selectedTradingPoint !== 'all') {
        console.log('🔍 Загружаем торговую точку по ID:', selectedTradingPoint);
        
        try {
          const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
          if (tradingPointObject) {
            console.log('🏪 Полные данные торговой точки:', tradingPointObject);
            contextParams.tradingPointId = tradingPointObject.external_id || '1';
          }
        } catch (error) {
          console.warn('⚠️ Не удалось загрузить данные торговой точки:', error);
        }
      }
      
      console.log('🔍 Параметры запроса:', contextParams);
      console.log(`🔍 Загружаем транзакции из STS API (${contextParams.tradingPointId ? 'конкретная точка' : 'вся сеть'})...`);
      
      const stsTransactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        200,
        contextParams
      );
      
      console.log(`✅ Загружено ${stsTransactions.length} транзакций из STS API`);
      setTransactions(stsTransactions);

      // Загружаем дополнительные данные для более полного обзора
      let additionalDataLoaded = [];
      try {
        console.log('🔄 Загружаем дополнительные данные (резервуары, оборудование, цены)...');
        
        // Загружаем резервуары
        const tanksData = await stsApiService.getTanks(contextParams);
        console.log(`✅ Загружено ${tanksData.length} резервуаров`);
        setTanks(tanksData);
        if (tanksData.length > 0) additionalDataLoaded.push(`${tanksData.length} резервуаров`);

        // Загружаем информацию о терминале (если выбрана конкретная торговая точка)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== '1') {
          try {
            const terminalData = await stsApiService.getTerminalInfo(contextParams);
            console.log('✅ Загружена информация о терминале');
            setTerminalInfo(terminalData);
            if (terminalData) additionalDataLoaded.push('данные терминала');
          } catch (terminalError) {
            console.warn('⚠️ Не удалось загрузить информацию о терминале:', terminalError);
          }
        }

        // Загружаем цены (если выбрана конкретная торговая точка)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== '1') {
          try {
            const pricesData = await stsApiService.getPrices(contextParams);
            console.log(`✅ Загружено ${pricesData.length} цен`);
            setPrices(pricesData);
            if (pricesData.length > 0) additionalDataLoaded.push(`${pricesData.length} цен`);
          } catch (pricesError) {
            console.warn('⚠️ Не удалось загрузить цены:', pricesError);
          }
        }
        
      } catch (additionalDataError) {
        console.warn('⚠️ Не удалось загрузить дополнительные данные:', additionalDataError);
        // Не прерываем выполнение, так как основные данные (транзакции) уже загружены
      }
      
      const additionalText = additionalDataLoaded.length > 0 ? `, ${additionalDataLoaded.join(', ')}` : '';
      toast({
        title: "Успешно",
        description: `Загружено ${stsTransactions.length} транзакций${additionalText}`,
      });
      
    } catch (error) {
      console.error('❌ Ошибка загрузки транзакций:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Инициализация компонента
  useEffect(() => {
    console.log('🔄 NetworkOverview useEffect запущен');
    
    // Принудительная проверка конфигурации STS API (обходим кэш)
    const checkConfig = async () => {
      try {
        // Пытаемся получить свежую конфигурацию
        const isConfigured = stsApiService.isConfigured();
        console.log('🔍 STS API конфигурация проверена:', isConfigured);
        setStsApiConfigured(isConfigured);
        
        setInitializing(false);
        
        // Загружаем данные только если выбрана сеть И настроен STS API
        if (selectedNetwork && isConfigured) {
          console.log('✅ Все готово, загружаем данные');
          loadTransactions();
        } else if (selectedNetwork && !isConfigured) {
          console.log('⚠️ STS API не настроен, показываем сообщение');
          // Не показываем toast сразу, даем пользователю время
        }
      } catch (error) {
        console.error('❌ Ошибка при проверке конфигурации:', error);
        setInitializing(false);
      }
    };
    
    // Даем время контексту для инициализации, затем проверяем конфигурацию
    const initTimer = setTimeout(checkConfig, 1500); // Увеличиваем время до 1.5 сек

    return () => clearTimeout(initTimer);
  }, [selectedNetwork, selectedTradingPoint, dateFrom, dateTo]);

  // Вычисляемые статистики
  const completedTransactions = useMemo(() => {
    const completed = transactions.filter(tx => tx.status === 'completed' || !tx.status);
    
    console.log('All transactions analysis:', {
      totalTransactions: transactions.length,
      completedTransactions: completed.length,
      dateFrom,
      dateTo,
      sampleTransactionDates: transactions.slice(0, 5).map(tx => ({
        timestamp: tx.timestamp || tx.createdAt || tx.date,
        status: tx.status
      }))
    });
    
    return completed;
  }, [transactions, dateFrom, dateTo]);

  // Фильтрованные транзакции по диапазону дат для итогов
  const filteredTransactions = useMemo(() => {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    
    return completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
  }, [completedTransactions, dateFrom, dateTo]);

  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => 
      sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0
    );
  }, [filteredTransactions]);

  const totalVolume = useMemo(() => {
    return filteredTransactions.reduce((sum, tx) => 
      sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0
    );
  }, [filteredTransactions]);

  const averageCheck = useMemo(() => {
    return filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0;
  }, [totalRevenue, filteredTransactions.length]);

  // Статистика по видам топлива (с учетом фильтра по датам)
  const fuelTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    const fuelGroups = filteredTransactions.reduce((groups, tx) => {
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';
      if (!groups[fuelType]) {
        groups[fuelType] = [];
      }
      groups[fuelType].push(tx);
      return groups;
    }, {});

    return Object.entries(fuelGroups).map(([type, txs]) => {
      const revenue = txs.reduce((sum, tx) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum, tx) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // Функция для локализации способов оплаты
  const getPaymentTypeDisplayName = (paymentType) => {
    const translations = {
      'bank_card': 'Банковская карта',
      'card': 'Карта',
      'cash': 'Наличные',
      'mobile': 'Мобильная оплата',
      'qr': 'QR-код',
      'contactless': 'Бесконтактная оплата',
      'online': 'Онлайн платеж',
      'transfer': 'Перевод',
      'other': 'Другое'
    };
    return translations[paymentType?.toLowerCase()] || paymentType || 'Неизвестно';
  };

  // Статистика по способам оплаты (с учетом фильтра по датам)
  const paymentTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    const paymentGroups = filteredTransactions.reduce((groups, tx) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);
      if (!groups[paymentType]) {
        groups[paymentType] = [];
      }
      groups[paymentType].push(tx);
      return groups;
    }, {});

    return Object.entries(paymentGroups).map(([type, txs]) => {
      const revenue = txs.reduce((sum, tx) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum, tx) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // Данные для графика суточной активности (с учетом фильтра по датам)
  const dailyActivityData = useMemo(() => {
    if (completedTransactions.length === 0) return [];
    
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    
    // Фильтруем транзакции по диапазону дат
    const filteredTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    const hourlyActivity = Array(24).fill(0).map((_, hour) => ({
      hour: `${hour}:00`,
      hourNum: hour,
      operations: 0,
      revenue: 0
    }));
    
    filteredTransactions.forEach(tx => {
      const txTime = tx.timestamp || tx.createdAt || tx.date || tx.apiData?.timestamp;
      if (txTime) {
        const hour = new Date(txTime).getHours();
        if (hour >= 0 && hour < 24) {
          hourlyActivity[hour].operations++;
          hourlyActivity[hour].revenue += (tx.total || tx.actualAmount || tx.totalCost || 0);
        }
      }
    });
    
    return hourlyActivity;
  }, [completedTransactions, dateFrom, dateTo]);

  // Данные для группировки по дням с разбивкой по видам топлива
  const dailySalesData = useMemo(() => {
    if (completedTransactions.length === 0) return { data: [], fuelTypes: [] };
    
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    const grouped = {};
    
    // Фильтруем транзакции по диапазону дат
    const filteredTransactions = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    // Получаем все уникальные виды топлива
    const fuelTypes = [...new Set(filteredTransactions.map(tx => 
      tx.fuelType || tx.apiData?.product_name || 'Неизвестно'
    ).filter(Boolean))].sort();
    
    filteredTransactions.forEach(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      const dateKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: dateKey,
          operations: 0,
          revenue: 0,
          volume: 0,
          // Инициализируем поля для каждого вида топлива
          ...fuelTypes.reduce((acc, fuel) => {
            acc[fuel] = 0;
            return acc;
          }, {})
        };
      }
      
      const txRevenue = tx.total || tx.actualAmount || tx.totalCost || 0;
      grouped[dateKey].operations++;
      grouped[dateKey].revenue += txRevenue;
      grouped[dateKey].volume += (tx.volume || tx.actualQuantity || tx.quantity || 0);
      
      // Добавляем выручку к соответствующему виду топлива
      grouped[dateKey][fuelType] += txRevenue;
    });
    
    return {
      data: Object.values(grouped)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(item => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        })),
      fuelTypes
    };
  }, [completedTransactions, dateFrom, dateTo]);

  // Данные для тепловой карты активности по часам за последние 7 дней
  const heatmapData = useMemo(() => {
    console.log('Heatmap useMemo called:', {
      selectedNetwork: !!selectedNetwork,
      transactionsLength: transactions.length,
      willGenerate: !(!selectedNetwork || transactions.length === 0)
    });
    
    if (!selectedNetwork || transactions.length === 0) return [];
    
    // Берем последние 7 дней от сегодняшней даты назад
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Устанавливаем на конец дня
    
    console.log('Heatmap for last 7 days:', {
      today: today.toDateString(),
      transactionsTotal: transactions.length,
      sampleTodayTransactions: transactions.filter(tx => {
        const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return txDate >= todayStart && txDate <= today;
      }).length
    });
    
    // Создаем сетку 7 дней × 24 часа (последние 7 дней)
    const heatmapGrid = [];
    const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    // Генерируем последние 7 дней (от 6 дней назад до сегодня)
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const currentDate = new Date();
      currentDate.setDate(today.getDate() - dayOffset);
      currentDate.setHours(0, 0, 0, 0); // Устанавливаем на начало дня
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0=воскресенье, 1=понедельник, etc.
      
      const dayRow = {
        date: dateStr,
        dayName: dayNames[dayOfWeek],
        dayOfWeek: dayOfWeek,
        hours: []
      };
      
      // Генерируем 24 часа для этого дня
      for (let hour = 0; hour < 24; hour++) {
        const hourTransactions = transactions.filter(tx => {
          const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
          const txHour = txDate.getHours();
          return txDate.getFullYear() === currentDate.getFullYear() &&
                 txDate.getMonth() === currentDate.getMonth() &&
                 txDate.getDate() === currentDate.getDate() &&
                 txHour === hour;
        });
        
        const transactionCount = hourTransactions.length;
        const revenue = hourTransactions.reduce((sum, tx) => 
          sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
        
        dayRow.hours.push({
          hour,
          transactions: transactionCount,
          revenue: Math.round(revenue),
          intensity: transactionCount > 0 ? Math.min(transactionCount / 3, 1) : 0, // Нормализация до 3 транзакций = максимум
          displayTime: `${hour.toString().padStart(2, '0')}:00`
        });
      }
      
      const dayTotal = dayRow.hours.reduce((sum, h) => sum + h.transactions, 0);
      if (dayTotal > 0) {
        console.log(`${dayNames[dayOfWeek]} (${dateStr}): ${dayTotal} транзакций`);
      }
      
      heatmapGrid.push(dayRow);
    }
    
    return heatmapGrid;
  }, [selectedNetwork, transactions]);

  return (
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Обзор сети</h1>
          <p className="text-slate-400 mt-2">Общая информация и аналитика по торговой сети</p>
        </div>

        <div className="space-y-6">

        {/* Кнопка обновления данных */}
        {!initializing && selectedNetwork && (
          <div className="flex justify-end items-center">
            <div className="flex gap-2">
              <Button
                onClick={loadTransactions}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
              >
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </div>
                {loading ? 'Загрузка...' : 'Обновить данные'}
              </Button>
            </div>
          </div>
        )}

        {/* Фильтры - только если выбрана сеть */}
        {!initializing && selectedNetwork && (
          <div className={`bg-slate-800 border border-slate-600 rounded-lg ${isMobile ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center gap-3 ${isMobile ? 'mb-3' : 'mb-4'}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>Фильтры анализа</h2>
            </div>
            
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-3 gap-4'}`}>
              {/* Дата начала */}
              <div>
                <Label htmlFor="dateFrom" className="text-slate-300 text-sm font-medium">Дата с</Label>
                <div className="relative">
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-200 hover:text-blue-400 transition-colors pointer-events-none" 
                  />
                </div>
              </div>
              
              {/* Дата окончания */}
              <div>
                <Label htmlFor="dateTo" className="text-slate-300 text-sm font-medium">Дата по</Label>
                <div className="relative">
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-200 hover:text-blue-400 transition-colors pointer-events-none" 
                  />
                </div>
              </div>
              
            </div>
          </div>
        )}


        {/* Статистика по видам топлива */}
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {fuelTypeStats.map((fuel) => (
              <Card key={fuel.type} className="bg-slate-800 border-slate-600">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-600 rounded-lg">
                      <Fuel className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-white text-base font-semibold mb-1">{fuel.type}</p>
                      <p className="text-2xl font-bold text-white mb-0.5">
                        {Math.round(fuel.revenue).toLocaleString('ru-RU')} ₽
                      </p>
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold text-white">{Math.round(fuel.volume).toLocaleString('ru-RU')} л</p>
                        <p className="text-sm text-slate-400">{fuel.operations} операций</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Итоговая карточка */}
            <Card className="bg-slate-700 border-slate-500 border-2">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-white text-base font-semibold mb-1">Итого</p>
                    <p className="text-2xl font-bold text-white mb-0.5">
                      {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-2xl font-bold text-white">{Math.round(totalVolume).toLocaleString('ru-RU')} л</p>
                      <p className="text-sm text-slate-400">{filteredTransactions.length} операций</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Статистика по способам оплаты */}
        {!initializing && selectedNetwork && paymentTypeStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {paymentTypeStats.map((payment) => (
              <Card key={payment.type} className="bg-slate-800 border-slate-600">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-600 rounded-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-white text-base font-semibold mb-1">{payment.type}</p>
                      <p className="text-2xl font-bold text-white mb-0.5">
                        {Math.round(payment.revenue).toLocaleString('ru-RU')} ₽
                      </p>
                      <div className="space-y-0.5">
                        <p className="text-2xl font-bold text-white">{Math.round(payment.volume).toLocaleString('ru-RU')} л</p>
                        <p className="text-sm text-slate-400">{payment.operations} операций</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Карточка среднего чека */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-white text-base font-semibold mb-1">Средний чек</p>
                    <p className="text-2xl font-bold text-white mb-0.5">
                      {Math.round(averageCheck).toLocaleString('ru-RU')} ₽
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-2xl font-bold text-white">&nbsp;</p>
                      <p className="text-sm text-slate-400">&nbsp;</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* График реализации по дням с разбивкой по топливу */}
        {!initializing && selectedNetwork && transactions.length > 0 && (
          <Card className="bg-slate-800 border-slate-600">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Реализация по дням ({dailySalesData.data.length} дней)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-2 px-2">
              {dailySalesData.data.length > 0 ? (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={dailySalesData.data} 
                      margin={{ top: 10, right: 30, left: 60, bottom: 20 }}
                    >
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#94a3b8"
                        fontSize={11}
                        tick={{ fill: '#94a3b8' }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11}
                        tick={{ fill: '#94a3b8' }}
                        tickFormatter={(value) => `${Math.round(value / 1000)}к ₽`}
                      />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) {
                            return <div style={{ display: 'none' }} />;
                          }
                          
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
                              <p className="text-white font-medium mb-2">{label}</p>
                              <div className="space-y-1">
                                <p className="text-slate-300 flex justify-between">
                                  <span>Общая выручка:</span>
                                  <span className="font-medium">{Math.round(data.revenue).toLocaleString('ru-RU')} ₽</span>
                                </p>
                                {dailySalesData.fuelTypes
                                  .map((fuelType, index) => ({ fuelType, index, revenue: data[fuelType] || 0 }))
                                  .filter(item => item.revenue > 0)
                                  .map(({ fuelType, index, revenue }) => {
                                    const colors = ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a', '#312e81'];
                                    return (
                                      <p key={fuelType} className="flex justify-between" style={{ color: colors[index % colors.length] }}>
                                        <span>{fuelType}:</span>
                                        <span className="font-medium">{Math.round(revenue).toLocaleString('ru-RU')} ₽</span>
                                      </p>
                                    );
                                  })}
                                <p className="text-blue-400 flex justify-between">
                                  <span>Операции:</span>
                                  <span className="font-medium">{data.operations}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {/* Стековые бары для каждого вида топлива с приглушенными цветами */}
                      {dailySalesData.fuelTypes.map((fuelType, index) => {
                        const colors = ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a', '#312e81'];
                        return (
                          <Bar 
                            key={fuelType}
                            dataKey={fuelType} 
                            stackId="fuel"
                            fill={colors[index % colors.length]}
                            radius={index === dailySalesData.fuelTypes.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-80 text-slate-400">
                  <p>Нет данных за выбранный период</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Активность операций и суточная активность */}
        {!initializing && selectedNetwork && transactions.length > 0 && (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
            {/* Тепловая карта активности */}
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-400" />
                    Активность операций
                  </CardTitle>
                  <div className="text-sm text-slate-400">
                    Последние 7 дней
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-2 px-2">
                {heatmapData && heatmapData.length > 0 ? (
                  <div className="space-y-3">
                    {/* Заголовок с часами */}
                    <div className="flex items-center">
                      <div className="w-12 shrink-0"></div>
                      <div className="flex-1 flex gap-0.5 text-xs text-slate-400">
                        {Array.from({ length: 24 }, (_, hour) => (
                          <div key={hour} className="flex-1 text-center text-[10px]">
                            {hour % 6 === 0 ? hour : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Сетка тепловой карты */}
                    {heatmapData.map((day) => (
                      <div key={day.date} className="flex items-center">
                        {/* День недели */}
                        <div className="w-12 shrink-0 text-xs text-slate-300 font-medium">
                          {day.dayName}
                        </div>
                        
                        {/* Часы */}
                        <div className="flex-1 flex gap-0.5">
                          {day.hours.map((hourData) => {
                            const intensity = hourData.intensity;
                            let bgColor = 'bg-slate-700'; // Нет активности
                            
                            if (intensity > 0) {
                              if (intensity <= 0.2) bgColor = 'bg-green-900/40';
                              else if (intensity <= 0.4) bgColor = 'bg-green-700/60';
                              else if (intensity <= 0.6) bgColor = 'bg-green-600/70';
                              else if (intensity <= 0.8) bgColor = 'bg-green-500/80';
                              else bgColor = 'bg-green-400';
                            }
                            
                            return (
                              <div
                                key={hourData.hour}
                                className={`flex-1 aspect-square ${bgColor} rounded-sm cursor-pointer hover:ring-1 hover:ring-green-400 hover:scale-110 transition-all duration-200`}
                                title={`${day.dayName}, ${hourData.displayTime}
Операций: ${hourData.transactions}
Выручка: ${hourData.revenue.toLocaleString('ru-RU')} ₽`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {/* Легенда */}
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-4 pt-2 border-t border-slate-600">
                      <span>Меньше</span>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-slate-700 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-900/40 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-700/60 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-600/70 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-500/80 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                      </div>
                      <span>Больше</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-slate-400">
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Нет данных для отображения</p>
                      <p className="text-sm">Выберите сеть и период</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* График суточной активности */}
            <Card className="bg-slate-800 border-slate-600">
              <CardHeader className="pb-4">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Суточная активность по часам
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2 px-2">
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={dailyActivityData} 
                      margin={{ top: 10, right: 15, left: 40, bottom: 50 }}
                    >
                      <XAxis 
                        dataKey="hour" 
                        stroke="#94a3b8"
                        fontSize={11}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11}
                        tick={{ fill: '#94a3b8' }}
                        width={35}
                      />
                      <ChartTooltip 
                        content={({ active, payload, label }) => {
                          if (!active || !payload || !payload.length) {
                            return <div style={{ display: 'none' }} />;
                          }
                          
                          const data = payload[0].payload;
                          const hourStart = parseInt(label.split(':')[0]);
                          const hourEnd = hourStart + 1;
                          return (
                            <div className="bg-slate-900/95 border border-slate-600 rounded-lg p-3 shadow-xl backdrop-blur-sm">
                              <p className="text-white font-medium mb-2">
                                {`${hourStart.toString().padStart(2, '0')}:00 - ${hourEnd.toString().padStart(2, '0')}:00`}
                              </p>
                              <div className="space-y-1">
                                <p className="text-blue-400 flex justify-between">
                                  <span>Операции:</span>
                                  <span className="font-medium">{data.operations}</span>
                                </p>
                                <p className="text-green-400 flex justify-between">
                                  <span>Выручка:</span>
                                  <span className="font-medium">{Math.round(data.revenue).toLocaleString('ru-RU')} ₽</span>
                                </p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar 
                        dataKey="operations" 
                        fill="#3b82f6"
                        stroke="#2563eb"
                        strokeWidth={1}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Прогнозирование продаж */}
        {!initializing && selectedNetwork && stsApiConfigured && transactions.length > 0 && (
          <SalesForecast 
            transactions={completedTransactions}
            className="w-full"
          />
        )}

        {/* Экран инициализации */}
        {initializing && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Инициализация</h3>
            <p className="text-slate-400">Загружаем конфигурацию и данные...</p>
          </div>
        )}

        {/* Сообщение о выборе сети */}
        {!initializing && !selectedNetwork && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-slate-400 text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Выберите сеть для просмотра отчетов</h3>
            <p className="text-slate-400">Для отображения данных необходимо выбрать торговую сеть из выпадающего списка выше</p>
          </div>
        )}

        {/* Состояние загрузки */}
        {!initializing && selectedNetwork && stsApiConfigured && loading && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Загрузка данных</h3>
            <p className="text-slate-400">Получаем информацию из STS API...</p>
          </div>
        )}

        {/* Сообщение об отсутствии транзакций */}
        {!initializing && selectedNetwork && stsApiConfigured && !loading && transactions.length === 0 && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Нет данных за выбранный период</h3>
            <p className="text-slate-400 mb-4">Измените диапазон дат или нажмите кнопку "Обновить данные" для загрузки актуальной информации.</p>
            <Button 
              onClick={loadTransactions}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить данные
            </Button>
          </div>
        )}

        {/* Сообщение о необходимости настройки STS API */}
        {!initializing && selectedNetwork && !stsApiConfigured && (
          <div className="bg-slate-800 border border-orange-600 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">⚙️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Требуется настройка STS API</h3>
            <p className="text-slate-400 mb-4">Эта страница работает только с данными из STS API. Для отображения аналитики необходимо настроить подключение к API.</p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => window.location.href = '/settings/sts-api'}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Перейти к настройкам API
              </Button>
              <Button 
                onClick={async () => {
                  console.log('🔄 Принудительная проверка настроек STS API...');
                  setInitializing(true);
                  
                  // Даем время на обновление настроек
                  setTimeout(() => {
                    const isConfigured = stsApiService.isConfigured();
                    console.log('🔍 Результат проверки:', isConfigured);
                    setStsApiConfigured(isConfigured);
                    setInitializing(false);
                    
                    if (isConfigured) {
                      toast({
                        title: "Успешно",
                        description: "STS API настроен и готов к работе",
                      });
                      loadTransactions();
                    } else {
                      toast({
                        title: "Настройки не найдены",
                        description: "STS API все еще не настроен",
                        variant: "destructive",
                      });
                    }
                  }, 1000);
                }}
                variant="outline"
                className="border-blue-600 text-blue-400 hover:bg-blue-700/20"
              >
                🔄 Перепроверить настройки
              </Button>
            </div>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}