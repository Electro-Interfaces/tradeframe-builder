-- ============================================
-- SQL скрипт для создания таблиц правовых документов
-- Система управления правовыми документами TradeFrame
-- ============================================

-- Включаем расширение для UUID (если не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ТАБЛИЦА ТИПОВ ДОКУМЕНТОВ
-- ============================================
CREATE TABLE IF NOT EXISTS document_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- 'tos', 'privacy', 'pdn', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для document_types
CREATE INDEX IF NOT EXISTS idx_document_types_code ON document_types(code);
CREATE INDEX IF NOT EXISTS idx_document_types_active ON document_types(is_active);

-- ============================================
-- 2. ТАБЛИЦА ВЕРСИЙ ДОКУМЕНТОВ
-- ============================================
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    doc_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    doc_type_code VARCHAR(50) NOT NULL, -- денормализация для удобства
    version VARCHAR(50) NOT NULL, -- '1.0.0', '1.1.0', etc.
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    title VARCHAR(255),
    content_html TEXT, -- HTML контент документа
    content_md TEXT, -- Markdown исходник
    checksum VARCHAR(100), -- для контроля целостности
    changelog TEXT, -- описание изменений в версии
    locale VARCHAR(10) DEFAULT 'ru',
    is_current BOOLEAN DEFAULT false, -- текущая активная версия
    editor_id UUID, -- кто редактировал
    editor_name VARCHAR(255), -- имя редактора
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT unique_current_version UNIQUE (doc_type_code, is_current) DEFERRABLE INITIALLY DEFERRED
);

-- Индексы для document_versions
CREATE INDEX IF NOT EXISTS idx_document_versions_type ON document_versions(doc_type_code);
CREATE INDEX IF NOT EXISTS idx_document_versions_status ON document_versions(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_current ON document_versions(is_current);
CREATE INDEX IF NOT EXISTS idx_document_versions_published ON document_versions(published_at);

-- ============================================
-- 3. ТАБЛИЦА СОГЛАСИЙ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
CREATE TABLE IF NOT EXISTS user_document_acceptances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL, -- ссылка на пользователя
    user_email VARCHAR(255), -- email для дополнительной идентификации
    doc_version_id UUID, -- ссылка на версию документа (может быть NULL если версия удалена)
    doc_type_code VARCHAR(50) NOT NULL, -- тип документа
    doc_version VARCHAR(50), -- версия документа на момент согласия
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET, -- IP адрес с которого дано согласие
    user_agent TEXT, -- информация о браузере
    source VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'api'
    is_revoked BOOLEAN DEFAULT false, -- отозвано ли согласие
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ограничения
    CONSTRAINT valid_source CHECK (source IN ('web', 'mobile', 'api', 'import'))
);

-- Индексы для user_document_acceptances
CREATE INDEX IF NOT EXISTS idx_user_acceptances_user ON user_document_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_email ON user_document_acceptances(user_email);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_type ON user_document_acceptances(doc_type_code);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_date ON user_document_acceptances(accepted_at);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_revoked ON user_document_acceptances(is_revoked);

-- Уникальность: один пользователь может принять одну версию документа только один раз
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_acceptances_unique 
ON user_document_acceptances(user_id, doc_version_id) 
WHERE is_revoked = false;

-- ============================================
-- 4. ТАБЛИЦА СТАТУСОВ ПОЛЬЗОВАТЕЛЕЙ ПО СОГЛАСИЯМ
-- ============================================
CREATE TABLE IF NOT EXISTS user_legal_statuses (
    user_id UUID PRIMARY KEY,
    tos_version_id UUID, -- текущая принятая версия пользовательского соглашения
    privacy_version_id UUID, -- текущая принятая версия политики конфиденциальности  
    pdn_version_id UUID, -- текущая принятая версия политики защиты ПД
    tos_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    pdn_accepted_at TIMESTAMPTZ,
    requires_consent BOOLEAN DEFAULT true, -- требуется ли новое согласие
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для user_legal_statuses
CREATE INDEX IF NOT EXISTS idx_legal_statuses_consent ON user_legal_statuses(requires_consent);
CREATE INDEX IF NOT EXISTS idx_legal_statuses_updated ON user_legal_statuses(updated_at);

-- ============================================
-- 5. ТАБЛИЦА АУДИТА ДЕЙСТВИЙ С ДОКУМЕНТАМИ
-- ============================================
CREATE TABLE IF NOT EXISTS legal_document_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    actor_id UUID NOT NULL, -- кто выполнил действие
    actor_name VARCHAR(255), -- имя актора
    actor_role VARCHAR(50), -- роль актора
    action VARCHAR(100) NOT NULL, -- 'create_draft', 'publish', 'accept', etc.
    resource_type VARCHAR(50) NOT NULL, -- 'document_version', 'user_acceptance', etc.
    resource_id UUID, -- ID ресурса
    before_state JSONB, -- состояние до изменения
    after_state JSONB, -- состояние после изменения
    comment TEXT, -- дополнительный комментарий
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для audit_log
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON legal_document_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON legal_document_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON legal_document_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON legal_document_audit_log(created_at);

-- ============================================
-- 6. TRIGGERS ДЛЯ АВТОМАТИЧЕСКОГО ОБНОВЛЕНИЯ TIMESTAMP
-- ============================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers для автоматического обновления updated_at
CREATE TRIGGER update_document_types_updated_at 
    BEFORE UPDATE ON document_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_versions_updated_at 
    BEFORE UPDATE ON document_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_legal_statuses_updated_at 
    BEFORE UPDATE ON user_legal_statuses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБНЫХ ЗАПРОСОВ
-- ============================================

-- Представление для получения текущих версий документов
CREATE OR REPLACE VIEW current_document_versions AS
SELECT 
    dv.*,
    dt.title as type_title,
    dt.description as type_description
FROM document_versions dv
JOIN document_types dt ON dv.doc_type_id = dt.id
WHERE dv.is_current = true 
  AND dv.status = 'published'
  AND dt.is_active = true;

-- Представление для статистики согласий
CREATE OR REPLACE VIEW document_acceptance_stats AS
SELECT 
    dt.code as doc_type_code,
    dt.title as doc_type_title,
    dv.version as current_version,
    dv.published_at,
    COUNT(uda.id) as total_acceptances,
    COUNT(DISTINCT uda.user_id) as unique_users,
    COUNT(CASE WHEN uda.accepted_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as acceptances_last_30_days
FROM document_types dt
LEFT JOIN document_versions dv ON dt.id = dv.doc_type_id AND dv.is_current = true
LEFT JOIN user_document_acceptances uda ON dv.id = uda.doc_version_id AND uda.is_revoked = false
WHERE dt.is_active = true
GROUP BY dt.code, dt.title, dv.version, dv.published_at
ORDER BY dt.code;

-- ============================================
-- 8. RLS (Row Level Security) ПОЛИТИКИ
-- ============================================

-- Включаем RLS для таблиц (опционально, если нужна дополнительная безопасность)
-- ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. КОММЕНТАРИИ К ТАБЛИЦАМ И ПОЛЯМ
-- ============================================

COMMENT ON TABLE document_types IS 'Типы правовых документов (соглашения, политики и т.д.)';
COMMENT ON TABLE document_versions IS 'Версии документов с содержимым';
COMMENT ON TABLE user_document_acceptances IS 'Журнал согласий пользователей с документами';
COMMENT ON TABLE user_legal_statuses IS 'Текущий статус согласий каждого пользователя';
COMMENT ON TABLE legal_document_audit_log IS 'Журнал аудита всех действий с документами';

COMMENT ON COLUMN document_versions.is_current IS 'Является ли версия текущей активной (только одна на тип документа)';
COMMENT ON COLUMN document_versions.checksum IS 'Контрольная сумма содержимого для проверки целостности';
COMMENT ON COLUMN user_document_acceptances.source IS 'Источник согласия: web, mobile, api, import';
COMMENT ON COLUMN user_legal_statuses.requires_consent IS 'Требуется ли пользователю дать новые согласия';

-- ============================================
-- Готово! Таблицы правовых документов созданы.
-- ============================================