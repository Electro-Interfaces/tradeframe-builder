# 🗄️ Настройка базы данных TradeControl

## Обзор

TradeControl использует Supabase как основную базу данных. Supabase предоставляет PostgreSQL базу данных с дополнительными возможностями аутентификации, real-time подписок и REST API.

## 🚀 Быстрый старт

### 1. Создание проекта Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте аккаунт или войдите
3. Нажмите "New Project"
4. Заполните данные проекта:
   - **Name**: TradeControl
   - **Database Password**: Надежный пароль
   - **Region**: Выберите ближайший регион
5. Дождитесь создания проекта (1-2 минуты)

### 2. Получение ключей API

1. В панели проекта перейдите в **Settings > API**
2. Скопируйте следующие значения:
   - **URL**: Ваш Project URL
   - **anon public**: Публичный ключ для frontend
   - **service_role**: Приватный ключ (только для сервера!)

### 3. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
# Основные настройки
VITE_BASE_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000

# Supabase настройки
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 🏗️ Схема базы данных

### Основные таблицы

#### 1. Пользователи (`users`)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    pwd_salt VARCHAR(255),
    pwd_hash VARCHAR(255),
    preferences JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

#### 2. Торговые сети (`networks`)
```sql
CREATE TABLE networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Торговые точки (`trading_points`)
```sql
CREATE TABLE trading_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    network_id UUID REFERENCES networks(id),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    address TEXT,
    coordinates JSONB,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Оборудование (`equipment`)
```sql
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    trading_point_id UUID REFERENCES trading_points(id),
    template_id UUID REFERENCES equipment_templates(id),
    name VARCHAR(255) NOT NULL,
    serial_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    configuration JSONB DEFAULT '{}',
    last_maintenance TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. Шаблоны оборудования (`equipment_templates`)
```sql
CREATE TABLE equipment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    specifications JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. Цены (`prices`)
```sql
CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    trading_point_id UUID REFERENCES trading_points(id),
    fuel_type VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Инициализация базы данных

### Способ 1: SQL Editor в Supabase

1. Откройте **SQL Editor** в панели Supabase
2. Создайте новый запрос
3. Выполните следующие скрипты по порядку:

```sql
-- 1. Создание таблиц
-- Скопируйте и выполните схемы таблиц выше

-- 2. Создание индексов
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_networks_tenant_id ON networks(tenant_id);
CREATE INDEX idx_trading_points_network_id ON trading_points(network_id);
CREATE INDEX idx_equipment_trading_point_id ON equipment(trading_point_id);
CREATE INDEX idx_prices_trading_point_id ON prices(trading_point_id);
CREATE INDEX idx_prices_effective_from ON prices(effective_from);

-- 3. Политики Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
```

### Способ 2: Миграции через CLI

```bash
# Установка Supabase CLI
npm install -g supabase

# Инициализация проекта
supabase init

# Линк к вашему проекту
supabase link --project-ref your-project-id

# Применение миграций
supabase db push
```

## 📊 Демо данные

### Создание тестовых данных

```sql
-- Создание тестового тенанта
INSERT INTO users (id, tenant_id, email, name, status) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@tradecontrol.local', 'Системный администратор', 'active');

-- Создание тестовых сетей
INSERT INTO networks (id, tenant_id, name, code, description) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Сеть Центр', 'CENTER', 'Основная торговая сеть в центральном регионе'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'БТО', 'BTO', 'Сеть БТО с ограниченным доступом');

-- Создание тестовых торговых точек
INSERT INTO trading_points (id, tenant_id, network_id, name, code, address) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'АЗС Центральная', 'CENTER_001', 'г. Москва, ул. Центральная, 1'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'АЗС Южная', 'CENTER_002', 'г. Москва, ул. Южная, 15');

-- Создание шаблонов оборудования
INSERT INTO equipment_templates (id, tenant_id, name, category, manufacturer, model) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000001', 'ТРК Стандарт', 'fuel_dispenser', 'НефтеМаш', 'ТРК-01'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000001', 'Резервуар 50м³', 'tank', 'ТанкСтрой', 'РВС-50');
```

## 🔐 Настройка безопасности

### Row Level Security (RLS)

Создайте политики для каждой таблицы:

```sql
-- Политики для таблицы users
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text 
            AND u.status = 'active'
        )
    );

-- Политики для таблицы networks
CREATE POLICY "Users can view networks in their tenant" ON networks
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM users 
            WHERE id::text = auth.uid()::text
        )
    );
```

### Настройка аутентификации

```sql
-- Создание функции для регистрации пользователей
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO users (id, tenant_id, email, name)
    VALUES (
        NEW.id,
        '00000000-0000-0000-0000-000000000001',
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания пользователя
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 🔍 Инструменты диагностики

### Проверка подключения

```bash
# Используйте встроенные инструменты
node tools/sql-direct.js tables
node tools/sql-direct.js describe users
node tools/sql-direct.js select "users limit 5"
```

### SQL запросы для проверки

```sql
-- Проверка структуры БД
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- Проверка данных
SELECT 
    'users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 
    'networks' as table_name, count(*) as record_count FROM networks
UNION ALL
SELECT 
    'trading_points' as table_name, count(*) as record_count FROM trading_points;

-- Проверка политик RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public';
```

## 📈 Мониторинг и производительность

### Настройка мониторинга

1. Включите **Database Insights** в Supabase
2. Настройте алерты для:
   - Высокая загрузка CPU
   - Много активных подключений
   - Медленные запросы
   - Превышение лимитов

### Оптимизация производительности

```sql
-- Анализ медленных запросов
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Проверка использования индексов
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🚨 Резервное копирование

### Автоматические бэкапы Supabase

Supabase автоматически создает ежедневные бэкапы. Настройте:

1. **Point-in-time recovery** - До 7 дней назад
2. **Manual snapshots** - Перед важными изменениями
3. **Export данных** - Регулярная выгрузка в CSV/JSON

### Восстановление данных

```bash
# Через Supabase Dashboard
# Settings > Database > Backups > Restore

# Через CLI
supabase db dump --schema public > backup.sql
supabase db reset --db-url "postgresql://..." < backup.sql
```

## 🔗 Полезные ссылки

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [SQL Tutorial](https://www.w3schools.com/sql/)
- [Database Design Best Practices](https://www.databasestar.com/database-design-best-practices/)

## ❓ Troubleshooting

### Частые проблемы

**Ошибка подключения:**
```bash
# Проверьте переменные окружения
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Проверьте сетевое подключение
curl -I $VITE_SUPABASE_URL/rest/v1/
```

**RLS блокирует запросы:**
```sql
-- Временно отключить RLS для отладки
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Проверить политики
SELECT * FROM pg_policies WHERE tablename = 'table_name';
```

**Медленные запросы:**
```sql
-- Включить логирование медленных запросов
SHOW log_min_duration_statement;
SET log_min_duration_statement = 1000; -- 1 секунда
```