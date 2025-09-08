/**
 * User Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с usersSupabaseService
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './usersSupabaseService';

// Для обратной совместимости экспортируем основной сервис
import { usersSupabaseService } from './usersSupabaseService';
export const userService = usersSupabaseService;