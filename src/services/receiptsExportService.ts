/**
 * Excel экспорт для поступлений топлива
 */

import type ExcelJS from 'exceljs';
import { format as formatDate } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { FlatReceipt } from '@/types/receipts';

// Числовые форматы для Excel
const NUM_FORMATS = {
  decimal2: '#,##0.00',
  decimal3: '#,##0.000',
  integer: '#,##0',
  percent: '0.00%',
};

/**
 * Экспорт поступлений топлива в Excel
 */
export async function exportReceiptsToExcel(
  receipts: FlatReceipt[],
  networkName: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<Blob> {
  const ExcelJSModule = await import('exceljs');
  const ExcelJSLib = ExcelJSModule.default;
  const workbook = new ExcelJSLib.Workbook();
  const worksheet = workbook.addWorksheet('Поступления топлива');

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

  let currentRow = 1;

  // ========== ЗАГОЛОВОК ==========
  const titleCell = worksheet.getCell(currentRow, 1);
  titleCell.value = 'ПОСТУПЛЕНИЯ ТОПЛИВА';
  titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(currentRow, 1, currentRow, 12);
  currentRow += 2;

  // Информация о фильтрах
  const labelStyle = { bold: true, size: 11, color: { argb: 'FF475569' } };
  const valueStyle = { size: 11 };

  worksheet.getCell(currentRow, 1).value = 'Торговая сеть:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = networkName;
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow++;

  if (filters?.dateFrom || filters?.dateTo) {
    worksheet.getCell(currentRow, 1).value = 'Период:';
    worksheet.getCell(currentRow, 1).font = labelStyle;
    const period = `${filters.dateFrom ? formatDate(new Date(filters.dateFrom), 'dd.MM.yyyy', { locale: ru }) : '...'} - ${filters.dateTo ? formatDate(new Date(filters.dateTo), 'dd.MM.yyyy', { locale: ru }) : '...'}`;
    worksheet.getCell(currentRow, 2).value = period;
    worksheet.getCell(currentRow, 2).font = valueStyle;
    currentRow++;
  }

  worksheet.getCell(currentRow, 1).value = 'Дата формирования:';
  worksheet.getCell(currentRow, 1).font = labelStyle;
  worksheet.getCell(currentRow, 2).value = formatDate(new Date(), 'dd.MM.yyyy HH:mm', { locale: ru });
  worksheet.getCell(currentRow, 2).font = valueStyle;
  currentRow += 2;

  // ========== ТАБЛИЦА ПОСТУПЛЕНИЙ ==========
  const headers = [
    'Дата и время',
    'ТТ',
    'Смена',
    'ТТН',
    'Топливо',
    'Резервуар',
    'Нефтебаза',
    'Документ - Объем (л)',
    'Документ - Масса (кг)',
    'Документ - Плотность',
    'Документ - Температура',
    'Факт - Объем (л)',
    'Факт - Масса (кг)',
    'Факт - Плотность',
    'Факт - Температура',
    'Отклонение по объему (л)',
    'Отклонение по объему (%)',
    'Отклонение по массе (кг)',
    'Отклонение по массе (%)',
  ];

  headers.forEach((header, idx) => {
    const cell = worksheet.getCell(currentRow, idx + 1);
    cell.value = header;
    cell.style = headerStyle;
  });
  currentRow++;

  // Данные
  let totalDocVolume = 0;
  let totalDocAmount = 0;
  let totalFactVolume = 0;
  let totalFactAmount = 0;

  receipts.forEach(receipt => {
    const docVolume = parseFloat(receipt.doc.volume);
    const docAmount = parseFloat(receipt.doc.amount);
    const factVolume = parseFloat(receipt.fact.volume);
    const factAmount = parseFloat(receipt.fact.amount);

    totalDocVolume += docVolume;
    totalDocAmount += docAmount;
    totalFactVolume += factVolume;
    totalFactAmount += factAmount;

    // Определяем данные и форматы для каждой колонки
    const receiptRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
      { value: formatDate(new Date(receipt.dt), 'dd.MM.yyyy HH:mm', { locale: ru }) },
      { value: receipt.stationNumber },
      { value: receipt.shiftNumber },
      { value: receipt.ttn },
      { value: receipt.service.service_name },
      { value: receipt.tank },
      { value: receipt.base.name || `База ${receipt.base.id}` },
      { value: docVolume, format: 'decimal2' },
      { value: docAmount, format: 'decimal2' },
      { value: receipt.doc.density, format: 'decimal3' },
      { value: receipt.doc.temp, format: 'decimal2' },
      { value: factVolume, format: 'decimal2' },
      { value: factAmount, format: 'decimal2' },
      { value: receipt.fact.density, format: 'decimal3' },
      { value: receipt.fact.temp, format: 'decimal2' },
      { value: receipt.volumeDiff, format: 'decimal2' },
      { value: receipt.volumeDiffPercent / 100, format: 'percent' },
      { value: receipt.amountDiff, format: 'decimal2' },
      { value: receipt.amountDiffPercent / 100, format: 'percent' },
    ];

    receiptRowData.forEach((item, colIdx) => {
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
  const volumeDiffTotal = totalFactVolume - totalDocVolume;
  const volumeDiffPercentTotal = totalDocVolume > 0 ? volumeDiffTotal / totalDocVolume : 0;
  const amountDiffTotal = totalFactAmount - totalDocAmount;
  const amountDiffPercentTotal = totalDocAmount > 0 ? amountDiffTotal / totalDocAmount : 0;

  const totalsRowData: Array<{ value: any; format?: keyof typeof NUM_FORMATS }> = [
    { value: 'ИТОГО:' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: totalDocVolume, format: 'decimal2' },
    { value: totalDocAmount, format: 'decimal2' },
    { value: '' },
    { value: '' },
    { value: totalFactVolume, format: 'decimal2' },
    { value: totalFactAmount, format: 'decimal2' },
    { value: '' },
    { value: '' },
    { value: volumeDiffTotal, format: 'decimal2' },
    { value: volumeDiffPercentTotal, format: 'percent' },
    { value: amountDiffTotal, format: 'decimal2' },
    { value: amountDiffPercentTotal, format: 'percent' },
  ];

  totalsRowData.forEach((item, colIdx) => {
    const cell = worksheet.getCell(currentRow, colIdx + 1);
    cell.style = totalsStyle;
    if (item.format && typeof item.value === 'number') {
      cell.value = item.value;
      cell.numFmt = NUM_FORMATS[item.format];
    } else {
      cell.value = item.value;
    }
  });

  // Установка ширины колонок
  const columnWidths = [
    18, // Дата и время
    8,  // ТТ
    8,  // Смена
    12, // ТТН
    15, // Топливо
    10, // Резервуар
    18, // Нефтебаза
    15, // Документ - Объем
    15, // Документ - Масса
    15, // Документ - Плотность
    15, // Документ - Температура
    15, // Факт - Объем
    15, // Факт - Масса
    15, // Факт - Плотность
    15, // Факт - Температура
    18, // Отклонение по объему
    18, // Отклонение по объему %
    18, // Отклонение по массе
    18, // Отклонение по массе %
  ];

  worksheet.columns.forEach((column, idx) => {
    if (column) {
      column.width = columnWidths[idx] || 12;
    }
  });

  // Генерация Blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
