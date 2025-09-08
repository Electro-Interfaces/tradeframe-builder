-- Создание таблицы system_config (ИСПРАВЛЕННАЯ ВЕРСИЯ)
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(config_type);

-- Настройка RLS (Row Level Security)
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS "Allow service role full access" ON system_config;
DROP POLICY IF EXISTS "Allow authenticated users to read" ON system_config;

-- Политика для service_role (полный доступ)
CREATE POLICY "Allow service role full access" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

-- Политика для аутентифицированных пользователей (только чтение)
CREATE POLICY "Allow authenticated users to read" ON system_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Удаляем существующий триггер (если есть) и создаем новый
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE PROCEDURE update_system_config_updated_at();