require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'legal-export.json');

async function fetchAllRows(supabase, table, orderColumn) {
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
    documentTypes,
    documentVersions,
    userDocumentAcceptances,
    userLegalStatuses,
  ] = await Promise.all([
    fetchAllRows(supabase, 'document_types', 'code'),
    fetchAllRows(supabase, 'document_versions', 'created_at'),
    fetchAllRows(supabase, 'user_document_acceptances', 'accepted_at'),
    fetchAllRows(supabase, 'user_legal_statuses', 'updated_at'),
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    counts: {
      document_types: documentTypes.length,
      document_versions: documentVersions.length,
      user_document_acceptances: userDocumentAcceptances.length,
      user_legal_statuses: userLegalStatuses.length,
    },
    documentTypes,
    documentVersions,
    userDocumentAcceptances,
    userLegalStatuses,
  }, null, 2));

  console.log(`Экспортировано типов документов: ${documentTypes.length}`);
  console.log(`Экспортировано версий документов: ${documentVersions.length}`);
  console.log(`Экспортировано согласий: ${userDocumentAcceptances.length}`);
  console.log(`Экспортировано статусов пользователей: ${userLegalStatuses.length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
