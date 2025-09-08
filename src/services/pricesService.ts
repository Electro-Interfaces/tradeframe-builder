/**
 * Prices Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с pricesSupabaseService
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './pricesSupabaseService';

// Для обратной совместимости экспортируем основной сервис
import { pricesSupabaseService } from './pricesSupabaseService';
export const pricesService = pricesSupabaseService;