/**
 * Создание резервуаров через существующий сервис
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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
  },
  {
    name: 'Резервуар №3 (ДТ)',
    fuelType: 'ДТ',
    currentLevelLiters: 12800,
    capacityLiters: 15000,
    minLevelPercent: 20,
    criticalLevelPercent: 15,
    temperature: 16.2,
    waterLevelMm: 3,
    density: 0.840,
    status: 'active',
    location: 'Основная площадка',
    installationDate: '2021-05-20',
    lastCalibration: '2024-07-10',
    supplier: 'НефтеГазСервис',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'АИ-95',
    currentLevelLiters: 22000,
    capacityLiters: 30000,
    minLevelPercent: 15,
    criticalLevelPercent: 10,
    temperature: 19.1,
    waterLevelMm: 1,
    density: 0.758,
    status: 'active',
    location: 'Северный участок',
    installationDate: '2020-11-10',
    lastCalibration: '2024-06-20',
    supplier: 'Роснефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'ДТ',
    currentLevelLiters: 8500,
    capacityLiters: 12000,
    minLevelPercent: 20,
    criticalLevelPercent: 15,
    temperature: 15.8,
    waterLevelMm: 4,
    density: 0.835,
    status: 'active',
    location: 'Северный участок',
    installationDate: '2020-11-10',
    lastCalibration: '2024-06-20',
    supplier: 'Роснефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'АИ-92',
    currentLevelLiters: 14500,
    capacityLiters: 18000,
    minLevelPercent: 15,
    criticalLevelPercent: 10,
    temperature: 20.3,
    waterLevelMm: 2,
    density: 0.742,
    status: 'active',
    location: 'Южная площадка',
    installationDate: '2022-01-25',
    lastCalibration: '2024-09-01',
    supplier: 'Газпром нефть',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'ДТ',
    currentLevelLiters: 35000,
    capacityLiters: 50000,
    minLevelPercent: 20,
    criticalLevelPercent: 15,
    temperature: 14.7,
    waterLevelMm: 5,
    density: 0.845,
    status: 'active',
    location: 'Промышленная зона',
    installationDate: '2019-08-12',
    lastCalibration: '2024-05-15',
    supplier: 'ЛУКОЙЛ',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' },
      { name: 'Давление', status: 'ok' }
    ],
    linkedPumps: [
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
    fuelType: 'АИ-95',
    currentLevelLiters: 28000,
    capacityLiters: 35000,
    minLevelPercent: 15,
    criticalLevelPercent: 10,
    temperature: 16.9,
    waterLevelMm: 3,
    density: 0.750,
    status: 'active',
    location: 'Промышленная зона',
    installationDate: '2019-08-12',
    lastCalibration: '2024-05-15',
    supplier: 'ЛУКОЙЛ',
    sensors: [
      { name: 'Уровень', status: 'ok' },
      { name: 'Температура', status: 'ok' },
      { name: 'Давление', status: 'ok' }
    ],
    linkedPumps: [
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

// Маппинг данных в формат Supabase  
const mapToSupabase = (data) => ({
  name: data.name,
  fuel_type: data.fuelType,
  current_level_liters: data.currentLevelLiters,
  capacity_liters: data.capacityLiters,
  min_level_percent: data.minLevelPercent,
  critical_level_percent: data.criticalLevelPercent,
  temperature: data.temperature,
  water_level_mm: data.waterLevelMm,
  density: data.density,
  is_active: data.status === 'active',
  location: data.location,
  installation_date: data.installationDate,
  last_calibration: data.lastCalibration,
  supplier: data.supplier,
  sensors: data.sensors,
  linked_pumps: data.linkedPumps,
  notifications: data.notifications,
  thresholds: data.thresholds,
  trading_point_id: data.trading_point_id,
  updated_at: new Date().toISOString()
});

async function createAllTanks() {
  console.log('🚀 Creating tanks via Supabase client...');
  
  for (const tank of tanksData) {
    try {
      const supabaseData = mapToSupabase(tank);
      console.log('➕ Creating tank:', tank.name);
      
      const { data, error } = await supabase
        .from('tanks')
        .insert([supabaseData])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creating tank:', tank.name, error);
        throw error;
      }

      console.log('✅ Tank created:', data.name);
      
      // Small delay between insertions
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error('Error creating tank:', tank.name, error.message);
    }
  }
  
  console.log('🎉 All tanks creation process completed');
}

createAllTanks().catch(console.error);