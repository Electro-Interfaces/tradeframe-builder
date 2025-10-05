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
  worksheet.getCell(currentRow, 2).value = formatCurrency(details.totalRevenue);
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Общий отпуск топлива (л):';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.totalVolume.toFixed(2);
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Количество транзакций:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = details.transactionCount;
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Средний чек:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = formatCurrency(details.averageCheck);
  worksheet.getCell(currentRow, 2).font = valueStyle;
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
        const row = [
          idx === 0 ? nozzle.fuelName : '',
          idx === 0 ? (tank?.tankNumber || '—') : '',
          idx === 0 ? (tank?.density?.toFixed(3) || '—') : '',
          nozzle.pumpNumber,
          nozzle.endCounter.toFixed(2),
          nozzle.startCounter.toFixed(2),
          nozzle.volume.toFixed(2),
          nozzle.amount.toFixed(2),
          nozzle.price.toFixed(2),
          nozzle.cost.toFixed(2)
        ];

        row.forEach((value, colIdx) => {
          const cell = worksheet.getCell(currentRow, colIdx + 1);
          cell.value = value;
          cell.style = dataStyle;
        });
        currentRow++;
      });

      // Строка "Всего"
      const totalVolume = nozzles.reduce((sum, n) => sum + n.volume, 0);
      const totalAmount = nozzles.reduce((sum, n) => sum + n.amount, 0);
      const totalCost = nozzles.reduce((sum, n) => sum + n.cost, 0);

      const totalsRow = [
        'ВСЕГО:',
        '',
        '',
        '',
        '',
        '',
        totalVolume.toFixed(2),
        totalAmount.toFixed(2),
        '',
        totalCost.toFixed(2)
      ];

      totalsRow.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.value = value;
        cell.style = totalsStyle;
      });
      currentRow++;
    });
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

      const row = [
        tank.fuelName || '—',
        tank.tankNumber || '—',
        density.toFixed(4),
        volumeBegin.toFixed(2),
        (volumeBegin * density).toFixed(2),
        volumeReceived.toFixed(2),
        (volumeReceived * density).toFixed(2),
        volumeDispensed.toFixed(2),
        (volumeDispensed * density).toFixed(2),
        density.toFixed(4),
        t.temperature?.toFixed(1) || '—',
        t.level?.toFixed(2) || '—',
        volumeEnd.toFixed(2),
        t.waterLevel?.toFixed(2) || '0.00',
        t.waterVolume?.toFixed(2) || '0.00',
        volumeEnd.toFixed(2),
        (volumeEnd * density).toFixed(2),
        volumeCalculated.toFixed(2),
        (volumeCalculated * density).toFixed(2)
      ];

      row.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.value = value;
        cell.style = dataStyle;
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

      const row = [
        receipt.fuelName || '—',
        r.fuelCode || '—',
        r.supplier || '—',
        '1', // Код поставщика (обычно 1)
        r.documentNumber || receipt.waybillNumber || '—',
        receipt.tankNumber || '—',
        receipt.volume ? receipt.volume.toFixed(0) : '0',
        r.density?.toFixed(4) || '—',
        r.amount?.toFixed(0) || '0',
        r.temperature?.toFixed(1) || '—',
        r.actualVolume?.toFixed(0) || receipt.volume?.toFixed(0) || '0',
        r.actualDensity?.toFixed(2) || r.density?.toFixed(2) || '—',
        r.actualAmount?.toFixed(0) || r.amount?.toFixed(0) || '0',
        r.actualTemperature?.toFixed(0) || r.temperature?.toFixed(0) || '—'
      ];

      row.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.value = value;
        cell.style = dataStyle;
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

      const row = [
        sale.fuelName || '—',
        s.fuelCode || '—',
        pumpVolume.toFixed(2),
        cardVolume.toFixed(2),
        cardCost.toFixed(2) + ' ₽',
        discount.toFixed(2),
        cashVolume.toFixed(2),
        cashCost.toFixed(2) + ' ₽',
        nonCashVolume.toFixed(2),
        totalVol.toFixed(2),
        difference.toFixed(2)
      ];

      row.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.value = value;
        cell.style = dataStyle;
      });
      currentRow++;
    });

    // Итоговая строка
    const totalsRow = [
      'Всего:',
      '',
      totalPumpVolume.toFixed(2),
      totalCardVolume.toFixed(2),
      totalCardCost.toFixed(2) + ' ₽',
      totalDiscount.toFixed(2),
      totalCashVolume.toFixed(2),
      totalCashCost.toFixed(2) + ' ₽',
      totalNonCashVolume.toFixed(2),
      totalVolume.toFixed(2),
      totalDifference.toFixed(2)
    ];

    totalsRow.forEach((value, colIdx) => {
      const cell = worksheet.getCell(currentRow, colIdx + 1);
      cell.value = value;
      cell.style = totalsStyle;
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

      const row = [
        group.fuelName,
        group.fuelCode,
        group.mobilPrVolume.toFixed(2),
        group.mobilPrCost.toFixed(2) + ' ₽',
        group.couponVolume.toFixed(2),
        group.couponCost.toFixed(2) + ' ₽',
        total.toFixed(2)
      ];

      row.forEach((value, colIdx) => {
        const cell = worksheet.getCell(currentRow, colIdx + 1);
        cell.value = value;
        cell.style = dataStyle;
      });
      currentRow++;
    });

    // Итоговая строка
    const totalsRow = [
      'Всего:',
      '',
      totalMobilPrVolume.toFixed(2),
      totalMobilPrCost.toFixed(2) + ' ₽',
      totalCouponVolume.toFixed(2),
      totalCouponCost.toFixed(2) + ' ₽',
      (totalMobilPrVolume + totalCouponVolume).toFixed(2)
    ];

    totalsRow.forEach((value, colIdx) => {
      const cell = worksheet.getCell(currentRow, colIdx + 1);
      cell.value = value;
      cell.style = totalsStyle;
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
  worksheet.getCell(currentRow, 2).value = formatCurrency(openingAmount);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Внесено за смену';
  worksheet.getCell(currentRow, 2).value = formatCurrency(incomeAmount);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Выручка за смену';
  worksheet.getCell(currentRow, 2).value = formatCurrency(revenue);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Итого:';
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 2).value = formatCurrency(totalIncome);
  worksheet.getCell(currentRow, 2).font = { bold: true };
  currentRow += 2;

  // Расход
  worksheet.getCell(currentRow, 1).value = 'Сдано в банк';
  worksheet.getCell(currentRow, 2).value = formatCurrency(toBankAmount);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Выдано наличными';
  worksheet.getCell(currentRow, 2).value = formatCurrency(cashOutAmount);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Передано по смене';
  worksheet.getCell(currentRow, 2).value = formatCurrency(closingAmount);
  currentRow++;

  worksheet.getCell(currentRow, 1).value = 'Итого:';
  worksheet.getCell(currentRow, 1).font = { bold: true };
  worksheet.getCell(currentRow, 2).value = formatCurrency(totalExpense);
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
