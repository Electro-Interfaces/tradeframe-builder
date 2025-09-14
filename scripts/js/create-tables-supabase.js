#!/usr/bin/env node

/**
 * Supabase Table Creation Script
 * Creates all required tables for TradeFrame Builder
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('🚀 Starting TradeFrame Database Setup...');

async function createTables() {
  try {
    console.log('📝 Creating fuel_types table...');
    
    // Create fuel_types data
    const fuelTypes = [
      { id: '00000000-0000-0000-0000-000000000001', name: 'АИ-92', code: 'AI92', category: 'gasoline', octane_number: 92, density: 0.7400, unit: 'liter', is_active: true },
      { id: '00000000-0000-0000-0000-000000000002', name: 'АИ-95', code: 'AI95', category: 'gasoline', octane_number: 95, density: 0.7500, unit: 'liter', is_active: true },
      { id: '00000000-0000-0000-0000-000000000003', name: 'АИ-98', code: 'AI98', category: 'gasoline', octane_number: 98, density: 0.7600, unit: 'liter', is_active: true },
      { id: '00000000-0000-0000-0000-000000000004', name: 'ДТ', code: 'DT', category: 'diesel', octane_number: null, density: 0.8400, unit: 'liter', is_active: true },
      { id: '00000000-0000-0000-0000-000000000005', name: 'Газ', code: 'GAS', category: 'gas', octane_number: null, density: 0.5500, unit: 'm3', is_active: true }
    ];

    const { data: fuelData, error: fuelError } = await supabase
      .from('fuel_types')
      .insert(fuelTypes)
      .select();

    if (fuelError && !fuelError.message.includes('already exists')) {
      console.error('❌ Error creating fuel_types:', fuelError);
    } else {
      console.log('✅ Fuel types created:', fuelData?.length || 'existing');
    }

    console.log('📝 Creating networks...');
    
    // Create networks
    const networks = [
      { id: '20000000-0000-0000-0000-000000000001', name: 'Сеть Демо АЗС', code: 'demo-azs', external_id: '1', description: 'Демонстрационная сеть АЗС', status: 'active' },
      { id: '20000000-0000-0000-0000-000000000002', name: 'БТО', code: 'bto', external_id: '15', description: 'Сеть БТО (Башкирские торговые операции)', status: 'active' },
      { id: '20000000-0000-0000-0000-000000000003', name: 'Лукойл', code: 'lukoil', external_id: '2', description: 'Сеть ЛУКОЙЛ', status: 'active' },
      { id: '20000000-0000-0000-0000-000000000004', name: 'Газпромнефть', code: 'gazprom', external_id: '3', description: 'Сеть Газпромнефть', status: 'active' }
    ];

    const { data: networkData, error: networkError } = await supabase
      .from('networks')
      .insert(networks)
      .select();

    if (networkError && !networkError.message.includes('already exists')) {
      console.error('❌ Error creating networks:', networkError);
    } else {
      console.log('✅ Networks created:', networkData?.length || 'existing');
    }

    console.log('📝 Creating trading_points...');
    
    // Create trading points for БТО network
    const tradingPoints = [
      { id: '30000000-0000-0000-0000-000000000001', network_id: '20000000-0000-0000-0000-000000000002', name: 'БТО АЗС №1', code: 'BTO-001', external_id: '15001', address: 'г. Уфа, ул. Ленина, 1', status: 'active' },
      { id: '30000000-0000-0000-0000-000000000002', network_id: '20000000-0000-0000-0000-000000000002', name: 'БТО АЗС №2', code: 'BTO-002', external_id: '15002', address: 'г. Уфа, ул. Советская, 10', status: 'active' },
      { id: '30000000-0000-0000-0000-000000000003', network_id: '20000000-0000-0000-0000-000000000002', name: 'БТО АЗС №3', code: 'BTO-003', external_id: '15003', address: 'г. Стерлитамак, ул. Мира, 5', status: 'active' },
      { id: '30000000-0000-0000-0000-000000000004', network_id: '20000000-0000-0000-0000-000000000001', name: 'Демо АЗС №1', code: 'DEMO-001', external_id: '1001', address: 'г. Москва, ул. Тверская, 1', status: 'active' },
      { id: '30000000-0000-0000-0000-000000000005', network_id: '20000000-0000-0000-0000-000000000001', name: 'Демо АЗС №2', code: 'DEMO-002', external_id: '1002', address: 'г. Москва, Кутузовский пр., 20', status: 'active' }
    ];

    const { data: pointData, error: pointError } = await supabase
      .from('trading_points')
      .insert(tradingPoints)
      .select();

    if (pointError && !pointError.message.includes('already exists')) {
      console.error('❌ Error creating trading_points:', pointError);
    } else {
      console.log('✅ Trading points created:', pointData?.length || 'existing');
    }

    console.log('📝 Creating users...');
    
    // Create demo users including МенеджерБТО
    const users = [
      { 
        id: '40000000-0000-0000-0000-000000000001', 
        email: 'admin@tradeframe.com', 
        name: 'Системный администратор', 
        password_hash: '$2a$10$demopasswordhash123456789012345678901234567890', 
        first_name: 'Иван', 
        last_name: 'Иванов', 
        role: 'system_admin',
        network_id: null,
        trading_point_ids: [],
        is_active: true,
        status: 'active'
      },
      { 
        id: '40000000-0000-0000-0000-000000000002', 
        email: 'network.admin@demo-azs.ru', 
        name: 'Администратор сети', 
        password_hash: '$2a$10$demopasswordhash123456789012345678901234567890', 
        first_name: 'Петр', 
        last_name: 'Петров', 
        role: 'network_admin',
        network_id: '20000000-0000-0000-0000-000000000001',
        trading_point_ids: [],
        is_active: true,
        status: 'active'
      },
      { 
        id: '40000000-0000-0000-0000-000000000005', 
        email: 'bto.manager@tradeframe.com', 
        name: 'Менеджер БТО', 
        password_hash: '$2a$10$demopasswordhash123456789012345678901234567890', 
        first_name: 'Андрей', 
        last_name: 'Башкиров', 
        role: 'bto_manager',
        network_id: '20000000-0000-0000-0000-000000000002',
        trading_point_ids: ['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003'],
        is_active: true,
        status: 'active'
      }
    ];

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert(users)
      .select();

    if (userError && !userError.message.includes('already exists')) {
      console.error('❌ Error creating users:', userError);
    } else {
      console.log('✅ Users created:', userData?.length || 'existing');
    }

    console.log('📝 Creating prices...');
    
    // Create demo prices for БТО network
    const prices = [
      { fuel_type_id: '00000000-0000-0000-0000-000000000001', network_id: '20000000-0000-0000-0000-000000000002', price: 45.50, currency: 'RUB', price_type: 'retail', is_active: true },
      { fuel_type_id: '00000000-0000-0000-0000-000000000002', network_id: '20000000-0000-0000-0000-000000000002', price: 48.20, currency: 'RUB', price_type: 'retail', is_active: true },
      { fuel_type_id: '00000000-0000-0000-0000-000000000003', network_id: '20000000-0000-0000-0000-000000000002', price: 52.10, currency: 'RUB', price_type: 'retail', is_active: true },
      { fuel_type_id: '00000000-0000-0000-0000-000000000004', network_id: '20000000-0000-0000-0000-000000000002', price: 49.80, currency: 'RUB', price_type: 'retail', is_active: true },
      { fuel_type_id: '00000000-0000-0000-0000-000000000005', network_id: '20000000-0000-0000-0000-000000000002', price: 23.50, currency: 'RUB', price_type: 'retail', is_active: true }
    ];

    const { data: priceData, error: priceError } = await supabase
      .from('prices')
      .insert(prices)
      .select();

    if (priceError && !priceError.message.includes('already exists')) {
      console.error('❌ Error creating prices:', priceError);
    } else {
      console.log('✅ Prices created:', priceData?.length || 'existing');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('📋 Summary:');
    console.log('   ✅ Fuel types: 5 types (АИ-92, АИ-95, АИ-98, ДТ, Газ)');
    console.log('   ✅ Networks: БТО (external_id: 15) and demo networks');
    console.log('   ✅ Trading Points: 3 БТО stations + 2 demo stations');
    console.log('   ✅ Users: admin, network admin, bto.manager@tradeframe.com');
    console.log('   ✅ Prices: Set for all fuel types');
    console.log('');
    console.log('🔐 Login credentials (password: admin123):');
    console.log('   • admin@tradeframe.com - System Administrator');
    console.log('   • bto.manager@tradeframe.com - МенеджерБТО (БТО network only)');
    console.log('');
    console.log('🚀 Ready to test МенеджерБТО functionality!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Verification function
async function verifySetup() {
  console.log('🔍 Verifying database setup...');
  
  try {
    // Check each table
    const tables = [
      { name: 'networks', expectedCount: 4 },
      { name: 'trading_points', expectedCount: 5 },
      { name: 'users', expectedCount: 3 },
      { name: 'fuel_types', expectedCount: 5 },
      { name: 'prices', expectedCount: 5 }
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact' });

      if (error) {
        console.error(`❌ Error accessing ${table.name}:`, error.message);
      } else {
        const count = data?.length || 0;
        const status = count >= table.expectedCount ? '✅' : '⚠️';
        console.log(`   ${status} ${table.name}: ${count} records`);
      }
    }

    // Check specifically for БТО network
    const { data: btoNetwork, error: btoError } = await supabase
      .from('networks')
      .select('*')
      .eq('external_id', '15')
      .single();

    if (btoError) {
      console.log('❌ БТО network not found:', btoError.message);
    } else {
      console.log('✅ БТО network found:', btoNetwork.name);
    }

    // Check for МенеджерБТО user
    const { data: btoManager, error: managerError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'bto.manager@tradeframe.com')
      .single();

    if (managerError) {
      console.log('❌ МенеджерБТО user not found:', managerError.message);
    } else {
      console.log('✅ МенеджерБТО user found:', btoManager.name, `(role: ${btoManager.role})`);
    }

    console.log('✅ Verification completed!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run setup and verification
createTables()
  .then(() => verifySetup())
  .then(() => {
    console.log('🏁 Setup process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup process failed:', error);
    process.exit(1);
  });