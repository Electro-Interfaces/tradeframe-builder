-- ========================================
-- ИСПРАВЛЕНИЕ ОГРАНИЧЕНИЯ СПОСОБОВ ОПЛАТЫ
-- Добавляет поддержку online_order и corporate_card
-- ========================================

-- Шаг 1: Проверяем текущее ограничение
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
AND conname = 'operations_payment_method_check';

-- Шаг 2: Удаляем старое ограничение
ALTER TABLE operations 
DROP CONSTRAINT IF EXISTS operations_payment_method_check;

-- Шаг 3: Добавляем новое ограничение с расширенным списком способов оплаты
ALTER TABLE operations 
ADD CONSTRAINT operations_payment_method_check 
CHECK (payment_method IN (
    'cash',           -- Наличные
    'bank_card',      -- Банковская карта  
    'fuel_card',      -- Топливная карта
    'corporate_card', -- Корпоративная карта
    'online_order'    -- Онлайн заказ
));

-- Шаг 4: Проверяем новое ограничение
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
AND conname = 'operations_payment_method_check';

-- Шаг 5: Тестируем добавление записи с online_order
INSERT INTO operations (
    id, 
    operation_type, 
    status, 
    start_time, 
    payment_method, 
    details, 
    created_at, 
    updated_at
) VALUES (
    'TEST-ONLINE-ORDER-' || extract(epoch from now())::text,
    'sale',
    'completed',
    now(),
    'online_order',
    'Тестовая операция с онлайн заказом',
    now(),
    now()
) RETURNING id, payment_method;

-- Шаг 6: Удаляем тестовую запись
DELETE FROM operations 
WHERE id LIKE 'TEST-ONLINE-ORDER-%' 
AND created_at > now() - interval '1 minute';

-- Шаг 7: Показываем статистику способов оплаты
SELECT 
    payment_method,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM operations), 1) as percentage
FROM operations 
GROUP BY payment_method 
ORDER BY count DESC;