const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ssvazdgnmatbdynkhkqo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0'
);

async function checkStructure(tableName) {
  console.log(`\n=== ${tableName} ===`);

  const testData = {};
  if (tableName === 'notification_rules') testData.name = 'test';
  if (tableName === 'notifications') testData.message = 'test';

  const { data, error } = await supabase.from(tableName).insert(testData).select();

  if (error) {
    console.log('Error:', error.message);
    console.log('Details:', error.details);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
    await supabase.from(tableName).delete().eq('id', data[0].id);
  }
}

(async () => {
  await checkStructure('user_notification_settings');
  await checkStructure('user_notification_subscriptions');
  await checkStructure('notification_rules');
  await checkStructure('notifications');
  process.exit(0);
})();
