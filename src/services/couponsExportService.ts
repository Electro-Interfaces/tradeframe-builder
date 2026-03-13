/**
 * Сервис экспорта купонов в Excel с аналитикой
 */

import type { CouponsSearchResult } from '@/types/coupons';
import { loadXlsx } from '@/utils/xlsxLoader';

interface ExportOptions {
  networkName?: string;
  stationName?: string;
}

class CouponsExportService {
  /**
   * Экспорт данных купонов в Excel с аналитикой
   */
  async exportToExcel(
    searchResult: CouponsSearchResult | null,
    options: ExportOptions = {}
  ): Promise<void> {
    if (!searchResult) {
      throw new Error('Нет данных для экспорта');
    }

    const XLSX = await loadXlsx();
    const allCoupons = searchResult.groups.flatMap(g => g.coupons) || [];

    if (allCoupons.length === 0) {
      throw new Error('Нет купонов для экспорта');
    }

    const currentDate = new Date().toLocaleDateString('ru-RU');
    const networkName = options.networkName || 'Не выбрана';
    const stationName = options.stationName || 'Все станции';

    // Создаем новую рабочую книгу Excel
    const workbook = XLSX.utils.book_new();

    // Лист "Аналитика"
    const analyticsData = this.createAnalyticsSheet(
      allCoupons,
      searchResult,
      currentDate,
      networkName,
      stationName
    );

    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
    this.formatNumericColumns(XLSX, analyticsSheet, 'analytics');
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Аналитика');

    // Лист "Детальная информация"
    const detailsData = this.createDetailsSheet(allCoupons, searchResult);
    const detailsSheet = XLSX.utils.aoa_to_sheet(detailsData);
    this.formatNumericColumns(XLSX, detailsSheet, 'details');
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Детальная информация');

    // Сохраняем Excel файл
    const fileName = `kupony_${networkName.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return Promise.resolve();
  }

  /**
   * Создание листа аналитики
   */
  private createAnalyticsSheet(
    allCoupons: any[],
    searchResult: CouponsSearchResult,
    currentDate: string,
    networkName: string,
    stationName: string
  ): any[][] {
    const analyticsData: any[][] = [];

    // Заголовок отчета
    analyticsData.push(['ОТЧЕТ ПО КУПОНАМ']);
    analyticsData.push(['Дата формирования:', currentDate]);
    analyticsData.push(['Сеть:', networkName]);
    analyticsData.push(['Торговая точка:', stationName]);
    analyticsData.push(['']); // Пустая строка

    // Аналитические показатели
    analyticsData.push(['АНАЛИТИЧЕСКИЕ ПОКАЗАТЕЛИ']);

    // 1. Выдано купонов
    const totalIssuedLiters = allCoupons.reduce((sum, c) => sum + c.qty_total, 0);
    analyticsData.push(['1. ВЫДАНО КУПОНОВ']);
    analyticsData.push(['   Объем (л):', totalIssuedLiters]);
    analyticsData.push(['   Сумма (₽):', searchResult.stats.totalAmount || 0]);
    analyticsData.push(['   Количество (шт):', searchResult.stats.totalCoupons || 0]);
    analyticsData.push(['']);

    // 2. Выдано топлива
    const usedCouponsCount = allCoupons.filter(c => c.qty_used > 0).length;
    analyticsData.push(['2. ВЫДАНО ТОПЛИВА']);
    analyticsData.push(['   Объем (л):', searchResult.stats.totalFuelDelivered || 0]);
    analyticsData.push(['   Сумма (₽):', searchResult.stats.usedAmount || 0]);
    analyticsData.push(['   Количество купонов (шт):', usedCouponsCount]);
    analyticsData.push(['']);

    // 3. Остаток (активные купоны)
    const activeCoupons = allCoupons.filter(c => c.isActive && !c.isOld);
    const remainingLiters = activeCoupons.reduce((sum, c) => sum + c.rest_qty, 0);
    const remainingAmount = activeCoupons.reduce((sum, c) => sum + c.rest_summ, 0);
    analyticsData.push(['3. ОСТАТОК (активные купоны)']);
    analyticsData.push(['   Объем (л):', remainingLiters]);
    analyticsData.push(['   Сумма (₽):', remainingAmount]);
    analyticsData.push(['   Количество (шт):', activeCoupons.length]);
    analyticsData.push(['']);

    // 4. Просрочено
    analyticsData.push(['4. ПРОСРОЧЕНО (старше 7 дней)']);
    analyticsData.push(['   Объем (л):', searchResult.stats.expiredFuelLoss || 0]);
    analyticsData.push(['   Сумма (₽):', searchResult.stats.expiredAmount || 0]);
    analyticsData.push(['   Количество (шт):', searchResult.stats.expiredCoupons || 0]);
    analyticsData.push(['']);

    // Дополнительные показатели
    analyticsData.push(['ДОПОЛНИТЕЛЬНЫЕ ПОКАЗАТЕЛИ']);
    analyticsData.push(['Активных купонов:', searchResult.stats.activeCoupons || 0]);
    analyticsData.push(['Погашенных купонов:', searchResult.stats.redeemedCoupons || 0]);
    analyticsData.push(['']);
    analyticsData.push(['Процент использования (%):', searchResult.stats.utilizationRate || 0]);

    return analyticsData;
  }

  /**
   * Создание листа с детальной информацией
   */
  private createDetailsSheet(
    allCoupons: any[],
    searchResult: CouponsSearchResult
  ): any[][] {
    const detailsData: any[][] = [];

    // Заголовки
    const headers = [
      'Номер купона',
      'Дата создания',
      'Время создания',
      'Тип топлива',
      'Цена за литр (₽)',
      'Общее количество (л)',
      'Использовано (л)',
      'Остаток (л)',
      'Общая сумма (₽)',
      'Использованная сумма (₽)',
      'Остаток (₽)',
      'Статус',
      'Станция',
      'Смена',
      'Операция'
    ];
    detailsData.push(headers);

    // Построение маппинга купон → станция за O(n) вместо O(n²)
    const couponToStation = new Map<unknown, string>();
    for (const group of searchResult.groups) {
      for (const c of group.coupons) {
        couponToStation.set(c, group.stationId || '');
      }
    }

    // Данные купонов
    const rows = allCoupons.map(coupon => {
      const date = new Date(coupon.dt);
      return [
        coupon.number,
        date.toLocaleDateString('ru-RU'),
        date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        coupon.service.service_name,
        coupon.price,
        coupon.qty_total,
        coupon.qty_used,
        coupon.rest_qty,
        coupon.summ_total,
        coupon.summ_used,
        coupon.rest_summ,
        coupon.state.name,
        `Станция ${couponToStation.get(coupon) || ''}`,
        coupon.shift,
        coupon.opernum
      ];
    });

    detailsData.push(...rows);

    return detailsData;
  }

  /**
   * Форматирование числовых столбцов
   */
  private formatNumericColumns(XLSX: typeof import('xlsx'), sheet: any, type: 'analytics' | 'details'): void {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    if (type === 'analytics') {
      // Форматирование для аналитики
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          if (cell && typeof cell.v === 'number' && col === 1) {
            cell.z = '0.00'; // Формат с 2 знаками после запятой
          }
        }
      }
    } else if (type === 'details') {
      // Форматирование для детальной таблицы
      for (let row = 1; row <= range.e.r; row++) {
        const numericColumns = [4, 5, 6, 7, 8, 9, 10, 13, 14];
        numericColumns.forEach(col => {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          if (cell && typeof cell.v === 'number') {
            if (col >= 4 && col <= 10) {
              cell.z = '0.00';
            } else {
              cell.z = '0';
            }
          }
        });
      }
    }
  }
}

export const couponsExportService = new CouponsExportService();
export default couponsExportService;
