# Настройка базы данных TradeControl

## Обзор

TradeControl использует PostgreSQL как основную базу данных. Все запросы идут через Express backend (`server/`), который подключается к БД напрямую через `pg` (node-postgres). Frontend не имеет прямого доступа к БД.

## Быстрый старт

### 1. PostgreSQL

БД уже развёрнута на production-сервере `194.135.36.195`. Для локальной разработки backend подключается к production БД (single shared database).

Если нужна локальная БД:
```bash
# Docker
docker run -d --name tradecontrol-pg \
  -e POSTGRES_DB=tradecontrol \
  -e POSTGRES_USER=tradecontrol \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 postgres:15

# Или установка PostgreSQL
# https://www.postgresql.org/download/
```

### 2. Настройка переменных окружения

Отредактируйте `server/.env`:

```bash
# PostgreSQL подключение
DATABASE_URL=postgresql://user:password@host:5432/tradecontrol

# Или раздельно
DB_HOST=194.135.36.195
DB_PORT=5432
DB_NAME=tradecontrol
DB_USER=tradecontrol
DB_PASSWORD=your_password

# JWT для аутентификации
JWT_SECRET=your_jwt_secret
```

Frontend (корневой `.env`):
```bash
VITE_BASE_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001
```

> **Важно:** Frontend использует только `VITE_BASE_URL` и `VITE_API_URL`. Прямого доступа к БД и Supabase-переменных в рабочей схеме больше нет.

## Схема базы данных

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
    version INTEGER DEFAULT 1,
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
    type VARCHAR(50) DEFAULT 'АЗС',
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
    geolocation JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Роли и права (`roles`, `user_roles`)
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    scope VARCHAR(50),
    scope_values JSONB DEFAULT '[]',
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    scope_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);
```

### Индексы

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_networks_tenant_id ON networks(tenant_id);
CREATE INDEX idx_trading_points_network_id ON trading_points(network_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

## Архитектура доступа к данным

```
Frontend (React)
  → fetch /api/* с Authorization: Bearer <JWT>
    → Express backend (server/)
      → middleware/auth.js (проверка JWT)
        → routes/*.js (роутинг)
          → services/*/DataSource.js (выбор источника)
            → repositories/pg/*.js (SQL-запросы через pg)
              → PostgreSQL
```

### DataSource паттерн

Каждый модуль использует DataSource файл, который подключает PG-репозиторий:

```javascript
// server/services/admin/adminDataSource.js
const pgSource = require('./adminPgSource');

function getSource() {
  return pgSource;
}

module.exports = {
  getUsers: (options) => getSource().getUsers(options),
  createUser: (input) => getSource().createUser(input),
  // ...
};
```

### Модули данных

| Модуль | DataSource | PG Source | Описание |
|--------|-----------|-----------|----------|
| auth | authDataSource.js | authRepository.js | Аутентификация, JWT |
| admin | adminDataSource.js | adminPgSource.js | Пользователи, роли |
| org | orgDataSource.js | orgPgSource.js | Сети, точки |
| legal | legalDataSource.js | legalPgSource.js | Правовые документы |
| audit | auditDataSource.js | auditPgSource.js | Журнал аудита |
| notifications | notificationDataSource.js | notificationPgSource.js | Уведомления |
| messaging | messagingDataSource.js | messagingPgSource.js | Рассылки |
| nomenclature | nomenclatureDataSource.js | nomenclaturePgSource.js | Номенклатура |
| tankCalibration | tankCalibrationDataSource.js | tankCalibrationPgSource.js | Калибровка |

## Инструменты диагностики

```bash
# Проверка подключения
cd server && node -e "const {pool}=require('./db/pg'); pool.query('SELECT NOW()').then(r=>console.log(r.rows[0])).catch(console.error)"

# Проверка таблиц
node tools/sql-direct.js tables

# Данные из таблицы
node tools/sql-direct.js select "users limit 5"
```

## Бэкапы

```bash
# Экспорт БД
pg_dump -h 194.135.36.195 -U tradecontrol -d tradecontrol > backup.sql

# Восстановление
psql -h host -U tradecontrol -d tradecontrol < backup.sql
```

## Полезные ссылки

- [PostgreSQL Manual](https://www.postgresql.org/docs/)
- [node-postgres](https://node-postgres.com/)
