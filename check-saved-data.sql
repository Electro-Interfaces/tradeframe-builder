-- Проверяем что сохранилось в таблице user_document_acceptances

-- Показываем все записи с согласиями
SELECT 
  user_email,
  doc_type_code,
  doc_version,
  source,
  created_at
FROM user_document_acceptances 
ORDER BY created_at DESC
LIMIT 20;

-- Группируем по пользователям
SELECT 
  user_email,
  COUNT(*) as total_documents,
  MAX(created_at) as last_acceptance
FROM user_document_acceptances 
GROUP BY user_email
ORDER BY last_acceptance DESC;