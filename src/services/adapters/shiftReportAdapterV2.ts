/**
 * Адаптер для преобразования данных сменного отчета из STS API
 * в формат UI (версия 2 - реальная структура API)
 */

import type {
  ShiftDetails,
  TankSnapshot,
  FuelSalesItem,
  PaymentSalesItem,
  ReceiptItem,
  CashMovementItem,
  PosInfoItem,
  NozzleReading,
} from '@/types/shift-reports-v2';

/**
 * Преобразует ответ API в детальную информацию о смене
 */
export class ShiftReportAdapterV2 {
  /**
   * Преобразовать ответ API в детали смены
   */
  static toDetails(apiResponse: any, shiftNumber: number, system: number, station: number, stationName?: string, shiftInfo?: any): ShiftDetails {
    // Извлекаем информацию о ПСМ
    const posInfo = this.extractPosInfo(apiResponse.psm, shiftNumber);

    // Извлекаем показания счетных механизмов (ТРК)
    const nozzleReadings = this.extractNozzleReadings(apiResponse.psm);

    // Извлекаем данные по резервуарам
    const tanks = this.extractTanks(apiResponse.release);

    // Извлекаем продажи по топливу и способам оплаты
    const { fuelSales, paymentSales } = this.extractSales(apiResponse.sales);

    // Извлекаем детализированные продажи для расшифровки реализации
    const salesBreakdown = this.extractSalesBreakdown(apiResponse.sales, nozzleReadings);

    // Извлекаем поступления
    const receipts = this.extractReceipts(apiResponse.receipt);

    // Извлекаем движение наличных
    const cashMovements = this.extractCashMovements(apiResponse.money, shiftNumber);

    // Вычисляем итоговые показатели
    const totalRevenue = this.calculateTotalRevenue(paymentSales);
    const totalVolume = this.calculateTotalVolume(fuelSales);
    const transactionCount = 0; // Нет данных в этом формате API

    // Используем данные из shiftInfo (из /v1/shifts), если они есть
    let openedAt = new Date().toISOString();
    let closedAt: string | null = null;
    let status: 'open' | 'closed' | 'synchronized' = 'open';
    let operator = 'Не указан';

    if (shiftInfo) {
      // Берём данные напрямую из /v1/shifts
      openedAt = shiftInfo.dt_open || new Date().toISOString();
      closedAt = shiftInfo.dt_close || null;
      status = closedAt ? 'closed' : 'open';
      operator = shiftInfo.operator || 'Не указан';
    } else {
      // Fallback: пытаемся определить из posInfo (хотя там нет данных)
      if (posInfo.length > 0) {
        const openDates = posInfo
          .map(p => p.shiftOpenedAt)
          .filter((d): d is string => d !== undefined)
          .sort();
        if (openDates.length > 0) {
          openedAt = openDates[0];
        }

        const closeDates = posInfo
          .map(p => p.shiftClosedAt)
          .filter((d): d is string => d !== undefined);

        const allClosed = posInfo.every(p => p.shiftClosedAt !== undefined);

        if (allClosed && closeDates.length > 0) {
          closedAt = closeDates.sort().reverse()[0];
        }

        operator = posInfo[0].operator || 'Не указан';
        status = allClosed && closedAt ? 'closed' : 'open';
      }
    }

    const result = {
      // Базовая информация
      id: `${system}-${station}-${shiftNumber}`,
      shiftNumber,
      openedAt,
      closedAt,
      status,
      operator,
      posNumber: posInfo[0]?.posNumber || 0,
      shift: shiftNumber,

      // Итоговые показатели
      totalRevenue,
      totalVolume,
      transactionCount,

      // Разбивка по способам оплаты (базовые значения)
      cashRevenue: paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('наличн'))?.cost || 0,
      cardRevenue: paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('карт'))?.cost || 0,
      sbpRevenue: paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('сбп'))?.cost || 0,
      fuelCardRevenue: paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('топливн'))?.cost || 0,
      otherRevenue: 0,

      // Флаги
      hasDiscrepancies: tanks.some(t => t.hasExcessError),
      averageCheck: transactionCount > 0 ? totalRevenue / transactionCount : 0,

      // Метаданные
      stationCode: station,
      stationName,

      // Детальная информация
      posInfo,
      nozzleReadings,
      tanks,
      receipts,
      fuelSales,
      paymentSales,
      salesBreakdown,
      cashMovements,
      reportCreatedAt: new Date().toISOString(),

      // Сырые данные для дополнительных расчетов
      salesRaw: apiResponse.sales || [],
    } as any;
    
    return result;
  }

  /**
   * Извлечь информацию о ПСМ
   */
  private static extractPosInfo(psm: any, shiftNumber: number): PosInfoItem[] {
    // ПСМ данные находятся в psm.total, а не в psm.data!
    // psm.data содержит показания ТРК (пистолеты)
    if (!psm || !psm.total || !Array.isArray(psm.total)) {
      return [];
    }

    return psm.total.map((pos: any) => ({
      posNumber: pos.pos || 0,
      shiftNumber: pos.shift || shiftNumber,
      shiftStatus: pos.state || 0,
      shiftOpenedAt: pos.dt_open || undefined,
      shiftClosedAt: pos.dt_close || undefined,
      operator: pos.operator || undefined,
      uptime: undefined,
      lastUpdate: undefined,
    }));
  }

  /**
   * Извлечь показания счетных механизмов (ТРК)
   */
  private static extractNozzleReadings(psm: any): NozzleReading[] {
    if (!psm || !psm.data || !Array.isArray(psm.data)) {
      return [];
    }

    return psm.data.map((reading: any) => ({
      pumpNumber: reading.pump || 0,
      nozzle: reading.nozzle || '',
      startCounter: reading.psm_beg || 0,
      endCounter: reading.psm_end || 0,
      volume: parseFloat(reading.release?.volume || '0'),
      amount: parseFloat(reading.release?.amount || '0'),
      price: reading.price || 0,
      cost: parseFloat(reading.release?.cost || '0'),
      fuelCode: reading.service?.service_code || 0,
      fuelName: reading.service?.service_name || 'Неизвестно',
      tankNumber: reading.tank || 0,
      density: reading.density || 0,
    }));
  }

  /**
   * Извлечь данные по резервуарам
   */
  private static extractTanks(release: any[]): TankSnapshot[] {
    if (!release || !Array.isArray(release)) {
      return [];
    }

    return release.map((tank: any, index: number) => {
      const volumeBegin = parseFloat(tank.doc_beg?.volume || '0');
      const volumeEnd = parseFloat(tank.doc_end?.volume || '0');
      const volumeReceived = parseFloat(tank.receipt?.volume || '0');
      const volumeDispensed = parseFloat(tank.release?.volume || '0');
      const volumeCalculated = volumeBegin + volumeReceived - volumeDispensed;
      const volumeDifference = volumeEnd - volumeCalculated;

      const waterLevel = tank.water?.level;
      const waterVolume = tank.water?.volume;

      return {
        tankNumber: tank.tank || 0,
        fuelCode: tank.service?.service_code || 0,
        fuelName: tank.service?.service_name || 'Неизвестно',
        volumeBegin,
        volumeEnd,
        volumeDispensed,
        volumeReceived,
        volumeCalculated,
        volumeDifference,
        hasExcessError: Math.abs(volumeDifference) > 10, // Превышение 10 литров
        level: tank.level_end,
        temperature: tank.temp_end,
        density: tank.density_end,
        waterLevel,
        waterVolume,
      };
    });
  }

  /**
   * Извлечь продажи по топливу и способам оплаты
   */
  private static extractSales(sales: any[]): { fuelSales: FuelSalesItem[], paymentSales: PaymentSalesItem[] } {
    if (!sales || !Array.isArray(sales)) {
      return { fuelSales: [], paymentSales: [] };
    }

    const fuelSalesMap = new Map<number, FuelSalesItem>();
    const paymentSales: PaymentSalesItem[] = [];

    sales.forEach((sale: any) => {
      const paymentTypeName = sale.pay_type?.name || 'Неизвестно';
      const paymentTypeId = sale.pay_type?.id || 0;

      let totalCost = 0;
      let totalQuantity = 0;

      if (sale.fuel && Array.isArray(sale.fuel)) {
        sale.fuel.forEach((fuelItem: any) => {
          const fuelCode = fuelItem.service?.service_code || 0;
          const fuelName = fuelItem.service?.service_name || 'Неизвестно';
          const quantity = parseFloat(fuelItem.release?.volume || '0');
          const cost = parseFloat(fuelItem.release?.cost || '0');

          totalCost += cost;
          totalQuantity += quantity;

          // Агрегируем продажи по топливу
          const existing = fuelSalesMap.get(fuelCode);
          if (existing) {
            existing.quantity += quantity;
            existing.cost += cost;
          } else {
            fuelSalesMap.set(fuelCode, {
              fuelCode,
              fuelName,
              quantity,
              cost,
            });
          }
        });
      }

      // Добавляем продажу по способу оплаты
      paymentSales.push({
        paymentTypeId,
        paymentTypeName,
        quantity: totalQuantity,
        cost: totalCost,
      });
    });

    return {
      fuelSales: Array.from(fuelSalesMap.values()),
      paymentSales,
    };
  }

  /**
   * Извлечь детализированные продажи по топливу и способам оплаты
   * Для таблицы "Расшифровка реализации"
   */
  private static extractSalesBreakdown(sales: any[], nozzleReadings: NozzleReading[]): any[] {
    if (!sales || !Array.isArray(sales)) {
      return [];
    }


    // Создаем карту: fuelCode -> { fuelName, по способам оплаты }
    const breakdownMap = new Map<number, any>();

    sales.forEach((sale: any, index: number) => {
      const paymentTypeName = (sale.pay_type?.name || '').toLowerCase();
      const paymentTypeId = sale.pay_type?.id || 0;

      if (sale.fuel && Array.isArray(sale.fuel)) {
        sale.fuel.forEach((fuelItem: any, fuelIndex: number) => {
          const fuelCode = fuelItem.service?.service_code || 0;
          const fuelName = fuelItem.service?.service_name || 'Неизвестно';
          const volume = parseFloat(fuelItem.release?.volume || '0');
          const cost = parseFloat(fuelItem.release?.cost || '0');
          const discount = parseFloat(fuelItem.release?.discount || '0');

          if (!breakdownMap.has(fuelCode)) {
            breakdownMap.set(fuelCode, {
              fuelCode,
              fuelName,
              pumpVolume: 0,
              cardVolume: 0,
              cardCost: 0,
              discountCost: 0,
              cashVolume: 0,
              cashCost: 0,
              nonCashVolume: 0,
              totalVolume: 0,
              difference: 0,
            });
          }

          const breakdown = breakdownMap.get(fuelCode);

          // Мапим способы оплаты (исключаем "купон на сдачу" - это техническая запись)
          if (paymentTypeName.includes('купон')) {
            // Купон на сдачу - корректировка объёма, попадает в "Безнал."
            // Скидку из купонов НЕ учитываем
            breakdown.nonCashVolume += volume;
            breakdown.totalVolume += volume;
          }
          // "По картам" = сбербанк, карты, и т.д.
          else if (paymentTypeName.includes('карт') ||
              paymentTypeName.includes('сбербанк') ||
              paymentTypeName.includes('visa') ||
              paymentTypeName.includes('mastercard')) {
            breakdown.cardVolume += volume;
            breakdown.cardCost += cost;
            breakdown.discountCost += discount; // Скидка из карт
            breakdown.totalVolume += volume;
          }
          // "За наличные"
          else if (paymentTypeName.includes('наличн')) {
            breakdown.cashVolume += volume;
            breakdown.cashCost += cost;
            breakdown.discountCost += discount; // Скидка из наличных
            breakdown.totalVolume += volume;
          }
          // "Безнал." = топливные карты, мобильные приложения
          else if (paymentTypeName.includes('безнал') ||
                   paymentTypeName.includes('топливн') ||
                   paymentTypeName.includes('мобил')) {
            breakdown.nonCashVolume += volume;
            breakdown.discountCost += discount; // Скидка из безнала
            breakdown.totalVolume += volume;
          }
          // Неизвестный тип - записываем в лог
          else {
            breakdown.totalVolume += volume;
          }
        });
      }
    });

    // Вычисляем pumpVolume из показаний ТРК (nozzleReadings)
    // и разницу между прокачкой и продажами
    breakdownMap.forEach((breakdown, fuelCode) => {
      // Суммируем объемы из всех пистолетов для данного топлива
      const totalPumpVolume = nozzleReadings
        .filter(nozzle => nozzle.fuelCode === fuelCode)
        .reduce((sum, nozzle) => sum + nozzle.volume, 0);
      
      breakdown.pumpVolume = totalPumpVolume;
      
      // Вычисляем разницу = Прокачка - Всего (продажи)
      breakdown.difference = breakdown.pumpVolume - breakdown.totalVolume;
    });

    const result = Array.from(breakdownMap.values());
    return result;
  }

  /**
   * Извлечь поступления
   */
  private static extractReceipts(receipts: any[]): ReceiptItem[] {
    if (!receipts || !Array.isArray(receipts)) {
      return [];
    }


    return receipts.map((receipt: any, index: number) => {

      return {
        id: `receipt-${receipt.shift}-${receipt.tank}-${index}`,
        datetime: receipt.dt || new Date().toISOString(),
        tankNumber: receipt.tank || 0,
        fuelCode: receipt.service?.service_code || 0,
        fuelName: receipt.service?.service_name || 'Неизвестно',

        // По документу
        volume: parseFloat(receipt.doc?.volume || '0'),
        amount: parseFloat(receipt.doc?.amount || '0'),
        density: receipt.doc?.density || undefined,
        temperature: receipt.doc?.temp || undefined,

        // Фактически
        actualVolume: parseFloat(receipt.fact?.volume || receipt.doc?.volume || '0'),
        actualAmount: parseFloat(receipt.fact?.amount || receipt.doc?.amount || '0'),
        actualDensity: receipt.fact?.density || receipt.doc?.density || undefined,
        actualTemperature: receipt.fact?.temp || receipt.doc?.temp || undefined,

        documentNumber: receipt.ttn || undefined,
        supplier: receipt.base?.name || undefined,
      };
    });
  }

  /**
   * Извлечь движение наличных
   */
  private static extractCashMovements(money: any[], shiftNumber: number): CashMovementItem[] {
    if (!money || !Array.isArray(money)) {
      return [];
    }


    const filtered = money.filter((item: any) => item.shift === shiftNumber);

    return filtered
      .map((item: any, index: number) => {
        const operationId = item.operation?.id || 0;
        const operationType = this.mapOperationType(operationId);

        // Пропускаем записи показаний ККТ (id: 5, 6) - это не движение денег
        if (operationType === null) {
          return null;
        }

        return {
          id: `money-${item.shift}-${item.pos}-${index}`,
          datetime: new Date().toISOString(), // API не возвращает дату/время
          operationType,
          amount: item.volume || 0,
          description: item.operation?.name || 'Неизвестная операция',
          posNumber: item.pos,
        };
      })
      .filter((item): item is CashMovementItem => item !== null);
  }

  /**
   * Маппинг типа операции по ID
   *
   * По реальному отчету 1С:
   * - id: 1 - Остаток на начало смены (opening)
   * - id: 2 - ? (пока не встречался)
   * - id: 3 - Выручка за смену (наличные) (income)
   * - id: 4 - Остаток на конец смены по раб.местам (closing)
   * - id: 5 - Показания ККТ на начало - НЕ движение денег
   * - id: 6 - Показания ККТ на конец - НЕ движение денег
   * - id: 7 - Остаток на конец смены по всей АЗС = "Передано по смене" (closing)
   */
  private static mapOperationType(operationId: number): 'income' | 'expense' | 'opening' | 'closing' | null {
    switch (operationId) {
      case 1: return 'opening';  // "Принято по смене"
      case 2: return 'expense';  // Возможно расход
      case 3: return 'income';   // "Выручка за смену" (только наличные)
      case 4: return null;       // Остаток на конец по ПСМ - не используем, берем id:7
      case 5: return null;       // Показания ККТ на начало - игнорируем
      case 6: return null;       // Показания ККТ на конец - игнорируем
      case 7: return 'closing';  // "Передано по смене" (остаток на конец по всей АЗС)
      default: return null;
    }
  }

  /**
   * Вычислить общую выручку
   */
  private static calculateTotalRevenue(paymentSales: PaymentSalesItem[]): number {
    return paymentSales.reduce((sum, sale) => sum + sale.cost, 0);
  }

  /**
   * Вычислить общий объем
   */
  private static calculateTotalVolume(fuelSales: FuelSalesItem[]): number {
    return fuelSales.reduce((sum, sale) => sum + sale.quantity, 0);
  }
}

export default ShiftReportAdapterV2;
