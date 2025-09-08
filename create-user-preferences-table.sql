-- Создание таблицы для хранения пользовательских предпочтений
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальный индекс для связки пользователь + ключ настройки
    UNIQUE(user_id, preference_key)
);

-- Индекс для быстрого поиска настроек пользователя
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
ON user_preferences(user_id);

-- Индекс для поиска по ключу
CREATE INDEX IF NOT EXISTS idx_user_preferences_key 
ON user_preferences(preference_key);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Политики RLS (Row Level Security)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои настройки
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут обновлять только свои настройки
CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Пользователи могут создавать только свои настройки
CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять только свои настройки
CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Добавим комментарии
COMMENT ON TABLE user_preferences IS 'Пользовательские предпочтения и настройки';
COMMENT ON COLUMN user_preferences.preference_key IS 'Ключ настройки (например: selected_network, selected_trading_point)';
COMMENT ON COLUMN user_preferences.preference_value IS 'Значение настройки в формате JSON или строки';

-- Примеры вставки данных для тестирования
-- INSERT INTO user_preferences (user_id, preference_key, preference_value) 
-- VALUES 
--     ('user-uuid-here', 'selected_network', '15'),
--     ('user-uuid-here', 'selected_trading_point', 'all');