require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'messaging-export.json');

function isMissingTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42P01' || message.includes('does not exist') || message.includes('не существует');
}

async function fetchAllRows(supabase, table, orderColumn, options = {}) {
  const pageSize = 1000;
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn)
      .range(from, from + pageSize - 1);

    if (error) {
      if (options.allowMissing && isMissingTableError(error)) {
        return [];
      }

      throw new Error(`Ошибка выгрузки ${table}: ${error.message}`);
    }

    if (!data?.length) {
      break;
    }

    rows.push(...data);
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL или SUPABASE_SERVICE_KEY не заданы');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const [
    broadcastMessages,
    messageRecipients,
    messageTemplates,
    messageAttachments,
  ] = await Promise.all([
    fetchAllRows(supabase, 'broadcast_messages', 'created_at'),
    fetchAllRows(supabase, 'message_recipients', 'created_at'),
    fetchAllRows(supabase, 'message_templates', 'created_at', { allowMissing: true }),
    fetchAllRows(supabase, 'message_attachments', 'created_at', { allowMissing: true }),
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    counts: {
      broadcast_messages: broadcastMessages.length,
      message_recipients: messageRecipients.length,
      message_templates: messageTemplates.length,
      message_attachments: messageAttachments.length,
    },
    broadcastMessages,
    messageRecipients,
    messageTemplates,
    messageAttachments,
  }, null, 2));

  console.log(`Экспортировано сообщений: ${broadcastMessages.length}`);
  console.log(`Экспортировано получателей: ${messageRecipients.length}`);
  console.log(`Экспортировано шаблонов: ${messageTemplates.length}`);
  console.log(`Экспортировано вложений: ${messageAttachments.length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
