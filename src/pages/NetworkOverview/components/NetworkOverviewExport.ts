import { loadPdfMake } from "@/utils/pdfMake";
import { loadXlsx } from "@/utils/xlsxLoader";
import { getFuelPriority } from "../hooks/useNetworkOverviewStats";
import {
  fetchReceipts,
  flattenReceipts,
  calculateReceiptsStats,
} from "@/services/receiptsService";
import type { FlatReceipt } from "@/types/receipts";

/** Строка сводки поступлений топлива по виду за период */
export interface ReceiptFuelRow {
  fuelType: string;
  count: number;   // Кол-во поступлений (ТТН)
  volume: number;  // Фактический объём, л
}

/**
 * Загрузка поступлений топлива за период и агрегация по видам топлива.
 * Переиспользует receiptsService (API /v1/report/receipts).
 * @param externalIds external_id сетей (system). При выбранной точке — только её родная сеть.
 * @param station номер точки (external_id); undefined = все точки сети.
 */
export async function loadReceiptsByFuel(params: {
  externalIds: string[];
  station?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<ReceiptFuelRow[]> {
  const { externalIds, station, dateFrom, dateTo } = params;
  const all: FlatReceipt[] = [];

  for (const sys of externalIds) {
    const systemNum = Number(sys);
    if (!systemNum || isNaN(systemNum)) continue;
    try {
      const resp = await fetchReceipts({
        system: systemNum,
        station: station ? Number(station) : undefined,
        dt_beg: dateFrom,
        dt_end: dateTo,
      });
      all.push(...flattenReceipts(resp));
    } catch {
      // Поступления по сети недоступны — пропускаем, отчёт формируем без них
    }
  }

  const stats = calculateReceiptsStats(all);
  return Object.entries(stats.byFuelType)
    .map(([fuelType, v]) => ({ fuelType, count: v.count, volume: v.volume }))
    .sort((a, b) => {
      const pa = getFuelPriority(a.fuelType);
      const pb = getFuelPriority(b.fuelType);
      if (pa !== pb) return pa - pb;
      return a.fuelType.localeCompare(b.fuelType, 'ru');
    });
}

interface ExportToExcelParams {
  dateFrom: string;
  dateTo: string;
  selectedNetwork: any;
  selectedTradingPoint: any;
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  filteredTransactions: any[];
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  paymentFuelBreakdown: Record<string, Record<string, { operations: number; revenue: number; volume: number }>>;
  dailyActivityData: any[];
  dailySalesData: { data: any[]; fuelTypes: string[] };
  heatmapData: any[];
  receiptsByFuel?: ReceiptFuelRow[];
  toast: (opts: any) => void;
}

export async function exportToExcel({
  dateFrom,
  dateTo,
  selectedNetwork,
  selectedTradingPoint,
  totalRevenue,
  totalVolume,
  averageCheck,
  filteredTransactions,
  fuelTypeStats,
  paymentTypeStats,
  paymentFuelBreakdown,
  dailyActivityData,
  dailySalesData,
  heatmapData,
  receiptsByFuel,
  toast,
}: ExportToExcelParams) {
  try {
    const XLSX = await loadXlsx();

    const workbook = XLSX.utils.book_new();

    // Лист 1: Основные показатели с таблицами
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

    // Добавляем таблицу по видам топлива
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

    // Добавляем таблицу поступлений топлива по видам (приход за период)
    if (receiptsByFuel && receiptsByFuel.length > 0) {
      const receiptsTotalVolume = receiptsByFuel.reduce((sum, r) => sum + r.volume, 0);
      const receiptsTotalCount = receiptsByFuel.reduce((sum, r) => sum + r.count, 0);

      mainData.push(['ПОСТУПЛЕНИЯ ТОПЛИВА ПО ВИДАМ']);
      mainData.push(['']);
      mainData.push(['Вид топлива', 'Поступлений', 'Объем (л)']);

      receiptsByFuel.forEach(fuel => {
        mainData.push([
          fuel.fuelType,
          fuel.count,
          Number(fuel.volume.toFixed(2)),
        ]);
      });

      mainData.push([
        'ИТОГО',
        receiptsTotalCount,
        Number(receiptsTotalVolume.toFixed(2)),
      ]);

      mainData.push(['']);
      mainData.push(['']);
    }

    // Добавляем таблицу по способам оплаты
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

      // Детальная разбивка по способам оплаты и видам топлива
      mainData.push(['ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА']);
      mainData.push(['']);

      const allFuelTypes = [...new Set(
        Object.values(paymentFuelBreakdown).flatMap(paymentData => Object.keys(paymentData))
      )].sort((a, b) => {
        const priorityA = getFuelPriority(a);
        const priorityB = getFuelPriority(b);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.localeCompare(b, 'ru');
      });

      const detailHeaders = ['Способ оплаты', 'Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', '% от способа оплаты'];
      mainData.push(detailHeaders);

      paymentTypeStats.forEach(payment => {
        const paymentData = paymentFuelBreakdown[payment.type] || {};
        let isFirstRow = true;

        const fuelTypesForPayment = Object.keys(paymentData).sort((a, b) => {
          const priorityA = getFuelPriority(a);
          const priorityB = getFuelPriority(b);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return a.localeCompare(b, 'ru');
        });

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

    const range = XLSX.utils.decode_range(mainWorksheet['!ref']!);

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
    const receiptsStatsIndex = mainData.findIndex(row => row[0] === 'ПОСТУПЛЕНИЯ ТОПЛИВА ПО ВИДАМ');
    const paymentStatsIndex = mainData.findIndex(row => row[0] === 'СТАТИСТИКА ПО СПОСОБАМ ОПЛАТЫ');
    const detailStatsIndex = mainData.findIndex(row => row[0] === 'ДЕТАЛЬНАЯ СТАТИСТИКА: СПОСОБЫ ОПЛАТЫ × ВИДЫ ТОПЛИВА');

    if (fuelStatsIndex > -1) headerCells.push('A' + (fuelStatsIndex + 1));
    if (receiptsStatsIndex > -1) headerCells.push('A' + (receiptsStatsIndex + 1));
    if (paymentStatsIndex > -1) headerCells.push('A' + (paymentStatsIndex + 1));
    if (detailStatsIndex > -1) headerCells.push('A' + (detailStatsIndex + 1));

    headerCells.forEach(cellAddr => {
      if ((mainWorksheet as any)[cellAddr]) {
        (mainWorksheet as any)[cellAddr].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'left' }
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Основные показатели');

    // Лист 2: Активность по часам
    if (dailyActivityData.length > 0) {
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

      if ((hourlyWorksheet as any)['A1']) {
        (hourlyWorksheet as any)['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center' }
        };
      }

      XLSX.utils.book_append_sheet(workbook, hourlyWorksheet, 'Активность по часам');
    }

    // Лист 3: Реализация по дням
    if (dailySalesData.data.length > 0) {
      const salesHeaders = ['Дата', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)'];
      dailySalesData.fuelTypes.forEach(fuelType => {
        salesHeaders.push(`${fuelType} (₽)`);
      });

      const salesData = [
        ['РЕАЛИЗАЦИЯ ПО ДНЯМ С РАЗБИВКОЙ ПО ТОПЛИВУ'],
        [''],
        salesHeaders,
        ...dailySalesData.data.map((day: any) => {
          const baseData: any[] = [
            day.date,
            day.operations,
            Number(day.revenue.toFixed(2)),
            Number(day.volume.toFixed(2)),
            day.operations > 0 ? Number((day.revenue / day.operations).toFixed(2)) : 0
          ];

          dailySalesData.fuelTypes.forEach(fuelType => {
            baseData.push(Number((day[fuelType] || 0).toFixed(2)));
          });

          return baseData;
        })
      ];

      const salesWorksheet = XLSX.utils.aoa_to_sheet(salesData);

      const salesColWidths: { wch: number }[] = [
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

      if ((salesWorksheet as any)['A1']) {
        (salesWorksheet as any)['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center' }
        };
      }

      XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Реализация по дням');
    }

    // Лист 4: Тепловая карта активности
    if (heatmapData.length > 0) {
      const heatmapHeaders = ['День недели', 'Дата'];
      for (let hour = 0; hour < 24; hour++) {
        heatmapHeaders.push(`${hour.toString().padStart(2, '0')}:00`);
      }

      const getColorIndicator = (value: number) => {
        if (value === 0) return '\u2B1C';

        const maxVal = Math.max(...heatmapData.flatMap((day: any) => day.hours.map((h: any) => h.transactions)));
        const normalized = maxVal > 0 ? value / maxVal : 0;

        if (normalized <= 0.2) return '\uD83D\uDD37';
        else if (normalized <= 0.4) return '\uD83D\uDD39';
        else if (normalized <= 0.6) return '\uD83D\uDFE6';
        else if (normalized <= 0.8) return '\uD83D\uDD35';
        else return '\uD83D\uDFE6';
      };

      const heatmapExportData: any[] = [
        ['АКТИВНОСТЬ ПО ДНЯМ И ЧАСАМ (ТЕПЛОВАЯ КАРТА)'],
        [''],
        heatmapHeaders,
        ...heatmapData.map((day: any) => {
          const rowData: any[] = [day.dayName, day.date];
          day.hours.forEach((hourData: any) => {
            const cellValue = hourData.transactions > 0
              ? `${hourData.transactions} ${getColorIndicator(hourData.transactions)}`
              : getColorIndicator(0);
            rowData.push(cellValue);
          });
          return rowData;
        })
      ];

      const heatmapWorksheet = XLSX.utils.aoa_to_sheet(heatmapExportData);

      const heatmapColWidths: { wch: number }[] = [
        { wch: 12 },
        { wch: 12 }
      ];

      for (let i = 0; i < 24; i++) {
        heatmapColWidths.push({ wch: 6 });
      }

      heatmapWorksheet['!cols'] = heatmapColWidths;

      if ((heatmapWorksheet as any)['A1']) {
        (heatmapWorksheet as any)['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center' }
        };
      }

      const heatmapRange = XLSX.utils.decode_range(heatmapWorksheet['!ref']!);

      const allValues: number[] = [];
      heatmapData.forEach((day: any) => {
        day.hours.forEach((hourData: any) => {
          if (hourData.transactions > 0) {
            allValues.push(hourData.transactions);
          }
        });
      });

      if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);

        const getBlueColor = (value: number) => {
          if (value === 0) return 'FFFFFF';

          const normalized = maxValue > minValue ? (value - minValue) / (maxValue - minValue) : 0;

          if (normalized <= 0.2) return 'E3F2FD';
          else if (normalized <= 0.4) return 'BBDEFB';
          else if (normalized <= 0.6) return '90CAF9';
          else if (normalized <= 0.8) return '64B5F6';
          else return '2196F3';
        };

        heatmapData.forEach((day: any, dayIndex: number) => {
          const rowIndex = dayIndex + 3;

          day.hours.forEach((hourData: any, hourIndex: number) => {
            const colIndex = hourIndex + 2;
            const cellAddr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });

            if ((heatmapWorksheet as any)[cellAddr]) {
              const bgColor = getBlueColor(hourData.transactions);

              if (!(heatmapWorksheet as any)[cellAddr].s) {
                (heatmapWorksheet as any)[cellAddr].s = {};
              }

              (heatmapWorksheet as any)[cellAddr].s = {
                ...(heatmapWorksheet as any)[cellAddr].s,
                fill: {
                  patternType: 'solid',
                  fgColor: { rgb: bgColor }
                },
                alignment: {
                  horizontal: 'center',
                  vertical: 'middle'
                },
                font: {
                  sz: 10,
                  color: { rgb: hourData.transactions > 0 && bgColor === '2196F3' ? 'FFFFFF' : '000000' }
                },
                border: {
                  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
                  right: { style: 'thin', color: { rgb: 'CCCCCC' } }
                }
              };
            }
          });
        });

        const dataStartRow = 4;
        const dataStartCol = 3;
        const dataEndRow = dataStartRow + heatmapData.length - 1;
        const dataEndCol = dataStartCol + 23;

        if (!(heatmapWorksheet as any)['!conditionalFormatting']) {
          (heatmapWorksheet as any)['!conditionalFormatting'] = [];
        }

        (heatmapWorksheet as any)['!conditionalFormatting'].push({
          ref: XLSX.utils.encode_range({
            s: { r: dataStartRow - 1, c: dataStartCol - 1 },
            e: { r: dataEndRow - 1, c: dataEndCol - 1 }
          }),
          rules: [
            {
              type: 'colorScale',
              priority: 1,
              colorScale: {
                cfvo: [
                  { type: 'min', val: 0 },
                  { type: 'percentile', val: 50 },
                  { type: 'max', val: maxValue }
                ],
                color: [
                  { rgb: 'FFFFFF' },
                  { rgb: '90CAF9' },
                  { rgb: '2196F3' }
                ]
              }
            }
          ]
        });

        const legendStartRow = heatmapData.length + 6;

        const legendTitleAddr = XLSX.utils.encode_cell({ r: legendStartRow, c: 0 });
        (heatmapWorksheet as any)[legendTitleAddr] = {
          v: 'ЦВЕТОВАЯ ЛЕГЕНДА:',
          t: 's',
          s: {
            font: { bold: true, sz: 12 },
            alignment: { horizontal: 'left' }
          }
        };

        const legendItems = [
          { label: '0 операций', indicator: '\u2B1C' },
          { label: `1-${Math.ceil(maxValue * 0.2)} операций (низкая активность)`, indicator: '\uD83D\uDD37' },
          { label: `${Math.ceil(maxValue * 0.2 + 1)}-${Math.ceil(maxValue * 0.4)} операций (ниже среднего)`, indicator: '\uD83D\uDD39' },
          { label: `${Math.ceil(maxValue * 0.4 + 1)}-${Math.ceil(maxValue * 0.6)} операций (средняя активность)`, indicator: '\uD83D\uDFE6' },
          { label: `${Math.ceil(maxValue * 0.6 + 1)}-${Math.ceil(maxValue * 0.8)} операций (высокая активность)`, indicator: '\uD83D\uDD35' },
          { label: `${Math.ceil(maxValue * 0.8 + 1)}+ операций (максимальная активность)`, indicator: '\uD83D\uDFE6' }
        ];

        legendItems.forEach((item, index) => {
          const legendRow = legendStartRow + index + 2;

          const indicatorCellAddr = XLSX.utils.encode_cell({ r: legendRow, c: 0 });
          (heatmapWorksheet as any)[indicatorCellAddr] = {
            v: item.indicator,
            t: 's',
            s: {
              font: { sz: 16 },
              alignment: { horizontal: 'center', vertical: 'middle' }
            }
          };

          const labelCellAddr = XLSX.utils.encode_cell({ r: legendRow, c: 1 });
          (heatmapWorksheet as any)[labelCellAddr] = {
            v: item.label,
            t: 's',
            s: {
              font: { sz: 10 },
              alignment: { horizontal: 'left', vertical: 'middle' }
            }
          };
        });

        const newRange = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: legendStartRow + legendItems.length + 3, c: 25 }
        });
        heatmapWorksheet['!ref'] = newRange;
      }

      XLSX.utils.book_append_sheet(workbook, heatmapWorksheet, 'Тепловая карта');
    }

    // Генерируем имя файла
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const networkName = selectedNetwork?.name?.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_') || 'network';
    const fileName = `Обзор_${networkName}_${dateStr}_${timeStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Экспорт завершен",
      description: `Данные сохранены в файл: ${fileName}`,
    });

  } catch (error) {
    toast({
      title: "Ошибка экспорта",
      description: "Не удалось создать Excel файл. Попробуйте еще раз.",
      variant: "destructive",
    });
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Таймаут генерации изображения')), ms)
    ),
  ]);
}

interface ExportDashboardToPdfParams {
  initializing: boolean;
  selectedNetwork: any;
  selectedTradingPoint: any;
  filteredTransactions: any[];
  completedTransactions: any[];
  prevPeriodTransactions: any[];
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  receiptsByFuel?: ReceiptFuelRow[];
  dateFrom: string;
  dateTo: string;
  loading: boolean;
  exportingPdf: boolean;
  setExportingPdf: (v: boolean) => void;
  dailySalesCardRef: React.RefObject<HTMLDivElement | null>;
  heatmapCardRef: React.RefObject<HTMLDivElement | null>;
  activityCardRef: React.RefObject<HTMLDivElement | null>;
  comparisonCardRef: React.RefObject<HTMLDivElement | null>;
  toast: (opts: any) => void;
}

export async function exportDashboardToPdf({
  initializing,
  selectedNetwork,
  selectedTradingPoint,
  filteredTransactions,
  completedTransactions,
  prevPeriodTransactions,
  totalRevenue,
  totalVolume,
  averageCheck,
  fuelTypeStats,
  paymentTypeStats,
  receiptsByFuel,
  dateFrom,
  dateTo,
  loading,
  exportingPdf,
  setExportingPdf,
  dailySalesCardRef,
  heatmapCardRef,
  activityCardRef,
  comparisonCardRef,
  toast,
}: ExportDashboardToPdfParams) {
  if (initializing || !selectedNetwork || filteredTransactions.length === 0) {
    toast({
      title: "Нет данных для экспорта",
      description: "Выберите сеть, период и дождитесь загрузки аналитики",
      variant: "destructive",
    });
    return;
  }

  setExportingPdf(true);

  try {
    const pdfMake = await loadPdfMake();

    const formatNumber = (value: number) =>
      value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatCurrency = (value: number) => `${formatNumber(value)} ₽`;

    const captureElement = async (element: HTMLDivElement | null) => {
      if (!element) return null;

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await withTimeout(
        html2canvas(element, {
          backgroundColor: 'hsl(var(--background))',
          scale: Math.min(window.devicePixelRatio || 1, 2),
          useCORS: true,
        }),
        15000
      );

      return canvas.toDataURL('image/png');
    };

    const [dailySalesImage, heatmapImage, activityImage, forecastImage] = await Promise.all([
      captureElement(dailySalesCardRef.current),
      captureElement(heatmapCardRef.current),
      captureElement(activityCardRef.current),
      captureElement(comparisonCardRef.current),
    ]);

    const pointDisplay = (() => {
      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        return 'Все торговые точки';
      }

      if (typeof selectedTradingPoint === 'string') {
        return selectedTradingPoint;
      }

      return selectedTradingPoint?.name ?? '\u2014';
    })();

    const content: any[] = [
      { text: 'Обзор сети', style: 'title' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `Сеть: ${selectedNetwork?.name ?? '\u2014'}`, style: 'infoBlock' },
              { text: `Точка: ${pointDisplay}`, style: 'infoBlock' },
              { text: `Период: ${dateFrom} \u2013 ${dateTo}`, style: 'infoBlock' },
              { text: `Сформировано: ${new Date().toLocaleString('ru-RU')}`, style: 'infoBlock' },
            ],
          },
          {
            width: '*',
            alignment: 'right',
            stack: [
              { text: `Операции: ${filteredTransactions.length}`, style: 'summaryBlock' },
              { text: `Отпуск, л: ${formatNumber(totalVolume)}`, style: 'summaryBlock' },
              { text: `Выручка: ${formatCurrency(totalRevenue)}`, style: 'summaryBlock' },
              { text: `Средний чек: ${formatCurrency(averageCheck)}`, style: 'summaryBlock' },
            ],
          },
        ],
        columnGap: 16,
        margin: [0, 0, 0, 16],
      },
    ];

    const fuelSummary = fuelTypeStats.slice(0, 6);
    const paymentSummary = paymentTypeStats.slice(0, 6);

    const breakdownColumns: any[] = [];

    if (fuelSummary.length > 0) {
      breakdownColumns.push({
        width: '*',
        stack: [
          { text: 'Итоги по видам топлива', style: 'sectionLabel' },
          ...fuelSummary.map((fuel) => ({
            text: `${fuel.type}: ${formatNumber(fuel.volume)} л \u2022 ${formatCurrency(fuel.revenue)} \u2022 ${fuel.operations} оп.`,
            style: 'summaryDetail',
          })),
        ],
      });
    }

    if (paymentSummary.length > 0) {
      breakdownColumns.push({
        width: '*',
        stack: [
          { text: 'Итоги по типам оплаты', style: 'sectionLabel' },
          ...paymentSummary.map((payment) => ({
            text: `${payment.type}: ${formatNumber(payment.volume)} л \u2022 ${formatCurrency(payment.revenue)} \u2022 ${payment.operations} оп.`,
            style: 'summaryDetail',
          })),
        ],
      });
    }

    if (breakdownColumns.length > 0) {
      content.push({
        columns: breakdownColumns,
        columnGap: 18,
        margin: [0, 0, 0, 16],
      });
    }

    // Поступления топлива по видам за период (приход)
    if (receiptsByFuel && receiptsByFuel.length > 0) {
      const receiptsTotalVolume = receiptsByFuel.reduce((sum, r) => sum + r.volume, 0);
      content.push({
        stack: [
          { text: 'Поступления топлива по видам', style: 'sectionLabel' },
          ...receiptsByFuel.map((fuel) => ({
            text: `${fuel.fuelType}: ${formatNumber(fuel.volume)} л • ${fuel.count} пост.`,
            style: 'summaryDetail',
          })),
          { text: `Итого поступило: ${formatNumber(receiptsTotalVolume)} л`, style: 'summaryDetail' },
        ],
        margin: [0, 0, 0, 16],
      });
    }

    if (dailySalesImage) {
      content.push({ text: 'Реализация по дням', style: 'sectionLabel', margin: [0, 0, 0, 8] });
      content.push({ image: dailySalesImage, width: 520, margin: [0, 0, 0, 16] });
    }

    if (heatmapImage) {
      content.push({ text: 'Активность операций (тепловая карта)', style: 'sectionLabel', margin: [0, 0, 0, 8] });
      content.push({ image: heatmapImage, width: 520, margin: [0, 0, 0, 16] });
    }

    if (activityImage) {
      content.push({ text: 'Суточная активность по часам', style: 'sectionLabel', margin: [0, 0, 0, 8] });
      content.push({ image: activityImage, width: 520, margin: [0, 0, 0, 16] });
    }

    if (forecastImage) {
      content.push({ text: 'Сравнение периодов', style: 'sectionLabel', margin: [0, 0, 0, 8] });
      content.push({ image: forecastImage, width: 520, margin: [0, 0, 0, 16] });
    }

    const networkSlug = (selectedNetwork?.name || 'network')
      .replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const docDefinition = {
      info: {
        title: 'Обзор сети',
        author: 'TradePoint Builder',
        subject: 'Экспорт дашборда',
      },
      pageOrientation: 'landscape' as const,
      pageMargins: [24, 24, 24, 32] as [number, number, number, number],
      content,
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 12] as [number, number, number, number],
          color: '#111827',
        },
        infoBlock: {
          fontSize: 10,
          color: '#111827',
        },
        summaryBlock: {
          fontSize: 11,
          color: '#111827',
        },
        sectionLabel: {
          fontSize: 11,
          color: '#111827',
          bold: true,
          margin: [0, 0, 0, 4] as [number, number, number, number],
        },
        summaryDetail: {
          fontSize: 10,
          color: '#374151',
          margin: [0, 0, 0, 2] as [number, number, number, number],
        },
        tableHeader: {
          bold: true,
          color: '#f9fafb',
          fontSize: 10,
        },
        tableCell: {
          fontSize: 9,
          color: '#111827',
          noWrap: false,
          lineHeight: 1.2,
        },
        tableCellMono: {
          fontSize: 8,
          color: '#111827',
          font: 'Roboto',
          noWrap: false,
          lineHeight: 1.2,
        },
      },
      defaultStyle: {
        font: 'Roboto',
      },
    };

    const fileName = `dashboard_${networkSlug || 'network'}_${dateFrom}_${dateTo}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    toast({
      title: "PDF готов",
      description: `Файл ${fileName} сформирован и загружен`,
    });
  } catch (error) {
    toast({
      title: "Ошибка экспорта",
      description: error instanceof Error ? error.message : 'Не удалось сформировать PDF',
      variant: "destructive",
    });
  } finally {
    setExportingPdf(false);
  }
}
