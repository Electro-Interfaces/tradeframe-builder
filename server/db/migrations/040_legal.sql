CREATE TABLE IF NOT EXISTS document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL CHECK (code IN ('tos', 'privacy', 'pdn')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_types_code_unique
  ON document_types (lower(code));

CREATE INDEX IF NOT EXISTS idx_document_types_is_active
  ON document_types (is_active);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type_id UUID NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,
  doc_type_code TEXT NOT NULL CHECK (doc_type_code IN ('tos', 'privacy', 'pdn')),
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  title TEXT NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  content_md TEXT NOT NULL DEFAULT '',
  checksum TEXT NOT NULL DEFAULT '',
  changelog TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'ru',
  is_current BOOLEAN NOT NULL DEFAULT false,
  editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  editor_name TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_doc_type_version_unique
  ON document_versions (doc_type_code, version);

CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_current_unique
  ON document_versions (doc_type_code)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_document_versions_status
  ON document_versions (status);

CREATE INDEX IF NOT EXISTS idx_document_versions_doc_type_id
  ON document_versions (doc_type_id);

CREATE TABLE IF NOT EXISTS user_document_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL DEFAULT '',
  doc_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE RESTRICT,
  doc_type_code TEXT NOT NULL CHECK (doc_type_code IN ('tos', 'privacy', 'pdn')),
  doc_version TEXT NOT NULL DEFAULT '',
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'app', 'api')),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_document_acceptances_active_unique
  ON user_document_acceptances (user_id, doc_version_id)
  WHERE is_revoked = false;

CREATE INDEX IF NOT EXISTS idx_user_document_acceptances_user_id
  ON user_document_acceptances (user_id);

CREATE INDEX IF NOT EXISTS idx_user_document_acceptances_doc_version_id
  ON user_document_acceptances (doc_version_id);

CREATE INDEX IF NOT EXISTS idx_user_document_acceptances_doc_type_code
  ON user_document_acceptances (doc_type_code);

CREATE TABLE IF NOT EXISTS user_legal_statuses (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tos_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  privacy_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  pdn_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  tos_accepted_at TIMESTAMPTZ,
  privacy_accepted_at TIMESTAMPTZ,
  pdn_accepted_at TIMESTAMPTZ,
  requires_consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_legal_statuses_requires_consent
  ON user_legal_statuses (requires_consent);

DROP TRIGGER IF EXISTS trg_document_types_set_updated_at ON document_types;
CREATE TRIGGER trg_document_types_set_updated_at
BEFORE UPDATE ON document_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_document_versions_set_updated_at ON document_versions;
CREATE TRIGGER trg_document_versions_set_updated_at
BEFORE UPDATE ON document_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_legal_statuses_set_updated_at ON user_legal_statuses;
CREATE TRIGGER trg_user_legal_statuses_set_updated_at
BEFORE UPDATE ON user_legal_statuses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
