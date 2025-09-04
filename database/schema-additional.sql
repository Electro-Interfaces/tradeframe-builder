-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ ДЛЯ ПОЛНОЙ МИГРАЦИИ
-- PostgreSQL/Supabase Additional Schema
-- =====================================================

-- =====================================================
-- КОМПОНЕНТЫ ОБОРУДОВАНИЯ
-- =====================================================

CREATE TABLE IF NOT EXISTS component_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    equipment_type_id UUID REFERENCES equipment_types(id),
    component_type VARCHAR(100),
    specifications JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    template_id UUID REFERENCES component_templates(id),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'maintenance')),
    installation_date DATE,
    last_command JSONB,
    last_command_time TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- СМЕННЫЕ ОТЧЕТЫ
-- =====================================================

CREATE TABLE IF NOT EXISTS shift_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_point_id UUID NOT NULL REFERENCES trading_points(id),
    operator_id UUID NOT NULL REFERENCES users(id),
    shift_number VARCHAR(50),
    shift_start TIMESTAMPTZ NOT NULL,
    shift_end TIMESTAMPTZ,
    
    -- Финансовые показатели
    opening_cash DECIMAL(15,2) DEFAULT 0,
    closing_cash DECIMAL(15,2),
    total_sales DECIMAL(15,2) DEFAULT 0,
    cash_sales DECIMAL(15,2) DEFAULT 0,
    card_sales DECIMAL(15,2) DEFAULT 0,
    corporate_sales DECIMAL(15,2) DEFAULT 0,
    fuel_card_sales DECIMAL(15,2) DEFAULT 0,
    
    -- Операционные показатели
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    cancelled_operations INTEGER DEFAULT 0,
    
    -- Топливо
    fuel_sold JSONB DEFAULT '{}', -- {fuel_type_id: volume}
    
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'reconciling', 'approved')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ИСТОРИЯ ОСТАТКОВ ТОПЛИВА
-- =====================================================

CREATE TABLE IF NOT EXISTS fuel_stocks_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
    trading_point_id UUID NOT NULL REFERENCES trading_points(id),
    
    timestamp TIMESTAMPTZ NOT NULL,
    volume DECIMAL(15,2) NOT NULL, -- Объем в литрах
    temperature DECIMAL(5,2), -- Температура в °C
    density DECIMAL(10,4), -- Плотность кг/м³
    height DECIMAL(10,2), -- Уровень в мм
    
    -- Изменения
    volume_change DECIMAL(15,2), -- Изменение с последнего замера
    change_type VARCHAR(50) CHECK (change_type IN ('delivery', 'sale', 'loss', 'correction', 'measurement')),
    change_reason TEXT,
    
    -- Источник данных
    source VARCHAR(50) DEFAULT 'sensor' CHECK (source IN ('sensor', 'manual', 'calculated', 'import')),
    sensor_id VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по времени
CREATE INDEX idx_fuel_stocks_history_timestamp ON fuel_stocks_history(tank_id, timestamp DESC);
CREATE INDEX idx_fuel_stocks_history_trading_point ON fuel_stocks_history(trading_point_id, timestamp DESC);

-- =====================================================
-- СООБЩЕНИЯ И КОММУНИКАЦИИ
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID, -- Для группировки сообщений в беседы
    
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID REFERENCES users(id), -- NULL для групповых
    recipient_type VARCHAR(50) CHECK (recipient_type IN ('user', 'role', 'network', 'trading_point', 'broadcast')),
    recipient_entity_id UUID, -- ID роли/сети/точки
    
    subject VARCHAR(500),
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN ('text', 'html', 'markdown')),
    
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50), -- 'system', 'support', 'notification', 'alert'
    
    attachments JSONB DEFAULT '[]', -- [{filename, url, size, mime_type}]
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT FALSE,
    
    parent_message_id UUID REFERENCES messages(id), -- Для ответов
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица для отслеживания прочтения в групповых сообщениях
CREATE TABLE IF NOT EXISTS message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- =====================================================
-- ПРАВИЛА УВЕДОМЛЕНИЙ
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Условия срабатывания
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'tank_level', 'price_change', 'equipment_error', 
        'operation_failed', 'shift_end', 'custom'
    )),
    trigger_conditions JSONB NOT NULL, -- Специфичные условия для каждого типа
    
    -- Область действия
    scope VARCHAR(50) CHECK (scope IN ('global', 'network', 'trading_point')),
    network_id UUID REFERENCES networks(id),
    trading_point_id UUID REFERENCES trading_points(id),
    
    -- Получатели
    recipients JSONB NOT NULL, -- {users: [], roles: [], emails: []}
    
    -- Настройки доставки
    delivery_channels JSONB DEFAULT '["ui"]', -- ["ui", "email", "sms", "push"]
    message_template TEXT,
    
    -- Расписание и ограничения
    is_active BOOLEAN DEFAULT TRUE,
    schedule JSONB, -- {days: [], hours: [], timezone: ''}
    cooldown_minutes INTEGER DEFAULT 60, -- Минимальный интервал между срабатываниями
    last_triggered_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- История срабатываний уведомлений
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_data JSONB, -- Данные, вызвавшие срабатывание
    recipients_count INTEGER,
    delivery_status JSONB, -- {sent: [], failed: [], pending: []}
    error_message TEXT
);

-- =====================================================
-- КОМАНДЫ ОБОРУДОВАНИЯ
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id UUID REFERENCES equipment(id),
    component_id UUID REFERENCES components(id),
    
    command_type VARCHAR(100) NOT NULL,
    command_code VARCHAR(100) NOT NULL,
    command_data JSONB,
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'sent', 'executing', 'completed', 'failed', 'timeout'
    )),
    
    sent_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    response_data JSONB,
    error_message TEXT,
    
    initiated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ФАЙЛОВОЕ ХРАНИЛИЩЕ
-- =====================================================

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    
    storage_type VARCHAR(50) DEFAULT 'local' CHECK (storage_type IN ('local', 's3', 'azure', 'gcs')),
    storage_path TEXT NOT NULL,
    storage_url TEXT,
    
    entity_type VARCHAR(100), -- 'message', 'document', 'report', etc
    entity_id UUID,
    
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    is_public BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    
    metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ ИНДЕКСЫ
-- =====================================================

CREATE INDEX idx_components_equipment ON components(equipment_id);
CREATE INDEX idx_components_status ON components(status);

CREATE INDEX idx_shift_reports_trading_point ON shift_reports(trading_point_id);
CREATE INDEX idx_shift_reports_operator ON shift_reports(operator_id);
CREATE INDEX idx_shift_reports_status ON shift_reports(status);
CREATE INDEX idx_shift_reports_shift_start ON shift_reports(shift_start);

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_notification_rules_active ON notification_rules(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_notification_history_rule ON notification_history(rule_id);
CREATE INDEX idx_notification_history_triggered ON notification_history(triggered_at DESC);

CREATE INDEX idx_equipment_commands_equipment ON equipment_commands(equipment_id);
CREATE INDEX idx_equipment_commands_component ON equipment_commands(component_id);
CREATE INDEX idx_equipment_commands_status ON equipment_commands(status);

CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);

-- =====================================================
-- ДОПОЛНИТЕЛЬНЫЕ ТРИГГЕРЫ
-- =====================================================

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_component_templates_updated_at BEFORE UPDATE ON component_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_reports_updated_at BEFORE UPDATE ON shift_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at BEFORE UPDATE ON notification_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS POLICIES ДЛЯ НОВЫХ ТАБЛИЦ
-- =====================================================

ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE component_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_stocks_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Базовые политики (расширить по необходимости)
CREATE POLICY "Authenticated users can read components" ON components
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read shift reports" ON shift_reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can read own messages" ON messages
    FOR SELECT USING (
        auth.uid()::UUID = sender_id OR 
        auth.uid()::UUID = recipient_id
    );

-- =====================================================
-- КОММЕНТАРИИ
-- =====================================================

COMMENT ON TABLE components IS 'Компоненты оборудования с шаблонами и статусами';
COMMENT ON TABLE shift_reports IS 'Сменные отчеты с финансовыми показателями';
COMMENT ON TABLE fuel_stocks_history IS 'Временные ряды остатков топлива в резервуарах';
COMMENT ON TABLE messages IS 'Система внутренних сообщений и коммуникаций';
COMMENT ON TABLE notification_rules IS 'Правила автоматических уведомлений';
COMMENT ON TABLE equipment_commands IS 'История команд управления оборудованием';
COMMENT ON TABLE files IS 'Метаданные загруженных файлов';