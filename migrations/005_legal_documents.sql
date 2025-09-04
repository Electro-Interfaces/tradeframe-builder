-- ===============================================
-- LEGAL DOCUMENTS MANAGEMENT SYSTEM
-- ===============================================

-- Document Types
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Versions
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
    doc_type_code VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    checksum VARCHAR(64) NOT NULL,
    editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    editor_name VARCHAR(255),
    changelog TEXT,
    content_html TEXT,
    content_md TEXT NOT NULL,
    locale VARCHAR(5) DEFAULT 'ru',
    is_current BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Document Acceptances (immutable audit trail)
CREATE TABLE user_document_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    doc_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    doc_type_code VARCHAR(50) NOT NULL,
    doc_version VARCHAR(20) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    source VARCHAR(20) DEFAULT 'web' CHECK (source IN ('web', 'mobile', 'api')),
    immutable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Legal Status (current compliance status)
CREATE TABLE user_legal_statuses (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tos_version_id UUID REFERENCES document_versions(id),
    privacy_version_id UUID REFERENCES document_versions(id),
    pdn_version_id UUID REFERENCES document_versions(id),
    tos_accepted_at TIMESTAMPTZ,
    privacy_accepted_at TIMESTAMPTZ,
    pdn_accepted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legal Audit Log
CREATE TABLE legal_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    before_state JSONB,
    after_state JSONB,
    comment TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Document Types
CREATE INDEX idx_document_types_code ON document_types(code);

-- Document Versions
CREATE INDEX idx_document_versions_type ON document_versions(doc_type_id);
CREATE INDEX idx_document_versions_code ON document_versions(doc_type_code);
CREATE INDEX idx_document_versions_status ON document_versions(status);
CREATE INDEX idx_document_versions_current ON document_versions(doc_type_code, is_current) 
    WHERE is_current = TRUE;
CREATE INDEX idx_document_versions_published ON document_versions(doc_type_code, published_at DESC) 
    WHERE status = 'published';

-- User Document Acceptances
CREATE INDEX idx_user_acceptances_user ON user_document_acceptances(user_id);
CREATE INDEX idx_user_acceptances_doc_version ON user_document_acceptances(doc_version_id);
CREATE INDEX idx_user_acceptances_doc_type ON user_document_acceptances(doc_type_code);
CREATE INDEX idx_user_acceptances_time ON user_document_acceptances(accepted_at DESC);
CREATE INDEX idx_user_acceptances_user_type ON user_document_acceptances(user_id, doc_type_code);

-- User Legal Statuses - no additional indexes needed (primary key covers main queries)

-- Legal Audit Log
CREATE INDEX idx_legal_audit_actor ON legal_audit_log(actor_id);
CREATE INDEX idx_legal_audit_action ON legal_audit_log(action);
CREATE INDEX idx_legal_audit_resource ON legal_audit_log(resource_type, resource_id);
CREATE INDEX idx_legal_audit_time ON legal_audit_log(created_at DESC);

-- ===============================================
-- CONSTRAINTS AND BUSINESS RULES
-- ===============================================

-- Уникальность версий документа по типу
CREATE UNIQUE INDEX idx_document_versions_unique_version 
    ON document_versions(doc_type_code, version);

-- Только одна current версия на тип документа
CREATE UNIQUE INDEX idx_document_versions_single_current 
    ON document_versions(doc_type_code) 
    WHERE is_current = TRUE;

-- Пользователь может принять одну и ту же версию только один раз
CREATE UNIQUE INDEX idx_user_acceptances_unique 
    ON user_document_acceptances(user_id, doc_version_id);

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Обновление updated_at для document_versions
CREATE TRIGGER update_document_versions_updated_at
    BEFORE UPDATE ON document_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Обновление updated_at для user_legal_statuses
CREATE TRIGGER update_user_legal_statuses_updated_at
    BEFORE UPDATE ON user_legal_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- RLS POLICIES
-- ===============================================

-- Enable RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_legal_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_audit_log ENABLE ROW LEVEL SECURITY;

-- Document Types - read access for authenticated users
CREATE POLICY document_types_read_policy ON document_types
    FOR SELECT TO authenticated
    USING (true);

-- Document Types - admin can manage
CREATE POLICY document_types_admin_policy ON document_types
    FOR ALL TO authenticated
    USING (current_user_role() = 'system_admin');

-- Document Versions - read access for all authenticated users to published docs
CREATE POLICY document_versions_read_published ON document_versions
    FOR SELECT TO authenticated
    USING (status = 'published' OR current_user_role() IN ('network_admin', 'system_admin'));

-- Document Versions - admin can manage all versions
CREATE POLICY document_versions_admin_policy ON document_versions
    FOR ALL TO authenticated
    USING (current_user_role() = 'system_admin');

-- User Document Acceptances - users can see their own acceptances
CREATE POLICY user_acceptances_own_policy ON user_document_acceptances
    FOR SELECT TO authenticated
    USING (user_id = current_user_id());

-- User Document Acceptances - users can create their own acceptances
CREATE POLICY user_acceptances_create_policy ON user_document_acceptances
    FOR INSERT TO authenticated
    WITH CHECK (user_id = current_user_id());

-- User Document Acceptances - admins can see all
CREATE POLICY user_acceptances_admin_policy ON user_document_acceptances
    FOR SELECT TO authenticated
    USING (current_user_role() IN ('network_admin', 'system_admin'));

-- User Legal Statuses - users can see their own status
CREATE POLICY user_legal_status_own_policy ON user_legal_statuses
    FOR SELECT TO authenticated
    USING (user_id = current_user_id());

-- User Legal Statuses - system can update any status
CREATE POLICY user_legal_status_system_policy ON user_legal_statuses
    FOR ALL TO authenticated
    USING (current_user_role() = 'system_admin');

-- Legal Audit Log - admins only
CREATE POLICY legal_audit_admin_policy ON legal_audit_log
    FOR SELECT TO authenticated
    USING (current_user_role() IN ('network_admin', 'system_admin'));

-- ===============================================
-- COMMENTS
-- ===============================================

COMMENT ON TABLE document_types IS 'Типы правовых документов (ТОС, политика конфиденциальности и т.д.)';
COMMENT ON TABLE document_versions IS 'Версии правовых документов с контентом';
COMMENT ON TABLE user_document_acceptances IS 'Неизменяемый журнал принятия документов пользователями';
COMMENT ON TABLE user_legal_statuses IS 'Текущий статус соблюдения правовых требований пользователями';
COMMENT ON TABLE legal_audit_log IS 'Журнал аудита всех действий с правовыми документами';

COMMENT ON COLUMN document_versions.checksum IS 'SHA256 хеш содержимого для проверки целостности';
COMMENT ON COLUMN document_versions.is_current IS 'Текущая активная версия документа';
COMMENT ON COLUMN user_document_acceptances.immutable IS 'Запись неизменяема для юридической значимости';
COMMENT ON COLUMN user_legal_statuses.user_id IS 'Один пользователь = одна запись статуса';