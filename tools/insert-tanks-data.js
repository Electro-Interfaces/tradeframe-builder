import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const tanksData = [
  {
    name: 'Резервуар №1 (АИ-95)',
    fuel_type: 'АИ-95',
    current_level_liters: 18500,
    capacity_liters: 25000,
    min_level_percent: 15,
    critical_level_percent: 10,
    temperature: 18.5,
    water_level_mm: 2,
    density: 0.755,
    is_active: true,
    location: 'Основная площадка',
    installation_date: '2021-03-15',
    last_calibration: '2024-08-15',
    supplier: 'ТехНефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 1, name: 'Колонка №1' },
      { id: 2, name: 'Колонка №2' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №2 (АИ-92)',
    fuel_type: 'АИ-92',
    current_level_liters: 15200,
    capacity_liters: 20000,
    min_level_percent: 15,
    critical_level_percent: 10,
    temperature: 17.8,
    water_level_mm: 1,
    density: 0.745,
    is_active: true,
    location: 'Основная площадка',
    installation_date: '2021-03-15',
    last_calibration: '2024-08-15',
    supplier: 'ТехНефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 3, name: 'Колонка №3' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №3 (ДТ)',
    fuel_type: 'ДТ',
    current_level_liters: 12800,
    capacity_liters: 15000,
    min_level_percent: 20,
    critical_level_percent: 15,
    temperature: 16.2,
    water_level_mm: 3,
    density: 0.840,
    is_active: true,
    location: 'Основная площадка',
    installation_date: '2021-05-20',
    last_calibration: '2024-07-10',
    supplier: 'НефтеГазСервис',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 4, name: 'Дизельная колонка №1' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №4 (АИ-95)',
    fuel_type: 'АИ-95',
    current_level_liters: 22000,
    capacity_liters: 30000,
    min_level_percent: 15,
    critical_level_percent: 10,
    temperature: 19.1,
    water_level_mm: 1,
    density: 0.758,
    is_active: true,
    location: 'Северный участок',
    installation_date: '2020-11-10',
    last_calibration: '2024-06-20',
    supplier: 'Роснефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 5, name: 'Колонка №5' },
      { id: 6, name: 'Колонка №6' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65'
  },
  {
    name: 'Резервуар №5 (ДТ)',
    fuel_type: 'ДТ',
    current_level_liters: 8500,
    capacity_liters: 12000,
    min_level_percent: 20,
    critical_level_percent: 15,
    temperature: 15.8,
    water_level_mm: 4,
    density: 0.835,
    is_active: true,
    location: 'Северный участок',
    installation_date: '2020-11-10',
    last_calibration: '2024-06-20',
    supplier: 'Роснефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 7, name: 'Дизельная колонка №2' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65'
  },
  {
    name: 'Резервуар №6 (АИ-92)',
    fuel_type: 'АИ-92',
    current_level_liters: 14500,
    capacity_liters: 18000,
    min_level_percent: 15,
    critical_level_percent: 10,
    temperature: 20.3,
    water_level_mm: 2,
    density: 0.742,
    is_active: true,
    location: 'Южная площадка',
    installation_date: '2022-01-25',
    last_calibration: '2024-09-01',
    supplier: 'Газпром нефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linked_pumps: [
      { id: 8, name: 'Колонка №7' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: 'f2566905-c748-4240-ac31-47b626ab625d'
  },
  {
    name: 'Резервуар №7 (ДТ)',
    fuel_type: 'ДТ',
    current_level_liters: 35000,
    capacity_liters: 50000,
    min_level_percent: 20,
    critical_level_percent: 15,
    temperature: 14.7,
    water_level_mm: 5,
    density: 0.845,
    is_active: true,
    location: 'Промышленная зона',
    installation_date: '2019-08-12',
    last_calibration: '2024-05-15',
    supplier: 'ЛУКОЙЛ',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' },
      { name: 'Давление', status: 'ok' }
    ],
    linked_pumps: [
      { id: 9, name: 'Промышленная колонка №1' },
      { id: 10, name: 'Промышленная колонка №2' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: 'f7963207-2732-4fae-988e-c73eef7645ca'
  },
  {
    name: 'Резервуар №8 (АИ-95)',
    fuel_type: 'АИ-95',
    current_level_liters: 28000,
    capacity_liters: 35000,
    min_level_percent: 15,
    critical_level_percent: 10,
    temperature: 16.9,
    water_level_mm: 3,
    density: 0.750,
    is_active: true,
    location: 'Промышленная зона',
    installation_date: '2019-08-12',
    last_calibration: '2024-05-15',
    supplier: 'ЛУКОЙЛ',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' },
      { name: 'Давление', status: 'ok' }
    ],
    linked_pumps: [
      { id: 11, name: 'Промышленная колонка №3' }
    ],
    notifications: {
      enabled: true,
      drainAlerts: true,
      levelAlerts: true
    },
    thresholds: {
      criticalTemp: { min: -10, max: 40 },
      maxWaterLevel: 15,
      notifications: { critical: true, minimum: true, temperature: true, water: true }
    },
    trading_point_id: 'f7963207-2732-4fae-988e-c73eef7645ca'
  }
];

async function insertTank(tankData) {
  return new Promise((resolve, reject) => {
    const requestUrl = `${SUPABASE_URL}/rest/v1/tanks`;
    const postData = JSON.stringify(tankData);
    
    const parsedUrl = url.parse(requestUrl);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const result = JSON.parse(data);
          console.log('✅ Tank inserted:', tankData.name);
          resolve(result);
        } else {
          console.log('❌ Error inserting tank:', res.statusCode, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function insertAllTanks() {
  console.log('🚀 Inserting tanks data...');
  
  for (const tank of tanksData) {
    try {
      await insertTank(tank);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
  
  console.log('✅ All tanks inserted successfully');
}

insertAllTanks().catch(console.error);