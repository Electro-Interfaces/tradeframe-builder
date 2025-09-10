/**
 * Supabase Service Role Client (только для админских операций)
 * Использует service role key для полного доступа к данным
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ssvazdgnmatbdynkhkqo.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

console.log('🔧 Supabase Service Client Configuration:');
console.log('URL:', supabaseUrl);
console.log('Service key configured:', serviceRoleKey.substring(0, 50) + '...');

// Создание service role клиента для админских операций
export const supabaseService: SupabaseClient = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Тест подключения с service role
export const testServiceConnection = async () => {
  try {
    const { data, error, count } = await supabaseService
      .from('networks')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
    
    return {
      success: true,
      message: 'Service role connection successful',
      data: { count }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};

// Автотест при загрузке
testServiceConnection().then(result => {
  console.log('🧪 Service connection test:', result);
});

export default supabaseService;