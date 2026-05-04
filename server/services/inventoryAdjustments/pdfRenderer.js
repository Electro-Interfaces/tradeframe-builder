const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const PdfPrinter = require('pdfmake');
const vfs = require('pdfmake/build/vfs_fonts');

const fonts = {
  Roboto: {
    normal: Buffer.from(vfs['Roboto-Regular.ttf'], 'base64'),
    bold: Buffer.from(vfs['Roboto-Medium.ttf'], 'base64'),
    italics: Buffer.from(vfs['Roboto-Italic.ttf'], 'base64'),
    bolditalics: Buffer.from(vfs['Roboto-MediumItalic.ttf'], 'base64'),
  },
};

const printer = new PdfPrinter(fonts);

const UPLOADS_DIR = path.join(
  process.env.INVENTORY_ADJUSTMENTS_UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads', 'inventory-adjustments')
);

function formatDateRu(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function formatDateTimeRu(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(value);
  }
}

function formatNumber(value, fractionDigits = 2) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('ru-RU', { maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits });
}

function formatDelta(value, unit) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${unit}`;
}

function buildDocDefinition(adjustment, items) {
  const filledItems = (items || []).filter((it) => it.factVolumeL !== null && it.factVolumeL !== undefined);

  const tableBody = [
    [
      { text: '№', style: 'tableHeader' },
      { text: 'Топливо', style: 'tableHeader' },
      { text: 'Книжный, л', style: 'tableHeader', alignment: 'right' },
      { text: 'Корректировка, л', style: 'tableHeader', alignment: 'right' },
      { text: 'Итог, л', style: 'tableHeader', alignment: 'right' },
      { text: 'Книжная, кг', style: 'tableHeader', alignment: 'right' },
      { text: 'Корр., кг', style: 'tableHeader', alignment: 'right' },
      { text: 'Итог, кг', style: 'tableHeader', alignment: 'right' },
    ],
    ...filledItems.map((it) => [
      { text: String(it.tankNumber) },
      { text: it.fuelName || '—' },
      { text: formatNumber(it.bookVolumeL), alignment: 'right' },
      { text: formatDelta(it.deltaVolumeL, 'л'), alignment: 'right' },
      { text: formatNumber(it.factVolumeL), alignment: 'right' },
      { text: formatNumber(it.bookMassKg), alignment: 'right' },
      { text: formatDelta(it.deltaMassKg, 'кг'), alignment: 'right' },
      { text: formatNumber(it.factMassKg), alignment: 'right' },
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 60],
    info: {
      title: `Корректировка остатков ${adjustment.orderNumber}`,
      author: 'TradeFrame',
      subject: 'Приказ на корректировку остатков нефтепродуктов',
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10,
      lineHeight: 1.25,
    },
    styles: {
      title: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 0, 0, 6] },
      subtitle: { fontSize: 11, alignment: 'center', margin: [0, 0, 0, 16] },
      sectionHeader: { fontSize: 11, bold: true, margin: [0, 12, 0, 4] },
      label: { fontSize: 9, color: '#555' },
      tableHeader: { bold: true, fontSize: 9, fillColor: '#f0f0f0' },
      footer: { fontSize: 9, color: '#777', italics: true },
    },
    content: [
      { text: 'Приказ на корректировку остатков нефтепродуктов', style: 'title' },
      {
        text: `по результатам инвентаризации № ${adjustment.orderNumber} от ${formatDateRu(adjustment.orderDate)}`,
        style: 'subtitle',
      },
      {
        columns: [
          [
            { text: 'Сеть АЗС', style: 'label' },
            { text: adjustment.networkName || '—' },
          ],
          [
            { text: 'Торговая точка', style: 'label' },
            { text: adjustment.tradingPointName || '—' },
            { text: adjustment.tradingPointAddress || '', style: 'label' },
          ],
        ],
        columnGap: 20,
      },
      { text: 'Реквизиты приказа', style: 'sectionHeader' },
      {
        table: {
          widths: ['auto', '*'],
          body: [
            [
              { text: 'Дата фактической инвентаризации', style: 'label', border: [false, false, false, false] },
              { text: formatDateRu(adjustment.inventoryDate), border: [false, false, false, false] },
            ],
            [
              { text: 'Время начала действия', style: 'label', border: [false, false, false, false] },
              { text: formatDateTimeRu(adjustment.effectiveAt), border: [false, false, false, false] },
            ],
            [
              { text: 'Комментарий', style: 'label', border: [false, false, false, false] },
              { text: adjustment.comment || '—', border: [false, false, false, false] },
            ],
          ],
        },
        layout: 'noBorders',
      },
      { text: 'Корректировка по резервуарам', style: 'sectionHeader' },
      filledItems.length === 0
        ? { text: 'В приказе нет резервуаров с заполненной корректировкой.', italics: true, color: '#a00' }
        : {
            table: {
              headerRows: 1,
              widths: [22, '*', 50, 60, 50, 50, 50, 55],
              body: tableBody,
            },
            layout: {
              fillColor: (rowIndex) => (rowIndex === 0 ? '#f0f0f0' : null),
            },
          },
      {
        margin: [0, 30, 0, 0],
        columns: [
          [
            { text: 'Подпись ответственного:', style: 'label' },
            { text: '___________________________________', margin: [0, 6, 0, 0] },
          ],
          [
            { text: 'Дата подписи:', style: 'label' },
            { text: '___________________________________', margin: [0, 6, 0, 0] },
          ],
        ],
        columnGap: 30,
      },
    ],
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: `Документ сгенерирован TradeFrame · ${formatDateTimeRu(new Date().toISOString())}`,
          style: 'footer',
          margin: [40, 0, 0, 0],
        },
        { text: `${currentPage} / ${pageCount}`, style: 'footer', alignment: 'right', margin: [0, 0, 40, 0] },
      ],
    }),
  };
}

async function ensureUploadsDir() {
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
}

function getPdfFilePath(adjustmentId) {
  return path.join(UPLOADS_DIR, `${adjustmentId}.pdf`);
}

async function generatePdf(adjustment, items) {
  await ensureUploadsDir();
  const filePath = getPdfFilePath(adjustment.id);

  const definition = buildDocDefinition(adjustment, items);
  const pdfDoc = printer.createPdfKitDocument(definition);

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    pdfDoc.pipe(stream);
    stream.on('finish', resolve);
    stream.on('error', reject);
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });

  return filePath;
}

module.exports = {
  UPLOADS_DIR,
  generatePdf,
  getPdfFilePath,
  buildDocDefinition,
};
