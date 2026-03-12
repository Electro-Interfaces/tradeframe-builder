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
import { todayString, daysAgoString } from "@/utils/dateUtils";
import { useOperationsFilters } from "@/hooks/useOperationsFilters";
import { useSelectedNetworks } from "@/hooks/useSelectedNetworks";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

export default function OperationsTransactionsPageSimple() {
  const { selectedNetwork, selectedNetworkIds, selectedTradingPoint, selectedStation, isAllTradingPoints, isInitialized, selectedTradingPoints } = useSelection();
  const { selectedExternalIds } = useSelectedNetworks();
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
    if (selectedExternalIds.length === 0) {
      if (!isMobile) alert('Выберите сеть с настроенным external_id для загрузки из STS API');
      return;
    }

    const stationScope = isAllTradingPoints ? 'all' : (selectedTradingPoint || '');
    const loadKey = `${selectedExternalIds.join(',')}|${stationScope}|${dateFrom}|${dateTo}`;

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
        // Загружаем транзакции для всех станций по всем выбранным сетям
        const results = await Promise.all(
          selectedExternalIds.map(networkId =>
            stsApiService.getTransactions(dateFrom, dateTo, 0, { networkId }).catch(() => [] as any[])
          )
        );
        transactions = results.flat();

        // Всегда фильтруем по справочнику станций — STS может возвращать станции, не зарегистрированные в системе
        if (selectedNetworkIds.length > 0) {
          try {
            const allNetworkPoints = (await Promise.all(
              selectedNetworkIds.map(id => tradingPointsService.getByNetworkId(id).catch(() => []))
            )).flat();
            const relevantPoints = selectedTradingPoints.length > 0 && selectedTradingPoints.length < allNetworkPoints.length
              ? allNetworkPoints.filter(p => selectedTradingPoints.includes(p.id))
              : allNetworkPoints;
            const allowedExtIds = new Set(
              relevantPoints.map(p => p.external_id).filter(Boolean)
            );
            transactions = transactions.filter((t: any) =>
              allowedExtIds.has(String(t.stationNumber))
            );
          } catch { /* ignore */ }
        }
      } else if (selectedTradingPoint) {
        // Загружаем для конкретной торговой точки
        let tradingPointExternalId: string | null | undefined = undefined;
        let tradingPointName: string | undefined = undefined;

        if (selectedStation?.id === selectedTradingPoint) {
          tradingPointExternalId = selectedStation.external_id;
          tradingPointName = selectedStation.name;
        } else {
          const tradingPoint = await tradingPointsService.getById(selectedTradingPoint, selectedNetwork?.id);
          if (!tradingPoint) {
            throw new Error(`Торговая точка с ID ${selectedTradingPoint} не найдена`);
          }
          tradingPointExternalId = tradingPoint.external_id;
          tradingPointName = tradingPoint.name;
        }

        if (tradingPointExternalId === null || tradingPointExternalId === undefined || tradingPointExternalId === '') {
          throw new Error(`У торговой точки "${tradingPointName || selectedTradingPoint}" отсутствует external_id. Настройте его в разделе администрирования.`);
        }

        // Загружаем по всем выбранным сетям с этой торговой точкой
        const results = await Promise.all(
          selectedExternalIds.map(networkId =>
            stsApiService.getTransactions(dateFrom, dateTo, 0, {
              networkId,
              tradingPointId: tradingPointExternalId!
            }).catch(() => [] as any[])
          )
        );
        transactions = results.flat();
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
    if (selectedExternalIds.length > 0 && (isAllTradingPoints || selectedTradingPoint)) {
      loadFromStsApi();
    }
  }, [isInitialized, selectedTradingPoint, selectedExternalIds, isAllTradingPoints, dateFrom, dateTo]);


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

  // Pull-to-refresh через переиспользуемый хук
  const handleRefreshData = async () => {
    if (selectedNetwork && (isAllTradingPoints || selectedTradingPoint)) {
      await loadFromStsApi(true);
    }
  };

  const INDICATOR_APPEAR_THRESHOLD = 30;

  const { pullState, pullDistance, scrollContainerRef } = usePullToRefresh({
    onRefresh: handleRefreshData,
    enabled: isMobile,
    pullThreshold: 80,
    maxPullDistance: 120,
    indicatorAppearThreshold: INDICATOR_APPEAR_THRESHOLD
  });

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
        return <Badge className="bg-secondary text-foreground">Завершено</Badge>;
      case 'in_progress':
        return <Badge className="bg-secondary text-foreground">Выполняется</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Ожидание</Badge>;
      case 'cancelled':
        return <Badge className="bg-secondary text-foreground">Отменено</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCompactStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary text-foreground text-xs px-1 py-0">ОК</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600 text-white text-xs px-1 py-0">В работе</Badge>;
      case 'failed':
        return <Badge className="bg-red-600 text-white text-xs px-1 py-0">Ошибка</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white text-xs px-1 py-0">Ожидает</Badge>;
      case 'cancelled':
        return <Badge className="bg-secondary text-foreground text-xs px-1 py-0">Отмена</Badge>;
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
            <p className="text-muted-foreground">Инициализация данных...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fullWidth={true}>
      <div
        ref={scrollContainerRef}
        className={`w-full space-y-6 px-4 md:px-6 lg:px-8 relative overflow-x-hidden ${isMobile ? 'pt-4' : 'pt-6'} min-h-screen bg-gradient-to-br from-background via-background to-background`}
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
            <div className="bg-white/95 backdrop-blur-sm text-foreground px-4 py-2 rounded-full shadow-lg border border-border/50 flex items-center gap-2">
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
                    className="w-4 h-4 text-muted-foreground"
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
            <h1 className="text-2xl font-semibold text-foreground">Операции</h1>
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
                <DropdownMenuContent align="end" className="w-44 bg-card border-border shadow-xl rounded-lg">
                  <DropdownMenuItem onClick={handleExportToExcel} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Экспорт в Excel</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportToPdf} className="flex items-center gap-2 hover:bg-secondary cursor-pointer py-2.5">
                    <FileText className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium">Экспорт в PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
          </div>
        </div>

        {/* Компактные фильтры */}
        <Card className="bg-card border-border mb-4">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">Фильтры</span>
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
                      setDateFrom(daysAgoString(1));
                      setDateTo(todayString());
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
                    className="border-border text-foreground hover:bg-secondary"
                  >
                    <RefreshCw className={`w-4 h-4 ${(loading || loadingFromSTS) ? 'animate-spin' : ''}`} />
                  </Button>
                  {filtersOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 border-t border-border">
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
                  {/* Дата от */}
                  <div>
                    <Label htmlFor="date-from" className="text-xs text-muted-foreground">Дата от</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Дата до */}
                  <div>
                    <Label htmlFor="date-to" className="text-xs text-muted-foreground">Дата до</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Статус */}
                  <div>
                    <Label htmlFor="status" className="text-xs text-muted-foreground">Статус</Label>
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
                      <Label htmlFor="pos-number" className="text-xs text-muted-foreground">Пост</Label>
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
                  <div className={isMobile ? 'col-span-2' : ''}>
                    <Label htmlFor="search" className="text-xs text-muted-foreground">Поиск</Label>
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
          <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
            {/* Верхняя строка - Статус и Поиск */}
            <div className={`${isMobile ? 'space-y-3 mb-4' : 'grid grid-cols-2 gap-6 mb-4'}`}>
              {/* Статус */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="status" className="text-foreground/80 text-xs font-medium w-14 flex-shrink-0">Статус:</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-secondary border-border text-foreground h-8 text-sm flex-1 min-w-0">
                        <SelectValue placeholder="Все" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {statusTypes.map((status) => (
                          <SelectItem key={status} value={status} className="text-foreground focus:bg-secondary">
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
                    <Label htmlFor="status" className="text-foreground/80 text-sm font-medium mb-2 block">Статус №</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="bg-secondary border-border text-foreground h-10 text-base">
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {statusTypes.map((status) => (
                          <SelectItem key={status} value={status} className="text-foreground focus:bg-secondary">
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
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="search" className="text-foreground/80 text-xs font-medium w-14 flex-shrink-0">Поиск:</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="ID, устройство..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-secondary border-border text-foreground placeholder-muted-foreground h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="search" className="text-foreground/80 text-sm font-medium mb-2 block">Поиск по операциям</Label>
                    <Input
                      id="search"
                      type="text"
                      placeholder="Поиск по ID операции, устройству, номеру ТО..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-secondary border-border text-foreground placeholder-muted-foreground h-10 text-base"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Нижняя строка - Даты */}
            <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-6'}`}>
              {/* Дата начала */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="dateFrom" className="text-foreground/80 text-xs font-medium w-14 flex-shrink-0">С:</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-secondary border-border text-foreground h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateFrom" className="text-foreground/80 text-sm font-medium mb-2 block">Дата начала</Label>
                    <div className="relative">
                      <Input
                        id="dateFrom"
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-secondary border-border text-foreground h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-blue-400 transition-colors pointer-events-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Дата окончания */}
              <div className={`${isMobile ? 'flex items-center gap-3 min-w-0' : ''}`}>
                {isMobile ? (
                  <>
                    <Label htmlFor="dateTo" className="text-foreground/80 text-xs font-medium w-14 flex-shrink-0">По:</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-secondary border-border text-foreground h-8 text-sm flex-1 min-w-0"
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="dateTo" className="text-foreground/80 text-sm font-medium mb-2 block">Дата окончания</Label>
                    <div className="relative">
                      <Input
                        id="dateTo"
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-secondary border-border text-foreground h-10 text-base pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                      />
                      <Calendar
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-blue-400 transition-colors pointer-events-none"
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
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Виды топлива</h3>
                <span className="text-xs text-muted-foreground">выберите один или несколько элементов</span>
              </div>
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : ''}`} style={isMobile ? undefined : { gridTemplateColumns: `repeat(${Math.min([...new Set(operations.map(op => op.fuelType).filter(Boolean))].length, 6)}, 1fr)` }}>
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
                      isMobile={isMobile}
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
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'}`}>Способы оплаты</h3>
                <span className="text-xs text-muted-foreground">выберите один или несколько элементов</span>
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
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
                      {topCards.map(({ key, display, filteredPaymentOps, filteredRevenue, filteredVolume, isSelected }) => (
                        <KPIPaymentCard
                          key={key}
                          paymentKey={key}
                          display={display}
                          isSelected={isSelected}
                          isMobile={isMobile}
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
                                : 'bg-secondary text-foreground/80 hover:bg-secondary'
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
                <h3 className={`text-foreground/80 font-medium ${isMobile ? 'text-sm' : 'text-base'} mr-4`}>Итого</h3>
                {!isMobile && (
                  <span className="text-sm">
                    {(() => {
                      const selectedFuels = Array.from(selectedKpiFuels);
                      const selectedPayments = Array.from(selectedKpiPayments).map(method =>
                        normalizePaymentMethod(method));

                      const allSelected = [...selectedFuels, ...selectedPayments];

                      if (allSelected.length === 0) {
                        return <span className="text-muted-foreground">не выбрано</span>;
                      } else {
                        return (
                          <span>
                            <span className="text-muted-foreground">выбрано: </span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{allSelected.join(', ')}</span>
                          </span>
                        );
                      }
                    })()}
                  </span>
                )}
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {(() => {
                    const totalOps = filteredOperations.filter(op => op.status === 'completed');
                    const totalVolume = totalOps.reduce((sum, op) => sum + (op.quantity || 0), 0);
                    const totalRevenue = totalOps.reduce((sum, op) => sum + (op.totalCost || 0), 0);

                    const hasActiveFilters = selectedKpiFuels.size > 0 || selectedKpiPayments.size > 0;
                    return (
                      <Card
                        className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                          hasActiveFilters
                            ? 'bg-secondary border-border border-2 shadow-[inset_0_-16px_0_0_rgb(37_99_235)]'
                            : 'bg-card border-border hover:bg-secondary'
                        }`}
                        onClick={hasActiveFilters ? handleKpiResetAll : undefined}
                      >
                        <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                          {isMobile ? (
                            <div className="relative">
                              <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                  <p className="text-foreground font-semibold text-xs truncate">Итого</p>
                                  <div className="flex items-center gap-1">
                                    <Activity className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-foreground text-xs font-medium">{totalOps.length}</span>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="text-foreground text-xs font-semibold">{totalVolume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
                                  <div className="text-foreground text-xs font-semibold">{totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground font-semibold text-base truncate pr-2">Итого</p>
                                <div className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-foreground/80 text-sm">{totalOps.length}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-foreground text-sm font-semibold">{totalVolume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} л</div>
                                <div className="text-foreground text-sm font-semibold">{totalRevenue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽</div>
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
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-300 text-sm">{stsError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadFromStsApi(true)}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 hover:bg-red-900/50 flex-shrink-0"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Повторить
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Таблица № */}
        {!loading && !loadingFromSTS && (
          <Card className={`bg-card border border-border rounded-lg shadow-lg ${isMobile ? 'mx-0 mt-1' : ''}`}>
            <CardHeader className={`${isMobile ? 'px-3 py-1.5' : 'pb-4'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-foreground flex items-center gap-2 ${isMobile ? 'text-base' : 'text-xl'}`}>
                    <FileText className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                    Операции
                  </CardTitle>
                  <p className={`text-muted-foreground ${isMobile ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
                    {isMobile
                      ? <>Показано {paginatedOperations.length} из {filteredOperations.length}{totalPages > 1 && ` • Страница ${currentPage} из ${totalPages}`}</>
                      : <>Всего операций: {filteredOperations.length}</>
                    }
                  </p>
                </div>
              
              
              {/* Пагинация только на мобильном — десктоп использует виртуализированный скролл */}
            </div>
          </CardHeader>
          <CardContent className={`${isMobile ? 'px-0 pb-3' : ''}`}>
            {isMobile ? (
              // Mobile compact table layout
              <div>
                <div className="bg-card overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary text-foreground/80 border-b border-border">
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
                          className={`hover:bg-secondary cursor-pointer transition-colors border-b border-border ${index % 2 === 0 ? 'bg-card' : 'bg-secondary'}`}
                          onClick={() => {
                            setSelectedOperation(record);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <td className="px-2 py-2">
                            <div className="flex flex-col">
                              <span className="text-foreground font-mono text-xs truncate" title={record.id}>
                                {record.id.slice(-8)}
                              </span>
                              <div className="mt-0.5">
                                {getCompactStatusBadge(record.status)}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            {record.fuelType ? (
                              <Badge variant="outline" className="bg-secondary text-foreground border-border">
                                {record.fuelType}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-2 text-foreground text-right font-mono">
                            {record.actualQuantity ? `${record.actualQuantity.toFixed(2)}л` :
                             record.quantity ? `${record.quantity.toFixed(2)}л` : '-'}
                          </td>
                          <td className="px-2 py-2 text-foreground text-right font-mono font-bold">
                            {record.actualAmount ? `${record.actualAmount.toFixed(2)}₽` :
                             record.totalCost ? `${record.totalCost.toFixed(2)}₽` : '-'}
                          </td>
                          <td className="px-2 py-2 text-center text-foreground text-xs">
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
                  <div className="text-center py-8 text-muted-foreground">
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
                      className="border-border text-foreground/80 hover:bg-secondary"
                    >
                      ←
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="border-border text-foreground/80 hover:bg-secondary"
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
                <div className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="max-w-sm mx-auto bg-card border border-border text-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-foreground">
              Операция #{selectedOperation?.id?.slice(-8)}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {selectedNetwork?.name || 'Сеть'}{selectedOperation?.stationNumber ? ` • АЗС ${selectedOperation.stationNumber}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Статус:</span>
                  <div>{getStatusBadge(selectedOperation.status)}</div>
                </div>


                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Время начала:</span>
                  <span className="text-foreground font-mono text-xs">
                    {new Date(selectedOperation.startTime).toLocaleString('ru-RU')}
                  </span>
                </div>


                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Вид топлива:</span>
                  <span className="text-foreground font-medium">{selectedOperation.fuelType || '-'}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Количество:</span>
                  <span className="text-foreground font-mono font-bold">
                    {selectedOperation.actualQuantity ? `${selectedOperation.actualQuantity.toFixed(2)} л` :
                     selectedOperation.quantity ? `${selectedOperation.quantity.toFixed(2)} л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Цена за литр:</span>
                  <span className="text-foreground font-mono">
                    {selectedOperation.price ? `${selectedOperation.price.toFixed(2)} ₽/л` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border bg-secondary px-2 -mx-2 rounded">
                  <span className="text-foreground/80 font-medium">Общая сумма:</span>
                  <span className="text-foreground font-mono font-bold text-lg">
                    {selectedOperation.actualAmount ? `${selectedOperation.actualAmount.toFixed(2)} ₽` :
                     selectedOperation.totalCost ? `${selectedOperation.totalCost.toFixed(2)} ₽` : '-'}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Способ оплаты:</span>
                  <span className="text-foreground font-medium">
                    {normalizePaymentMethod(selectedOperation.paymentMethod)}
                  </span>
                </div>

                {selectedOperation.posNumber && selectedOperation.posNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер POS:</span>
                    <span className="text-foreground font-mono">{selectedOperation.posNumber}</span>
                  </div>
                )}


                {selectedOperation.nozzleNumber && selectedOperation.nozzleNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер пистолета:</span>
                    <span className="text-foreground font-mono">{selectedOperation.nozzleNumber}</span>
                  </div>
                )}

                {selectedOperation.tankNumber && selectedOperation.tankNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер резервуара:</span>
                    <span className="text-foreground font-mono">{selectedOperation.tankNumber}</span>
                  </div>
                )}

                {selectedOperation.shiftNumber && selectedOperation.shiftNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер смены:</span>
                    <span className="text-foreground font-mono">{selectedOperation.shiftNumber}</span>
                  </div>
                )}

                {selectedOperation.receiptNumber && selectedOperation.receiptNumber !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Номер чека:</span>
                    <span className="text-foreground font-mono">{selectedOperation.receiptNumber}</span>
                  </div>
                )}

                {selectedOperation.orderedQuantity > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Заказ (литры):</span>
                    <span className="text-foreground font-mono">{selectedOperation.orderedQuantity.toFixed(2)} л</span>
                  </div>
                )}

                {selectedOperation.orderedAmount > 0 && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Заказ (сумма):</span>
                    <span className="text-foreground font-mono">{selectedOperation.orderedAmount.toFixed(2)} ₽</span>
                  </div>
                )}

                {selectedOperation.operationType && selectedOperation.operationType !== '-' && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Тип операции:</span>
                    <span className="text-foreground font-medium">{selectedOperation.operationType}</span>
                  </div>
                )}


                {selectedOperation.isFromStsApi && (
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Источник данных:</span>
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border-blue-600">
                      STS API
                    </Badge>
                  </div>
                )}

                <div className="flex justify-between py-2 text-xs">
                  <span className="text-muted-foreground">ID операции:</span>
                  <span className="text-muted-foreground font-mono">{selectedOperation.id}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
