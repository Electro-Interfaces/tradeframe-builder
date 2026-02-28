# Система уведомлений TradeControl Builder

## Статус реализации: Этап 1 завершен ✅

Дата: 2025-10-18
Версия: 1.0

---

## 🎯 Что реализовано

### ✅ База данных (Supabase)
Созданы 6 таблиц в PostgreSQL:

1. **notification_rules** - правила автоматических уведомлений
2. **notifications** - сгенерированные уведомления
3. **user_notification_settings** - настройки пользователя (email, Telegram, режим "не беспокоить")
4. **user_notification_subscriptions** - подписки пользователя на типы событий
5. **role_notification_subscriptions** - подписки роли (наследуются пользователями)
6. **notification_delivery_log** - журнал доставки уведомлений

**Файл миграции**: `supabase-migrations/001_notifications_tables_simple.sql`

### ✅ Backend (Node.js + Express)

#### Сервисы
- **`server/services/emailService.js`** - отправка Email через nodemailer
- **`server/services/telegramService.js`** - отправка сообщений через Telegram Bot API
- **`server/services/notificationEngine.js`** - ядро системы (проверка правил, генерация уведомлений)
- **`server/services/notificationScheduler.js`** - планировщик на node-cron

#### API Endpoints
- **`POST /api/telegram/webhook`** - webhook для Telegram Bot
- **`POST /api/telegram/generate-link-code`** - генерация кода привязки Telegram

#### Cron Jobs
- Проверка порогов купюроприемника: каждые 6 часов (`0 */6 * * *`)
- Проверка оборудования offline: каждые 30 минут (`*/30 * * * *`)
- Проверка низкого уровня топлива: каждые 4 часа (`0 */4 * * *`)

### ✅ Frontend (React + TypeScript)

#### TypeScript Types
**`src/types/notification.ts`**
- `NotificationRule` - правило уведомления
- `Notification` - уведомление
- `UserNotificationSettings` - настройки пользователя
- `UserNotificationSubscription` - подписка пользователя
- `RoleNotificationSubscription` - подписка роли

#### Сервисы
**`src/services/notificationService.ts`** - прямая работа с Supabase:
- `getNotificationRules()` - получить правила
- `createNotificationRule()` - создать правило
- `updateNotificationRule()` - обновить правило
- `getNotifications()` - получить уведомления
- `getUserNotificationSettings()` - получить настройки пользователя
- `updateUserNotificationSettings()` - обновить настройки
- `generateTelegramLinkCode()` - сгенерировать код привязки Telegram

#### UI Компоненты
**`src/pages/NetworkNotifications.tsx`** - базовая страница уведомлений (с моковыми данными)

---

## 🔧 Настройка

### Переменные окружения

Создайте файл `server/.env`:

```env
# База данных (уже настроено в коде)
SUPABASE_URL=https://ynwbmxvqucmvjhmsxtqh.supabase.co
SUPABASE_SERVICE_KEY=ваш-service-role-key

# Email (nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token-from-@BotFather
TELEGRAM_BOT_USERNAME=YourBotUsername

# Server
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://prod.dataworker.ru,http://localhost:3000
```

### Установка зависимостей

```bash
cd server
npm install
```

Зависимости (уже добавлены в package.json):
- `node-cron` - планировщик задач
- `@supabase/supabase-js` - Supabase клиент
- `nodemailer` - отправка email

### Запуск

```bash
cd server
node index.js
```

Вы увидите:
```
✅ Notification Scheduler started
Backend Proxy Server started
Environment: production
Port: 3001
```

---

## 📊 Архитектура

### Поток данных

```
Frontend (React)
    ↓ прямой доступ
Supabase (PostgreSQL)
    ↑ чтение данных
Backend Notification Engine
    ↓ отправка
Email Service / Telegram Service
```

**Важно**: Frontend работает с Supabase НАПРЯМУЮ, без REST API прослойки.

### Типы событий

1. **`bill_acceptor_threshold`** - превышение порога купюроприемника
2. **`equipment_offline`** - оборудование не на связи (заглушка)
3. **`low_fuel_level`** - низкий уровень топлива (заглушка)
4. **`shift_not_closed`** - незакрытая смена (заглушка)

### Каналы доставки

- **email** - Email через SMTP
- **telegram** - Telegram Bot

### Приоритеты

- **low** - низкий (информационные)
- **medium** - средний (предупреждения)
- **high** - высокий (критичные)
- **critical** - критический (требует немедленного внимания)

---

## 🚀 Первое правило: Пороги купюроприемника

### Как работает

1. **Cron job** каждые 6 часов запускает проверку
2. **Notification Engine** получает все активные правила типа `bill_acceptor_threshold`
3. Для каждой торговой точки проверяется:
   - Количество купюр в купюроприемнике
   - Сравнивается с порогами (warning/critical)
4. Если порог превышен → создается уведомление
5. Получатели определяются из `recipients` правила (роли + пользователи)
6. Отправка через Email и/или Telegram
7. Запись в `notification_delivery_log`

### Пороги по умолчанию

```javascript
const thresholds = {
  'C0001': { billCountWarning: 150, billCountCritical: 200 },
  'C0002': { billCountWarning: 180, billCountCritical: 250 },
  'C0003': { billCountWarning: 120, billCountCritical: 180 }
};
```

### Пример правила

```json
{
  "name": "Контроль купюроприемников",
  "type": "bill_acceptor_threshold",
  "is_active": true,
  "rule_config": {
    "checkType": "count",
    "warningLevel": "critical",
    "applyToAllStations": true
  },
  "schedule_type": "cron",
  "schedule_config": {
    "cronExpression": "0 */6 * * *"
  },
  "notification_config": {
    "channels": ["email", "telegram"],
    "priority": "high"
  },
  "recipients": {
    "roles": ["role-uuid-1"],
    "users": []
  }
}
```

---

## 🔗 Привязка Telegram

### Для пользователя

1. Зайти в настройки уведомлений
2. Нажать "Привязать Telegram"
3. Получить ссылку вида: `https://t.me/YourBot?start=ABC12345`
4. Перейти по ссылке, нажать "Start"
5. Telegram привязан (chat_id сохранен в `user_notification_settings`)

### Для разработчика

```typescript
// Генерация кода привязки
const { linkCode, telegramLink, expiresAt } =
  await generateTelegramLinkCode(userId);

// Показать пользователю telegramLink
// Код действителен 15 минут
```

### Webhook обработка

Когда пользователь нажимает `/start ABC12345` в боте:

1. Telegram отправляет webhook на `/api/telegram/webhook`
2. Backend извлекает `linkCode` из сообщения
3. Ищет запись в `user_notification_settings` с этим кодом
4. Обновляет `telegram_chat_id` и `telegram_verified = true`
5. Очищает `telegram_link_code`

---

## 📋 Что дальше (Этапы 2-4)

### Этап 2: UI для правил
- Список правил с фильтрами
- Создание/редактирование правила
- Переключатель активности
- История срабатываний

### Этап 3: Настройки пользователя
- Email настройки
- Telegram привязка
- Режим "Не беспокоить"
- Подписки на типы событий

### Этап 4: История уведомлений
- Список всех уведомлений
- Фильтры (тип, приоритет, статус)
- Отметка "прочитано"
- Журнал доставки

---

## 🐛 Отладка

### Проверить таблицы в Supabase

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'notification%'
ORDER BY table_name;
```

### Проверить правила

```sql
SELECT id, name, type, is_active, last_check_at, last_notification_at
FROM notification_rules;
```

### Проверить уведомления

```sql
SELECT id, type, title, priority, status, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

### Проверить логи доставки

```sql
SELECT
  n.title,
  u.full_name,
  dl.channel,
  dl.status,
  dl.sent_at
FROM notification_delivery_log dl
JOIN notifications n ON dl.notification_id = n.id
JOIN users u ON dl.user_id = u.id
ORDER BY dl.sent_at DESC
LIMIT 20;
```

### Логи сервера

```bash
cd server
node index.js

# Вы должны увидеть:
# ✅ Notification Scheduler started
# ⚠️ Email сервис не настроен (если не указали SMTP)
# ⚠️ Telegram бот не настроен (если не указали TOKEN)
```

### Тестовый запуск проверки

В `notificationScheduler.js` можно вызвать вручную:

```javascript
const scheduler = require('./services/notificationScheduler');

// Запустить проверку купюроприемников вручную
scheduler.runManualCheck('checkBillAcceptors')
  .then(result => console.log(result));
```

---

## 📞 Контакты

При проблемах проверьте:
1. Переменные окружения в `server/.env`
2. Подключение к Supabase
3. Логи сервера
4. Таблицы в Supabase Dashboard

---

**Статус**: Базовая инфраструктура готова ✅
**Следующий шаг**: Создать UI для управления правилами уведомлений
