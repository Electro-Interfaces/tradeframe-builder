/**
 * Тест загрузки операций из Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.0vwlqKOvzr_-PTKHOGfxl1w5FLqHhvYKmFtNYoGCGfY';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg3NTQ0OCwiZXhwIjoyMDcyNDUxNDQ4fQ.kN6uF9YhJzbzu2ugHRQCyzuNOwawsTDtwelGO0uCjyY';

async function testOperationsLoading() {
  console.log('🧪 Testing operations loading...\n');

  // Тест с anon key (как браузер)
  console.log('1️⃣ Testing with ANON key (browser simulation):');
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data: anonData, error: anonError } = await supabaseAnon
      .from('operations')
      .select('*')
      .limit(5);

    if (anonError) {
      console.log('❌ Anon key error:', anonError.message);
      console.log('📋 Error details:', anonError);
    } else {
      console.log('✅ Anon key success:', anonData?.length || 0, 'operations');
      if (anonData && anonData.length > 0) {
        console.log('📋 Sample operation:', anonData[0]);
      }
    }
  } catch (error) {
    console.log('💥 Anon key exception:', error.message);
  }

  console.log('\n2️⃣ Testing with SERVICE key:');
  const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data: serviceData, error: serviceError } = await supabaseService
      .from('operations')
      .select('*')
      .limit(5);

    if (serviceError) {
      console.log('❌ Service key error:', serviceError.message);
      console.log('📋 Error details:', serviceError);
    } else {
      console.log('✅ Service key success:', serviceData?.length || 0, 'operations');
      if (serviceData && serviceData.length > 0) {
        console.log('📋 Sample operation:', serviceData[0]);
      }
    }
  } catch (error) {
    console.log('💥 Service key exception:', error.message);
  }

  // Проверка RLS политик
  console.log('\n3️⃣ Testing RLS policies:');
  try {
    const { data: rlsData, error: rlsError } = await supabaseAnon
      .from('operations')
      .select('id, operation_type, status, trading_point_name')
      .limit(10);

    if (rlsError) {
      console.log('❌ RLS test failed:', rlsError.message);
      console.log('🔐 This might be an RLS (Row Level Security) issue');
    } else {
      console.log('✅ RLS test passed:', rlsData?.length || 0, 'operations visible');
    }
  } catch (error) {
    console.log('💥 RLS test exception:', error.message);
  }

  // Общий счет
  console.log('\n4️⃣ Testing count:');
  try {
    const { count, error: countError } = await supabaseService
      .from('operations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Count error:', countError.message);
    } else {
      console.log('✅ Total operations in database:', count);
    }
  } catch (error) {
    console.log('💥 Count exception:', error.message);
  }
}

testOperationsLoading().catch(console.error);