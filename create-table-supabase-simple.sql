-- ПРОСТОЕ СОЗДАНИЕ ТАБЛИЦЫ user_preferences
-- Выполните этот SQL в Supabase Dashboard → SQL Editor

-- Создание таблицы
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальное ограничение
    UNIQUE(user_id, preference_key)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON public.user_preferences(preference_key);

-- Комментарии
COMMENT ON TABLE public.user_preferences IS 'Пользовательские предпочтения и настройки';
COMMENT ON COLUMN public.user_preferences.preference_key IS 'Ключ настройки (selected_network, selected_trading_point, etc)';
COMMENT ON COLUMN public.user_preferences.preference_value IS 'Значение настройки';

-- Включаем RLS (Row Level Security)
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Политики RLS (пользователи видят только свои данные)
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Тестовая вставка (удалите после проверки)
-- INSERT INTO public.user_preferences (user_id, preference_key, preference_value) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test_key', 'test_value');

SELECT 'user_preferences table created successfully!' as result;