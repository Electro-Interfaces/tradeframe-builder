-- Очистка демо-операций станции 4 за август 2025
-- Станция 4 работает только с 2 сентября 2025

-- 1. Сначала найдем ID торговой точки АЗС 4
SELECT id, external_id, name, network_id 
FROM trading_points 
WHERE external_id = '4' OR name ILIKE '%АЗС 4%' OR name ILIKE '%станция 4%';

-- 2. Проверим операции станции 4 до 2 сентября (предполагаем ID = '6969b08d-1cbe-45c2-ae9c-8002c7022b59')
SELECT COUNT(*) as operations_to_delete,
       MIN(start_time) as first_operation,
       MAX(start_time) as last_operation
FROM operations 
WHERE trading_point_id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'
  AND start_time < '2025-09-02 00:00:00+00';

-- 3. Показать детали операций к удалению (первые 10)
SELECT id, start_time, operation_type, total_cost, payment_method
FROM operations 
WHERE trading_point_id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'
  AND start_time < '2025-09-02 00:00:00+00'
ORDER BY start_time
LIMIT 10;

-- 4. УДАЛИТЬ все операции станции 4 до 2 сентября 2025
DELETE FROM operations 
WHERE trading_point_id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'
  AND start_time < '2025-09-02 00:00:00+00';

-- 5. Проверить результат - должно быть 0
SELECT COUNT(*) as remaining_august_operations
FROM operations 
WHERE trading_point_id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'
  AND start_time < '2025-09-02 00:00:00+00';

-- 6. Проверить реальные операции с 2 сентября
SELECT COUNT(*) as real_operations_count,
       MIN(start_time) as first_real_operation
FROM operations 
WHERE trading_point_id = '6969b08d-1cbe-45c2-ae9c-8002c7022b59'
  AND start_time >= '2025-09-02 00:00:00+00';