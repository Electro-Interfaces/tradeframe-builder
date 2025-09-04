-- ФИНАЛЬНОЕ решение: делаем doc_version_id необязательным
-- Это позволит сохранять согласия без ссылки на document_versions

-- Убираем NOT NULL ограничение с doc_version_id
ALTER TABLE user_document_acceptances 
ALTER COLUMN doc_version_id DROP NOT NULL;

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_document_acceptances' 
AND column_name = 'doc_version_id';