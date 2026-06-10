-- Универсальная база знаний: статьи и категории без привязки к компании (network_id IS NULL)
-- видны ВСЕМ авторизованным (законодательство РФ, ГОСТы, нормы по нефтепродуктам — общие для всех АЗС).
-- Локальные документы (ЛНД) и контакты остаются привязанными к сети (per-company).
ALTER TABLE kb_articles   ALTER COLUMN network_id DROP NOT NULL;
ALTER TABLE kb_categories ALTER COLUMN network_id DROP NOT NULL;

-- Частичные индексы для универсального скоупа (быстрый отбор «network_id IS NULL»).
CREATE INDEX IF NOT EXISTS kb_articles_universal_idx   ON kb_articles(status)     WHERE network_id IS NULL;
CREATE INDEX IF NOT EXISTS kb_categories_universal_idx ON kb_categories(sort_order) WHERE network_id IS NULL;
