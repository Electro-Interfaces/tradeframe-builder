/**
 * Excel экспорт с поддержкой полного форматирования через ExcelJS
 */

import ExcelJS from 'exceljs';
import { format as formatDate } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftDetails } from '@/types/shift-reports-v2';

function formatCurrency(value: number): string {
  return value.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₽';
}

// Числовые форматы для Excel
const NUM_FORMATS = {
  decimal2: '#,##0.00',      // 2 знака после запятой
  decimal3: '#,##0.000',     // 3 знака после запятой
  decimal4: '#,##0.0000',    // 4 знака после запятой
  currency: '#,##0.00" ₽"', // Валюта с символом рубля
  integer: '#,##0',          // Целое число
  percent: '0.00%',          // Проценты
};

// Вспомогательная функция для записи числового значения в ячейку
function setNumericCell(
  cell: ExcelJS.Cell,
  value: number | string | null | undefined,
  format: keyof typeof NUM_FORMATS = 'decimal2',
  style?: Partial<ExcelJS.Style>
): void {
  if (value === null || value === undefined || value === '' || value === '—') {
    cell.value = '—';
    if (style) cell.style = style;
    return;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    cell.value = '—';
    if (style) cell.style = style;
    return;
  }

  cell.value = numValue;
  cell.numFmt = NUM_FORMATS[format];
  if (style) {
    cell.style = { ...style };
  }
}

/**
 * Экспорт сменного отчета в Excel с полным форматированием
 */
export async function exportToExcelWithStyles(details: ShiftDetails): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Сменный отчет');

  // Базовые стили
  const headerStyle: Partial<ExcelJS.Style> = {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // slate-700
    },
    font: {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 11,
    },
    alignment: {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true
    },
    border: {
      top: { style: 'thin', color: { argb: 'FF475569' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    },
  };

  const dataStyle: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    },
  };

  const totalsStyle: Partial<ExcelJS.Style> = {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF475569' }, // slate-600
    },
    font: {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 10,
    },
    alignment: { horizontal: 'left', vertical: 'middle' },
    border: {
      top: { style: 'medium', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF475569' } },
    },
  };

  const sectionTitleStyle: Partial<ExcelJS.Style> = {
    font: {
      bold: true,
      size: 14,
      color: { argb: 'FF1E293B' },
    },
    alignment: { horizontal: 'left', vertical: 'middle' },
  };

  let currentRow = 1;

  // ========== ЗАГОЛОВОК ==========
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = 'СМЕННЫЙ ОТЧЕТ';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(currentRow, 1, currentRow, 5);
  currentRow += 2;

  // Стиль для меток
  const labelStyle = { bold: true, size: 11, color: { argb: 'FF475569' } };
  const valueStyle = { size: 11 };

  worksheet.getCell(currentRow, 1).value = 'Номер смены:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.shiftNumber;
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Торговая точка:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = `${details.stationCode} - ${details.stationName || ''}`;
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Оператор:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.operator;
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Открыта:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = formatDate(new Date(details.openedAt), 'dd.MM.yyyy HH:mm', { locale: ru });
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Закрыта:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.closedAt ? formatDate(new Date(details.closedAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—';
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Статус:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.status === 'closed' ? 'Закрыта' : details.status === 'open' ? 'Открыта' : 'Синхронизирована';
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow += 2;

  // ИТОГИ
  const summaryCell = worksheet.getCell(currentRow, 1);
  summaryCell.value = 'ИТОГИ';
  summaryCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Общая выручка:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  const revenueCell = worksheet.getCell(currentRow, 2);
  revenueCell.value = details.totalRevenue;
  revenueCell.numFmt = NUM_FORMATS.currency;
  revenueCell.font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Общий отпуск топлива (л):';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  const volumeCell = worksheet.getCell(currentRow, 2);
  volumeCell.value = details.totalVolume;
  volumeCell.numFmt = NUM_FORMATS.decimal2;
  volumeCell.font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Количество транзакций:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  const txCountCell = worksheet.getCell(currentRow, 2);
  txCountCell.value = details.transactionCount;
  txCountCell.numFmt = NUM_FORMATS.integer;
  txCountCell.font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Средний чек:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  const avgCheckCell = worksheet.getCell(currentRow, 2);
  avgCheckCell.value = details.averageCheck;
  avgCheckCell.numFmt = NUM_FORMATS.currency;
  avgCheckCell.font = valueStyle;
  currentRow += 3;

  // ========== СОСТАВ СМЕНЫ - ТРК ==========
  const nozzleStartRow = currentRow;
  worksheet.getCell(currentRow, 1).value = 'СОСТАВ СМЕНЫ - ПОКАЗАНИЯ СЧЕТНЫХ МЕХАНИЗМОВ ТРК';
  worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
  currentRow += 2;

  // Заголовки таблицы
  const nozzleHeaderRow = currentRow;
  const nozzleHeaders = [
    'Наименование нефтепродуктов',
    'N Резервуара',
    'Плотность кг/м3',
    '№ ТРК',
    'на конец смены (л)',
    'на начало смены (л)',
    'Расход (л)',
    'Расход (кг)',
    'Цена за литр (руб)',
    'Сумма (руб)'
  ];

  nozzleHeaders.forEach((header, idx) => {
    const cell = worksheet.getCell(currentRow, idx + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  currentRow++;

  // Данные ТРК
  if (details.nozzleReadings && details.nozzleReadings.length > 0) {
    const groupedByFuel = details.nozzleReadings.reduce((acc, nozzle) => {
      if (!acc[nozzle.fuelCode]) {
        acc[nozzle.fuelCode] = [];
      }
      acc[nozzle.fuelCode].push(nozzle);
      return acc;
    }, {} as Record<number, typeof details.nozzleReadings>);

    Object.entries(groupedByFuel).forEach(([fuelCode, nozzles]) => {
      const tank = details.tanks.find(t => t.fuelCode === parseInt(fuelCode));

      nozzles.forEach((nozzle, idx) => {
        // Колонка 1: Наименование нефтепродуктов
        const cell1 = worksheet.getCell(currentRow, 1);
        cell1.value = idx === 0 ? nozzle.fuelName : '';
        cell1.style = dataStyle;

        // Колонка 2: N Резервуара
        const cell2 = worksheet.getCell(currentRow, 2);
        cell2.value = idx === 0 ? (tank?.tankNumber || '—') : '';
        cell2.style = dataStyle;

        // Колонка 3: Плотность
        const cell3 = worksheet.getCell(currentRow, 3);
        if (idx === 0 && tank?.density) {
          cell3.value = tank.density;
          cell3.numFmt = NUM_FORMATS.decimal3;
        } else {
          cell3.value = idx === 0 ? '—' : '';
        }
        cell3.style = dataStyle;

        // Колонка 4: № ТРК
        const cell4 = worksheet.getCell(currentRow, 4);
        cell4.value = nozzle.nozzle;
        cell4.style = dataStyle;

        // Колонка 5: на конец смены (л)
        const cell5 = worksheet.getCell(currentRow, 5);
        cell5.value = nozzle.endCounter;
        cell5.numFmt = NUM_FORMATS.decimal2;
        cell5.style = dataStyle;

        // Колонка 6: на начало смены (л)
        const cell6 = worksheet.getCell(currentRow, 6);
        cell6.value = nozzle.startCounter;
        cell6.numFmt = NUM_FORMATS.decimal2;
        cell6.style = dataStyle;

        // Колонка 7: Расход (л)
        const cell7 = worksheet.getCell(currentRow, 7);
        cell7.value = nozzle.volume;
        cell7.numFmt = NUM_FORMATS.decimal2;
        cell7.style = dataStyle;

        // Колонка 8: Расход (кг)
        const cell8 = worksheet.getCell(currentRow, 8);
        cell8.value = nozzle.amount;
        cell8.numFmt = NUM_FORMATS.decimal2;
        cell8.style = dataStyle;

        // Колонка 9: Цена за литр (руб)
        const cell9 = worksheet.getCell(currentRow, 9);
        cell9.value = nozzle.price;
        cell9.numFmt = NUM_FORMATS.decimal2;
        cell9.style = dataStyle;

        // Колонка 10: Сумма (руб)
        const cell10 = worksheet.getCell(currentRow, 10);
        cell10.value = nozzle.cost;
        cell10.numFmt = NUM_FORMATS.decimal2;
        cell10.style = dataStyle;

        currentRow++;
      });

      // Строка "Всего"
      const totalVolume = nozzles.reduce((sum, n) => sum + n.volume, 0);
      const totalAmount = nozzles.reduce((sum, n) => sum + n.amount, 0);
      const totalCost = nozzles.reduce((sum, n) => sum + n.cost, 0);

      // Заполнение итоговой строки
      for (let col = 1; col <= 10; col++) {
        const cell = worksheet.getCell(currentRow, col);
        cell.style = totalsStyle;

        if (col === 1) {
          cell.value = 'ВСЕГО:';
        } else if (col === 7) {
          cell.value = totalVolume;
          cell.numFmt = NUM_FORMATS.decimal2;
        } else if (col === 8) {
          cell.value = totalAmount;
          cell.numFmt = NUM_FORMATS.decimal2;
        } else if (col === 10) {
          cell.value = totalCost;
          cell.numFmt = NUM_FORMATS.decimal2;
        } else {
          cell.value = '';
        }
      }
      currentRow++;
    });

    // Финальная строка "ИТОГО:" для всей таблицы
    const grandTotalVolume = details.nozzleReadings.reduce((sum, n) => sum + n.volume, 0);
    const grandTotalAmount = details.nozzleReadings.reduce((sum, n) => sum + n.amount, 0);
    const grandTotalCost = details.nozzleReadings.reduce((sum, n) => sum + n.cost, 0);

    for (let col = 1; col <= 10; col++) {
      const cell = worksheet.getCell(currentRow, col);
      cell.style = totalsStyle;

      if (col === 1) {
        cell.value = 'ИТОГО:';
      } else if (col === 7) {
        cell.value = grandTotalVolume;
        cell.numFmt = NUM_FORMATS.decimal2;
      } else if (col === 8) {
        cell.value = grandTotalAmount;
        cell.numFmt = NUM_FORMATS.decimal2;
      } else if (col === 10) {
        cell.value = grandTotalCost;
        cell.numFmt = NUM_FORMATS.decimal2;
      } else {
        cell.value = '';
      }
    }
    currentRow++;
  }
  currentRow += 2;

  // ========== СОСТОЯНИЕ РЕЗЕРВУАРОВ ==========
  worksheet.getCell(currentRow, 1).value = 'СОСТОЯНИЕ РЕЗЕРВУАРОВ';
  worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
  currentRow += 2;

  const tankHeaders = [
    'Наименование нефтепродуктов',
    'N Резервуара',
    'Плотн. на начало смены г/см3',
    'Книжный остаток на начало смены (литры)',
    'Книжный остаток на начало смены (кг)',
    'Поступление в т.ч. прокачка (литры)',
    'Поступление в т.ч. прокачка (кг)',
    'Расход (литры)',
    'Расход (кг)',
    'Плотн. г/см3',
    'Темп C',
    'общий уров. см',
    'общий объем л',
    'уров. воды см',
    'объем воды л',
    'Факт.остаток н/п. (литры)',
    'Факт.остаток н/п. (кг)',
    'расчетн.кн.ост. (литры)',
    'расчетн.кн.ост. (кг)'
  ];

  tankHeaders.forEach((header, idx) => {
    const cell = worksheet.getCell(currentRow, idx + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  currentRow++;

  if (details.tanks && details.tanks.length > 0) {
    details.tanks.forEach(tank => {
      const t = tank as any;
      const density = t.density || 1;
      const volumeBegin = t.volumeBegin ?? t.startVolume ?? 0;
      const volumeEnd = t.volumeEnd ?? t.endVolume ?? 0;
      const volumeReceived = t.volumeReceived ?? 0;
      const volumeDispensed = t.volumeDispensed ?? 0;
      const volumeCalculated = t.volumeCalculated ?? volumeEnd;

      // Определяем значения и форматы для каждой колонки
      const tankRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
        { value: tank.fuelName || '—' },                    // 1: Наименование
        { value: tank.tankNumber || '—' },                  // 2: N Резервуара
        { value: density, format: 'decimal4' },             // 3: Плотн. на начало
        { value: volumeBegin, format: 'decimal2' },         // 4: Книжный остаток (л)
        { value: volumeBegin * density, format: 'decimal2' }, // 5: Книжный остаток (кг)
        { value: volumeReceived, format: 'decimal2' },      // 6: Поступление (л)
        { value: volumeReceived * density, format: 'decimal2' }, // 7: Поступление (кг)
        { value: volumeDispensed, format: 'decimal2' },     // 8: Расход (л)
        { value: volumeDispensed * density, format: 'decimal2' }, // 9: Расход (кг)
        { value: density, format: 'decimal4' },             // 10: Плотн. г/см3
        { value: t.temperature ?? null, format: 'decimal2' }, // 11: Темп C
        { value: t.level ?? null, format: 'decimal2' },     // 12: общий уров. см
        { value: volumeEnd, format: 'decimal2' },           // 13: общий объем л
        { value: t.waterLevel ?? 0, format: 'decimal2' },   // 14: уров. воды см
        { value: t.waterVolume ?? 0, format: 'decimal2' },  // 15: объем воды л
        { value: volumeEnd, format: 'decimal2' },           // 16: Факт.остаток (л)
        { value: volumeEnd * density, format: 'decimal2' }, // 17: Факт.остаток (кг)
        { value: volumeCalculated, format: 'decimal2' },    // 18: расчетн.кн.ост. (л)
        { value: volumeCalculated * density, format: 'decimal2' } // 19: расчетн.кн.ост. (кг)
      ];

      tankRowData.forEach((item, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.style = dataStyle;

        if (item.value === null || item.value === undefined) {
          cell.value = '—';
        } else if (item.format && typeof item.value === 'number') {
          cell.value = item.value;
          cell.numFmt = NUM_FORMATS[item.format];
        } else {
          cell.value = item.value;
        }
      });
      currentRow++;
    });
  }
  currentRow += 2;

  // ========== ПОСТУПЛЕНИЯ ==========
  if (details.receipts && details.receipts.length > 0) {
    worksheet.getCell(currentRow, 1).value = 'РАСШИФРОВКА ПОСТУПЛЕНИЙ';
    worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
    currentRow += 2;

    const receiptHeaders = [
      'Нефтепродукт (Наименование)',
      'Нефтепродукт (Код)',
      'Поставщик (Наименование)',
      'Поставщик (Код)',
      '№ Докум.',
      '№ рез',
      'По документу (Объем л)',
      'По документу (Плотн г/см3)',
      'По документу (Масса кг)',
      'По документу (Темп. °C)',
      'Фактически (Объем л)',
      'Фактически (Плотн г/см3)',
      'Фактически (Масса кг)',
      'Фактически (Темп. °C)'
    ];

    receiptHeaders.forEach((header, idx) => {
      const cell = worksheet.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.style = headerStyle;
    });
    currentRow++;

    details.receipts.forEach(receipt => {
      const r = receipt as any;

      const receiptRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
        { value: receipt.fuelName || '—' },                         // 1: Наименование
        { value: r.fuelCode || '—' },                               // 2: Код
        { value: r.supplier || '—' },                               // 3: Поставщик
        { value: '1' },                                             // 4: Код поставщика
        { value: r.documentNumber || receipt.waybillNumber || '—' }, // 5: № Докум.
        { value: receipt.tankNumber || '—' },                       // 6: № рез
        { value: receipt.volume ?? 0, format: 'integer' },          // 7: По документу (Объем л)
        { value: r.density ?? null, format: 'decimal4' },           // 8: По документу (Плотн)
        { value: r.amount ?? 0, format: 'integer' },                // 9: По документу (Масса кг)
        { value: r.temperature ?? null, format: 'decimal2' },       // 10: По документу (Темп)
        { value: r.actualVolume ?? receipt.volume ?? 0, format: 'integer' }, // 11: Фактически (Объем л)
        { value: r.actualDensity ?? r.density ?? null, format: 'decimal2' }, // 12: Фактически (Плотн)
        { value: r.actualAmount ?? r.amount ?? 0, format: 'integer' },       // 13: Фактически (Масса кг)
        { value: r.actualTemperature ?? r.temperature ?? null, format: 'integer' } // 14: Фактически (Темп)
      ];

      receiptRowData.forEach((item, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.style = dataStyle;

        if (item.value === null || item.value === undefined) {
          cell.value = '—';
        } else if (item.format && typeof item.value === 'number') {
          cell.value = item.value;
          cell.numFmt = NUM_FORMATS[item.format];
        } else {
          cell.value = item.value;
        }
      });
      currentRow++;
    });

    currentRow += 2;
  }

  // ========== РАСШИФРОВКА РЕАЛИЗАЦИИ ==========
  if (details.salesBreakdown && details.salesBreakdown.length > 0) {
    worksheet.getCell(currentRow, 1).value = 'РАСШИФРОВКА РЕАЛИЗАЦИИ';
    worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
    currentRow += 2;

    const salesHeaders = [
      'Нефтепродукты, товары (Наименование)',
      'Нефтепродукты, товары (Код)',
      'Прокачка л.',
      'По картам (л.)',
      'По картам (руб.)',
      'Скидка руб.',
      'За наличные (л.)',
      'За наличные (руб.)',
      'Безнал. л.',
      'Всего л.',
      'Разница л.'
    ];

    salesHeaders.forEach((header, idx) => {
      const cell = worksheet.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.style = headerStyle;
    });
    currentRow++;

    let totalPumpVolume = 0;
    let totalCardVolume = 0;
    let totalCardCost = 0;
    let totalDiscount = 0;
    let totalCashVolume = 0;
    let totalCashCost = 0;
    let totalNonCashVolume = 0;
    let totalVolume = 0;
    let totalDifference = 0;

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

      totalPumpVolume += pumpVolume;
      totalCardVolume += cardVolume;
      totalCardCost += cardCost;
      totalDiscount += discount;
      totalCashVolume += cashVolume;
      totalCashCost += cashCost;
      totalNonCashVolume += nonCashVolume;
      totalVolume += totalVol;
      totalDifference += difference;

      // Записываем данные строки с числовыми форматами
      const salesRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
        { value: sale.fuelName || '—' },
        { value: s.fuelCode || '—' },
        { value: pumpVolume, format: 'decimal2' },
        { value: cardVolume, format: 'decimal2' },
        { value: cardCost, format: 'currency' },
        { value: discount, format: 'decimal2' },
        { value: cashVolume, format: 'decimal2' },
        { value: cashCost, format: 'currency' },
        { value: nonCashVolume, format: 'decimal2' },
        { value: totalVol, format: 'decimal2' },
        { value: difference, format: 'decimal2' }
      ];

      salesRowData.forEach((item, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.style = dataStyle;
        if (item.format && typeof item.value === 'number') {
          cell.value = item.value;
          cell.numFmt = NUM_FORMATS[item.format];
        } else {
          cell.value = item.value;
        }
      });
      currentRow++;
    });

    // Итоговая строка
    const salesTotalsData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
      { value: 'Всего:' },
      { value: '' },
      { value: totalPumpVolume, format: 'decimal2' },
      { value: totalCardVolume, format: 'decimal2' },
      { value: totalCardCost, format: 'currency' },
      { value: totalDiscount, format: 'decimal2' },
      { value: totalCashVolume, format: 'decimal2' },
      { value: totalCashCost, format: 'currency' },
      { value: totalNonCashVolume, format: 'decimal2' },
      { value: totalVolume, format: 'decimal2' },
      { value: totalDifference, format: 'decimal2' }
    ];

    salesTotalsData.forEach((item, colIdx) => {
      const cell = worksheet.getCell(currentRow, colIdx + 1);
      cell.style = totalsStyle;
      if (item.format && typeof item.value === 'number') {
        cell.value = item.value;
        cell.numFmt = NUM_FORMATS[item.format];
      } else {
        cell.value = item.value;
      }
    });
    currentRow++;

    currentRow += 2;
  }

  // ========== БЕЗНАЛИЧНАЯ РЕАЛИЗАЦИЯ ==========
  if (details.salesRaw && details.salesRaw.length > 0) {
    worksheet.getCell(currentRow, 1).value = 'БЕЗНАЛИЧНАЯ РЕАЛИЗАЦИЯ';
    worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
    currentRow += 2;

    const nonCashHeaders = [
      'Наименование',
      'Код',
      'МобилПр. (л.)',
      'МобилПр. (руб.)',
      'Купон на сдачу (л.)',
      'Купон на сдачу (руб.)',
      'ИТОГО б/н'
    ];

    nonCashHeaders.forEach((header, idx) => {
      const cell = worksheet.getCell(currentRow, idx + 1);
      cell.value = header;
      cell.style = headerStyle;
    });
    currentRow++;

    // Обработка новой структуры salesRaw
    const groupedSales: Record<number, {
      fuelName: string;
      fuelCode: number;
      mobilPrVolume: number;
      mobilPrCost: number;
      couponVolume: number;
      couponCost: number;
    }> = {};

    details.salesRaw.forEach((payGroup: any) => {
      const paymentName = payGroup.pay_type?.name?.toLowerCase() || '';
      const isMobilPr = paymentName.includes('мобилпр');
      const isCoupon = paymentName.includes('купон');

      if (isMobilPr || isCoupon) {
        payGroup.fuel?.forEach((fuelItem: any) => {
          const fuelCode = fuelItem.service?.service_code;
          const fuelName = fuelItem.service?.service_name;
          const volume = parseFloat(fuelItem.release?.volume || 0);
          const cost = parseFloat(fuelItem.release?.cost || 0);

          if (fuelCode && fuelName) {
            if (!groupedSales[fuelCode]) {
              groupedSales[fuelCode] = {
                fuelName,
                fuelCode,
                mobilPrVolume: 0,
                mobilPrCost: 0,
                couponVolume: 0,
                couponCost: 0
              };
            }

            if (isMobilPr) {
              groupedSales[fuelCode].mobilPrVolume += volume;
              groupedSales[fuelCode].mobilPrCost += cost;
            } else if (isCoupon) {
              groupedSales[fuelCode].couponVolume += volume;
              groupedSales[fuelCode].couponCost += cost;
            }
          }
        });
      }
    });

    let totalMobilPrVolume = 0;
    let totalMobilPrCost = 0;
    let totalCouponVolume = 0;
    let totalCouponCost = 0;

    Object.values(groupedSales).forEach(group => {
      const total = group.mobilPrVolume + group.couponVolume;
      totalMobilPrVolume += group.mobilPrVolume;
      totalMobilPrCost += group.mobilPrCost;
      totalCouponVolume += group.couponVolume;
      totalCouponCost += group.couponCost;

      const nonCashRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
        { value: group.fuelName },
        { value: group.fuelCode },
        { value: group.mobilPrVolume, format: 'decimal2' },
        { value: group.mobilPrCost, format: 'currency' },
        { value: group.couponVolume, format: 'decimal2' },
        { value: group.couponCost, format: 'currency' },
        { value: total, format: 'decimal2' }
      ];

      nonCashRowData.forEach((item, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.style = dataStyle;
        if (item.format && typeof item.value === 'number') {
          cell.value = item.value;
          cell.numFmt = NUM_FORMATS[item.format];
        } else {
          cell.value = item.value;
        }
      });
      currentRow++;
    });

    // Итоговая строка
    const nonCashTotalsData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
      { value: 'Всего:' },
      { value: '' },
      { value: totalMobilPrVolume, format: 'decimal2' },
      { value: totalMobilPrCost, format: 'currency' },
      { value: totalCouponVolume, format: 'decimal2' },
      { value: totalCouponCost, format: 'currency' },
      { value: totalMobilPrVolume + totalCouponVolume, format: 'decimal2' }
    ];

    nonCashTotalsData.forEach((item, colIdx) => {
      const cell = worksheet.getCell(currentRow, colIdx + 1);
      cell.style = totalsStyle;
      if (item.format && typeof item.value === 'number') {
        cell.value = item.value;
        cell.numFmt = NUM_FORMATS[item.format];
      } else {
        cell.value = item.value;
      }
    });
    currentRow++;

    currentRow += 2;
  }

  // ========== ДВИЖЕНИЕ НАЛИЧНЫХ ДЕНЕГ ==========
  worksheet.getCell(currentRow, 1).value = 'ДВИЖЕНИЕ НАЛИЧНЫХ ДЕНЕГ';
  worksheet.getCell(currentRow, 1).style = sectionTitleStyle;
  currentRow += 2;

  // Расчёт сумм как в ShiftDetailsModal
  const revenue = (details as any).paymentSales
    ?.find((p: any) => p.paymentTypeName?.toLowerCase().includes('наличн'))
    ?.cost || 0;

  const openingAmount = details.cashMovements
    ?.filter((m: any) => m.operationType === 'closing')
    .reduce((sum: number, m: any) => sum + m.amount, 0) || 0;

  const incomeAmount = 0;
  const closingAmount = openingAmount + incomeAmount + revenue;
  const totalIncome = openingAmount + incomeAmount + revenue;
  const toBankAmount = 0;
  const cashOutAmount = 0;
  const totalExpense = toBankAmount + cashOutAmount + closingAmount;

  // Приход
  worksheet.getCell(currentRow, 1).value = 'Принято по смене';
  const openingCell = worksheet.getCell(currentRow, 2);
  openingCell.value = openingAmount;
  openingCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Внесено за смену';
  const incomeCell = worksheet.getCell(currentRow, 2);
  incomeCell.value = incomeAmount;
  incomeCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Выручка за смену';
  const revenueShiftCell = worksheet.getCell(currentRow, 2);
  revenueShiftCell.value = revenue;
  revenueShiftCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Итого:';
  worksheet.getCell(currentRow, 1).font = { bold: true };
  const totalIncomeCell = worksheet.getCell(currentRow, 2);
  totalIncomeCell.value = totalIncome;
  totalIncomeCell.numFmt = NUM_FORMATS.currency;
  totalIncomeCell.font = { bold: true };
  currentRow += 2;

  // Расход
  worksheet.getCell(currentRow, 1).value = 'Сдано в банк';
  const toBankCell = worksheet.getCell(currentRow, 2);
  toBankCell.value = toBankAmount;
  toBankCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Выдано наличными';
  const cashOutCell = worksheet.getCell(currentRow, 2);
  cashOutCell.value = cashOutAmount;
  cashOutCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Передано по смене';
  const closingCell = worksheet.getCell(currentRow, 2);
  closingCell.value = closingAmount;
  closingCell.numFmt = NUM_FORMATS.currency;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Итого:';
  worksheet.getCell(currentRow, 1).font = { bold: true };
  const totalExpenseCell = worksheet.getCell(currentRow, 2);
  totalExpenseCell.value = totalExpense;
  totalExpenseCell.numFmt = NUM_FORMATS.currency;
  totalExpenseCell.font = { bold: true };
  worksheet.getCell(currentRow, 2).font = { bold: true };
  currentRow++;

  // Оптимальные ширины колонок (слова не переносятся)
  const columnWidths = [
    20,  // 1: Наименование нефтепродуктов
    10,  // 2: Код/N Резервуара
    15,  // 3: Плотность г/см3
    18,  // 4: Книжный остаток/литры
    12,  // 5: кг
    18,  // 6: Поступление/литры
    12,  // 7: кг
    12,  // 8: Расход литры
    12,  // 9: кг
    15,  // 10: Плотность г/см3
    10,  // 11: Темп C
    12,  // 12: общий уров. см
    15,  // 13: общий объем л
    12,  // 14: уров. воды см
    12,  // 15: объем воды л
    18,  // 16: Факт.остаток н/п. литры
    12,  // 17: кг
    18,  // 18: расчетн.кн.ост. литры
    12   // 19: кг
  ];

  worksheet.columns.forEach((column, idx) => {
    if (column) {
      column.width = columnWidths[idx] || 10;
    }
  });

  // Фиксируем высоту строк заголовков
  worksheet.eachRow((row, rowNumber) => {
    const firstCell = row.getCell(1);
    // Проверяем, является ли строка заголовком по наличию fill
    const isHeader = firstCell.style?.fill?.fgColor?.argb === 'FF334155';

    if (isHeader) {
      row.height = 150; // увеличенная высота для заголовков с переносом
    }
  });

  // Генерация Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
