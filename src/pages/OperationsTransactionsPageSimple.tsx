import React, { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useSelection } from "@/context/SelectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Activity, AlertTriangle, Loader2, FileText, FileSpreadsheet, Calendar } from "lucide-react";
import { HelpButton } from "@/components/help/HelpButton";
import { operationsService } from "@/services/operationsService";
import { stsApiService, Transaction } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';

export default function OperationsTransactionsPageSimple() {
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // STS API состояние
  const [stsApiConfigured, setStsApiConfigured] = useState(false);
  const [loadingFromSTS, setLoadingFromSTS] = useState(false);
  
  // Фильтры
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Функции экспорта
  const exportToExcel = () => {
    try {
      // Подготавливаем данные для экспорта
      const exportData = filteredOperations.map(record => ({
        'ID операции': record.id,
        'Статус': record.status === 'completed' ? 'Завершено' : 
                  record.status === 'in_progress' ? 'Выполняется' : 
                  record.status === 'failed' ? 'Ошибка' : 
                  record.status === 'pending' ? 'Ожидание' : 
                  record.status === 'cancelled' ? 'Отменено' : record.status,
        'Номер ТО': record.toNumber || '-',
        'Время начала': new Date(record.startTime).toLocaleString('ru-RU'),
        'Время окончания': record.endTime ? new Date(record.endTime).toLocaleString('ru-RU') : '-',
        'Вид топлива': record.fuelType || '-',
        'Фактич. отпуск (литры)': Number(record.actualQuantity || record.quantity || 0),
        'Цена за литр (₽)': Number(record.price || 0),
        'Фактич. отпуск (сумма ₽)': Number(record.actualAmount || record.totalCost || 0),
        'Вид оплаты': {
          'cash': 'Наличные',
          'bank_card': 'Банк. карты',
          'fuel_card': 'Топл. карты', 
          'online_order': 'Онлайн заказы'
        }[record.paymentMethod] || record.paymentMethod || '-',
        'Номер POS': record.posNumber || '-',
        'Смена': record.shiftNumber || '-',
        'Номер карты': record.cardNumber || '-',
        'Заказ (литры)': Number(record.orderedQuantity || 0),
        'Заказ (сумма ₽)': Number(record.orderedAmount || 0),
        'Источник данных': record.isFromStsApi ? 'STS API' : 'Локальные данные'
      }));

      // Создаем рабочую книгу
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Устанавливаем ширину колонок
      const colWidths = [
        { wch: 20 }, // ID операции
        { wch: 12 }, // Статус
        { wch: 10 }, // Номер ТО
        { wch: 18 }, // Время начала
        { wch: 18 }, // Время окончания
        { wch: 15 }, // Вид топлива
        { wch: 18 }, // Фактич. отпуск (литры)
        { wch: 15 }, // Цена за литр
        { wch: 20 }, // Фактич. отпуск (сумма)
        { wch: 15 }, // Вид оплаты
        { wch: 12 }, // Номер POS
        { wch: 8 },  // Смена
        { wch: 15 }, // Номер карты
        { wch: 15 }, // Заказ (литры)
        { wch: 18 }, // Заказ (сумма)
        { wch: 15 }  // Источник данных
      ];
      ws['!cols'] = colWidths;

      // Настраиваем форматы для числовых столбцов
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        // Столбец G - Фактич. отпуск (литры) - формат чисел с 2 знаками
        const literCell = XLSX.utils.encode_cell({ r: row, c: 6 });
        if (ws[literCell] && typeof ws[literCell].v === 'number') {
          ws[literCell].z = '0.00';
          ws[literCell].t = 'n';
        }
        
        // Столбец H - Цена за литр - формат чисел с 2 знаками
        const priceCell = XLSX.utils.encode_cell({ r: row, c: 7 });
        if (ws[priceCell] && typeof ws[priceCell].v === 'number') {
          ws[priceCell].z = '0.00';
          ws[priceCell].t = 'n';
        }
        
        // Столбец I - Фактич. отпуск (сумма) - формат чисел с 2 знаками
        const amountCell = XLSX.utils.encode_cell({ r: row, c: 8 });
        if (ws[amountCell] && typeof ws[amountCell].v === 'number') {
          ws[amountCell].z = '0.00';
          ws[amountCell].t = 'n';
        }
        
        // Столбец N - Заказ (литры) - формат чисел с 2 знаками
        const orderedLiterCell = XLSX.utils.encode_cell({ r: row, c: 13 });
        if (ws[orderedLiterCell] && typeof ws[orderedLiterCell].v === 'number') {
          ws[orderedLiterCell].z = '0.00';
          ws[orderedLiterCell].t = 'n';
        }
        
        // Столбец O - Заказ (сумма) - формат чисел с 2 знаками
        const orderedAmountCell = XLSX.utils.encode_cell({ r: row, c: 14 });
        if (ws[orderedAmountCell] && typeof ws[orderedAmountCell].v === 'number') {
          ws[orderedAmountCell].z = '0.00';
          ws[orderedAmountCell].t = 'n';
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Операции');
      
      // Генерируем имя файла с текущей датой
      const fileName = `operations_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Экспорт в Excel завершен: ${fileName}`);
    } catch (error) {
      console.error('❌ Ошибка экспорта в Excel:', error);
      alert('Ошибка при экспорте в Excel');
    }
  };

  const createChartCanvas = (type, data, options) => {
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        
        ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, TimeScale);
        
        const chart = new ChartJS(canvas.getContext('2d'), {
          type,
          data,
          options: {
            ...options,
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
              ...options.plugins,
              legend: {
                ...options.plugins?.legend,
                labels: {
                  color: '#ffffff',
                  font: { size: 12 }
                }
              }
            },
            scales: options.scales ? {
              ...options.scales,
              x: options.scales.x ? {
                ...options.scales.x,
                ticks: { color: '#ffffff', font: { size: 10 } },
                grid: { color: '#374151' }
              } : undefined,
              y: options.scales.y ? {
                ...options.scales.y,
                ticks: { color: '#ffffff', font: { size: 10 } },
                grid: { color: '#374151' }
              } : undefined
            } : undefined
          }
        });
        
        setTimeout(() => {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            chart.destroy();
            resolve(dataUrl);
          } catch (error) {
            console.warn('Chart canvas conversion failed, using fallback');
            chart.destroy();
            resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
          }
        }, 200);
      } catch (error) {
        console.warn('Chart creation failed, using fallback', error);
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }
    });
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      let yPosition = 20;
      
      // === ЗАГОЛОВОК ОТЧЕТА ===
      pdf.setFillColor(30, 41, 59); // slate-800
      pdf.rect(0, 0, pdf.internal.pageSize.width, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('DASHBOARD OPERATSIY I TRANSAKTSIY', 20, 20);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      pdf.text(`Data formirovaniya: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`, 20, 30);
      pdf.text(`Period otcheta: ${dateFrom} - ${dateTo}`, 170, 30);
      
      yPosition = 50;
      pdf.setTextColor(0, 0, 0);
      
      // === РАСЧЕТ KPI ===
      const completedOps = filteredOperations.filter(op => op.status === 'completed');
      const totalVolume = completedOps.reduce((sum, op) => sum + (op.actualQuantity || op.quantity || 0), 0);
      const totalRevenue = completedOps.reduce((sum, op) => sum + (op.actualAmount || op.totalCost || 0), 0);
      const avgPrice = totalVolume > 0 ? totalRevenue / totalVolume : 0;
      
      // Статистика по видам топлива
      const fuelStats = [...new Set(completedOps.map(op => op.fuelType).filter(Boolean))].map(fuel => {
        const fuelOps = completedOps.filter(op => op.fuelType === fuel);
        return {
          fuel,
          operations: fuelOps.length,
          volume: fuelOps.reduce((sum, op) => sum + (op.actualQuantity || op.quantity || 0), 0),
          revenue: fuelOps.reduce((sum, op) => sum + (op.actualAmount || op.totalCost || 0), 0)
        };
      }).sort((a, b) => b.revenue - a.revenue);
      
      // Статистика по способам оплаты
      const paymentStats = ['cash', 'bank_card', 'fuel_card', 'online_order'].map(method => {
        const paymentOps = completedOps.filter(op => op.paymentMethod === method);
        return {
          method,
          name: { 'cash': 'Наличные', 'bank_card': 'Банк. карты', 'fuel_card': 'Топл. карты', 'online_order': 'Онлайн заказы' }[method],
          operations: paymentOps.length,
          revenue: paymentOps.reduce((sum, op) => sum + (op.actualAmount || op.totalCost || 0), 0)
        };
      }).filter(stat => stat.operations > 0).sort((a, b) => b.revenue - a.revenue);
      
      // === ГЛАВНЫЕ KPI (4 блока) ===
      const kpiBlocks = [
        { title: 'OBSCHAYA VYRUCHKA', value: `${totalRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} RUB`, color: [59, 130, 246] },
        { title: 'OBSCHIY OBEM', value: `${totalVolume.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} L`, color: [16, 185, 129] },
        { title: 'OPERATSIY', value: `${completedOps.length.toLocaleString('en-US')}`, color: [245, 158, 11] },
        { title: 'SREDNYAYA TSENA', value: `${avgPrice.toFixed(2)} RUB/L`, color: [139, 92, 246] }
      ];
      
      const blockWidth = 60;
      const blockHeight = 25;
      kpiBlocks.forEach((kpi, index) => {
        const x = 20 + (index * 70);
        
        // Фон блока
        pdf.setFillColor(...kpi.color);
        pdf.roundedRect(x, yPosition, blockWidth, blockHeight, 3, 3, 'F');
        
        // Заголовок
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text(kpi.title, x + 2, yPosition + 8);
        
        // Значение
        pdf.setFontSize(14);
        pdf.text(kpi.value, x + 2, yPosition + 18);
      });
      
      yPosition += 35;
      
      // === СОЗДАНИЕ ГРАФИКОВ ===
      let fuelChartData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      let paymentChartData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      try {
        // 1. График по видам топлива (Bar Chart)
        if (fuelStats.length > 0) {
          fuelChartData = await createChartCanvas('bar', {
            labels: fuelStats.slice(0, 5).map(stat => stat.fuel),
            datasets: [{
              label: 'Выручка (₽)',
              data: fuelStats.slice(0, 5).map(stat => stat.revenue),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
              borderRadius: 4
            }]
          }, {
            plugins: {
              title: { display: true, text: 'ВЫРУЧКА ПО ВИДАМ ТОПЛИВА', color: '#ffffff', font: { size: 14, weight: 'bold' } },
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true, ticks: { callback: (value) => `${value.toLocaleString()} ₽` } },
              x: {}
            }
          });
        }
      } catch (error) {
        console.warn('Failed to create fuel chart:', error);
      }
      
      try {
        // 2. График по способам оплаты (Pie Chart)
        if (paymentStats.length > 0) {
          paymentChartData = await createChartCanvas('pie', {
            labels: paymentStats.map(stat => stat.name),
            datasets: [{
              data: paymentStats.map(stat => stat.revenue),
              backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          }, {
            plugins: {
              title: { display: true, text: 'РАСПРЕДЕЛЕНИЕ ПО СПОСОБАМ ОПЛАТЫ', color: '#ffffff', font: { size: 14, weight: 'bold' } },
              legend: { position: 'bottom' }
            }
          });
        }
      } catch (error) {
        console.warn('Failed to create payment chart:', error);
      }
      
      // === ПРОСТЫЕ ТЕКСТОВЫЕ ГРАФИКИ ===
      // Левый блок - Топ-3 по видам топлива
      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(15, yPosition - 5, 125, 80, 5, 5, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('TOP FUEL TYPES BY REVENUE', 20, yPosition + 10);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let fuelY = yPosition + 20;
      fuelStats.slice(0, 3).forEach((stat, index) => {
        const colors = [[59, 130, 246], [16, 185, 129], [245, 158, 11]];
        pdf.setFillColor(...colors[index]);
        pdf.rect(22, fuelY, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.text(`${stat.fuel}: ${stat.revenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} RUB`, 28, fuelY + 2);
        fuelY += 12;
      });
      
      // Правый блок - Способы оплаты
      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(150, yPosition - 5, 125, 80, 5, 5, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('PAYMENT METHODS', 155, yPosition + 10);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      let paymentY = yPosition + 20;
      paymentStats.slice(0, 3).forEach((stat, index) => {
        const colors = [[16, 185, 129], [59, 130, 246], [245, 158, 11]];
        pdf.setFillColor(...colors[index]);
        pdf.rect(157, paymentY, 3, 3, 'F');
        pdf.setTextColor(255, 255, 255);
        const percentage = totalRevenue > 0 ? (stat.revenue / totalRevenue * 100).toFixed(1) : '0';
        pdf.text(`${stat.name}: ${percentage}%`, 163, paymentY + 2);
        paymentY += 12;
      });
      
      yPosition += 85;
      
      // === ДЕТАЛЬНАЯ ТАБЛИЦА KPI ===
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('DETALNAYA STATISTIKA PO VIDAM TOPLIVA', 20, yPosition);
      yPosition += 10;
      
      // Заголовки таблицы
      pdf.setFillColor(71, 85, 105); // slate-600
      pdf.rect(20, yPosition, 250, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      
      pdf.text('VID TOPLIVA', 25, yPosition + 6);
      pdf.text('OPERATSIY', 80, yPosition + 6);
      pdf.text('OBEM (L)', 120, yPosition + 6);
      pdf.text('VYRUCHKA (RUB)', 160, yPosition + 6);
      pdf.text('DOLYA (%)', 220, yPosition + 6);
      
      yPosition += 10;
      
      // Строки таблицы
      fuelStats.forEach((stat, index) => {
        const bgColor = index % 2 === 0 ? [248, 250, 252] : [241, 245, 249]; // alternating rows
        pdf.setFillColor(...bgColor);
        pdf.rect(20, yPosition, 250, 6, 'F');
        
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        const share = totalRevenue > 0 ? (stat.revenue / totalRevenue * 100).toFixed(1) : 0;
        
        pdf.text(stat.fuel, 25, yPosition + 4);
        pdf.text(stat.operations.toString(), 85, yPosition + 4);
        pdf.text(stat.volume.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), 125, yPosition + 4);
        pdf.text(stat.revenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), 165, yPosition + 4);
        pdf.text(`${share}%`, 225, yPosition + 4);
        
        yPosition += 6;
      });
      
      // === ФУТЕР ===
      const pageHeight = pdf.internal.pageSize.height;
      pdf.setFillColor(30, 41, 59);
      pdf.rect(0, pageHeight - 15, pdf.internal.pageSize.width, 15, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text('Generated by TradeControl v2.0', 20, pageHeight - 5);
      pdf.text('Page 1', pdf.internal.pageSize.width - 30, pageHeight - 5);
      
      // Сохраняем PDF
      const fileName = `operations_dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      console.log(`✅ Экспорт дашборда в PDF завершен: ${fileName}`);
    } catch (error) {
      console.error('❌ Ошибка экспорта дашборда в PDF:', error);
      alert('Ошибка при экспорте дашборда в PDF');
    }
  };

  // Функция загрузки из STS API
  const loadFromStsApi = async () => {
    if (!stsApiService.isConfigured()) {
      console.log('❌ STS API не настроен');
      alert('STS API не настроен. Перейдите в Настройки → API СТС');
      return;
    }

    if (!selectedNetwork?.external_id) {
      console.log('❌ Не выбрана сеть или отсутствует external_id');
      alert('Выберите сеть с настроенным external_id для загрузки из STS API');
      return;
    }

    if (!selectedTradingPoint || selectedTradingPoint === 'all') {
      console.log('❌ Не выбрана конкретная торговая точка');
      alert('Для загрузки транзакций из STS API выберите конкретную торговую точку (не "Все точки")');
      return;
    }

    setLoadingFromSTS(true);
    try {
      console.log('🔄 Начинаем обновление данных из STS API...');
      
      // ОЧИСТКА КЭША И ПРЕДЫДУЩИХ ДАННЫХ
      console.log('🧹 Очищаем кэш и предыдущие данные...');
      
      // Очищаем localStorage кэш
      localStorage.removeItem('tradeframe_operations');
      localStorage.removeItem('operations');
      localStorage.removeItem('stsApiCache');
      
      // Очищаем текущие операции из состояния
      setOperations([]);
      
      // Принудительно очищаем кэш в сервисах
      await operationsService.forceReload();
      
      console.log('✅ Кэш очищен, предыдущие данные удалены');
      
      console.log('🔄 Загружаем новые транзакции из STS API...');
      console.log(`🔍 Параметры: network=${selectedNetwork.external_id}, tradingPointId=${selectedTradingPoint}`);
      
      // Получаем объект торговой точки для получения external_id
      const tradingPoint = await tradingPointsService.getById(selectedTradingPoint);
      if (!tradingPoint) {
        throw new Error(`Торговая точка с ID ${selectedTradingPoint} не найдена`);
      }

      console.log(`🔍 Загружена торговая точка:`, tradingPoint);
      console.log(`🔍 external_id торговой точки:`, tradingPoint.external_id, `(тип: ${typeof tradingPoint.external_id})`);

      if (tradingPoint.external_id === null || tradingPoint.external_id === undefined || tradingPoint.external_id === '') {
        throw new Error(`У торговой точки "${tradingPoint.name}" отсутствует external_id. Настройте его в разделе администрирования.`);
      }

      console.log(`🔍 Используем external_id торговой точки: ${tradingPoint.external_id}`);
      
      // Обеспечиваем правильную настройку STS API
      ensureSTSApiConfigured();
      
      const transactions = await stsApiService.getTransactions(
        dateFrom,
        dateTo,
        100,
        {
          networkId: selectedNetwork.external_id,
          tradingPointId: tradingPoint.external_id
        }
      );
      
      console.log(`✅ Получено ${transactions.length} транзакций из STS API`);
      console.log('🔍 Первые 3 транзакции:', transactions.slice(0, 3));
      
      // Детальный анализ первой транзакции для отладки маппинга
      if (transactions.length > 0) {
        const firstTx = transactions[0];
        console.log('🔍 Детальный анализ первой транзакции:');
        console.log('- ID:', firstTx.id, 'transactionId:', firstTx.transactionId);
        console.log('- Топливо:', firstTx.fuelType);
        console.log('- Оплата:', firstTx.paymentMethod);
        console.log('- Исходные данные API:', firstTx.apiData);
        console.log('- Все поля исходного объекта API:', Object.keys(firstTx.apiData || {}));
        console.log('- Полная структура JSON:', JSON.stringify(firstTx.apiData, null, 2));
        console.log('- Объем:', firstTx.volume, 'Цена:', firstTx.price, 'Сумма:', firstTx.total);
        console.log('- Статус:', firstTx.status);
        console.log('- ТРК:', firstTx.pumpId, firstTx.pumpName);
      }
      
      // Сортируем транзакции по дате (свежие сверху)
      const sortedTransactions = transactions.sort((a, b) => {
        const dateA = new Date(a.startTime || a.date).getTime();
        const dateB = new Date(b.startTime || b.date).getTime();
        return dateB - dateA; // Убывающий порядок (свежие сверху)
      });

      // Преобразуем STS транзакции в формат операций таблицы
      const stsTransactionsWithSource = sortedTransactions.map(tx => ({
        // Основные поля операции  
        id: tx.transactionId || tx.id?.toString() || `STS-${tx.id}`,
        status: tx.status || 'completed', 
        toNumber: tx.pumpId?.toString() || tx.pumpName || '-', // Номер ТО (ТРК)
        startTime: tx.startTime || tx.date,
        endTime: tx.endTime,
        
        // Топливо и количество
        fuelType: tx.fuelType || tx.apiData?.product_name || tx.apiData?.fuel_type || '-',
        actualQuantity: tx.volume || 0, // Фактический отпуск в литрах
        quantity: tx.volume || 0,
        price: tx.price || 0, // Цена за литр
        actualAmount: tx.total || (tx.volume * tx.price) || 0, // Фактический отпуск в рублях
        totalCost: tx.total || (tx.volume * tx.price) || 0,
        
        // Оплата и POS  
        paymentMethod: tx.paymentMethod || tx.apiData?.payment_method || tx.apiData?.payment_type || '-',
        posNumber: tx.apiData?.pos?.toString() || tx.pumpId?.toString() || '-', // Номер POS из API
        cardNumber: tx.cardNumber || '-',
        
        // Заказанное количество (для STS может быть равно фактическому)
        orderedQuantity: tx.volume || 0,
        orderedAmount: tx.total || (tx.volume * tx.price) || 0,
        
        // Дополнительные поля
        shiftNumber: tx.apiData?.shift?.toString() || '-', // Смена из исходных данных API
        receiptNumber: tx.receiptNumber,
        operatorName: tx.operatorName,
        duration: tx.duration,
        
        // Метки для различения источника
        source: 'STS_API',
        isFromStsApi: true,
        
        // Сохраняем исходные данные STS для отладки
        stsData: tx
      }));
      
      // Заменяем операции новыми данными из STS API
      setOperations(stsTransactionsWithSource);
      
      console.log(`✅ Загружено ${transactions.length} новых транзакций из STS API (заменили предыдущие данные)`);
    } catch (error) {
      console.error('❌ Ошибка загрузки из STS API:', error);
      alert(`Ошибка STS API: ${error.message}`);
    } finally {
      setLoadingFromSTS(false);
    }
  };

  const loadData = async () => {
    console.log('🔄 loadData() начинает выполнение...');
    setLoading(true);
    try {
      console.log('🧹 Очищаем localStorage...');
      localStorage.removeItem('tradeframe_operations');
      localStorage.removeItem('operations');
      
      console.log('🔄 Вызываем operationsService.forceReload()...');
      await operationsService.forceReload();
      
      console.log('🔄 Вызываем operationsService.getAll()...');
      const data = await operationsService.getAll();
      
      console.log('✅ Получены данные:', {
        dataType: typeof data,
        isArray: Array.isArray(data),
        length: data?.length || 'undefined',
        firstItem: data?.[0] || 'none'
      });
      
      console.log('🔄 Устанавливаем operations в состояние...');
      setOperations(data);
      
      console.log('✅ loadData() завершён успешно');
    } catch (error) {
      console.error('❌ Ошибка в loadData():', error);
      console.error('Стек ошибки:', error.stack);
    } finally {
      console.log('🔄 Устанавливаем loading = false');
      setLoading(false);
    }
  };

  // Функция для настройки STS API с правильными параметрами
  const ensureSTSApiConfigured = () => {
    console.log('🔧 Проверяем и настраиваем STS API конфигурацию...');
    
    const correctConfig = {
      url: 'https://pos.autooplata.ru/tms',
      username: 'UserApi',
      password: 'lHQfLZHzB3tn',
      enabled: true,
      timeout: 30000,
      retryAttempts: 3,
      refreshInterval: 20 * 60 * 1000 // 20 минут
    };
    
    // Проверяем текущую конфигурацию
    const currentConfig = localStorage.getItem('sts-api-config');
    let needsUpdate = false;
    
    if (currentConfig) {
      try {
        const parsed = JSON.parse(currentConfig);
        // Проверяем, что все нужные параметры совпадают
        if (parsed.url !== correctConfig.url || 
            parsed.username !== correctConfig.username || 
            parsed.password !== correctConfig.password ||
            !parsed.enabled) {
          needsUpdate = true;
        }
      } catch {
        needsUpdate = true;
      }
    } else {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      console.log('🔧 Обновляем конфигурацию STS API с правильными параметрами');
      localStorage.setItem('sts-api-config', JSON.stringify(correctConfig));
    }
    
    return correctConfig;
  };

  // Автоматическая загрузка данных при монтировании компонента
  useEffect(() => {
    console.log('🔧 Инициализация раздела операций...');
    
    // Обеспечиваем правильную настройку STS API
    ensureSTSApiConfigured();
    setStsApiConfigured(true);
    
    // Автоматически загружаем данные операций при выборе торговой точки
    if (selectedTradingPoint && selectedTradingPoint !== 'all') {
      console.log('🚀 Автоматическая загрузка операций...');
      loadFromStsApi();
    }
  }, [selectedTradingPoint]);


  // Фильтрация операций
  const filteredOperations = useMemo(() => {
    const filtered = operations.filter(record => {
      // Исключаем нежелательные способы оплаты
      const excludedPaymentMethods = ['supplier_delivery', 'corporate_card', 'mobile_payment'];
      if (record.paymentMethod && excludedPaymentMethods.includes(record.paymentMethod)) {
        return false;
      }
      
      // Фильтр по виду топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;
      
      // Фильтр по виду оплаты
      if (selectedPaymentMethod !== "Все" && record.paymentMethod !== selectedPaymentMethod) return false;
      
      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;
      
      // Фильтр по датам
      if (dateFrom || dateTo) {
        const recordDate = new Date(record.startTime);
        const recordDateStr = recordDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        if (dateFrom && recordDateStr < dateFrom) {
          return false;
        }
        
        if (dateTo && recordDateStr > dateTo) {
          return false;
        }
      }
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.id.toLowerCase().includes(query) ||
          record.details.toLowerCase().includes(query) ||
          (record.tradingPointName && record.tradingPointName.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
    
    // Сортировка по дате (свежие сверху)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return dateB - dateA; // Убывающий порядок (свежие сверху)
    });
  }, [operations, selectedFuelType, selectedPaymentMethod, selectedStatus, dateFrom, dateTo, searchQuery]);

  // Списки для селекторов
  const fuelTypes = useMemo(() => {
    const types = new Set(operations.map(op => op.fuelType).filter(Boolean));
    return ["Все", ...Array.from(types).sort()];
  }, [operations]);

  const paymentMethods = useMemo(() => {
    const allowedMethods = ['cash', 'bank_card', 'fuel_card', 'online_order'];
    const methods = new Set(operations.filter(op => op.paymentMethod && allowedMethods.includes(op.paymentMethod)).map(op => op.paymentMethod));
    return ["Все", ...allowedMethods.filter(method => methods.has(method))];
  }, [operations]);

  const statusTypes = useMemo(() => {
    const statuses = new Set(operations.map(op => op.status).filter(Boolean));
    return ["Все", ...Array.from(statuses).sort()];
  }, [operations]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-slate-600 text-slate-200">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-slate-600 text-slate-200">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-600 text-slate-200">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Фильтры */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200 flex items-center justify-between">
              <span>Операции и транзакции</span>
              <div className="flex gap-2">
                <HelpButton route="/network/operations-transactions" variant="text" className="flex-shrink-0" />
                {/* STS API кнопка */}
                {stsApiConfigured ? (
                  <Button
                    onClick={loadFromStsApi}
                    disabled={loadingFromSTS}
                    size="sm"
                    className="text-xs bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loadingFromSTS ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Обновление...
                      </>
                    ) : (
                      <>
                        <Download className="w-3 h-3 mr-1" />
                        Обновить
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      alert('STS API не настроен. Перейдите в Настройки → API СТС');
                    }}
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-600 text-red-400 hover:bg-red-700/20"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Настроить STS API
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-shrink-0">
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-green-500" />
                      <span>Экспорт в Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span>Дашборд PDF</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-4">
              <div>
                <Label htmlFor="status" className="text-slate-300">Статус</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {statusTypes.map((status) => (
                      <SelectItem key={status} value={status} className="text-slate-200 focus:bg-slate-700">
                        {status === "Все" ? status : ({
                          'completed': 'Завершено',
                          'in_progress': 'Выполняется',
                          'failed': 'Ошибка',
                          'pending': 'Ожидание',
                          'cancelled': 'Отменено'
                        }[status] || status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="fuel-type" className="text-slate-300">Вид топлива</Label>
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите вид топлива" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type} className="text-slate-200 focus:bg-slate-700">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="payment-method" className="text-slate-300">Вид оплаты</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectValue placeholder="Выберите вид оплаты" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method} className="text-slate-200 focus:bg-slate-700">
                        {method === "Все" ? method : ({
                          'cash': 'Наличные',
                          'bank_card': 'Банковские карты', 
                          'fuel_card': 'Топливные карты',
                          'online_order': 'Онлайн заказы'
                        }[method] || method)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-from" className="text-slate-300 text-sm font-medium">Дата с</Label>
                <div className="relative">
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-200 hover:text-blue-400 transition-colors pointer-events-none" 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="date-to" className="text-slate-300 text-sm font-medium">Дата по</Label>
                <div className="relative">
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <Calendar 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-200 hover:text-blue-400 transition-colors pointer-events-none" 
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="search" className="text-slate-300">Поиск</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Поиск по операции, устройству, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="text-slate-300">
              <p>Операций загружено: {operations.length} | Отфильтровано: {filteredOperations.length}</p>
              {console.log('🔍 Render debug:', {
                operationsLength: operations.length,
                filteredLength: filteredOperations.length,
                loading,
                operationsType: typeof operations,
                isOperationsArray: Array.isArray(operations)
              })}
            </div>
          </CardContent>
        </Card>

        {/* KPI по видам топлива */}
        {operations.length > 0 && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Суммы по видам топлива</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...new Set(filteredOperations.map(op => op.fuelType).filter(Boolean))].map(fuel => {
                  const fuelOps = filteredOperations.filter(op => op.fuelType === fuel && op.status === 'completed');
                  const volume = fuelOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const revenue = fuelOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  return (
                    <Card key={fuel} className="bg-slate-800 border-slate-700">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg font-bold text-white">{fuel}</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-white mb-2">{revenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽</div>
                        <p className="text-lg font-semibold text-slate-300 mb-1">{fuelOps.length.toLocaleString('ru-RU')} операций</p>
                        <p className="text-lg font-medium text-slate-300">{volume.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} л</p>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Итоговая карточка */}
                {(() => {
                  const totalOps = filteredOperations.filter(op => op.status === 'completed');
                  const totalVolume = totalOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const totalRevenue = totalOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  return (
                    <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-600 ring-2 ring-blue-500/30">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold text-white">ИТОГО</CardTitle>
                        <Activity className="h-5 w-5 text-blue-300" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-white mb-2">{totalRevenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽</div>
                        <p className="text-xl font-semibold text-blue-200 mb-1">{totalOps.length.toLocaleString('ru-RU')} операций</p>
                        <p className="text-xl font-bold text-blue-200">{totalVolume.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} л</p>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI по видам оплаты */}
        {operations.length > 0 && (
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-200">Суммы по видам оплаты</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {['cash', 'bank_card', 'fuel_card', 'online_order'].map(paymentMethod => {
                  const paymentOps = filteredOperations.filter(op => op.paymentMethod === paymentMethod && op.status === 'completed');
                  const revenue = paymentOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  if (paymentOps.length === 0) return null;
                  
                  const displayName = {
                    'cash': 'Наличные',
                    'bank_card': 'Банковские карты',
                    'fuel_card': 'Топливные карты',
                    'online_order': 'Онлайн заказы'
                  }[paymentMethod];
                  
                  return (
                    <Card key={paymentMethod} className="bg-slate-800 border-slate-700">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">{displayName}</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-white">{revenue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽</div>
                        <p className="text-xs text-blue-400">{paymentOps.length.toLocaleString('ru-RU')} операций</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Таблица операций */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-200">Текущие операции</CardTitle>
            <p className="text-slate-400">{filteredOperations.length} операций</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-300 min-w-[100px]">Статус</TableHead>
                    <TableHead className="text-slate-300 min-w-[150px]">ID</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Номер ТО</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Время начала</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Время окончания</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Вид топлива</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Фактич. отпуск (литры)</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Цена за л</TableHead>
                    <TableHead className="text-slate-300 min-w-[140px]">Фактич. отпуск (сумма)</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Вид оплаты</TableHead>
                    <TableHead className="text-slate-300 min-w-[100px]">Номер POS</TableHead>
                    <TableHead className="text-slate-300 min-w-[80px]">Смена</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Номер карты</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Заказ (литры)</TableHead>
                    <TableHead className="text-slate-300 min-w-[120px]">Заказ (сумма)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperations.slice(0, 50).map((record) => (
                    <TableRow 
                      key={record.id} 
                      className={`border-slate-700 hover:bg-slate-800 ${
                        record.isFromStsApi ? 'bg-blue-950/20 border-blue-800/30' : ''
                      }`}
                    >
                      <TableCell className="min-w-[100px]">{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs min-w-[150px]">
                        {record.isFromStsApi && (
                          <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-600 mr-2 text-xs">
                            STS
                          </Badge>
                        )}
                        {record.id}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                        {record.toNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px]">
                        {new Date(record.startTime).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px]">
                        {record.endTime ? new Date(record.endTime).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px]">
                        {record.fuelType || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px] text-right">
                        {record.actualQuantity ? `${record.actualQuantity.toFixed(2)} л` : 
                         record.quantity ? `${record.quantity.toFixed(2)} л` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-right">
                        {record.price ? `${record.price.toFixed(2)} ₽` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[140px] text-right">
                        {record.actualAmount ? `${record.actualAmount.toFixed(2)} ₽` : 
                         record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px]">
                        {{
                          'cash': 'Наличные',
                          'bank_card': 'Банк. карты',
                          'fuel_card': 'Топл. карты', 
                          'online_order': 'Онлайн заказы'
                        }[record.paymentMethod] || record.paymentMethod || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[100px] text-center">
                        {record.posNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[80px] text-center">
                        {record.shiftNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] font-mono">
                        {record.cardNumber || '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] text-right">
                        {record.orderedQuantity ? `${record.orderedQuantity.toFixed(2)} л` : '-'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm min-w-[120px] text-right">
                        {record.orderedAmount ? `${record.orderedAmount.toFixed(2)} ₽` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredOperations.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Нет операций по выбранным фильтрам
                </div>
              )}
              
              {filteredOperations.length > 50 && (
                <div className="text-center py-4 text-slate-400">
                  Показаны первые 50 из {filteredOperations.length} операций
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}