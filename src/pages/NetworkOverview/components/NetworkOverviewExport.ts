import { loadPdfMake } from "@/utils/pdfMake";
import { loadXlsx } from "@/utils/xlsxLoader";
import { classifyPayment } from "@/utils/paymentUtils";
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

/** Ячейка разбивки «способ оплаты × вид топлива» */
export interface PaymentFuelCell { operations: number; revenue: number; volume: number }

/**
 * Разбивка «способ оплаты × вид топлива» из серверного кросс-разреза byFuelPayment.
 * Ключ верхнего уровня — method (тот же, что в paymentTypeStats.type), поэтому
 * детальная таблица Excel сходится с таблицей оплат и с экраном. Пустые fuel/method
 * схлопываются в «Неизвестно», поэтому значения именно накапливаются, а не заменяются.
 */
export function buildPaymentFuelBreakdown(
  rows: { fuel: string; method: string; operations: number; volume: number; revenue: number }[] | undefined
): Record<string, Record<string, PaymentFuelCell>> {
  const out: Record<string, Record<string, PaymentFuelCell>> = {};
  if (!rows) return out;

  for (const r of rows) {
    const method = r.method || 'Неизвестно';
    const fuel = r.fuel || 'Неизвестно';
    if (!out[method]) out[method] = {};
    const cell = out[method][fuel] || (out[method][fuel] = { operations: 0, revenue: 0, volume: 0 });
    cell.operations += r.operations;
    cell.revenue += r.revenue;
    cell.volume += r.volume;
  }
  return out;
}

interface ExportToExcelParams {
  dateFrom: string;
  dateTo: string;
  selectedNetwork: any;
  selectedTradingPoint: any;
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  operationsCount: number;
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  paymentFuelBreakdown: Record<string, Record<string, { operations: number; revenue: number; volume: number }>>;
  dailyActivityData: any[];
  dailySalesData: { data: any[]; fuelTypes: string[] };
  heatmapData: any[];
  receiptsByFuel?: ReceiptFuelRow[];
  /** Разрез по станциям (overview.byStation) */
  stationStats?: { stationCode: number; operations: number; volume: number; revenue: number }[];
  /** Станция × топливо (detailed.byStationFuel) */
  stationFuelStats?: { stationCode: number; fuel: string; operations: number; volume: number; revenue: number }[];
  /** Станция × день (detailed.byStationDay) — динамика выручки по точкам */
  stationDayStats?: { stationCode: number; date: string; operations: number; volume: number; revenue: number }[];
  /** Номер станции → название точки; для номеров без названия подписываем «Станция N» */
  stationNames?: Record<string, string>;
  /** Агрегаты текущего периода — для сравнения периодов и паттерна по дням недели */
  currentPeriod?: PeriodAggregate;
  /** Агрегаты предыдущего периода той же длины */
  previousPeriod?: PeriodAggregate;
  /** Границы предыдущего периода — в подпись блока сравнения */
  previousPeriodRange?: { from: string; to: string };
  /** День × способ оплаты (detailed.byDayPayment) — структура оплат по дням */
  dayPayments?: { date: string; method: string; operations: number; revenue: number }[];
  /** Дневной агрегат частных операций — средний чек частного клиента */
  retailByDay?: { date: string; operations: number; revenue: number }[];
  toast: (opts: any) => void;
}

interface PeriodAggregate {
  kpi: { operations: number; volume: number; revenue: number; avgCheck: number };
  byDay: { date: string; operations: number; volume: number; revenue: number }[];
}

export async function exportToExcel({
  dateFrom,
  dateTo,
  selectedNetwork,
  selectedTradingPoint,
  totalRevenue,
  totalVolume,
  averageCheck,
  operationsCount,
  fuelTypeStats,
  paymentTypeStats,
  paymentFuelBreakdown,
  dailyActivityData,
  dailySalesData,
  heatmapData,
  receiptsByFuel,
  stationStats,
  stationFuelStats,
  stationDayStats,
  stationNames,
  currentPeriod,
  previousPeriod,
  previousPeriodRange,
  dayPayments,
  retailByDay,
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
      ['Общая выручка (₽)', Number(totalRevenue.toFixed(2)), '', 'Количество операций', operationsCount],
      ['Общий объем (л)', Number(totalVolume.toFixed(2)), '', 'Средний чек (₽)', Number(averageCheck.toFixed(2))],
      ['Средний объем на операцию (л)', operationsCount > 0 ? Number((totalVolume / operationsCount).toFixed(2)) : 0],
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
        operationsCount,
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
        operationsCount,
        Number(totalRevenue.toFixed(2)),
        Number(totalVolume.toFixed(2)),
        Number(averageCheck.toFixed(2)),
        100
      ]);

      mainData.push(['']);
      mainData.push(['']);
    }

    // Детальная разбивка по способам оплаты и видам топлива.
    // Источник — серверный кросс-разрез byFuelPayment; если его нет, блок не выводим,
    // чтобы не печатать пустую таблицу с «0 видов топлива».
    if (paymentTypeStats.length > 0 && Object.keys(paymentFuelBreakdown).length > 0) {
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
        operationsCount,
        Number(totalRevenue.toFixed(2)),
        Number(totalVolume.toFixed(2)),
        Number(averageCheck.toFixed(2)),
        100
      ]);
    }

    // Оформление ячеек (жирные заголовки, заливка) здесь не задаётся: xlsx
    // (SheetJS Community) свойство cell.s при записи игнорирует. Разделы книги
    // разделены пустыми строками и заголовками-строками.
    const mainWorksheet = XLSX.utils.aoa_to_sheet(mainData);
    mainWorksheet['!cols'] = [
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    ];

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
      hourlyWorksheet['!cols'] = [{ wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];

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
      salesWorksheet['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
        ...dailySalesData.fuelTypes.map(() => ({ wch: 15 })),
      ];

      XLSX.utils.book_append_sheet(workbook, salesWorksheet, 'Реализация по дням');
    }

    // Лист 4: Торговые точки — то, что на экране показывает блок «Сравнение работы
    // станций» (выручка по точкам, точка × топливо). Раньше в файл не попадало.
    const stationLabel = (code: number) => stationNames?.[String(code)] || `Станция ${code}`;

    if (stationStats && stationStats.length > 0) {
      const stationsSorted = [...stationStats].sort((a, b) => b.revenue - a.revenue);
      const stationsRevenue = stationsSorted.reduce((sum, s) => sum + s.revenue, 0);

      const stationData: any[] = [
        [`ПОКАЗАТЕЛИ ПО ТОРГОВЫМ ТОЧКАМ: ${dateFrom} - ${dateTo}`],
        [''],
        ['Точка', 'Номер', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', 'Доля выручки (%)'],
      ];

      stationsSorted.forEach(s => {
        stationData.push([
          stationLabel(s.stationCode),
          s.stationCode,
          s.operations,
          Number(s.revenue.toFixed(2)),
          Number(s.volume.toFixed(2)),
          s.operations > 0 ? Number((s.revenue / s.operations).toFixed(2)) : 0,
          stationsRevenue > 0 ? Number(((s.revenue / stationsRevenue) * 100).toFixed(2)) : 0,
        ]);
      });

      const stationsOperations = stationsSorted.reduce((sum, s) => sum + s.operations, 0);
      stationData.push([
        'ИТОГО',
        '',
        stationsOperations,
        Number(stationsRevenue.toFixed(2)),
        Number(stationsSorted.reduce((sum, s) => sum + s.volume, 0).toFixed(2)),
        stationsOperations > 0 ? Number((stationsRevenue / stationsOperations).toFixed(2)) : 0,
        100,
      ]);

      // Точка × вид топлива
      if (stationFuelStats && stationFuelStats.length > 0) {
        stationData.push(['']);
        stationData.push(['']);
        stationData.push(['ДЕТАЛЬНАЯ СТАТИСТИКА: ТОРГОВЫЕ ТОЧКИ × ВИДЫ ТОПЛИВА']);
        stationData.push(['']);
        stationData.push(['Точка', 'Вид топлива', 'Операции', 'Выручка (₽)', 'Объем (л)', 'Средний чек (₽)', '% от точки']);

        stationsSorted.forEach(s => {
          const rows = stationFuelStats
            .filter(r => r.stationCode === s.stationCode)
            .sort((a, b) => {
              const pa = getFuelPriority(a.fuel || '');
              const pb = getFuelPriority(b.fuel || '');
              if (pa !== pb) return pa - pb;
              return (a.fuel || '').localeCompare(b.fuel || '', 'ru');
            });
          if (rows.length === 0) return;

          let isFirstRow = true;
          rows.forEach(r => {
            stationData.push([
              isFirstRow ? stationLabel(s.stationCode) : '',
              r.fuel || 'Неизвестно',
              r.operations,
              Number(r.revenue.toFixed(2)),
              Number(r.volume.toFixed(2)),
              r.operations > 0 ? Number((r.revenue / r.operations).toFixed(2)) : 0,
              s.revenue > 0 ? Number(((r.revenue / s.revenue) * 100).toFixed(2)) : 0,
            ]);
            isFirstRow = false;
          });

          stationData.push([
            `ИТОГО по "${stationLabel(s.stationCode)}"`,
            '',
            s.operations,
            Number(s.revenue.toFixed(2)),
            Number(s.volume.toFixed(2)),
            s.operations > 0 ? Number((s.revenue / s.operations).toFixed(2)) : 0,
            100,
          ]);
          stationData.push(['', '', '', '', '', '', '']);
        });
      }

      const stationWorksheet = XLSX.utils.aoa_to_sheet(stationData);
      stationWorksheet['!cols'] = [
        { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(workbook, stationWorksheet, 'Торговые точки');
    }

    // Лист 5: Динамика выручки по точкам (день × точка) — график «Динамика по точкам».
    if (stationDayStats && stationDayStats.length > 0) {
      const codes = stationStats && stationStats.length > 0
        ? [...stationStats].sort((a, b) => b.revenue - a.revenue).map(s => s.stationCode)
        : [...new Set(stationDayStats.map(r => r.stationCode))].sort((a, b) => a - b);

      const pad2 = (n: number) => String(n).padStart(2, '0');
      const byDate = new Map<string, Map<number, number>>();
      stationDayStats.forEach(r => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        if (!byDate.has(key)) byDate.set(key, new Map());
        const row = byDate.get(key)!;
        row.set(r.stationCode, (row.get(r.stationCode) || 0) + r.revenue);
      });

      const trendData: any[] = [
        [`ДИНАМИКА ВЫРУЧКИ ПО ТОРГОВЫМ ТОЧКАМ (₽): ${dateFrom} - ${dateTo}`],
        [''],
        ['Дата', ...codes.map(stationLabel), 'Итого (₽)'],
      ];

      [...byDate.keys()].sort().forEach(date => {
        const row = byDate.get(date)!;
        const values = codes.map(code => Number((row.get(code) || 0).toFixed(2)));
        trendData.push([date, ...values, Number(values.reduce((s, v) => s + v, 0).toFixed(2))]);
      });

      trendData.push([
        'ИТОГО',
        ...codes.map(code => {
          const total = [...byDate.values()].reduce((sum, row) => sum + (row.get(code) || 0), 0);
          return Number(total.toFixed(2));
        }),
        Number(stationDayStats.reduce((sum, r) => sum + r.revenue, 0).toFixed(2)),
      ]);

      const trendWorksheet = XLSX.utils.aoa_to_sheet(trendData);
      trendWorksheet['!cols'] = [{ wch: 12 }, ...codes.map(() => ({ wch: 18 })), { wch: 16 }];
      XLSX.utils.book_append_sheet(workbook, trendWorksheet, 'Динамика по точкам');
    }

    // Лист 6: Тренды — то, что показывает нижняя часть расширенного блока:
    // сравнение с прошлым периодом, средний чек частного клиента по дням,
    // структура оплат по дням и паттерн по дням недели.
    const trendSheet: any[] = [];

    // Блок 1: сравнение с предыдущим периодом той же длины
    if (currentPeriod && previousPeriod) {
      const splitDays = (agg: PeriodAggregate) => {
        let wdRevenue = 0, wdOps = 0, wdVolume = 0, wdDays = 0;
        let weRevenue = 0, weOps = 0, weVolume = 0, weDays = 0;
        for (const day of agg.byDay) {
          const d = new Date(day.date);
          if (isNaN(d.getTime())) continue;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          if (isWeekend) { weRevenue += day.revenue; weOps += day.operations; weVolume += day.volume; weDays++; }
          else { wdRevenue += day.revenue; wdOps += day.operations; wdVolume += day.volume; wdDays++; }
        }
        return { wdRevenue, wdOps, wdVolume, wdDays, weRevenue, weOps, weVolume, weDays };
      };

      const cur = splitDays(currentPeriod);
      const prv = splitDays(previousPeriod);
      const delta = (now: number, before: number) => Number((now - before).toFixed(2));
      // Роста «с нуля» в процентах не бывает — пишем прочерк, а не 0%.
      const deltaPct = (now: number, before: number) =>
        before > 0 ? Number((((now - before) / before) * 100).toFixed(2)) : '—';

      const prevLabel = previousPeriodRange
        ? `${previousPeriodRange.from} - ${previousPeriodRange.to}`
        : 'предыдущий период';

      trendSheet.push([`СРАВНЕНИЕ ПЕРИОДОВ: ${dateFrom} - ${dateTo} против ${prevLabel}`]);
      trendSheet.push(['']);
      trendSheet.push(['Показатель', 'Текущий период', 'Предыдущий период', 'Изменение', 'Изменение (%)']);

      const rows: [string, number, number][] = [
        ['Выручка (₽)', currentPeriod.kpi.revenue, previousPeriod.kpi.revenue],
        ['Объем (л)', currentPeriod.kpi.volume, previousPeriod.kpi.volume],
        ['Операции', currentPeriod.kpi.operations, previousPeriod.kpi.operations],
        ['Средний чек (₽)', currentPeriod.kpi.avgCheck, previousPeriod.kpi.avgCheck],
        ['Выручка в будни (₽)', cur.wdRevenue, prv.wdRevenue],
        ['Выручка в выходные (₽)', cur.weRevenue, prv.weRevenue],
        ['Операции в будни', cur.wdOps, prv.wdOps],
        ['Операции в выходные', cur.weOps, prv.weOps],
        ['Средняя выручка буднего дня (₽)', cur.wdDays > 0 ? cur.wdRevenue / cur.wdDays : 0, prv.wdDays > 0 ? prv.wdRevenue / prv.wdDays : 0],
        ['Средняя выручка выходного дня (₽)', cur.weDays > 0 ? cur.weRevenue / cur.weDays : 0, prv.weDays > 0 ? prv.weRevenue / prv.weDays : 0],
      ];

      rows.forEach(([label, now, before]) => {
        trendSheet.push([
          label,
          Number(now.toFixed(2)),
          Number(before.toFixed(2)),
          delta(now, before),
          deltaPct(now, before),
        ]);
      });

      trendSheet.push(['Дней в периоде', cur.wdDays + cur.weDays, prv.wdDays + prv.weDays, '', '']);
      trendSheet.push(['']);
      trendSheet.push(['']);
    }

    // Блок 2: средний чек частного клиента по дням (без корп. карт, талонов и купонов)
    if (retailByDay && retailByDay.length > 0) {
      trendSheet.push(['СРЕДНИЙ ЧЕК ЧАСТНОГО КЛИЕНТА ПО ДНЯМ (без корп. карт, талонов и купонов)']);
      trendSheet.push(['']);
      trendSheet.push(['Дата', 'Операции', 'Выручка (₽)', 'Средний чек (₽)']);

      let totalOps = 0;
      let totalRevenue = 0;
      retailByDay.forEach(d => {
        totalOps += d.operations;
        totalRevenue += d.revenue;
        trendSheet.push([
          d.date,
          d.operations,
          Number(d.revenue.toFixed(2)),
          d.operations > 0 ? Number((d.revenue / d.operations).toFixed(2)) : 0,
        ]);
      });

      trendSheet.push([
        'ИТОГО',
        totalOps,
        Number(totalRevenue.toFixed(2)),
        totalOps > 0 ? Number((totalRevenue / totalOps).toFixed(2)) : 0,
      ]);
      trendSheet.push(['']);
      trendSheet.push(['']);
    }

    // Блок 3: структура оплат по дням. Группы те же, что на графике «Структура
    // клиентов»: корпоративные = топливные карты + корп. договоры + купоны/талоны.
    if (dayPayments && dayPayments.length > 0) {
      const pad2 = (n: number) => String(n).padStart(2, '0');
      const groups = new Map<string, { cash: number; card: number; online: number; corp: number }>();
      dayPayments.forEach(r => {
        if (r.revenue <= 0) return;
        const d = new Date(r.date);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        const cat = classifyPayment(r.method || '');
        const group = (cat === 'fuel_card' || cat === 'corporate' || cat === 'coupon') ? 'corp'
          : cat === 'card' ? 'card'
          : cat === 'online' ? 'online'
          : 'cash';
        const cell = groups.get(key) || { cash: 0, card: 0, online: 0, corp: 0 };
        cell[group] += r.revenue;
        groups.set(key, cell);
      });

      if (groups.size > 0) {
        trendSheet.push(['СТРУКТУРА ОПЛАТ ПО ДНЯМ (выручка, ₽)']);
        trendSheet.push(['']);
        trendSheet.push(['Дата', 'Наличные', 'Карты', 'Онлайн', 'Корпоративные', 'Итого', 'Доля частных (%)', 'Доля корпоративных (%)']);

        const totals = { cash: 0, card: 0, online: 0, corp: 0 };
        [...groups.keys()].sort().forEach(date => {
          const v = groups.get(date)!;
          const total = v.cash + v.card + v.online + v.corp;
          totals.cash += v.cash; totals.card += v.card; totals.online += v.online; totals.corp += v.corp;
          trendSheet.push([
            date,
            Number(v.cash.toFixed(2)),
            Number(v.card.toFixed(2)),
            Number(v.online.toFixed(2)),
            Number(v.corp.toFixed(2)),
            Number(total.toFixed(2)),
            total > 0 ? Number((((v.cash + v.card + v.online) / total) * 100).toFixed(2)) : 0,
            total > 0 ? Number(((v.corp / total) * 100).toFixed(2)) : 0,
          ]);
        });

        const grandTotal = totals.cash + totals.card + totals.online + totals.corp;
        trendSheet.push([
          'ИТОГО',
          Number(totals.cash.toFixed(2)),
          Number(totals.card.toFixed(2)),
          Number(totals.online.toFixed(2)),
          Number(totals.corp.toFixed(2)),
          Number(grandTotal.toFixed(2)),
          grandTotal > 0 ? Number((((totals.cash + totals.card + totals.online) / grandTotal) * 100).toFixed(2)) : 0,
          grandTotal > 0 ? Number(((totals.corp / grandTotal) * 100).toFixed(2)) : 0,
        ]);
        trendSheet.push(['']);
        trendSheet.push(['']);
      }
    }

    // Блок 4: паттерн по дням недели (средние за день недели по всем дням периода)
    if (currentPeriod && currentPeriod.byDay.length > 0) {
      const names = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
      const weekdays = Array.from({ length: 7 }, () => ({ revenue: 0, volume: 0, operations: 0, days: 0 }));

      currentPeriod.byDay.forEach(day => {
        const d = new Date(day.date);
        if (isNaN(d.getTime())) return;
        if (day.revenue <= 0) return; // как на графике: дни без выручки не усредняем
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        weekdays[idx].revenue += day.revenue;
        weekdays[idx].volume += day.volume;
        weekdays[idx].operations += day.operations;
        weekdays[idx].days++;
      });

      if (weekdays.some(w => w.days > 0)) {
        trendSheet.push(['АКТИВНОСТЬ ПО ДНЯМ НЕДЕЛИ (средние значения за день)']);
        trendSheet.push(['']);
        trendSheet.push(['День недели', 'Дней в периоде', 'Средняя выручка (₽)', 'Средние операции', 'Средний объем (л)', 'Выручка за период (₽)']);

        weekdays.forEach((w, i) => {
          const days = w.days || 1;
          trendSheet.push([
            names[i],
            w.days,
            Number((w.revenue / days).toFixed(2)),
            Math.round(w.operations / days),
            Number((w.volume / days).toFixed(2)),
            Number(w.revenue.toFixed(2)),
          ]);
        });
      }
    }

    if (trendSheet.length > 0) {
      const trendWorksheet = XLSX.utils.aoa_to_sheet(trendSheet);
      trendWorksheet['!cols'] = [
        { wch: 38 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 22 },
      ];
      XLSX.utils.book_append_sheet(workbook, trendWorksheet, 'Тренды');
    }

    // Лист 7: Тепловая карта активности
    if (heatmapData.length > 0) {
      const heatmapHeaders = ['День недели', 'Дата'];
      for (let hour = 0; hour < 24; hour++) {
        heatmapHeaders.push(`${hour.toString().padStart(2, '0')}:00`);
      }

      // Максимум по всей карте — один раз на лист (раньше пересчитывался в каждой
      // из 24×N ячеек).
      let peakTransactions = 0;
      heatmapData.forEach((day: any) => {
        day.hours.forEach((h: any) => {
          if (h.transactions > peakTransactions) peakTransactions = h.transactions;
        });
      });

      // 4 ступени активности, каждая своим символом. Раньше ступеней было 5, но
      // «средняя» и «максимальная» рисовались одним 🟦 — по файлу их различить
      // было нельзя, и легенда врала.
      const getColorIndicator = (value: number) => {
        if (value === 0) return '\u2B1C';

        const normalized = peakTransactions > 0 ? value / peakTransactions : 0;

        if (normalized <= 0.25) return '\uD83D\uDD39';
        else if (normalized <= 0.5) return '\uD83D\uDD37';
        else if (normalized <= 0.75) return '\uD83D\uDD35';
        else return '\uD83D\uDFE6';
      };

      const heatmapExportData: any[] = [
        [`АКТИВНОСТЬ ПО ДНЯМ И ЧАСАМ (ТЕПЛОВАЯ КАРТА): ${dateFrom} - ${dateTo}`],
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

      // Легенда — обычными строками листа. Заливку ячеек и color scale тут
      // держать бессмысленно: xlsx (SheetJS Community) стили не пишет, поэтому
      // уровень активности показываем символом рядом с числом. Понадобится
      // настоящее оформление — книгу надо собирать на ExcelJS, как в сменном
      // отчёте (src/services/excelExportWithStyles.ts).
      if (peakTransactions > 0) {
        // Границы ступеней — те же четверти от пика, что в getColorIndicator.
        const q1 = Math.ceil(peakTransactions * 0.25);
        const q2 = Math.ceil(peakTransactions * 0.5);
        const q3 = Math.ceil(peakTransactions * 0.75);

        heatmapExportData.push(['']);
        heatmapExportData.push(['']);
        heatmapExportData.push(['ЦВЕТОВАЯ ЛЕГЕНДА:']);
        heatmapExportData.push(['']);
        heatmapExportData.push(['\u2B1C', '0 операций']);
        heatmapExportData.push(['\uD83D\uDD39', `1-${q1} операций (низкая активность)`]);
        heatmapExportData.push(['\uD83D\uDD37', `${q1 + 1}-${q2} операций (ниже среднего)`]);
        heatmapExportData.push(['\uD83D\uDD35', `${q2 + 1}-${q3} операций (высокая активность)`]);
        heatmapExportData.push(['\uD83D\uDFE6', `${q3 + 1}+ операций (максимальная активность)`]);
      }

      const heatmapWorksheet = XLSX.utils.aoa_to_sheet(heatmapExportData);
      heatmapWorksheet['!cols'] = [{ wch: 12 }, { wch: 44 }, ...Array.from({ length: 24 }, () => ({ wch: 6 }))];

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
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  receiptsByFuel?: ReceiptFuelRow[];
  dateFrom: string;
  dateTo: string;
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
  totalRevenue,
  totalVolume,
  averageCheck,
  fuelTypeStats,
  paymentTypeStats,
  receiptsByFuel,
  dateFrom,
  dateTo,
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
