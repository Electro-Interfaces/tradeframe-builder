/**
 * Сервис экспорта сменных отчетов v2
 * Поддерживает экспорт в форматы: Excel, PDF, CSV
 * С полной визуальной стилизацией таблиц
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import { format as formatDate } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ShiftDetails, ShiftListItem } from '@/types/shift-reports-v2';
import { exportToExcelWithStyles } from './excelExportWithStyles';

/**
 * Формат экспорта
 */
export type ExportFormat = 'excel' | 'pdf' | 'csv';

/**
 * Режим экспорта
 */
export type ExportMode = 'simple' | 'folder';

/**
 * Опции экспорта
 */
export interface ExportOptions {
  format: ExportFormat;
  mode: ExportMode;
  folderHandle?: any; // File System Access API handle для режима 'folder'
}

/**
 * Результат экспорта
 */
export interface ExportResult {
  success: boolean;
  fileName?: string;
  error?: string;
  skipped?: boolean; // Файл уже существует (для режима folder)
}

/**
 * Генерация имени файла для сменного отчета
 */
export function generateFileName(
  shift: ShiftListItem | ShiftDetails,
  format: ExportFormat
): string {
  const date = formatDate(new Date(shift.openedAt), 'yyyy-MM-dd', { locale: ru });
  const stationCode = shift.stationCode;
  const shiftNumber = shift.shiftNumber;

  const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';

  return `Смена_${stationCode}_${shiftNumber}_${date}.${extension}`;
}

/**
 * Проверка существования файла по имени
 * В браузере используем localStorage для хранения списка экспортированных файлов
 */
export function checkFileExists(fileName: string, folderHandle?: any): boolean {
  if (!folderHandle) return false;

  const storageKey = `exported_files_${folderHandle.name.replace(/[^a-z0-9]/gi, '_')}`;
  const exportedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
  return exportedFiles.includes(fileName);
}

/**
 * Отметить файл как экспортированный
 */
export function markFileAsExported(fileName: string, folderHandle?: any): void {
  if (!folderHandle) return;

  const storageKey = `exported_files_${folderHandle.name.replace(/[^a-z0-9]/gi, '_')}`;
  const exportedFiles = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];

  if (!exportedFiles.includes(fileName)) {
    exportedFiles.push(fileName);
    localStorage.setItem(storageKey, JSON.stringify(exportedFiles));
  }
}

/**
 * Форматирование суммы в рубли
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Экспорт в Excel с полным форматированием
 */
export async function exportToExcel(details: ShiftDetails): Promise<Blob> {
  console.log('📊 ЭКСПОРТ В EXCEL - nozzleReadings:', details.nozzleReadings);
  console.log('📊 ЭКСПОРТ В EXCEL - tanks:', details.tanks);
  console.log('📊 ЭКСПОРТ В EXCEL - receipts:', details.receipts);
  console.log('📊 ЭКСПОРТ В EXCEL - salesBreakdown:', details.salesBreakdown);
  console.log('📊 ЭКСПОРТ В EXCEL - salesRaw:', details.salesRaw);
  console.log('📊 ЭКСПОРТ В EXCEL - cashMovements:', details.cashMovements);

  // Используем новую функцию с ExcelJS для полного форматирования
  return exportToExcelWithStyles(details);

  // ========== ЗАГОЛОВОК ==========
  allData.push(['СМЕННЫЙ ОТЧЕТ']);
  allData.push([]);
  allData.push(['Номер смены:', details.shiftNumber]);
  allData.push(['Торговая точка:', `${details.stationCode} - ${details.stationName || ''}`]);
  allData.push(['Оператор:', details.operator]);
  allData.push(['Открыта:', formatDate(new Date(details.openedAt), 'dd.MM.yyyy HH:mm', { locale: ru })]);
  allData.push(['Закрыта:', details.closedAt ? formatDate(new Date(details.closedAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—']);
  allData.push(['Статус:', details.status === 'closed' ? 'Закрыта' : details.status === 'open' ? 'Открыта' : 'Синхронизирована']);
  allData.push([]);
  allData.push(['ИТОГИ']);
  allData.push(['Общая выручка:', formatCurrency(details.totalRevenue)]);
  allData.push(['Общий отпуск топлива (л):', details.totalVolume.toFixed(2)]);
  allData.push(['Количество транзакций:', details.transactionCount]);
  allData.push(['Средний чек:', formatCurrency(details.averageCheck)]);
  allData.push([]);
  allData.push([]);

  // ========== СЕКЦИЯ: Состав смены - Показания счетных механизмов ТРК ==========
  const nozzleStartRow = allData.length;
  allData.push(['СОСТАВ СМЕНЫ - ПОКАЗАНИЯ СЧЕТНЫХ МЕХАНИЗМОВ ТРК']);
  allData.push([]);
  const nozzleHeaderRow = allData.length;
  allData.push([
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
  ]);

  if (details.nozzleReadings && details.nozzleReadings.length > 0) {
    // Группируем по топливу
    const groupedByFuel = details.nozzleReadings.reduce((acc, nozzle) => {
      if (!acc[nozzle.fuelCode]) {
        acc[nozzle.fuelCode] = [];
      }
      acc[nozzle.fuelCode].push(nozzle);
      return acc;
    }, {} as Record<number, typeof details.nozzleReadings>);

    // Выводим данные по каждому топливу
    Object.entries(groupedByFuel).forEach(([fuelCode, nozzles]) => {
      const tank = details.tanks.find(t => t.fuelCode === parseInt(fuelCode));

      nozzles.forEach((nozzle, idx) => {
        allData.push([
          idx === 0 ? nozzle.fuelName : '', // Название только в первой строке
          idx === 0 ? (tank?.tankNumber || '—') : '', // Номер резервуара только в первой строке
          idx === 0 ? (tank?.density?.toFixed(3) || '—') : '', // Плотность только в первой строке
          nozzle.pumpNumber,
          nozzle.endCounter.toFixed(2),
          nozzle.startCounter.toFixed(2),
          nozzle.volume.toFixed(2),
          nozzle.amount.toFixed(2),
          nozzle.price.toFixed(2),
          nozzle.cost.toFixed(2)
        ]);
      });

      // Строка "Всего" для каждого топлива
      const totalVolume = nozzles.reduce((sum, n) => sum + n.volume, 0);
      const totalAmount = nozzles.reduce((sum, n) => sum + n.amount, 0);
      const totalCost = nozzles.reduce((sum, n) => sum + n.cost, 0);

      allData.push([
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
      ]);
    });
  } else {
    allData.push(['Нет данных о показаниях ТРК', '', '', '', '', '', '', '', '', '']);
  }
  allData.push([]);
  allData.push([]);

  // ========== СЕКЦИЯ: Состояние резервуаров ==========
  const tanksStartRow = allData.length;
  allData.push(['СОСТОЯНИЕ РЕЗЕРВУАРОВ']);
  allData.push([]);
  const tanksHeaderRow = allData.length;
  allData.push([
    '№ рез.',
    'Топливо',
    'Код',
    'Начало (л)',
    'Конец (л)',
    'Отпуск ТРК (л)',
    'Поступило (л)',
    'Расчет (л)',
    'Разница (л)',
    'Уровень (мм)',
    'Температура (°C)',
    'Плотность (г/см³)',
    'Уровень воды (см)',
    'Объем воды (л)'
  ]);
  details.tanks.forEach(tank => {
    allData.push([
      tank.tankNumber,
      tank.fuelName,
      tank.fuelCode,
      tank.volumeBegin.toFixed(2),
      tank.volumeEnd.toFixed(2),
      tank.volumeDispensed.toFixed(2),
      tank.volumeReceived.toFixed(2),
      tank.volumeCalculated.toFixed(2),
      tank.volumeDifference.toFixed(2),
      tank.level?.toFixed(0) || '—',
      tank.temperature?.toFixed(1) || '—',
      tank.density?.toFixed(3) || '—',
      tank.waterLevel?.toFixed(1) || '—',
      tank.waterVolume?.toFixed(2) || '—'
    ]);
  });
  allData.push([]);
  allData.push([]);

  // ========== СЕКЦИЯ: Поступления ==========
  let receiptsHeaderRow = -1;
  if (details.receipts.length > 0) {
    const receiptsStartRow = allData.length;
    allData.push(['ПОСТУПЛЕНИЯ']);
    allData.push([]);
    receiptsHeaderRow = allData.length;
    allData.push([
      'Дата и время',
      '№ рез.',
      'Топливо',
      'Код',
      'Объем (л)',
      'Масса (кг)',
      'Плотность',
      'Температура'
    ]);
    details.receipts.forEach(receipt => {
      allData.push([
        formatDate(new Date(receipt.datetime), 'dd.MM.yyyy HH:mm', { locale: ru }),
        receipt.tankNumber,
        receipt.fuelName,
        receipt.fuelCode,
        receipt.volume.toFixed(2),
        receipt.amount?.toFixed(2) || '—',
        receipt.density?.toFixed(3) || '—',
        receipt.temperature?.toFixed(1) || '—'
      ]);
    });
    allData.push([]);
    allData.push([]);
  }

  // ========== СЕКЦИЯ: Расшифровка реализации ==========
  const salesStartRow = allData.length;
  allData.push(['РАСШИФРОВКА РЕАЛИЗАЦИИ']);
  allData.push([]);
  const salesHeaderRow = allData.length;
  allData.push([
    'Наименование',
    'Код',
    'Прокачка (л)',
    'По картам (л)',
    'По картам (руб)',
    'Скидка (руб)',
    'За наличные (л)',
    'За наличные (руб)',
    'Безнал (л)',
    'Всего (л)',
    'Разница (л)'
  ]);

  details.salesBreakdown.forEach(item => {
    allData.push([
      item.fuelName,
      item.fuelCode,
      item.pumpVolume.toFixed(2),
      item.cardVolume.toFixed(2),
      item.cardCost.toFixed(2),
      item.discountCost.toFixed(2),
      item.cashVolume.toFixed(2),
      item.cashCost.toFixed(2),
      item.nonCashVolume.toFixed(2),
      item.totalVolume.toFixed(2),
      item.difference.toFixed(2)
    ]);
  });

  // Итоги
  const totals = details.salesBreakdown.reduce((acc, item) => ({
    pumpVolume: acc.pumpVolume + item.pumpVolume,
    cardVolume: acc.cardVolume + item.cardVolume,
    cardCost: acc.cardCost + item.cardCost,
    discountCost: acc.discountCost + item.discountCost,
    cashVolume: acc.cashVolume + item.cashVolume,
    cashCost: acc.cashCost + item.cashCost,
    nonCashVolume: acc.nonCashVolume + item.nonCashVolume,
    totalVolume: acc.totalVolume + item.totalVolume,
    difference: acc.difference + item.difference
  }), {
    pumpVolume: 0,
    cardVolume: 0,
    cardCost: 0,
    discountCost: 0,
    cashVolume: 0,
    cashCost: 0,
    nonCashVolume: 0,
    totalVolume: 0,
    difference: 0
  });

  const salesTotalsRow = allData.length;
  allData.push([
    'ВСЕГО:',
    '',
    totals.pumpVolume.toFixed(2),
    totals.cardVolume.toFixed(2),
    totals.cardCost.toFixed(2),
    totals.discountCost.toFixed(2),
    totals.cashVolume.toFixed(2),
    totals.cashCost.toFixed(2),
    totals.nonCashVolume.toFixed(2),
    totals.totalVolume.toFixed(2),
    totals.difference.toFixed(2)
  ]);
  allData.push([]);
  allData.push([]);

  // ========== СЕКЦИЯ: Безналичная реализация ==========
  const nonCashStartRow = allData.length;
  allData.push(['БЕЗНАЛИЧНАЯ РЕАЛИЗАЦИЯ']);
  allData.push([]);
  const nonCashHeaderRow = allData.length;
  allData.push([
    'Наименование',
    'Код',
    'МобилПр. (л)',
    'МобилПр. (руб)',
    'Купон на сдачу (л)',
    'Купон на сдачу (руб)',
    'ИТОГО б/н (л)'
  ]);

  // Обрабатываем данные так же, как на экране
  const salesRaw = (details as any).salesRaw;
  let nonCashTotalsRow = -1;
  if (salesRaw && salesRaw.length > 0) {
    const fuelGroups = new Map<number, {
      fuelCode: number;
      fuelName: string;
      mobilprVolume: number;
      mobilprCost: number;
      couponVolume: number;
      couponCost: number;
    }>();

    salesRaw.forEach((sale: any) => {
      const paymentName = sale.pay_type?.name?.toLowerCase() || '';

      sale.fuel?.forEach((fuelItem: any) => {
        const fuelCode = fuelItem.service?.service_code || 0;
        const fuelName = fuelItem.service?.service_name || 'Неизвестно';
        const volume = parseFloat(fuelItem.release?.volume || '0');
        const cost = parseFloat(fuelItem.release?.cost || '0');

        if (!fuelGroups.has(fuelCode)) {
          fuelGroups.set(fuelCode, {
            fuelCode,
            fuelName,
            mobilprVolume: 0,
            mobilprCost: 0,
            couponVolume: 0,
            couponCost: 0,
          });
        }

        const group = fuelGroups.get(fuelCode)!;

        if (paymentName.includes('мобил')) {
          group.mobilprVolume += volume;
          group.mobilprCost += cost;
        }

        if (paymentName.includes('купон')) {
          group.couponVolume += volume;
          group.couponCost += cost;
        }
      });
    });

    const rows = Array.from(fuelGroups.values());

    // Выводим строки данных
    rows.forEach(row => {
      allData.push([
        row.fuelName,
        row.fuelCode,
        row.mobilprVolume.toFixed(2),
        row.mobilprCost.toFixed(2),
        row.couponVolume.toFixed(2),
        row.couponCost.toFixed(2),
        (row.mobilprVolume + row.couponVolume).toFixed(2)
      ]);
    });

    // Строка "Всего:"
    const totalMobilprVolume = rows.reduce((sum, r) => sum + r.mobilprVolume, 0);
    const totalMobilprCost = rows.reduce((sum, r) => sum + r.mobilprCost, 0);
    const totalCouponVolume = rows.reduce((sum, r) => sum + r.couponVolume, 0);
    const totalCouponCost = rows.reduce((sum, r) => sum + r.couponCost, 0);
    const totalNonCashVolume = rows.reduce((sum, r) => sum + r.mobilprVolume + r.couponVolume, 0);

    nonCashTotalsRow = allData.length;
    allData.push([
      'ВСЕГО:',
      '',
      totalMobilprVolume.toFixed(2),
      totalMobilprCost.toFixed(2),
      totalCouponVolume.toFixed(2),
      totalCouponCost.toFixed(2),
      totalNonCashVolume.toFixed(2)
    ]);
  } else {
    allData.push(['Нет данных о безналичной реализации', '', '', '', '', '', '']);
  }

  allData.push([]);
  allData.push([]);

  // ========== СЕКЦИЯ: Движение наличных ==========
  allData.push(['ДВИЖЕНИЕ НАЛИЧНЫХ ДЕНЕЖНЫХ СРЕДСТВ']);
  allData.push([]);
  allData.push(['Принято по смене', formatCurrency(details.cashMovements.find(m => m.operationType === 'closing')?.amount || 0)]);
  allData.push(['Выручка', formatCurrency(details.paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('наличн'))?.cost || 0)]);
  allData.push(['Передано старшему оператору', formatCurrency(
    (details.cashMovements.find(m => m.operationType === 'closing')?.amount || 0) +
    (details.paymentSales.find(p => p.paymentTypeName.toLowerCase().includes('наличн'))?.cost || 0)
  )]);

  // Создаем единый лист со всеми данными
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Настройка ширины колонок для лучшей читаемости
  ws['!cols'] = [
    { wch: 20 }, // Столбец A
    { wch: 15 }, // Столбец B
    { wch: 12 }, // Столбец C
    { wch: 12 }, // Столбец D
    { wch: 15 }, // Столбец E
    { wch: 12 }, // Столбец F
    { wch: 14 }, // Столбец G
    { wch: 15 }, // Столбец H
    { wch: 12 }, // Столбец I
    { wch: 12 }, // Столбец J
    { wch: 12 }, // Столбец K
    { wch: 15 }, // Столбец L
    { wch: 15 }, // Столбец M
    { wch: 14 }, // Столбец N
  ];

  // Стилизация ячеек для визуального соответствия экранным формам
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Базовые стили
  const headerStyle = {
    fill: { fgColor: { rgb: "334155" } }, // slate-700
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "475569" } },
      bottom: { style: "thin", color: { rgb: "475569" } },
      left: { style: "thin", color: { rgb: "475569" } },
      right: { style: "thin", color: { rgb: "475569" } }
    }
  };

  const dataStyle = {
    alignment: { horizontal: "left", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "CBD5E1" } },
      bottom: { style: "thin", color: { rgb: "CBD5E1" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } }
    }
  };

  const totalsStyle = {
    fill: { fgColor: { rgb: "475569" } }, // slate-600
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
    alignment: { horizontal: "left", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "334155" } },
      bottom: { style: "medium", color: { rgb: "334155" } },
      left: { style: "thin", color: { rgb: "475569" } },
      right: { style: "thin", color: { rgb: "475569" } }
    }
  };

  const sectionTitleStyle = {
    font: { bold: true, sz: 14, color: { rgb: "1E293B" } },
    alignment: { horizontal: "left", vertical: "center" }
  };

  // Применяем стили к заголовку документа
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: "0F172A" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  // Применяем стили к заголовкам таблиц
  const applyHeaderStyle = (row: number, maxCol: number) => {
    for (let C = 0; C <= maxCol; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: C });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = headerStyle;
    }
  };

  // Применяем стили к строкам данных таблицы
  const applyDataStyle = (startRow: number, endRow: number, maxCol: number) => {
    for (let R = startRow; R <= endRow; R++) {
      for (let C = 0; C <= maxCol; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        ws[cellAddress].s = dataStyle;
      }
    }
  };

  // Применяем стили к заголовкам секций
  const applySectionTitleStyle = (row: number) => {
    const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
    if (ws[cellAddress]) {
      ws[cellAddress].s = sectionTitleStyle;
    }
  };

  // Состав смены - Показания счетных механизмов ТРК
  applySectionTitleStyle(nozzleStartRow);
  applyHeaderStyle(nozzleHeaderRow, 9);
  if (details.nozzleReadings && details.nozzleReadings.length > 0) {
    const nozzleDataRows = details.nozzleReadings.length + Object.keys(
      details.nozzleReadings.reduce((acc, n) => ({ ...acc, [n.fuelCode]: true }), {})
    ).length; // Количество строк с данными + строки "Всего"
    applyDataStyle(nozzleHeaderRow + 1, nozzleHeaderRow + nozzleDataRows, 9);
  }

  // Резервуары
  applySectionTitleStyle(tanksStartRow);
  applyHeaderStyle(tanksHeaderRow, 13);
  applyDataStyle(tanksHeaderRow + 1, tanksHeaderRow + details.tanks.length, 13);

  // Поступления (если есть)
  if (receiptsHeaderRow >= 0) {
    applyHeaderStyle(receiptsHeaderRow, 7);
    applyDataStyle(receiptsHeaderRow + 1, receiptsHeaderRow + details.receipts.length, 7);
  }

  // Расшифровка реализации
  applySectionTitleStyle(salesStartRow);
  applyHeaderStyle(salesHeaderRow, 10);
  applyDataStyle(salesHeaderRow + 1, salesHeaderRow + details.salesBreakdown.length, 10);

  // Строка итогов расшифровки реализации
  for (let C = 0; C <= 10; C++) {
    const cellAddress = XLSX.utils.encode_cell({ r: salesTotalsRow, c: C });
    if (ws[cellAddress]) {
      ws[cellAddress].s = totalsStyle;
    }
  }

  // Безналичная реализация
  applySectionTitleStyle(nonCashStartRow);
  applyHeaderStyle(nonCashHeaderRow, 6);
  if (salesRaw && salesRaw.length > 0) {
    const nonCashDataRows = Array.from(
      new Set(salesRaw.flatMap((sale: any) =>
        sale.fuel?.map((f: any) => f.service?.service_code) || []
      ))
    ).length + 1; // Количество видов топлива + строка "Всего"
    applyDataStyle(nonCashHeaderRow + 1, nonCashHeaderRow + nonCashDataRows - 1, 6);

    // Строка итогов безналичной реализации
    if (nonCashTotalsRow >= 0) {
      for (let C = 0; C <= 6; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: nonCashTotalsRow, c: C });
        if (ws[cellAddress]) {
          ws[cellAddress].s = totalsStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Сменный отчет');

  // Генерация файла
  return new Promise((resolve) => {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    resolve(blob);
  });
}

/**
 * Экспорт в PDF
 */
export async function exportToPDF(details: ShiftDetails): Promise<Blob> {
  const doc = new jsPDF();
  let yPos = 20;

  // Заголовок
  doc.setFontSize(16);
  doc.text('СМЕННЫЙ ОТЧЕТ', 105, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(12);

  // Общая информация
  doc.text(`Номер смены: ${details.shiftNumber}`, 20, yPos);
  yPos += 7;
  doc.text(`Торговая точка: ${details.stationCode} - ${details.stationName || ''}`, 20, yPos);
  yPos += 7;
  doc.text(`Оператор: ${details.operator}`, 20, yPos);
  yPos += 7;
  doc.text(`Открыта: ${formatDate(new Date(details.openedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}`, 20, yPos);
  yPos += 7;
  doc.text(`Закрыта: ${details.closedAt ? formatDate(new Date(details.closedAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}`, 20, yPos);

  yPos += 15;
  doc.setFontSize(14);
  doc.text('ИТОГИ', 20, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.text(`Общая выручка: ${formatCurrency(details.totalRevenue)}`, 20, yPos);
  yPos += 7;
  doc.text(`Общий отпуск топлива: ${details.totalVolume.toFixed(2)} л`, 20, yPos);
  yPos += 7;
  doc.text(`Количество транзакций: ${details.transactionCount}`, 20, yPos);
  yPos += 7;
  doc.text(`Средний чек: ${formatCurrency(details.averageCheck)}`, 20, yPos);

  // Резервуары
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 15;
  }

  doc.setFontSize(14);
  doc.text('СОСТОЯНИЕ РЕЗЕРВУАРОВ', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  details.tanks.forEach(tank => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(`Рез. ${tank.tankNumber} (${tank.fuelName}): Начало ${tank.volumeBegin.toFixed(0)} л, Конец ${tank.volumeEnd.toFixed(0)} л, Разница ${tank.volumeDifference.toFixed(2)} л`, 20, yPos);
    yPos += 7;
  });

  // Продажи
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos += 15;
  }

  doc.setFontSize(14);
  doc.text('РАСШИФРОВКА РЕАЛИЗАЦИИ', 20, yPos);
  yPos += 10;

  doc.setFontSize(10);
  details.salesBreakdown.forEach(item => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(`${item.fuelName}: Прокачка ${item.pumpVolume.toFixed(2)} л, Всего ${item.totalVolume.toFixed(2)} л`, 20, yPos);
    yPos += 7;
  });

  return new Promise((resolve) => {
    const blob = doc.output('blob');
    resolve(blob);
  });
}

/**
 * Экспорт в CSV
 */
export async function exportToCSV(details: ShiftDetails): Promise<Blob> {
  const lines: string[] = [];

  // Общая информация
  lines.push('СМЕННЫЙ ОТЧЕТ');
  lines.push('');
  lines.push(`Номер смены;${details.shiftNumber}`);
  lines.push(`Торговая точка;${details.stationCode} - ${details.stationName || ''}`);
  lines.push(`Оператор;${details.operator}`);
  lines.push(`Открыта;${formatDate(new Date(details.openedAt), 'dd.MM.yyyy HH:mm', { locale: ru })}`);
  lines.push(`Закрыта;${details.closedAt ? formatDate(new Date(details.closedAt), 'dd.MM.yyyy HH:mm', { locale: ru }) : '—'}`);
  lines.push('');
  lines.push('ИТОГИ');
  lines.push(`Общая выручка;${formatCurrency(details.totalRevenue)}`);
  lines.push(`Общий отпуск топлива (л);${details.totalVolume.toFixed(2)}`);
  lines.push(`Количество транзакций;${details.transactionCount}`);
  lines.push(`Средний чек;${formatCurrency(details.averageCheck)}`);
  lines.push('');

  // Резервуары
  lines.push('СОСТОЯНИЕ РЕЗЕРВУАРОВ');
  lines.push('№ рез.;Топливо;Код;Начало (л);Конец (л);Отпуск ТРК (л);Поступило (л);Расчет (л);Разница (л)');
  details.tanks.forEach(tank => {
    lines.push(
      `${tank.tankNumber};${tank.fuelName};${tank.fuelCode};${tank.volumeBegin.toFixed(2)};${tank.volumeEnd.toFixed(2)};${tank.volumeDispensed.toFixed(2)};${tank.volumeReceived.toFixed(2)};${tank.volumeCalculated.toFixed(2)};${tank.volumeDifference.toFixed(2)}`
    );
  });
  lines.push('');

  // Расшифровка реализации
  lines.push('РАСШИФРОВКА РЕАЛИЗАЦИИ');
  lines.push('Наименование;Код;Прокачка (л);По картам (л);По картам (руб);Скидка (руб);За наличные (л);За наличные (руб);Безнал (л);Всего (л);Разница (л)');
  details.salesBreakdown.forEach(item => {
    lines.push(
      `${item.fuelName};${item.fuelCode};${item.pumpVolume.toFixed(2)};${item.cardVolume.toFixed(2)};${item.cardCost.toFixed(2)};${item.discountCost.toFixed(2)};${item.cashVolume.toFixed(2)};${item.cashCost.toFixed(2)};${item.nonCashVolume.toFixed(2)};${item.totalVolume.toFixed(2)};${item.difference.toFixed(2)}`
    );
  });

  const csvContent = lines.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  return blob;
}

/**
 * Экспорт сменного отчета
 */
export async function exportShiftReport(
  details: ShiftDetails,
  options: ExportOptions
): Promise<ExportResult> {
  try {
    const fileName = generateFileName(details, options.format);

    // Проверка существования файла в режиме folder
    if (options.mode === 'folder' && options.folderHandle) {
      if (checkFileExists(fileName, options.folderHandle)) {
        return {
          success: true,
          fileName,
          skipped: true
        };
      }
    }

    // Генерация файла в зависимости от формата
    let blob: Blob;

    switch (options.format) {
      case 'excel':
        blob = await exportToExcel(details);
        break;
      case 'pdf':
        blob = await exportToPDF(details);
        break;
      case 'csv':
        blob = await exportToCSV(details);
        break;
      default:
        throw new Error(`Неподдерживаемый формат: ${options.format}`);
    }

    // Скачивание файла
    if (options.mode === 'folder' && options.folderHandle) {
      // Режим экспорта в выбранную папку через File System Access API
      try {
        // Создаем файл в выбранной папке
        const fileHandle = await options.folderHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        // Отметить файл как экспортированный
        markFileAsExported(fileName, options.folderHandle);
      } catch (err: any) {
        console.error('❌ Ошибка экспорта в папку:', err);
        // Пользователь отменил выбор или ошибка доступа
        if (err.name === 'AbortError') {
          return {
            success: false,
            error: 'Экспорт отменён пользователем'
          };
        }
        throw err;
      }
    } else {
      // Обычный режим скачивания в папку загрузок по умолчанию
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return {
      success: true,
      fileName
    };
  } catch (error) {
    console.error('Ошибка при экспорте:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Массовый экспорт нескольких отчетов
 */
export async function exportMultipleShifts(
  shifts: ShiftDetails[],
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  for (let i = 0; i < shifts.length; i++) {
    const result = await exportShiftReport(shifts[i], options);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, shifts.length);
    }

    // Небольшая задержка между экспортами
    if (i < shifts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Очистка списка экспортированных файлов для папки
 */
export function clearExportedFiles(folderHandle?: any): void {
  if (!folderHandle) return;

  const storageKey = `exported_files_${folderHandle.name.replace(/[^a-z0-9]/gi, '_')}`;
  localStorage.removeItem(storageKey);
}
