-- Создание таблиц для правовых документов в Supabase
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Таблица типов документов
CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица версий документов  
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type_id UUID REFERENCES document_types(id),
  doc_type_code VARCHAR(50) NOT NULL,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
  is_current BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  checksum VARCHAR(255),
  editor_id UUID,
  editor_name VARCHAR(255),
  changelog TEXT,
  content_html TEXT,
  content_md TEXT,
  locale VARCHAR(10) DEFAULT 'ru',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица согласий пользователей
CREATE TABLE IF NOT EXISTS user_document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  doc_version_id UUID REFERENCES document_versions(id),
  doc_type_code VARCHAR(50) NOT NULL,
  version VARCHAR(50) NOT NULL,
  source VARCHAR(50) DEFAULT 'web', -- web, login, api
  ip_address INET,
  user_agent TEXT,
  immutable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица статусов пользователей
CREATE TABLE IF NOT EXISTS user_legal_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  doc_type_code VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'accepted', -- accepted, revoked, expired
  current_version_id UUID REFERENCES document_versions(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doc_type_code)
);

-- 5. Аудит лог
CREATE TABLE IF NOT EXISTS legal_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  user_id UUID,
  user_email VARCHAR(255),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_acceptances_user_id ON user_document_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_email ON user_document_acceptances(user_email);
CREATE INDEX IF NOT EXISTS idx_user_acceptances_doc_type ON user_document_acceptances(doc_type_code);
CREATE INDEX IF NOT EXISTS idx_user_statuses_user_id ON user_legal_statuses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statuses_email ON user_legal_statuses(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON legal_audit_log(entity_type, entity_id);

-- 7. RLS политики для безопасности
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_document_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_legal_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_audit_log ENABLE ROW LEVEL SECURITY;

-- Политики чтения для анонимных пользователей (для получения документов)
CREATE POLICY "Allow anon read document types" ON document_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read published versions" ON document_versions FOR SELECT TO anon USING (status = 'published');

-- Политики записи согласий для анонимных пользователей
CREATE POLICY "Allow anon insert acceptances" ON user_document_acceptances FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert statuses" ON user_legal_statuses FOR INSERT TO anon WITH CHECK (true);

-- Политики чтения собственных данных
CREATE POLICY "Users can read own acceptances" ON user_document_acceptances FOR SELECT USING (user_email = auth.jwt()->>'email');
CREATE POLICY "Users can read own statuses" ON user_legal_statuses FOR SELECT USING (user_email = auth.jwt()->>'email');

-- 8. Вставляем начальные типы документов
INSERT INTO document_types (code, title, description) VALUES
('tos', 'Пользовательское соглашение', 'Условия использования платформы TradeControl'),
('privacy', 'Политика конфиденциальности', 'Политика обработки персональных данных'),
('pdn', 'Защита персональных данных', 'Подробная политика защиты персональных данных')
ON CONFLICT (code) DO NOTHING;

-- 9. Проверка созданных таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('document_types', 'document_versions', 'user_document_acceptances', 'user_legal_statuses', 'legal_audit_log')
ORDER BY table_name;