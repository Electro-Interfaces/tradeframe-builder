/**
 * Supabase Service Client — DEPRECATED
 *
 * Проект полностью переведён на PG через backend API.
 * Service role key больше не передаётся во frontend.
 * Этот модуль сохранён как заглушка для обратной совместимости импортов.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// Используем anon key (публичный), НЕ service role key
export const supabaseService: SupabaseClient = createClient(
  supabaseUrl,
  anonKey,
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

export const testServiceConnection = async () => {
  return {
    success: false,
    error: 'Legacy Supabase mode отключён. Используйте backend API.',
  };
};

export default supabaseService;
