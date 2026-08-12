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
  CashSummary,
  PosInfoItem,
  NozzleReading,
} from '@/types/shift-reports-v2';
import { classifyPayment } from '@/utils/paymentUtils';

/**
 * Масса из API считается достоверной, только если сходится с литрами по вменяемой
 * плотности нефтепродукта. В shift_report ряда систем amount оторван от volume
 * (встречается «плотность» до 2,66) — там массу считаем сами по density.
 * ponytail: снять проверку, когда STS починит массу в shift_report.
 */
const isPlausibleMass = (mass: number, volume: number): boolean =>
  mass > 0 && volume > 0 && mass / volume >= 0.6 && mass / volume <= 1.0;

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

    // Извлекаем движение наличных — после определения openedAt/closedAt,
    // чтобы проставить корректные даты operation'ам вместо new Date()
    const cashMovements = this.extractCashMovements(apiResponse.money, shiftNumber, openedAt, closedAt);
    const cashSummary = this.extractCashSummary(apiResponse.money, shiftNumber);

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
      // Наличные
      cashRevenue: paymentSales
        .filter(p => p.paymentTypeName.toLowerCase().includes('наличн'))
        .reduce((sum, p) => sum + p.cost, 0),
      // Банковские карты (включая СБП, СберБанк и т.д.)
      cardRevenue: paymentSales
        .filter(p => {
          const name = p.paymentTypeName.toLowerCase();
          return name.includes('карт') || name.includes('сбербанк') || name.includes('сбп') ||
                 name.includes('visa') || name.includes('mastercard') || name.includes('эквайр');
        })
        .reduce((sum, p) => sum + p.cost, 0),
      // Онлайн заказы (МобилПр. и т.д.) - НЕ СБП!
      sbpRevenue: paymentSales
        .filter(p => {
          const name = p.paymentTypeName.toLowerCase();
          return name.includes('мобил') || name.includes('онлайн') || name.includes('online');
        })
        .reduce((sum, p) => sum + p.cost, 0),
      // Топливные карты
      fuelCardRevenue: paymentSales
        .filter(p => p.paymentTypeName.toLowerCase().includes('топливн'))
        .reduce((sum, p) => sum + p.cost, 0),
      // Корпоративные карты (КР, Корп.карты)
      corporateCardRevenue: paymentSales
        .filter(p => {
          const name = p.paymentTypeName.toLowerCase();
          return name === 'кр' || name.includes('корпоратив') || name.includes('корп.карт') || name.includes('корп карт');
        })
        .reduce((sum, p) => sum + p.cost, 0),
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
      cashSummary,
      reportCreatedAt: new Date().toISOString(),

      // Сырые данные для дополнительных расчетов
      salesRaw: apiResponse.sales || [],
      receiptsRaw: apiResponse.receipt || [],
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

      const density = tank.density_end;
      // Фактический замер уровнемера. doc_end — книжный остаток, факт брать из него нельзя.
      const volumeFact = parseFloat(tank.rest?.volume ?? tank.volume_end ?? tank.doc_end?.volume ?? '0');
      const restMass = parseFloat(tank.rest?.amount || '0');

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
        density,
        densityBegin: tank.density_beg ?? density,
        volumeFact,
        massFact: isPlausibleMass(restMass, volumeFact) ? restMass : volumeFact * (density || 1),
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
   *
   * Структура повторяет бумажную распечатку АЗС:
   * - Прокачка = 0 (АЗС-система не выводит прокачку в этой форме)
   * - Разница = Всего − (cash + card + nonCash) — балансовая проверка разложения по типам оплаты,
   *   должна быть 0, если все типы корректно классифицированы.
   */
  private static extractSalesBreakdown(sales: any[], _nozzleReadings: NozzleReading[]): any[] {
    if (!sales || !Array.isArray(sales)) {
      return [];
    }


    // Создаем карту: fuelCode -> { fuelName, по способам оплаты }
    const breakdownMap = new Map<number, any>();

    sales.forEach((sale: any) => {
      const paymentTypeRaw: string = sale.pay_type?.name || '';
      const payKey = paymentTypeRaw.toLowerCase().trim();
      const category = classifyPayment(paymentTypeRaw);

      if (sale.fuel && Array.isArray(sale.fuel)) {
        sale.fuel.forEach((fuelItem: any) => {
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
              corporateVolume: 0,
              corporateCost: 0,
              nonCashVolume: 0,
              totalVolume: 0,
              difference: 0,
              byPayType: {} as Record<string, { displayName: string; category: string; volume: number; cost: number; discount: number }>,
            });
          }

          const breakdown = breakdownMap.get(fuelCode);

          // Детализация по каждому уникальному типу оплаты (для колонок «БАЛТОП», «Инфорком», «VIAcard» и т.д.)
          if (payKey) {
            if (!breakdown.byPayType[payKey]) {
              breakdown.byPayType[payKey] = { displayName: paymentTypeRaw, category, volume: 0, cost: 0, discount: 0 };
            }
            breakdown.byPayType[payKey].volume += volume;
            breakdown.byPayType[payKey].cost += cost;
            breakdown.byPayType[payKey].discount += discount;
          }

          // Агрегаты по категориям (обратная совместимость с ShiftDetailsModal)
          switch (category) {
            case 'cash':
              breakdown.cashVolume += volume;
              breakdown.cashCost += cost;
              breakdown.discountCost += discount;
              breakdown.totalVolume += volume;
              break;
            case 'card':
              breakdown.cardVolume += volume;
              breakdown.cardCost += cost;
              breakdown.discountCost += discount;
              breakdown.totalVolume += volume;
              break;
            case 'corporate':
            case 'fuel_card':
              breakdown.corporateVolume += volume;
              breakdown.corporateCost += cost;
              breakdown.nonCashVolume += volume;
              breakdown.discountCost += discount;
              breakdown.totalVolume += volume;
              break;
            case 'coupon':
            case 'online':
            case 'other':
            default:
              breakdown.nonCashVolume += volume;
              breakdown.discountCost += discount;
              breakdown.totalVolume += volume;
              break;
          }
        });
      }
    });

    // Балансовая проверка: Всего − (cash + card + nonCash) должно быть 0.
    // Если не 0 — какой-то тип оплаты не попал ни в одну категорию в классификаторе.
    breakdownMap.forEach((breakdown) => {
      breakdown.pumpVolume = 0;
      breakdown.difference = breakdown.totalVolume - (breakdown.cashVolume + breakdown.cardVolume + breakdown.nonCashVolume);
    });

    return Array.from(breakdownMap.values());
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
   * Извлечь движение наличных.
   * API не возвращает dt для записей в `money`, поэтому проставляем даты исходя из типа операции:
   * opening → openedAt, остальные (income/expense/closing) → closedAt (или openedAt если смена ещё открыта).
   */
  private static extractCashMovements(
    money: any[],
    shiftNumber: number,
    openedAt?: string,
    closedAt?: string | null
  ): CashMovementItem[] {
    if (!money || !Array.isArray(money)) {
      return [];
    }

    const filtered = money.filter((item: any) => item.shift === shiftNumber);
    const fallbackDt = openedAt || new Date().toISOString();
    const endDt = closedAt || fallbackDt;

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
          datetime: operationType === 'opening' ? fallbackDt : endDt,
          operationType,
          amount: item.volume || 0,
          description: item.operation?.name || 'Неизвестная операция',
          posNumber: item.pos,
        };
      })
      .filter((item): item is CashMovementItem => item !== null);
  }

  /**
   * Маппинг типа операции по ID.
   * Разные АЗС могут использовать id 0 или 1 для «Принято по смене» — учитываем оба.
   */
  /**
   * Свод движения наличных как в бумажном сменном отчёте.
   *
   * Коды операций STS: 0 — остаток на начало по раб.местам, 1 — инкассация,
   * 3 — выручка наличными, 4 — остаток на конец по раб.местам, 5/6 — показания ККТ.
   * id=7 («остаток на конец по всей АЗС») НЕ используем: на ГИГ он приходит
   * отрицательным (−569018 на ст.1), а на АКАЗС 209 равен остатку на начало —
   * согласованного смысла у него нет. Операций «Внесено за смену» и «Выдано
   * наличными» STS не отдаёт вовсе, поэтому они нулевые.
   *
   * Проверено на АЗС Н-1 (смена 5898 — сходится с бумажным отчётом до копейки),
   * ГИГ ст.1 и АКАЗС 209: приход всегда равен расходу.
   */
  private static extractCashSummary(money: any[], shiftNumber: number): CashSummary {
    const sumByOperation = (operationId: number) => (money || [])
      .filter((item: any) => item.shift === shiftNumber && item.operation?.id === operationId)
      .reduce((sum: number, item: any) => sum + (item.volume || 0), 0);

    return {
      opening: sumByOperation(0),
      deposited: 0,
      revenue: sumByOperation(3),
      toBank: sumByOperation(1),
      cashOut: 0,
      closing: sumByOperation(4),
    };
  }

  private static mapOperationType(operationId: number): 'income' | 'expense' | 'opening' | 'closing' | null {
    switch (operationId) {
      case 0: return 'opening';    // "Остаток на начало смены по раб.местам"
      case 1: return 'expense';    // "Инкассация" — деньги ушли из кассы, не приход
      case 2: return 'expense';    // Возможно расход
      case 3: return 'income';     // "Выручка за смену" (только наличные)
      case 4: return null;         // Остаток на конец по ПСМ - не используем, берём id:7
      case 5: return null;         // Показания ККТ на начало - игнорируем
      case 6: return null;         // Показания ККТ на конец - игнорируем
      case 7: return 'closing';    // "Передано по смене" (остаток на конец по всей АЗС)
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
