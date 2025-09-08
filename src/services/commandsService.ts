/**
 * Commands Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с commandTemplatesSupabase
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './commandTemplatesSupabase';

// Для обратной совместимости экспортируем основной сервис как commandsService
import { commandTemplatesSupabaseService } from './commandTemplatesSupabase';
export const commandsService = commandTemplatesSupabaseService;

// Экспортируем также как commandsAPI для обратной совместимости
export const commandsAPI = commandTemplatesSupabaseService;