require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'messaging-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildIdSet(items, key = 'id') {
  return new Set(items.map((item) => item?.[key]).filter(Boolean));
}

function diffMissing(sourceIds, targetIds) {
  return [...sourceIds].filter((id) => !targetIds.has(id));
}

function diffUnexpected(sourceIds, targetIds) {
  return [...targetIds].filter((id) => !sourceIds.has(id));
}

async function fetchCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM broadcast_messages) AS broadcast_messages,
       (SELECT COUNT(*)::int FROM message_recipients) AS message_recipients,
       (SELECT COUNT(*)::int FROM message_templates) AS message_templates,
       (SELECT COUNT(*)::int FROM message_attachments) AS message_attachments`
  );

  return rows[0];
}

async function fetchIdSets(client) {
  const messages = await client.query('SELECT id FROM broadcast_messages');
  const recipients = await client.query('SELECT id FROM message_recipients');
  const templates = await client.query('SELECT id FROM message_templates');
  const attachments = await client.query('SELECT id FROM message_attachments');

  return {
    broadcastMessages: new Set(messages.rows.map((row) => row.id)),
    messageRecipients: new Set(recipients.rows.map((row) => row.id)),
    messageTemplates: new Set(templates.rows.map((row) => row.id)),
    messageAttachments: new Set(attachments.rows.map((row) => row.id)),
  };
}

async function main() {
  const input = readJson(inputPath);
  const broadcastMessages = Array.isArray(input.broadcastMessages) ? input.broadcastMessages : [];
  const messageRecipients = Array.isArray(input.messageRecipients) ? input.messageRecipients : [];
  const messageTemplates = Array.isArray(input.messageTemplates) ? input.messageTemplates : [];
  const messageAttachments = Array.isArray(input.messageAttachments) ? input.messageAttachments : [];

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, валидация PostgreSQL невозможна');
  }

  const client = await pool.connect();
  try {
    const counts = await fetchCounts(client);
    const idSets = await fetchIdSets(client);
    const errors = [];

    const countChecks = [
      ['broadcast_messages', broadcastMessages.length, counts.broadcast_messages],
      ['message_recipients', messageRecipients.length, counts.message_recipients],
      ['message_templates', messageTemplates.length, counts.message_templates],
      ['message_attachments', messageAttachments.length, counts.message_attachments],
    ];

    countChecks.forEach(([label, sourceCount, targetCount]) => {
      if (sourceCount !== targetCount) {
        errors.push(`Count mismatch ${label}: source=${sourceCount} target=${targetCount}`);
      }
    });

    const checks = [
      ['broadcast_messages', buildIdSet(broadcastMessages), idSets.broadcastMessages],
      ['message_recipients', buildIdSet(messageRecipients), idSets.messageRecipients],
      ['message_templates', buildIdSet(messageTemplates), idSets.messageTemplates],
      ['message_attachments', buildIdSet(messageAttachments), idSets.messageAttachments],
    ];

    checks.forEach(([label, sourceIds, targetIds]) => {
      const missing = diffMissing(sourceIds, targetIds);
      const unexpected = diffUnexpected(sourceIds, targetIds);

      if (missing.length) {
        errors.push(`Отсутствуют ${label}: ${missing.slice(0, 10).join(', ')}`);
      }

      if (unexpected.length) {
        errors.push(`Лишние ${label} в БД: ${unexpected.slice(0, 10).join(', ')}`);
      }
    });

    console.log(
      `Source counts: broadcast_messages=${broadcastMessages.length}, message_recipients=${messageRecipients.length}, message_templates=${messageTemplates.length}, message_attachments=${messageAttachments.length}`
    );
    console.log(
      `Database counts: broadcast_messages=${counts.broadcast_messages}, message_recipients=${counts.message_recipients}, message_templates=${counts.message_templates}, message_attachments=${counts.message_attachments}`
    );

    if (errors.length) {
      errors.forEach((error) => console.error(error));
      process.exitCode = 1;
      return;
    }

    console.log('Валидация messaging-миграции прошла успешно');
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
