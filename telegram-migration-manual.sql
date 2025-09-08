-- ============================================
-- РУЧНАЯ МИГРАЦИЯ TELEGRAM ВЕРИФИКАЦИИ
-- Выполните этот SQL в Supabase Dashboard → SQL Editor
-- ============================================

-- 1. СОЗДАНИЕ ТАБЛИЦЫ КОДОВ ВЕРИФИКАЦИИ
CREATE TABLE IF NOT EXISTS telegram_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_code VARCHAR(10) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  user_agent TEXT NULL,
  ip_address INET NULL
);

-- 2. СОЗДАНИЕ ИНДЕКСОВ
CREATE INDEX IF NOT EXISTS idx_telegram_codes_user_id 
ON telegram_verification_codes(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_codes_active 
ON telegram_verification_codes(verification_code) 
WHERE is_used = FALSE;

CREATE INDEX IF NOT EXISTS idx_telegram_codes_expires 
ON telegram_verification_codes(expires_at) 
WHERE is_used = FALSE;

CREATE INDEX IF NOT EXISTS idx_telegram_codes_created 
ON telegram_verification_codes(created_at);

-- 3. ОБНОВЛЕНИЕ ТАБЛИЦЫ USERS
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS telegram_verified_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT TRUE;

-- 4. УНИКАЛЬНЫЙ ИНДЕКС ДЛЯ CHAT ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_chat_id 
ON users(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- 5. ФУНКЦИЯ ОЧИСТКИ ПРОСРОЧЕННЫХ КОДОВ
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM telegram_verification_codes 
    WHERE expires_at < NOW() 
    AND is_used = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 6. ФУНКЦИЯ ГЕНЕРАЦИИ КОДА
CREATE OR REPLACE FUNCTION generate_verification_code(
    p_user_id UUID,
    p_code_length INTEGER DEFAULT 6,
    p_expire_minutes INTEGER DEFAULT 15
)
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_charset TEXT := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
    v_prefix TEXT := 'TF';
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 10;
BEGIN
    -- Удаляем старые коды пользователя
    DELETE FROM telegram_verification_codes 
    WHERE user_id = p_user_id 
    AND is_used = FALSE;
    
    -- Генерируем уникальный код
    LOOP
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
            -- Сохраняем код
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
        
        v_attempts := v_attempts + 1;
        IF v_attempts >= v_max_attempts THEN
            RAISE EXCEPTION 'Не удалось сгенерировать уникальный код после % попыток', v_max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. ФУНКЦИЯ ВЕРИФИКАЦИИ КОДА
CREATE OR REPLACE FUNCTION verify_telegram_code(
    p_verification_code TEXT,
    p_chat_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Ищем активный код
    SELECT vc.*, u.id as user_id, u.name, u.email, u.telegram_chat_id as existing_chat_id
    INTO v_record
    FROM telegram_verification_codes vc
    JOIN users u ON vc.user_id = u.id
    WHERE vc.verification_code = p_verification_code
    AND vc.is_used = FALSE
    AND vc.expires_at > NOW();
    
    -- Если код не найден
    IF v_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Код неверен или просрочен',
            'error_code', 'INVALID_CODE'
        );
    END IF;
    
    -- Проверяем занятость chat_id
    IF EXISTS (
        SELECT 1 FROM users 
        WHERE telegram_chat_id = p_chat_id 
        AND id != v_record.user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Этот Telegram аккаунт уже привязан к другому пользователю',
            'error_code', 'CHAT_ID_TAKEN'
        );
    END IF;
    
    -- Обновляем пользователя
    UPDATE users SET
        telegram_chat_id = p_chat_id,
        telegram_verified_at = NOW(),
        telegram_notifications_enabled = TRUE
    WHERE id = v_record.user_id;
    
    -- Отмечаем код как использованный
    UPDATE telegram_verification_codes SET
        is_used = TRUE,
        used_at = NOW()
    WHERE id = v_record.id;
    
    -- Возвращаем успех
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', v_record.user_id,
            'name', v_record.name,
            'email', v_record.email
        ),
        'message', 'Аккаунт успешно привязан'
    );
END;
$$ LANGUAGE plpgsql;

-- 8. КОММЕНТАРИИ
COMMENT ON TABLE telegram_verification_codes IS 'Коды верификации для привязки Telegram аккаунтов';
COMMENT ON COLUMN telegram_verification_codes.verification_code IS 'Уникальный код вида TF7K2M для верификации';
COMMENT ON COLUMN users.telegram_chat_id IS 'Chat ID пользователя в Telegram';
COMMENT ON COLUMN users.telegram_verified_at IS 'Дата и время привязки Telegram';

-- 9. ТЕСТОВЫЙ ЗАПРОС (можно выполнить для проверки)
-- SELECT 'Миграция Telegram верификации завершена успешно!' as status;

-- 10. ПОЛЕЗНЫЕ ЗАПРОСЫ ДЛЯ МОНИТОРИНГА:

-- Количество активных кодов:
-- SELECT COUNT(*) as active_codes FROM telegram_verification_codes WHERE is_used = false AND expires_at > NOW();

-- Пользователи с подключенным Telegram:
-- SELECT COUNT(*) as connected_users FROM users WHERE telegram_chat_id IS NOT NULL;

-- Очистка просроченных кодов:
-- SELECT cleanup_expired_telegram_codes() as cleaned_codes;