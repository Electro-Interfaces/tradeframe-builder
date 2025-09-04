-- ===============================================
-- SQL Schema для шаблонов команд
-- ===============================================

-- Таблица для классических шаблонов команд
CREATE TABLE IF NOT EXISTS command_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'shift_operations', 'pricing', 'reporting', 'maintenance', 
    'backup', 'system', 'fuel_operations', 'equipment_control', 
    'pos_operations', 'security', 'custom'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  is_system BOOLEAN NOT NULL DEFAULT false,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  param_schema JSONB NOT NULL DEFAULT '{}',
  default_params JSONB DEFAULT '{}',
  required_params TEXT[] DEFAULT '{}',
  allowed_targets TEXT[] NOT NULL DEFAULT '{}',
  timeout_ms INTEGER NOT NULL DEFAULT 30000 CHECK (timeout_ms BETWEEN 1000 AND 300000),
  retry_policy JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Таблица для новых шаблонов API команд
CREATE TABLE IF NOT EXISTS api_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scope VARCHAR(50) NOT NULL CHECK (scope IN ('global', 'network', 'trading_point', 'equipment', 'component')),
  mode VARCHAR(20) NOT NULL DEFAULT 'sync' CHECK (mode IN ('sync', 'async', 'batch')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'deprecated', 'draft')),
  http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  url_template VARCHAR(2000) NOT NULL,
  api_schema JSONB NOT NULL DEFAULT '{}',
  default_headers JSONB DEFAULT '{}',
  timeout_ms INTEGER NOT NULL DEFAULT 30000 CHECK (timeout_ms BETWEEN 1000 AND 300000),
  retry_policy JSONB,
  examples JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Таблица для истории выполнения команд
CREATE TABLE IF NOT EXISTS command_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('command', 'api')),
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  parameters JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id),
  network_id UUID REFERENCES networks(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_command_templates_category ON command_templates(category);
CREATE INDEX IF NOT EXISTS idx_command_templates_status ON command_templates(status);
CREATE INDEX IF NOT EXISTS idx_command_templates_is_system ON command_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_command_templates_created_at ON command_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_api_templates_scope ON api_templates(scope);
CREATE INDEX IF NOT EXISTS idx_api_templates_status ON api_templates(status);
CREATE INDEX IF NOT EXISTS idx_api_templates_http_method ON api_templates(http_method);
CREATE INDEX IF NOT EXISTS idx_api_templates_is_system ON api_templates(is_system);
CREATE INDEX IF NOT EXISTS idx_api_templates_created_at ON api_templates(created_at);

CREATE INDEX IF NOT EXISTS idx_command_executions_template_id ON command_executions(template_id);
CREATE INDEX IF NOT EXISTS idx_command_executions_status ON command_executions(status);
CREATE INDEX IF NOT EXISTS idx_command_executions_started_at ON command_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_command_executions_user_id ON command_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_command_executions_network_id ON command_executions(network_id);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_command_templates_updated_at 
    BEFORE UPDATE ON command_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_api_templates_updated_at 
    BEFORE UPDATE ON api_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) для мультитенантности
ALTER TABLE command_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_executions ENABLE ROW LEVEL SECURITY;

-- Политики доступа (примерные, нужно адаптировать под архитектуру)
-- Пользователи могут видеть системные шаблоны и свои пользовательские
CREATE POLICY command_templates_select_policy ON command_templates
  FOR SELECT USING (
    is_system = true OR 
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_code IN ('system_admin', 'network_admin'))
  );

CREATE POLICY api_templates_select_policy ON api_templates
  FOR SELECT USING (
    is_system = true OR 
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role_code IN ('system_admin', 'network_admin'))
  );

-- Комментарии к таблицам для документации
COMMENT ON TABLE command_templates IS 'Шаблоны классических команд для управления оборудованием';
COMMENT ON TABLE api_templates IS 'Шаблоны API команд для интеграции с внешними системами';
COMMENT ON TABLE command_executions IS 'История выполнения команд и их результаты';

COMMENT ON COLUMN command_templates.param_schema IS 'JSON Schema для валидации параметров команды';
COMMENT ON COLUMN command_templates.allowed_targets IS 'Массив допустимых типов целей для команды';
COMMENT ON COLUMN api_templates.api_schema IS 'Описание структуры API запроса/ответа в формате JSON Schema';
COMMENT ON COLUMN api_templates.url_template IS 'Шаблон URL с поддержкой подстановки параметров {param}';
COMMENT ON COLUMN command_executions.result IS 'Результат выполнения команды в формате JSON';