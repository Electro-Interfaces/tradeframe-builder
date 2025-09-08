-- Исправление дублирования операций по transaction_id
-- Создание уникального индекса для предотвращения дублирования в будущем

-- 1. Проверим текущее состояние дубликатов
SELECT 
    transaction_id,
    COUNT(*) as count,
    STRING_AGG(id, ', ') as operation_ids
FROM operations 
WHERE transaction_id IS NOT NULL 
GROUP BY transaction_id 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. Показать статистику дубликатов
SELECT 
    'Всего операций' as metric,
    COUNT(*) as value
FROM operations
UNION ALL
SELECT 
    'Уникальных transaction_id' as metric,
    COUNT(DISTINCT transaction_id) as value
FROM operations 
WHERE transaction_id IS NOT NULL
UNION ALL
SELECT 
    'Дублированных transaction_id' as metric,
    COUNT(*) as value
FROM (
    SELECT transaction_id
    FROM operations 
    WHERE transaction_id IS NOT NULL 
    GROUP BY transaction_id 
    HAVING COUNT(*) > 1
) duplicates;

-- 3. Удалить дубликаты (оставить самую новую запись по created_at)
WITH duplicates AS (
    SELECT 
        id,
        transaction_id,
        ROW_NUMBER() OVER (
            PARTITION BY transaction_id 
            ORDER BY created_at DESC
        ) as rn
    FROM operations 
    WHERE transaction_id IS NOT NULL
),
to_delete AS (
    SELECT id 
    FROM duplicates 
    WHERE rn > 1
)
DELETE FROM operations 
WHERE id IN (SELECT id FROM to_delete);

-- 4. Создать уникальный индекс для предотвращения дублирования в будущем
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_transaction_id_unique
ON operations (transaction_id) 
WHERE transaction_id IS NOT NULL AND transaction_id != '';

-- 5. Создать дополнительный индекс для быстрого поиска по trading_point_id и transaction_id
CREATE INDEX IF NOT EXISTS idx_operations_trading_point_transaction
ON operations (trading_point_id, transaction_id)
WHERE transaction_id IS NOT NULL;

-- 6. Проверить результат - должно быть 0 дубликатов
SELECT 
    'Дубликатов после очистки' as metric,
    COUNT(*) as value
FROM (
    SELECT transaction_id
    FROM operations 
    WHERE transaction_id IS NOT NULL 
    GROUP BY transaction_id 
    HAVING COUNT(*) > 1
) remaining_duplicates;