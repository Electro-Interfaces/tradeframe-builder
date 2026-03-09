require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const postgres = require('../../db/pool');

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const positionalArgs = args.filter((arg) => !arg.startsWith('--'));

const inputPath = positionalArgs[0]
  ? path.resolve(positionalArgs[0])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'messaging-export.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Файл не найден: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureUniqueIds(items, key, label) {
  const seen = new Set();

  items.forEach((item) => {
    const value = item?.[key];
    if (!value) {
      throw new Error(`В ${label} найден элемент без поля ${key}`);
    }

    if (seen.has(value)) {
      throw new Error(`В ${label} найден дубликат ${key}: ${value}`);
    }

    seen.add(value);
  });
}

function ensureUniqueComposite(items, keys, label) {
  const seen = new Set();

  items.forEach((item) => {
    const signature = keys.map((key) => item?.[key]).join('::');
    if (signature.includes('undefined') || signature.includes('null')) {
      throw new Error(`В ${label} найден элемент без одного из полей ${keys.join(', ')}`);
    }

    if (seen.has(signature)) {
      throw new Error(`В ${label} найден дубликат ${signature}`);
    }

    seen.add(signature);
  });
}

function ensureRelations(messages, recipients, attachments) {
  const messageIds = new Set(messages.map((item) => item.id));

  recipients.forEach((item) => {
    if (!messageIds.has(item.message_id)) {
      throw new Error(`Для получателя ${item.id} не найдено сообщение ${item.message_id}`);
    }
  });

  attachments.forEach((item) => {
    if (!messageIds.has(item.message_id)) {
      throw new Error(`Для вложения ${item.id} не найдено сообщение ${item.message_id}`);
    }
  });
}

function toJson(value, fallback = {}) {
  return JSON.stringify(value && typeof value === 'object' ? value : fallback);
}

function toTextArray(value, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return items.length ? items : fallback;
}

async function upsertBroadcastMessages(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO broadcast_messages (
         id,
         author_id,
         title,
         content,
         content_html,
         message_type,
         priority,
         channels,
         recipient_type,
         recipient_filter,
         status,
         scheduled_at,
         sent_at,
         total_recipients,
         sent_count,
         delivered_count,
         failed_count,
         read_count,
         metadata,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::text[], $9, $10::jsonb, $11, $12::timestamptz,
         $13::timestamptz, $14, $15, $16, $17, $18, $19::jsonb, $20::timestamptz, $21::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET author_id = EXCLUDED.author_id,
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           content_html = EXCLUDED.content_html,
           message_type = EXCLUDED.message_type,
           priority = EXCLUDED.priority,
           channels = EXCLUDED.channels,
           recipient_type = EXCLUDED.recipient_type,
           recipient_filter = EXCLUDED.recipient_filter,
           status = EXCLUDED.status,
           scheduled_at = EXCLUDED.scheduled_at,
           sent_at = EXCLUDED.sent_at,
           total_recipients = EXCLUDED.total_recipients,
           sent_count = EXCLUDED.sent_count,
           delivered_count = EXCLUDED.delivered_count,
           failed_count = EXCLUDED.failed_count,
           read_count = EXCLUDED.read_count,
           metadata = EXCLUDED.metadata,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.author_id,
        String(item.title || ''),
        String(item.content || ''),
        item.content_html || null,
        String(item.message_type || 'news'),
        String(item.priority || 'medium'),
        toTextArray(item.channels, ['telegram', 'email']),
        String(item.recipient_type || 'all'),
        toJson(item.recipient_filter),
        String(item.status || 'draft'),
        item.scheduled_at || null,
        item.sent_at || null,
        Number(item.total_recipients || 0),
        Number(item.sent_count || 0),
        Number(item.delivered_count || 0),
        Number(item.failed_count || 0),
        Number(item.read_count || 0),
        toJson(item.metadata),
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertMessageRecipients(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO message_recipients (
         id,
         message_id,
         user_id,
         channel,
         contact_info,
         delivery_status,
         sent_at,
         delivered_at,
         read_at,
         error_message,
         retry_count,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz,
         $10, $11, $12::timestamptz, $13::timestamptz
       )
       ON CONFLICT (message_id, user_id, channel) DO UPDATE
       SET id = EXCLUDED.id,
           contact_info = EXCLUDED.contact_info,
           delivery_status = EXCLUDED.delivery_status,
           sent_at = EXCLUDED.sent_at,
           delivered_at = EXCLUDED.delivered_at,
           read_at = EXCLUDED.read_at,
           error_message = EXCLUDED.error_message,
           retry_count = EXCLUDED.retry_count,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.message_id,
        item.user_id,
        String(item.channel || ''),
        item.contact_info || null,
        String(item.delivery_status || 'pending'),
        item.sent_at || null,
        item.delivered_at || null,
        item.read_at || null,
        item.error_message || null,
        Number(item.retry_count || 0),
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertMessageTemplates(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO message_templates (
         id,
         author_id,
         name,
         description,
         title_template,
         content_template,
         message_type,
         category,
         variables,
         default_priority,
         default_channels,
         default_recipient_type,
         is_active,
         usage_count,
         last_used_at,
         created_at,
         updated_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::text[], $12, $13, $14,
         $15::timestamptz, $16::timestamptz, $17::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET author_id = EXCLUDED.author_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           title_template = EXCLUDED.title_template,
           content_template = EXCLUDED.content_template,
           message_type = EXCLUDED.message_type,
           category = EXCLUDED.category,
           variables = EXCLUDED.variables,
           default_priority = EXCLUDED.default_priority,
           default_channels = EXCLUDED.default_channels,
           default_recipient_type = EXCLUDED.default_recipient_type,
           is_active = EXCLUDED.is_active,
           usage_count = EXCLUDED.usage_count,
           last_used_at = EXCLUDED.last_used_at,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at`,
      [
        item.id,
        item.author_id,
        String(item.name || ''),
        String(item.description || ''),
        String(item.title_template || ''),
        String(item.content_template || ''),
        String(item.message_type || 'news'),
        item.category || null,
        toJson(item.variables),
        String(item.default_priority || 'medium'),
        toTextArray(item.default_channels, ['telegram', 'email']),
        String(item.default_recipient_type || 'all'),
        item.is_active !== false,
        Number(item.usage_count || 0),
        item.last_used_at || null,
        item.created_at,
        item.updated_at || item.created_at,
      ]
    );
  }
}

async function upsertMessageAttachments(client, items) {
  for (const item of items) {
    await client.query(
      `INSERT INTO message_attachments (
         id,
         message_id,
         file_name,
         file_type,
         file_size,
         file_url,
         created_at
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6, $7::timestamptz
       )
       ON CONFLICT (id) DO UPDATE
       SET message_id = EXCLUDED.message_id,
           file_name = EXCLUDED.file_name,
           file_type = EXCLUDED.file_type,
           file_size = EXCLUDED.file_size,
           file_url = EXCLUDED.file_url,
           created_at = EXCLUDED.created_at`,
      [
        item.id,
        item.message_id,
        String(item.file_name || ''),
        item.file_type || null,
        item.file_size || null,
        String(item.file_url || ''),
        item.created_at,
      ]
    );
  }
}

async function getCounts(client) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM broadcast_messages) AS broadcast_messages,
       (SELECT COUNT(*)::int FROM message_recipients) AS message_recipients,
       (SELECT COUNT(*)::int FROM message_templates) AS message_templates,
       (SELECT COUNT(*)::int FROM message_attachments) AS message_attachments`
  );

  return rows[0];
}

async function main() {
  const input = readJson(inputPath);
  const broadcastMessages = Array.isArray(input.broadcastMessages) ? input.broadcastMessages : [];
  const messageRecipients = Array.isArray(input.messageRecipients) ? input.messageRecipients : [];
  const messageTemplates = Array.isArray(input.messageTemplates) ? input.messageTemplates : [];
  const messageAttachments = Array.isArray(input.messageAttachments) ? input.messageAttachments : [];

  ensureUniqueIds(broadcastMessages, 'id', 'broadcastMessages');
  ensureUniqueIds(messageRecipients, 'id', 'messageRecipients');
  ensureUniqueIds(messageTemplates, 'id', 'messageTemplates');
  ensureUniqueIds(messageAttachments, 'id', 'messageAttachments');
  ensureUniqueComposite(messageRecipients, ['message_id', 'user_id', 'channel'], 'messageRecipients');
  ensureRelations(broadcastMessages, messageRecipients, messageAttachments);

  const pool = postgres.getPool();
  if (!pool) {
    throw new Error('DATABASE_URL не задан, загрузка в PostgreSQL невозможна');
  }

  const result = await postgres.withTransaction(async (client) => {
    if (reset) {
      await client.query('DELETE FROM message_attachments');
      await client.query('DELETE FROM message_recipients');
      await client.query('DELETE FROM message_templates');
      await client.query('DELETE FROM broadcast_messages');
    }

    await upsertBroadcastMessages(client, broadcastMessages);
    await upsertMessageRecipients(client, messageRecipients);
    await upsertMessageTemplates(client, messageTemplates);
    await upsertMessageAttachments(client, messageAttachments);

    return getCounts(client);
  });

  console.log(`Загружено сообщений: ${broadcastMessages.length}`);
  console.log(`Загружено получателей: ${messageRecipients.length}`);
  console.log(`Загружено шаблонов: ${messageTemplates.length}`);
  console.log(`Загружено вложений: ${messageAttachments.length}`);
  console.log(
    `Состояние БД: broadcast_messages=${result.broadcast_messages}, message_recipients=${result.message_recipients}, message_templates=${result.message_templates}, message_attachments=${result.message_attachments}`
  );
  console.log(`Режим загрузки: ${reset ? 'reset + upsert' : 'upsert'}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgres.closePool();
  });
