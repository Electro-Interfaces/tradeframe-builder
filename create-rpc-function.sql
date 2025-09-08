-- Создание RPC функции для изменения ограничений
CREATE OR REPLACE FUNCTION update_payment_method_constraint()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Удаляем старое ограничение
    ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_payment_method_check;
    
    -- Добавляем новое ограничение с online_order
    ALTER TABLE operations ADD CONSTRAINT operations_payment_method_check 
    CHECK (payment_method IN ('cash', 'bank_card', 'fuel_card', 'online_order'));
    
    RETURN 'Constraint updated successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;