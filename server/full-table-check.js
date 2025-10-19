const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ssvazdgnmatbdynkhkqo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function getTableColumns(tableName) {
  console.log(`\n=== ${tableName.toUpperCase()} ===`);

  // Try to get any existing row to see structure
  const { data: existing, error: selectError } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  if (!selectError && existing && existing.length > 0) {
    const columns = Object.keys(existing[0]).sort();
    console.log('Columns (from existing data):', columns.join(', '));
    return columns;
  }

  // If no data, try insert with minimal data to see required columns
  const testData = { __test: true };
  const { data, error } = await supabase
    .from(tableName)
    .insert(testData)
    .select();

  if (error) {
    // Parse error message to extract column names
    const match = error.message.match(/column "([^"]+)"/);
    if (match) {
      console.log(`Required column found: "${match[1]}"`);
      console.log('Full error:', error.message);
      console.log('Error details:', JSON.stringify(error.details || '').substring(0, 300));

      // Extract all column names from details
      const detailsMatch = error.details?.match(/\(([^)]+)\)/);
      if (detailsMatch) {
        const cols = detailsMatch[1].split(',').map(c => c.trim());
        console.log('All columns:', cols.join(', '));
        return cols;
      }
    }
  }

  return [];
}

(async () => {
  const tables = [
    'user_notification_settings',
    'user_notification_subscriptions',
    'notification_rules',
    'notifications'
  ];

  const structures = {};

  for (const table of tables) {
    try {
      structures[table] = await getTableColumns(table);
    } catch (err) {
      console.log(`Error checking ${table}:`, err.message);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  for (const [table, cols] of Object.entries(structures)) {
    console.log(`\n${table}:`);
    console.log(`  Columns: ${cols.join(', ')}`);
  }

  process.exit(0);
})();
