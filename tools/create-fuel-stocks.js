import https from 'https';
import url from 'url';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

// Маппинг типов топлива на ID из базы
const FUEL_TYPE_MAPPING = {
  'АИ-95': '550e8400-e29b-41d4-a716-446655440002',
  'АИ-92': '550e8400-e29b-41d4-a716-446655440001',
  'ДТ': '550e8400-e29b-41d4-a716-446655440004' // ДТ Летнее
};

// Данные резервуаров из предыдущего создания
const tanksData = [
  {
    id: '2eb9c65b-b992-48e9-8869-58bcb3ac73ab',
    name: 'Резервуар №1 (АИ-95)',
    fuelType: 'АИ-95',
    currentVolume: 18500,
    capacity: 25000,
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51',
    metadata: { temperature: 18.5, density: 0.755, location: 'Основная площадка' }
  },
  {
    id: 'de48789d-1bf2-470f-ad79-5fca5c55d29b',
    name: 'Резервуар №2 (АИ-92)',
    fuelType: 'АИ-92',
    currentVolume: 15200,
    capacity: 20000,
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51',
    metadata: { temperature: 17.8, density: 0.745, location: 'Основная площадка' }
  },
  {
    id: '6ec85e9c-8b62-4c9e-bfc4-e7da46907807',
    name: 'Резервуар №3 (ДТ)',
    fuelType: 'ДТ',
    currentVolume: 12800,
    capacity: 15000,
    trading_point_id: '9baf5375-9929-4774-8366-c0609b9f2a51',
    metadata: { temperature: 16.2, density: 0.840, location: 'Основная площадка' }
  },
  {
    id: '91fc3afd-6475-40aa-8698-517967c44481',
    name: 'Резервуар №4 (АИ-95)',
    fuelType: 'АИ-95',
    currentVolume: 22000,
    capacity: 30000,
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65',
    metadata: { temperature: 19.1, density: 0.758, location: 'Северный участок' }
  },
  {
    id: '5186181c-b25c-40ce-9bb8-5360cd43d70f',
    name: 'Резервуар №5 (ДТ)',
    fuelType: 'ДТ',
    currentVolume: 8500,
    capacity: 12000,
    trading_point_id: '9be94f90-84d1-4557-b746-460e13485b65',
    metadata: { temperature: 15.8, density: 0.835, location: 'Северный участок' }
  },
  {
    id: '3d0ef0ca-0c82-49d1-bd98-84916eafa5d1',
    name: 'Резервуар №6 (АИ-92)',
    fuelType: 'АИ-92',
    currentVolume: 14500,
    capacity: 18000,
    trading_point_id: 'f2566905-c748-4240-ac31-47b626ab625d',
    metadata: { temperature: 20.3, density: 0.742, location: 'Южная площадка' }
  },
  {
    id: 'c01faaa9-e71e-4c38-81dc-fbd4f6fc74be',
    name: 'Резервуар №7 (ДТ)',
    fuelType: 'ДТ',
    currentVolume: 35000,
    capacity: 50000,
    trading_point_id: 'f7963207-2732-4fae-988e-c73eef7645ca',
    metadata: { temperature: 14.7, density: 0.845, location: 'Промышленная зона' }
  },
  {
    id: '11da05d0-4fa7-4b39-bdb0-18463c647798',
    name: 'Резервуар №8 (АИ-95)',
    fuelType: 'АИ-95',
    currentVolume: 28000,
    capacity: 35000,
    trading_point_id: 'f7963207-2732-4fae-988e-c73eef7645ca',
    metadata: { temperature: 16.9, density: 0.750, location: 'Промышленная зона' }
  }
];

async function createFuelStock(tankData) {
  return new Promise((resolve, reject) => {
    const fuelStock = {
      trading_point_id: tankData.trading_point_id,
      tank_id: tankData.id,
      fuel_type_id: FUEL_TYPE_MAPPING[tankData.fuelType],
      current_volume: tankData.currentVolume,
      reserved_volume: 0, // available_volume вычисляется автоматически
      metadata: {
        tankName: tankData.name,
        fuelType: tankData.fuelType,
        capacity: tankData.capacity,
        temperature: tankData.metadata.temperature,
        density: tankData.metadata.density,
        location: tankData.metadata.location,
        percentage: Math.round((tankData.currentVolume / tankData.capacity) * 100)
      },
      alerts: []
    };

    const requestUrl = `${SUPABASE_URL}/rest/v1/fuel_stocks`;
    const postData = JSON.stringify(fuelStock);
    
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
          console.log('✅ Fuel stock created for:', tankData.name);
          resolve(JSON.parse(data));
        } else {
          console.log('❌ Error creating fuel stock:', res.statusCode, data);
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

async function createAllFuelStocks() {
  console.log('🚀 Creating fuel stocks from tank data...');
  
  // Пропускаем первый резервуар - он уже создан как тестовый
  for (const tank of tanksData.slice(1)) {
    try {
      await createFuelStock(tank);
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay
    } catch (error) {
      console.error('Error creating fuel stock for tank:', tank.name, error.message);
    }
  }
  
  console.log('✅ All fuel stocks created successfully');
}

createAllFuelStocks().catch(console.error);