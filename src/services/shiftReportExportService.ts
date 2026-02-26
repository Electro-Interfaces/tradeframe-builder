/**
 * Сервис экспорта сменных отчетов v2
 * Поддерживает экспорт в форматы: Excel, PDF, CSV
 * С полной визуальной стилизацией таблиц
 */

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
  return exportToExcelWithStyles(details);
}

/**
 * Экспорт в PDF
 */
export async function exportToPDF(details: ShiftDetails): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
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
