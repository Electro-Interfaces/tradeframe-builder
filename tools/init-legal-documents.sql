-- Инициализация типов правовых документов
-- Запустите этот скрипт в Supabase SQL Editor

-- Создание типов документов (если еще не созданы)
INSERT INTO document_types (code, title, description, is_active, created_at, updated_at)
VALUES
  ('tos', 'Пользовательское соглашение', 'Terms of Service - условия использования сервиса', true, NOW(), NOW()),
  ('privacy', 'Политика конфиденциальности', 'Privacy Policy - правила обработки персональных данных', true, NOW(), NOW()),
  ('pdn', 'Политика защиты персональных данных', 'Положение о защите персональных данных (ПДн)', true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Проверка созданных записей
SELECT * FROM document_types WHERE is_active = true ORDER BY code;
