-- Миграция для поддержки Telegram верификации
-- Дата: 06.09.2025
-- Описание: Создание таблицы кодов верификации и обновление таблицы users

-- ============================================
-- 1. Создание таблицы кодов верификации
-- ============================================

CREATE TABLE IF NOT EXISTS telegram_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_code VARCHAR(10) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  -- Дополнительная информация для мониторинга
  user_agent TEXT NULL,
  ip_address INET NULL
);

-- ============================================
-- 2. Создание индексов для оптимизации
-- ============================================

-- Индекс для поиска кодов конкретного пользователя
CREATE INDEX idx_telegram_codes_user_id 
ON telegram_verification_codes(user_id);

-- Индекс для быстрого поиска активных кодов
CREATE INDEX idx_telegram_codes_active 
ON telegram_verification_codes(verification_code) 
WHERE is_used = FALSE;

-- Индекс для очистки просроченных кодов
CREATE INDEX idx_telegram_codes_expires 
ON telegram_verification_codes(expires_at) 
WHERE is_used = FALSE;

-- Индекс для мониторинга по времени создания
CREATE INDEX idx_telegram_codes_created 
ON telegram_verification_codes(created_at);

-- ============================================
-- 3. Обновление таблицы users
-- ============================================

-- Добавляем колонки для Telegram интеграции
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS telegram_verified_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS telegram_notifications_enabled BOOLEAN DEFAULT TRUE;

-- Индекс для поиска по chat_id (уникальный)
CREATE UNIQUE INDEX idx_users_telegram_chat_id 
ON users(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- ============================================
-- 4. Функция автоматической очистки просроченных кодов
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Удаляем просроченные и неиспользованные коды
    DELETE FROM telegram_verification_codes 
    WHERE expires_at < NOW() 
    AND is_used = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Логируем результат
    RAISE NOTICE 'Очищено просроченных кодов верификации: %', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Функция для генерации уникального кода
-- ============================================

CREATE OR REPLACE FUNCTION generate_verification_code(
    p_user_id UUID,
    p_code_length INTEGER DEFAULT 6,
    p_expire_minutes INTEGER DEFAULT 15
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

-- ============================================
-- 6. Функция для проверки и использования кода
-- ============================================

CREATE OR REPLACE FUNCTION verify_telegram_code(
    p_verification_code TEXT,
    p_chat_id TEXT
)
RETURNS JSON AS $$
DECLARE
    v_record RECORD;
    v_result JSON;
BEGIN
    -- Ищем активный код
    SELECT vc.*, u.id as user_id, u.name, u.email, u.telegram_chat_id as existing_chat_id
    INTO v_record
    FROM telegram_verification_codes vc
    JOIN users u ON vc.user_id = u.id
    WHERE vc.verification_code = p_verification_code
    AND vc.is_used = FALSE
    AND vc.expires_at > NOW();
    
    -- Если код не найден или просрочен
    IF v_record IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Код неверен или просрочен',
            'error_code', 'INVALID_CODE'
        );
    END IF;
    
    -- Проверяем, не занят ли chat_id другим пользователем
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
    
    -- Возвращаем результат успеха
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

-- ============================================
-- 7. Комментарии к таблицам и колонкам
-- ============================================

COMMENT ON TABLE telegram_verification_codes IS 'Коды верификации для привязки Telegram аккаунтов';
COMMENT ON COLUMN telegram_verification_codes.verification_code IS 'Уникальный код вида TF7K2M для верификации';
COMMENT ON COLUMN telegram_verification_codes.expires_at IS 'Время истечения кода (обычно +15 минут)';
COMMENT ON COLUMN telegram_verification_codes.is_used IS 'Флаг использования кода (одноразовый)';
COMMENT ON COLUMN telegram_verification_codes.user_agent IS 'User-Agent браузера для логирования';
COMMENT ON COLUMN telegram_verification_codes.ip_address IS 'IP-адрес пользователя для безопасности';

COMMENT ON COLUMN users.telegram_chat_id IS 'Chat ID пользователя в Telegram';
COMMENT ON COLUMN users.telegram_verified_at IS 'Дата и время привязки Telegram';
COMMENT ON COLUMN users.telegram_notifications_enabled IS 'Включены ли уведомления Telegram';

-- ============================================
-- 8. Права доступа (если нужно)
-- ============================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON telegram_verification_codes TO app_user;
-- GRANT SELECT, UPDATE ON users TO app_user;

-- ============================================
-- Миграция завершена
-- ============================================

SELECT 'Telegram verification migration completed successfully' as status;