/**
 * Excel-экспорт сменного отчёта.
 *
 * Структура Excel точно повторяет бумажную распечатку АЗС:
 *  - шапка (Дата / Время / Сменный отчёт / АЗС № / Сеть),
 *  - состав смены + диапазон дат,
 *  - Таблица ТРК (12 колонок),
 *  - Состояние резервуаров (19 колонок),
 *  - Расшифровка поступлений (14 колонок),
 *  - Расшифровка реализации — безналичная (Наименование, Код, [по каждому типу: л, руб], ИТОГО б/н),
 *  - Расшифровка реализации — основная (Прокачка, По картам л/руб, Скидка, За наличные л/руб, Безнал, Всего, Разница),
 *  - Движение наличных денег (4 строки прихода + итог, 4 строки расхода + итог),
 *  - Подписи (Отчёт составили / Смену приняли / Отчёт проверил).
 *
 * НИКАКИХ дополнительных блоков или расчётов сверх бумаги не добавляется.
 */

import type ExcelJS from 'exceljs';
import { format as formatDate } from 'date-fns';
import type { ShiftDetails } from '@/types/shift-reports-v2';
import { classifyPayment } from '@/utils/paymentUtils';

const NUM_FORMATS = {
  decimal2: '#,##0.00',
  decimal3: '#,##0.000',
  decimal4: '#,##0.0000',
  integer: '#,##0',
};

export async function exportToExcelWithStyles(details: ShiftDetails): Promise<Blob> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJSLib = ExcelJSModule.default;
  const workbook = new ExcelJSLib.Workbook();
  const worksheet = workbook.addWorksheet('Сменный отчёт');

  // ── стили ──────────────────────────────────────────────────────────────
  const thinBorder = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
  };

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' }, // светло-серый (slate-200) — фон шапок таблиц
    },
    border: thinBorder,
  };

  const dataStyle: Partial<ExcelJS.Style> = {
    font: { size: 10 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: thinBorder,
  };

  const dataLeftStyle: Partial<ExcelJS.Style> = {
    ...dataStyle,
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  const totalsStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 10 },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: thinBorder,
  };

  const totalsLabelStyle: Partial<ExcelJS.Style> = {
    ...totalsStyle,
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  const sectionTitleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12 },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  const writeCell = (
    row: number,
    col: number,
    value: string | number | null | undefined,
    style: Partial<ExcelJS.Style>,
    format?: keyof typeof NUM_FORMATS,
  ) => {
    const cell = worksheet.getCell(row, col);
    cell.style = { ...style };
    if (value === null || value === undefined || value === '') {
      cell.value = null;
      return cell;
    }
    if (typeof value === 'number' && format) {
      cell.value = value;
      cell.numFmt = NUM_FORMATS[format];
    } else {
      cell.value = value;
    }
    return cell;
  };

  let row = 1;

  // ── 1. ШАПКА ───────────────────────────────────────────────────────────
  const openedDate = details.openedAt ? new Date(details.openedAt) : null;
  // На бумаге дата/время шапки — момент печати отчёта ≈ момент закрытия смены.
  const printedDate = details.closedAt ? new Date(details.closedAt) : openedDate;
  const dateStr = printedDate ? formatDate(printedDate, 'dd.MM.yyyy') : '';
  const timeStr = printedDate ? formatDate(printedDate, 'H:mm') : '';

  writeCell(row, 1, 'Дата', { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 2, dateStr, { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 3, 'Время', { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 4, timeStr, { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 5, 'Сменный отчёт', { font: { bold: true, size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 6, 'АЗС №', { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 7, details.stationCode ?? '', { font: { bold: true, size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 8, details.stationName ?? '', { font: { size: 10 }, alignment: { horizontal: 'left' } });
  row += 2;

  // ── 2. СОСТАВ СМЕНЫ + ДИАПАЗОН ─────────────────────────────────────────
  const openFmt = openedDate ? formatDate(openedDate, 'HH:mm \'час. \'dd-MM-yyyy') : '';
  const closeFmt = details.closedAt ? formatDate(new Date(details.closedAt), 'HH:mm \'час. \'dd-MM-yyyy') : '';
  const range = openFmt && closeFmt ? `смена с ${openFmt} до ${closeFmt}` : '';

  writeCell(row, 1, 'Состав смены:', { font: { size: 10 }, alignment: { horizontal: 'left' } });
  // STS API не возвращает оператора — если значение fallback «Не указан», оставляем пусто (как на бумаге без оператора)
  const operatorName = details.operator && details.operator !== 'Не указан' ? details.operator : '';
  writeCell(row, 2, operatorName, { font: { size: 10 }, alignment: { horizontal: 'left' } });
  writeCell(row, 8, range, { font: { size: 10 }, alignment: { horizontal: 'left' } });
  row += 2;

  // ── 3. ТАБЛИЦА ТРК (12 колонок) ────────────────────────────────────────
  const trkHeaders = [
    'Наименование\nнефтепродуктов',
    'N\nРезервуара',
    'Плотн.\nкг/м3',
    '№\nТРК',
    'на конец\nсмены\nл',
    'на начало\nсмены\nл',
    'расход\nл',
    'расход\nкг',
    'Цена\nза литр\nруб.',
    'Сумма,\nруб.',
    'Погрешность\nпроц.',
    'Погрешность\nлитры',
  ];
  trkHeaders.forEach((h, i) => writeCell(row, i + 1, h, headerStyle));
  row++;

  if (details.nozzleReadings && details.nozzleReadings.length > 0) {
    // Группируем по топливу и сортируем по fuelCode (АИ-92=2, АИ-95=3, ДТ=5) — как на бумаге
    const grouped: Record<number, typeof details.nozzleReadings> = {};
    details.nozzleReadings.forEach(n => {
      if (!grouped[n.fuelCode]) grouped[n.fuelCode] = [];
      grouped[n.fuelCode].push(n);
    });
    const groupOrder = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    groupOrder.forEach(fuelCode => {
      const nozzles = grouped[fuelCode];
      const tank = details.tanks.find(t => t.fuelCode === fuelCode);

      let groupVol = 0;
      let groupMass = 0;
      let groupCost = 0;

      nozzles.forEach((n, idx) => {
        writeCell(row, 1, idx === 0 ? n.fuelName : '', dataLeftStyle);
        writeCell(row, 2, idx === 0 ? (tank?.tankNumber ?? '') : '', dataStyle);
        writeCell(row, 3, idx === 0 ? (tank?.density ?? 0) : '', dataStyle, idx === 0 ? 'decimal2' : undefined);
        writeCell(row, 4, n.nozzle, dataStyle);
        writeCell(row, 5, n.endCounter ?? 0, dataStyle, 'decimal2');
        writeCell(row, 6, n.startCounter ?? 0, dataStyle, 'decimal2');
        writeCell(row, 7, n.volume ?? 0, dataStyle, 'decimal2');
        writeCell(row, 8, n.amount ?? 0, dataStyle, 'decimal2');
        writeCell(row, 9, n.price ?? 0, dataStyle, 'decimal2');
        writeCell(row, 10, n.cost ?? 0, dataStyle, 'decimal2');
        writeCell(row, 11, 0, dataStyle, 'decimal2'); // погрешность проц. — нет в API
        writeCell(row, 12, 0, dataStyle, 'decimal3'); // погрешность литры — нет в API

        groupVol += n.volume ?? 0;
        groupMass += n.amount ?? 0;
        groupCost += n.cost ?? 0;
        row++;
      });

      // Строка «Всего:» — только расход л, кг и Сумма. Остальное пусто.
      writeCell(row, 1, 'Всего:', totalsLabelStyle);
      writeCell(row, 2, '', totalsStyle);
      writeCell(row, 3, '', totalsStyle);
      writeCell(row, 4, '', totalsStyle);
      writeCell(row, 5, '', totalsStyle);
      writeCell(row, 6, '', totalsStyle);
      writeCell(row, 7, groupVol, totalsStyle, 'decimal2');
      writeCell(row, 8, groupMass, totalsStyle, 'decimal2');
      writeCell(row, 9, '', totalsStyle);
      writeCell(row, 10, groupCost, totalsStyle, 'decimal2');
      writeCell(row, 11, '', totalsStyle);
      writeCell(row, 12, '', totalsStyle);
      row++;
    });
  }
  row++;

  // ── 4. СОСТОЯНИЕ РЕЗЕРВУАРОВ ───────────────────────────────────────────
  worksheet.mergeCells(row, 1, row, 19);
  writeCell(row, 1, 'С О С Т О Я Н И Е    Р Е З Е Р В У А Р О В', sectionTitleStyle);
  row += 2;

  const tankHeaders = [
    'Наименование\nнефтепродуктов',
    'N\nРезервуара',
    'Плотн. на\nначало смены\nг/см3',
    'Книжный остаток\nна начало смены\nлитры',
    'Книжный остаток\nна начало смены\nкг',
    'Поступление в т.ч.\nпрокачка\nлитры',
    'Поступление в т.ч.\nпрокачка\nкг',
    'Расход\nлитры',
    'Расход\nкг',
    'Остаток на конец\nПлотн.\nг/см3',
    'Остаток на конец\nТемп.\nC',
    'Остаток на конец\nобщий уров.\nсм',
    'Остаток на конец\nобщий объём\nл',
    'Остаток на конец\nуров. воды\nсм',
    'Остаток на конец\nобъём воды\nл',
    'Факт.остаток н/п.\nлитры',
    'Факт.остаток н/п.\nкг',
    'расчётн.кн.ост.\nлитры',
    'расчётн.кн.ост.\nкг',
  ];
  tankHeaders.forEach((h, i) => writeCell(row, i + 1, h, headerStyle));
  row++;

  if (details.tanks && details.tanks.length > 0) {
    // Сортировка: сначала по топливу (АИ-92→АИ-95→ДТ), затем по номеру резервуара
    const sortedTanks = [...details.tanks].sort((a, b) =>
      (a.fuelCode - b.fuelCode) || (a.tankNumber - b.tankNumber)
    );
    sortedTanks.forEach(tank => {
      const t = tank as any;
      const density = t.density ?? 0;
      const volumeBegin = t.volumeBegin ?? t.startVolume ?? 0;
      const volumeEnd = t.volumeEnd ?? t.endVolume ?? 0;
      const volumeReceived = t.volumeReceived ?? 0;
      const volumeDispensed = t.volumeDispensed ?? 0;
      const volumeCalculated = t.volumeCalculated ?? volumeEnd;
      const volumeFact = t.volumeFact ?? volumeEnd;
      const massFact = t.massFact ?? volumeFact * density;

      writeCell(row, 1, tank.fuelName ?? '', dataLeftStyle);
      writeCell(row, 2, tank.tankNumber ?? '', dataStyle);
      writeCell(row, 3, t.densityBegin ?? density, dataStyle, 'decimal4');
      writeCell(row, 4, volumeBegin, dataStyle, 'decimal2');
      writeCell(row, 5, volumeBegin * density, dataStyle, 'decimal2');
      writeCell(row, 6, volumeReceived, dataStyle, 'decimal2');
      writeCell(row, 7, volumeReceived * density, dataStyle, 'decimal2');
      writeCell(row, 8, volumeDispensed, dataStyle, 'decimal2');
      writeCell(row, 9, volumeDispensed * density, dataStyle, 'decimal2');
      writeCell(row, 10, density, dataStyle, 'decimal4');
      writeCell(row, 11, t.temperature ?? 0, dataStyle, 'decimal2');
      writeCell(row, 12, t.level ?? 0, dataStyle, 'decimal2');
      writeCell(row, 13, volumeFact, dataStyle, 'decimal2');
      writeCell(row, 14, t.waterLevel ?? 0, dataStyle, 'decimal2');
      writeCell(row, 15, t.waterVolume ?? 0, dataStyle, 'decimal2');
      writeCell(row, 16, volumeFact, dataStyle, 'decimal2');
      writeCell(row, 17, massFact, dataStyle, 'decimal2');
      writeCell(row, 18, volumeCalculated, dataStyle, 'decimal2');
      writeCell(row, 19, volumeCalculated * density, dataStyle, 'decimal2');
      row++;
    });
  }
  row += 2;

  // ── 5. РАСШИФРОВКА ПОСТУПЛЕНИЙ ─────────────────────────────────────────
  if (details.receipts && details.receipts.length > 0) {
    worksheet.mergeCells(row, 1, row, 14);
    writeCell(row, 1, 'Р А С Ш И Ф Р О В К А    П О С Т У П Л Е Н И Й', sectionTitleStyle);
    row += 2;

    const recHeaders = [
      'Нефтепродукты\nНаименование',
      'Нефтепродукты\nКод',
      'Поставщик\nНаименование',
      'Поставщик\nКод',
      '№ Докум.',
      '№ рез',
      'По документу\nОбъём\nл',
      'По документу\nПлотн.\nг/см3',
      'По документу\nМасса\nкг',
      'По документу\nТемп.\nC',
      'Фактически\nОбъём\nл',
      'Фактически\nПлотн.\nг/см3',
      'Фактически\nМасса\nкг',
      'Фактически\nТемп.\nC',
    ];
    recHeaders.forEach((h, i) => writeCell(row, i + 1, h, headerStyle));
    row++;

    // Сортируем поступления по fuelCode (АИ-92→АИ-95→ДТ), как на бумаге
    const sortedReceipts = [...details.receipts].sort((a, b) =>
      ((a as any).fuelCode || 0) - ((b as any).fuelCode || 0)
    );
    sortedReceipts.forEach(receipt => {
      const r = receipt as any;
      writeCell(row, 1, receipt.fuelName ?? '', dataLeftStyle);
      writeCell(row, 2, r.fuelCode ?? 0, dataStyle);
      writeCell(row, 3, r.supplier ?? '', dataLeftStyle);
      writeCell(row, 4, r.supplierCode ?? '', dataStyle); // код нефтебазы из STS
      writeCell(row, 5, r.documentNumber ?? receipt.waybillNumber ?? '', dataStyle);
      writeCell(row, 6, receipt.tankNumber ?? 0, dataStyle);
      writeCell(row, 7, receipt.volume ?? 0, dataStyle, 'integer');
      writeCell(row, 8, r.density ?? 0, dataStyle, 'decimal4');
      writeCell(row, 9, r.amount ?? 0, dataStyle, 'integer');
      writeCell(row, 10, r.temperature ?? 0, dataStyle, 'decimal2');
      writeCell(row, 11, r.actualVolume ?? receipt.volume ?? 0, dataStyle, 'integer');
      writeCell(row, 12, r.actualDensity ?? r.density ?? 0, dataStyle, 'decimal4');
      writeCell(row, 13, r.actualAmount ?? r.amount ?? 0, dataStyle, 'integer');
      writeCell(row, 14, r.actualTemperature ?? r.temperature ?? 0, dataStyle, 'decimal2');
      row++;
    });
    row += 2;
  }

  // ── 6. РАСШИФРОВКА РЕАЛИЗАЦИИ (общий заголовок секции) ─────────────────
  worksheet.mergeCells(row, 1, row, 10);
  writeCell(row, 1, 'Р А С Ш И Ф Р О В К А    Р Е А Л И З А Ц И И', sectionTitleStyle);
  row += 2;

  // Собираем список безналичных типов оплаты из salesRaw в порядке первого появления.
  // Это единый список колонок для верхней таблицы.
  const nonCashTypes: Array<{ key: string; displayName: string }> = [];
  const nonCashKeys = new Set<string>();
  (details as any).salesRaw?.forEach((sale: any) => {
    const payName = sale.pay_type?.name || '';
    if (!payName) return;
    const cat = classifyPayment(payName);
    if (cat === 'cash' || cat === 'card') return;
    const key = payName.toLowerCase().trim();
    if (nonCashKeys.has(key)) return;
    nonCashKeys.add(key);
    nonCashTypes.push({ key, displayName: payName });
  });

  // ── 6a. Верхняя таблица — безналичная расшифровка ──────────────────────
  if (nonCashTypes.length > 0 && details.salesBreakdown && details.salesBreakdown.length > 0) {
    // Заголовки: Наименование | Код | [Тип1 л. | Тип1 руб.] ... | ИТОГО б/н л.
    const upperHeaders: string[] = ['Наименование', 'Код'];
    nonCashTypes.forEach(({ displayName }) => {
      upperHeaders.push(`${displayName}\nл.`);
      upperHeaders.push(`${displayName}\nруб.`);
    });
    upperHeaders.push('ИТОГО б/н\nл.');
    upperHeaders.forEach((h, i) => writeCell(row, i + 1, h, headerStyle));
    row++;

    const upperTotals: Record<string, { vol: number; cost: number }> = {};
    nonCashTypes.forEach(({ key }) => { upperTotals[key] = { vol: 0, cost: 0 }; });
    let upperGrandVol = 0;

    details.salesBreakdown.forEach(sale => {
      const s = sale as any;
      const byPay = (s.byPayType || {}) as Record<string, { volume: number; cost: number }>;
      writeCell(row, 1, sale.fuelName ?? '', dataLeftStyle);
      writeCell(row, 2, s.fuelCode ?? 0, dataStyle);
      let rowTotalVol = 0;
      nonCashTypes.forEach(({ key }, idx) => {
        const v = byPay[key]?.volume || 0;
        const c = byPay[key]?.cost || 0;
        writeCell(row, 3 + idx * 2, v, dataStyle, 'decimal2');
        writeCell(row, 4 + idx * 2, c, dataStyle, 'decimal2');
        upperTotals[key].vol += v;
        upperTotals[key].cost += c;
        rowTotalVol += v;
      });
      writeCell(row, 3 + nonCashTypes.length * 2, rowTotalVol, dataStyle, 'decimal2');
      upperGrandVol += rowTotalVol;
      row++;
    });

    // Строка «Всего:»
    writeCell(row, 1, 'Всего:', totalsLabelStyle);
    writeCell(row, 2, '', totalsStyle);
    nonCashTypes.forEach(({ key }, idx) => {
      writeCell(row, 3 + idx * 2, upperTotals[key].vol, totalsStyle, 'decimal2');
      writeCell(row, 4 + idx * 2, upperTotals[key].cost, totalsStyle, 'decimal2');
    });
    writeCell(row, 3 + nonCashTypes.length * 2, upperGrandVol, totalsStyle, 'decimal2');
    row += 2;
  }

  // ── 6b. Нижняя таблица — основная расшифровка ──────────────────────────
  if (details.salesBreakdown && details.salesBreakdown.length > 0) {
    const lowerHeaders = [
      'Наименование',
      'Код',
      'Прокачка\nл.',
      'По картам\nл.',
      'По картам\nруб.',
      'Скидка\nруб.',
      'За наличные\nл.',
      'За наличные\nруб.',
      'Безнал.\nл.',
      'Всего\nл.',
      'Разница\nл.',
    ];
    lowerHeaders.forEach((h, i) => writeCell(row, i + 1, h, headerStyle));
    row++;

    const lowerTotals = {
      cardCost: 0,
      discount: 0,
      cashCost: 0,
      totalVol: 0,
    };

    details.salesBreakdown.forEach(sale => {
      const s = sale as any;
      const pumpVolume = s.pumpVolume || 0;
      const cardVolume = s.cardVolume || 0;
      const cardCost = s.cardCost || 0;
      const discount = s.discountCost || 0;
      const cashVolume = s.cashVolume || 0;
      const cashCost = s.cashCost || 0;
      const nonCashVolume = s.nonCashVolume || 0;
      const totalVol = s.totalVolume || 0;
      const difference = s.difference || 0;

      writeCell(row, 1, sale.fuelName ?? '', dataLeftStyle);
      writeCell(row, 2, s.fuelCode ?? 0, dataStyle);
      writeCell(row, 3, pumpVolume, dataStyle, 'decimal2');
      writeCell(row, 4, cardVolume, dataStyle, 'decimal2');
      writeCell(row, 5, cardCost, dataStyle, 'decimal2');
      writeCell(row, 6, discount, dataStyle, 'decimal2');
      writeCell(row, 7, cashVolume, dataStyle, 'decimal2');
      writeCell(row, 8, cashCost, dataStyle, 'decimal2');
      writeCell(row, 9, nonCashVolume, dataStyle, 'decimal2');
      writeCell(row, 10, totalVol, dataStyle, 'decimal2');
      writeCell(row, 11, difference, dataStyle, 'decimal2');

      lowerTotals.cardCost += cardCost;
      lowerTotals.discount += discount;
      lowerTotals.cashCost += cashCost;
      lowerTotals.totalVol += totalVol;
      row++;
    });

    // Строка «Всего:» — как на бумаге: заполняются только суммы (руб) и Всего (л). Остальное пусто.
    writeCell(row, 1, 'Всего:', totalsLabelStyle);
    writeCell(row, 2, '', totalsStyle);
    writeCell(row, 3, '', totalsStyle);  // Прокачка — пусто
    writeCell(row, 4, '', totalsStyle);  // По картам л. — пусто
    writeCell(row, 5, lowerTotals.cardCost, totalsStyle, 'decimal2');
    writeCell(row, 6, lowerTotals.discount, totalsStyle, 'decimal2');
    writeCell(row, 7, '', totalsStyle);  // За наличные л. — пусто
    writeCell(row, 8, lowerTotals.cashCost, totalsStyle, 'decimal2');
    writeCell(row, 9, '', totalsStyle);  // Безнал л. — пусто
    writeCell(row, 10, lowerTotals.totalVol, totalsStyle, 'decimal2');
    writeCell(row, 11, '', totalsStyle); // Разница — пусто
    row += 2;
  }

  // ── 7. ДВИЖЕНИЕ НАЛИЧНЫХ ДЕНЕГ ─────────────────────────────────────────
  worksheet.mergeCells(row, 1, row, 4);
  writeCell(row, 1, 'Движение наличных денег:', sectionTitleStyle);
  row += 2;

  // Суммы берём из свода адаптера (cashSummary) — он считает их по кодам операций
  // STS ровно как в бумажном сменном отчёте. Выгрузка обязана совпадать с экраном.
  const cash = details.cashSummary || { opening: 0, deposited: 0, revenue: 0, toBank: 0, cashOut: 0, closing: 0 };
  const openingAmount = cash.opening;
  const incomeAmount = cash.deposited;
  const revenue = cash.revenue;
  const totalIncome = openingAmount + incomeAmount + revenue;

  const toBankAmount = cash.toBank;
  const cashOutAmount = cash.cashOut;
  const closingAmount = cash.closing;
  const totalExpense = toBankAmount + cashOutAmount + closingAmount;

  // Блок по кассам (рабочим местам) — как в бумажном отчёте, перед сводом
  (details.cashByPos || []).forEach((pos) => {
    const posRows: Array<[string, number]> = [
      [`Внесено за смену касса N ${pos.posNumber}`, pos.deposited],
      [`Изъято за смену касса N ${pos.posNumber}`, pos.withdrawn],
      [`Выручка за смену касса N ${pos.posNumber}`, pos.revenue],
    ];
    posRows.forEach(([label, amount], idx) => {
      writeCell(row, 1, label, { font: { size: 10 }, alignment: { horizontal: 'right' } });
      writeCell(row, 2, amount, { font: { size: 10 }, alignment: { horizontal: 'right' } }, 'decimal2');
      writeCell(row, 3, 'руб.', { font: { size: 10 }, alignment: { horizontal: 'left' } });
      // Оператор кассы — в бумажном отчёте стоит справа от строки выручки
      if (idx === 2 && pos.operator) {
        writeCell(row, 5, `Оператор: ${pos.operator}`, { font: { size: 10 }, alignment: { horizontal: 'left' } });
      }
      row++;
    });
  });
  if ((details.cashByPos || []).length > 0) row++;

  const cashRows: Array<[string, number]> = [
    ['Принято по смене', openingAmount],
    ['Внесено за смену', incomeAmount],
    ['Выручка за смену', revenue],
    ['Итого:', totalIncome],
  ];
  cashRows.forEach(([label, amount], idx) => {
    const isTotal = idx === 3;
    writeCell(row, 1, label, { font: { size: 10, bold: isTotal }, alignment: { horizontal: 'right' } });
    writeCell(row, 2, amount, { font: { size: 10, bold: isTotal }, alignment: { horizontal: 'right' } }, 'decimal2');
    writeCell(row, 3, 'руб.', { font: { size: 10 }, alignment: { horizontal: 'left' } });
    row++;
  });
  row++; // пустая строка между приходом и расходом

  const expenseRows: Array<[string, number]> = [
    ['Сдано в банк', toBankAmount],
    ['Выдано наличными', cashOutAmount],
    ['Передано по смене', closingAmount],
    ['Итого:', totalExpense],
  ];
  expenseRows.forEach(([label, amount], idx) => {
    const isTotal = idx === 3;
    writeCell(row, 1, label, { font: { size: 10, bold: isTotal }, alignment: { horizontal: 'right' } });
    writeCell(row, 2, amount, { font: { size: 10, bold: isTotal }, alignment: { horizontal: 'right' } }, 'decimal2');
    writeCell(row, 3, 'руб.', { font: { size: 10 }, alignment: { horizontal: 'left' } });
    row++;
  });
  row += 2;

  // ── 8. ПОДПИСИ ─────────────────────────────────────────────────────────
  const signatureRows = [
    'Отчёт составили и смену сдали:',
    'Смену приняли:',
    'Отчёт проверил:',
  ];
  signatureRows.forEach(label => {
    writeCell(row, 1, label, { font: { size: 10 }, alignment: { horizontal: 'left' } });
    // пустое поле для подписи
    row++;
  });

  // ── Ширины колонок ─────────────────────────────────────────────────────
  const colWidths = [
    20, // 1
    8,  // 2
    12, // 3
    8,  // 4
    14, 14, 12, 12, 10, 14, 12, 12, // 5-12
    14, 14, 14, 14, 14, 14, 14,      // 13-19
  ];
  worksheet.columns.forEach((column, idx) => {
    if (column) column.width = colWidths[idx] || 12;
  });

  // Высота строк заголовков
  worksheet.eachRow(r => {
    const firstCell = r.getCell(1);
    const firstValue = firstCell?.value;
    if (typeof firstValue === 'string' && firstValue.includes('\n')) {
      r.height = 50;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
