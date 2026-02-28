/**
 * Сервис экспорта операций в различные форматы (Excel, PDF)
 */

import * as XLSX from 'xlsx';
import { normalizePaymentMethod } from '@/utils/paymentUtils';
import { createChartCanvas } from '@/utils/chartUtils';
import type { ChartConfiguration } from 'chart.js';

interface ExportOperation {
  id?: string;
  receiptNumber?: string;
  startTime: string;
  nozzleNumber?: number;
  fuelType?: string;
  actualQuantity?: number;
  quantity?: number;
  price?: number;
  actualAmount?: number;
  totalCost?: number;
  paymentMethod?: string;
  cardNumber?: string;
  posNumber?: number;
  shiftNumber?: number;
  orderedQuantity?: number;
  orderedAmount?: number;
  status?: string;
}

interface ExportOptions {
  operations: ExportOperation[];
  dateFrom?: string;
  dateTo?: string;
  networkName?: string;
  tradingPointName?: string;
  isMobile?: boolean;
}

interface LoadPdfMakeResult {
  createPdf: (docDefinition: any) => {
    download: (fileName: string) => void;
  };
}

/**
 * Показывает уведомление пользователю
 */
function showNotification(message: string, type: 'success' | 'error' | 'warning', isMobile: boolean = false) {
  const notification = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-amber-500';
  notification.className = `fixed ${isMobile ? 'top-16 left-4 right-4' : 'top-4 right-4'} ${bgColor} text-foreground px-4 py-2 rounded-lg shadow-lg z-50`;
  notification.textContent = message;
  document.body.appendChild(notification);

  const timeout = type === 'success' ? 3000 : 2500;
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, timeout);
}

/**
 * Динамическая загрузка pdfmake
 */
async function loadPdfMake(): Promise<LoadPdfMakeResult> {
  const pdfMake = await import('pdfmake/build/pdfmake');
  const pdfFonts = await import('pdfmake/build/vfs_fonts');
  (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
  return pdfMake as any;
}

/**
 * Экспорт операций в Excel
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { operations, dateFrom, dateTo, networkName, tradingPointName, isMobile = false } = options;

  if (!operations.length) {
    showNotification('Нет данных для экспорта', 'warning', isMobile);
    return;
  }

  try {
    const formatNumberDisplay = (value: number) =>
      value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const statusMap: Record<string, string> = {
      completed: 'Завершено',
      in_progress: 'Выполняется',
      failed: 'Ошибка',
      pending: 'Ожидание',
      cancelled: 'Отменено',
    };

    const totals = operations.reduce(
      (acc, record) => {
        const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
        const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
        const orderedLiters = Number(record.orderedQuantity ?? 0) || 0;
        const orderedAmount = Number(record.orderedAmount ?? 0) || 0;
        return {
          liters: acc.liters + liters,
          amount: acc.amount + amount,
          orderedLiters: acc.orderedLiters + orderedLiters,
          orderedAmount: acc.orderedAmount + orderedAmount,
        };
      },
      { liters: 0, amount: 0, orderedLiters: 0, orderedAmount: 0 }
    );

    // Записываем числа как числа для дальнейшей обработки в Excel
    const data = operations.map((record) => {
      const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
      const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
      const price = Number(record.price ?? 0) || 0;
      const orderedLiters = Number(record.orderedQuantity ?? 0) || 0;

      return {
        'Чек': record.receiptNumber || '-',
        'ID': record.id || '-',
        'Дата и время': new Date(record.startTime).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        'Пистолет': record.nozzleNumber ? record.nozzleNumber : null,
        'Топливо': record.fuelType || '-',
        'Кол-во, л': liters || null,
        'Цена, ₽/л': price || null,
        'Сумма, ₽': amount || null,
        'Оплата': normalizePaymentMethod(record.paymentMethod || ''),
        'Карта': record.cardNumber || '-',
        'POS': record.posNumber ? record.posNumber : null,
        'Смена': record.shiftNumber ? record.shiftNumber : null,
        'Заказ, л': orderedLiters || null,
        'Статус': statusMap[record.status || ''] || record.status || '-',
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Применяем числовой формат к числовым колонкам
    const numericColumns = [3, 5, 6, 7, 10, 11, 12]; // Пистолет, Кол-во, Цена, Сумма, POS, Смена, Заказ
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      numericColumns.forEach(col => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = ws[cellAddress];
        if (cell && typeof cell.v === 'number') {
          cell.z = '#,##0.00'; // Числовой формат с 2 знаками после запятой
        }
      });
    }

    ws['!cols'] = [
      { wch: 12 },  // Чек
      { wch: 12 },  // ID
      { wch: 18 },  // Дата и время
      { wch: 10 },  // Пистолет
      { wch: 15 },  // Топливо
      { wch: 12 },  // Кол-во, л
      { wch: 12 },  // Цена, ₽/л
      { wch: 12 },  // Сумма, ₽
      { wch: 14 },  // Оплата
      { wch: 16 },  // Карта
      { wch: 8 },   // POS
      { wch: 8 },   // Смена
      { wch: 12 },  // Заказ, л
      { wch: 12 },  // Статус
    ];

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        ['Отчёт по операциям'],
        [`Сеть: ${networkName || '—'}`],
        [`Точка: ${tradingPointName || '—'}`],
        [`Период: ${dateFrom || '—'} — ${dateTo || '—'}`],
        [`Дата формирования: ${new Date().toLocaleString('ru-RU')}`],
        [],
        [`Количество операций: ${operations.length}`],
        [`Отпуск: ${formatNumberDisplay(totals.liters)} л`],
        [`Сумма: ${formatNumberDisplay(totals.amount)} ₽`],
        [`Заказано: ${formatNumberDisplay(totals.orderedLiters)} л на ${formatNumberDisplay(totals.orderedAmount)} ₽`],
        [],
      ],
      { origin: 'A1' }
    );

    XLSX.utils.book_append_sheet(wb, ws, 'Операции');
    const fileName = `operations_${dateFrom || 'start'}_${dateTo || 'end'}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showNotification(`Excel файл создан: ${operations.length} записей`, 'success', isMobile);
  } catch (error) {
    showNotification('Ошибка при создании Excel файла', 'error', isMobile);
  }
}

/**
 * Экспорт операций в PDF
 */
export async function exportToPdf(options: ExportOptions): Promise<void> {
  const { operations, dateFrom, dateTo, networkName, tradingPointName, isMobile = false } = options;

  if (!operations.length) {
    showNotification('Нет данных для экспорта', 'warning', isMobile);
    return;
  }

  try {
    const pdfMake = await loadPdfMake();

    const formatNumber = (value: number) =>
      value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    const statusMap: Record<string, string> = {
      completed: 'Завершено',
      in_progress: 'Выполняется',
      failed: 'Ошибка',
      pending: 'Ожидание',
      cancelled: 'Отменено',
    };

    const totals = operations.reduce(
      (acc, record) => {
        const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
        const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
        const orderedLiters = Number(record.orderedQuantity ?? 0) || 0;
        const orderedAmount = Number(record.orderedAmount ?? 0) || 0;
        return {
          liters: acc.liters + liters,
          amount: acc.amount + amount,
          orderedLiters: acc.orderedLiters + orderedLiters,
          orderedAmount: acc.orderedAmount + orderedAmount,
        };
      },
      { liters: 0, amount: 0, orderedLiters: 0, orderedAmount: 0 }
    );

    const fuelTotals = Array.from(
      operations.reduce((acc, record) => {
        const key = record.fuelType || '—';
        const entry = acc.get(key) ?? { liters: 0, amount: 0 };
        const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
        const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
        entry.liters += liters;
        entry.amount += amount;
        acc.set(key, entry);
        return acc;
      }, new Map<string, { liters: number; amount: number }>()),
    ).sort((a, b) => b[1].amount - a[1].amount);

    const paymentTotals = Array.from(
      operations.reduce((acc, record) => {
        const key = normalizePaymentMethod(record.paymentMethod || '');
        const entry = acc.get(key) ?? { liters: 0, amount: 0 };
        const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
        const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
        entry.liters += liters;
        entry.amount += amount;
        acc.set(key, entry);
        return acc;
      }, new Map<string, { liters: number; amount: number }>()),
    ).sort((a, b) => b[1].amount - a[1].amount);

    const tableBody = [
      [
        { text: 'Чек', style: 'tableHeader' },
        { text: 'ID', style: 'tableHeader' },
        { text: 'Дата и время', style: 'tableHeader' },
        { text: 'Пист.', style: 'tableHeader', alignment: 'center' },
        { text: 'Топливо', style: 'tableHeader' },
        { text: 'Кол-во, л', style: 'tableHeader', alignment: 'right' },
        { text: 'Цена, ₽/л', style: 'tableHeader', alignment: 'right' },
        { text: 'Сумма, ₽', style: 'tableHeader', alignment: 'right' },
        { text: 'Оплата', style: 'tableHeader' },
        { text: 'Карта', style: 'tableHeader' },
        { text: 'POS', style: 'tableHeader', alignment: 'center' },
        { text: 'Смена', style: 'tableHeader', alignment: 'center' },
        { text: 'Заказ, л', style: 'tableHeader', alignment: 'right' },
        { text: 'Статус', style: 'tableHeader' },
      ],
      ...operations.map((record) => {
        const liters = Number(record.actualQuantity ?? record.quantity ?? 0) || 0;
        const amount = Number(record.actualAmount ?? record.totalCost ?? 0) || 0;
        const price = Number(record.price ?? 0) || 0;
        const orderedLiters = Number(record.orderedQuantity ?? 0) || 0;

        return [
          { text: record.receiptNumber || '-', style: 'tableCellMono' },
          { text: record.id ?? '-', style: 'tableCellMono' },
          {
            text: new Date(record.startTime).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            style: 'tableCell',
          },
          { text: record.nozzleNumber ? String(record.nozzleNumber) : '-', style: 'tableCell', alignment: 'center' },
          { text: record.fuelType || '-', style: 'tableCell' },
          { text: liters ? formatNumber(liters) : '-', style: 'tableCell', alignment: 'right' },
          { text: price ? formatNumber(price) : '-', style: 'tableCell', alignment: 'right' },
          { text: amount ? formatNumber(amount) : '-', style: 'tableCell', alignment: 'right' },
          { text: normalizePaymentMethod(record.paymentMethod || ''), style: 'tableCell' },
          { text: record.cardNumber || '-', style: 'tableCellMono' },
          { text: record.posNumber ? String(record.posNumber) : '-', style: 'tableCell', alignment: 'center' },
          { text: record.shiftNumber ? String(record.shiftNumber) : '-', style: 'tableCell', alignment: 'center' },
          { text: orderedLiters ? formatNumber(orderedLiters) : '-', style: 'tableCell', alignment: 'right' },
          { text: statusMap[record.status || ''] || record.status || '-', style: 'tableCell' },
        ];
      }),
    ];

    const content: Array<Record<string, unknown>> = [
      { text: 'Отчёт по операциям', style: 'title' },
      {
        columns: [
          {
            text: [
              { text: 'Сеть: ', bold: true },
              networkName || '—',
              '\n',
              { text: 'Точка: ', bold: true },
              tradingPointName || '—',
            ],
            style: 'infoBlock',
          },
          {
            text: [
              { text: 'Период: ', bold: true },
              `${dateFrom || '—'} – ${dateTo || '—'}`,
              '\n',
              { text: 'Сформировано: ', bold: true },
              new Date().toLocaleString('ru-RU'),
            ],
            style: 'infoBlock',
            alignment: 'right',
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 12],
      },
      {
        columns: [
          {
            text: [
              { text: 'Количество операций: ', bold: true },
              String(operations.length),
            ],
            style: 'summaryBlock',
          },
          {
            text: [
              { text: 'Отпуск, л: ', bold: true },
              formatNumber(totals.liters),
            ],
            style: 'summaryBlock',
            alignment: 'center',
          },
          {
            text: [
              { text: 'Сумма, ₽: ', bold: true },
              formatNumber(totals.amount),
            ],
            style: 'summaryBlock',
            alignment: 'center',
          },
          {
            text: [
              { text: 'Заказ, л: ', bold: true },
              formatNumber(totals.orderedLiters),
              '\n',
              { text: 'Заказ, ₽: ', bold: true },
              formatNumber(totals.orderedAmount),
            ],
            style: 'summaryBlock',
            alignment: 'right',
          },
        ],
        columnGap: 12,
        margin: [0, 0, 0, 16],
      },
    ];

    const breakdownColumns: Array<Record<string, unknown>> = [];
    if (fuelTotals.length > 0) {
      breakdownColumns.push({
        width: '*',
        stack: [
          { text: 'Итоги по топливу', style: 'sectionLabel' },
          ...fuelTotals.map(([fuel, data]) => ({
            text: `${fuel}: ${formatNumber(data.liters)} л / ${formatNumber(data.amount)} ₽`,
            style: 'summaryDetail',
          })),
        ],
      });
    }
    if (paymentTotals.length > 0) {
      breakdownColumns.push({
        width: '*',
        stack: [
          { text: 'Итоги по оплатам', style: 'sectionLabel' },
          ...paymentTotals.map(([method, data]) => ({
            text: `${method}: ${formatNumber(data.liters)} л / ${formatNumber(data.amount)} ₽`,
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

    content.push({
      table: {
        headerRows: 1,
        widths: [40, 45, 75, 26, 50, 38, 38, 45, 45, 50, 24, 24, 40, 45],
        body: tableBody,
      },
      layout: {
        fillColor: (rowIndex: number) => {
          if (rowIndex === 0) {
            return '#1f2937';
          }
          return rowIndex % 2 === 0 ? '#f3f4f6' : '#ffffff';
        },
        hLineColor: () => '#d1d5db',
        vLineColor: () => '#d1d5db',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    });

    const docDefinition = {
      info: {
        title: 'Отчёт по операциям',
        author: 'TradeControl Builder',
        subject: 'Экспорт операций',
      },
      pageOrientation: 'landscape',
      pageMargins: [24, 24, 24, 32],
      content,
      styles: {
        title: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 12],
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
          margin: [0, 0, 0, 4],
        },
        summaryDetail: {
          fontSize: 10,
          color: '#374151',
          margin: [0, 0, 0, 2],
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
    } as const;

    const fileName = `operations_${dateFrom || 'start'}_${dateTo || 'end'}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    showNotification(`PDF файл создан: ${operations.length} записей`, 'success', isMobile);
  } catch (error) {
    showNotification('Ошибка при создании PDF файла', 'error', isMobile);
  }
}
