import React, { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { DollarSign, Users, Fuel, Monitor, CreditCard, Loader2, RefreshCw, Activity, Calendar, Download, HelpCircle } from "lucide-react";
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
import * as XLSX from 'xlsx';


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
      console.log(`✅ Загружено ${stsTransactions.length} транзакций${additionalText}`);
      
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

  // Функция экспорта данных в Excel
  const exportToExcel = () => {
    try {
      console.log('📊 Начинаем экспорт данных в Excel...');
      
      // Создаем новую рабочую книгу
      const workbook = XLSX.utils.book_new();
      
      // Лист 1: Основные показатели с таблицами
      const mainData = [
        // Заголовок и общая информация
        ['ОТЧЕТ ПО ТОРГОВОЙ СЕТИ - ОБЗОР'],
        [''],
        ['Показатель', 'Значение'],
        ['Период анализа', `${dateFrom} - ${dateTo}`],
        ['Торговая сеть', selectedNetwork?.name || 'Не выбрана'],
        ['Торговая точка', selectedTradingPoint === 'all' ? 'Все точки' : (selectedTradingPoint || 'Все точки')],
        ['Дата создания отчета', new Date().toLocaleString('ru-RU')],
        [''],
        
        // Основные KPI
        ['ОСНОВНЫЕ ПОКАЗАТЕЛИ'],
        [''],
        ['Показатель', 'Значение', '', 'Показатель', 'Значение'],
        ['Общая выручка (₽)', Math.round(totalRevenue), '', 'Количество операций', filteredTransactions.length],
        ['Общий объем (л)', Math.round(totalVolume), '', 'Средний чек (₽)', Math.round(averageCheck)],
        ['Средний объем на операцию (л)', filteredTransactions.length > 0 ? Math.round(totalVolume / filteredTransactions.length) : 0],
        [''],
        ['']
      ];

      // Добавляем таблицу по видам топлива
      if (fuelTypeStats.length > 0) {
        mainData.push(['СТАТИСТИКА ПО ВИДАМ ТОПЛИВА']);
        mainData.push(['']);
        mainData.push(['Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', 'Доля выручки (%)']);
        
        fuelTypeStats.forEach(fuel => {
          mainData.push([
            fuel.type,
            fuel.operations,
            Math.round(fuel.revenue),
            Math.round(fuel.volume),
            fuel.operations > 0 ? Math.round(fuel.revenue / fuel.operations) : 0,
            totalRevenue > 0 ? Math.round((fuel.revenue / totalRevenue) * 100 * 100) / 100 : 0
          ]);
        });
        
        // Итоговая строка для топлива
        mainData.push([
          'ИТОГО',
          filteredTransactions.length,
          Math.round(totalRevenue),
          Math.round(totalVolume),
          Math.round(averageCheck),
          100
        ]);
        
        mainData.push(['']);
        mainData.push(['']);
      }

      // Добавляем таблицу по способам оплаты
      if (paymentTypeStats.length > 0) {
        mainData.push(['СТАТИСТИКА ПО СПОСОБАМ ОПЛАТЫ']);
        mainData.push(['']);
        mainData.push(['Способ оплаты', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', 'Доля выручки (%)']);
        
        paymentTypeStats.forEach(payment => {
          mainData.push([
            payment.type,
            payment.operations,
            Math.round(payment.revenue),
            Math.round(payment.volume),
            payment.operations > 0 ? Math.round(payment.revenue / payment.operations) : 0,
            totalRevenue > 0 ? Math.round((payment.revenue / totalRevenue) * 100 * 100) / 100 : 0
          ]);
        });
        
        // Итоговая строка для способов оплаты
        mainData.push([
          'ИТОГО',
          filteredTransactions.length,
          Math.round(totalRevenue),
          Math.round(totalVolume),
          Math.round(averageCheck),
          100
        ]);
        
        mainData.push(['']);
        mainData.push(['']);
        
        // Детальная разбивка по способам оплаты и видам топлива
        mainData.push(['ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА']);
        mainData.push(['']);
        
        // Получаем отсортированные виды топлива
        const getFuelPriority = (fuelType) => {
          const fuel = fuelType.toLowerCase();
          if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
          if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
          if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
          if (fuel.includes('аи-91') || fuel.includes('91')) return 4;
          if (fuel.includes('аи-80') || fuel.includes('80')) return 5;
          if (fuel.includes('бензин') || fuel.includes('gasoline') || fuel.includes('petrol')) return 6;
          if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return 10;
          if (fuel.includes('дт зимнее') || fuel.includes('зимний дизель')) return 11;
          if (fuel.includes('дт летнее') || fuel.includes('летний дизель')) return 12;
          if (fuel.includes('дт арктический') || fuel.includes('арктический дизель')) return 13;
          if (fuel.includes('газ') || fuel.includes('газовый') || fuel.includes('gas')) return 20;
          if (fuel.includes('керосин') || fuel.includes('kerosene')) return 21;
          if (fuel.includes('масло') || fuel.includes('oil')) return 22;
          return 99;
        };
        
        const allFuelTypes = [...new Set(
          Object.values(paymentFuelBreakdown).flatMap(paymentData => Object.keys(paymentData))
        )].sort((a, b) => {
          const priorityA = getFuelPriority(a);
          const priorityB = getFuelPriority(b);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return a.localeCompare(b, 'ru');
        });
        
        // Заголовок детальной таблицы
        const detailHeaders = ['Способ оплаты', 'Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', '% от способа оплаты'];
        mainData.push(detailHeaders);
        
        // Данные детальной таблицы
        paymentTypeStats.forEach(payment => {
          const paymentData = paymentFuelBreakdown[payment.type] || {};
          let isFirstRow = true;
          
          // Сортируем виды топлива для этого способа оплаты
          const fuelTypesForPayment = Object.keys(paymentData).sort((a, b) => {
            const priorityA = getFuelPriority(a);
            const priorityB = getFuelPriority(b);
            if (priorityA !== priorityB) return priorityA - priorityB;
            return a.localeCompare(b, 'ru');
          });
          
          fuelTypesForPayment.forEach(fuelType => {
            const fuelData = paymentData[fuelType];
            const percentOfPayment = payment.revenue > 0 ? Math.round((fuelData.revenue / payment.revenue) * 100 * 100) / 100 : 0;
            
            mainData.push([
              isFirstRow ? payment.type : '', // Показываем способ оплаты только в первой строке
              fuelType,
              fuelData.operations,
              Math.round(fuelData.revenue),
              Math.round(fuelData.volume),
              fuelData.operations > 0 ? Math.round(fuelData.revenue / fuelData.operations) : 0,
              percentOfPayment
            ]);
            
            isFirstRow = false;
          });
          
          // Итоговая строка для каждого способа оплаты
          if (fuelTypesForPayment.length > 0) {
            mainData.push([
              `ИТОГО по "${payment.type}"`,
              '',
              payment.operations,
              Math.round(payment.revenue),
              Math.round(payment.volume),
              payment.operations > 0 ? Math.round(payment.revenue / payment.operations) : 0,
              100 // Всегда 100% от способа оплаты
            ]);
            
            // Разделитель между способами оплаты
            mainData.push(['', '', '', '', '', '', '']);
          }
        });
        
        // Общий итог по всей детальной таблице
        mainData.push([
          'ОБЩИЙ ИТОГ',
          `${allFuelTypes.length} видов топлива`,
          filteredTransactions.length,
          Math.round(totalRevenue),
          Math.round(totalVolume),
          Math.round(averageCheck),
          100
        ]);
      }
      
      const mainWorksheet = XLSX.utils.aoa_to_sheet(mainData);
      
      // Применяем форматирование к основному листу
      const range = XLSX.utils.decode_range(mainWorksheet['!ref']);
      
      // Устанавливаем ширину столбцов
      const columnWidths = [
        { wch: 25 }, // A - Названия показателей/топлива/способов оплаты
        { wch: 20 }, // B - Значения/Вид топлива/Операции
        { wch: 15 }, // C - Операции/Выручка
        { wch: 15 }, // D - Выручка/Объем
        { wch: 15 }, // E - Объем/Средний чек
        { wch: 15 }, // F - Средний чек/Доля выручки
        { wch: 15 }  // G - % от способа оплаты
      ];
      mainWorksheet['!cols'] = columnWidths;
      
      // Форматирование заголовков (жирный шрифт)
      const headerCells = ['A1', 'A9'];
      
      // Находим индексы строк с заголовками разделов
      const fuelStatsIndex = mainData.findIndex(row => row[0] === 'СТАТИСТИКА ПО ВИДАМ ТОПЛИВА');
      const paymentStatsIndex = mainData.findIndex(row => row[0] === 'СТАТИСТИКА ПО СПОСОБАМ ОПЛАТЫ');
      const detailStatsIndex = mainData.findIndex(row => row[0] === 'ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА');
      
      if (fuelStatsIndex > -1) headerCells.push('A' + (fuelStatsIndex + 1));
      if (paymentStatsIndex > -1) headerCells.push('A' + (paymentStatsIndex + 1));
      if (detailStatsIndex > -1) headerCells.push('A' + (detailStatsIndex + 1));
      
      headerCells.forEach(cellAddr => {
        if (mainWorksheet[cellAddr]) {
          mainWorksheet[cellAddr].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'left' }
          };
        }
      });
      
      XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Основные показатели');
      
      // Лист 2: Активность по часам
      if (dailyActivityData.length > 0) {
        const hourlyData = [
          ['АКТИВНОСТЬ ПО ЧАСАМ СУТОК'],
          [''],
          ['Час', 'Операции', 'Выручка (₽)', 'Средний чек за час (₽)'],
          ...dailyActivityData.map(hour => [
            hour.hour,
            hour.operations,
            Math.round(hour.revenue),
            hour.operations > 0 ? Math.round(hour.revenue / hour.operations) : 0
          ])
        ];
        
        const hourlyWorksheet = XLSX.utils.aoa_to_sheet(hourlyData);
        
        // Форматирование листа активности по часам
        hourlyWorksheet['!cols'] = [
          { wch: 10 }, // Час
          { wch: 12 }, // Операции 
          { wch: 15 }, // Выручка
          { wch: 20 }  // Средний чек
        ];
        
        // Заголовок
        if (hourlyWorksheet['A1']) {
          hourlyWorksheet['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
          };
        }
        
        XLSX.utils.book_append_sheet(workbook, hourlyWorksheet, 'Активность по часам');
      }
      
      // Лист 3: Реализация по дням
      if (dailySalesData.data.length > 0) {
        const salesHeaders = ['Дата', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)'];
        // Добавляем колонки для каждого вида топлива
        dailySalesData.fuelTypes.forEach(fuelType => {
          salesHeaders.push(`${fuelType} (₽)`);
        });
        
        const salesData = [
          ['РЕАЛИЗАЦИЯ ПО ДНЯМ С РАЗБИВКОЙ ПО ТОПЛИВУ'],
          [''],
          salesHeaders,
          ...dailySalesData.data.map(day => {
            const baseData = [
              day.date,
              day.operations,
              Math.round(day.revenue),
              Math.round(day.volume),
              day.operations > 0 ? Math.round(day.revenue / day.operations) : 0
            ];
            
            // Добавляем данные по каждому виду топлива
            dailySalesData.fuelTypes.forEach(fuelType => {
              baseData.push(Math.round(day[fuelType] || 0));
            });
            
            return baseData;
          })
        ];
        
        const salesWorksheet = XLSX.utils.aoa_to_sheet(salesData);
        
        // Форматирование листа реализации по дням
        const salesColWidths = [
          { wch: 12 }, // Дата
          { wch: 12 }, // Операции
          { wch: 15 }, // Выручка
          { wch: 12 }, // Объем
          { wch: 15 }  // Средний чек
        ];
        
        // Добавляем ширины для колонок топлива
        dailySalesData.fuelTypes.forEach(() => {
          salesColWidths.push({ wch: 15 });
        });
        
        salesWorksheet['!cols'] = salesColWidths;
        
        // Заголовок
        if (salesWorksheet['A1']) {
          salesWorksheet['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
          };
        }
        
        XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Реализация по дням');
      }
      
      // Лист 4: Тепловая карта активности (только если есть данные)
      if (heatmapData.length > 0) {
        const heatmapHeaders = ['День недели', 'Дата'];
        // Добавляем заголовки для каждого часа
        for (let hour = 0; hour < 24; hour++) {
          heatmapHeaders.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        
        // Создаем данные с цветовыми индикаторами
        const getColorIndicator = (value) => {
          if (value === 0) return '⬜'; // Белый квадрат для нуля
          
          const maxVal = Math.max(...heatmapData.flatMap(day => day.hours.map(h => h.transactions)));
          const normalized = maxVal > 0 ? value / maxVal : 0;
          
          if (normalized <= 0.2) return '🔷'; // Очень светло-синий
          else if (normalized <= 0.4) return '🔹'; // Светло-синий
          else if (normalized <= 0.6) return '🟦'; // Средне-синий
          else if (normalized <= 0.8) return '🔵'; // Синий
          else return '🟦'; // Темно-синий (используем тот же символ)
        };

        const heatmapExportData = [
          ['АКТИВНОСТЬ ПО ДНЯМ И ЧАСАМ (ТЕПЛОВАЯ КАРТА)'],
          [''],
          heatmapHeaders,
          ...heatmapData.map(day => {
            const rowData = [day.dayName, day.date];
            day.hours.forEach(hourData => {
              // Добавляем и значение и цветовой индикатор
              const cellValue = hourData.transactions > 0 
                ? `${hourData.transactions} ${getColorIndicator(hourData.transactions)}`
                : getColorIndicator(0);
              rowData.push(cellValue);
            });
            return rowData;
          })
        ];
        
        const heatmapWorksheet = XLSX.utils.aoa_to_sheet(heatmapExportData);
        
        // Форматирование тепловой карты
        const heatmapColWidths = [
          { wch: 12 }, // День недели
          { wch: 12 }  // Дата
        ];
        
        // Узкие колонки для часов
        for (let i = 0; i < 24; i++) {
          heatmapColWidths.push({ wch: 6 });
        }
        
        heatmapWorksheet['!cols'] = heatmapColWidths;
        
        // Заголовок
        if (heatmapWorksheet['A1']) {
          heatmapWorksheet['A1'].s = {
            font: { bold: true, sz: 14 },
            alignment: { horizontal: 'center' }
          };
        }
        
        // Применяем цветовое форматирование к данным тепловой карты
        const range = XLSX.utils.decode_range(heatmapWorksheet['!ref']);
        
        // Находим все числовые значения для определения диапазона
        let allValues = [];
        heatmapData.forEach(day => {
          day.hours.forEach(hourData => {
            if (hourData.transactions > 0) {
              allValues.push(hourData.transactions);
            }
          });
        });
        
        if (allValues.length > 0) {
          const minValue = Math.min(...allValues);
          const maxValue = Math.max(...allValues);
          
          // Функция для получения синего цвета в зависимости от значения
          const getBlueColor = (value) => {
            if (value === 0) return 'FFFFFF'; // Белый для нулевых значений
            
            // Нормализуем значение от 0 до 1
            const normalized = maxValue > minValue ? (value - minValue) / (maxValue - minValue) : 0;
            
            // Градации синего цвета от светлого к темному
            if (normalized <= 0.2) return 'E3F2FD'; // Очень светло-синий
            else if (normalized <= 0.4) return 'BBDEFB'; // Светло-синий
            else if (normalized <= 0.6) return '90CAF9'; // Средне-синий
            else if (normalized <= 0.8) return '64B5F6'; // Синий
            else return '2196F3'; // Темно-синий
          };
          
          // Применяем цветовое форматирование к ячейкам с данными
          heatmapData.forEach((day, dayIndex) => {
            const rowIndex = dayIndex + 3; // Начинаем с 4-й строки (индекс 3), учитываем заголовки
            
            day.hours.forEach((hourData, hourIndex) => {
              const colIndex = hourIndex + 2; // Столбцы начинаются с C (индекс 2)
              const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
              
              if (heatmapWorksheet[cellAddr]) {
                const bgColor = getBlueColor(hourData.transactions);
                
                // Создаем объект стиля с правильной структурой
                if (!heatmapWorksheet[cellAddr].s) {
                  heatmapWorksheet[cellAddr].s = {};
                }
                
                heatmapWorksheet[cellAddr].s = {
                  ...heatmapWorksheet[cellAddr].s,
                  fill: {
                    patternType: 'solid',
                    fgColor: { rgb: bgColor }
                  },
                  alignment: { 
                    horizontal: 'center', 
                    vertical: 'middle' 
                  },
                  font: { 
                    sz: 10,
                    color: { rgb: hourData.transactions > 0 && bgColor === '2196F3' ? 'FFFFFF' : '000000' }
                  },
                  border: {
                    top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                    bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                    left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                    right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                  }
                };
              }
            });
          });
          
          // Альтернативный подход: добавляем условное форматирование через диапазоны
          const dataStartRow = 4; // Строка начала данных (1-indexed)
          const dataStartCol = 3;  // Колонка начала данных (1-indexed)
          const dataEndRow = dataStartRow + heatmapData.length - 1;
          const dataEndCol = dataStartCol + 23; // 24 часа
          
          // Создаем условное форматирование для всего диапазона данных
          if (!heatmapWorksheet['!conditionalFormatting']) {
            heatmapWorksheet['!conditionalFormatting'] = [];
          }
          
          // Добавляем цветовую шкалу для визуализации данных
          heatmapWorksheet['!conditionalFormatting'].push({
            ref: XLSX.utils.encode_range({
              s: { r: dataStartRow - 1, c: dataStartCol - 1 },
              e: { r: dataEndRow - 1, c: dataEndCol - 1 }
            }),
            rules: [
              {
                type: 'colorScale',
                priority: 1,
                colorScale: {
                  cfvo: [
                    { type: 'min', val: 0 },
                    { type: 'percentile', val: 50 },
                    { type: 'max', val: maxValue }
                  ],
                  color: [
                    { rgb: 'FFFFFF' }, // Белый для минимума
                    { rgb: '90CAF9' }, // Средний синий
                    { rgb: '2196F3' }  // Темно-синий для максимума
                  ]
                }
              }
            ]
          });
          
          // Добавляем легенду цветов в нижнюю часть листа
          const legendStartRow = heatmapData.length + 6;
          
          // Заголовок легенды
          const legendTitleAddr = XLSX.utils.encode_cell({ r: legendStartRow, c: 0 });
          heatmapWorksheet[legendTitleAddr] = { 
            v: 'ЦВЕТОВАЯ ЛЕГЕНДА:', 
            t: 's',
            s: { 
              font: { bold: true, sz: 12 },
              alignment: { horizontal: 'left' }
            }
          };
          
          // Легенда значений с эмодзи-индикаторами
          const legendItems = [
            { label: '0 операций', indicator: '⬜' },
            { label: `1-${Math.ceil(maxValue * 0.2)} операций (низкая активность)`, indicator: '🔷' },
            { label: `${Math.ceil(maxValue * 0.2 + 1)}-${Math.ceil(maxValue * 0.4)} операций (ниже среднего)`, indicator: '🔹' },
            { label: `${Math.ceil(maxValue * 0.4 + 1)}-${Math.ceil(maxValue * 0.6)} операций (средняя активность)`, indicator: '🟦' },
            { label: `${Math.ceil(maxValue * 0.6 + 1)}-${Math.ceil(maxValue * 0.8)} операций (высокая активность)`, indicator: '🔵' },
            { label: `${Math.ceil(maxValue * 0.8 + 1)}+ операций (максимальная активность)`, indicator: '🟦' }
          ];
          
          legendItems.forEach((item, index) => {
            const legendRow = legendStartRow + index + 2;
            
            // Эмодзи индикатор
            const indicatorCellAddr = XLSX.utils.encode_cell({ r: legendRow, c: 0 });
            heatmapWorksheet[indicatorCellAddr] = { 
              v: item.indicator, 
              t: 's',
              s: { 
                font: { sz: 16 },
                alignment: { horizontal: 'center', vertical: 'middle' }
              }
            };
            
            // Описание
            const labelCellAddr = XLSX.utils.encode_cell({ r: legendRow, c: 1 });
            heatmapWorksheet[labelCellAddr] = { 
              v: item.label, 
              t: 's',
              s: { 
                font: { sz: 10 },
                alignment: { horizontal: 'left', vertical: 'middle' }
              }
            };
          });
          
          // Обновляем диапазон листа для включения легенды
          const newRange = XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: legendStartRow + legendItems.length + 3, c: 25 }
          });
          heatmapWorksheet['!ref'] = newRange;
        }
        
        XLSX.utils.book_append_sheet(workbook, heatmapWorksheet, 'Тепловая карта');
      }
      
      // Генерируем имя файла с датой и временем
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const networkName = selectedNetwork?.name?.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') || 'network';
      const fileName = `Обзор_${networkName}_${dateStr}_${timeStr}.xlsx`;
      
      // Сохраняем файл
      XLSX.writeFile(workbook, fileName);
      
      console.log('✅ Файл успешно экспортирован:', fileName);
      toast({
        title: "Экспорт завершен",
        description: `Данные сохранены в файл: ${fileName}`,
      });
      
    } catch (error) {
      console.error('❌ Ошибка экспорта в Excel:', error);
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось создать Excel файл. Попробуйте еще раз.",
        variant: "destructive",
      });
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
    
    // Детальная диагностика всех транзакций
    console.log('🔍 NetworkOverview: Детальный анализ транзакций:', {
      totalTransactions: transactions.length,
      completedTransactions: completed.length,
      dateFrom,
      dateTo,
      sampleTransactions: transactions.slice(0, 3).map(tx => ({
        id: tx.id,
        timestamp: tx.timestamp || tx.createdAt || tx.date,
        status: tx.status,
        paymentMethod: tx.paymentMethod,
        apiDataPayment: tx.apiData?.payment_method,
        paymentType: tx.paymentType,
        total: tx.total || tx.actualAmount || tx.totalCost,
        volume: tx.volume || tx.actualQuantity || tx.quantity,
        fuelType: tx.fuelType || tx.apiData?.product_name
      }))
    });
    
    // Проверяем есть ли онлайн заказы среди всех транзакций
    const onlineTransactions = transactions.filter(tx => {
      const paymentMethod = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType;
      return paymentMethod && String(paymentMethod).toLowerCase().includes('online');
    });
    
    console.log('🛒 NetworkOverview: Онлайн транзакции найдены:', {
      count: onlineTransactions.length,
      examples: onlineTransactions.slice(0, 2).map(tx => ({
        id: tx.id,
        paymentMethod: tx.paymentMethod,
        apiDataPayment: tx.apiData?.payment_method,
        status: tx.status,
        total: tx.total || tx.actualAmount || tx.totalCost
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
    
    const filtered = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate >= startDate && txDate <= endDate;
    });
    
    // Диагностика фильтрации по датам
    console.log('📅 NetworkOverview: Фильтрация по датам:', {
      dateFrom,
      dateTo,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      completedTotal: completedTransactions.length,
      filteredTotal: filtered.length,
      filteredOutCount: completedTransactions.length - filtered.length
    });
    
    // Проверяем онлайн заказы после фильтрации по датам
    const onlineFiltered = filtered.filter(tx => {
      const paymentMethod = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType;
      return paymentMethod && String(paymentMethod).toLowerCase().includes('online');
    });
    
    console.log('🛒 NetworkOverview: Онлайн заказы после фильтрации:', {
      count: onlineFiltered.length,
      examples: onlineFiltered.slice(0, 2)
    });
    
    // Проверяем есть ли транзакции вне диапазона дат
    const outsideDateRange = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate < startDate || txDate > endDate;
    });
    
    if (outsideDateRange.length > 0) {
      console.log('⏰ NetworkOverview: Транзакции вне диапазона дат:', {
        count: outsideDateRange.length,
        examples: outsideDateRange.slice(0, 2).map(tx => ({
          date: tx.timestamp || tx.createdAt || tx.date,
          paymentMethod: tx.paymentMethod || tx.apiData?.payment_method,
          status: tx.status
        }))
      });
    }
    
    return filtered;
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

    // Функция для определения приоритета сортировки топлива
    const getFuelPriority = (fuelType) => {
      const fuel = fuelType.toLowerCase();
      
      // Бензины
      if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
      if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
      if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
      if (fuel.includes('аи-91') || fuel.includes('91')) return 4;
      if (fuel.includes('аи-80') || fuel.includes('80')) return 5;
      if (fuel.includes('бензин') || fuel.includes('gasoline') || fuel.includes('petrol')) return 6;
      
      // Дизельное топливо
      if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return 10;
      if (fuel.includes('дт зимнее') || fuel.includes('зимний дизель')) return 11;
      if (fuel.includes('дт летнее') || fuel.includes('летний дизель')) return 12;
      if (fuel.includes('дт арктический') || fuel.includes('арктический дизель')) return 13;
      
      // Другие виды топлива
      if (fuel.includes('газ') || fuel.includes('газовый') || fuel.includes('gas')) return 20;
      if (fuel.includes('керосин') || fuel.includes('kerosene')) return 21;
      if (fuel.includes('масло') || fuel.includes('oil')) return 22;
      
      // Неизвестные - в конец
      return 99;
    };

    return Object.entries(fuelGroups).map(([type, txs]) => {
      const revenue = txs.reduce((sum, tx) => sum + (tx.total || tx.actualAmount || tx.totalCost || 0), 0);
      const volume = txs.reduce((sum, tx) => sum + (tx.volume || tx.actualQuantity || tx.quantity || 0), 0);
      return {
        type,
        operations: txs.length,
        revenue,
        volume,
        priority: getFuelPriority(type)
      };
    }).sort((a, b) => {
      // Сначала сортируем по приоритету (бензины → дизель → остальное)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Внутри группы сортируем по выручке (убывание)
      return b.revenue - a.revenue;
    });
  }, [filteredTransactions]);

  // Функция для локализации способов оплаты
  const getPaymentTypeDisplayName = (paymentType) => {
    const translations = {
      'bank_card': 'Банковская карта',
      'card': 'Банковская карта',
      'credit_card': 'Банковская карта',
      'debit_card': 'Банковская карта',
      'cash': 'Наличные',
      'fuel_card': 'Топливная карта',
      'fleet_card': 'Корпоративная карта',
      'online_order': 'Онлайн заказ',
      'mobile': 'Мобильная оплата',
      'qr': 'QR-код',
      'contactless': 'Бесконтактная оплата',
      'online': 'Онлайн платеж',
      'digital': 'Цифровая оплата',
      'transfer': 'Перевод',
      'other': 'Другое',
      // Добавляем распознавание русских названий из STS API
      'наличные': 'Наличные',
      'карта': 'Банковская карта',
      'сбербанк': 'Банковская карта',
      'топливная_карта': 'Топливная карта',
      'мобил.п': 'Онлайн заказ',       // Добавляем обработку "Мобил.П" из STS API
      'мобильная': 'Онлайн заказ',
      'мобильная оплата': 'Онлайн заказ'
    };
    return translations[paymentType?.toLowerCase()] || paymentType || 'Неизвестно';
  };

  // Статистика по способам оплаты (с учетом фильтра по датам)
  const paymentTypeStats = useMemo(() => {
    if (filteredTransactions.length === 0) return [];
    
    // Логируем все уникальные способы оплаты для диагностики
    const uniquePaymentMethods = new Set();
    filteredTransactions.forEach(tx => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      if (rawPaymentType && rawPaymentType !== 'Неизвестно') {
        uniquePaymentMethods.add(rawPaymentType);
      }
    });
    
    console.log('🔍 NetworkOverview: Уникальные способы оплаты от STS API:', Array.from(uniquePaymentMethods));
    
    const paymentGroups = filteredTransactions.reduce((groups, tx) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);
      
      // Логируем случаи когда способ оплаты не распознается
      if (paymentType === rawPaymentType && rawPaymentType !== 'Неизвестно') {
        console.log('⚠️ NetworkOverview: Неизвестный способ оплаты от STS API:', rawPaymentType);
      }
      
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

  // Детальная статистика по способам оплаты с разбивкой по видам топлива
  const paymentFuelBreakdown = useMemo(() => {
    if (filteredTransactions.length === 0) return {};
    
    const breakdown = {};
    
    filteredTransactions.forEach(tx => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);
      const fuelType = tx.fuelType || tx.apiData?.product_name || 'Неизвестно';
      
      if (!breakdown[paymentType]) {
        breakdown[paymentType] = {};
      }
      
      if (!breakdown[paymentType][fuelType]) {
        breakdown[paymentType][fuelType] = {
          operations: 0,
          revenue: 0,
          volume: 0
        };
      }
      
      breakdown[paymentType][fuelType].operations++;
      breakdown[paymentType][fuelType].revenue += (tx.total || tx.actualAmount || tx.totalCost || 0);
      breakdown[paymentType][fuelType].volume += (tx.volume || tx.actualQuantity || tx.quantity || 0);
    });
    
    return breakdown;
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
    
    // Функция для определения приоритета сортировки топлива (дублируем для консистентности)
    const getFuelPriority = (fuelType) => {
      const fuel = fuelType.toLowerCase();
      
      // Бензины
      if (fuel.includes('аи-98') || fuel.includes('98')) return 1;
      if (fuel.includes('аи-95') || fuel.includes('95')) return 2;
      if (fuel.includes('аи-92') || fuel.includes('92')) return 3;
      if (fuel.includes('аи-91') || fuel.includes('91')) return 4;
      if (fuel.includes('аи-80') || fuel.includes('80')) return 5;
      if (fuel.includes('бензин') || fuel.includes('gasoline') || fuel.includes('petrol')) return 6;
      
      // Дизельное топливо
      if (fuel.includes('дт') || fuel.includes('дизель') || fuel.includes('diesel')) return 10;
      if (fuel.includes('дт зимнее') || fuel.includes('зимний дизель')) return 11;
      if (fuel.includes('дт летнее') || fuel.includes('летний дизель')) return 12;
      if (fuel.includes('дт арктический') || fuel.includes('арктический дизель')) return 13;
      
      // Другие виды топлива
      if (fuel.includes('газ') || fuel.includes('газовый') || fuel.includes('gas')) return 20;
      if (fuel.includes('керосин') || fuel.includes('kerosene')) return 21;
      if (fuel.includes('масло') || fuel.includes('oil')) return 22;
      
      // Неизвестные - в конец
      return 99;
    };

    // Получаем все уникальные виды топлива и сортируем правильно
    const fuelTypes = [...new Set(filteredTransactions.map(tx => 
      tx.fuelType || tx.apiData?.product_name || 'Неизвестно'
    ).filter(Boolean))].sort((a, b) => {
      const priorityA = getFuelPriority(a);
      const priorityB = getFuelPriority(b);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.localeCompare(b, 'ru');
    });
    
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
        <Card className={`bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-sm ${isMobile ? 'mx-0' : ''} overflow-hidden`}>
          <CardHeader className={`${isMobile ? 'px-4 py-4' : 'px-8 py-6'} bg-gradient-to-r from-slate-800/90 via-slate-750/90 to-slate-800/90 border-b border-slate-600/30`}>
            <CardTitle className={`text-slate-100 flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg"></div>
                <div className="flex flex-col">
                  <span className={`${isMobile ? 'text-xl font-bold' : 'text-3xl font-bold'} text-white leading-tight`}>Обзор сети</span>
                  <span className="text-slate-400 text-sm font-medium">Общая информация и аналитика по торговой сети</span>
                </div>
              </div>
              
              <div className={`flex ${isMobile ? 'gap-2 self-start flex-wrap' : 'gap-4'} items-center`}>
                {!isMobile && (
                  <Button
                    onClick={() => window.open('/help/network-overview', '_blank')}
                    variant="outline"
                    size="sm"
                    className="border-slate-500/60 text-slate-300 hover:text-white hover:bg-slate-600/80 hover:border-slate-400 hover:shadow-md transition-all duration-300 px-5 py-2.5 rounded-lg bg-slate-700/30 backdrop-blur-sm"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Инструкция
                  </Button>
                )}
                
                {/* Кнопка экспорта */}
                {!initializing && selectedNetwork && filteredTransactions.length > 0 && (
                  <Button
                    onClick={exportToExcel}
                    disabled={loading}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-5 py-2.5 rounded-lg font-medium"
                    title="Экспортировать данные в Excel"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Экспорт в Excel
                  </Button>
                )}
                
                {/* Кнопка обновления данных */}
                {!initializing && selectedNetwork && (
                  <Button
                    onClick={loadTransactions}
                    disabled={loading}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
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
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="space-y-6">

        {/* Фильтры - только если выбрана сеть */}
        {!initializing && selectedNetwork && (
          <Card className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg ${isMobile ? 'mx-0' : ''}`}>
            <CardContent className={`${isMobile ? 'px-4 py-4' : 'px-6 py-4'}`}>
              <div className={`flex items-center gap-3 ${isMobile ? 'mb-4' : 'mb-6'}`}>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-sm">⚙️</span>
                </div>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white`}>Фильтры анализа</h2>
              </div>
              
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-6'}`}>
                {/* Дата начала */}
                <Card className="bg-slate-800 border-slate-600">
                  <CardContent className="p-4">
                    <Label htmlFor="dateFrom" className="text-slate-300 text-sm font-medium mb-2 block">Дата с</Label>
                    <div className="relative">
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none" 
                      />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Дата окончания */}
                <Card className="bg-slate-800 border-slate-600">
                  <CardContent className="p-4">
                    <Label htmlFor="dateTo" className="text-slate-300 text-sm font-medium mb-2 block">Дата по</Label>
                    <div className="relative">
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Статистика по видам топлива */}
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {fuelTypeStats.map((fuel) => (
              <Card key={fuel.type} className="bg-slate-800 border-slate-600">
                <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-600 rounded-lg mr-4">
                      <Fuel className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-white font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>{fuel.type}</p>
                      <p className={`font-bold text-white mb-0.5 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {Math.round(fuel.revenue).toLocaleString('ru-RU')} ₽
                      </p>
                      <div className="space-y-0.5">
                        <p className={`font-bold text-white ${isMobile ? 'text-base' : 'text-xl'}`}>{Math.round(fuel.volume).toLocaleString('ru-RU')} л</p>
                        <p className="text-sm text-slate-400">{fuel.operations} операций</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Итоговая карточка */}
            <Card className="bg-slate-700 border-slate-500 border-2">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center">
                  <div className="p-2 bg-blue-600 rounded-lg mr-4">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-white font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>Итого</p>
                    <p className={`font-bold text-white mb-0.5 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                      {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                    </p>
                    <div className="space-y-0.5">
                      <p className={`font-bold text-white ${isMobile ? 'text-base' : 'text-xl'}`}>{Math.round(totalVolume).toLocaleString('ru-RU')} л</p>
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
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
            {paymentTypeStats.map((payment) => (
              <Card key={payment.type} className="bg-slate-800 border-slate-600">
                <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className="flex items-center">
                    <div className="p-2 bg-green-600 rounded-lg mr-4">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-white font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>{payment.type}</p>
                      <p className={`font-bold text-white mb-0.5 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                        {Math.round(payment.revenue).toLocaleString('ru-RU')} ₽
                      </p>
                      <div className="space-y-0.5">
                        <p className={`font-bold text-white ${isMobile ? 'text-base' : 'text-xl'}`}>{Math.round(payment.volume).toLocaleString('ru-RU')} л</p>
                        <p className="text-sm text-slate-400">{payment.operations} операций</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Карточка среднего чека */}
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
                <div className="flex items-center">
                  <div className="p-2 bg-purple-600 rounded-lg mr-4">
                    <Monitor className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-white font-semibold mb-1 ${isMobile ? 'text-sm' : 'text-base'}`}>Средний чек</p>
                    <p className={`font-bold text-white mb-0.5 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                      {Math.round(averageCheck).toLocaleString('ru-RU')} ₽
                    </p>
                    <div className="space-y-0.5">
                      <p className={`font-bold text-white ${isMobile ? 'text-base' : 'text-xl'}`}>&nbsp;</p>
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
            <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
              {dailySalesData.data.length > 0 ? (
                <div className={`w-full ${isMobile ? 'h-64' : 'h-80'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={dailySalesData.data} 
                      margin={isMobile ? { top: 10, right: 10, left: 30, bottom: 40 } : { top: 10, right: 30, left: 60, bottom: 20 }}
                    >
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#94a3b8"
                        fontSize={isMobile ? 10 : 11}
                        tick={{ fill: '#94a3b8' }}
                        angle={isMobile ? -90 : -45}
                        textAnchor="end"
                        height={isMobile ? 40 : 60}
                        interval={isMobile ? "preserveStartEnd" : 0}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={isMobile ? 10 : 11}
                        tick={{ fill: '#94a3b8' }}
                        tickFormatter={(value) => isMobile ? `${Math.round(value / 1000)}к` : `${Math.round(value / 1000)}к ₽`}
                        width={isMobile ? 25 : 60}
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
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-white ${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
                    <Activity className="h-5 w-5 text-blue-400" />
                    {isMobile ? 'Активность операций' : 'Активность операций'}
                  </CardTitle>
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400`}>
                    {isMobile ? '7 дней' : 'Последние 7 дней'}
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
                {heatmapData && heatmapData.length > 0 ? (
                  <div className="space-y-3">
                    {/* Заголовок с часами */}
                    <div className="flex items-center">
                      <div className={`${isMobile ? 'w-8' : 'w-12'} shrink-0`}></div>
                      <div className={`flex-1 flex gap-0.5 text-xs text-slate-400`}>
                        {Array.from({ length: 24 }, (_, hour) => (
                          <div key={hour} className={`flex-1 text-center ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>
                            {hour % (isMobile ? 4 : 6) === 0 ? hour : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Сетка тепловой карты */}
                    {heatmapData.map((day) => (
                      <div key={day.date} className="flex items-center">
                        {/* День недели */}
                        <div className={`${isMobile ? 'w-8' : 'w-12'} shrink-0 ${isMobile ? 'text-[10px]' : 'text-xs'} text-slate-300 font-medium`}>
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
                                className={`flex-1 aspect-square ${bgColor} ${isMobile ? 'rounded-[1px]' : 'rounded-sm'} cursor-pointer hover:ring-1 hover:ring-green-400 ${isMobile ? '' : 'hover:scale-110'} transition-all duration-200`}
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
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-4'}`}>
                <CardTitle className={`text-white ${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
                  <Activity className="h-5 w-5 text-blue-400" />
                  {isMobile ? 'Активность по часам' : 'Суточная активность по часам'}
                </CardTitle>
              </CardHeader>
              <CardContent className={`pt-0 pb-2 ${isMobile ? 'px-1' : 'px-2'}`}>
                <div className={`w-full ${isMobile ? 'h-64' : 'h-80'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={dailyActivityData} 
                      margin={isMobile ? { top: 10, right: 5, left: 25, bottom: 40 } : { top: 10, right: 15, left: 40, bottom: 50 }}
                    >
                      <XAxis 
                        dataKey="hour" 
                        stroke="#94a3b8"
                        fontSize={isMobile ? 9 : 11}
                        interval={isMobile ? 1 : 0}
                        angle={isMobile ? -90 : -45}
                        textAnchor="end"
                        height={isMobile ? 40 : 50}
                        tick={{ fill: '#94a3b8' }}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={isMobile ? 9 : 11}
                        tick={{ fill: '#94a3b8' }}
                        width={isMobile ? 25 : 35}
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
        {!initializing && selectedNetwork && stsApiConfigured && transactions.length > 0 && (() => {
          console.log('🔮 NetworkOverview: Передаем в SalesForecast транзакций:', {
            totalTransactions: transactions.length,
            completedTransactions: completedTransactions.length,
            sampleCompletedTransactions: completedTransactions.slice(0, 3).map(tx => ({
              id: tx.id,
              startTime: tx.startTime,
              total: tx.total,
              fuelType: tx.fuelType
            }))
          });
          return (
            <SalesForecast 
              transactions={completedTransactions}
              className="w-full"
            />
          );
        })()}

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