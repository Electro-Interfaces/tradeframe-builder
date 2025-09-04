-- Скрипт для отключения Row Level Security для всех таблиц
-- Выполните этот код в SQL Editor в админке Supabase

-- Основные таблицы проекта
ALTER TABLE "public"."networks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_document_acceptances" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fuel_types" DISABLE ROW LEVEL SECURITY;

-- Дополнительные таблицы (если существуют)
ALTER TABLE "public"."points" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."equipment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tanks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."prices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."operations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shift_reports" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."nomenclature" DISABLE ROW LEVEL SECURITY;

-- Дополнительные таблицы для системы управления
ALTER TABLE "public"."roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."permissions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_log" DISABLE ROW LEVEL SECURITY;

-- Проверяем результат
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;