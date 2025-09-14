/**
 * Тест operationsService
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

console.log('🧪 Testing operations service flow...\n');

async function testOperationsFlow() {
  const supabase = createClient(supabaseUrl, serviceKey);
  
  try {
    console.log('1️⃣ Direct Supabase call:');
    const { data, error } = await supabase
      .from('operations')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Supabase error:', error.message);
      return;
    }
    
    console.log('✅ Success! Got', data?.length || 0, 'operations from Supabase');
    if (data && data.length > 0) {
      console.log('📋 Sample operation:');
      console.log('  - ID:', data[0].id);
      console.log('  - Type:', data[0].operation_type);
      console.log('  - Status:', data[0].status);
      console.log('  - Trading Point:', data[0].trading_point_name);
      console.log('  - Fuel:', data[0].fuel_type);
      console.log('  - Amount:', data[0].total_cost, '₽');
    }
    
    console.log('\n2️⃣ Count test:');
    const { count, error: countError } = await supabase
      .from('operations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Count error:', countError.message);
    } else {
      console.log('✅ Total operations in database:', count);
    }
    
  } catch (error) {
    console.log('💥 Exception:', error.message);
  }
}

testOperationsFlow().catch(console.error);