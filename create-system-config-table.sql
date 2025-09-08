-- Создание таблицы system_config для хранения системных настроек
-- Замена localStorage на централизованное хранение в БД

-- Создание таблицы
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

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_type ON system_config(config_type);

-- Включение Row Level Security
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Политика для service_role (полный доступ)
CREATE POLICY IF NOT EXISTS "Allow service role full access" ON system_config
    FOR ALL USING (auth.role() = 'service_role');

-- Политика для аутентифицированных пользователей (только чтение)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read" ON system_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE PROCEDURE update_system_config_updated_at();

-- Добавление начальных данных конфигурации
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES 
(
    'database_connections',
    '{
        "currentConnectionId": "supabase-main",
        "availableConnections": [
            {
                "id": "supabase-main",
                "name": "Основная БД Supabase",
                "url": "https://tohtryzyffcebtyvkxwh.supabase.co",
                "type": "supabase",
                "description": "Основная база данных системы управления торговыми точками",
                "isActive": true,
                "isDefault": true,
                "settings": {
                    "timeout": 8000,
                    "retryAttempts": 3,
                    "ssl": true,
                    "schema": "public",
                    "autoApiKey": true
                }
            },
            {
                "id": "mock-data",
                "name": "Демо данные (Mock)",
                "url": "localStorage",
                "type": "mock",
                "description": "Локальные демо-данные для разработки и тестирования",
                "isActive": false,
                "isDefault": false,
                "settings": {
                    "timeout": 1000,
                    "retryAttempts": 3
                }
            }
        ]
    }',
    'database',
    'Конфигурация подключений к базам данных'
) ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES 
(
    'api_settings',
    '{
        "debugMode": false,
        "enableRealTime": true,
        "cacheTimeout": 30000,
        "maxRetries": 3
    }',
    'api',
    'Настройки API и подключений'
) ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES 
(
    'system_settings',
    '{
        "systemName": "TradeFrame",
        "version": "1.0.0",
        "environment": "production",
        "timezone": "Europe/Moscow",
        "language": "ru"
    }',
    'system',
    'Основные системные настройки'
) ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES 
(
    'security_settings',
    '{
        "sessionTimeout": 3600,
        "requireHttps": true,
        "enableCORS": true,
        "allowedOrigins": [
            "http://localhost:3006",
            "https://tohtryzyffcebtyvkxwh.supabase.co"
        ]
    }',
    'security',
    'Настройки безопасности системы'
) ON CONFLICT (config_key) DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- Проверка созданных данных
SELECT 
    config_key, 
    config_type, 
    description, 
    created_at,
    jsonb_pretty(config_value) as formatted_value
FROM system_config 
ORDER BY config_type, config_key;