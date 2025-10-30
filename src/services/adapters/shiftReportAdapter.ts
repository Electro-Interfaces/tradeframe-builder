/**
 * Адаптер для преобразования данных из STS API в UI модели
 *
 * Преобразует типы из src/types/shifts.ts в src/types/shift-reports-v2.ts
 */

import type { ShiftReport, Shift as ApiShift } from '@/types/shifts';
import type {
  ShiftListItem,
  ShiftDetails,
  ShiftStatus,
  FuelSalesItem,
  PaymentSalesItem,
  TankSnapshot,
  ReceiptItem,
  CashMovementItem,
  PosInfoItem,
} from '@/types/shift-reports-v2';

/**
 * Адаптер для сменных отчетов
 */
export class ShiftReportAdapter {
  /**
   * Преобразует статус смены из API в UI формат
   */
  static mapStatus(apiState: number): ShiftStatus {
    switch (apiState) {
      case 0:
        return 'closed';
      case 1:
        return 'open';
      case 2:
        return 'synchronized';
      default:
        return 'closed';
    }
  }

  /**
   * Извлекает имя оператора из информации о POS
   */
  static extractOperator(posInfo: any[]): string {
    if (!posInfo || posInfo.length === 0) return 'Неизвестно';

    // Пытаемся найти оператора в первом POS
    const firstPos = posInfo[0];
    return firstPos?.operator || 'Неизвестно';
  }

  /**
   * Вычисляет общую выручку из итогов по способам оплаты
   */
  static calculateTotalRevenue(paymentTotals: any[]): number {
    if (!paymentTotals || paymentTotals.length === 0) return 0;

    return paymentTotals.reduce((sum, payment) => {
      return sum + (payment.release?.cost || 0);
    }, 0);
  }

  /**
   * Вычисляет общий объем из итогов по топливу
   */
  static calculateTotalVolume(fuelTotals: any[]): number {
    if (!fuelTotals || fuelTotals.length === 0) return 0;

    return fuelTotals.reduce((sum, fuel) => {
      return sum + (fuel.release?.quantity || 0);
    }, 0);
  }

  /**
   * Подсчитывает количество транзакций (примерная оценка)
   */
  static calculateTransactionCount(report: ShiftReport): number {
    // Если есть прямое поле - используем его
    // Иначе оцениваем по объему продаж
    const totalVolume = this.calculateTotalVolume(report.fuel_totals);
    const averageTransactionVolume = 40; // Средний объем заправки ~40л

    return Math.round(totalVolume / averageTransactionVolume);
  }

  /**
   * Получает выручку наличными
   */
  static getCashRevenue(paymentTotals: any[]): number {
    if (!paymentTotals) return 0;

    const cashPayment = paymentTotals.find(p =>
      p.name?.toLowerCase().includes('наличн') ||
      p.id === 1
    );

    return cashPayment?.release?.cost || 0;
  }

  /**
   * Получает выручку по картам
   */
  static getCardRevenue(paymentTotals: any[]): number {
    if (!paymentTotals) return 0;

    const cardPayment = paymentTotals.find(p =>
      p.name?.toLowerCase().includes('карт') ||
      p.id === 2
    );

    return cardPayment?.release?.cost || 0;
  }

  /**
   * Получает выручку через СБП
   */
  static getSbpRevenue(paymentTotals: any[]): number {
    if (!paymentTotals) return 0;

    const sbpPayment = paymentTotals.find(p =>
      p.name?.toLowerCase().includes('сбп') ||
      p.id === 3
    );

    return sbpPayment?.release?.cost || 0;
  }

  /**
   * Получает выручку по топливным картам
   */
  static getFuelCardRevenue(paymentTotals: any[]): number {
    if (!paymentTotals) return 0;

    const fuelCardPayment = paymentTotals.find(p =>
      p.name?.toLowerCase().includes('топливн') ||
      p.id === 4
    );

    return fuelCardPayment?.release?.cost || 0;
  }

  /**
   * Получает выручку прочими способами
   */
  static getOtherRevenue(paymentTotals: any[]): number {
    if (!paymentTotals) return 0;

    const totalRevenue = this.calculateTotalRevenue(paymentTotals);
    const knownRevenue =
      this.getCashRevenue(paymentTotals) +
      this.getCardRevenue(paymentTotals) +
      this.getSbpRevenue(paymentTotals) +
      this.getFuelCardRevenue(paymentTotals);

    return Math.max(0, totalRevenue - knownRevenue);
  }

  /**
   * Проверяет наличие разностей в резервуарах
   */
  static checkDiscrepancies(tanks: any[]): boolean {
    if (!tanks || tanks.length === 0) return false;

    return tanks.some(tank => {
      const volumeBegin = parseFloat(tank.volume_begin || '0');
      const volumeEnd = parseFloat(tank.volume_end || '0');
      const received = parseFloat(tank.release?.volume || '0');

      const calculated = volumeBegin + received;
      const difference = Math.abs(calculated - volumeEnd);

      // Порог разности - 1% или 10 литров
      const threshold = Math.max(volumeEnd * 0.01, 10);

      return difference > threshold;
    });
  }

  /**
   * Преобразует API ShiftReport в ShiftListItem для списка
   */
  static toListItem(apiReport: ShiftReport, stationName?: string): ShiftListItem {
    const totalRevenue = this.calculateTotalRevenue(apiReport.payment_totals);
    const totalVolume = this.calculateTotalVolume(apiReport.fuel_totals);
    const transactionCount = this.calculateTransactionCount(apiReport);

    return {
      id: `${apiReport.system}-${apiReport.station}-${apiReport.shift.shift}`,
      shiftNumber: apiReport.shift.shift,
      openedAt: apiReport.shift.dt_open || new Date().toISOString(),
      closedAt: apiReport.shift.dt_close || null,
      status: this.mapStatus(apiReport.shift.state),
      operator: this.extractOperator(apiReport.pos_info),
      posNumber: apiReport.pos_info[0]?.number || 0,
      shift: apiReport.shift.shift,
      stationName: stationName,
      station: apiReport.station,

      // Итоги
      totalRevenue,
      totalVolume,
      transactionCount,

      // Разбивка по оплате
      cashRevenue: this.getCashRevenue(apiReport.payment_totals),
      cardRevenue: this.getCardRevenue(apiReport.payment_totals),
      sbpRevenue: this.getSbpRevenue(apiReport.payment_totals),
      fuelCardRevenue: this.getFuelCardRevenue(apiReport.payment_totals),
      otherRevenue: this.getOtherRevenue(apiReport.payment_totals),

      // Флаги
      hasDiscrepancies: this.checkDiscrepancies(apiReport.tanks),
      averageCheck: transactionCount > 0 ? totalRevenue / transactionCount : 0,

      // Метаданные
      stationCode: apiReport.station,
      stationName,
    };
  }

  /**
   * Преобразует продажи по топливу
   */
  static mapFuelSales(fuelTotals: any[]): FuelSalesItem[] {
    if (!fuelTotals) return [];

    return fuelTotals.map(fuel => ({
      fuelCode: fuel.service_code,
      fuelName: fuel.service_name,
      quantity: fuel.release?.quantity || 0,
      cost: fuel.release?.cost || 0,
      amount: fuel.release?.amount,
    }));
  }

  /**
   * Преобразует продажи по способам оплаты
   */
  static mapPaymentSales(paymentTotals: any[]): PaymentSalesItem[] {
    if (!paymentTotals) return [];

    return paymentTotals.map(payment => ({
      paymentTypeId: payment.id,
      paymentTypeName: payment.name || 'Неизвестно',
      quantity: payment.release?.quantity || 0,
      cost: payment.release?.cost || 0,
      amount: payment.release?.amount,
    }));
  }

  /**
   * Преобразует снимки резервуаров
   */
  static mapTanks(tanks: any[]): TankSnapshot[] {
    if (!tanks) return [];

    return tanks.map(tank => {
      const volumeBegin = parseFloat(tank.volume_begin || '0');
      const volumeEnd = parseFloat(tank.volume_end || '0');
      const volumeReceived = parseFloat(tank.release?.volume || '0');
      const volumeDispensed = volumeBegin + volumeReceived - volumeEnd;
      const volumeCalculated = volumeBegin + volumeReceived - volumeDispensed;
      const volumeDifference = volumeEnd - volumeCalculated;

      const threshold = Math.max(volumeEnd * 0.01, 10);
      const hasExcessError = Math.abs(volumeDifference) > threshold;

      return {
        tankNumber: tank.number,
        fuelCode: tank.fuel,
        fuelName: tank.fuel_name || `Топливо ${tank.fuel}`,
        volumeBegin,
        volumeEnd,
        volumeDispensed,
        volumeReceived,
        volumeCalculated,
        volumeDifference,
        hasExcessError,
        level: parseFloat(tank.level || '0'),
        temperature: parseFloat(tank.temperature || '0'),
        density: parseFloat(tank.density || '0'),
      };
    });
  }

  /**
   * Преобразует поступления нефтепродуктов
   */
  static mapReceipts(receipts: any[]): ReceiptItem[] {
    if (!receipts) return [];

    return receipts.map((receipt, index) => ({
      id: `receipt-${index}`,
      datetime: receipt.dt,
      tankNumber: receipt.tank_number,
      fuelCode: receipt.fuel_code,
      fuelName: receipt.fuel_name,
      volume: receipt.volume,
      amount: receipt.amount,
      documentNumber: receipt.document,
      supplier: receipt.supplier,
    }));
  }

  /**
   * Преобразует движение наличных
   */
  static mapCashMovements(movements: any[]): CashMovementItem[] {
    if (!movements) return [];

    return movements.map((movement, index) => ({
      id: `cash-${index}`,
      datetime: movement.dt,
      operationType: movement.operation_type || 'income',
      amount: movement.amount,
      description: movement.description || '',
      posNumber: movement.pos,
    }));
  }

  /**
   * Преобразует информацию о POS
   */
  static mapPosInfo(posInfo: any[]): PosInfoItem[] {
    if (!posInfo) return [];

    return posInfo.map(pos => ({
      posNumber: pos.number,
      shiftNumber: pos.shift?.shift || 0,
      shiftStatus: pos.shift?.state || 0,
      shiftOpenedAt: pos.shift?.dt_open,
      shiftClosedAt: pos.shift?.dt_close,
      operator: pos.operator,
      uptime: pos.uptime,
      lastUpdate: pos.dt_info,
    }));
  }

  /**
   * Преобразует API ShiftReport в ShiftDetails для детального просмотра
   */
  static toDetails(apiReport: ShiftReport, stationName?: string): ShiftDetails {
    const listItem = this.toListItem(apiReport, stationName);

    return {
      ...listItem,

      // Дополнительные данные
      posInfo: this.mapPosInfo(apiReport.pos_info),
      tanks: this.mapTanks(apiReport.tanks),
      receipts: this.mapReceipts(apiReport.receipts),
      fuelSales: this.mapFuelSales(apiReport.fuel_totals),
      paymentSales: this.mapPaymentSales(apiReport.payment_totals),
      cashMovements: this.mapCashMovements(apiReport.cash_movements),

      // Метаданные
      reportCreatedAt: apiReport.report_date || new Date().toISOString(),
    };
  }
}
