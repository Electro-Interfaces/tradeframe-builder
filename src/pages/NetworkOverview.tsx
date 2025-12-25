import React, { useState, useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/contexts/SelectionContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { DollarSign, Users, Fuel, Monitor, CreditCard, Loader2, RefreshCw, Activity, Calendar, Download, HelpCircle, FileText, FileSpreadsheet, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { ChartSkeleton, HeatmapSkeleton } from "@/components/ui/chart-skeleton";
import { DailySalesChart } from "@/components/charts/DailySalesChart";
import { FuelPerformanceChart } from "@/components/charts/FuelPerformanceChart";
import { PaymentDistributionChart } from "@/components/charts/PaymentDistributionChart";
import { HourlyActivityChart } from "@/components/charts/HourlyActivityChart";
import { StationRevenueChart } from "@/components/charts/StationRevenueChart";
import { StationFuelSalesChart } from "@/components/charts/StationFuelSalesChart";
import { StationRevenueTrendChart } from "@/components/charts/StationRevenueTrendChart";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { loadPdfMake } from "@/utils/pdfMake";


export default function NetworkOverview() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint, isAllTradingPoints } = useSelection();
  const { toast } = useToast();
  
  // Даты по умолчанию
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(today.getMonth() - 1);
  
  // Состояния фильтров
  const [dateFrom, setDateFrom] = useState(monthAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Состояния данных
  const [transactions, setTransactions] = useState([]);
  const [tanks, setTanks] = useState([]);
  const [terminalInfo, setTerminalInfo] = useState(null);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Состояния для pull-to-refresh
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'canRefresh' | 'refreshing'>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const startTouchRef = useRef<{ y: number; time: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const dailySalesCardRef = useRef<HTMLDivElement | null>(null);
  const heatmapCardRef = useRef<HTMLDivElement | null>(null);
  const activityCardRef = useRef<HTMLDivElement | null>(null);
  const forecastCardRef = useRef<HTMLDivElement | null>(null);

  const PULL_THRESHOLD = 80; // Порог для активации обновления
  const MAX_PULL_DISTANCE = 120; // Максимальное расстояние растягивания
  const INDICATOR_APPEAR_THRESHOLD = 30; // Порог появления индикатора

  const isNetworkOnly = selectedNetwork && !selectedTradingPoint;
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint;
  const canShowData = selectedNetwork && (selectedTradingPoint === 'all' || selectedTradingPoint || !selectedTradingPoint); // Показываем данные если выбрана сеть
  

  // Функция загрузки транзакций
  const loadTransactions = async (signal?: AbortSignal) => {
    if (!selectedNetwork?.external_id) {
      toast({
        title: "Ошибка",
        description: "Выберите сеть с настроенным external_id",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Очищаем предыдущие данные
      setTransactions([]);
      setTanks([]);
      setTerminalInfo(null);
      setPrices([]);

      // Загружаем данные из STS API
      // Используем правильную логику получения contextParams как в Tanks.tsx
      let contextParams = {
        networkId: selectedNetwork?.external_id || selectedNetwork?.code || '1',
        tradingPointId: undefined
      };

      // Если выбрана конкретная торговая точка (не 'all'), получаем её полные данные
      if (selectedTradingPoint && selectedTradingPoint !== 'all') {
        
        try {
          const tradingPointObject = await tradingPointsService.getById(selectedTradingPoint);
          if (tradingPointObject) {
            contextParams.tradingPointId = tradingPointObject.external_id || '1';
          }
        } catch (error) {
        }
      }


      const stsTransactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        200,
        contextParams
      );

      setTransactions(stsTransactions);

      // Загружаем дополнительные данные для более полного обзора
      let additionalDataLoaded = [];
      try {

        // Загружаем резервуары (только для конкретной торговой точки)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const tanksData = await stsApiService.getTanks(contextParams);
            setTanks(tanksData);
            if (tanksData.length > 0) additionalDataLoaded.push(`${tanksData.length} резервуаров`);
          } catch (tanksError) {
            // Не удалось загрузить резервуары
          }
        }

        // Загружаем информацию о терминале (если выбрана конкретная торговая точка)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const terminalData = await stsApiService.getTerminalInfo(contextParams);
            setTerminalInfo(terminalData);
            if (terminalData) additionalDataLoaded.push('данные терминала');
          } catch (terminalError) {
            // Не удалось загрузить информацию о терминале
          }
        }

        // Загружаем цены (если выбрана конкретная торговая точка)
        if (contextParams.tradingPointId && contextParams.tradingPointId !== 'all' && contextParams.tradingPointId !== '1') {
          try {
            const pricesData = await stsApiService.getPrices(contextParams);
            setPrices(pricesData);
            if (pricesData.length > 0) additionalDataLoaded.push(`${pricesData.length} цен`);
          } catch (pricesError) {
            // Не удалось загрузить цены
          }
        }
        
      } catch (additionalDataError) {
        // Не прерываем выполнение, так как основные данные (транзакции) уже загружены
      }
      
      const additionalText = additionalDataLoaded.length > 0 ? `, ${additionalDataLoaded.join(', ')}` : '';
      
    } catch (error) {
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
        ['Общая выручка (₽)', Number(totalRevenue.toFixed(2)), '', 'Количество операций', filteredTransactions.length],
        ['Общий объем (л)', Number(totalVolume.toFixed(2)), '', 'Средний чек (₽)', Number(averageCheck.toFixed(2))],
        ['Средний объем на операцию (л)', filteredTransactions.length > 0 ? Number((totalVolume / filteredTransactions.length).toFixed(2)) : 0],
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
            Number(fuel.revenue.toFixed(2)),
            Number(fuel.volume.toFixed(2)),
            fuel.operations > 0 ? Number((fuel.revenue / fuel.operations).toFixed(2)) : 0,
            totalRevenue > 0 ? Number(((fuel.revenue / totalRevenue) * 100).toFixed(2)) : 0
          ]);
        });
        
        // Итоговая строка для топлива
        mainData.push([
          'ИТОГО',
          filteredTransactions.length,
          Number(totalRevenue.toFixed(2)),
          Number(totalVolume.toFixed(2)),
          Number(averageCheck.toFixed(2)),
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
            Number(payment.revenue.toFixed(2)),
            Number(payment.volume.toFixed(2)),
            payment.operations > 0 ? Number((payment.revenue / payment.operations).toFixed(2)) : 0,
            totalRevenue > 0 ? Number(((payment.revenue / totalRevenue) * 100).toFixed(2)) : 0
          ]);
        });
        
        // Итоговая строка для способов оплаты
        mainData.push([
          'ИТОГО',
          filteredTransactions.length,
          Number(totalRevenue.toFixed(2)),
          Number(totalVolume.toFixed(2)),
          Number(averageCheck.toFixed(2)),
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
            const percentOfPayment = payment.revenue > 0 ? Number(((fuelData.revenue / payment.revenue) * 100).toFixed(2)) : 0;
            
            mainData.push([
              isFirstRow ? payment.type : '', // Показываем способ оплаты только в первой строке
              fuelType,
              fuelData.operations,
              Number(fuelData.revenue.toFixed(2)),
              Number(fuelData.volume.toFixed(2)),
              fuelData.operations > 0 ? Number((fuelData.revenue / fuelData.operations).toFixed(2)) : 0,
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
              Number(payment.revenue.toFixed(2)),
              Number(payment.volume.toFixed(2)),
              payment.operations > 0 ? Number((payment.revenue / payment.operations).toFixed(2)) : 0,
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
          Number(totalRevenue.toFixed(2)),
          Number(totalVolume.toFixed(2)),
          Number(averageCheck.toFixed(2)),
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
            Number(hour.revenue.toFixed(2)),
            hour.operations > 0 ? Number((hour.revenue / hour.operations).toFixed(2)) : 0
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
              Number(day.revenue.toFixed(2)),
              Number(day.volume.toFixed(2)),
              day.operations > 0 ? Number((day.revenue / day.operations).toFixed(2)) : 0
            ];
            
            // Добавляем данные по каждому виду топлива
            dailySalesData.fuelTypes.forEach(fuelType => {
              baseData.push(Number((day[fuelType] || 0).toFixed(2)));
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
      
      toast({
        title: "Экспорт завершен",
        description: `Данные сохранены в файл: ${fileName}`,
      });
      
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось создать Excel файл. Попробуйте еще раз.",
        variant: "destructive",
      });
    }
  };

  const exportDashboardToPdf = async () => {
    if (initializing || !selectedNetwork || filteredTransactions.length === 0) {
      toast({
        title: "Нет данных для экспорта",
        description: "Выберите сеть, период и дождитесь загрузки аналитики",
        variant: "destructive",
      });
      return;
    }

    setExportingPdf(true);

    try {
      const pdfMake = await loadPdfMake();

      const formatNumber = (value: number) =>
        value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatCurrency = (value: number) => `${formatNumber(value)} ₽`;

      const captureElement = async (element: HTMLDivElement | null) => {
        if (!element) return null;

        const canvas = await html2canvas(element, {
          backgroundColor: '#0f172a',
          scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
          useCORS: true,
        });

        return canvas.toDataURL('image/png');
      };

      const [dailySalesImage, heatmapImage, activityImage, forecastImage] = await Promise.all([
        captureElement(dailySalesCardRef.current),
        captureElement(heatmapCardRef.current),
        captureElement(activityCardRef.current),
        captureElement(forecastCardRef.current),
      ]);

      const pointDisplay = (() => {
        if (!selectedTradingPoint || selectedTradingPoint === 'all') {
          return 'Все торговые точки';
        }

        if (typeof selectedTradingPoint === 'string') {
          return selectedTradingPoint;
        }

        return selectedTradingPoint?.name ?? '—';
      })();

      const content: any[] = [
        { text: 'Обзор сети', style: 'title' },
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: `Сеть: ${selectedNetwork?.name ?? '—'}`, style: 'infoBlock' },
                { text: `Точка: ${pointDisplay}`, style: 'infoBlock' },
                { text: `Период: ${dateFrom} – ${dateTo}`, style: 'infoBlock' },
                { text: `Сформировано: ${new Date().toLocaleString('ru-RU')}`, style: 'infoBlock' },
              ],
            },
            {
              width: '*',
              alignment: 'right',
              stack: [
                { text: `Операции: ${filteredTransactions.length}`, style: 'summaryBlock' },
                { text: `Отпуск, л: ${formatNumber(totalVolume)}`, style: 'summaryBlock' },
                { text: `Выручка: ${formatCurrency(totalRevenue)}`, style: 'summaryBlock' },
                { text: `Средний чек: ${formatCurrency(averageCheck)}`, style: 'summaryBlock' },
              ],
            },
          ],
          columnGap: 16,
          margin: [0, 0, 0, 16],
        },
      ];

      const fuelSummary = fuelTypeStats.slice(0, 6);
      const paymentSummary = paymentTypeStats.slice(0, 6);

      const breakdownColumns: any[] = [];

      if (fuelSummary.length > 0) {
        breakdownColumns.push({
          width: '*',
          stack: [
            { text: 'Итоги по видам топлива', style: 'sectionLabel' },
            ...fuelSummary.map((fuel) => ({
              text: `${fuel.type}: ${formatNumber(fuel.volume)} л • ${formatCurrency(fuel.revenue)} • ${fuel.operations} оп.`,
              style: 'summaryDetail',
            })),
          ],
        });
      }

      if (paymentSummary.length > 0) {
        breakdownColumns.push({
          width: '*',
          stack: [
            { text: 'Итоги по типам оплаты', style: 'sectionLabel' },
            ...paymentSummary.map((payment) => ({
              text: `${payment.type}: ${formatNumber(payment.volume)} л • ${formatCurrency(payment.revenue)} • ${payment.operations} оп.`,
              style: 'summaryDetail',
            })),
          ],
        });
      }

      if (breakdownColumns.length > 0) {
        content.push({
          columns: breakdownColumns,
          columnGap: 18,
          margin: [0, 0, 0, 16],
        });
      }

      if (dailySalesImage) {
        content.push({ text: 'Реализация по дням', style: 'sectionLabel', margin: [0, 0, 0, 8] });
        content.push({ image: dailySalesImage, width: 520, margin: [0, 0, 0, 16] });
      }

      if (heatmapImage) {
        content.push({ text: 'Активность операций (тепловая карта)', style: 'sectionLabel', margin: [0, 0, 0, 8] });
        content.push({ image: heatmapImage, width: 520, margin: [0, 0, 0, 16] });
      }

      if (activityImage) {
        content.push({ text: 'Суточная активность по часам', style: 'sectionLabel', margin: [0, 0, 0, 8] });
        content.push({ image: activityImage, width: 520, margin: [0, 0, 0, 16] });
      }

      if (forecastImage) {
        content.push({ text: 'Прогноз продаж', style: 'sectionLabel', margin: [0, 0, 0, 8] });
        content.push({ image: forecastImage, width: 520, margin: [0, 0, 0, 16] });
      }

      const networkSlug = (selectedNetwork?.name || 'network')
        .replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const docDefinition = {
        info: {
          title: 'Обзор сети',
          author: 'TradeFrame Builder',
          subject: 'Экспорт дашборда',
        },
        pageOrientation: 'landscape',
        pageMargins: [24, 24, 24, 32],
        content,
        styles: {
          title: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 12],
            color: '#111827',
          },
          infoBlock: {
            fontSize: 10,
            color: '#111827',
          },
          summaryBlock: {
            fontSize: 11,
            color: '#111827',
          },
          sectionLabel: {
            fontSize: 11,
            color: '#111827',
            bold: true,
            margin: [0, 0, 0, 4],
          },
          summaryDetail: {
            fontSize: 10,
            color: '#374151',
            margin: [0, 0, 0, 2],
          },
          tableHeader: {
            bold: true,
            color: '#f9fafb',
            fontSize: 10,
          },
          tableCell: {
            fontSize: 9,
            color: '#111827',
            noWrap: false,
            lineHeight: 1.2,
          },
          tableCellMono: {
            fontSize: 8,
            color: '#111827',
            font: 'Roboto',
            noWrap: false,
            lineHeight: 1.2,
          },
        },
        defaultStyle: {
          font: 'Roboto',
        },
      } as const;

      const fileName = `dashboard_${networkSlug || 'network'}_${dateFrom}_${dateTo}.pdf`;
      pdfMake.createPdf(docDefinition).download(fileName);

      toast({
        title: "PDF готов",
        description: `Файл ${fileName} сформирован и загружен`,
      });
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: error instanceof Error ? error.message : 'Не удалось сформировать PDF',
        variant: "destructive",
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // Инициализация компонента
  useEffect(() => {
    // Принудительная проверка конфигурации STS API (обходим кэш)
    const checkConfig = async () => {
      try {
        // Пытаемся получить свежую конфигурацию
        const isConfigured = stsApiService.isConfigured();
        setStsApiConfigured(isConfigured);
        
        setInitializing(false);
        
        // Загружаем данные если выбрана сеть И настроен STS API (торговая точка не обязательна)
        if (selectedNetwork && isConfigured) {
          loadTransactions();
        } else if (selectedNetwork && !isConfigured) {
          // Не показываем toast сразу, даем пользователю время
        }
      } catch (error) {
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

    // Проверяем есть ли онлайн заказы среди всех транзакций
    const onlineTransactions = transactions.filter(tx => {
      const paymentMethod = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType;
      return paymentMethod && String(paymentMethod).toLowerCase().includes('online');
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

    // Проверяем онлайн заказы после фильтрации по датам
    const onlineFiltered = filtered.filter(tx => {
      const paymentMethod = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType;
      return paymentMethod && String(paymentMethod).toLowerCase().includes('online');
    });

    // Проверяем есть ли транзакции вне диапазона дат
    const outsideDateRange = completedTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp || tx.createdAt || tx.date);
      return txDate < startDate || txDate > endDate;
    });
    
    if (outsideDateRange.length > 0) {
      // Транзакции вне диапазона дат найдены
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
      'corporate_card': 'Корп. карты',
      'coupon': 'Купон',
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

    const paymentGroups = filteredTransactions.reduce((groups, tx) => {
      const rawPaymentType = tx.paymentMethod || tx.apiData?.payment_method || tx.paymentType || 'Неизвестно';
      const paymentType = getPaymentTypeDisplayName(rawPaymentType);
      
      // Логируем случаи когда способ оплаты не распознается
      if (paymentType === rawPaymentType && rawPaymentType !== 'Неизвестно') {
        // Неизвестный способ оплаты от STS API
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
      // Используем локальную дату, а не UTC для правильной группировки по дням
      const dateKey = `${txDate.getFullYear()}-${(txDate.getMonth() + 1).toString().padStart(2, '0')}-${txDate.getDate().toString().padStart(2, '0')}`;
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

    if (!selectedNetwork || transactions.length === 0) return [];
    
    // Берем последние 7 дней от сегодняшней даты назад
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Устанавливаем на конец дня

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
        // День с транзакциями
      }
      
      heatmapGrid.push(dayRow);
    }
    
    return heatmapGrid;
  }, [selectedNetwork, transactions]);

  // Pull-to-refresh функционал
  const handleRefreshData = async () => {
    if (selectedNetwork) {
      await loadTransactions();
    }
  };

  // Функция для вибрации на поддерживаемых устройствах
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && isMobile) {
      navigator.vibrate(50);
    }
  };

  // Плавное обновление расстояния с throttling через RAF
  const updatePullDistance = (distance: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      const clampedDistance = Math.min(distance, MAX_PULL_DISTANCE);
      setPullDistance(clampedDistance);

      // Обновляем состояние на основе расстояния
      if (clampedDistance >= PULL_THRESHOLD && pullState !== 'canRefresh' && pullState !== 'refreshing') {
        setPullState('canRefresh');
        triggerHapticFeedback();
      } else if (clampedDistance < PULL_THRESHOLD && pullState === 'canRefresh') {
        setPullState('pulling');
      }
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    startTouchRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
    setPullState('pulling');
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !startTouchRef.current || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startTouchRef.current.y;

    // Только если движение вниз и мы в верху страницы
    if (deltaY > 0 && container.scrollTop === 0) {
      e.preventDefault();

      // Применяем эластичность (чем больше тянем, тем медленнее)
      const elasticity = Math.max(0.5, 1 - (deltaY / MAX_PULL_DISTANCE) * 0.5);
      const adjustedDistance = deltaY * elasticity;

      updatePullDistance(adjustedDistance);
    } else if (deltaY <= 0 || container.scrollTop > 0) {
      // Сбрасываем если движение вверх или начался скролл
      resetPull();
    }
  };

  const handleTouchEnd = async () => {
    if (!isMobile || !startTouchRef.current) return;

    const shouldRefresh = pullState === 'canRefresh';

    if (shouldRefresh) {
      setPullState('refreshing');
      triggerHapticFeedback();

      try {
        await handleRefreshData();
      } finally {
        setTimeout(() => {
          resetPull();
        }, 300);
      }
    } else {
      resetPull();
    }
  };

  const resetPull = () => {
    setPullState('idle');
    setPullDistance(0);
    startTouchRef.current = null;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  };

  // Добавляем обработчики touch событий
  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;

  }, []);

  // Cleanup RAF при размонтировании компонента
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-hidden ${isMobile ? 'pt-4' : 'pt-6'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isMobile && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Стандартный мобильный pull-to-refresh индикатор */}
        {isMobile && pullState !== 'idle' && pullDistance >= INDICATOR_APPEAR_THRESHOLD && (
          <div
            className="absolute top-0 left-0 right-0 flex justify-center items-center z-50"
            style={{
              transform: `translateY(-${Math.max(0, 80 - pullDistance)}px)`,
              opacity: Math.min(1, (pullDistance - INDICATOR_APPEAR_THRESHOLD) / 40)
            }}
          >
            <div className="bg-white/95 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full shadow-lg border border-slate-200/50 flex items-center gap-2">
              {pullState === 'refreshing' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium">Обновление...</span>
                </>
              ) : pullState === 'canRefresh' ? (
                <>
                  <RefreshCw className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Отпустите для обновления</span>
                </>
              ) : (
                <>
                  <RefreshCw
                    className="w-4 h-4 text-slate-500"
                    style={{
                      transform: `rotate(${pullDistance * 2}deg)`
                    }}
                  />
                  <span className="text-sm font-medium">Потяните для обновления</span>
                </>
              )}
            </div>
          </div>
        )}
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Обзор сети</h1>
            <div className="flex items-center gap-2">
              {!initializing && selectedNetwork && filteredTransactions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Экспорт
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 bg-slate-800 border-slate-600 shadow-xl rounded-lg">
                    <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                      <FileSpreadsheet className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-medium">Экспорт в Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportDashboardToPdf} disabled={loading || exportingPdf} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                      <FileText className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium">{exportingPdf ? 'PDF…' : 'Экспорт в PDF'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">

        {/* Фильтры - только если выбрана сеть */}
        {!initializing && selectedNetwork && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-white">Фильтры</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const monthAgo = new Date();
                        monthAgo.setMonth(monthAgo.getMonth() - 1);
                        setDateFrom(monthAgo.toISOString().split('T')[0]);
                        setDateTo(new Date().toISOString().split('T')[0]);
                      }}
                    >
                      Очистить фильтры
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTransactions();
                      }}
                      disabled={loading}
                      className="border-slate-600 text-white hover:bg-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                    {filtersOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 border-t border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Дата начала */}
                    <div>
                      <Label htmlFor="dateFrom" className="text-xs text-slate-400">Дата от</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>

                    {/* Дата окончания */}
                    <div>
                      <Label htmlFor="dateTo" className="text-xs text-slate-400">Дата до</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Средние значения - сразу после фильтров */}
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <div className="w-full space-y-6">
            {/* Первая строка - основные средние значения */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <h3 className={`text-slate-300 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Средние значения</h3>
              </div>
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-6'}`}>
                {/* Средний чек */}
                <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm mb-2">Средний чек</p>
                    <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                      {Math.round(averageCheck).toLocaleString('ru-RU')} ₽
                    </p>
                  </CardContent>
                </Card>

                {/* Средний объем общий */}
                <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm mb-2">Средний объем</p>
                    <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                      {filteredTransactions.length > 0 ? Math.round(totalVolume / filteredTransactions.length) : 0} л
                    </p>
                  </CardContent>
                </Card>

                {/* Операций в день */}
                <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                  <CardContent className="p-4 text-center">
                    <p className="text-slate-400 text-sm mb-2">Операций/день</p>
                    <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                      {(() => {
                        const startDate = new Date(dateFrom);
                        const endDate = new Date(dateTo);
                        const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                        return Math.round(filteredTransactions.length / daysDiff);
                      })()}
                    </p>
                  </CardContent>
                </Card>

                {/* Средний объем АИ-92 */}
                {fuelTypeStats.find(f => f.type.includes('АИ-92')) ? (
                  <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">АИ-92 сред.</p>
                      <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                        {(() => {
                          const fuel92 = fuelTypeStats.find(f => f.type.includes('АИ-92'));
                          return fuel92 && fuel92.operations > 0 ? Math.round(fuel92.volume / fuel92.operations) : 0;
                        })()} л
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div></div>
                )}

                {/* Средний объем АИ-95 */}
                {fuelTypeStats.find(f => f.type.includes('АИ-95')) ? (
                  <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">АИ-95 сред.</p>
                      <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                        {(() => {
                          const fuel95 = fuelTypeStats.find(f => f.type.includes('АИ-95'));
                          return fuel95 && fuel95.operations > 0 ? Math.round(fuel95.volume / fuel95.operations) : 0;
                        })()} л
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div></div>
                )}

                {/* Средний объем ДТ */}
                {fuelTypeStats.find(f => f.type.includes('ДТ') || f.type.includes('Дизель')) ? (
                  <Card className="bg-slate-800 border-slate-600 transition-all duration-300 hover:shadow-lg hover:bg-slate-700">
                    <CardContent className="p-4 text-center">
                      <p className="text-slate-400 text-sm mb-2">ДТ средний</p>
                      <p className="font-bold text-white text-2xl min-h-[2.5rem] flex items-center justify-center">
                        {(() => {
                          const fuelDT = fuelTypeStats.find(f => f.type.includes('ДТ') || f.type.includes('Дизель'));
                          return fuelDT && fuelDT.operations > 0 ? Math.round(fuelDT.volume / fuelDT.operations) : 0;
                        })()} л
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div></div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* KPI блок с таблицами */}
        {!initializing && selectedNetwork && fuelTypeStats.length > 0 && (
          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-6'}`}>
            {/* Таблица по видам топлива */}
            <Card className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
              <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
                <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
                  <Fuel className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-purple-400`} />
                  Виды топлива
                </CardTitle>
              </CardHeader>
              <CardContent className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className={`text-left py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Топливо</th>
                        <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Выручка</th>
                        <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Объем</th>
                        <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}><Activity className="w-4 h-4 mx-auto" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fuelTypeStats.map((fuel) => (
                        <tr key={fuel.type} className="border-b border-slate-700 hover:bg-slate-700 transition-colors duration-200">
                          <td className={`py-3 text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{fuel.type}</td>
                          <td className={`py-3 text-right text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {fuel.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                          </td>
                          <td className={`py-3 text-right text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {fuel.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} л
                          </td>
                          <td className={`py-3 text-right text-slate-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {fuel.operations}
                          </td>
                        </tr>
                      ))}
                      {/* Итоговая строка для топлива */}
                      <tr className="border-t-2 border-blue-400 bg-blue-900/30">
                        <td className={`py-3 text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>Итого</td>
                        <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                        </td>
                        <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {Math.round(totalVolume).toLocaleString('ru-RU')} л
                        </td>
                        <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                          {filteredTransactions.length}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Таблица по способам оплаты */}
            {paymentTypeStats.length > 0 && (
              <Card className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg transition-all duration-300 hover:shadow-xl">
                <CardHeader className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
                  <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-xl'}`}>
                    <CreditCard className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} text-green-400`} />
                    Способы оплаты
                  </CardTitle>
                </CardHeader>
                <CardContent className={`${isMobile ? 'px-3 py-2' : 'px-6 py-2'}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className={`text-left py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Вид</th>
                          <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Выручка</th>
                          <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Объем</th>
                          <th className={`text-right py-3 text-slate-200 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}><Activity className="w-4 h-4 mx-auto" /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentTypeStats.map((payment) => {
                          // Сокращаем названия способов оплаты
                          const shortName = payment.type
                            .replace('Банковская карта', 'Банковские')
                            .replace('Наличные', 'Наличные')
                            .replace('Топливная карта', 'Топливные')
                            .replace('Онлайн заказ', 'Онлайн');

                          return (
                          <tr key={payment.type} className="border-b border-slate-700 hover:bg-slate-700 transition-colors duration-200">
                            <td className={`py-3 text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{shortName}</td>
                            <td className={`py-3 text-right text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {payment.revenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽
                            </td>
                            <td className={`py-3 text-right text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {payment.volume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} л
                            </td>
                            <td className={`py-3 text-right text-slate-300 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                              {payment.operations}
                            </td>
                          </tr>
                          );
                        })}
                        {/* Итоговая строка для способов оплаты */}
                        <tr className="border-t-2 border-blue-400 bg-blue-900/30">
                          <td className={`py-3 text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>Итого</td>
                          <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {Math.round(totalVolume).toLocaleString('ru-RU')} л
                          </td>
                          <td className={`py-3 text-right text-blue-200 font-bold ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {filteredTransactions.length}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        )}



        {/* График реализации по дням с разбивкой по топливу - Оптимизированный */}
        {!initializing && selectedNetwork && transactions.length > 0 && (
          <div ref={dailySalesCardRef} className="w-full">
            <DailySalesChart
              data={dailySalesData.data}
              fuelTypes={dailySalesData.fuelTypes}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Производительность по топливу, Распределение оплат и Суточная активность */}
        {!initializing && selectedNetwork && transactions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full">
              {/* График производительности по видам топлива */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <FuelPerformanceChart
                  data={fuelTypeStats.map(fuel => ({
                    type: fuel.type,
                    operations: fuel.operations,
                    revenue: fuel.revenue,
                    volume: fuel.volume,
                    avgCheck: fuel.operations > 0 ? fuel.revenue / fuel.operations : 0,
                    share: totalRevenue > 0 ? (fuel.revenue / totalRevenue) * 100 : 0
                  }))}
                  isMobile={isMobile}
                />
              </div>

              {/* График распределения способов оплаты */}
              <div className="w-full lg:col-span-1 lg:h-full">
                <PaymentDistributionChart
                  data={paymentTypeStats.map(payment => {
                    // Определяем тип на основе русского названия
                    const typeLower = payment.type.toLowerCase();
                    let paymentType = 'other';
                    if (typeLower.includes('наличн')) paymentType = 'cash';
                    else if (typeLower.includes('карт') || typeLower.includes('банк')) paymentType = 'bank_card';
                    else if (typeLower.includes('онлайн') || typeLower.includes('мобильн')) paymentType = 'online_order';
                    else if (typeLower.includes('топливн')) paymentType = 'fuel_card';

                    return {
                      type: paymentType,
                      displayName: payment.type, // Уже русское название
                      operations: payment.operations,
                      revenue: payment.revenue,
                      volume: payment.volume,
                      avgCheck: payment.operations > 0 ? payment.revenue / payment.operations : 0,
                      share: totalRevenue > 0 ? (payment.revenue / totalRevenue) * 100 : 0
                    };
                  })}
                  isMobile={isMobile}
                />
              </div>

              {/* График суточной активности по часам */}
              <div ref={activityCardRef} className="w-full lg:col-span-2 lg:h-full">
                <HourlyActivityChart
                  data={dailyActivityData}
                  isMobile={isMobile}
                />
              </div>
          </div>
        )}

        {/* Сравнение станций - только если данные по ВСЕЙ сети */}
        {!initializing && selectedNetwork && stsApiConfigured && transactions.length > 0 && isAllTradingPoints && (
          <>
            {/* Заголовок секции */}
            <div className="w-full">
              <h2 className={`font-bold text-white flex items-center ${isMobile ? 'text-lg mb-1 gap-1.5' : 'text-2xl mb-2 gap-2'}`}>
                <span className={isMobile ? 'text-lg' : 'text-2xl'}>📊</span>
                {isMobile ? 'Сравнение станций' : 'Сравнение работы станций'}
              </h2>
              <p className={`text-slate-400 ${isMobile ? 'text-xs mb-4' : 'text-sm mb-6'}`}>
                Аналитика и сравнительные показатели по всем АЗС сети
              </p>
            </div>

            {/* График 1: Выручка по станциям */}
            <StationRevenueChart
              transactions={filteredTransactions}
              className="w-full"
              isMobile={isMobile}
            />

            {/* График 2 и 3: В две колонки на больших экранах, стек на мобильных */}
            <div className={`w-full grid grid-cols-1 ${isMobile ? 'gap-4' : 'xl:grid-cols-2 gap-6'}`}>
              {/* График 2: Продажи по видам топлива */}
              <StationFuelSalesChart
                transactions={filteredTransactions}
                className="w-full"
                isMobile={isMobile}
              />

              {/* График 3: Динамика выручки */}
              <StationRevenueTrendChart
                transactions={filteredTransactions}
                className="w-full"
                isMobile={isMobile}
              />
            </div>
          </>
        )}

        {/* Прогнозирование продаж */}
        {!initializing && selectedNetwork && stsApiConfigured && transactions.length > 0 && (() => {
          return (
            <div ref={forecastCardRef} className="w-full">
              <SalesForecast
                transactions={completedTransactions}
                className="w-full"
              />
            </div>
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

        {/* Состояние загрузки с skeleton loaders */}
        {!initializing && selectedNetwork && stsApiConfigured && loading && (
          <div className="space-y-6">
            <ChartSkeleton height="h-80" isMobile={isMobile} showLegend={true} />
            <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
              <HeatmapSkeleton isMobile={isMobile} />
              <ChartSkeleton height="h-80" isMobile={isMobile} />
            </div>
            <ChartSkeleton height={isMobile ? "h-64" : "h-80"} isMobile={isMobile} showLegend={true} />
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
                  setInitializing(true);
                  
                  // Даем время на обновление настроек
                  setTimeout(() => {
                    const isConfigured = stsApiService.isConfigured();
                    setStsApiConfigured(isConfigured);
                    setInitializing(false);
                    
                    if (isConfigured) {
                      // API настроен - уведомление убрано
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
