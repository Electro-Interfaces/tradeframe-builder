/**
 * Supabase Client для браузера (Frontend)
 * Использует import.meta.env вместо process.env
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Конфигурация подключения для браузера
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI';

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

    console.log('✅ User session set in Supabase client');
    console.log('🔍 Session data:', data);
    console.log('🔍 Generated JWT:', session.access_token);
    
    // Проверяем что сессия действительно установлена
    const { data: currentSession } = await supabase.auth.getSession();
    console.log('🔍 Current session:', currentSession);
    
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
    const { data, error } = await supabase
      .from('networks')
      .select('count(*)')
      .limit(1);
    
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
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
};