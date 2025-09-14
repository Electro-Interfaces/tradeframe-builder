// Test Supabase connection from browser environment
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection with anon key...');
  
  try {
    // Test networks table
    const { data: networks, error: networksError } = await supabase
      .from('networks')
      .select('*')
      .limit(5);
      
    if (networksError) {
      console.error('❌ Networks error:', networksError);
    } else {
      console.log('✅ Networks loaded:', networks.length, 'networks');
      console.log('First network:', networks[0]?.name);
    }
    
    // Test trading points table  
    const { data: points, error: pointsError } = await supabase
      .from('trading_points')
      .select('*')
      .limit(5);
      
    if (pointsError) {
      console.error('❌ Trading points error:', pointsError);
    } else {
      console.log('✅ Trading points loaded:', points.length, 'points');
      console.log('First point:', points[0]?.name);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

testConnection();