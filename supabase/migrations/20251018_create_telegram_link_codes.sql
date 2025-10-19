-- Таблица для временных кодов привязки Telegram аккаунтов
-- Используется для безопасной привязки Telegram чата к пользователю

CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,

  -- Индексы для быстрого поиска
  CONSTRAINT telegram_link_codes_code_key UNIQUE (code)
);

-- Индекс для поиска по коду (основной use case)
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code
  ON telegram_link_codes(code)
  WHERE used = FALSE;

-- Индекс для поиска по user_id
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user_id
  ON telegram_link_codes(user_id);

-- Индекс для автоматической очистки истёкших кодов
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires_at
  ON telegram_link_codes(expires_at)
  WHERE used = FALSE;

-- Комментарии к таблице и полям
COMMENT ON TABLE telegram_link_codes IS 'Временные коды для безопасной привязки Telegram аккаунтов к пользователям системы';
COMMENT ON COLUMN telegram_link_codes.code IS 'Уникальный код для привязки (например: ABC123XYZ)';
COMMENT ON COLUMN telegram_link_codes.user_id IS 'ID пользователя, который запросил привязку';
COMMENT ON COLUMN telegram_link_codes.expires_at IS 'Время истечения кода (обычно 15 минут)';
COMMENT ON COLUMN telegram_link_codes.used IS 'Флаг использования кода';
COMMENT ON COLUMN telegram_link_codes.used_at IS 'Время использования кода';

-- RLS (Row Level Security) политики
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои коды
CREATE POLICY "Users can view their own link codes"
  ON telegram_link_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Только аутентифицированные пользователи могут создавать коды
CREATE POLICY "Authenticated users can create link codes"
  ON telegram_link_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Backend может обновлять коды (для пометки как использованные)
CREATE POLICY "Service role can update link codes"
  ON telegram_link_codes
  FOR UPDATE
  USING (true);

-- Функция для автоматической очистки истёкших кодов (можно вызывать по cron)
CREATE OR REPLACE FUNCTION cleanup_expired_telegram_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM telegram_link_codes
  WHERE expires_at < NOW() AND used = FALSE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_telegram_codes() IS 'Удаляет истёкшие и неиспользованные коды привязки Telegram';
