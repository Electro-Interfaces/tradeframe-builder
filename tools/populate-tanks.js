/**
 * Заполнение резервуаров через TypeScript сервис
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { spawn } = require('child_process');
const path = require('path');
const { fileURLToPath } = require('url');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Данные резервуаров для создания
const tanksData = [
  {
    name: 'Резервуар №1 (АИ-95)',
    fuelType: 'АИ-95',
    currentLevelLiters: 18500,
    capacityLiters: 25000,
    minLevelPercent: 15,
    criticalLevelPercent: 10,
    temperature: 18.5,
    waterLevelMm: 2,
    density: 0.755,
    status: 'active',
    location: 'Основная площадка',
    installationDate: '2021-03-15',
    lastCalibration: '2024-08-15',
    supplier: 'ТехНефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'АИ-92',
    currentLevelLiters: 15200,
    capacityLiters: 20000,
    minLevelPercent: 15,
    criticalLevelPercent: 10,
    temperature: 17.8,
    waterLevelMm: 1,
    density: 0.745,
    status: 'active',
    location: 'Основная площадка',
    installationDate: '2021-03-15',
    lastCalibration: '2024-08-15',
    supplier: 'ТехНефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
  }
];

console.log('Начинаю создание резервуаров через TypeScript...');

// Создаем TypeScript скрипт для выполнения  
const tsScript = `
import { supabaseTanksService } from '../src/services/tanksServiceSupabase.js';

const tanksData = ${JSON.stringify(tanksData, null, 2)};

async function createTanks() {
  console.log('🚀 Creating tanks via service...');
  
  for (const tank of tanksData) {
    try {
      console.log('➕ Creating:', tank.name);
      const result = await supabaseTanksService.createTank(tank);
      console.log('✅ Created:', result.name, 'ID:', result.id);
    } catch (error) {
      console.error('❌ Error creating:', tank.name, error.message);
    }
  }
}

createTanks().catch(console.error);
`;

// Записываем временный TypeScript файл
require('fs').writeFileSync(path.join(__dirname, 'temp-create-tanks.mjs'), tsScript);

// Запускаем через Node.js
const child = spawn('node', [path.join(__dirname, 'temp-create-tanks.mjs')], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

child.on('close', (code) => {
  // Удаляем временный файл
  try {
    require('fs').unlinkSync(path.join(__dirname, 'temp-create-tanks.mjs'));
  } catch (e) {}
  
  if (code === 0) {
    console.log('✅ Tanks creation process completed successfully');
  } else {
    console.log('❌ Tanks creation process failed with code:', code);
  }
  process.exit(code);
});

child.on('error', (error) => {
  console.error('Failed to start process:', error);
  process.exit(1);
});