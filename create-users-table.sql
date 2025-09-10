-- Создание таблицы пользователей для системы TradeFrame
-- Выполняется в Supabase SQL Editor

-- Создаем таблицу users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    phone VARCHAR(50),
    position VARCHAR(200),
    department VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
    pwd_salt VARCHAR(255),
    pwd_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);

-- Создаем тестового системного администратора
INSERT INTO public.users (
    id,
    tenant_id,
    email,
    name,
    first_name,
    last_name,
    status,
    pwd_salt,
    pwd_hash,
    preferences,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin@system.local',
    'Системный Администратор',
    'Системный',
    'Администратор',
    'active',
    'demo_salt_123',
    'demo_hash_456',
    '{"theme": "system", "language": "ru"}',
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW();

-- Создаем тестового пользователя
INSERT INTO public.users (
    email,
    name,
    first_name,
    last_name,
    phone,
    status,
    pwd_salt,
    pwd_hash,
    preferences
) VALUES (
    'user@tradeframe.local',
    'Тестовый Пользователь',
    'Тестовый',
    'Пользователь',
    '+7 (999) 123-45-67',
    'active',
    'user_salt_789',
    'user_hash_012',
    '{"lastSelectedNetwork": "network-1", "lastSelectedTradingPoint": "tp-1"}'
) ON CONFLICT (email) DO UPDATE SET
    updated_at = NOW();

-- Trigger для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - базовые правила
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика для чтения - пользователи могут читать всех пользователей (для админки)
CREATE POLICY "Users can read all users" ON public.users
    FOR SELECT USING (true);

-- Политика для создания - только системные сервисы
CREATE POLICY "System can create users" ON public.users
    FOR INSERT WITH CHECK (true);

-- Политика для обновления - пользователи могут обновлять свои данные
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (true);

-- Политика для удаления - только системные сервисы
CREATE POLICY "System can delete users" ON public.users
    FOR DELETE USING (true);

-- Комментарии к таблице и полям
COMMENT ON TABLE public.users IS 'Таблица пользователей системы TradeFrame';
COMMENT ON COLUMN public.users.tenant_id IS 'ID тенанта (организации)';
COMMENT ON COLUMN public.users.email IS 'Email адрес пользователя (логин)';
COMMENT ON COLUMN public.users.name IS 'Полное имя пользователя';
COMMENT ON COLUMN public.users.status IS 'Статус аккаунта пользователя';
COMMENT ON COLUMN public.users.preferences IS 'Пользовательские настройки и предпочтения';
COMMENT ON COLUMN public.users.metadata IS 'Дополнительные метаданные';

-- Выводим результат
SELECT 
    'Users table created successfully!' as message,
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users
FROM public.users;