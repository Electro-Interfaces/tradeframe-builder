const nodemailer = require('nodemailer');

let cachedTransporter = null;

function buildTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP не настроен. Обратитесь к администратору.');
  }

  const config = {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  };

  // Если соединяемся через локальный туннель/прокси, нужно явно указать имя
  // сервера для TLS-сертификата.
  if (process.env.SMTP_TLS_SERVERNAME) {
    config.tls = {
      servername: process.env.SMTP_TLS_SERVERNAME,
      rejectUnauthorized: process.env.SMTP_TLS_INSECURE !== 'true',
    };
  }

  cachedTransporter = nodemailer.createTransport(config);

  return cachedTransporter;
}

function buildPlainBody(adjustment, items) {
  const lines = [
    `Корректировка остатков нефтепродуктов по результатам инвентаризации`,
    ``,
    `Сеть АЗС: ${adjustment.networkName || '—'}`,
    `Торговая точка: ${adjustment.tradingPointName || '—'}${
      adjustment.tradingPointAddress ? `, ${adjustment.tradingPointAddress}` : ''
    }`,
    ``,
    `Приказ № ${adjustment.orderNumber} от ${adjustment.orderDate || '—'}`,
    `Дата фактической инвентаризации: ${adjustment.inventoryDate || '—'}`,
    `Время начала действия: ${adjustment.effectiveAt || '—'}`,
  ];

  if (adjustment.comment) {
    lines.push('', `Комментарий: ${adjustment.comment}`);
  }

  const filled = (items || []).filter((it) => it.factVolumeL !== null && it.factVolumeL !== undefined);
  if (filled.length > 0) {
    lines.push('', 'Корректировка по резервуарам:');
    for (const item of filled) {
      const delta = item.deltaVolumeL !== null && item.deltaVolumeL !== undefined ? Number(item.deltaVolumeL) : null;
      const sign = delta !== null ? (delta > 0 ? '+' : '') : '';
      const deltaStr = delta !== null ? `${sign}${delta.toFixed(2)}` : '—';
      lines.push(
        `  Резервуар №${item.tankNumber} (${item.fuelName}): книжный ${Number(item.bookVolumeL).toFixed(2)} л · корректировка ${deltaStr} л · итог ${Number(item.factVolumeL).toFixed(2)} л`
      );
    }
  }

  lines.push(
    '',
    'Документ сгенерирован системой TradeFrame.',
    'Подробности и PDF — в прикреплённом файле.'
  );

  return lines.join('\n');
}

async function sendAdjustmentEmail({ adjustment, items, recipients, cc, fromAddress, pdfPath }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error('Не задан список получателей для рассылки');
  }
  if (!pdfPath) {
    throw new Error('Не указан путь к PDF-файлу');
  }

  const transporter = buildTransporter();

  const subject = `Корректировка остатков · ${
    adjustment.tradingPointName || adjustment.tradingPointId
  } · приказ № ${adjustment.orderNumber}`;

  const text = buildPlainBody(adjustment, items);

  const mailOptions = {
    from: fromAddress || process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipients.join(', '),
    cc: Array.isArray(cc) && cc.length ? cc.join(', ') : undefined,
    subject,
    text,
    attachments: [
      {
        filename: `inventory-adjustment-${adjustment.orderNumber || adjustment.id}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    messageId: info.messageId,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
  };
}

module.exports = {
  sendAdjustmentEmail,
};
