const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
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
