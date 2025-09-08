/**
 * Command Templates Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с commandTemplatesSupabase
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './commandTemplatesSupabase';

// Для обратной совместимости экспортируем основной сервис как commandTemplatesService
import { commandTemplatesSupabaseService } from './commandTemplatesSupabase';
export const commandTemplatesService = commandTemplatesSupabaseService;