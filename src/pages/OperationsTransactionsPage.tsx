import React, { useState, useMemo, useEffect } from "react";
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
import { Activity, Download, Filter, Clock, CheckCircle, XCircle, PlayCircle, PauseCircle, AlertTriangle, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { HelpButton } from "@/components/help/HelpButton";
// import { operationsService, Operation } from "@/services/operationsService"; // ОТКЛЮЧЕН - используем только Supabase сервис
import { operationsSupabaseService } from "@/services/operationsSupabaseService";
import { Operation } from "@/services/operationsTypes";
// import { nomenclatureService } from "@/services/nomenclatureService"; // ОТКЛЮЧЕН для скорости
import { supabaseConfigManager } from "@/services/supabaseConfigManager";
import { tradingTransactionsSyncService } from "@/services/tradingTransactionsSyncService";
import { telegramService } from "@/services/telegramService";
import { emailService } from "@/services/emailService";
import { ExportChannelDialog, ExportChannels } from "@/components/dialogs/ExportChannelDialog";
import { ExportFormat, ExportFormatDialog } from "@/components/dialogs/ExportFormatDialog";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Получение правильных типов операций из сервиса
const operationTypeMap = {
  'sale': 'Продажа',
  'refund': 'Возврат',
  'correction': 'Коррекция',
  'maintenance': 'Обслуживание',
  'tank_loading': 'Загрузка резервуара',
  'diagnostics': 'Диагностика',
  'sensor_calibration': 'Калибровка датчиков'
};

const statusTypes = ["Все", "completed", "in_progress", "failed", "pending", "cancelled"];
const allowedPaymentMethods = ["cash", "bank_card", "fuel_card", "online_order"];

const paymentMethodMap = {
  'bank_card': 'Банковские карты',
  'cash': 'Наличные',
  'fuel_card': 'Топливные карты',
  'online_order': 'Онлайн заказы'
};


export default function OperationsTransactionsPage() {
  const isMobile = useIsMobile();
  const { selectedNetwork, selectedTradingPoint } = useSelection();
  
  // Состояние данных операций
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  
  // Фильтры
  const [selectedStatus, setSelectedStatus] = useState("Все");
  const [selectedFuelType, setSelectedFuelType] = useState("Все");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Все");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Устанавливаем даты с 2 сентября - когда начала работать станция 4
  const [dateFrom, setDateFrom] = useState("2025-09-02");
  const [dateTo, setDateTo] = useState("2025-09-30");
  
  // ПАГИНАЦИЯ для быстрого отображения
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // Состояние диалога выбора каналов экспорта
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [showFormatDialog, setShowFormatDialog] = useState(false);
  const [pendingExportOperations, setPendingExportOperations] = useState<Operation[]>([]);
  const [pendingChannels, setPendingChannels] = useState<ExportChannels | null>(null);

  const isNetworkOnly = selectedNetwork && (!selectedTradingPoint || selectedTradingPoint === "all");
  const isTradingPointSelected = selectedNetwork && selectedTradingPoint && selectedTradingPoint !== "all";

  // Загрузка операций
  useEffect(() => {
    const loadOperations = async () => {
      setLoading(true);
      
      try {
        
        // ТОЛЬКО 100 операций для мгновенной загрузки
        const response = await fetch('https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/operations?select=id,transaction_id,status,start_time,trading_point_id,trading_point_name,fuel_type,quantity,total_cost,payment_method&order=start_time.desc&limit=100', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'
          }
        });
        
        console.log('🔍 [OPERATIONS] Response status:', response.status, response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [OPERATIONS] Supabase error:', response.status, errorText);
          throw new Error(`Supabase error: ${response.status} - ${errorText}`);
        }
        
        const rawData = await response.json();
        console.log('📊 [OPERATIONS] Raw data type:', typeof rawData, 'Length:', Array.isArray(rawData) ? rawData.length : 'not array');
        console.log('📋 [OPERATIONS] Sample data:', rawData.length > 0 ? rawData[0] : 'empty');
        
        // Проверяем что данные - это массив
        if (!Array.isArray(rawData)) {
          console.error('❌ [OPERATIONS] Expected array, got:', typeof rawData, rawData);
          throw new Error('Expected array from Supabase operations endpoint');
        }
        
        // МГНОВЕННОЕ преобразование - только обязательные поля
        const operations = rawData.map((op: any) => ({
          id: op.id,
          transactionId: op.transaction_id,
          status: op.status,
          startTime: op.start_time,
          tradingPointId: op.trading_point_id,
          tradingPointName: op.trading_point_name,
          fuelType: op.fuel_type,
          quantity: op.quantity || 0,
          totalCost: op.total_cost || 0,
          paymentMethod: op.payment_method
        }));
        
        console.log('✅ [OPERATIONS] Processed operations:', operations.length);
        setOperations(operations);
        
      } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        setOperations([]);
      } finally {
        setLoading(false);
      }
    };

    loadOperations();
  }, []); // Загружаем только один раз при монтировании

  // МГНОВЕННАЯ перезагрузка операций
  const reloadOperations = async () => {
    setLoading(true);
    
    try {
      // Только последние 500 операций без всяких фильтров
      const response = await fetch('https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/operations?select=id,transaction_id,operation_type,status,start_time,trading_point_id,trading_point_name,fuel_type,quantity,price,total_cost,payment_method&order=start_time.desc&limit=500', {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY'
        }
      });
      
      console.log('🔍 [RELOAD] Response status:', response.status, response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [RELOAD] Supabase error:', response.status, errorText);
        throw new Error(`Supabase error: ${response.status} - ${errorText}`);
      }
      
      const rawData = await response.json();
      console.log('📊 [RELOAD] Raw data type:', typeof rawData, 'Length:', Array.isArray(rawData) ? rawData.length : 'not array');
      
      // Проверяем что данные - это массив
      if (!Array.isArray(rawData)) {
        console.error('❌ [RELOAD] Expected array, got:', typeof rawData, rawData);
        throw new Error('Expected array from Supabase operations endpoint');
      }
      
      // МИНИМАЛЬНОЕ преобразование
      const operations = rawData.map((op: any) => ({
        id: op.id,
        transactionId: op.transaction_id,
        operationType: op.operation_type,
        status: op.status,
        startTime: op.start_time,
        tradingPointId: op.trading_point_id,
        tradingPointName: op.trading_point_name,
        fuelType: op.fuel_type,
        quantity: op.quantity || 0,
        price: op.price || 0,
        totalCost: op.total_cost || 0,
        paymentMethod: op.payment_method
      }));
      
      console.log('✅ [RELOAD] Processed operations:', operations.length);
      setOperations(operations);
      
    } catch (error) {
      console.error('❌ Ошибка перезагрузки:', error);
      setOperations([]);
    } finally {
      setLoading(false);
    }
  };


  // НОВАЯ ФУНКЦИЯ синхронизации транзакций с торгового API
  const syncTransactionsFromTradingAPI = async () => {
    console.log('🚀 [NEW-SYNC] Новая функция синхронизации запущена!');
    
    try {
      setSyncLoading(true);
      
      // Параметры для торгового API
      const systemId = 15; // Норд лайн система 15
      let stationNumber = 4; // По умолчанию АЗС №004
      
      // Мапинг торговой точки в номер станции
      if (selectedTradingPoint === '9baf5375-9929-4774-8366-c0609b9f2a51') {
        stationNumber = 1; // АЗС №001
      } else if (selectedTradingPoint === 'f2566905-c748-4240-ac31-47b626ab625d') {
        stationNumber = 3; // АЗС №003
      } else if (selectedTradingPoint === '6969b08d-1cbe-45c2-ae9c-8002c7022b59') {
        stationNumber = 4; // АЗС №004
      } else if (selectedTradingPoint === 'f7963207-2732-4fae-988e-c73eef7645ca') {
        stationNumber = 5; // АЗС №005
      }
      
      console.log('🏪 [NEW-SYNC] Параметры синхронизации:', {
        systemId,
        stationNumber,
        dateFrom,
        dateTo,
        selectedTradingPoint
      });
      
      // Вызываем сервис синхронизации
      const result = await tradingTransactionsSyncService.syncTransactions({
        systemId,
        stationNumber,
        startDate: dateFrom,
        endDate: dateTo
      });
      
      console.log('✅ [NEW-SYNC] Результат синхронизации:', result);
      
      if (result.success) {
        // Обновляем операции после синхронизации
        await reloadOperations();
        
        const totalFromAPI = result.totalFromAPI || 0;
        alert(`✅ Синхронизация успешна!\n` +
              `Получено с торгового API: ${totalFromAPI} транзакций\n` +
              `Сохранено в базу: ${result.syncedTransactions} транзакций\n` +
              `Пропущено дублей: ${result.skippedTransactions}`);
      } else {
        alert(`❌ Ошибки синхронизации:\n${result.errors.join('\n')}`);
      }
      
    } catch (error) {
      console.error('❌ [NEW-SYNC] Ошибка:', error);
      alert(`❌ Ошибка синхронизации: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // ПРОСТЕЙШАЯ функция очистки операций станции 4
  const clearStation4Operations = async () => {
    try {
      setClearLoading(true);
      console.log('🗑️ ПРОСТОЕ УДАЛЕНИЕ всех операций АЗС №004...');
      
      // Прямой HTTP DELETE запрос к Supabase
      const response = await fetch('https://tohtryzyffcebtyvkxwh.supabase.co/rest/v1/operations?trading_point_id=eq.6969b08d-1cbe-45c2-ae9c-8002c7022b59', {
        method: 'DELETE',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('✅ Операции АЗС №004 удалены успешно');
        alert('✅ Все операции АЗС №004 успешно удалены из базы данных!');
        
        // Обновляем список операций после очистки
        await reloadOperations();
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Ошибка очистки:', error);
      alert(`❌ Ошибка очистки: ${error.message}`);
    } finally {
      setClearLoading(false);
    }
  };

  // ВРЕМЕННО ОТКЛЮЧЕНО автообновление данных
  // useEffect(() => {
  //   if (!autoRefresh) return;
    
  //   const interval = setInterval(async () => {
  //     try {
  //       const data = await operationsService.getAll();
  //       setOperations(data);
  //     } catch (error) {
  //       console.error('Ошибка обновления операций:', error);
  //     }
  //   }, 5000);

  //   return () => clearInterval(interval);
  // }, [autoRefresh]);

  // Фильтрация данных
  // МГНОВЕННАЯ фильтрация в интерфейсе
  const filteredOperations = useMemo(() => {
    console.log('🔍 [FILTER] Operations count:', operations.length);
    console.log('🔍 [FILTER] Filters:', { selectedTradingPoint, selectedStatus, dateFrom, dateTo, searchQuery });
    
    if (operations.length === 0) {
      console.log('⚠️ [FILTER] No operations to filter');
      return operations;
    }
    
    // Быстрая фильтрация только необходимых полей
    let filtered = operations;
    
    // Фильтр по торговой точке
    if (selectedTradingPoint && selectedTradingPoint !== "all") {
      filtered = filtered.filter(op => op.tradingPointId === selectedTradingPoint);
    }
    
    // Фильтр по статусу
    if (selectedStatus !== "Все") {
      filtered = filtered.filter(op => op.status === selectedStatus);
    }
    
    // Фильтр по датам
    if (dateFrom || dateTo) {
      filtered = filtered.filter(op => {
        if (!op.startTime) return true; // Пропускаем операции без даты
        
        const operationDate = new Date(op.startTime).toISOString().split('T')[0];
        
        // Проверяем от даты
        if (dateFrom && operationDate < dateFrom) return false;
        
        // Проверяем до даты
        if (dateTo && operationDate > dateTo) return false;
        
        return true;
      });
    }
    
    // Простой поиск по transaction_id
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(op => 
        op.transactionId && op.transactionId.toLowerCase().includes(query)
      );
    }
    
    console.log('✅ [FILTER] Filtered operations count:', filtered.length);
    return filtered;
  }, [operations, selectedTradingPoint, selectedStatus, searchQuery, dateFrom, dateTo]);

  // ПАГИНАЦИЯ - показываем только текущую страницу для быстрого рендеринга
  const paginatedOperations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOperations.slice(startIndex, endIndex);
  }, [filteredOperations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTradingPoint, selectedStatus, searchQuery, dateFrom, dateTo]);

  // Отладочная информация убрана для предотвращения зависания

  // ОТКЛЮЧЕНА медленная загрузка номенклатуры - используем статический список
  const [fuelTypes] = useState(["Все", "АИ-92", "АИ-95", "АИ-98", "ДТ", "АИ-100"]);

  // УПРОЩЕН - статический список способов оплаты 
  const paymentMethods = ["Все", "cash", "bank_card", "fuel_card", "online_order"];

  // ОТКЛЮЧЕНЫ тяжелые KPI расчёты для ускорения - показываем только базовые данные
  const operationKpis = useMemo(() => {
    const totalOperations = filteredOperations.length;
    const completedOperations = filteredOperations.filter(op => op.status === 'completed').length;
    const totalRevenue = filteredOperations
      .filter(op => op.status === 'completed' && op.totalCost)
      .reduce((sum, op) => sum + op.totalCost, 0);
    
    return {
      'Общая статистика': { revenue: totalRevenue, operations: totalOperations },
      'Завершённые': { revenue: totalRevenue, operations: completedOperations }
    };
  }, [filteredOperations.length]);

  // ОТКЛЮЧЕНЫ все тяжелые KPI расчёты для максимальной скорости
  const fuelKpis = {};
  const paymentKpis = {};


  const getStatusBadge = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
      case 'in_progress':
        return <PlayCircle className="w-4 h-4 text-slate-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      case 'pending':
        return <PauseCircle className="w-4 h-4 text-slate-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-slate-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };


  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1) {
      return `${Math.round(duration * 60)} сек`;
    }
    return `${duration.toFixed(1)} мин`;
  };

  // Функция экспорта в Excel с выбранными каналами
  const exportToExcel = async (operations: Operation[], channels: ExportChannels) => {
    try {
      console.log('🔄 Начинаем экспорт операций:', operations.length);
      
      if (operations.length === 0) {
        alert('Нет данных для экспорта');
        return;
      }

      // Подготовка данных для экспорта
      const exportData = operations.map((operation, index) => ({
        '№': index + 1,
        'ID операции': operation.id,
        'ID транзакции': operation.transactionId || '',
        'Дата': new Date(operation.startTime).toLocaleDateString('ru-RU'),
        'Время начала': new Date(operation.startTime).toLocaleTimeString('ru-RU'),
        'Время завершения': operation.endTime ? new Date(operation.endTime).toLocaleTimeString('ru-RU') : '',
        'Статус': operation.status === 'completed' ? 'Завершено' :
                  operation.status === 'in_progress' ? 'Выполняется' :
                  operation.status === 'failed' ? 'Ошибка' :
                  operation.status === 'pending' ? 'Ожидание' :
                  operation.status === 'cancelled' ? 'Отменено' : operation.status,
        'Тип операции': operationTypeMap[operation.operationType] || operation.operationType,
        'Торговая точка': operation.tradingPointName || '',
        'Устройство': operation.deviceId || '',
        'Вид топлива': operation.fuelType || '',
        'Количество (л)': operation.quantity ? Number(operation.quantity) : 0,
        'Цена (₽/л)': operation.price ? Number(operation.price) : 0,
        'Стоимость (₽)': operation.totalCost ? Number(operation.totalCost) : 0,
        'Вид оплаты': operation.paymentMethod ? (paymentMethodMap[operation.paymentMethod] || operation.paymentMethod) : '',
        'Оператор': operation.operatorName || '',
        'Детали': operation.details,
        'Длительность (мин)': operation.duration && operation.status !== 'in_progress' ? Number(operation.duration) : 0,
        'Последнее обновление': operation.lastUpdated
      }));

      console.log('📊 Подготовлено данных для экспорта:', exportData.length);

      // Создание книги Excel
      const workbook = XLSX.utils.book_new();
      
      // === ЛИСТ 1: СОВРЕМЕННЫЙ KPI ДАШБОРД ===
      
      // Подготовка данных для анализа
      const dates = operations.map(op => new Date(op.startTime)).filter(date => !isNaN(date.getTime()));
      const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      const periodDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;
      
      // KPI расчёты
      let totalOperations = operations.length;
      let totalRevenue = 0;
      let totalLiters = 0;
      let completedOperations = 0;
      let failedOperations = 0;
      
      const fuelStats = {};
      const paymentStats = {};
      const dailyStats = {};
      const hourlyStats = {};
      
      operations.forEach(op => {
        totalRevenue += op.totalCost || 0;
        totalLiters += op.quantity || 0;
        
        if (op.status === 'completed') completedOperations++;
        if (op.status === 'failed') failedOperations++;
        
        // По видам топлива
        if (op.fuelType) {
          if (!fuelStats[op.fuelType]) {
            fuelStats[op.fuelType] = { liters: 0, revenue: 0, operations: 0 };
          }
          fuelStats[op.fuelType].liters += op.quantity || 0;
          fuelStats[op.fuelType].revenue += op.totalCost || 0;
          fuelStats[op.fuelType].operations += 1;
        }
        
        // По видам оплаты
        if (op.paymentMethod && op.totalCost) {
          const method = paymentMethodMap[op.paymentMethod] || op.paymentMethod;
          if (!paymentStats[method]) {
            paymentStats[method] = { revenue: 0, operations: 0 };
          }
          paymentStats[method].revenue += op.totalCost;
          paymentStats[method].operations += 1;
        }
        
        // По дням
        const date = new Date(op.startTime).toLocaleDateString('ru-RU');
        if (!dailyStats[date]) {
          dailyStats[date] = { operations: 0, revenue: 0, liters: 0 };
        }
        dailyStats[date].operations += 1;
        dailyStats[date].revenue += op.totalCost || 0;
        dailyStats[date].liters += op.quantity || 0;
        
        // По часам
        const hour = new Date(op.startTime).getHours();
        const hourLabel = `${hour.toString().padStart(2, '0')}:00`;
        if (!hourlyStats[hourLabel]) {
          hourlyStats[hourLabel] = { operations: 0, revenue: 0 };
        }
        hourlyStats[hourLabel].operations += 1;
        hourlyStats[hourLabel].revenue += op.totalCost || 0;
      });
      
      // Расчёт процентов и трендов
      const successRate = totalOperations > 0 ? ((completedOperations / totalOperations) * 100).toFixed(2) : '0.00';
      const failureRate = totalOperations > 0 ? ((failedOperations / totalOperations) * 100).toFixed(2) : '0.00';
      const avgOperationValue = totalOperations > 0 ? (totalRevenue / totalOperations).toFixed(2) : '0.00';
      const avgDailyOperations = periodDays > 0 ? (totalOperations / periodDays).toFixed(2) : '0.00';
      const avgDailyRevenue = periodDays > 0 ? (totalRevenue / periodDays).toFixed(2) : '0.00';
      
      // Создание KPI дашборда в стиле современных панелей
      const dashboardData = [
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', 'ОПЕРАЦИОННАЯ ПАНЕЛЬ УПРАВЛЕНИЯ', '', '', '', '', '', '', '', ''],
        ['', '', '', `Период: ${minDate.toLocaleDateString('ru-RU')} - ${maxDate.toLocaleDateString('ru-RU')}`, '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        
        // KPI карточки (строка заголовков)
        ['', 'ОБЩИЕ ОПЕРАЦИИ', '', 'ВЫРУЧКА', '', 'ОБЪЕМ ТОПЛИВА', '', 'УСПЕШНОСТЬ', '', 'СРЕДНИЙ ЧЕК', ''],
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        
        // KPI значения (главные числа) - для Excel как числа
        ['', totalOperations, '', totalRevenue, '', totalLiters, '', parseFloat(successRate), '', parseFloat(avgOperationValue), ''],
        
        // KPI подзаголовки и тренды (числовые значения отдельно для аналитики)
        ['Дневные показатели:', parseFloat(avgDailyOperations), '', parseFloat(avgDailyRevenue), '', totalLiters / totalOperations, '', parseFloat(failureRate), '', parseFloat(avgOperationValue), ''],
        
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        
        // Разделитель - заголовок анализа
        ['', '', '', 'ДЕТАЛЬНАЯ АНАЛИТИКА ПО КАТЕГОРИЯМ', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', ''],
        
        // Анализ по видам топлива
        ['', 'АНАЛИЗ ПО ВИДАМ ТОПЛИВА', '', '', '', '', '', '', '', '', '', ''],
        ['', 'Вид', 'Объем (л)', '% от общего', 'Операций', 'Выручка (₽)', '', '', '', '', '', ''],
      ];
      
      // Добавляем данные по топливу
      Object.entries(fuelStats)
        .sort(([,a], [,b]) => b.liters - a.liters) // Сортировка по объему
        .forEach(([fuel, fuelData]) => {
          const fuelPercent = totalLiters > 0 ? ((fuelData.liters / totalLiters) * 100).toFixed(2) : '0.00';
          dashboardData.push([
            '',
            fuel,
            fuelData.liters.toLocaleString(),
            fuelPercent + '%',
            fuelData.operations,
            fuelData.revenue.toLocaleString() + ' ₽',
            '', '', '', '', '', ''
          ]);
        });

      // Итоги по топливу
      dashboardData.push([
        '',
        'ИТОГО:',
        totalLiters,
        100.00,
        totalOperations,
        totalRevenue,
        '', '', '', '', '', ''
      ]);
      
      dashboardData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
      dashboardData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
      
      // Анализ по способам оплаты
      dashboardData.push(['', 'АНАЛИЗ ПО СПОСОБАМ ОПЛАТЫ', '', '', '', '', '', '', '', '', '', '']);
      dashboardData.push(['', 'Способ', 'Выручка (₽)', '% от общего', 'Операций', 'Средний чек', '', '', '', '', '', '']);
      
      Object.entries(paymentStats)
        .sort(([,a], [,b]) => b.revenue - a.revenue) // Сортировка по выручке
        .forEach(([method, paymentData]) => {
          const methodPercent = totalRevenue > 0 ? ((paymentData.revenue / totalRevenue) * 100).toFixed(2) : '0.00';
          const avgCheck = paymentData.operations > 0 ? (paymentData.revenue / paymentData.operations).toFixed(2) : '0.00';
          dashboardData.push([
            '',
            method,
            paymentData.revenue.toLocaleString() + ' ₽',
            methodPercent + '%',
            paymentData.operations,
            avgCheck + ' ₽',
            '', '', '', '', '', ''
          ]);
        });

      // Итоги по способам оплаты
      const totalPaymentOperations = Object.values(paymentStats).reduce((sum, stats) => sum + stats.operations, 0);
      const avgPaymentCheck = totalRevenue > 0 ? (totalRevenue / totalPaymentOperations).toFixed(2) : '0.00';
      dashboardData.push([
        '',
        'ИТОГО:',
        totalRevenue,
        100.00,
        totalPaymentOperations,
        parseFloat(avgPaymentCheck),
        '', '', '', '', '', ''
      ]);
      
      dashboardData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
      dashboardData.push(['', '', '', '', '', '', '', '', '', '', '', '']);
      
      // Ежедневная динамика (последние 7 дней)
      const recentDays = Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-')))
        .slice(-7);
      
      dashboardData.push(['', 'ДИНАМИКА ПО ДНЯМ (последние 7 дней)', '', '', '', '', '', '', '', '', '', '']);
      dashboardData.push(['', 'Дата', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек', '', '', '', '', '', '']);
      
      recentDays.forEach(([date, dayData]) => {
        const avgCheck = dayData.operations > 0 ? (dayData.revenue / dayData.operations).toFixed(2) : '0.00';
        dashboardData.push([
          '',
          date,
          dayData.operations,
          dayData.revenue.toLocaleString() + ' ₽',
          dayData.liters.toLocaleString() + ' л',
          avgCheck + ' ₽',
          '', '', '', '', '', ''
        ]);
      });
      
      // Создание листа дашборда
      const dashboardWorksheet = XLSX.utils.aoa_to_sheet(dashboardData);
      
      // Настройка ширины колонок для KPI дашборда
      dashboardWorksheet['!cols'] = [
        { wch: 2 },  // Пустая колонка для отступа
        { wch: 16 }, // KPI 1: Операции
        { wch: 3 },  // Разделитель
        { wch: 16 }, // KPI 2: Выручка
        { wch: 3 },  // Разделитель
        { wch: 16 }, // KPI 3: Объем
        { wch: 3 },  // Разделитель
        { wch: 16 }, // KPI 4: Успешность
        { wch: 3 },  // Разделитель
        { wch: 16 }, // KPI 5: Средний чек
        { wch: 3 },  // Разделитель
        { wch: 5 }   // Пустая колонка
      ];
      
      // Стили для современного KPI дашборда
      const titleStyle = {
        font: { color: { rgb: "1E3A8A" }, bold: true, size: 16 },
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      const kpiHeaderStyle = {
        font: { color: { rgb: "64748B" }, bold: true, size: 11 },
        fill: { fgColor: { rgb: "F8FAFC" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" }},
          bottom: { style: "thin", color: { rgb: "E2E8F0" }},
          left: { style: "thin", color: { rgb: "E2E8F0" }},
          right: { style: "thin", color: { rgb: "E2E8F0" }}
        }
      };
      
      const kpiValueStyle = {
        font: { color: { rgb: "1E40AF" }, bold: true, size: 18 },
        fill: { fgColor: { rgb: "EFF6FF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "3B82F6" }},
          bottom: { style: "thin", color: { rgb: "E2E8F0" }},
          left: { style: "thin", color: { rgb: "E2E8F0" }},
          right: { style: "thin", color: { rgb: "E2E8F0" }}
        }
      };
      
      const kpiTrendStyle = {
        font: { color: { rgb: "059669" }, bold: false, size: 10 },
        fill: { fgColor: { rgb: "F0FDF4" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E2E8F0" }},
          bottom: { style: "medium", color: { rgb: "10B981" }},
          left: { style: "thin", color: { rgb: "E2E8F0" }},
          right: { style: "thin", color: { rgb: "E2E8F0" }}
        }
      };
      
      const sectionHeaderStyle = {
        font: { color: { rgb: "FFFFFF" }, bold: true, size: 12 },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "left", vertical: "center" }
      };
      
      const tableHeaderStyle = {
        font: { color: { rgb: "FFFFFF" }, bold: true, size: 11 },
        fill: { fgColor: { rgb: "3B82F6" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      const dataStyle = {
        font: { color: { rgb: "1F2937" }, size: 10 },
        fill: { fgColor: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" }},
          bottom: { style: "thin", color: { rgb: "E5E7EB" }},
          left: { style: "thin", color: { rgb: "E5E7EB" }},
          right: { style: "thin", color: { rgb: "E5E7EB" }}
        }
      };
      
      // Применяем стили к ячейкам
      Object.keys(dashboardWorksheet).forEach(cellAddress => {
        if (cellAddress.startsWith('!')) return;
        
        const cell = dashboardWorksheet[cellAddress];
        if (!cell || !cell.v) return;
        
        const cellValue = cell.v.toString();
        const [, col, row] = cellAddress.match(/([A-Z]+)(\d+)/);
        const rowNum = parseInt(row);
        
        // Заголовок панели
        if (cellValue.includes('ОПЕРАЦИОННАЯ ПАНЕЛЬ УПРАВЛЕНИЯ')) {
          cell.s = titleStyle;
        }
        
        // KPI заголовки (строка 5)
        if (rowNum === 5 && ['B', 'D', 'F', 'H', 'J'].includes(col) && cellValue.length > 0) {
          cell.s = kpiHeaderStyle;
        }
        
        // KPI значения (строка 7)
        if (rowNum === 7 && ['B', 'D', 'F', 'H', 'J'].includes(col) && cellValue.length > 0) {
          cell.s = kpiValueStyle;
        }
        
        // KPI тренды (строка 8)
        if (rowNum === 8 && ['B', 'D', 'F', 'H', 'J'].includes(col) && cellValue.length > 0) {
          cell.s = kpiTrendStyle;
        }
        
        // Заголовки разделов
        if (cellValue.includes('АНАЛИЗ ПО') || cellValue.includes('ДЕТАЛЬНАЯ АНАЛИТИКА') || 
            cellValue.includes('ДИНАМИКА ПО ДНЯМ')) {
          cell.s = sectionHeaderStyle;
        }
        
        // Заголовки таблиц
        if ((cellValue === 'Вид' || cellValue === 'Способ' || cellValue === 'Дата') && col === 'B') {
          cell.s = tableHeaderStyle;
        }
        if (['Объем (л)', '% от общего', 'Операций', 'Выручка (₽)', 'Средний чек'].includes(cellValue)) {
          cell.s = tableHeaderStyle;
        }
        
        // Данные таблиц
        if (rowNum > 12 && !cellValue.includes('АНАЛИЗ') && !cellValue.includes('ДИНАМИКА') && 
            !cellValue.includes('ДЕТАЛЬНАЯ') && cellValue.length > 0 && cellValue !== '') {
          cell.s = dataStyle;
        }
      });
      
      XLSX.utils.book_append_sheet(workbook, dashboardWorksheet, 'KPI Дашборд');
      
      // === ЛИСТ 3: ДАННЫЕ ДЛЯ ГРАФИКОВ ===
      
      // Подготовка данных по дням
      const chartData = [
        ['', '', '', '', '', ''],
        ['📉 ДАННЫЕ ПО ДНЯМ (для графиков)', '', '', '', '', ''],
        ['Дата', 'Операции', 'Выручка (₽)', 'Объём (л)', '', ''],
        ...Object.entries(dailyStats)
          .sort(([a], [b]) => new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-')))
          .map(([date, dayStats]) => [
            date,
            dayStats.operations,
            dayStats.revenue.toFixed(2),
            dayStats.liters.toFixed(2),
            '',
            ''
          ]),
        ['', '', '', '', '', ''],
        ['🕰 ДАННЫЕ ПО ЧАСАМ (для графиков)', '', '', '', '', ''],
        ['Час', 'Операции', 'Выручка (₽)', '', '', ''],
        ...Array.from({length: 24}, (_, i) => {
          const hour = `${i.toString().padStart(2, '0')}:00`;
          const hourData = hourlyStats[hour] || { operations: 0, revenue: 0 };
          return [hour, hourData.operations, hourData.revenue.toFixed(2), '', '', ''];
        }),
        ['', '', '', '', '', ''],
        ['📊 ДАННЫЕ ПО ТОПЛИВУ (для графиков)', '', '', '', '', ''],
        ['Вид топлива', 'Объём (л)', 'Операции', 'Выручка (₽)', '', ''],
        ...Object.entries(fuelStats).map(([fuel, stats]) => [
          fuel,
          Number(stats.liters),
          stats.operations,
          Number(stats.revenue),
          '',
          ''
        ]),
        ['', '', '', '', '', ''],
        ['💳 ДАННЫЕ ПО ОПЛАТЕ (для графиков)', '', '', '', '', ''],
        ['Вид оплаты', 'Выручка (₽)', 'Операции', 'Доля (%)', '', ''],
        ...Object.entries(paymentStats).map(([method, stats]) => [
          method,
          Number(stats.revenue),
          stats.operations,
          Math.round(stats.revenue / totalRevenue * 100),
          '',
          ''
        ])
      ];
      
      // Создание листа для графиков
      const chartWorksheet = XLSX.utils.aoa_to_sheet(chartData);
      
      // Настройка ширины колонок для графиков
      chartWorksheet['!cols'] = [
        { wch: 20 }, // Название/Дата
        { wch: 15 }, // Операции/Объём
        { wch: 18 }, // Выручка
        { wch: 15 }, // Объём/Доля
        { wch: 10 }, // Пусто
        { wch: 10 }  // Пусто
      ];
      
      // Добавление синего форматирования для листа графиков
      const chartHeaderStyle = {
        font: { color: { rgb: "FFFFFF" }, bold: true, size: 14 },
        fill: { fgColor: { rgb: "1E40AF" } }, // Темно-синий фон
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      const chartDataStyle = {
        font: { color: { rgb: "1E3A8A" } }, // Синий шрифт
        fill: { fgColor: { rgb: "EFF6FF" } }, // Очень светло-синий фон
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "BFDBFE" }},
          bottom: { style: "thin", color: { rgb: "BFDBFE" }},
          left: { style: "thin", color: { rgb: "BFDBFE" }},
          right: { style: "thin", color: { rgb: "BFDBFE" }}
        }
      };
      
      const chartColumnHeaderStyle = {
        font: { color: { rgb: "FFFFFF" }, bold: true },
        fill: { fgColor: { rgb: "3B82F6" } }, // Средний синий
        alignment: { horizontal: "center", vertical: "center" }
      };
      
      // Применяем стили к листу графиков
      Object.keys(chartWorksheet).forEach(cellAddress => {
        if (cellAddress.startsWith('!')) return;
        
        const cell = chartWorksheet[cellAddress];
        if (!cell || !cell.v) return;
        
        const cellValue = cell.v.toString();
        
        // Стилизуем заголовки разделов
        if (cellValue.includes('ДАННЫЕ ПО') || cellValue.includes('для графиков')) {
          cell.s = chartHeaderStyle;
        }
        
        // Стилизуем заголовки колонок
        if (cellValue === 'Дата' || cellValue === 'Операции' || cellValue === 'Выручка (₽)' ||
            cellValue === 'Объём (л)' || cellValue === 'Час' || cellValue === 'Вид топлива' ||
            cellValue === 'Вид оплаты' || cellValue === 'Доля (%)') {
          cell.s = chartColumnHeaderStyle;
        }
        
        // Стилизуем данные (числа, даты, названия топлива)
        if (!cellValue.includes('ДАННЫЕ') && !cellValue.includes('для графиков') && 
            cellValue !== 'Дата' && cellValue !== 'Операции' && cellValue !== 'Выручка (₽)' &&
            cellValue !== 'Объём (л)' && cellValue !== 'Час' && cellValue !== 'Вид топлива' &&
            cellValue !== 'Вид оплаты' && cellValue !== 'Доля (%)' &&
            cellValue.trim() !== '') {
          cell.s = chartDataStyle;
        }
      });
      
      XLSX.utils.book_append_sheet(workbook, chartWorksheet, '📉 Графики');
      
      // === ЛИСТ 2: ПОДРОБНЫЕ ДАННЫЕ ===
      
      const detailsWorksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Настройка ширины колонок для детальных данных
      detailsWorksheet['!cols'] = [
        { wch: 5 },   // №
        { wch: 15 },  // ID операции
        { wch: 15 },  // ID транзакции
        { wch: 12 },  // Дата
        { wch: 12 },  // Время начала
        { wch: 12 },  // Время завершения
        { wch: 12 },  // Статус
        { wch: 15 },  // Тип операции
        { wch: 20 },  // Торговая точка
        { wch: 12 },  // Устройство
        { wch: 12 },  // Вид топлива
        { wch: 12 },  // Количество
        { wch: 12 },  // Цена
        { wch: 12 },  // Стоимость
        { wch: 15 },  // Вид оплаты
        { wch: 15 },  // Оператор
        { wch: 30 },  // Детали
        { wch: 12 },  // Длительность
        { wch: 15 }   // Последнее обновление
      ];

      XLSX.utils.book_append_sheet(workbook, detailsWorksheet, '📋 Подробные данные');

      // Генерация имени файла с текущей датой
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `operations_${dateStr}_${timeStr}.xlsx`;

      console.log('💾 Сохраняем файл:', filename);

      // Создаем Blob для файла Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      const results = [];
      
      // Скачивание файла локально (если выбран канал "local")
      if (channels.local) {
        XLSX.writeFile(workbook, filename);
        console.log('💾 Файл сохранен локально:', filename);
        results.push('• Файл сохранен локально');
      }
      
      // Отправка в Telegram (если выбран и настроен)
      if (channels.telegram) {
        try {
          await telegramService.initialize();
          
          // Формируем описание отчета
          const summary = `📊 <b>Отчет по операциям</b>\n\n` +
            `📅 Дата создания: ${new Date().toLocaleString('ru-RU')}\n` +
            `📋 Количество операций: ${operations.length}\n` +
            `🏪 Торговая точка: ${operations[0]?.tradingPointName || 'Все точки'}\n` +
            `💰 Общая сумма: ${operations.reduce((sum, op) => sum + (op.totalCost || 0), 0).toFixed(2)} ₽`;

          await telegramService.sendDocument(blob, {
            filename: filename,
            caption: summary
          });
          
          console.log('✅ Отчет отправлен в Telegram');
          results.push('• Отчет отправлен в Telegram');
        } catch (telegramError) {
          console.warn('⚠️ Не удалось отправить в Telegram:', telegramError);
          results.push('⚠️ Telegram: ' + telegramError.message);
        }
      }
      
      // Отправка по Email (если выбран и настроен)
      if (channels.email) {
        try {
          const downloadLink = channels.local ? emailService.generateDownloadLink(blob, filename) : '';
          const emailMessage = `📊 Готов новый отчет по операциям TradeFrame\n\n` +
            `📅 Дата создания: ${new Date().toLocaleString('ru-RU')}\n` +
            `📋 Количество операций: ${operations.length}\n` +
            `🏪 Торговая точка: ${operations[0]?.tradingPointName || 'Все точки'}\n` +
            `💰 Общая сумма: ${operations.reduce((sum, op) => sum + (op.totalCost || 0), 0).toFixed(2)} ₽\n\n` +
            `📎 Файл отчета: ${filename}` +
            (downloadLink ? `\n🔗 Ссылка для скачивания: ${downloadLink}` : '');

          await emailService.sendReportNotification({
            to: '', // Берется из настроек
            subject: `📊 TradeFrame: Отчет по операциям ${new Date().toLocaleDateString('ru-RU')}`,
            message: emailMessage
          });
          
          console.log('✅ Email уведомление отправлено');
          results.push('• Email уведомление отправлено');
          
        } catch (emailError) {
          console.warn('⚠️ Не удалось отправить email:', emailError);
          results.push('⚠️ Email: ' + emailError.message);
        }
      }
      
      // Показываем результат пользователю
      const successMessage = '✅ Экспорт завершен!\n\n' + results.join('\n');
      alert(successMessage);
      
      console.log('✅ Экспорт завершен успешно');
    } catch (error) {
      console.error('❌ Ошибка при экспорте:', error);
      alert('Ошибка при экспорте данных. Проверьте консоль для деталей.');
    }
  };

  // Функция создания HTML отчета с графиками
  const exportToHTML = async (operations: any[]) => {
    console.log('📊 Создаем HTML отчет с графиками');
    
    // Подготовка данных для графиков
    const fuelStats = {};
    const paymentStats = {};
    const hourlyStats = {};
    
    let totalRevenue = 0;
    let totalLiters = 0;
    let completedOps = 0;
    
    // Расчет периода отчета для HTML
    const periodStart = new Date(dateFrom);
    const periodEnd = new Date(dateTo);
    const periodDays = Math.max(1, Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1);
    
    operations.forEach(op => {
      totalRevenue += op.totalCost || 0;
      totalLiters += op.quantity || 0;
      if (op.status === 'completed') completedOps++;
      
      // По видам топлива
      if (op.fuelType) {
        if (!fuelStats[op.fuelType]) fuelStats[op.fuelType] = { liters: 0, revenue: 0, ops: 0 };
        fuelStats[op.fuelType].liters += op.quantity || 0;
        fuelStats[op.fuelType].revenue += op.totalCost || 0;
        fuelStats[op.fuelType].ops += 1;
      }
      
      // По способам оплаты
      if (op.paymentMethod && op.totalCost) {
        const method = paymentMethodMap[op.paymentMethod] || op.paymentMethod;
        if (!paymentStats[method]) paymentStats[method] = { revenue: 0, ops: 0 };
        paymentStats[method].revenue += op.totalCost;
        paymentStats[method].ops += 1;
      }
      
      // По часам
      const hour = new Date(op.startTime).getHours();
      if (!hourlyStats[hour]) hourlyStats[hour] = 0;
      hourlyStats[hour] += 1;
    });
    
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по операциям - ${new Date().toLocaleDateString('ru-RU')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; padding: 20px;
        }
        .container { 
            max-width: 1400px; margin: 0 auto; background: white;
            border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white; padding: 40px; text-align: center;
        }
        .header h1 { font-size: 3rem; margin-bottom: 10px; }
        .header p { font-size: 1.2rem; opacity: 0.9; }
        
        .kpi-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 30px; padding: 40px; background: #f8fafc;
        }
        .kpi-card { 
            background: white; padding: 30px; border-radius: 15px; text-align: center;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08); border-left: 5px solid #3b82f6;
            transition: transform 0.3s ease;
        }
        .kpi-card:hover { transform: translateY(-5px); }
        .kpi-card h3 { color: #64748b; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 10px; }
        .kpi-card .value { color: #1e40af; font-size: 2.5rem; font-weight: bold; margin-bottom: 5px; }
        .kpi-card .trend { color: #059669; font-size: 0.9rem; }
        
        .charts-grid { 
            display: grid; grid-template-columns: 1fr 1fr; gap: 40px; padding: 40px;
        }
        .chart-container { 
            background: white; padding: 30px; border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08); position: relative;
        }
        .chart-container h3 { 
            color: #1e40af; margin-bottom: 20px; font-size: 1.3rem;
            border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;
        }
        .chart-wrapper { position: relative; height: 300px; }
        .daily-chart { grid-column: 1 / -1; }
        .daily-chart .chart-wrapper { height: 400px; }
        
        @media (max-width: 768px) {
            .charts-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 2rem; }
            .kpi-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Отчет по операциям</h1>
            <p>Период: ${new Date(dateFrom).toLocaleDateString('ru-RU')} - ${new Date(dateTo).toLocaleDateString('ru-RU')} | Операций: ${operations.length}</p>
        </div>
        
        <div class="kpi-grid">
            <div class="kpi-card">
                <h3>Всего операций</h3>
                <div class="value">${operations.length}</div>
                <div class="trend">${(operations.length / periodDays).toFixed(2)} операций/день</div>
            </div>
            <div class="kpi-card">
                <h3>Общая выручка</h3>
                <div class="value">${totalRevenue.toFixed(2)} ₽</div>
                <div class="trend">${(totalRevenue / operations.length).toFixed(2)} ₽/операция</div>
            </div>
            <div class="kpi-card">
                <h3>Объем топлива</h3>
                <div class="value">${totalLiters.toFixed(2)} л</div>
                <div class="trend">${(totalLiters / operations.length).toFixed(2)} л/операция</div>
            </div>
            <div class="kpi-card">
                <h3>Успешность</h3>
                <div class="value">${((completedOps / operations.length) * 100).toFixed(2)}%</div>
                <div class="trend">Выполнено: ${completedOps} из ${operations.length}</div>
            </div>
        </div>
        
        <div class="charts-grid">
            <div class="chart-container">
                <h3>🛢️ Распределение по топливу</h3>
                <div class="chart-wrapper"><canvas id="fuelChart"></canvas></div>
            </div>
            
            <div class="chart-container">
                <h3>💳 Способы оплаты</h3>
                <div class="chart-wrapper"><canvas id="paymentChart"></canvas></div>
            </div>
            
            <div class="chart-container daily-chart">
                <h3>📈 Активность по часам</h3>
                <div class="chart-wrapper"><canvas id="hourlyChart"></canvas></div>
            </div>
        </div>
    </div>

    <script>
        const chartColors = {
            primary: '#3b82f6', secondary: '#1e40af', accent: '#06b6d4',
            success: '#10b981', warning: '#f59e0b', danger: '#ef4444'
        };
        
        const fuelData = ${JSON.stringify(Object.entries(fuelStats).map(([fuel, stats]) => ({
          label: fuel, value: stats.liters
        })))};
        
        new Chart(document.getElementById('fuelChart'), {
            type: 'doughnut',
            data: {
                labels: fuelData.map(item => item.label),
                datasets: [{
                    data: fuelData.map(item => item.value),
                    backgroundColor: [chartColors.primary, chartColors.accent, chartColors.success, chartColors.warning, chartColors.danger],
                    borderWidth: 0, hoverBorderWidth: 3, hoverBorderColor: '#fff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true }}}}
        });
        
        const paymentData = ${JSON.stringify(Object.entries(paymentStats).map(([method, stats]) => ({
          label: method, value: stats.revenue
        })))};
        
        new Chart(document.getElementById('paymentChart'), {
            type: 'doughnut',
            data: {
                labels: paymentData.map(item => item.label),
                datasets: [{
                    data: paymentData.map(item => item.value),
                    backgroundColor: [chartColors.success, chartColors.primary, chartColors.accent, chartColors.warning],
                    borderWidth: 0, hoverBorderWidth: 3, hoverBorderColor: '#fff'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true }}}}
        });
        
        const hourlyData = ${JSON.stringify(Array.from({length: 24}, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`, operations: hourlyStats[i] || 0
        })))};
        
        new Chart(document.getElementById('hourlyChart'), {
            type: 'bar',
            data: {
                labels: hourlyData.map(item => item.hour),
                datasets: [{
                    label: 'Операции', data: hourlyData.map(item => item.operations),
                    backgroundColor: chartColors.primary, borderColor: chartColors.secondary,
                    borderWidth: 1, borderRadius: 8, borderSkipped: false,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }}, x: { grid: { display: false }}}, plugins: { legend: { display: false }}}
        });
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operations-report-${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log('✅ HTML отчет с графиками создан');
  };

  // Функция создания красивого PDF отчета
  const exportToPDF = async (operations: any[]) => {
    console.log('📄 Создаем PDF отчет с графиками');
    
    // Создаем временный div для рендеринга графиков
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.background = 'white';
    tempDiv.style.padding = '20px';
    document.body.appendChild(tempDiv);
    
    // Подготовка данных
    const fuelStats = {};
    const paymentStats = {};
    let totalRevenue = 0;
    let totalLiters = 0;
    let completedOps = 0;
    
    // Расчет периода отчета
    const periodStart = new Date(dateFrom);
    const periodEnd = new Date(dateTo);
    const periodDays = Math.max(1, Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24)) + 1);
    
    operations.forEach(op => {
      totalRevenue += op.totalCost || 0;
      totalLiters += op.quantity || 0;
      if (op.status === 'completed') completedOps++;
      
      if (op.fuelType) {
        if (!fuelStats[op.fuelType]) fuelStats[op.fuelType] = { liters: 0, revenue: 0 };
        fuelStats[op.fuelType].liters += op.quantity || 0;
        fuelStats[op.fuelType].revenue += op.totalCost || 0;
      }
      
      if (op.paymentMethod && op.totalCost) {
        const method = paymentMethodMap[op.paymentMethod] || op.paymentMethod;
        if (!paymentStats[method]) paymentStats[method] = { revenue: 0 };
        paymentStats[method].revenue += op.totalCost;
      }
    });

    // HTML контент для PDF
    tempDiv.innerHTML = `
      <div style="font-family: Arial, sans-serif;">
        <!-- Заголовок -->
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 36px;">📊 Отчет по операциям</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">
            Период: ${new Date(dateFrom).toLocaleDateString('ru-RU')} - ${new Date(dateTo).toLocaleDateString('ru-RU')} | Операций: ${operations.length}
          </p>
        </div>

        <!-- KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: white; border: 2px solid #3b82f6; padding: 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase;">ВСЕГО ОПЕРАЦИЙ</h3>
            <div style="color: #1e40af; font-size: 32px; font-weight: bold; margin: 0;">${operations.length.toFixed(2)}</div>
            <div style="color: #16a34a; font-size: 12px; margin: 5px 0 0 0;">${(operations.length / periodDays).toFixed(2)} операций/день</div>
          </div>
          
          <div style="background: white; border: 2px solid #10b981; padding: 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase;">ОБЩАЯ ВЫРУЧКА</h3>
            <div style="color: #16a34a; font-size: 32px; font-weight: bold; margin: 0;">${totalRevenue.toFixed(2)} ₽</div>
            <div style="color: #16a34a; font-size: 12px; margin: 5px 0 0 0;">${(totalRevenue / operations.length).toFixed(2)} ₽/операция</div>
          </div>
          
          <div style="background: white; border: 2px solid #f59e0b; padding: 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase;">ОБЪЕМ ТОПЛИВА</h3>
            <div style="color: #dc2626; font-size: 32px; font-weight: bold; margin: 0;">${totalLiters.toFixed(2)} л</div>
            <div style="color: #16a34a; font-size: 12px; margin: 5px 0 0 0;">${(totalLiters / operations.length).toFixed(2)} л/операция</div>
          </div>
          
          <div style="background: white; border: 2px solid #8b5cf6; padding: 20px; text-align: center; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #374151; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase;">УСПЕШНОСТЬ</h3>
            <div style="color: #7c3aed; font-size: 32px; font-weight: bold; margin: 0;">${((completedOps / operations.length) * 100).toFixed(2)}%</div>
            <div style="color: #16a34a; font-size: 12px; margin: 5px 0 0 0;">Выполнено: ${completedOps} из ${operations.length}</div>
          </div>
        </div>

        <!-- Графики -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🛢️ Распределение по топливу</h3>
            <canvas id="fuelChartPDF" width="350" height="250"></canvas>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">💳 Способы оплаты</h3>
            <canvas id="paymentChartPDF" width="350" height="250"></canvas>
          </div>
        </div>

        <!-- Детальные данные -->
        <div style="margin-top: 30px;">
          <h3 style="color: #1e40af; font-size: 18px; margin-bottom: 15px;">📊 Детальная статистика</h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4 style="color: #374151; font-size: 14px; margin-bottom: 10px;">По видам топлива:</h4>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                ${Object.entries(fuelStats).map(([fuel, stats]) => 
                  `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #374151; font-weight: 500;">${fuel}:</span>
                    <span style="color: #1f2937; font-weight: 600;">${stats.liters.toFixed(2)} л (${stats.revenue.toFixed(2)} ₽)</span>
                  </div>`
                ).join('')}
                <hr style="margin: 12px 0; border: none; border-top: 2px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #1f2937; font-weight: 700;">ИТОГО:</span>
                  <span style="color: #1f2937; font-weight: 700;">${totalLiters.toFixed(2)} л (${totalRevenue.toFixed(2)} ₽)</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 style="color: #374151; font-size: 14px; margin-bottom: 10px;">По способам оплаты:</h4>
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                ${Object.entries(paymentStats).map(([method, stats]) => 
                  `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #374151; font-weight: 500;">${method}:</span>
                    <span style="color: #1f2937; font-weight: 600;">${stats.revenue.toFixed(2)} ₽</span>
                  </div>`
                ).join('')}
                <hr style="margin: 12px 0; border: none; border-top: 2px solid #e5e7eb;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #1f2937; font-weight: 700;">ИТОГО:</span>
                  <span style="color: #1f2937; font-weight: 700;">${totalRevenue.toFixed(2)} ₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Ожидаем загрузки DOM
    await new Promise(resolve => setTimeout(resolve, 100));

    // Создаем графики для PDF
    const createChartForPDF = (canvasId, type, chartData, colors) => {
      return new Promise((resolve) => {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
          new (window as any).Chart(canvas, {
            type,
            data: chartData,
            options: {
              responsive: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { padding: 15, usePointStyle: true, font: { size: 11 }}
                }
              }
            }
          });
          setTimeout(resolve, 500); // Даем время для рендеринга
        } else {
          resolve(true);
        }
      });
    };

    // Подготовка данных для графиков
    const fuelChartData = Object.entries(fuelStats).map(([fuel, stats]) => ({ label: fuel, value: stats.liters }));
    const paymentChartData = Object.entries(paymentStats).map(([method, stats]) => ({ label: method, value: stats.revenue }));

    // Создаем графики если Chart.js доступен
    if ((window as any).Chart) {
      await createChartForPDF('fuelChartPDF', 'doughnut', {
        labels: fuelChartData.map(item => item.label),
        datasets: [{
          data: fuelChartData.map(item => item.value),
          backgroundColor: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
          borderWidth: 0
        }]
      });

      await createChartForPDF('paymentChartPDF', 'doughnut', {
        labels: paymentChartData.map(item => item.label),
        datasets: [{
          data: paymentChartData.map(item => item.value),
          backgroundColor: ['#10b981', '#3b82f6', '#06b6d4', '#f59e0b'],
          borderWidth: 0
        }]
      });
    }

    try {
      // Конвертируем в изображение
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Создаем PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // отступы
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Добавляем изображение в PDF
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Если изображение не помещается на одну страницу, создаем дополнительные
      if (imgHeight > pdfHeight - 20) {
        let remainingHeight = imgHeight;
        let currentY = 0;
        
        while (remainingHeight > 0) {
          const pageHeight = Math.min(remainingHeight, pdfHeight - 20);
          pdf.addImage(imgData, 'PNG', 10, 10 - currentY, imgWidth, imgHeight);
          
          remainingHeight -= pageHeight;
          currentY += pageHeight;
          
          if (remainingHeight > 0) {
            pdf.addPage();
          }
        }
      }

      // Сохраняем PDF
      const fileName = `operations-report-${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF отчет создан');
      
    } catch (error) {
      console.error('❌ Ошибка создания PDF:', error);
      throw error;
    } finally {
      // Удаляем временный элемент
      document.body.removeChild(tempDiv);
    }
  };

  // Обработчик подтверждения экспорта с выбранными каналами
  const handleExportConfirm = async (channels: ExportChannels) => {
    try {
      if (channels.local) {
        // Сохраняем каналы и показываем диалог выбора формата
        setPendingChannels(channels);
        setExportDialogOpen(false);
        setShowFormatDialog(true);
      } else {
        // Если не локальный экспорт, используем Excel по умолчанию
        await exportToExcel(pendingExportOperations, channels);
        console.log('✅ Excel экспорт завершен');
        setPendingExportOperations([]);
      }
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert(`❌ Ошибка при экспорте: ${error.message}`);
    }
  };

  const handleFormatConfirm = async (format: ExportFormat) => {
    try {
      switch (format) {
        case 'html':
          await exportToHTML(pendingExportOperations);
          console.log('✅ HTML экспорт завершен');
          break;
        case 'pdf':
          await exportToPDF(pendingExportOperations);
          console.log('✅ PDF экспорт завершен');
          break;
        case 'excel':
        default:
          await exportToExcel(pendingExportOperations, pendingChannels!);
          console.log('✅ Excel экспорт завершен');
          break;
      }
      setPendingExportOperations([]);
      setPendingChannels(null);
    } catch (error) {
      console.error('❌ Ошибка экспорта:', error);
      alert(`❌ Ошибка при экспорте: ${error.message}`);
    }
  };

  // Операции теперь показываются для всех торговых точек (синхронизация с торговым API)
  // Проверка торговой точки убрана - показываем операции всегда

  return (
    <>
    <MainLayout fullWidth={true}>
      <div className="w-full space-y-6 report-full-width">
        {/* Заголовок страницы */}
        <div className="mb-6 pl-4 md:pl-6 lg:pl-8 pr-4 md:pr-6 lg:pr-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Операции</h1>
              <p className="text-slate-400 mt-2">
                {selectedNetwork && selectedTradingPoint && selectedTradingPoint !== "all" 
                  ? `Real-time операции торговой точки сети "${selectedNetwork.name}"`
                  : selectedNetwork 
                  ? `Real-time операции всех торговых точек сети "${selectedNetwork.name}"`
                  : "Real-time операции всех торговых точек демо сети"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={reloadOperations}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Обновление...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Обновить данные
                  </>
                )}
              </Button>
              <HelpButton route="/network/operations-transactions" variant="text" className="flex-shrink-0" />
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Автообновление' : 'Включить автообновление'}
            </Button>
            <Button
              variant="outline"
              onClick={reloadOperations}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Перезагрузить данные
            </Button>
            <Button
              variant="default"
              onClick={syncTransactionsFromTradingAPI}
              disabled={syncLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {syncLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Синхронизация...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Загрузить транзакции из API
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm('❓ Удалить все операции АЗС №004 из базы данных?\n\nЭто действие нельзя отменить!')) {
                  clearStation4Operations();
                }
              }}
              disabled={clearLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {clearLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Очистка...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Очистить АЗС №004
                </>
              )}
            </Button>
          </div>
        </div>

        <>
          {/* Фильтры */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Фильтры
                  <div className="ml-auto flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔄 Кнопка экспорта нажата!');
                        console.log('📊 Количество операций для экспорта:', filteredOperations.length);
                        
                        if (filteredOperations.length === 0) {
                          alert('Нет данных для экспорта');
                          return;
                        }
                        
                        // Сохраняем операции для экспорта и открываем диалог
                        setPendingExportOperations(filteredOperations);
                        setExportDialogOpen(true);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-shrink-0"
                      onClick={async () => {
                        if (confirm('Перезагрузить операции из базы данных?')) {
                          await reloadOperations();
                        }
                      }}
                    >
                      Очистить данные
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 lg:grid-cols-6 gap-4'}`}>

                  <div>
                    <Label className="text-slate-300">Статус</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Все">Все</SelectItem>
                        <SelectItem value="completed">Завершено</SelectItem>
                        <SelectItem value="in_progress">Выполняется</SelectItem>
                        <SelectItem value="failed">Ошибка</SelectItem>
                        <SelectItem value="pending">Ожидание</SelectItem>
                        <SelectItem value="cancelled">Отменено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Вид топлива</Label>
                    <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Вид оплаты</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map(method => (
                          <SelectItem key={method} value={method}>
                            {method === "Все" ? "Все" : (paymentMethodMap[method] || method)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Дата с</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Дата по</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-300">Поиск</Label>
                    <Input
                      placeholder="Поиск по операции, устройству, ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* KPI - Суммы по видам операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам операций
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'}`}>
                {Object.entries(operationKpis).map(([operationType, stats]) => (
                  <Card key={operationType} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{operationType}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Суммы по видам оплаты */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам оплаты
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
                {Object.entries(paymentKpis).map(([paymentMethod, stats]) => (
                  <Card key={paymentMethod} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{paymentMethod}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.revenue.toFixed(0)} ₽</div>
                      <p className="text-xs text-slate-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* KPI - Объемы топлива */}
            <div className="mx-4 md:mx-6 lg:mx-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Суммы по видам топлива
              </h3>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'}`}>
                {Object.entries(fuelKpis).map(([fuelType, stats]) => (
                  <Card key={fuelType} className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-slate-200">{fuelType}</CardTitle>
                      <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-white">{stats.volume.toFixed(0)} л</div>
                      <p className="text-sm text-slate-400">{stats.revenue.toFixed(0)} ₽</p>
                      <p className="text-xs text-blue-400">{stats.operations} операций</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>


            {/* Таблица операций */}
            <div className="mx-4 md:mx-6 lg:mx-8">
            <Card className="bg-slate-800 border-slate-700 w-full max-w-none">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Текущие операции
                  <Badge variant="secondary" className="ml-auto">
                    {filteredOperations.length} операций
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isMobile ? (
                  // Mobile card layout
                  <div className="space-y-4 p-4">
                    {paginatedOperations.map((record) => (
                      <Card key={record.id} className="bg-slate-700 border-slate-600">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              <span className="font-medium text-white">{operationTypeMap[record.operationType] || record.operationType}</span>
                            </div>
                            {getStatusBadge(record.status)}
                          </div>
                          {record.transactionId && (
                            <div className="text-xs text-slate-400 mt-1">{record.transactionId}</div>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              {record.deviceId || 'N/A'}
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">{record.lastUpdated}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Дата:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleDateString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Начало:</span>
                              <span className="text-white font-mono ml-1">{new Date(record.startTime).toLocaleTimeString('ru-RU')}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Завершение:</span>
                              <span className="text-white font-mono ml-1">{record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-slate-400">Тип записи:</span>
                              <Badge className="ml-1 bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-slate-400">Топливо:</span>
                              <span className="text-white ml-1">{record.fuelType || '—'}</span>
                            </div>
                          </div>
                          
                          {(record.quantity || record.price || record.totalCost) && (
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-slate-400">Кол-во:</span>
                                <div className="text-white font-mono">
                                  {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Цена:</span>
                                <div className="text-white font-mono">
                                  {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                                </div>
                              </div>
                              <div>
                                <span className="text-slate-400">Сумма:</span>
                                <div className="text-white font-mono">
                                  {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                                </div>
                              </div>
                            </div>
                          )}

                          {record.paymentMethod && (
                            <div className="text-sm">
                              <span className="text-slate-400">Вид оплаты:</span>
                              <span className="text-white ml-1">
                                {paymentMethodMap[record.paymentMethod] || record.paymentMethod}
                              </span>
                            </div>
                          )}

                          {record.status === 'in_progress' && record.progress !== undefined && (
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Прогресс:</span>
                                <span className="text-sm text-blue-400">{Math.round(record.progress)}%</span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500"
                                  style={{ width: `${record.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {record.duration && record.status !== 'in_progress' && (
                            <div className="text-sm">
                              <span className="text-slate-400">Длительность:</span>
                              <span className="text-white font-mono ml-1">{formatDuration(record.duration)}</span>
                            </div>
                          )}
                          
                          <div className="text-sm border-t border-slate-600 pt-2">
                            <div className="flex items-start gap-1">
                              <span className="text-slate-400">Детали:</span>
                              <span className="text-slate-300 flex-1">
                                {record.details}
                                {record.status === 'failed' && <AlertTriangle className="w-4 h-4 text-red-400 inline ml-1" />}
                              </span>
                            </div>
                          </div>
                          
                          {isNetworkOnly && record.tradingPointName && (
                            <div className="text-sm border-t border-slate-600 pt-2">
                              <span className="text-slate-400">Торговая точка:</span>
                              <div className="text-slate-300 font-medium">{record.tradingPointName}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                    {loading ? (
                      <div className="text-center py-8 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                          Загрузка операций...
                        </div>
                      </div>
                    ) : filteredOperations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <div>Нет операций по выбранным фильтрам</div>
                        {operations.length === 0 && (
                          <div className="mt-2 text-sm">
                            <button 
                              onClick={reloadOperations}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Загрузить операции
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  // Desktop table layout
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-full table-fixed">
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          {isNetworkOnly && <TableHead className="text-slate-300">Торговая точка</TableHead>}
                          <TableHead className="text-slate-300">Статус</TableHead>
                          <TableHead className="text-slate-300">Тип записи</TableHead>
                          <TableHead className="text-slate-300">Дата</TableHead>
                          <TableHead className="text-slate-300">Время начала</TableHead>
                          <TableHead className="text-slate-300">Время завершения</TableHead>
                          <TableHead className="text-slate-300">Вид топлива</TableHead>
                          <TableHead className="text-slate-300">Количество</TableHead>
                          <TableHead className="text-slate-300">Цена</TableHead>
                          <TableHead className="text-slate-300">Стоимость</TableHead>
                          <TableHead className="text-slate-300 min-w-[120px]">Вид оплаты</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOperations.map((record) => (
                          <TableRow key={record.id} className="border-slate-700 hover:bg-slate-700/50">
                            {isNetworkOnly && (
                              <TableCell className="text-slate-300 max-w-xs">
                                <div className="truncate" title={record.tradingPointName}>
                                  {record.tradingPointName}
                                </div>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(record.status)}
                                {getStatusBadge(record.status)}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">
                              <Badge className="bg-slate-600 text-slate-200">
                                {record.status === 'completed' ? 'Транзакция' : 'Операция'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleDateString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {new Date(record.startTime).toLocaleTimeString('ru-RU')}
                            </TableCell>
                            <TableCell className="text-white font-mono text-sm">
                              {record.endTime ? new Date(record.endTime).toLocaleTimeString('ru-RU') : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {record.fuelType || '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.quantity ? `${record.quantity.toFixed(2)} л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.price ? `${record.price.toFixed(2)} ₽/л` : '—'}
                            </TableCell>
                            <TableCell className="text-white font-mono">
                              {record.totalCost ? `${record.totalCost.toFixed(2)} ₽` : '—'}
                            </TableCell>
                            <TableCell className="text-slate-300 min-w-[120px] whitespace-nowrap">
                              <div className="truncate" title={record.paymentMethod ? (paymentMethodMap[record.paymentMethod] || record.paymentMethod) : '—'}>
                                {record.paymentMethod ? (paymentMethodMap[record.paymentMethod] || record.paymentMethod) : '—'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {loading ? (
                      <div className="text-center py-8 text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                          Загрузка операций...
                        </div>
                      </div>
                    ) : filteredOperations.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <div>Нет операций по выбранным фильтрам</div>
                        {operations.length === 0 && (
                          <div className="mt-2 text-sm">
                            <button 
                              onClick={reloadOperations}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              Загрузить операции
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
                
                {/* ПАГИНАЦИЯ для быстрого отображения */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-600">
                    <div className="text-sm text-slate-400">
                      Страница {currentPage} из {totalPages} ({filteredOperations.length} всего операций, показано {paginatedOperations.length})
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Первая
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Назад
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Вперёд
                      </Button>
                      <Button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Последняя
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
        </>
      </div>
    </MainLayout>
    
    {/* Диалог выбора каналов экспорта */}
    <ExportChannelDialog
      open={exportDialogOpen}
      onOpenChange={setExportDialogOpen}
      onConfirm={handleExportConfirm}
      operationsCount={pendingExportOperations.length}
    />
    
    <ExportFormatDialog
      open={showFormatDialog}
      onOpenChange={setShowFormatDialog}
      onConfirm={handleFormatConfirm}
    />
    </>
  );
}