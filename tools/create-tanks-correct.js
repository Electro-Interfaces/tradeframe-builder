import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const tanksData = [
  {
    name: 'Резервуар №1 (АИ-95)',
    fuel_type_id: 'АИ-95',
    capacity: 25000.000,
    current_volume: 18500.000,
    min_volume: 15,
    max_volume: 25000.000,
    status: 'active',
    metadata: {
      temperature: 18.5,
      waterLevelMm: 2,
      density: 0.755,
      location: 'Основная площадка',
      supplier: 'ТехНефть',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 1, name: 'Колонка №1' },
        { id: 2, name: 'Колонка №2' }
      ]
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №2 (АИ-92)',
    fuel_type_id: 'АИ-92',
    capacity: 20000.000,
    current_volume: 15200.000,
    min_volume: 15,
    max_volume: 20000.000,
    status: 'active',
    metadata: {
      temperature: 17.8,
      waterLevelMm: 1,
      density: 0.745,
      location: 'Основная площадка',
      supplier: 'ТехНефть',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 3, name: 'Колонка №3' }
      ]
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №3 (ДТ)',
    fuel_type_id: 'ДТ',
    capacity: 15000.000,
    current_volume: 12800.000,
    min_volume: 20,
    max_volume: 15000.000,
    status: 'active',
    metadata: {
      temperature: 16.2,
      waterLevelMm: 3,
      density: 0.840,
      location: 'Основная площадка',
      supplier: 'НефтеГазСервис',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 4, name: 'Дизельная колонка №1' }
      ]
    },
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51'
  },
  {
    name: 'Резервуар №4 (АИ-95)',
    fuel_type_id: 'АИ-95',
    capacity: 30000.000,
    current_volume: 22000.000,
    min_volume: 15,
    max_volume: 30000.000,
    status: 'active',
    metadata: {
      temperature: 19.1,
      waterLevelMm: 1,
      density: 0.758,
      location: 'Северный участок',
      supplier: 'Роснефть',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 5, name: 'Колонка №5' },
        { id: 6, name: 'Колонка №6' }
      ]
    },
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65'
  },
  {
    name: 'Резервуар №5 (ДТ)',
    fuel_type_id: 'ДТ',
    capacity: 12000.000,
    current_volume: 8500.000,
    min_volume: 20,
    max_volume: 12000.000,
    status: 'active',
    metadata: {
      temperature: 15.8,
      waterLevelMm: 4,
      density: 0.835,
      location: 'Северный участок',
      supplier: 'Роснефть',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 7, name: 'Дизельная колонка №2' }
      ]
    },
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65'
  },
  {
    name: 'Резервуар №6 (АИ-92)',
    fuel_type_id: 'АИ-92',
    capacity: 18000.000,
    current_volume: 14500.000,
    min_volume: 15,
    max_volume: 18000.000,
    status: 'active',
    metadata: {
      temperature: 20.3,
      waterLevelMm: 2,
      density: 0.742,
      location: 'Южная площадка',
      supplier: 'Газпром нефть',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' }
      ],
      linkedPumps: [
        { id: 8, name: 'Колонка №7' }
      ]
    },
    trading_point_id: 'f2566905-c748-4240-ac31-47b626ab625d'
  },
  {
    name: 'Резервуар №7 (ДТ)',
    fuel_type_id: 'ДТ',
    capacity: 50000.000,
    current_volume: 35000.000,
    min_volume: 20,
    max_volume: 50000.000,
    status: 'active',
    metadata: {
      temperature: 14.7,
      waterLevelMm: 5,
      density: 0.845,
      location: 'Промышленная зона',
      supplier: 'ЛУКОЙЛ',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' },
        { name: 'Давление', status: 'ok' }
      ],
      linkedPumps: [
        { id: 9, name: 'Промышленная колонка №1' },
        { id: 10, name: 'Промышленная колонка №2' }
      ]
    },
    trading_point_id: 'f7963207-2732-4fae-988e-c73eef7645ca'
  },
  {
    name: 'Резервуар №8 (АИ-95)',
    fuel_type_id: 'АИ-95',
    capacity: 35000.000,
    current_volume: 28000.000,
    min_volume: 15,
    max_volume: 35000.000,
    status: 'active',
    metadata: {
      temperature: 16.9,
      waterLevelMm: 3,
      density: 0.750,
      location: 'Промышленная зона',
      supplier: 'ЛУКОЙЛ',
      sensors: [
        { name: 'Уровень', status: 'ok' },
        { name: 'Температура', status: 'ok' },
        { name: 'Давление', status: 'ok' }
      ],
      linkedPumps: [
        { id: 11, name: 'Промышленная колонка №3' }
      ]
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
          console.log('✅ Tank created:', tankData.name);
          resolve(result);
        } else {
          console.log('❌ Error creating tank:', res.statusCode, data);
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

async function createAllTanks() {
  console.log('🚀 Creating tanks with correct structure...');
  
  for (const tank of tanksData) {
    try {
      await insertTank(tank);
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
    } catch (error) {
      console.error('Error creating tank:', tank.name, error.message);
    }
  }
  
  console.log('✅ All tanks creation completed');
}

createAllTanks().catch(console.error);