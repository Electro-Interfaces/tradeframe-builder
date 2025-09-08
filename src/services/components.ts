/**
 * Components Service - Proxy для Supabase сервиса
 * Обеспечивает обратную совместимость с componentsSupabase
 */

// Экспортируем весь функционал из Supabase сервиса
export * from './componentsSupabase';

// Для обратной совместимости экспортируем основной сервис
import { componentsSupabaseService } from './componentsSupabase';
export const componentsService = componentsSupabaseService;

// Импортируем currentComponentsAPI из apiSwitch для обратной совместимости
export { currentComponentsAPI } from './apiSwitch';