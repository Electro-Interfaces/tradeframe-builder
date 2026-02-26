/**
 * Сервис для дашборда аналитики сменных отчетов
 *
 * Загружает данные смен и выполняет агрегацию для KPI, графиков и детализации
 */

import { shiftReportsV2Service } from './shiftReportsV2Service';
import type {
  ShiftDetails,
  ShiftListItem,
  GetShiftsParams,
  GetShiftDetailsParams,
} from '@/types/shift-reports-v2';
import type {
  DashboardParams,
  DashboardData,
  DashboardKPIs,
  DashboardTrends,
  ChartData,
  DetailsData,
  TrendValue,
  DailyDataPoint,
  FuelVolumeItem,
  PaymentMethodItem,
  TankUsageItem,
  PointAggregation,
  ShiftAggregation,
  FuelAggregation,
  PeriodSelection,
  PaymentMethodDetails,
  PaymentFuelBreakdown,
  ReceiptsMetrics,
  ReceiptsByFuel,
  ReceiptTTNItem,
  CashoutMetrics,
  CashoutItem,
  CashFlowMetrics,
  CashFlowItem,
} from '@/types/shift-dashboard';
import { stsApiService } from './stsApi';
import type { CashoutRecord, StationCashout } from '@/types/equipment';
import {
  PAYMENT_NAMES,
  getFuelColor,
  getPaymentColor,
} from '@/types/shift-dashboard';
import { classifyPayment } from '@/utils/paymentUtils';

/**
 * Сервис для дашборда аналитики смен
 */
class ShiftDashboardService {
  /**
   * Получить полные данные для дашборда
   */
  async getDashboardData(params: DashboardParams): Promise<DashboardData> {
    // Параллельная загрузка: смены + инкассация + период сравнения
    const compareParams = (params.period.compareEnabled && params.period.compareDateFrom && params.period.compareDateTo)
      ? {
          ...params,
          period: {
            ...params.period,
            dateFrom: params.period.compareDateFrom,
            dateTo: params.period.compareDateTo,
          },
        }
      : null;

    const [shifts, cashoutData, compareShifts] = await Promise.all([
      this.loadShiftsWithDetails(params),
      this.loadCashoutData(params),
      compareParams ? this.loadShiftsWithDetails(compareParams) : Promise.resolve([]),
    ]);

    // Собираем данные о движении наличных из смен
    const cashFlowData = this.calculateCashFlow(shifts);

    // Вычисляем KPI
    const kpis = this.calculateKPIs(shifts, cashoutData, cashFlowData);

    // Вычисляем тренды (если есть данные для сравнения)
    const trends = compareShifts.length > 0
      ? this.calculateTrends(shifts, compareShifts)
      : undefined;

    // Подготавливаем данные для графиков
    const charts = this.prepareChartData(shifts, params.period);

    // Подготавливаем детализацию
    const details = this.prepareDetailsData(shifts);

    return {
      kpis,
      trends,
      charts,
      details,
      shifts,
      meta: {
        period: params.period,
        shiftsLoaded: shifts.length,
        generatedAt: new Date().toISOString(),
        stations: params.stations || (params.station ? [params.station] : undefined),
      },
    };
  }

  /**
   * Загрузить смены с детальной информацией
   */
  private async loadShiftsWithDetails(params: DashboardParams): Promise<ShiftDetails[]> {
    const stations = params.stations || (params.station ? [params.station] : []);
    const stationNames = params.stationNames || {};

    const dateFrom = new Date(params.period.dateFrom);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(params.period.dateTo);
    dateTo.setHours(23, 59, 59, 999);

    // Параллельная загрузка по станциям
    const stationResults = await Promise.all(stations.map(async (station) => {
      const stationName = stationNames[station] || `Станция ${station}`;

      // Получаем список смен
      const shiftsParams: GetShiftsParams = {
        system: params.system,
        station,
        dt_beg: params.period.dateFrom,
        dt_end: params.period.dateTo,
      };

      const shiftsList = await shiftReportsV2Service.getShifts(shiftsParams, stationName);

      // Получаем сырой список смен для передачи shiftInfo в getShiftDetails
      const rawShifts = await import('./shiftsService').then(m =>
        m.shiftsService.getShifts({ system: params.system, station })
      );

      // Фильтруем смены по выбранному периоду
      const filteredShiftsList = shiftsList.filter(shift => {
        const shiftDate = new Date(shift.openedAt);
        return shiftDate >= dateFrom && shiftDate <= dateTo;
      });

      // Загружаем детали batch по 10 с передачей preloaded shiftInfo
      const batchSize = 10;
      const stationShifts: ShiftDetails[] = [];

      for (let i = 0; i < filteredShiftsList.length; i += batchSize) {
        const batch = filteredShiftsList.slice(i, i + batchSize);
        const detailsPromises = batch.map(async (shift) => {
          try {
            const detailsParams: GetShiftDetailsParams = {
              system: params.system,
              station,
              shift: shift.shiftNumber,
            };
            // Передаём preloaded shiftInfo — убираем лишний запрос /v1/shifts
            const shiftInfo = rawShifts.find(s => s.shift === shift.shiftNumber);
            return await shiftReportsV2Service.getShiftDetails(detailsParams, stationName, shiftInfo);
          } catch (error) {
            return null;
          }
        });

        const batchResults = await Promise.all(detailsPromises);
        stationShifts.push(...batchResults.filter((s): s is ShiftDetails => s !== null));
      }

      return stationShifts;
    }));

    return stationResults.flat();
  }

  /**
   * Загрузить данные инкассации за период
   */
  private async loadCashoutData(params: DashboardParams): Promise<CashoutMetrics> {
    try {
      const stations = params.stations || (params.station ? [params.station] : []);
      if (stations.length === 0) {
        return { totalAmount: 0, totalBillAmount: 0, count: 0, details: [] };
      }

      // Фильтруем по периоду
      const dateFrom = new Date(params.period.dateFrom);
      dateFrom.setHours(0, 0, 0, 0);
      const dateTo = new Date(params.period.dateTo);
      dateTo.setHours(23, 59, 59, 999);

      // Загружаем инкассации для всех станций параллельно
      const stationCashouts = await Promise.all(stations.map(async (stationId) => {
        try {
          const cashoutResponse: StationCashout[] = await stsApiService.getCashoutHistory({
            networkId: String(params.system),
            tradingPointId: String(stationId),
          });
          return cashoutResponse;
        } catch {
          return [];
        }
      }));

      const details: CashoutItem[] = [];
      let totalAmount = 0;
      let totalBillAmount = 0;

      for (const cashoutResponse of stationCashouts) {
        for (const stationData of cashoutResponse) {
          for (const record of stationData.cashout || []) {
            const recordDate = new Date(record.dt);

            if (recordDate >= dateFrom && recordDate <= dateTo) {
              details.push({
                shiftNumber: record.shift,
                posNumber: record.pos,
                cashoutNumber: record.cashoutno,
                datetime: record.dt,
                totalAmount: record.value,
                billAmount: record.billsum,
              });
              totalAmount += record.value;
              totalBillAmount += record.billsum;
            }
          }
        }
      }

      // Сортируем по дате (новые сверху)
      details.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

      return {
        totalAmount,
        totalBillAmount,
        count: details.length,
        details,
      };
    } catch (error) {
      return { totalAmount: 0, totalBillAmount: 0, count: 0, details: [] };
    }
  }

  // getPaymentType удалён — используется classifyPayment() из paymentUtils

  /**
   * Вычислить метрики движения наличных
   */
  calculateCashFlow(shifts: ShiftDetails[]): CashFlowMetrics {
    const details: CashFlowItem[] = [];
    let openingBalance = 0;
    let closingBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    // Собираем все операции из cashMovements
    for (const shift of shifts) {
      if (shift.cashMovements && shift.cashMovements.length > 0) {
        for (const movement of shift.cashMovements) {
          details.push({
            id: movement.id,
            datetime: movement.datetime,
            operationType: movement.operationType,
            amount: movement.amount,
            description: movement.description,
            posNumber: movement.posNumber,
            shiftNumber: shift.shiftNumber,
            stationCode: shift.stationCode,
          });

          switch (movement.operationType) {
            case 'opening':
              openingBalance += movement.amount;
              break;
            case 'closing':
              closingBalance += movement.amount;
              break;
            case 'income':
              totalIncome += movement.amount;
              break;
            case 'expense':
              totalExpense += movement.amount;
              break;
          }
        }
      }
    }

    // Если нет данных о движении, используем выручку наличными как приход
    if (details.length === 0) {
      for (const shift of shifts) {
        if (shift.cashRevenue > 0) {
          totalIncome += shift.cashRevenue;
          details.push({
            id: `cash-${shift.id}`,
            datetime: shift.openedAt,
            operationType: 'income',
            amount: shift.cashRevenue,
            description: `Выручка наличными (смена №${shift.shiftNumber})`,
            shiftNumber: shift.shiftNumber,
            stationCode: shift.stationCode,
          });
        }
      }
    }

    // Сортируем по дате (новые сверху)
    details.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    // Расчетный остаток
    const calculatedBalance = openingBalance + totalIncome - totalExpense;
    // Разница (если closingBalance = 0, то считаем что фактический = расчетный)
    const difference = closingBalance > 0 ? closingBalance - calculatedBalance : 0;

    return {
      openingBalance,
      totalIncome,
      totalExpense,
      closingBalance: closingBalance > 0 ? closingBalance : calculatedBalance,
      calculatedBalance,
      difference,
      operationsCount: details.length,
      details,
    };
  }

  /**
   * Вычислить KPI метрики
   */
  calculateKPIs(shifts: ShiftDetails[], cashoutData?: CashoutMetrics, cashFlowData?: CashFlowMetrics): DashboardKPIs {
    // Агрегация по топливам
    const fuelMap = new Map<number, { volume: number; revenue: number; name: string }>();

    // Агрегация по способам оплаты с разбивкой по топливам (динамическая)
    // Структура: paymentType -> fuelCode -> { volume, revenue, name }
    const paymentFuelMap = new Map<string, Map<number, { volume: number; revenue: number; name: string }>>();

    const financial = {
      totalRevenue: 0,
      averageCheck: 0,
      cashRevenue: 0,
      cardRevenue: 0,
      sbpRevenue: 0,
      fuelCardRevenue: 0,
      corporateCardRevenue: 0,
      otherRevenue: 0,
      paymentDetails: {} as Record<string, PaymentMethodDetails>,
    };

    const volume = {
      totalVolume: 0,
      byFuel: [] as FuelVolumeItem[],
      totalReceipts: 0,
      tankDispensed: 0,
    };

    const operational = {
      shiftsCount: shifts.length,
      transactionCount: 0,
      averageShiftDuration: 0,
      openShiftsCount: 0,
      shiftsWithDiscrepancies: 0,
    };

    let totalDuration = 0;
    let closedShiftsCount = 0;

    for (const shift of shifts) {
      // Финансовые метрики (базовые)
      financial.totalRevenue += shift.totalRevenue;
      financial.cashRevenue += shift.cashRevenue;
      financial.cardRevenue += shift.cardRevenue;
      financial.sbpRevenue += shift.sbpRevenue;
      financial.fuelCardRevenue += shift.fuelCardRevenue;
      financial.corporateCardRevenue += shift.corporateCardRevenue || 0;
      financial.otherRevenue += shift.otherRevenue;

      // Объемные метрики
      volume.totalVolume += shift.totalVolume;

      // Агрегация по топливам из fuelSales
      if (shift.fuelSales) {
        for (const fuel of shift.fuelSales) {
          const existing = fuelMap.get(fuel.fuelCode);
          if (existing) {
            existing.volume += fuel.quantity;
            existing.revenue += fuel.cost;
          } else {
            fuelMap.set(fuel.fuelCode, {
              volume: fuel.quantity,
              revenue: fuel.cost,
              name: fuel.fuelName,
            });
          }
        }
      }

      // Агрегация по способам оплаты с разбивкой по топливам из salesRaw
      const salesRaw = (shift as any).salesRaw;
      if (salesRaw && Array.isArray(salesRaw)) {
        for (const sale of salesRaw) {
          const payTypeName = sale.pay_type?.name || '';
          const paymentType = classifyPayment(payTypeName);

          if (paymentType !== 'other' && sale.fuel && Array.isArray(sale.fuel)) {
            // Динамическое создание записи в Map для нового типа оплаты
            if (!paymentFuelMap.has(paymentType)) {
              paymentFuelMap.set(paymentType, new Map());
            }
            const paymentFuels = paymentFuelMap.get(paymentType)!;

            for (const fuelItem of sale.fuel) {
              const fuelCode = fuelItem.service?.service_code || 0;
              const fuelName = fuelItem.service?.service_name || 'Неизвестно';
              // Купоны в API имеют отрицательные значения (выдача ранее оплаченного топлива)
              // Берём абсолютное значение для корректного отображения объёма
              const rawVolume = parseFloat(fuelItem.release?.volume || '0');
              const rawRevenue = parseFloat(fuelItem.release?.cost || '0');
              const fuelVolume = paymentType === 'coupon' ? Math.abs(rawVolume) : rawVolume;
              const fuelRevenue = paymentType === 'coupon' ? Math.abs(rawRevenue) : rawRevenue;

              const existing = paymentFuels.get(fuelCode);
              if (existing) {
                existing.volume += fuelVolume;
                existing.revenue += fuelRevenue;
              } else {
                paymentFuels.set(fuelCode, {
                  volume: fuelVolume,
                  revenue: fuelRevenue,
                  name: fuelName,
                });
              }
            }
          }
        }
      }

      // Поступления
      if (shift.receipts) {
        volume.totalReceipts += shift.receipts.reduce((sum, r) => sum + (r.volume || 0), 0);
      }

      // Резервуары
      if (shift.tanks) {
        volume.tankDispensed += shift.tanks.reduce((sum, t) => sum + (t.volumeDispensed || 0), 0);
      }

      // Операционные метрики
      operational.transactionCount += shift.transactionCount;

      if (shift.status === 'open') {
        operational.openShiftsCount++;
      }

      if (shift.hasDiscrepancies) {
        operational.shiftsWithDiscrepancies++;
      }

      // Продолжительность смены
      if (shift.closedAt && shift.openedAt) {
        const duration = new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime();
        totalDuration += duration;
        closedShiftsCount++;
      }
    }

    // Средний чек
    financial.averageCheck = operational.transactionCount > 0
      ? financial.totalRevenue / operational.transactionCount
      : 0;

    // Средняя продолжительность смены (в часах)
    operational.averageShiftDuration = closedShiftsCount > 0
      ? (totalDuration / closedShiftsCount) / (1000 * 60 * 60)
      : 0;

    // Преобразуем Map в массив с процентами
    volume.byFuel = Array.from(fuelMap.entries()).map(([fuelCode, data]) => ({
      fuelCode,
      fuelName: data.name,
      volume: data.volume,
      revenue: data.revenue,
      percentOfTotal: volume.totalVolume > 0 ? (data.volume / volume.totalVolume) * 100 : 0,
      color: getFuelColor(data.name),
    }));

    // Преобразуем paymentFuelMap в paymentDetails (динамический)
    for (const [paymentType, fuelsMap] of paymentFuelMap.entries()) {
      let totalRevenue = 0;
      let totalVolume = 0;

      const byFuel = Array.from(fuelsMap.entries()).map(([fuelCode, data]) => {
        totalRevenue += data.revenue;
        totalVolume += data.volume;
        return {
          fuelCode,
          fuelName: data.name,
          revenue: data.revenue,
          volume: data.volume,
          color: getFuelColor(data.name),
        };
      }).sort((a, b) => b.revenue - a.revenue);

      financial.paymentDetails[paymentType] = {
        revenue: totalRevenue,
        volume: totalVolume,
        byFuel,
      };
    }

    // Вычисляем метрики поступлений
    const receipts = this.calculateReceipts(shifts);

    // Метрики инкассации (передаются отдельно)
    const cashout: CashoutMetrics = cashoutData || {
      totalAmount: 0,
      totalBillAmount: 0,
      count: 0,
      details: [],
    };

    // Метрики движения наличных (передаются отдельно)
    const cashFlow: CashFlowMetrics = cashFlowData || {
      openingBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      closingBalance: 0,
      calculatedBalance: 0,
      difference: 0,
      operationsCount: 0,
      details: [],
    };

    return { financial, volume, operational, receipts, cashout, cashFlow };
  }

  /**
   * Вычислить метрики поступлений по ТТН
   */
  calculateReceipts(shifts: ShiftDetails[]): ReceiptsMetrics {
    const fuelMap = new Map<number, ReceiptsByFuel>();
    const details: ReceiptTTNItem[] = [];

    for (const shift of shifts) {
      // Получаем сырые данные поступлений
      const receiptsRaw = (shift as any).receiptsRaw || [];

      for (const receipt of receiptsRaw) {
        const fuelCode = receipt.service?.service_code || 0;
        const fuelName = receipt.service?.service_name || 'Неизвестно';
        const docVolume = parseFloat(receipt.doc?.volume || '0');
        const docAmount = parseFloat(receipt.doc?.amount || '0');
        const docDensity = parseFloat(receipt.doc?.density || '0');
        const factVolume = parseFloat(receipt.fact?.volume || '0');
        const factAmount = parseFloat(receipt.fact?.amount || '0');
        const factDensity = parseFloat(receipt.fact?.density || '0');
        const volumeDiff = factVolume - docVolume;
        const amountDiff = factAmount - docAmount;

        // Добавляем в детализацию
        details.push({
          ttn: receipt.ttn || '',
          datetime: receipt.dt || '',
          tankNumber: receipt.tank || 0,
          fuelCode,
          fuelName,
          docVolume,
          docAmount,
          docDensity,
          factVolume,
          factAmount,
          factDensity,
          volumeDiff,
          amountDiff,
          baseName: receipt.base?.name || 'Неизвестно',
          shiftNumber: shift.shiftNumber,
          stationCode: shift.stationCode,
          stationName: shift.stationName,
          color: getFuelColor(fuelName),
        });

        // Агрегируем по топливам
        const existing = fuelMap.get(fuelCode);
        if (existing) {
          existing.docVolume += docVolume;
          existing.factVolume += factVolume;
          existing.volumeDiff += volumeDiff;
          existing.ttnCount += 1;
        } else {
          fuelMap.set(fuelCode, {
            fuelCode,
            fuelName,
            docVolume,
            factVolume,
            volumeDiff,
            ttnCount: 1,
            color: getFuelColor(fuelName),
          });
        }
      }
    }

    // Сортируем детали по дате (новые сверху)
    details.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

    // Преобразуем Map в массив
    const byFuel = Array.from(fuelMap.values()).sort((a, b) => b.docVolume - a.docVolume);

    // Считаем итоги
    const totalDocVolume = byFuel.reduce((sum, f) => sum + f.docVolume, 0);
    const totalFactVolume = byFuel.reduce((sum, f) => sum + f.factVolume, 0);
    const totalDiff = totalFactVolume - totalDocVolume;
    const ttnCount = details.length;

    return {
      totalDocVolume,
      totalFactVolume,
      totalDiff,
      ttnCount,
      byFuel,
      details,
    };
  }

  /**
   * Вычислить тренды относительно предыдущего периода
   */
  calculateTrends(current: ShiftDetails[], previous: ShiftDetails[]): DashboardTrends {
    const currentKPIs = this.calculateKPIs(current);
    const previousKPIs = this.calculateKPIs(previous);

    const calculateTrend = (curr: number, prev: number): TrendValue => {
      const delta = curr - prev;
      const percentChange = prev !== 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0);
      const direction: 'up' | 'down' | 'neutral' =
        Math.abs(percentChange) < 0.5 ? 'neutral' : (percentChange > 0 ? 'up' : 'down');

      return {
        current: curr,
        previous: prev,
        delta,
        percentChange,
        direction,
      };
    };

    return {
      revenue: calculateTrend(currentKPIs.financial.totalRevenue, previousKPIs.financial.totalRevenue),
      volume: calculateTrend(currentKPIs.volume.totalVolume, previousKPIs.volume.totalVolume),
      shifts: calculateTrend(currentKPIs.operational.shiftsCount, previousKPIs.operational.shiftsCount),
      averageCheck: calculateTrend(currentKPIs.financial.averageCheck, previousKPIs.financial.averageCheck),
      transactions: calculateTrend(currentKPIs.operational.transactionCount, previousKPIs.operational.transactionCount),
    };
  }

  /**
   * Подготовить данные для графиков
   */
  prepareChartData(shifts: ShiftDetails[], period: PeriodSelection): ChartData {
    return {
      daily: this.groupByDay(shifts, period),
      byFuel: this.groupByFuel(shifts),
      byPayment: this.groupByPayment(shifts),
      byTank: this.groupByTank(shifts),
    };
  }

  /**
   * Группировка по дням
   */
  private groupByDay(shifts: ShiftDetails[], period: PeriodSelection): DailyDataPoint[] {
    const dayMap = new Map<string, DailyDataPoint>();

    // Создаем записи для всех дней периода
    const startDate = new Date(period.dateFrom);
    const endDate = new Date(period.dateTo);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dayMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        volume: 0,
        shiftsCount: 0,
        transactionCount: 0,
        averageCheck: 0,
        cashRevenue: 0,
        cardRevenue: 0,
        sbpRevenue: 0,
        fuelCardRevenue: 0,
        corporateCardRevenue: 0,
        otherRevenue: 0,
      });
    }

    // Агрегируем данные смен
    for (const shift of shifts) {
      const dateKey = shift.openedAt.split('T')[0];
      const dayData = dayMap.get(dateKey);

      if (dayData) {
        dayData.revenue += shift.totalRevenue;
        dayData.volume += shift.totalVolume;
        dayData.shiftsCount += 1;
        dayData.transactionCount += shift.transactionCount;
        dayData.cashRevenue += shift.cashRevenue;
        dayData.cardRevenue += shift.cardRevenue;
        dayData.sbpRevenue += shift.sbpRevenue;
        dayData.fuelCardRevenue += shift.fuelCardRevenue;
        dayData.corporateCardRevenue += shift.corporateCardRevenue || 0;
        dayData.otherRevenue += shift.otherRevenue;
      }
    }

    // Вычисляем средний чек для каждого дня
    for (const dayData of dayMap.values()) {
      dayData.averageCheck = dayData.transactionCount > 0
        ? dayData.revenue / dayData.transactionCount
        : 0;
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Группировка по топливу
   */
  private groupByFuel(shifts: ShiftDetails[]): FuelVolumeItem[] {
    const fuelMap = new Map<number, { volume: number; revenue: number; name: string }>();
    let totalVolume = 0;

    for (const shift of shifts) {
      if (shift.fuelSales) {
        for (const fuel of shift.fuelSales) {
          totalVolume += fuel.quantity;
          const existing = fuelMap.get(fuel.fuelCode);
          if (existing) {
            existing.volume += fuel.quantity;
            existing.revenue += fuel.cost;
          } else {
            fuelMap.set(fuel.fuelCode, {
              volume: fuel.quantity,
              revenue: fuel.cost,
              name: fuel.fuelName,
            });
          }
        }
      }
    }

    return Array.from(fuelMap.entries())
      .map(([fuelCode, data]) => ({
        fuelCode,
        fuelName: data.name,
        volume: data.volume,
        revenue: data.revenue,
        percentOfTotal: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0,
        color: getFuelColor(data.name),
      }))
      .sort((a, b) => b.volume - a.volume);
  }

  /**
   * Группировка по способам оплаты
   */
  private groupByPayment(shifts: ShiftDetails[]): PaymentMethodItem[] {
    const paymentMap = new Map<number, { revenue: number; volume: number; name: string }>();
    let totalRevenue = 0;

    for (const shift of shifts) {
      if (shift.paymentSales) {
        for (const payment of shift.paymentSales) {
          totalRevenue += payment.cost;
          const existing = paymentMap.get(payment.paymentTypeId);
          if (existing) {
            existing.revenue += payment.cost;
            existing.volume += payment.quantity;
          } else {
            paymentMap.set(payment.paymentTypeId, {
              revenue: payment.cost,
              volume: payment.quantity,
              name: payment.paymentTypeName || PAYMENT_NAMES[payment.paymentTypeId] || 'Прочее',
            });
          }
        }
      }
    }

    return Array.from(paymentMap.entries())
      .map(([paymentTypeId, data]) => ({
        paymentTypeId,
        paymentTypeName: data.name,
        revenue: data.revenue,
        volume: data.volume,
        percentOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
        color: getPaymentColor(data.name),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  /**
   * Группировка по резервуарам
   */
  private groupByTank(shifts: ShiftDetails[]): TankUsageItem[] {
    const tankMap = new Map<number, TankUsageItem>();

    for (const shift of shifts) {
      if (shift.tanks) {
        for (const tank of shift.tanks) {
          const existing = tankMap.get(tank.tankNumber);
          if (existing) {
            existing.dispensed += tank.volumeDispensed;
            existing.received += tank.volumeReceived;
            existing.difference += tank.volumeDifference;
            if (tank.hasExcessError) {
              existing.hasExcessError = true;
            }
            // Обновляем конечный объем на последнее значение
            existing.volumeEnd = tank.volumeEnd;
          } else {
            tankMap.set(tank.tankNumber, {
              tankNumber: tank.tankNumber,
              fuelCode: tank.fuelCode,
              fuelName: tank.fuelName,
              volumeBegin: tank.volumeBegin,
              volumeEnd: tank.volumeEnd,
              dispensed: tank.volumeDispensed,
              received: tank.volumeReceived,
              difference: tank.volumeDifference,
              hasExcessError: tank.hasExcessError,
            });
          }
        }
      }
    }

    return Array.from(tankMap.values()).sort((a, b) => a.tankNumber - b.tankNumber);
  }

  /**
   * Подготовить данные для детализации
   */
  prepareDetailsData(shifts: ShiftDetails[]): DetailsData {
    return {
      byPoint: this.groupByPoint(shifts),
      byShift: this.groupByShift(shifts),
      byFuel: this.groupByFuelDetailed(shifts),
    };
  }

  /**
   * Группировка по торговым точкам
   */
  private groupByPoint(shifts: ShiftDetails[]): PointAggregation[] {
    const pointMap = new Map<number, PointAggregation>();
    let totalRevenue = 0;
    let totalVolume = 0;

    for (const shift of shifts) {
      totalRevenue += shift.totalRevenue;
      totalVolume += shift.totalVolume;

      const existing = pointMap.get(shift.stationCode);
      if (existing) {
        existing.shiftsCount += 1;
        existing.totalRevenue += shift.totalRevenue;
        existing.totalVolume += shift.totalVolume;
        existing.transactionCount += shift.transactionCount;
      } else {
        pointMap.set(shift.stationCode, {
          stationCode: shift.stationCode,
          stationName: shift.stationName || `Станция ${shift.stationCode}`,
          shiftsCount: 1,
          totalRevenue: shift.totalRevenue,
          totalVolume: shift.totalVolume,
          transactionCount: shift.transactionCount,
          averageCheck: 0,
          revenuePercent: 0,
          volumePercent: 0,
        });
      }
    }

    // Вычисляем проценты и средний чек
    return Array.from(pointMap.values())
      .map(point => ({
        ...point,
        averageCheck: point.transactionCount > 0 ? point.totalRevenue / point.transactionCount : 0,
        revenuePercent: totalRevenue > 0 ? (point.totalRevenue / totalRevenue) * 100 : 0,
        volumePercent: totalVolume > 0 ? (point.totalVolume / totalVolume) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Группировка по сменам (список смен)
   */
  private groupByShift(shifts: ShiftDetails[]): ShiftAggregation[] {
    return shifts.map(shift => ({
      shiftId: shift.id,
      shiftNumber: shift.shiftNumber,
      stationCode: shift.stationCode,
      stationName: shift.stationName,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      operator: shift.operator,
      revenue: shift.totalRevenue,
      volume: shift.totalVolume,
      transactionCount: shift.transactionCount,
      averageCheck: shift.averageCheck,
      hasDiscrepancies: shift.hasDiscrepancies,
    })).sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  }

  /**
   * Детальная группировка по топливам с метриками
   */
  private groupByFuelDetailed(shifts: ShiftDetails[]): FuelAggregation[] {
    const fuelMap = new Map<number, FuelAggregation>();
    let totalVolume = 0;
    let totalRevenue = 0;

    for (const shift of shifts) {
      if (shift.fuelSales) {
        for (const fuel of shift.fuelSales) {
          totalVolume += fuel.quantity;
          totalRevenue += fuel.cost;

          const existing = fuelMap.get(fuel.fuelCode);
          if (existing) {
            existing.totalVolume += fuel.quantity;
            existing.totalRevenue += fuel.cost;
            existing.transactionCount += 1; // Approximate
          } else {
            fuelMap.set(fuel.fuelCode, {
              fuelCode: fuel.fuelCode,
              fuelName: fuel.fuelName,
              totalVolume: fuel.quantity,
              totalRevenue: fuel.cost,
              averagePrice: 0,
              transactionCount: 1,
              volumePercent: 0,
              revenuePercent: 0,
            });
          }
        }
      }
    }

    return Array.from(fuelMap.values())
      .map(fuel => ({
        ...fuel,
        averagePrice: fuel.totalVolume > 0 ? fuel.totalRevenue / fuel.totalVolume : 0,
        volumePercent: totalVolume > 0 ? (fuel.totalVolume / totalVolume) * 100 : 0,
        revenuePercent: totalRevenue > 0 ? (fuel.totalRevenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }
}

// Экспортируем singleton instance
export const shiftDashboardService = new ShiftDashboardService();
export default shiftDashboardService;
