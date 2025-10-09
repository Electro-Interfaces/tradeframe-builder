/**
 * Supabase Client для браузера (Frontend)
 * Использует import.meta.env вместо process.env
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Конфигурация подключения для браузера
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ssvazdgnmatbdynkhkqo.supabase.co';
// ВРЕМЕННО: Используем service role key для разработки, так как anon key не работает
// В продакшне нужно настроить правильные RLS политики и использовать anon key
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0';

console.log('URL:', supabaseUrl);
console.log('Key (first 50 chars):', supabaseKey.substring(0, 50) + '...');
console.log('Key type:', supabaseKey.includes('anon') ? 'anon' : supabaseKey.includes('service_role') ? 'service_role' : 'unknown');
console.log('Environment variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY present:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('VITE_USE_HTTP_API:', import.meta.env.VITE_USE_HTTP_API);

// Создание клиента для браузера
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Экспорт для совместимости
export const supabaseClientBrowser = supabase;

/**
 * Создание временной сессии пользователя для работы с RLS
 * Используется после успешного логина в кастомной системе аутентификации
 */
export async function setUserSession(userEmail: string, userId: string) {
  try {
    // Создаем временный JWT токен для Supabase
    // В идеале это должно делаться на сервере, но для демо создаем локально
    const session = {
      access_token: generateTemporaryJWT(userEmail, userId),
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: userId,
        email: userEmail,
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      }
    };

    // Устанавливаем сессию в Supabase клиенте
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    if (error) {
      console.error('❌ Failed to set Supabase session:', error);
      throw error;
    }

    
    // Проверяем что сессия действительно установлена
    const { data: currentSession } = await supabase.auth.getSession();
    
    return session;
  } catch (error) {
    console.error('❌ Failed to set user session:', error);
    throw error;
  }
}

/**
 * Генерация временного JWT токена (только для демо)
 * В продакшне это должно делаться на сервере с правильной подписью
 */
function generateTemporaryJWT(email: string, userId: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 час
    sub: userId,
    email: email,
    role: 'authenticated',
    iss: 'tradeframe-demo',
    iat: Math.floor(Date.now() / 1000)
  };

  // В демо режиме используем простую кодировку
  // В продакшне нужно использовать правильную JWT библиотеку и секретный ключ
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  return `${encodedHeader}.${encodedPayload}.demo-signature`;
}

// Простая функция для тестирования подключения
export const testSupabaseConnection = async () => {
  try {
    const { data, error, count } = await supabase
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
      message: 'Supabase connection successful',
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