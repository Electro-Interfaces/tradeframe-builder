// @vitest-environment node
// Структура выгрузки «Обзора»: собираем книгу на агрегатах в том же виде, в каком
// их отдаёт страница (цифры сняты с prod за 30 дней), и читаем её обратно —
// проверяем состав листов и что все разрезы страницы туда попали.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exportToExcel, buildPaymentFuelBreakdown } from '../components/NetworkOverviewExport';

const byPayment = [
  { method: 'Банковские', operations: 39218, volume: 700000, revenue: 71620505.64 },
  { method: 'Наличные', operations: 9596, volume: 150000, revenue: 14076058.41 },
  { method: 'Талоны', operations: 958, volume: 30064, revenue: 2723344.85 },
  { method: 'Купон', operations: 35, volume: 800.35, revenue: 69966.21 },
  { method: 'Ведомость', operations: 18, volume: 2380, revenue: 197302.0 },
];

const byFuelPayment = [
  { fuel: 'АИ-92', method: 'Купон', operations: 24, volume: 407.82, revenue: 34747.49 },
  { fuel: 'АИ-95', method: 'Купон', operations: 4, volume: 244.49, revenue: 22001.43 },
  { fuel: 'ДТ', method: 'Купон', operations: 7, volume: 148.04, revenue: 13217.29 },
  { fuel: 'ДТ', method: 'Талоны', operations: 315, volume: 15117.54, revenue: 1365235.89 },
  { fuel: 'АИ-92', method: 'Талоны', operations: 451, volume: 10712.21, revenue: 956232.03 },
  { fuel: 'АИ-95', method: 'Талоны', operations: 192, volume: 4234.26, revenue: 401876.93 },
  { fuel: 'АИ-92', method: 'Наличные', operations: 9000, volume: 140000, revenue: 13000000 },
  { fuel: 'АИ-92', method: 'Банковские', operations: 30000, volume: 600000, revenue: 55000000 },
  { fuel: 'АИ-92', method: 'Ведомость', operations: 17, volume: 2380, revenue: 197302.0 },
];

const fuelTypeStats = [
  { type: 'АИ-95', operations: 9560, revenue: 17449895.22, volume: 190121.68, priority: 2 },
  { type: 'АИ-92', operations: 41329, revenue: 70475870.66, volume: 800272.41, priority: 3 },
  { type: 'ДТ', operations: 6036, revenue: 28573487.48, volume: 314669.42, priority: 10 },
];

const stationStats = [
  { stationCode: 208, operations: 15277, volume: 394700, revenue: 35694022.14 },
  { stationCode: 210, operations: 7207, volume: 200612, revenue: 18112450.6 },
  { stationCode: 8, operations: 8282, volume: 160000, revenue: 14613819.17 },
];

const stationFuelStats = [
  { stationCode: 208, fuel: 'АИ-92', operations: 11080, volume: 231413.49, revenue: 20703670.47 },
  { stationCode: 208, fuel: 'ДТ', operations: 1950, volume: 114075.22, revenue: 10384508.67 },
  { stationCode: 208, fuel: 'АИ-95', operations: 2247, volume: 49211.28, revenue: 4605843.0 },
  { stationCode: 210, fuel: 'АИ-92', operations: 5049, volume: 109163.63, revenue: 9732648.09 },
  { stationCode: 210, fuel: 'ДТ', operations: 1160, volume: 69362.48, revenue: 6311858.16 },
  { stationCode: 210, fuel: 'АИ-95', operations: 994, volume: 22085.68, revenue: 2060552.77 },
];

const stationDayStats = [
  { stationCode: 208, date: '2026-07-10T00:00:00.000Z', operations: 500, volume: 12000, revenue: 1200000 },
  { stationCode: 210, date: '2026-07-10T00:00:00.000Z', operations: 240, volume: 6000, revenue: 600000 },
  { stationCode: 208, date: '2026-07-11T00:00:00.000Z', operations: 510, volume: 12500, revenue: 1250000 },
];

const heatmapData = ['2026-07-10', '2026-07-11'].map((date, i) => ({
  date,
  dayName: i === 0 ? 'Пт' : 'Сб',
  dayOfWeek: i === 0 ? 5 : 6,
  hours: Array.from({ length: 24 }, (_, hour) => ({
    hour,
    transactions: hour === 12 ? 40 : hour % 6,
    revenue: hour === 12 ? 100000 : hour * 1000,
    intensity: 0,
    displayTime: `${String(hour).padStart(2, '0')}:00`,
  })),
}));

describe('выгрузка «Обзора» в Excel', () => {
  it('содержит все разрезы страницы, включая купоны и точки', async () => {
    const cwd = process.cwd();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tf-overview-'));
    process.chdir(tmp); // XLSX.writeFile пишет относительно cwd

    try {
      await exportToExcel({
        dateFrom: '2026-07-08',
        dateTo: '2026-08-07',
        selectedNetwork: { name: 'ГИГ' },
        selectedTradingPoint: 'all',
        totalRevenue: 116_011_253.36,
        totalVolume: 1_305_128.31,
        averageCheck: 1979.4,
        operationsCount: 58_600,
        fuelTypeStats,
        // Как маппит useNetworkOverviewAnalytics: byPayment.method → type
        paymentTypeStats: byPayment.map(p => ({ type: p.method, operations: p.operations, revenue: p.revenue, volume: p.volume })),
        paymentFuelBreakdown: buildPaymentFuelBreakdown(byFuelPayment),
        dailyActivityData: Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour}:00`, operations: hour * 10, revenue: hour * 20000 })),
        dailySalesData: {
          data: [
            { date: '2026-07-10', operations: 1900, revenue: 3800000, volume: 42000, 'АИ-92': 2500000, 'АИ-95': 700000, 'ДТ': 600000 },
            { date: '2026-07-11', operations: 1950, revenue: 3900000, volume: 43000, 'АИ-92': 2600000, 'АИ-95': 700000, 'ДТ': 600000 },
          ],
          fuelTypes: ['АИ-95', 'АИ-92', 'ДТ'],
        },
        heatmapData,
        receiptsByFuel: [{ fuelType: 'АИ-92', count: 12, volume: 240000 }],
        stationStats,
        stationFuelStats,
        stationDayStats,
        stationNames: { '208': 'Выборг', '210': 'Колпино' },
        currentPeriod: {
          kpi: { operations: 58600, volume: 1_305_128.31, revenue: 116_011_253.36, avgCheck: 1979.4 },
          byDay: [
            { date: '2026-07-10T00:00:00.000Z', operations: 1900, volume: 42000, revenue: 3_800_000 }, // Пт
            { date: '2026-07-11T00:00:00.000Z', operations: 1950, volume: 43000, revenue: 3_900_000 }, // Сб
          ],
        },
        previousPeriod: {
          kpi: { operations: 55000, volume: 1_200_000, revenue: 105_000_000, avgCheck: 1909.09 },
          byDay: [
            { date: '2026-06-09T00:00:00.000Z', operations: 1800, volume: 40000, revenue: 3_600_000 },
          ],
        },
        previousPeriodRange: { from: '2026-06-07', to: '2026-07-07' },
        dayPayments: [
          { date: '2026-07-10T00:00:00.000Z', method: 'Наличные', operations: 300, revenue: 500_000 },
          { date: '2026-07-10T00:00:00.000Z', method: 'Банковские', operations: 1500, revenue: 3_000_000 },
          { date: '2026-07-10T00:00:00.000Z', method: 'Купон', operations: 5, revenue: 10_000 },
          { date: '2026-07-11T00:00:00.000Z', method: 'Наличные', operations: 320, revenue: 520_000 },
          { date: '2026-07-11T00:00:00.000Z', method: 'Талоны', operations: 40, revenue: 120_000 },
        ],
        retailByDay: [
          { date: '2026-07-10', operations: 1800, revenue: 3_500_000 },
          { date: '2026-07-11', operations: 320, revenue: 520_000 },
        ],
        toast: () => {},
      });

      const file = fs.readdirSync(tmp).find(f => f.endsWith('.xlsx'))!;
      expect(file, 'файл выгрузки создан').toBeTruthy();

      const XLSX = await import('xlsx');
      const wb = XLSX.readFile(path.join(tmp, file));
      const dump = (sheet: string) =>
        (XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1 }) as any[][]).map(r => r.join(' | '));

      expect(wb.SheetNames).toEqual([
        'Основные показатели',
        'Активность по часам',
        'Реализация по дням',
        'Торговые точки',
        'Динамика по точкам',
        'Тренды',
        'Тепловая карта',
      ]);

      const main = dump('Основные показатели');
      expect(main.some(r => r.startsWith('Купон | 35'))).toBe(true);
      // Топливо внутри способа оплаты идёт по приоритету: АИ-95 раньше АИ-92
      expect(main.some(r => r.startsWith('Купон | АИ-95'))).toBe(true);
      expect(main.some(r => r.startsWith(' | АИ-92 | 24'))).toBe(true);
      expect(main.some(r => r.includes('ИТОГО по "Купон"'))).toBe(true);

      const points = dump('Торговые точки');
      expect(points.some(r => r.startsWith('Выборг | 208'))).toBe(true);
      expect(points.some(r => r.startsWith('Колпино | 210'))).toBe(true);
      expect(points.some(r => r.startsWith('Станция 8 | 8'))).toBe(true);

      const trend = dump('Динамика по точкам');
      expect(trend[2]).toContain('Выборг');
      expect(trend.some(r => r.startsWith('2026-07-10'))).toBe(true);

      const trends = dump('Тренды');
      // Сравнение периодов: выручка выросла с 105 млн до 116 011 253.36 (+10.49%)
      expect(trends[0]).toContain('2026-06-07 - 2026-07-07');
      expect(trends.some(r => r.startsWith('Выручка (₽) | 116011253.36 | 105000000 | 11011253.36 | 10.49'))).toBe(true);
      // Прошлый период без выходных → рост «с нуля» пишем прочерком, а не 0%
      expect(trends.some(r => r.startsWith('Выручка в выходные (₽) | 3900000 | 0 | 3900000 | —'))).toBe(true);
      // Средний чек частного клиента: 3 500 000 / 1800 = 1944.44
      expect(trends.some(r => r.startsWith('2026-07-10 | 1800 | 3500000 | 1944.44'))).toBe(true);
      // Структура оплат: купоны и талоны идут в корпоративные
      expect(trends.some(r => r.startsWith('2026-07-10 | 500000 | 3000000 | 0 | 10000'))).toBe(true);
      expect(trends.some(r => r.startsWith('2026-07-11 | 520000 | 0 | 0 | 120000'))).toBe(true);
      // Паттерн недели: 10.07.2026 — пятница, 11.07 — суббота
      expect(trends.some(r => r.startsWith('Пятница | 1 | 3800000'))).toBe(true);
      expect(trends.some(r => r.startsWith('Суббота | 1 | 3900000'))).toBe(true);
    } finally {
      process.chdir(cwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
