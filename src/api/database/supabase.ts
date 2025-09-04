/**
 * Supabase Database Client
 * Для АГЕНТА 1: Инфраструктура
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      networks: {
        Row: {
          id: string;
          name: string;
          code: string;
          description?: string;
          status: 'active' | 'inactive' | 'maintenance';
          settings: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string;
          status?: 'active' | 'inactive' | 'maintenance';
          settings?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string;
          status?: 'active' | 'inactive' | 'maintenance';
          settings?: Record<string, any>;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          password_hash: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          status: 'active' | 'inactive' | 'suspended' | 'deleted';
          email_verified: boolean;
          last_login?: string;
          settings: Record<string, any>;
          metadata: Record<string, any>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          password_hash: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          status?: 'active' | 'inactive' | 'suspended' | 'deleted';
          email_verified?: boolean;
          last_login?: string;
          settings?: Record<string, any>;
          metadata?: Record<string, any>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          username?: string;
          password_hash?: string;
          first_name?: string;
          last_name?: string;
          phone?: string;
          status?: 'active' | 'inactive' | 'suspended' | 'deleted';
          email_verified?: boolean;
          last_login?: string;
          settings?: Record<string, any>;
          metadata?: Record<string, any>;
          updated_at?: string;
        };
      };
      fuel_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          category: 'gasoline' | 'diesel' | 'gas' | 'other';
          octane_number?: number;
          density?: number;
          unit: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          category: 'gasoline' | 'diesel' | 'gas' | 'other';
          octane_number?: number;
          density?: number;
          unit?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          code?: string;
          category?: 'gasoline' | 'diesel' | 'gas' | 'other';
          octane_number?: number;
          density?: number;
          unit?: string;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}

// Конфигурация подключения
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://tohtryzyffcebtyvkxwh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaHRyeXp5ZmZjZWJ0eXZreHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NzU0NDgsImV4cCI6MjA3MjQ1MTQ0OH0.NMpuTp08vLuxhRLxbI9lOAo6JI22-8eDcMRylE3MoqI';

// Создание клиента
export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true, // Включаем сохранение сессии для клиентской части
    },
    db: {
      schema: 'public',
    }
  }
);

/**
 * Проверка подключения к базе данных
 */
export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('networks')
      .select('count')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        message: 'Database connection failed',
        details: error
      };
    }
    
    return {
      success: true,
      message: 'Database connection successful',
      details: data
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection error',
      details: error
    };
  }
}

/**
 * Установка контекста пользователя для RLS
 */
export async function setUserContext(userId: string) {
  try {
    await supabase.rpc('set_current_user_id', { user_id: userId });
  } catch (error) {
    console.warn('Failed to set user context for RLS:', error);
  }
}

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

/**
 * Выполнение транзакции
 */
export async function executeTransaction<T>(
  operations: ((client: SupabaseClient<Database>) => Promise<T>)[]
): Promise<T[]> {
  const results: T[] = [];
  
  for (const operation of operations) {
    const result = await operation(supabase);
    results.push(result);
  }
  
  return results;
}

/**
 * Создание пагинированного запроса
 */
export function createPaginatedQuery<T>(
  baseQuery: any,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;
  return baseQuery.range(offset, offset + limit - 1);
}

/**
 * Типы ошибок базы данных
 */
export const DatabaseErrorCodes = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
} as const;

/**
 * Обработчик ошибок базы данных
 */
export function handleDatabaseError(error: any): {
  message: string;
  code: string;
  details?: any;
} {
  if (!error) {
    return {
      message: 'Unknown database error',
      code: 'UNKNOWN_ERROR'
    };
  }
  
  // Обработка специфичных ошибок PostgreSQL
  switch (error.code) {
    case DatabaseErrorCodes.UNIQUE_VIOLATION:
      return {
        message: 'Record with this value already exists',
        code: 'DUPLICATE_RECORD',
        details: error.details
      };
    
    case DatabaseErrorCodes.FOREIGN_KEY_VIOLATION:
      return {
        message: 'Referenced record does not exist',
        code: 'INVALID_REFERENCE',
        details: error.details
      };
    
    case DatabaseErrorCodes.NOT_NULL_VIOLATION:
      return {
        message: 'Required field is missing',
        code: 'MISSING_FIELD',
        details: error.details
      };
    
    default:
      return {
        message: error.message || 'Database operation failed',
        code: error.code || 'DATABASE_ERROR',
        details: error.details
      };
  }
}