/**
 * Сервис экспорта данных обзора сети в PDF
 */

import html2canvas from 'html2canvas';
import { loadPdfMake } from '@/utils/pdfMake';
import { formatNumber, formatCurrency } from '@/utils/networkFormatters';
import type { Transaction } from '@/services/stsApi';

interface PdfExportParams {
  dateFrom: string;
  dateTo: string;
  selectedNetwork: any;
  selectedTradingPoint: string | null;
  filteredTransactions: Transaction[];
  totalRevenue: number;
  totalVolume: number;
  averageCheck: number;
  fuelTypeStats: any[];
  paymentTypeStats: any[];
  refs: {
    dailySalesCardRef: React.RefObject<HTMLDivElement>;
    heatmapCardRef: React.RefObject<HTMLDivElement>;
    activityCardRef: React.RefObject<HTMLDivElement>;
    forecastCardRef: React.RefObject<HTMLDivElement>;
  };
}

export const networkPdfExportService = {
  /**
   * Экспорт дашборда в PDF
   */
  async exportToPdf(params: PdfExportParams): Promise<string> {
    const {
      dateFrom,
      dateTo,
      selectedNetwork,
      selectedTradingPoint,
      filteredTransactions,
      totalRevenue,
      totalVolume,
      averageCheck,
      fuelTypeStats,
      paymentTypeStats,
      refs
    } = params;

    const pdfMake = await loadPdfMake();

    // Захват элементов в изображения
    const captureElement = async (element: HTMLDivElement | null) => {
      if (!element) return null;

      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
        useCORS: true,
      });

      return canvas.toDataURL('image/png');
    };

    const [dailySalesImage, heatmapImage, activityImage, forecastImage] = await Promise.all([
      captureElement(refs.dailySalesCardRef.current),
      captureElement(refs.heatmapCardRef.current),
      captureElement(refs.activityCardRef.current),
      captureElement(refs.forecastCardRef.current),
    ]);

    // Определяем отображение торговой точки
    const pointDisplay = (() => {
      if (!selectedTradingPoint || selectedTradingPoint === 'all') {
        return 'Все торговые точки';
      }

      if (typeof selectedTradingPoint === 'string') {
        return selectedTradingPoint;
      }

      return selectedTradingPoint?.name ?? '—';
    })();

    // Формируем контент документа
    const content: any[] = [
      { text: 'Обзор сети', style: 'title' },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: `Сеть: ${selectedNetwork?.name ?? '—'}`, style: 'infoBlock' },
              { text: `Точка: ${pointDisplay}`, style: 'infoBlock' },
              { text: `Период: ${dateFrom} – ${dateTo}`, style: 'infoBlock' },
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

    // Добавляем итоги по топливу и оплате
    const fuelSummary = fuelTypeStats.slice(0, 6);
    const paymentSummary = paymentTypeStats.slice(0, 6);

    const breakdownColumns: any[] = [];

    if (fuelSummary.length > 0) {
      breakdownColumns.push({
        width: '*',
        stack: [
          { text: 'Итоги по видам топлива', style: 'sectionLabel' },
          ...fuelSummary.map((fuel) => ({
            text: `${fuel.type}: ${formatNumber(fuel.volume)} л • ${formatCurrency(fuel.revenue)} • ${fuel.operations} оп.`,
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
            text: `${payment.type}: ${formatNumber(payment.volume)} л • ${formatCurrency(payment.revenue)} • ${payment.operations} оп.`,
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

    // Добавляем графики
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
      content.push({ text: 'Прогноз продаж', style: 'sectionLabel', margin: [0, 0, 0, 8] });
      content.push({ image: forecastImage, width: 520, margin: [0, 0, 0, 16] });
    }

    const networkSlug = (selectedNetwork?.name || 'network')
      .replace(/[^a-zA-Zа-яА-Я0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const docDefinition = {
      info: {
        title: 'Обзор сети',
        author: 'TradeFrame Builder',
        subject: 'Экспорт дашборда',
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

    const fileName = `dashboard_${networkSlug || 'network'}_${dateFrom}_${dateTo}.pdf`;
    pdfMake.createPdf(docDefinition).download(fileName);

    return fileName;
  }
};
