require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'auth-export.json');

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

  const [users, roles, userRoles] = await Promise.all([
    fetchAllRows(supabase, 'users', 'created_at'),
    fetchAllRows(supabase, 'roles', 'id'),
    fetchAllRows(supabase, 'user_roles', 'id'),
  ]);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    counts: {
      users: users.length,
      roles: roles.length,
      user_roles: userRoles.length,
    },
    users,
    roles,
    user_roles: userRoles,
  }, null, 2));

  console.log(`Экспортировано users: ${users.length}`);
  console.log(`Экспортировано roles: ${roles.length}`);
  console.log(`Экспортировано user_roles: ${userRoles.length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
