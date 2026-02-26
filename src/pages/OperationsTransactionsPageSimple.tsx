import React, { useState, useMemo, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useSelection } from "@/contexts/SelectionContext";
import { useNewAuth } from "@/contexts/NewAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Activity, AlertTriangle, Loader2, FileText, FileSpreadsheet, Calendar, Fuel, CreditCard, Pin, HelpCircle, RefreshCw, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { operationsService } from "@/services/operationsService";
import { stsApiService, Transaction } from "@/services/stsApi";
import { tradingPointsService } from "@/services/tradingPointsService";
import { TradingPoint } from "@/types/tradingpoint";
import KPIFuelCard from "@/components/operations/KPIFuelCard";
import KPIPaymentCard from "@/components/operations/KPIPaymentCard";
import MobileOperationsTable from "@/components/operations/MobileOperationsTable";
import { VirtualizedOperationsTable } from "@/components/operations/VirtualizedOperationsTable";
import { exportToExcel, exportToPdf } from "@/services/operationsExportService";
import { normalizePaymentMethod } from "@/utils/paymentUtils";
import { useOperationsFilters } from "@/hooks/useOperationsFilters";

export default function OperationsTransactionsPageSimple() {
  const { selectedNetwork, selectedTradingPoint, selectedStation, isAllTradingPoints, isInitialized } = useSelection();
  const { user } = useNewAuth();
  const isMobile = useIsMobile();

  // Вычисляем разрешенные номера станций из scopeValues ролей пользователя
  const allowedStationNumbers = useMemo(() => {
    if (!user?.roles) return null;

    const userScopeValues: string[] = [];
    user.roles.forEach(role => {
      if (role.scopeValues && role.scopeValues.length > 0) {
        userScopeValues.push(...role.scopeValues);
      }
    });

    // Если scopeValues пустой - полный доступ (null означает "без ограничений")
    if (userScopeValues.length === 0) return null;

    // Извлекаем номера станций из scopeValues формата "{networkCode}-azs-{stationNumber}"
    const stationNumbers = new Set<string>();
    userScopeValues.forEach(scopeValue => {
      const parts = scopeValue.split('-azs-');
      if (parts.length === 2) {
        stationNumbers.add(parts[1]);
      }
    });

    return stationNumbers.size > 0 ? stationNumbers : null;
  }, [user?.roles]);

  // Управление фильтрами через кастомный хук
  const {
    filters,
    debouncedFilters,
    setSelectedFuelType,
    setSelectedPaymentMethod,
    setSelectedStatus,
    setDateFrom,
    setDateTo,
    setSearchQuery,
    setSelectedKpiFuels,
    setSelectedKpiPayments,
    clearFilters,
    handleKpiFuelClick,
    handleKpiPaymentClick
  } = useOperationsFilters();

  const {
    selectedFuelType,
    selectedPaymentMethod,
    selectedStatus,
    dateFrom,
    dateTo,
    searchQuery,
    selectedKpiFuels,
    selectedKpiPayments
  } = filters;

  const {
    dateFrom: debouncedDateFrom,
    dateTo: debouncedDateTo,
    searchQuery: debouncedSearchQuery
  } = debouncedFilters;

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
  const [stsError, setStsError] = useState<string | null>(null);

  // Модальное окно деталей операции
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Фильтр по номеру поста (POS)
  const [selectedPosNumber, setSelectedPosNumber] = useState("Все");

  // Состояние раскрытия фильтров
  const [filtersOpen, setFiltersOpen] = useState(true);

  
  // Pull-to-refresh состояния
  const [pullState, setPullState] = useState('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startTouchRef = useRef(null);
  const rafId = useRef(null);
  const scrollContainerRef = useRef(null);
  const lastAutoLoadKeyRef = useRef<string | null>(null);
  const currentRequestIdRef = useRef(0);


  // Обработчики экспорта
  const handleExportToExcel = () => {
    exportToExcel({
      operations: filteredOperations,
      dateFrom,
      dateTo,
      networkName: selectedNetwork?.name,
      tradingPointName: typeof selectedTradingPoint === 'string'
        ? (selectedTradingPoint === 'all' ? 'Все торговые точки' : selectedTradingPoint)
        : selectedTradingPoint?.name,
      isMobile
    });
  };

  const handleExportToPdf = () => {
    exportToPdf({
      operations: filteredOperations,
      dateFrom,
      dateTo,
      networkName: selectedNetwork?.name,
      tradingPointName: typeof selectedTradingPoint === 'string'
        ? (selectedTradingPoint === 'all' ? 'Все торговые точки' : selectedTradingPoint)
        : selectedTradingPoint?.name,
      isMobile
    });
  };

  // Функция загрузки из STS API
  const loadFromStsApi = async (force = false) => {
    if (!selectedNetwork?.external_id) {
      if (!isMobile) alert('Выберите сеть с настроенным external_id для загрузки из STS API');
      return;
    }

    const stationScope = isAllTradingPoints ? 'all' : (selectedTradingPoint || '');
    const loadKey = `${selectedNetwork.external_id}|${stationScope}|${dateFrom}|${dateTo}`;

    if (!force && lastAutoLoadKeyRef.current === loadKey) {
      return;
    }

    lastAutoLoadKeyRef.current = loadKey;
    const requestId = ++currentRequestIdRef.current;

    setLoadingFromSTS(true);
    setStsError(null);
    try {
      let transactions;

      // Если выбрано "Все торговые точки"
      if (isAllTradingPoints) {
        // Загружаем транзакции для всех станций сети через v2 API
        transactions = await stsApiService.getTransactions(
          dateFrom,
          dateTo,
          0, // Без лимита — статистика по всем транзакциям за период
          {
            networkId: selectedNetwork.external_id
            // tradingPointId не указываем - получим все станции
          }
        );
      } else if (selectedTradingPoint) {
        // Загружаем для конкретной торговой точки
        let tradingPointExternalId: string | null | undefined = undefined;
        let tradingPointName: string | undefined = undefined;

        if (selectedStation?.id === selectedTradingPoint) {
          tradingPointExternalId = selectedStation.external_id;
          tradingPointName = selectedStation.name;
        } else {
          const tradingPoint = await tradingPointsService.getById(selectedTradingPoint, selectedNetwork.id);
          if (!tradingPoint) {
            throw new Error(`Торговая точка с ID ${selectedTradingPoint} не найдена`);
          }
          tradingPointExternalId = tradingPoint.external_id;
          tradingPointName = tradingPoint.name;
        }

        if (tradingPointExternalId === null || tradingPointExternalId === undefined || tradingPointExternalId === '') {
          throw new Error(`У торговой точки "${tradingPointName || selectedTradingPoint}" отсутствует external_id. Настройте его в разделе администрирования.`);
        }

        transactions = await stsApiService.getTransactions(
          dateFrom,
          dateTo,
          0, // Без лимита — статистика по всем транзакциям за период
          {
            networkId: selectedNetwork.external_id,
            tradingPointId: tradingPointExternalId
          }
        );
      } else {
        setLoadingFromSTS(false);
        return;
      }

      // Сортируем транзакции по дате (свежие сверху)
      const sortedTransactions = transactions.sort((a, b) => {
        const dateA = new Date(a.startTime || a.date).getTime();
        const dateB = new Date(b.startTime || b.date).getTime();
        return dateB - dateA; // Убывающий порядок (свежие сверху)
      });

      // Преобразуем STS транзакции в формат № таблицы
      const stsTransactionsWithSource = sortedTransactions.map(tx => {
        // Берем данные из реальной структуры STS API
        const rawTx = tx.apiData || tx; // Используем apiData если есть, иначе сам объект

        return {
          // Основные поля операции
          id: rawTx.id?.toString() || tx.transactionId || rawTx.id,
          status: tx.status || 'completed',
          toNumber: '4', // Номер ТО (фиксированное значение)
          stationNumber: tx.stationNumber || rawTx.stationNumber?.toString(),
          stationName: tx.stationName || rawTx.stationName,
          startTime: rawTx.dt || tx.startTime || tx.date,
          endTime: tx.endTime,

          // Топливо и количество
          fuelType: rawTx.fuel_name || tx.fuelType || '-',
          actualQuantity: parseFloat(rawTx.quantity || tx.volume || '0'), // Фактический отпуск в литрах
          quantity: parseFloat(rawTx.quantity || tx.volume || '0'),
          price: parseFloat(rawTx.price || tx.price || '0'), // Цена за литр
          actualAmount: parseFloat(rawTx.cost || tx.total || '0'), // Фактический отпуск в рублях
          totalCost: parseFloat(rawTx.cost || tx.total || '0'),

          // Оплата и POS - используем трансформированное значение для единообразия с NetworkOverview
          paymentMethod: tx.paymentMethod || rawTx.pay_type?.name || '-',
          posNumber: rawTx.pos?.toString() || '-', // Номер POS из реального API
          cardNumber: rawTx.card || tx.cardNumber || '-',

          // Заказанное количество (order - литры, order_cost - рубли)
          orderedQuantity: parseFloat(rawTx.order || '0'),
          orderedAmount: parseFloat(rawTx.order_cost || '0'),

          // Дополнительные поля - ИСПРАВЛЕНО согласно реальной структуре API
          shiftNumber: rawTx.shift?.toString() || '-', // Смена из реальных данных API
          receiptNumber: rawTx.number?.toString() || '-', // Номер чека из реальных данных API
          operatorName: '-', // В STS API нет информации об операторе
          operationType: 'sale', // По умолчанию продажа, так как в STS API нет типа операции
          pumpId: rawTx.pos || rawTx.nozzle, // Номер ТРК или пистолета
          pumpName: `ТРК-${rawTx.pos || rawTx.nozzle || '?'}`, // Генерируем имя ТРК
          nozzleNumber: rawTx.nozzle?.toString() || '-', // Номер пистолета
          tankNumber: rawTx.tank?.toString() || '-', // Номер резервуара
          duration: tx.duration,

          // Метки для различения источника
          source: 'STS_API',
          isFromStsApi: true,

          // Сохраняем исходные данные STS для отладки
          stsData: tx,
          apiData: rawTx
        };
      });

      if (requestId !== currentRequestIdRef.current) {
        return;
      }

      // Заменяем операции новыми данными из STS API
      setOperations(stsTransactionsWithSource);

    } catch (error: any) {
      if (requestId !== currentRequestIdRef.current) {
        return;
      }

      const msg = error?.message?.includes('502') || error?.message?.includes('503')
        ? 'Сервер STS временно недоступен. Попробуйте обновить через минуту.'
        : error?.message?.includes('Timeout') || error?.message?.includes('timeout')
        ? 'Превышено время ожидания ответа от сервера STS.'
        : `Ошибка загрузки: ${error?.message || 'Неизвестная ошибка'}`;
      setStsError(msg);
      console.error('STS API:', error);
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setLoadingFromSTS(false);
      }
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      localStorage.removeItem('tradeframe_operations');
      localStorage.removeItem('operations');
      
      await operationsService.forceReload();
      
      const data = await operationsService.getAll();
      
      
      setOperations(data);
      
    } catch (error) {
      // Ошибка обработана
    } finally {
      setLoading(false);
    }
  };

  // Функция для настройки STS API с правильными параметрами
  const ensureSTSApiConfigured = () => {
    
    const correctConfig = {
      url: import.meta.env.VITE_STS_API_URL || '',
      username: import.meta.env.VITE_STS_API_USERNAME || '',
      password: import.meta.env.VITE_STS_API_PASSWORD || '',
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
      localStorage.setItem('sts-api-config', JSON.stringify(correctConfig));
    }
    
    return correctConfig;
  };

  // Автоматическая загрузка данных при монтировании компонента
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    // Обеспечиваем правильную настройку STS API
    ensureSTSApiConfigured();
    setStsApiConfigured(true);

    // Автоматически загружаем данные при выборе сети и торговых точек
    if (selectedNetwork?.external_id && (isAllTradingPoints || selectedTradingPoint)) {
      loadFromStsApi();
    }
  }, [isInitialized, selectedTradingPoint, selectedNetwork, isAllTradingPoints, dateFrom, dateTo]);


  // Уникальные номера постов для фильтра (показывать только если > 1)
  const uniquePosNumbers = useMemo(() => {
    const posNums = new Set(
      operations
        .map(op => op.posNumber)
        .filter(p => p && p !== '-')
    );
    return Array.from(posNums).sort();
  }, [operations]);

  const showPosFilter = uniquePosNumbers.length > 1;

  // Базовая фильтрация (исключения и базовые фильтры)
  const baseFilteredOperations = useMemo(() => {
    return operations.filter(record => {
      // Фильтр по доступным станциям (на основе scopeValues роли пользователя)
      if (allowedStationNumbers) {
        const stationNum = String(record.stationNumber || '');
        if (!allowedStationNumbers.has(stationNum)) {
          return false;
        }
      }

      // Исключаем нежелательные способы оплаты
      const excludedPaymentMethods = ['supplier_delivery', 'mobile_payment'];
      if (record.paymentMethod && excludedPaymentMethods.includes(record.paymentMethod)) {
        return false;
      }

      // Фильтр по виду топлива
      if (selectedFuelType !== "Все" && record.fuelType !== selectedFuelType) return false;

      // Фильтр по виду оплаты (обычный селектор - не используется, так как фильтрация через KPI карточки)
      if (selectedPaymentMethod !== "Все") {
        const recordNormalized = normalizePaymentMethod(record.paymentMethod);
        const selectedNormalized = normalizePaymentMethod(selectedPaymentMethod);
        if (recordNormalized !== selectedNormalized) return false;
      }

      // Фильтр по статусу
      if (selectedStatus !== "Все" && record.status !== selectedStatus) return false;

      // Фильтр по номеру поста (POS)
      if (selectedPosNumber !== "Все") {
        const recordPos = record.posNumber?.toString() || '-';
        if (recordPos !== selectedPosNumber) return false;
      }

      return true;
    });
  }, [operations, selectedFuelType, selectedPaymentMethod, selectedStatus, selectedPosNumber, allowedStationNumbers]);

  // Фильтрация по датам (отдельный useMemo с debounced значениями)
  const dateFilteredOperations = useMemo(() => {
    return baseFilteredOperations.filter(record => {
      
      // Фильтр по датам (используем debounced версии)
      if (debouncedDateFrom || debouncedDateTo) {
        const recordDate = new Date(record.startTime);
        // Используем локальную дату вместо UTC для корректной фильтрации
        const recordDateStr = recordDate.getFullYear() + '-' +
          String(recordDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(recordDate.getDate()).padStart(2, '0');

        if (debouncedDateFrom && recordDateStr < debouncedDateFrom) {
          return false;
        }

        if (debouncedDateTo && recordDateStr > debouncedDateTo) {
          return false;
        }
      }

      return true;
    });
  }, [baseFilteredOperations, debouncedDateFrom, debouncedDateTo]);

  // KPI фильтрация (отдельный useMemo для KPI карточек)
  const kpiFilteredOperations = useMemo(() => {
    return dateFilteredOperations.filter(record => {
      
      // KPI фильтры по топливу
      if (selectedKpiFuels.size > 0 && !selectedKpiFuels.has(record.fuelType)) {
        return false;
      }

      // KPI фильтры по способу оплаты (динамическая группировка через normalizePaymentMethod)
      if (selectedKpiPayments.size > 0) {
        const recordNormalized = normalizePaymentMethod(record.paymentMethod || '');
        if (!selectedKpiPayments.has(recordNormalized)) return false;
      }

      return true;
    });
  }, [dateFilteredOperations, selectedKpiFuels, selectedKpiPayments]);

  // Финальная фильтрация с поиском и сортировкой
  const filteredOperations = useMemo(() => {
    let filtered = kpiFilteredOperations;

    // Применяем поиск если есть запрос
    // Поддерживает запросы вида: "9 смена 6 азс", "смена 125", "азс 3", "чек 42", "карта 1234"
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase().trim();

      // Извлекаем именованные фильтры: "смена X", "X смена", "азс X", "X азс", "чек X", "карта X"
      const fieldFilters: { field: string; value: string }[] = [];
      let remainingQuery = query;

      // Паттерны: ключевое_слово + число ИЛИ число + ключевое_слово
      // Важно: каждый паттерн работает по remainingQuery чтобы избежать перекрытий
      // (например "смена 9 азс 6" — "9 азс" не должно матчиться как станция)
      const patterns = [
        { regex: /(?:смена|shift)\s+(\d+)/i, field: 'shiftNumber' },
        { regex: /(\d+)\s+(?:смена|shift)/i, field: 'shiftNumber' },
        { regex: /(?:азс|станция|station|тт)\s+(\d+)/i, field: 'stationNumber' },
        { regex: /(\d+)\s+(?:азс|станция|station|тт)/i, field: 'stationNumber' },
        { regex: /(?:чек|receipt)\s+(\d+)/i, field: 'receiptNumber' },
        { regex: /(\d+)\s+(?:чек|receipt)/i, field: 'receiptNumber' },
        { regex: /(?:карта|card)\s+(\S+)/i, field: 'cardNumber' },
        { regex: /(?:pos|пос)\s+(\d+)/i, field: 'posNumber' },
      ];

      for (const { regex, field } of patterns) {
        const match = remainingQuery.match(regex);
        if (match) {
          fieldFilters.push({ field, value: match[1] });
          remainingQuery = remainingQuery.replace(match[0], ' ');
        }
      }

      // Оставшийся текст после удаления распознанных паттернов
      const remainingTokens = remainingQuery.trim().split(/\s+/).filter(t => t.length > 0);

      if (fieldFilters.length > 0) {
        // Если есть именованные фильтры — используем точное сравнение по полям
        filtered = filtered.filter(record => {
          for (const { field, value } of fieldFilters) {
            const recordValue = record[field]?.toString() || '';
            if (recordValue !== value && !recordValue.includes(value)) return false;
          }
          // Оставшиеся токены ищем как подстроку по всем полям
          for (const token of remainingTokens) {
            const matchesAny =
              record.id?.toLowerCase().includes(token) ||
              record.fuelType?.toLowerCase().includes(token) ||
              record.cardNumber?.toLowerCase().includes(token) ||
              record.tradingPointName?.toLowerCase().includes(token);
            if (!matchesAny) return false;
          }
          return true;
        });
      } else {
        // Обычный поиск подстрокой по всем полям
        filtered = filtered.filter(record => (
          record.id?.toLowerCase().includes(query) ||
          (record.details && record.details.toLowerCase().includes(query)) ||
          (record.tradingPointName && record.tradingPointName.toLowerCase().includes(query)) ||
          (record.shiftNumber && record.shiftNumber.toString().includes(query)) ||
          (record.cardNumber && record.cardNumber.toLowerCase().includes(query)) ||
          (record.receiptNumber && record.receiptNumber.toString().includes(query)) ||
          (record.stationNumber && record.stationNumber.toString().includes(query))
        ));
      }
    }

    // Сортировка по дате (свежие сверху)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.startTime).getTime();
      const dateB = new Date(b.startTime).getTime();
      return dateB - dateA; // Убывающий порядок (свежие сверху)
    });
  }, [kpiFilteredOperations, debouncedSearchQuery]);
  
  // Пагинация №
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
    if (selectedNetwork && (isAllTradingPoints || selectedTradingPoint)) {
      await loadFromStsApi(true);
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

    // Игнорируем touch события от input элементов (датапикеры, поиск)
    const target = e.target;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[role="combobox"]') ||
      target.closest('.date-input') ||
      target.closest('.search-input')
    )) {
      return;
    }

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

    // Дополнительная проверка для input элементов
    const target = e.target;
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('input') ||
      target.closest('select')
    )) {
      return;
    }

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

  // Сброс всех фильтров (включая KPI)
  const handleKpiResetAll = () => {
    clearFilters();
  };

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFuelType, selectedPaymentMethod, selectedStatus, selectedPosNumber, debouncedDateFrom, debouncedDateTo, debouncedSearchQuery, selectedKpiFuels, selectedKpiPayments]);

  // Списки для селекторов
  const fuelTypes = useMemo(() => {
    const types = new Set(operations.map(op => op.fuelType).filter(Boolean));
    return ["Все", ...Array.from(types).sort()];
  }, [operations]);

  const paymentMethods = useMemo(() => {
    // Получаем все уникальные нормализованные способы оплаты из операций
    const normalizedMethods = new Set(
      operations
        .filter(op => op.paymentMethod)
        .map(op => normalizePaymentMethod(op.paymentMethod))
        .filter(method => method !== '-')
    );

    return ["Все", ...Array.from(normalizedMethods).sort()];
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


  // Loading state пока контекст не инициализирован
  if (!isInitialized) {
    return (
      <MainLayout fullWidth={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Инициализация данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-x-hidden ${isMobileForced ? 'pt-4' : 'pt-6'} min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`}
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
        <div className="mb-6 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-white">Операции</h1>
            <div className="flex items-center gap-2">
              {filteredOperations.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-emerald-600 hover:text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Экспорт
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-slate-800 border-slate-600 shadow-xl rounded-lg">
                  <DropdownMenuItem onClick={handleExportToExcel} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium">Экспорт в Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportToPdf} className="flex items-center gap-2 hover:bg-slate-700 cursor-pointer py-2.5">
                    <FileText className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium">Экспорт в PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
          </div>
        </div>

        {/* Компактные фильтры */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
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
                      setSelectedStatus("Все");
                      setSelectedPosNumber("Все");
                      setSearchQuery("");
                      setDateFrom(() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday.toISOString().split('T')[0];
                      });
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
                      loadFromStsApi(true);
                    }}
                    disabled={loading || loadingFromSTS}
                    className="border-slate-600 text-white hover:bg-slate-700"
                  >
                    <RefreshCw className={`w-4 h-4 ${(loading || loadingFromSTS) ? 'animate-spin' : ''}`} />
                  </Button>
                  {filtersOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 border-t border-slate-700">
                <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                  {/* Дата от */}
                  <div>
                    <Label htmlFor="date-from" className="text-xs text-slate-400">Дата от</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {/* Дата до */}
                  <div>
                    <Label htmlFor="date-to" className="text-xs text-slate-400">Дата до</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>

                  {/* Статус */}
                  <div>
                    <Label htmlFor="status" className="text-xs text-slate-400">Статус</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger id="status" className="mt-1">
                        <SelectValue placeholder="Все" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusTypes.map((status) => (
                          <SelectItem key={status} value={status}>
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

                  {/* Пост (POS) — показывается только для многопостовых станций */}
                  {showPosFilter && (
                    <div>
                      <Label htmlFor="pos-number" className="text-xs text-slate-400">Пост</Label>
                      <Select value={selectedPosNumber} onValueChange={setSelectedPosNumber}>
                        <SelectTrigger id="pos-number" className="mt-1">
                          <SelectValue placeholder="Все" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Все">Все</SelectItem>
                          {uniquePosNumbers.map((pos) => (
                            <SelectItem key={pos} value={pos}>Пост {pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Поиск */}
                  <div>
                    <Label htmlFor="search" className="text-xs text-slate-400">Поиск</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="смена 9 азс 6, ID, карта..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* СТАРЫЙ КОД ФИЛЬТРОВ - УДАЛИТЬ */}
        <div style={{ display: 'none' }}>
          <CardContent className={`${isMobileForced ? 'p-4' : 'p-6'}`}>
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
                    <Label htmlFor="status" className="text-slate-300 text-sm font-medium mb-2 block">Статус №</Label>
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
        </div>
        {/* КОНЕЦ СТАРОГО КОДА ФИЛЬТРОВ */}


        {/* KPI карточки */}
        {!loading && !loadingFromSTS && operations.length > 0 && (
          <div className="space-y-4">
            {/* Карточки по видам топлива — одна строка */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <h3 className={`text-slate-300 font-medium ${isMobileForced ? 'text-sm' : 'text-base'}`}>Виды топлива</h3>
                <span className="text-xs text-slate-500">выберите один или несколько элементов</span>
              </div>
              <div className={`grid gap-3 ${isMobileForced ? 'grid-cols-2' : ''}`} style={isMobileForced ? undefined : { gridTemplateColumns: `repeat(${Math.min([...new Set(operations.map(op => op.fuelType).filter(Boolean))].length, 6)}, 1fr)` }}>
                {[...new Set(operations.map(op => op.fuelType).filter(Boolean))].map(fuel => {
                  const filteredFuelOps = filteredOperations.filter(op => op.fuelType === fuel && op.status === 'completed');
                  const filteredVolume = filteredFuelOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                  const filteredRevenue = filteredFuelOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                  const isSelected = selectedKpiFuels.has(fuel);

                  return (
                    <KPIFuelCard
                      key={fuel}
                      fuel={fuel}
                      isSelected={isSelected}
                      isMobile={isMobileForced}
                      volume={filteredVolume}
                      cost={filteredRevenue}
                      transactionCount={filteredFuelOps.length}
                      onClick={handleKpiFuelClick}
                    />
                  );
                })}
              </div>
            </div>

            {/* Карточки по способам оплаты — топ-4 крупные + остальные мелкие */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <h3 className={`text-slate-300 font-medium ${isMobileForced ? 'text-sm' : 'text-base'}`}>Способы оплаты</h3>
                <span className="text-xs text-slate-500">выберите один или несколько элементов</span>
              </div>
              {(() => {
                const paymentGroups = new Map<string, Set<string>>();
                operations.forEach(op => {
                  if (op.paymentMethod && op.status === 'completed') {
                    const raw = op.paymentMethod.toLowerCase();
                    const normalized = normalizePaymentMethod(op.paymentMethod);
                    if (!paymentGroups.has(normalized)) {
                      paymentGroups.set(normalized, new Set());
                    }
                    paymentGroups.get(normalized)!.add(raw);
                  }
                });

                const cards = Array.from(paymentGroups.entries())
                  .map(([display, rawValues]) => {
                    const rawArr = Array.from(rawValues);
                    const filteredPaymentOps = filteredOperations.filter(op =>
                      rawArr.includes(op.paymentMethod?.toLowerCase()) && op.status === 'completed'
                    );
                    const filteredRevenue = filteredPaymentOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);
                    const filteredVolume = filteredPaymentOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                    const isSelected = selectedKpiPayments.has(display);
                    return { key: display, display, filteredPaymentOps, filteredRevenue, filteredVolume, isSelected };
                  })
                  .filter(card => card.filteredPaymentOps.length > 0)
                  .sort((a, b) => b.filteredRevenue - a.filteredRevenue);

                // Основные 4 типа оплаты — всегда в первом ряду
                const primaryTypes = ['Банковские', 'Наличные', 'Онлайн', 'Корп. карты'];
                const topCards = primaryTypes
                  .map(name => cards.find(c => c.key === name))
                  .filter(Boolean) as typeof cards;
                const topKeys = new Set(topCards.map(c => c.key));
                const restCards = cards.filter(c => !topKeys.has(c.key));

                return (
                  <div className="space-y-3">
                    {/* Топ-4 — крупные карточки */}
                    <div className={`grid gap-3 ${isMobileForced ? 'grid-cols-2' : 'grid-cols-4'}`}>
                      {topCards.map(({ key, display, filteredPaymentOps, filteredRevenue, filteredVolume, isSelected }) => (
                        <KPIPaymentCard
                          key={key}
                          paymentKey={key}
                          display={display}
                          isSelected={isSelected}
                          isMobile={isMobileForced}
                          volume={filteredVolume}
                          cost={filteredRevenue}
                          transactionCount={filteredPaymentOps.length}
                          onClick={handleKpiPaymentClick}
                        />
                      ))}
                    </div>
                    {/* Остальные — название, при выборе раскрываются данные */}
                    {restCards.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {restCards.map(({ key, display, filteredPaymentOps, filteredRevenue, filteredVolume, isSelected }) => (
                          <button
                            key={key}
                            onClick={() => handleKpiPaymentClick(key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {display}
                            {isSelected && (
                              <span className="ml-1.5 opacity-90">
                                {filteredPaymentOps.length} · {filteredVolume >= 1000 ? `${(filteredVolume / 1000).toFixed(1)}K` : filteredVolume.toFixed(0)} л · {filteredRevenue >= 1000 ? `${(filteredRevenue / 1000).toFixed(1)}K` : filteredRevenue.toFixed(0)} ₽
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Итоговая карточка */}
            <div className="space-y-2">
              <div className="flex items-center px-2">
                <h3 className={`text-slate-300 font-medium ${isMobileForced ? 'text-sm' : 'text-base'} mr-4`}>Итого</h3>
                {!isMobileForced && (
                  <span className="text-sm">
                    {(() => {
                      const selectedFuels = Array.from(selectedKpiFuels);
                      const selectedPayments = Array.from(selectedKpiPayments).map(method =>
                        normalizePaymentMethod(method));

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
                )}
              </div>
              <div className={`grid ${isMobileForced ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {(() => {
                    const totalOps = filteredOperations.filter(op => op.status === 'completed');
                    const totalVolume = totalOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                    const totalRevenue = totalOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);

                    const hasActiveFilters = selectedKpiFuels.size > 0 || selectedKpiPayments.size > 0;
                    return (
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          hasActiveFilters
                            ? 'bg-slate-700 border-slate-500 border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                            : 'bg-slate-800 border-slate-600 hover:bg-slate-700'
                        }`}
                        onClick={hasActiveFilters ? handleKpiResetAll : undefined}
                      >
                        <CardContent className={`${isMobileForced ? 'p-3' : 'p-4'}`}>
                          {isMobileForced ? (
                            <div className="relative">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <p className="text-slate-100 font-semibold text-xs truncate">Итого</p>
                                  <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-slate-400" />
                                    <span className="text-slate-200 text-xs font-medium">{totalOps.length}</span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="text-slate-200 text-xs font-semibold">{totalVolume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
                                  <div className="text-slate-200 text-xs font-semibold">{totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-100 font-semibold text-base truncate pr-2">Итого</p>
                                <div className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-slate-400" />
                                  <span className="text-slate-300 text-sm">{totalOps.length}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-slate-200 text-sm font-semibold">{totalVolume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
                                <div className="text-slate-200 text-sm font-semibold">{totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
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

        {/* Ошибка загрузки STS */}
        {stsError && !loadingFromSTS && (
          <Card className="bg-red-950/50 border border-red-800/50 rounded-lg">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{stsError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFromStsApi(true)}
                className="border-red-700 text-red-300 hover:bg-red-900/50 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Повторить
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Таблица № */}
        {!loading && !loadingFromSTS && (
          <Card className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg ${isMobileForced ? 'mx-0 mt-1' : ''}`}>
            <CardHeader className={`${isMobileForced ? 'px-3 py-1.5' : 'pb-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-slate-200 flex items-center gap-2 ${isMobileForced ? 'text-base' : 'text-xl'}`}>
                    <FileText className={`${isMobileForced ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    Операции
                  </CardTitle>
                  <p className={`text-slate-400 ${isMobileForced ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                    {isMobileForced
                      ? <>Показано {paginatedOperations.length} из {filteredOperations.length}{totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}</>
                      : <>Всего операций: {filteredOperations.length}</>
                    }
                  </p>
                </div>
              
              
              {/* Пагинация только на мобильном — десктоп использует виртуализированный скролл */}
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
                        <th className="px-2 py-2 text-center font-medium">Дата</th>
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
                          <td className="px-2 py-2">
                            {record.fuelType ? (
                              <Badge variant="outline" className="bg-slate-700 text-white border-slate-600">
                                {record.fuelType}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-2 text-white text-right font-mono">
                            {record.actualQuantity ? `${record.actualQuantity.toFixed(2)}л` :
                             record.quantity ? `${record.quantity.toFixed(2)}л` : '-'}
                          </td>
                          <td className="px-2 py-2 text-white text-right font-mono font-bold">
                            {record.actualAmount ? `${record.actualAmount.toFixed(2)}₽` :
                             record.totalCost ? `${record.totalCost.toFixed(2)}₽` : '-'}
                          </td>
                          <td className="px-2 py-2 text-center text-white text-xs">
                            {(() => {
                              try {
                                const dateStr = record.timestamp || record.createdAt || record.startTime || record.date;
                                if (!dateStr) return '--';
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return '--';
                                return date.toLocaleDateString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit'
                                });
                              } catch (error) {
                                return '--';
                              }
                            })()}
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
                        <span>Загрузка №...</span>
                      </div>
                    ) : (
                      'Нет № по выбранным фильтрам'
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
            // Desktop: Виртуализированная таблица для оптимальной производительности
            <div className="space-y-4">
              {filteredOperations.length === 0 ? (
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
              ) : (
                <VirtualizedOperationsTable
                  operations={filteredOperations}
                  onRowClick={(operation) => {
                    setSelectedOperation(operation);
                    setIsDetailsOpen(true);
                  }}
                />
              )}
            </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Модальное окно с деталями операции */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-sm mx-auto bg-slate-800 border border-slate-600 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-white">
              Операция #{selectedOperation?.id?.slice(-8)}
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm">
              {selectedNetwork?.name || 'Сеть'}{selectedOperation?.stationNumber ? ` • АЗС ${selectedOperation.stationNumber}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Статус:</span>
                  <div>{getStatusBadge(selectedOperation.status)}</div>
                </div>


                <div className="flex justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Время начала:</span>
                  <span className="text-white font-mono text-xs">
                    {new Date(selectedOperation.startTime).toLocaleString('ru-RU')}
                  </span>
                </div>


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
                    {normalizePaymentMethod(selectedOperation.paymentMethod)}
                  </span>
                </div>

                {selectedOperation.posNumber && selectedOperation.posNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер POS:</span>
                    <span className="text-white font-mono">{selectedOperation.posNumber}</span>
                  </div>
                )}


                {selectedOperation.nozzleNumber && selectedOperation.nozzleNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер пистолета:</span>
                    <span className="text-white font-mono">{selectedOperation.nozzleNumber}</span>
                  </div>
                )}

                {selectedOperation.tankNumber && selectedOperation.tankNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер резервуара:</span>
                    <span className="text-white font-mono">{selectedOperation.tankNumber}</span>
                  </div>
                )}

                {selectedOperation.shiftNumber && selectedOperation.shiftNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер смены:</span>
                    <span className="text-white font-mono">{selectedOperation.shiftNumber}</span>
                  </div>
                )}

                {selectedOperation.receiptNumber && selectedOperation.receiptNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Номер чека:</span>
                    <span className="text-white font-mono">{selectedOperation.receiptNumber}</span>
                  </div>
                )}

                {selectedOperation.orderedQuantity > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Заказ (литры):</span>
                    <span className="text-white font-mono">{selectedOperation.orderedQuantity.toFixed(2)} л</span>
                  </div>
                )}

                {selectedOperation.orderedAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Заказ (сумма):</span>
                    <span className="text-white font-mono">{selectedOperation.orderedAmount.toFixed(2)} ₽</span>
                  </div>
                )}

                {selectedOperation.operationType && selectedOperation.operationType !== '-' && (
                  <div className="flex justify-between py-2 border-b border-slate-700">
                    <span className="text-slate-400">Тип операции:</span>
                    <span className="text-white font-medium">{selectedOperation.operationType}</span>
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
