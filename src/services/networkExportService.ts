/**
 * Сервис экспорта данных обзора сети в Excel
 */

import * as XLSX from 'xlsx';
import { getFuelPriority, sortFuelTypes } from '@/utils/fuelPriority';
import { formatNumber } from '@/utils/networkFormatters';
import type { Transaction } from '@/services/stsApi';

interface ExportParams {
  dateFrom: string;
  dateTo: string;
  selectedNetwork: any;
  selectedTradingPoint: string | null;
  filteredTransactions: Transaction[];
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  paymentFuelBreakdown: any;
  dailyActivityData: any[];
  dailySalesData: any;
  heatmapData: any[];
}

export const networkExportService = {
  /**
   * Экспорт данных в Excel
   */
  exportToExcel(params: ExportParams): string {
    const {
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions,
      totalRevenue,
      totalVolume,
      averageCheck,
      fuelTypeStats,
      paymentTypeStats,
      paymentFuelBreakdown,
      dailyActivityData,
      dailySalesData,
      heatmapData
    } = params;

    const workbook = XLSX.utils.book_new();

    // Лист 1: Основные показатели
    this.addMainSheet(workbook, {
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions,
      totalRevenue,
      totalVolume,
      averageCheck,
      fuelTypeStats,
      paymentTypeStats,
      paymentFuelBreakdown
    });

    // Лист 2: Активность по часам
    if (dailyActivityData.length > 0) {
      this.addHourlyActivitySheet(workbook, dailyActivityData);
    }

    // Лист 3: Реализация по дням
    if (dailySalesData.data.length > 0) {
      this.addDailySalesSheet(workbook, dailySalesData);
    }

    // Лист 4: Тепловая карта
    if (heatmapData.length > 0) {
      this.addHeatmapSheet(workbook, heatmapData);
    }

    // Генерируем имя файла
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const networkName = selectedNetwork?.name?.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') || 'network';
    const fileName = `Обзор_${networkName}_${dateStr}_${timeStr}.xlsx`;

    // Сохраняем файл
    XLSX.writeFile(workbook, fileName);

    return fileName;
  },

  /**
   * Добавить основной лист с показателями
   */
  addMainSheet(workbook: XLSX.WorkBook, data: any) {
    const {
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions,
      totalRevenue,
      totalVolume,
      averageCheck,
      fuelTypeStats,
      paymentTypeStats,
      paymentFuelBreakdown
    } = data;

    const mainData: any[] = [
      ['ОТЧЕТ ПО ТОРГОВОЙ СЕТИ - ОБЗОР'],
      [''],
      ['Показатель', 'Значение'],
      ['Период анализа', `${dateFrom} - ${dateTo}`],
      ['Торговая сеть', selectedNetwork?.name || 'Не выбрана'],
      ['Торговая точка', selectedTradingPoint === 'all' ? 'Все точки' : (selectedTradingPoint || 'Все точки')],
      ['Дата создания отчета', new Date().toLocaleString('ru-RU')],
      [''],
      ['ОСНОВНЫЕ ПОКАЗАТЕЛИ'],
      [''],
      ['Показатель', 'Значение', '', 'Показатель', 'Значение'],
      ['Общая выручка (₽)', Number(totalRevenue.toFixed(2)), '', 'Количество операций', filteredTransactions.length],
      ['Общий объем (л)', Number(totalVolume.toFixed(2)), '', 'Средний чек (₽)', Number(averageCheck.toFixed(2))],
      ['Средний объем на операцию (л)', filteredTransactions.length > 0 ? Number((totalVolume / filteredTransactions.length).toFixed(2)) : 0],
      [''],
      ['']
    ];

    // Статистика по видам топлива
    if (fuelTypeStats.length > 0) {
      mainData.push(['СТАТИСТИКА ПО ВИДАМ ТОПЛИВА']);
      mainData.push(['']);
      mainData.push(['Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', 'Доля выручки (%)']);

      fuelTypeStats.forEach(fuel => {
        mainData.push([
          fuel.type,
          fuel.operations,
          Number(fuel.revenue.toFixed(2)),
          Number(fuel.volume.toFixed(2)),
          fuel.operations > 0 ? Number((fuel.revenue / fuel.operations).toFixed(2)) : 0,
          totalRevenue > 0 ? Number(((fuel.revenue / totalRevenue) * 100).toFixed(2)) : 0
        ]);
      });

      mainData.push([
        'ИТОГО',
        filteredTransactions.length,
        Number(totalRevenue.toFixed(2)),
        Number(totalVolume.toFixed(2)),
        Number(averageCheck.toFixed(2)),
        100
      ]);

      mainData.push(['']);
      mainData.push(['']);
    }

    // Статистика по способам оплаты
    if (paymentTypeStats.length > 0) {
      mainData.push(['СТАТИСТИКА ПО СПОСОБАМ ОПЛАТЫ']);
      mainData.push(['']);
      mainData.push(['Способ оплаты', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', 'Доля выручки (%)']);

      paymentTypeStats.forEach(payment => {
        mainData.push([
          payment.type,
          payment.operations,
          Number(payment.revenue.toFixed(2)),
          Number(payment.volume.toFixed(2)),
          payment.operations > 0 ? Number((payment.revenue / payment.operations).toFixed(2)) : 0,
          totalRevenue > 0 ? Number(((payment.revenue / totalRevenue) * 100).toFixed(2)) : 0
        ]);
      });

      mainData.push([
        'ИТОГО',
        filteredTransactions.length,
        Number(totalRevenue.toFixed(2)),
        Number(totalVolume.toFixed(2)),
        Number(averageCheck.toFixed(2)),
        100
      ]);

      mainData.push(['']);
      mainData.push(['']);

      // Детальная разбивка
      mainData.push(['ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА']);
      mainData.push(['']);

      const allFuelTypes = sortFuelTypes([
        ...new Set(Object.values(paymentFuelBreakdown).flatMap((paymentData: any) => Object.keys(paymentData)))
      ]);

      const detailHeaders = ['Способ оплаты', 'Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', '% от способа оплаты'];
      mainData.push(detailHeaders);

      paymentTypeStats.forEach(payment => {
        const paymentData = paymentFuelBreakdown[payment.type] || {};
        let isFirstRow = true;

        const fuelTypesForPayment = sortFuelTypes(Object.keys(paymentData));

        fuelTypesForPayment.forEach(fuelType => {
          const fuelData = paymentData[fuelType];
          const percentOfPayment = payment.revenue > 0 ? Number(((fuelData.revenue / payment.revenue) * 100).toFixed(2)) : 0;

          mainData.push([
            isFirstRow ? payment.type : '',
            fuelType,
            fuelData.operations,
            Number(fuelData.revenue.toFixed(2)),
            Number(fuelData.volume.toFixed(2)),
            fuelData.operations > 0 ? Number((fuelData.revenue / fuelData.operations).toFixed(2)) : 0,
            percentOfPayment
          ]);

          isFirstRow = false;
        });

        if (fuelTypesForPayment.length > 0) {
          mainData.push([
            `ИТОГО по "${payment.type}"`,
            '',
            payment.operations,
            Number(payment.revenue.toFixed(2)),
            Number(payment.volume.toFixed(2)),
            payment.operations > 0 ? Number((payment.revenue / payment.operations).toFixed(2)) : 0,
            100
          ]);

          mainData.push(['', '', '', '', '', '', '']);
        }
      });

      mainData.push([
        'ОБЩИЙ ИТОГ',
        `${allFuelTypes.length} видов топлива`,
        filteredTransactions.length,
        Number(totalRevenue.toFixed(2)),
        Number(totalVolume.toFixed(2)),
        Number(averageCheck.toFixed(2)),
        100
      ]);
    }

    const mainWorksheet = XLSX.utils.aoa_to_sheet(mainData);

    const columnWidths = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];
    mainWorksheet['!cols'] = columnWidths;

    const headerCells = ['A1', 'A9'];
    const fuelStatsIndex = mainData.findIndex(row => row[0] === 'СТАТИСТИКА ПО ВИДАМ ТОПЛИВА');
    const paymentStatsIndex = mainData.findIndex(row => row[0] === 'СТАТИСТИКА ПО СПОСОБАМ ОПЛАТЫ');
    const detailStatsIndex = mainData.findIndex(row => row[0] === 'ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА');

    if (fuelStatsIndex > -1) headerCells.push('A' + (fuelStatsIndex + 1));
    if (paymentStatsIndex > -1) headerCells.push('A' + (paymentStatsIndex + 1));
    if (detailStatsIndex > -1) headerCells.push('A' + (detailStatsIndex + 1));

    headerCells.forEach(cellAddr => {
      if (mainWorksheet[cellAddr]) {
        mainWorksheet[cellAddr].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'left' }
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Основные показатели');
  },

  /**
   * Добавить лист активности по часам
   */
  addHourlyActivitySheet(workbook: XLSX.WorkBook, dailyActivityData: any[]) {
    const hourlyData = [
      ['АКТИВНОСТЬ ПО ЧАСАМ СУТОК'],
      [''],
      ['Час', 'Операции', 'Выручка (₽)', 'Средний чек за час (₽)'],
      ...dailyActivityData.map(hour => [
        hour.hour,
        hour.operations,
        Number(hour.revenue.toFixed(2)),
        hour.operations > 0 ? Number((hour.revenue / hour.operations).toFixed(2)) : 0
      ])
    ];

    const hourlyWorksheet = XLSX.utils.aoa_to_sheet(hourlyData);

    hourlyWorksheet['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 }
    ];

    if (hourlyWorksheet['A1']) {
      hourlyWorksheet['A1'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, hourlyWorksheet, 'Активность по часам');
  },

  /**
   * Добавить лист реализации по дням
   */
  addDailySalesSheet(workbook: XLSX.WorkBook, dailySalesData: any) {
    const salesHeaders = ['Дата', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)'];
    dailySalesData.fuelTypes.forEach((fuelType: string) => {
      salesHeaders.push(`${fuelType} (₽)`);
    });

    const salesData = [
      ['РЕАЛИЗАЦИЯ ПО ДНЯМ С РАЗБИВКОЙ ПО ТОПЛИВУ'],
      [''],
      salesHeaders,
      ...dailySalesData.data.map((day: any) => {
        const baseData = [
          day.date,
          day.operations,
          Number(day.revenue.toFixed(2)),
          Number(day.volume.toFixed(2)),
          day.operations > 0 ? Number((day.revenue / day.operations).toFixed(2)) : 0
        ];

        dailySalesData.fuelTypes.forEach((fuelType: string) => {
          baseData.push(Number((day[fuelType] || 0).toFixed(2)));
        });

        return baseData;
      })
    ];

    const salesWorksheet = XLSX.utils.aoa_to_sheet(salesData);

    const salesColWidths = [
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 }
    ];

    dailySalesData.fuelTypes.forEach(() => {
      salesColWidths.push({ wch: 15 });
    });

    salesWorksheet['!cols'] = salesColWidths;

    if (salesWorksheet['A1']) {
      salesWorksheet['A1'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Реализация по дням');
  },

  /**
   * Добавить лист тепловой карты
   */
  addHeatmapSheet(workbook: XLSX.WorkBook, heatmapData: any[]) {
    const heatmapHeaders = ['День недели', 'Дата'];
    for (let hour = 0; hour < 24; hour++) {
      heatmapHeaders.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const getColorIndicator = (value: number, maxVal: number) => {
      if (value === 0) return '⬜';
      const normalized = maxVal > 0 ? value / maxVal : 0;
      if (normalized <= 0.2) return '🔷';
      else if (normalized <= 0.4) return '🔹';
      else if (normalized <= 0.6) return '🟦';
      else if (normalized <= 0.8) return '🔵';
      else return '🟦';
    };

    const maxVal = Math.max(...heatmapData.flatMap(day => day.hours.map((h: any) => h.transactions)));

    const heatmapExportData = [
      ['АКТИВНОСТЬ ПО ДНЯМ И ЧАСАМ (ТЕПЛОВАЯ КАРТА)'],
      [''],
      heatmapHeaders,
      ...heatmapData.map(day => {
        const rowData = [day.dayName, day.date];
        day.hours.forEach((hourData: any) => {
          const cellValue = hourData.transactions > 0
            ? `${hourData.transactions} ${getColorIndicator(hourData.transactions, maxVal)}`
            : getColorIndicator(0, maxVal);
          rowData.push(cellValue);
        });
        return rowData;
      })
    ];

    const heatmapWorksheet = XLSX.utils.aoa_to_sheet(heatmapExportData);

    const heatmapColWidths = [
      { wch: 12 },
      { wch: 12 }
    ];

    for (let i = 0; i < 24; i++) {
      heatmapColWidths.push({ wch: 6 });
    }

    heatmapWorksheet['!cols'] = heatmapColWidths;

    if (heatmapWorksheet['A1']) {
      heatmapWorksheet['A1'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' }
      };
    }

    XLSX.utils.book_append_sheet(workbook, heatmapWorksheet, 'Тепловая карта');
  }
};
