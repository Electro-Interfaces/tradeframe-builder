
-- Обновление времени жизни кодов верификации Telegram на 24 часа
-- Выполните этот SQL в Supabase Dashboard → SQL Editor


CREATE OR REPLACE FUNCTION generate_verification_code(
    p_user_id UUID,
    p_code_length INTEGER DEFAULT 6,
    p_expire_minutes INTEGER DEFAULT 1440  -- 24 часа = 1440 минут
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_charset TEXT := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; -- Исключили O, 0
    v_prefix TEXT := 'TF';
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    -- Сначала удаляем старые неиспользованные коды пользователя
    DELETE FROM telegram_verification_codes 
    WHERE user_id = p_user_id 
    AND is_used = FALSE;
    
    -- Генерируем уникальный код
    LOOP
        -- Генерация кода с префиксом TF
        v_code := v_prefix;
        
        FOR i IN 1..(p_code_length - 2) LOOP
            v_code := v_code || substr(v_charset, floor(random() * length(v_charset) + 1)::integer, 1);
        END LOOP;
        
        -- Проверяем уникальность
        IF NOT EXISTS (
            SELECT 1 FROM telegram_verification_codes 
            WHERE verification_code = v_code 
            AND is_used = FALSE
        ) THEN
            -- Код уникален, сохраняем в базу
            INSERT INTO telegram_verification_codes (
                user_id, 
                verification_code, 
                expires_at
            ) VALUES (
                p_user_id,
                v_code,
                NOW() + INTERVAL '1 minute' * p_expire_minutes
            );
            
            RETURN v_code;
        END IF;
        
        -- Защита от бесконечного цикла
        v_attempts := v_attempts + 1;
        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный код после % попыток', v_max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
    

-- Обновляем комментарий к функции
COMMENT ON FUNCTION generate_verification_code(UUID, INTEGER, INTEGER) 
IS 'Генерация кода верификации Telegram (срок действия 24 часа по умолчанию)';

-- Проверяем обновление
SELECT 'Функция generate_verification_code обновлена на 24 часа' as result;
    