-- Создание таблицы system_config для хранения конфигурации торговой сети
CREATE TABLE IF NOT EXISTS system_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_active ON system_config(is_active);

-- RLS политики для доступа
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (все пользователи могут читать активные конфигурации)
CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON system_config
  FOR SELECT USING (is_active = true);

-- Политика для записи (все пользователи могут создавать и обновлять)
CREATE POLICY IF NOT EXISTS "Enable insert for all users" ON system_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Enable update for all users" ON system_config
  FOR UPDATE USING (true);

-- Вставка базовой конфигурации торговой сети
INSERT INTO system_config (config_key, config_value, description)
VALUES (
  'trading_network_integration',
  '{
    "enabled": false,
    "baseUrl": "https://pos.autooplata.ru/tms",
    "systemId": "15",
    "defaultStationId": "77",
    "timeout": 30000,
    "authType": "basic",
    "username": "UserApi",
    "password": "lHQfLZHzB3tn",
    "endpoints": {
      "tanks": "/api/get_level_measure",
      "transactions": "/api/get_transactions",
      "auth": "/api/auth",
      "services": "/api/get_services",
      "prices": "/api/get_prices",
      "monitoring": "/api/monitoring"
    },
    "defaultParams": {
      "refreshInterval": 60,
      "maxRecords": 1000
    },
    "retryAttempts": 3,
    "universalMapping": {
      "enabled": false,
      "syncStrategy": "hybrid",
      "conflictResolution": "prefer_internal",
      "mappings": []
    }
  }'::jsonb,
  'Конфигурация интеграции с API торговой сети'
)
ON CONFLICT (config_key) 
DO UPDATE SET 
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Функция для обновления timestamp
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_updated_at();