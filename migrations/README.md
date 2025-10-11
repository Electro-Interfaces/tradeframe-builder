# Инструкция по применению миграций для журнала аудита

## 📋 Что создано

Система реального журнала аудита для логирования всех действий пользователей в системе:

1. **SQL миграция** - `create-audit-log-table.sql`
2. **Типы TypeScript** - `src/types/audit.ts`
3. **Supabase сервис** - `src/services/auditLogSupabaseService.ts`
4. **Высокоуровневый сервис** - `src/services/auditLogService.ts`
5. **Интеграция в код** - логирование добавлено в:
   - Аутентификация (вход/выход)
   - Изменение цен

## 🚀 Применение миграции

### Вариант 1: Через Supabase SQL Editor (рекомендуется)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите ваш проект
3. Перейдите в раздел **SQL Editor**
4. Создайте новый запрос (New query)
5. Скопируйте содержимое файла `create-audit-log-table.sql`
6. Вставьте в редактор и нажмите **Run** или **Ctrl+Enter**
7. Проверьте успешное выполнение - должны появиться сообщения:
   - "Таблица audit_log успешно создана!"
   - "Создано индексов: 8"
   - "Создано политик безопасности: 3"
   - "Создано служебных функций: 1"

### Вариант 2: Через psql (командная строка)

```bash
# Подключитесь к вашей базе данных Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Выполните миграцию
\i migrations/create-audit-log-table.sql
```

### Вариант 3: Через инструменты миграции Node.js

Если у вас настроен инструмент миграции (например, node-postgres):

```javascript
const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  await client.connect();
  const sql = fs.readFileSync('migrations/create-audit-log-table.sql', 'utf8');
  await client.query(sql);
  await client.end();
}

runMigration();
```

## ✅ Проверка применения миграции

После применения миграции проверьте создание таблицы:

```sql
-- Проверка существования таблицы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'audit_log';

-- Проверка структуры таблицы
\d audit_log

-- Проверка индексов
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'audit_log';

-- Проверка RLS политик
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'audit_log';
```

## 📊 Структура таблицы `audit_log`

| Столбец        | Тип           | Описание                                    |
|----------------|---------------|---------------------------------------------|
| id             | UUID          | Уникальный идентификатор записи            |
| timestamp      | TIMESTAMPTZ   | Временная метка события                     |
| user_id        | UUID          | ID пользователя (FK to users)              |
| user_email     | TEXT          | Email пользователя                          |
| user_name      | TEXT          | Имя пользователя                            |
| action         | TEXT          | Описание действия                           |
| action_type    | TEXT          | Тип действия (enum)                         |
| object         | TEXT          | Название объекта                            |
| object_type    | TEXT          | Тип объекта                                 |
| object_id      | UUID          | ID объекта                                  |
| ip_address     | TEXT          | IP адрес пользователя                       |
| user_agent     | TEXT          | User-Agent браузера                         |
| details        | JSONB         | Детальная информация (before/after/reason) |
| metadata       | JSONB         | Метаданные (session_id, device_info)       |
| created_at     | TIMESTAMPTZ   | Дата создания записи                        |

## 🔐 Безопасность (RLS Policies)

Созданы следующие политики Row Level Security:

1. **Администраторы читают все** - пользователи с ролью admin/super_admin видят все записи
2. **Пользователи читают свои записи** - обычные пользователи видят только свои действия
3. **Система создает записи** - только service_role может создавать записи

## 📝 Типы действий (action_type)

- `authentication` - Вход/выход из системы
- `price_change` - Изменение цен
- `equipment_management` - Операции с оборудованием
- `user_management` - Управление пользователями
- `network_settings` - Настройки сети
- `reports` - Работа с отчетами
- `system_maintenance` - Обслуживание системы
- `legal_documents` - Правовые документы
- `data_migration` - Миграция данных
- `api_config` - Настройка API

## 🎯 Использование в коде

### Пример логирования аутентификации:

```typescript
import { auditLogService } from '@/services/auditLogService';

// Успешный вход
await auditLogService.logAuthentication('login', email, {
  user_id: user.id,
  user_name: user.name,
  role: user.role,
  success: true
});

// Неудачная попытка
await auditLogService.logAuthentication('failed_login', email, {
  reason: 'Неверный пароль',
  success: false
});
```

### Пример логирования изменения цен:

```typescript
await auditLogService.logPriceChange(
  'АЗС-1 на Ленина',  // Название торговой точки
  'tp-001',            // ID торговой точки
  'АИ-95',            // Тип топлива
  51.50,              // Старая цена
  52.50,              // Новая цена
  'Корректировка по рынку'  // Причина
);
```

### Пример логирования операций с оборудованием:

```typescript
await auditLogService.logEquipmentOperation(
  'reload',           // Тип операции
  'ТРК-1',           // Название оборудования
  'eq-001',          // ID оборудования
  {
    duration_ms: 1500,
    success: true
  }
);
```

### Получение записей журнала:

```typescript
// Все записи
const logs = await auditLogService.getAuditLogs();

// С фильтрами
const filteredLogs = await auditLogService.getAuditLogs({
  action_type: 'price_change',
  date_from: '2025-10-01',
  date_to: '2025-10-31',
  limit: 100
});

// Последние 10 записей
const recentLogs = await auditLogService.getRecentLogs(10);

// Статистика
const stats = await auditLogService.getStatistics();
```

## 🧹 Очистка старых записей

Для очистки старых записей аудита (по умолчанию старше 180 дней):

```sql
-- Удалить записи старше 180 дней
SELECT clean_old_audit_logs(180);

-- Удалить записи старше года
SELECT clean_old_audit_logs(365);
```

Или через TypeScript:

```typescript
import { AuditLogSupabaseService } from '@/services/auditLogSupabaseService';

// Удалить записи старше 180 дней
const deletedCount = await AuditLogSupabaseService.cleanOldAuditLogs(180);
```

## 🚨 Важные примечания

1. **Service Role Key** - для создания записей аудита используется Service Role Key из конфигурации API
2. **Автоматическое логирование** - сервис автоматически добавляет информацию о пользователе, IP, устройстве
3. **Не блокирует работу** - если логирование не удается, основной функционал продолжает работать
4. **JSONB поля** - details и metadata индексируются через GIN для быстрого поиска
5. **Производительность** - создано 8 индексов для оптимизации запросов

## 📚 Дополнительные ресурсы

- Типы: `src/types/audit.ts`
- Supabase сервис: `src/services/auditLogSupabaseService.ts`
- Высокоуровневый сервис: `src/services/auditLogService.ts`
- Примеры использования: `src/services/auth/authService.ts:148-165` (логирование входа)
- Примеры использования: `src/pages/Prices.tsx:536-546` (логирование цен)

## 🔄 Следующие шаги

После применения миграции рекомендуется:

1. Добавить логирование в критичные операции с оборудованием
2. Подключить страницу AuditLog.tsx к реальным данным из БД
3. Добавить логирование создания/редактирования пользователей
4. Настроить автоматическую очистку старых записей (например, через cron)
5. Создать дашборд с визуализацией статистики аудита
