import React, { useState, useMemo, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSelection } from "@/context/SelectionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Activity, AlertTriangle, Loader2, FileText, FileSpreadsheet, Calendar, Fuel, CreditCard, Pin, HelpCircle, RefreshCw } from "lucide-react";
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
  const isMobile = useIsMobile();
  
  
  // Определяем режим отображения на основе размера экрана
  const isMobileForced = isMobile;
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 20 : 50;
  const [totalPages, setTotalPages] = useState(0);
  
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

  // KPI карточки фильтры
  const [selectedKpiFuels, setSelectedKpiFuels] = useState(new Set());
  const [selectedKpiPayments, setSelectedKpiPayments] = useState(new Set());

  // Модальное окно деталей операции
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Pull-to-refresh состояния
  const [pullState, setPullState] = useState('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startTouchRef = useRef(null);
  const rafId = useRef(null);
  const scrollContainerRef = useRef(null);

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
      
      // Показываем уведомление об успешном экспорте для всех устройств
      const notification = document.createElement('div');
      notification.className = `fixed ${isMobile ? 'top-16 left-4 right-4' : 'top-4 right-4'} bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50`;
      notification.textContent = `Excel файл создан: ${exportData.length} записей`;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    } catch (error) {
      console.error('❌ Ошибка экспорта в Excel:', error);
      
      // Показываем ошибку для всех устройств
      const errorNotification = document.createElement('div');
      errorNotification.className = `fixed ${isMobile ? 'top-16 left-4 right-4' : 'top-4 right-4'} bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50`;
      errorNotification.textContent = 'Ошибка при создании Excel файла';
      document.body.appendChild(errorNotification);
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 3000);
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
      
      // Показываем уведомление об успешном экспорте для всех устройств
      const notification = document.createElement('div');
      notification.className = `fixed ${isMobile ? 'top-16 left-4 right-4' : 'top-4 right-4'} bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50`;
      notification.textContent = `PDF дашборд создан: ${filteredOperations.length} операций`;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    } catch (error) {
      console.error('❌ Ошибка экспорта дашборда в PDF:', error);
      
      // Показываем ошибку для всех устройств
      const errorNotification = document.createElement('div');
      errorNotification.className = `fixed ${isMobile ? 'top-16 left-4 right-4' : 'top-4 right-4'} bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50`;
      errorNotification.textContent = 'Ошибка при создании PDF дашборда';
      document.body.appendChild(errorNotification);
      setTimeout(() => {
        if (document.body.contains(errorNotification)) {
          document.body.removeChild(errorNotification);
        }
      }, 3000);
    }
  };

  // Функция загрузки из STS API
  const loadFromStsApi = async () => {
    if (!stsApiService.isConfigured()) {
      console.log('❌ STS API не настроен');
      if (!isMobile) alert('STS API не настроен. Перейдите в Настройки → API СТС');
      return;
    }

    if (!selectedNetwork?.external_id) {
      console.log('❌ Не выбрана сеть или отсутствует external_id');
      if (!isMobile) alert('Выберите сеть с настроенным external_id для загрузки из STS API');
      return;
    }

    if (!selectedTradingPoint || selectedTradingPoint === 'all') {
      console.log('❌ Не выбрана конкретная торговая точка');
      if (!isMobile) alert('Для загрузки транзакций из STS API выберите конкретную торговую точку (не "Все точки")');
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
      if (!isMobile) alert(`Ошибка STS API: ${error.message}`);
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
    console.log('🔍 Проверяем условия автозагрузки:', {
      selectedNetwork: selectedNetwork?.name,
      selectedNetworkId: selectedNetwork?.id,
      externalId: selectedNetwork?.external_id,
      selectedTradingPoint,
      hasNetwork: !!selectedNetwork,
      hasTradingPoint: !!(selectedTradingPoint && selectedTradingPoint !== 'all')
    });
    
    if (selectedTradingPoint && selectedTradingPoint !== 'all' && selectedNetwork?.external_id) {
      console.log('🚀 Автоматическая загрузка операций...');
      loadFromStsApi();
    } else {
      console.log('⏳ Ожидаем полную загрузку селекторов для автозагрузки');
    }
  }, [selectedTradingPoint, selectedNetwork]);


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
        // Используем локальную дату вместо UTC для корректной фильтрации
        const recordDateStr = recordDate.getFullYear() + '-' + 
          String(recordDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(recordDate.getDate()).padStart(2, '0');
        
        if (dateFrom && recordDateStr < dateFrom) {
          return false;
        }
        
        if (dateTo && recordDateStr > dateTo) {
          return false;
        }
      }
      
      // KPI фильтры по топливу
      if (selectedKpiFuels.size > 0 && !selectedKpiFuels.has(record.fuelType)) {
        return false;
      }
      
      // KPI фильтры по способу оплаты
      if (selectedKpiPayments.size > 0 && !selectedKpiPayments.has(record.paymentMethod)) {
        return false;
      }
      
      // Поиск
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          record.id.toLowerCase().includes(query) ||
          (record.details && record.details.toLowerCase().includes(query)) ||
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
  }, [operations, selectedFuelType, selectedPaymentMethod, selectedStatus, dateFrom, dateTo, searchQuery, selectedKpiFuels, selectedKpiPayments]);
  
  // Пагинация операций
  const paginatedOperations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);
    setTotalPages(totalPages);
    return filteredOperations.slice(startIndex, endIndex);
  }, [filteredOperations, currentPage, itemsPerPage]);

  // Pull-to-refresh константы и функции
  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;
  const INDICATOR_APPEAR_THRESHOLD = 30;

  // Pull-to-refresh функционал
  const handleRefreshData = async () => {
    if (selectedNetwork && selectedTradingPoint) {
      console.log('🔄 Pull-to-refresh: обновляем данные операций...');
      await loadOperations();
    }
  };

  // Функция для вибрации на поддерживаемых устройствах
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator && isMobileForced) {
      navigator.vibrate(50);
    }
  };

  // Плавное обновление расстояния с throttling через RAF
  const updatePullDistance = (distance) => {
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

  const handleTouchStart = (e) => {
    if (!isMobileForced || pullState === 'refreshing') return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    startTouchRef.current = {
      y: e.touches[0].clientY,
      time: Date.now()
    };
    setPullState('pulling');
  };

  const handleTouchMove = (e) => {
    if (!isMobileForced || !startTouchRef.current || pullState === 'refreshing') return;

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
    if (!isMobileForced || !startTouchRef.current) return;

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

  // Cleanup RAF при размонтировании компонента
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Функции управления KPI фильтрами
  const handleKpiFuelClick = (fuel) => {
    const newSelected = new Set(selectedKpiFuels);
    if (newSelected.has(fuel)) {
      newSelected.delete(fuel);
    } else {
      newSelected.add(fuel);
    }
    setSelectedKpiFuels(newSelected);
  };

  const handleKpiPaymentClick = (payment) => {
    const newSelected = new Set(selectedKpiPayments);
    if (newSelected.has(payment)) {
      newSelected.delete(payment);
    } else {
      newSelected.add(payment);
    }
    setSelectedKpiPayments(newSelected);
  };

  const handleKpiResetAll = () => {
    setSelectedKpiFuels(new Set());
    setSelectedKpiPayments(new Set());
  };

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFuelType, selectedPaymentMethod, selectedStatus, dateFrom, dateTo, searchQuery, selectedKpiFuels, selectedKpiPayments]);

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

  const getCompactStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-slate-600 text-slate-200 text-xs px-1 py-0">ОК</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600 text-white text-xs px-1 py-0">В работе</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white text-xs px-1 py-0">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white text-xs px-1 py-0">Ожидает</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-600 text-slate-200 text-xs px-1 py-0">Отмена</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs px-1 py-0">{status}</Badge>;
    }
  };

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-hidden ${isMobileForced ? 'pt-4' : ''} min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isMobileForced && pullState !== 'idle' ? `translateY(${pullDistance * 0.5}px)` : 'translateY(0)',
          transition: pullState === 'idle' ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {/* Стандартный мобильный pull-to-refresh индикатор */}
        {isMobileForced && pullState !== 'idle' && pullDistance >= INDICATOR_APPEAR_THRESHOLD && (
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
        <Card className="bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-600/50 rounded-xl shadow-2xl backdrop-blur-sm overflow-hidden">
          <CardHeader className={`${isMobileForced ? 'px-4 py-4' : 'px-8 py-6'} bg-gradient-to-r from-slate-800/90 via-slate-750/90 to-slate-800/90 border-b border-slate-600/30`}>
            <CardTitle className="text-slate-100 flex items-center justify-between min-w-0">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-1.5 h-10 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-lg flex-shrink-0"></div>
                <span className={`${isMobileForced ? 'text-xl font-bold' : 'text-3xl font-bold'} text-white leading-tight truncate`}>Операции</span>
              </div>

              <div className={`flex ${isMobileForced ? 'gap-1' : 'gap-2'} items-center flex-shrink-0`}>
                <Button
                  onClick={() => window.open('/help/operations-transactions', '_blank')}
                  variant="outline"
                  size="sm"
                  className={`border-slate-500/60 text-slate-300 hover:text-white hover:bg-slate-600/80 hover:border-slate-400 transition-all duration-200 rounded-lg bg-slate-700/30 ${isMobileForced ? 'px-2 py-1.5 text-xs' : 'px-3 py-2'}`}
                >
                  <HelpCircle className={`${isMobileForced ? 'w-3 h-3' : 'w-4 h-4'} ${isMobileForced ? '' : 'mr-2'}`} />
                  {!isMobileForced && 'Инструкция'}
                </Button>
                
                {/* Кнопка экспорта */}
                {filteredOperations.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 rounded-lg font-medium ${isMobileForced ? 'px-3 py-1.5 text-xs' : 'px-3 py-2'}`}
                        size="sm"
                      >
                        <Download className={`${isMobileForced ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                        Экспорт
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-slate-800 border-slate-600 shadow-xl rounded-lg">
                      <DropdownMenuItem onClick={exportToExcel} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                        <FileSpreadsheet className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">Экспорт в Excel</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                        <FileText className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium">Дашборд PDF</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* STS API кнопка - скрыта */}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Компактные фильтры */}
        <Card className="bg-slate-800 border-slate-600 mb-4">
          <CardContent className={`${isMobileForced ? 'p-4' : 'p-6'}`}>
            <div className={`flex items-center gap-3 ${isMobileForced ? 'mb-3' : 'mb-4'}`}>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white text-sm">⚙️</span>
              </div>
              <h2 className={`${isMobileForced ? 'text-lg' : 'text-xl'} font-semibold text-white`}>Фильтры</h2>
            </div>

            {/* Верхняя строка - Статус и Поиск */}
            <div className={`${isMobileForced ? 'space-y-3 mb-4' : 'grid grid-cols-2 gap-6 mb-4'}`}>
              {/* Статус */}
              <div className={`${isMobileForced ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobileForced ? (
                  <>
                    <Label htmlFor="status" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">Статус:</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-sm flex-1 min-w-0">
                        <SelectValue placeholder="Все" />
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
                  </>
                ) : (
                  <>
                    <Label htmlFor="status" className="text-slate-300 text-sm font-medium mb-2 block">Статус операций</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base">
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
                  </>
                )}
              </div>

              {/* Поиск */}
              <div className={`${isMobileForced ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobileForced ? (
                  <>
                    <Label htmlFor="search" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">Поиск:</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="ID, устройство..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="search" className="text-slate-300 text-sm font-medium mb-2 block">Поиск по операциям</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Поиск по ID операции, устройству, номеру ТО..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-400 h-10 text-base"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Нижняя строка - Даты */}
            <div className={`${isMobileForced ? 'space-y-3' : 'grid grid-cols-2 gap-6'}`}>
              {/* Дата начала */}
              <div className={`${isMobileForced ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobileForced ? (
                  <>
                    <Label htmlFor="dateFrom" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">С:</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateFrom" className="text-slate-300 text-sm font-medium mb-2 block">Дата начала</Label>
                    <div className="relative">
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Дата окончания */}
              <div className={`${isMobileForced ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobileForced ? (
                  <>
                    <Label htmlFor="dateTo" className="text-slate-300 text-xs font-medium w-14 flex-shrink-0">По:</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-slate-200 h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateTo" className="text-slate-300 text-sm font-medium mb-2 block">Дата окончания</Label>
                    <div className="relative">
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-slate-200 h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-blue-400 transition-colors pointer-events-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Заголовок фильтров */}
        {operations.length > 0 && (
          <div className="mb-4">
            <div className="space-y-1">
              {!isMobileForced && (
                <h3 className="text-xl font-semibold text-white">Фильтр</h3>
              )}
              <p className="text-xs text-slate-500">выберите один или несколько элементов</p>
            </div>
          </div>
        )}

        {/* KPI карточки */}
        {operations.length > 0 && (
          <div className="space-y-4">
            {/* Карточки по видам топлива */}
            <div className="space-y-2">
              {isMobileForced && (
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-slate-300 text-sm font-medium">Виды топлива</h3>
                  <span className="text-xs">
                    {(() => {
                      const selectedFuels = Array.from(selectedKpiFuels);
                      const selectedPayments = Array.from(selectedKpiPayments).map(method => ({
                        'cash': 'Наличные',
                        'bank_card': 'Банковская карта',
                        'fuel_card': 'Топливная карта',
                        'online_order': 'Онлайн заказ'
                      }[method] || method));

                      const allSelected = [...selectedFuels, ...selectedPayments];

                      if (allSelected.length === 0) {
                        return <span className="text-slate-400">не выбрано</span>;
                      } else {
                        return (
                          <span>
                            <span className="text-slate-400">выбрано: </span>
                            <span className="text-blue-400 font-bold">{allSelected.join(', ')}</span>
                          </span>
                        );
                      }
                    })()}
                  </span>
                </div>
              )}
              <div className={`grid gap-4 ${isMobileForced ? 'grid-cols-3 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {[...new Set(operations.map(op => op.fuelType).filter(Boolean))].map(fuel => {
                  // Всегда показываем все карточки - данные берем из полного набора операций
                  const allFuelOps = operations.filter(op => op.fuelType === fuel && op.status === 'completed');
                  const allVolume = allFuelOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const allRevenue = allFuelOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  
                  // Проверяем есть ли данные в отфильтрованном наборе для этого топлива
                  const filteredFuelOps = filteredOperations.filter(op => op.fuelType === fuel && op.status === 'completed');
                  const hasFilteredData = filteredFuelOps.length > 0;
                  
                  const isSelected = selectedKpiFuels.has(fuel);
                  
                  // Определяем стиль карточки
                  let cardStyle = '';
                  if (isSelected) {
                    cardStyle = 'bg-slate-700 border-slate-500 border-2';
                  } else {
                    cardStyle = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                  }
                  
                  return (
                    <Card 
                      key={fuel} 
                      className={`${cardStyle} cursor-pointer transition-all duration-200`}
                      onClick={() => handleKpiFuelClick(fuel)}
                    >
                      <CardContent className={`${isMobileForced ? 'p-3' : 'p-6'}`}>
                        {isMobileForced ? (
                          <div className="relative">
                            <div className="mb-1">
                              <p className="text-white font-semibold text-xs truncate">{fuel}</p>
                            </div>
                            <p className="font-bold text-white text-sm mb-1">
                              {Math.round(allRevenue).toLocaleString('ru-RU')} ₽
                            </p>
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div>{Math.round(allVolume).toLocaleString('ru-RU')} л</div>
                              <div>{allFuelOps.length} оп.</div>
                            </div>
                            {isSelected && (
                              <Pin className="w-4 h-4 text-yellow-400 absolute bottom-0 right-0 drop-shadow-lg" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-600 rounded-lg mr-4">
                              <Fuel className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-white font-semibold mb-1 text-base">{fuel}</p>
                                {isSelected && (
                                  <Pin className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
                                )}
                              </div>
                              <p className="font-bold text-white mb-0.5 text-2xl">
                                {Math.round(allRevenue).toLocaleString('ru-RU')} ₽
                              </p>
                              <div className="space-y-0.5">
                                <p className="font-bold text-white text-xl">{Math.round(allVolume).toLocaleString('ru-RU')} л</p>
                                <p className="text-sm text-slate-400">{allFuelOps.length} операций</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Карточки по способам оплаты */}
            <div className="space-y-2">
              {isMobileForced && (
                <h3 className="text-slate-300 text-sm font-medium px-2">Способы оплаты</h3>
              )}
              <div className={`grid gap-4 ${isMobileForced ? 'grid-cols-3 gap-2' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {['cash', 'bank_card', 'fuel_card', 'online_order']
                  .map(paymentMethod => {
                    // Всегда показываем все карточки - данные берем из полного набора операций
                    const allPaymentOps = operations.filter(op => op.paymentMethod === paymentMethod && op.status === 'completed');
                    const allRevenue = allPaymentOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                    const allVolume = allPaymentOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                    
                    // Проверяем есть ли данные в отфильтрованном наборе для этого способа оплаты
                    const filteredPaymentOps = filteredOperations.filter(op => op.paymentMethod === paymentMethod && op.status === 'completed');
                    const hasFilteredData = filteredPaymentOps.length > 0;
                    
                    return { paymentMethod, allPaymentOps, allRevenue, allVolume, hasFilteredData };
                  })
                  .filter(item => item.allPaymentOps.length > 0)
                  .map(({ paymentMethod, allPaymentOps, allRevenue, allVolume, hasFilteredData }) => {
                    const displayName = {
                      'cash': 'Наличные',
                      'bank_card': 'Банковская карта',
                      'fuel_card': 'Топливная карта',
                      'online_order': 'Онлайн заказ'
                    }[paymentMethod];
                    
                    const isSelected = selectedKpiPayments.has(paymentMethod);
                    
                    // Определяем стиль карточки
                    let cardStyle = '';
                    if (isSelected) {
                      cardStyle = 'bg-slate-700 border-slate-500 border-2';
                    } else {
                      cardStyle = 'bg-slate-800 border-slate-600 hover:bg-slate-700';
                    }
                    
                    return (
                    <Card 
                      key={paymentMethod} 
                      className={`${cardStyle} cursor-pointer transition-all duration-200`}
                      onClick={() => handleKpiPaymentClick(paymentMethod)}
                    >
                      <CardContent className={`${isMobileForced ? 'p-3' : 'p-6'}`}>
                        {isMobileForced ? (
                          <div className="relative">
                            <div className="mb-1">
                              <p className="text-white font-semibold text-xs truncate">{displayName}</p>
                            </div>
                            <p className="font-bold text-white text-sm mb-1">
                              {Math.round(allRevenue).toLocaleString('ru-RU')} ₽
                            </p>
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div>{Math.round(allVolume).toLocaleString('ru-RU')} л</div>
                              <div>{allPaymentOps.length} оп.</div>
                            </div>
                            {isSelected && (
                              <Pin className="w-4 h-4 text-yellow-400 absolute bottom-0 right-0 drop-shadow-lg" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="p-2 bg-green-600 rounded-lg mr-4">
                              <CreditCard className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-white font-semibold mb-1 text-base">{displayName}</p>
                                {isSelected && (
                                  <Pin className="w-6 h-6 text-yellow-400 drop-shadow-lg" />
                                )}
                              </div>
                              <p className="font-bold text-white mb-0.5 text-2xl">
                                {Math.round(allRevenue).toLocaleString('ru-RU')} ₽
                              </p>
                              <div className="space-y-0.5">
                                <p className="font-bold text-white text-xl">{Math.round(allVolume).toLocaleString('ru-RU')} л</p>
                                <p className="text-sm text-slate-400">{allPaymentOps.length} операций</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Итоговая карточка */}
            <div className="space-y-2">
              {isMobileForced && (
                <h3 className="text-slate-300 text-sm font-medium px-2">Итого</h3>
              )}
              <div className={`grid ${isMobileForced ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {(() => {
                  const totalOps = filteredOperations.filter(op => op.status === 'completed');
                  const totalVolume = totalOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const totalRevenue = totalOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);

                  const hasActiveFilters = selectedKpiFuels.size > 0 || selectedKpiPayments.size > 0;
                  return (
                    <Card
                      className={`${
                        hasActiveFilters
                          ? 'bg-blue-700 border-blue-300 border-2 cursor-pointer hover:bg-blue-600'
                          : 'bg-slate-700 border-slate-500 border-2'
                      } transition-all duration-200`}
                      onClick={hasActiveFilters ? handleKpiResetAll : undefined}
                    >
                      <CardContent className={`${isMobileForced ? 'p-3' : 'p-6'}`}>
                        {isMobileForced ? (
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-blue-300 font-semibold text-sm">Итого</p>
                              {hasActiveFilters && (
                                <p className="text-xs text-blue-200">Сброс Фильтра</p>
                              )}
                            </div>
                            <p className="font-bold text-white text-lg mb-1">
                              {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                            </p>
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{Math.round(totalVolume).toLocaleString('ru-RU')} л</span>
                              <span>{totalOps.length} оп.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-600 rounded-lg mr-4">
                              <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-white font-semibold mb-1 text-base">Итого</p>
                              <p className="font-bold text-white mb-0.5 text-2xl">
                                {Math.round(totalRevenue).toLocaleString('ru-RU')} ₽
                              </p>
                              <div className="space-y-0.5">
                                <p className="font-bold text-white text-xl">{Math.round(totalVolume).toLocaleString('ru-RU')} л</p>
                                <p className="text-sm text-slate-400">{totalOps.length} операций</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Таблица операций */}
        <Card className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg ${isMobileForced ? 'mx-0 mt-1' : ''}`}>
          <CardHeader className={`${isMobileForced ? 'px-3 py-1.5' : 'pb-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobileForced ? 'text-base' : 'text-xl'}`}>
                  <FileText className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  Операции
                </CardTitle>
                <p className={`text-slate-400 ${isMobileForced ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                  Показано {paginatedOperations.length} из {filteredOperations.length} операций
                  {totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}
                </p>
              </div>
              
              
              {!isMobile && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    ← Предыдущая
                  </Button>
                  <span className="text-sm text-slate-400 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Следующая →
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className={`${isMobileForced ? 'px-0 pb-3' : ''}`}>
            {isMobileForced ? (
              // Mobile compact table layout
              <div>
                <div className="bg-slate-800 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-700 text-slate-300 border-b border-slate-600">
                        <th className="px-2 py-2 text-left font-medium">ID</th>
                        <th className="px-2 py-2 text-left font-medium">Топливо</th>
                        <th className="px-2 py-2 text-right font-medium">Кол-во</th>
                        <th className="px-2 py-2 text-right font-medium">Сумма</th>
                        <th className="px-2 py-2 text-center font-medium">№ ТО</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOperations.map((record, index) => (
                        <tr
                          key={record.id}
                          className={`hover:bg-slate-600 cursor-pointer transition-colors border-b border-slate-700 ${index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}`}
                          onClick={() => {
                            setSelectedOperation(record);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <span className="text-white font-mono text-xs truncate" title={record.id}>
                                {record.id.slice(-8)}
                              </span>
                              <div className="mt-0.5">
                                {getCompactStatusBadge(record.status)}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-white">
                            {record.fuelType || '-'}
                          </td>
                          <td className="px-2 py-2 text-white text-right font-mono">
                            {record.actualQuantity ? `${record.actualQuantity.toFixed(1)}л` :
                             record.quantity ? `${record.quantity.toFixed(1)}л` : '-'}
                          </td>
                          <td className="px-2 py-2 text-white text-right font-mono font-bold">
                            {record.actualAmount ? `${Math.round(record.actualAmount)}₽` :
                             record.totalCost ? `${Math.round(record.totalCost)}₽` : '-'}
                          </td>
                          <td className="px-2 py-2 text-center text-white text-xs">
                            {record.toNumber || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedOperations.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Загрузка операций...</span>
                      </div>
                    ) : (
                      'Нет операций по выбранным фильтрам'
                    )}
                  </div>
                )}

                {isMobile && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      ←
                    </Button>
                    <span className="text-sm text-slate-400 px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      →
                    </Button>
                  </div>
                )}
              </div>
            ) : (
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
                  {paginatedOperations.map((record) => (
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
              
              {paginatedOperations.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Загрузка операций...</span>
                    </div>
                  ) : (
                    'Нет операций по выбранным фильтрам'
                  )}
                </div>
              )}
              
              {!isMobile && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-6 border-t border-slate-700 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    ← Предыдущая страница
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : "border-slate-600 text-slate-300 hover:bg-slate-700"
                          }
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Следующая страница →
                  </Button>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Модальное окно с деталями операции */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-sm mx-auto bg-slate-800 border border-slate-600 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">
              Операция #{selectedOperation?.id?.slice(-8)}
            </DialogTitle>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Статус:</span>
                  <div>{getStatusBadge(selectedOperation.status)}</div>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Номер ТО:</span>
                  <span className="text-white font-mono text-sm">{selectedOperation.toNumber || '-'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Время начала:</span>
                  <span className="text-white font-mono text-xs">
                    {new Date(selectedOperation.startTime).toLocaleString('ru-RU')}
                  </span>
                </div>

                {selectedOperation.endTime && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Время окончания:</span>
                    <span className="text-white font-mono text-xs">
                      {new Date(selectedOperation.endTime).toLocaleString('ru-RU')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Вид топлива:</span>
                  <span className="text-white font-medium">{selectedOperation.fuelType || '-'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Количество:</span>
                  <span className="text-white font-mono font-bold">
                    {selectedOperation.actualQuantity ? `${selectedOperation.actualQuantity.toFixed(2)} л` :
                     selectedOperation.quantity ? `${selectedOperation.quantity.toFixed(2)} л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Цена за литр:</span>
                  <span className="text-white font-mono">
                    {selectedOperation.price ? `${selectedOperation.price.toFixed(2)} ₽/л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700 bg-slate-750 px-2 -mx-2 rounded">
                  <span className="text-slate-300 font-medium">Общая сумма:</span>
                  <span className="text-white font-mono font-bold text-lg">
                    {selectedOperation.actualAmount ? `${selectedOperation.actualAmount.toFixed(2)} ₽` :
                     selectedOperation.totalCost ? `${selectedOperation.totalCost.toFixed(2)} ₽` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Способ оплаты:</span>
                  <span className="text-white font-medium">
                    {{
                      'cash': 'Наличные',
                      'bank_card': 'Банковская карта',
                      'fuel_card': 'Топливная карта',
                      'online_order': 'Онлайн заказ'
                    }[selectedOperation.paymentMethod] || selectedOperation.paymentMethod || '-'}
                  </span>
                </div>

                {selectedOperation.posNumber && selectedOperation.posNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер POS:</span>
                    <span className="text-white font-mono">{selectedOperation.posNumber}</span>
                  </div>
                )}

                {selectedOperation.shiftNumber && selectedOperation.shiftNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер смены:</span>
                    <span className="text-white font-mono">{selectedOperation.shiftNumber}</span>
                  </div>
                )}

                {selectedOperation.isFromStsApi && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Источник данных:</span>
                    <Badge variant="outline" className="bg-blue-900 text-blue-300 border-blue-600">
                      STS API
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between py-2 text-xs">
                  <span className="text-slate-500">ID операции:</span>
                  <span className="text-slate-400 font-mono">{selectedOperation.id}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}