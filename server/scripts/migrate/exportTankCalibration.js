require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const outputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', '..', 'tmp', 'migration', 'tank-calibration-export.json');

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

  const { data, error } = await supabase
    .from('tank_calibration_settings')
    .select('*')
    .order('tank_id');

  if (error) {
    throw new Error(`Ошибка выгрузки tank_calibration_settings: ${error.message}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    count: (data || []).length,
    tankCalibrationSettings: data || [],
  }, null, 2));

  console.log(`Экспортировано настроек калибровки: ${(data || []).length}`);
  console.log(`Файл: ${outputPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
