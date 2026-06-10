-- База знаний компании (часть B раздела «Инфо»): категории, статьи, вложения, контакты.
-- Изоляция по сети — на уровне сервиса (kbService) через getUserScope; здесь только схема.
-- Полнотекст: to_tsvector('russian') (встроен, без расширений). pg_trgm — отдельной миграцией
-- (требует superuser); при его отсутствии поиск деградирует на ILIKE в сервисе.
-- Версии: иммутабельные редакции (status/version/is_current/effective_*); запись/публикация — фаза 4.

-- ── Категории (дерево разделов компании) ───────────────────────────────
CREATE TABLE IF NOT EXISTS kb_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id  UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES kb_categories(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_categories_network_idx ON kb_categories(network_id);

-- ── Статьи базы знаний ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_articles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  body_md        TEXT NOT NULL DEFAULT '',
  body_plain     TEXT NOT NULL DEFAULT '',          -- markdown→plain для индекса/сниппетов
  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  doc_kind       TEXT NOT NULL DEFAULT 'guide' CHECK (doc_kind IN ('law','regulation','lnd','guide','release','other')),
  doc_number     TEXT,
  version        INT  NOT NULL DEFAULT 1,
  is_current     BOOLEAN NOT NULL DEFAULT true,
  supersedes_id  UUID REFERENCES kb_articles(id) ON DELETE SET NULL,
  effective_date DATE,
  effective_until DATE,
  changelog      TEXT NOT NULL DEFAULT '',
  checksum       TEXT NOT NULL DEFAULT '',
  tags           TEXT[] NOT NULL DEFAULT '{}',
  sort_order     INT  NOT NULL DEFAULT 0,
  search_tsv     tsvector,
  published_at   TIMESTAMPTZ,
  archived_at    TIMESTAMPTZ,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_articles_network_status_idx ON kb_articles(network_id, status);
CREATE INDEX IF NOT EXISTS kb_articles_category_idx ON kb_articles(category_id);
CREATE INDEX IF NOT EXISTS kb_articles_tsv_idx ON kb_articles USING GIN(search_tsv);

-- Полнотекстовый вектор: заголовок (A) > тело (B) > теги/номер (C). Русская морфология.
CREATE OR REPLACE FUNCTION kb_articles_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('russian', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.body_plain,'')), 'B') ||
    setweight(to_tsvector('russian', coalesce(NEW.doc_number,'') || ' ' || array_to_string(NEW.tags,' ')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_articles_tsv_trg ON kb_articles;
CREATE TRIGGER kb_articles_tsv_trg BEFORE INSERT OR UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION kb_articles_tsv_update();

DROP TRIGGER IF EXISTS kb_articles_set_updated_at ON kb_articles;
CREATE TRIGGER kb_articles_set_updated_at BEFORE UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS kb_categories_set_updated_at ON kb_categories;
CREATE TRIGGER kb_categories_set_updated_at BEFORE UPDATE ON kb_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Вложения (оригиналы PDF/картинки на диске server/uploads/kb/) ───────
CREATE TABLE IF NOT EXISTS kb_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  file_path   TEXT NOT NULL,                          -- путь на диске, НЕ BYTEA
  mime        TEXT,
  size_bytes  BIGINT,
  checksum    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_attachments_article_idx ON kb_attachments(article_id);

-- ── Справочник контактов компании ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  full_name      TEXT NOT NULL,
  position       TEXT,
  responsibility TEXT,
  phone          TEXT,
  email          TEXT,
  note           TEXT,
  role           TEXT,                                 -- emergency|responsible|contractor (опц.)
  sort_order     INT NOT NULL DEFAULT 0,
  search_tsv     tsvector,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_contacts_network_idx ON kb_contacts(network_id);
CREATE INDEX IF NOT EXISTS kb_contacts_tsv_idx ON kb_contacts USING GIN(search_tsv);

CREATE OR REPLACE FUNCTION kb_contacts_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('russian', coalesce(NEW.full_name,'')), 'A') ||
    setweight(to_tsvector('russian',
      coalesce(NEW.position,'') || ' ' || coalesce(NEW.responsibility,'') || ' ' || coalesce(NEW.note,'')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS kb_contacts_tsv_trg ON kb_contacts;
CREATE TRIGGER kb_contacts_tsv_trg BEFORE INSERT OR UPDATE ON kb_contacts
  FOR EACH ROW EXECUTE FUNCTION kb_contacts_tsv_update();

DROP TRIGGER IF EXISTS kb_contacts_set_updated_at ON kb_contacts;
CREATE TRIGGER kb_contacts_set_updated_at BEFORE UPDATE ON kb_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
