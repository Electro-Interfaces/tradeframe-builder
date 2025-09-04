# Environment Setup Guide

Инструкции по настройке окружения для Tradeframe Trading Platform.

## Быстрый старт

### 1. Environment Variables

```bash
# Скопируйте .env.example в .env
cp .env.example .env

# Отредактируйте переменные окружения
nano .env
```

### 2. Настройка Supabase

1. Создайте проект в [Supabase](https://supabase.com/)
2. Получите credentials из Settings → API
3. Обновите `.env` файл:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Запуск миграций

**Вариант A: Supabase Dashboard**
1. Откройте SQL Editor в Dashboard
2. Выполните миграции последовательно:
   - `migrations/001_initial_schema.sql`
   - `migrations/002_row_level_security.sql`
   - `migrations/003_seed_data.sql`

**Вариант B: Supabase CLI**
```bash
# Установка CLI
npm install -g supabase

# Логин и связывание проекта
supabase login
supabase link --project-ref your-project-id

# Выполнение миграций
supabase db push
```

### 4. Запуск приложения

```bash
# Установка зависимостей
npm install

# Параллельный запуск frontend и API
npm run dev      # Frontend (port 3000)
npm run api:dev  # API server (port 3001)
```

## Переменные окружения

### Frontend (.env)

```bash
# API Configuration
VITE_API_URL=http://localhost:3001/api/v1
VITE_USE_HTTP_API=true

# Supabase (Client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)

```bash
# Supabase (Server-side)
SUPABASE_SERVICE_KEY=your-service-key

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret

# Database
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# Server
API_PORT=3001
```

## Тестовые пользователи

После миграций доступны тестовые аккаунты:

| Email | Пароль | Роль | Описание |
|-------|--------|------|----------|
| `admin@tradeframe.com` | `admin123` | system_admin | Системный администратор |
| `network.admin@demo-azs.ru` | `admin123` | network_admin | Админ демо сети |
| `manager@demo-azs.ru` | `admin123` | manager | Менеджер АЗС |
| `operator@demo-azs.ru` | `admin123` | operator | Оператор АЗС |

## Архитектура аутентификации

### JWT Payload Structure

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'operator' | 'manager' | 'network_admin' | 'system_admin';
  network_id?: string;
  trading_point_ids?: string[];
  permissions: Array<{
    resource: string;
    action: string;
    scope?: 'global' | 'network' | 'trading_point';
  }>;
}
```

### Middleware Functions

- `authenticateToken` - проверка JWT токена
- `requireRole(['manager'])` - проверка роли пользователя
- `requireNetworkAccess` - доступ к конкретной сети
- `requireTradingPointAccess` - доступ к торговой точке

## Development vs Production

### Development
```bash
VITE_API_URL=http://localhost:3001/api/v1
JWT_SECRET=tradeframe-dev-secret-change-in-production
```

### Production
```bash
VITE_API_URL=https://api.yourdomain.com/api/v1
JWT_SECRET=your-secure-production-secret-256-bit-minimum
JWT_REFRESH_SECRET=your-secure-refresh-secret-256-bit-minimum
```

## Безопасность

### ⚠️ ВАЖНО - НЕ ПОПАДАЕТ В GIT

Никогда не коммитьте:
- `.env` файлы с реальными секретами
- `SUPABASE_SERVICE_KEY`
- Production `JWT_SECRET`

### ✅ Безопасные для клиента

Можно использовать в браузере:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL`

## Troubleshooting

### 1. API Server не запускается

```bash
# Проверьте порт
lsof -i :3001

# Проверьте переменные окружения
echo $SUPABASE_SERVICE_KEY
echo $JWT_SECRET
```

### 2. RLS блокирует запросы

```sql
-- Проверьте JWT claims в Supabase
SELECT current_setting('request.jwt.claims', true);

-- Временно отключите RLS для отладки
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

### 3. Frontend не подключается к API

```bash
# Проверьте CORS настройки в server.ts
# Проверьте VITE_API_URL в .env
# Убедитесь что API сервер запущен на правильном порту
```

## Monitoring

### Key Metrics
- API Response Time: < 200ms
- Database Connections: мониторинг pool utilization
- JWT Token Validity: проверка истечения токенов
- RLS Performance: время выполнения политик

### Health Checks
```bash
# API Health
curl http://localhost:3001/health

# Database Connection
curl http://localhost:3001/api/v1/health/db
```

## Next Steps

После настройки окружения:

1. ✅ Запустите миграции БД
2. ✅ Протестируйте аутентификацию с тестовыми пользователями
3. ⏳ Переключите frontend сервисы с localStorage на API
4. ⏳ Настройте CI/CD pipeline
5. ⏳ Добавьте мониторинг и логирование

---

**Ready for Migration**: Все критические компоненты настроены ✅  
**Next Phase**: Интеграция frontend с API endpoints