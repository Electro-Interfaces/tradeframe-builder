# Supabase Database Migrations

Миграции базы данных для Tradeframe Trading Platform.

## Обзор

Система использует PostgreSQL через Supabase с полной поддержкой:
- **Multi-tenant архитектуры** с изоляцией по network_id
- **Row Level Security (RLS)** для безопасности данных
- **Role-Based Access Control (RBAC)** с 4-уровневой системой ролей
- **63 API endpoints** с полной Swagger документацией

## Структура миграций

| Файл | Описание |
|------|----------|
| `001_initial_schema.sql` | Основная схема БД: 17 таблиц, индексы, триггеры |
| `002_row_level_security.sql` | RLS политики для multi-tenant изоляции |
| `003_seed_data.sql` | Начальные данные: роли, топливо, demo данные |

## Быстрый старт

### 1. Настройка Supabase

```bash
# 1. Создайте проект в Supabase
# 2. Получите credentials:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 2. Запуск миграций

**Вариант A: Через Supabase Dashboard**
1. Откройте SQL Editor в Supabase Dashboard
2. Выполните миграции последовательно:
   - `001_initial_schema.sql`
   - `002_row_level_security.sql` 
   - `003_seed_data.sql`

**Вариант B: Через CLI**
```bash
# Установка Supabase CLI
npm install -g supabase

# Логин и связывание проекта
supabase login
supabase link --project-ref your-project-id

# Выполнение миграций
supabase db push
```

### 3. Настройка Environment Variables

```bash
# .env.local
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# .env.production
VITE_API_URL=https://your-api-domain.com/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Архитектура данных

### Основные таблицы

```
networks (Торговые сети)
├── trading_points (Торговые точки)
│   ├── users (Пользователи)
│   ├── equipment (Оборудование)
│   │   ├── components (Компоненты)
│   │   ├── equipment_events (События)
│   │   └── equipment_log (Журнал)
│   ├── tanks (Резервуары)
│   │   └── tank_events (События)
│   ├── fuel_stocks (Запасы топлива)
│   │   └── fuel_measurement_history (История измерений)
│   ├── operations (Операции)
│   └── price_history (История цен)
└── roles (Роли)
    └── user_roles (Назначение ролей)
```

### Системы безопасности

#### Row Level Security (RLS)
- **Multi-tenant изоляция**: Пользователи видят только данные своей сети
- **Роль-основанный доступ**: Различные права для каждой роли
- **Автоматическая фильтрация**: RLS политики применяются автоматически

#### Роли пользователей
| Роль | Области доступа | Права |
|------|-----------------|--------|
| `system_admin` | Глобальные | Все операции |
| `network_admin` | Сеть | Управление сетью, пользователями |
| `manager` | Торговая точка | Операции, оборудование, отчеты |
| `operator` | Торговая точка | Базовые операции |

## Тестовые данные

После миграций доступны тестовые пользователи:

| Email | Пароль | Роль | Описание |
|-------|--------|------|----------|
| `admin@tradeframe.com` | `admin123` | system_admin | Системный администратор |
| `network.admin@demo-azs.ru` | `admin123` | network_admin | Админ демо сети |
| `manager@demo-azs.ru` | `admin123` | manager | Менеджер АЗС |
| `operator@demo-azs.ru` | `admin123` | operator | Оператор АЗС |

### Демо данные
- **1 торговая сеть**: "Демо сеть АЗС"
- **2 торговые точки**: Центральная и Северная АЗС
- **8 типов топлива**: АИ-92/95/98, ДТ, Пропан, Бутан
- **10 шаблонов оборудования**: ТРК, резервуары, терминалы
- **3 резервуара** с топливом
- **История цен** за последний месяц

## API Integration

### JWT Claims Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com", 
  "role": "manager",
  "network_id": "uuid",
  "trading_point_ids": ["uuid1", "uuid2"]
}
```

### RLS Helper Functions
```sql
-- Используются в RLS политиках
current_user_network_id() -- Возвращает network_id из JWT
current_user_role()       -- Возвращает роль из JWT  
current_user_id()         -- Возвращает userId из JWT
is_system_admin()         -- Проверяет system_admin роль
is_network_admin_or_higher() -- Проверяет network_admin+
```

## Производительность

### Индексы
Созданы оптимальные индексы для:
- **Фильтрация**: по network_id, status, role
- **Поиск**: по email, name, code
- **Временные запросы**: по created_at, timestamp
- **Геоданные**: по latitude, longitude

### Рекомендации
- Используйте **prepared statements** в API
- Настройте **connection pooling**
- Включите **query optimization** в Supabase
- Мониторьте **slow queries** через Dashboard

## Бэкап и восстановление

```bash
# Создание бэкапа
supabase db dump -f backup.sql

# Восстановление из бэкапа  
supabase db reset --linked
psql -h your-db-host -d postgres -f backup.sql
```

## Troubleshooting

### Частые проблемы

**1. RLS блокирует запросы**
```sql
-- Проверьте JWT claims
SELECT current_setting('request.jwt.claims', true);

-- Временно отключите RLS для тестирования
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

**2. Пользователь не видит данные**
```sql
-- Проверьте network_id пользователя
SELECT id, email, network_id FROM users WHERE email = 'user@example.com';

-- Проверьте RLS политики
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

**3. Ошибки foreign key**
```sql
-- Проверьте существование связанных записей
SELECT * FROM networks WHERE id = 'your-network-id';
SELECT * FROM trading_points WHERE network_id = 'your-network-id';
```

## Мониторинг

### Ключевые метрики
- **API Response Time**: < 200ms для основных запросов
- **Database Connections**: мониторинг pool utilization  
- **RLS Performance**: время выполнения политик
- **Storage Usage**: рост размера таблиц

### Логирование
```sql
-- Включение логирования медленных запросов
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

## Поддержка

Для получения помощи:
1. Проверьте логи в Supabase Dashboard
2. Используйте SQL Editor для диагностики
3. Обратитесь к документации Supabase
4. Создайте issue в репозитории проекта

---

**Статус миграций**: Готовы к production развертыванию ✅
**Последнее обновление**: {{ current_date }}
**Версия схемы**: 1.0.0