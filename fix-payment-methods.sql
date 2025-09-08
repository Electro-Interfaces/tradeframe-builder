-- Исправление ограничения payment_method для добавления online_order
-- Удаляем старое ограничение
ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check;

-- Добавляем новое ограничение с онлайн заказами
ALTER TABLE operations ADD CONSTRAINT operations_payment_method_check 
CHECK (payment_method IN ('cash', 'bank_card', 'fuel_card', 'online_order'));

-- Проверяем что ограничение работает
SELECT conname, consrc FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'operations') 
AND conname = 'operations_payment_method_check';