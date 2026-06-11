# 📨 Система Broadcast Сообщений - Инструкция по настройке

> ⚠️ **Статус: История (legacy).** UI-раздел «Рассылка сообщений» удалён из приложения — оповещения переведены в чат «Новости». Backend-эндпоинт `/api/messages` (`server/routes/messagesRuntime.js`) и таблицы БД сохранены, но из интерфейса больше не вызываются. Документ оставлен как справка по backend-механике рассылки.

## ✅ Что уже сделано

### 1. База данных (PostgreSQL)
✅ Таблицы созданы успешно:
- `broadcast_messages` - сообщения для рассылки (0 записей)
- `message_recipients` - получатели сообщений (0 записей)
- `message_templates` - шаблоны сообщений (0 записей)
- `message_attachments` - вложения (0 записей)

### 2. Backend API
✅ Создан полный набор endpoints в `server/routes/messagesRuntime.js`:
- `GET /api/messages` - список сообщений
- `GET /api/messages/:id` - конкретное сообщение
- `POST /api/messages` - создать сообщение
- `PUT /api/messages/:id` - обновить сообщение
- `DELETE /api/messages/:id` - удалить сообщение
- `POST /api/messages/:id/send` - отправить сообщение
- `GET /api/messages/:id/stats` - статистика сообщения

✅ Интеграция с существующими сервисами:
- `server/telegram-bot-runtime.js` - отправка через Telegram
- `server/services/emailService.js` - отправка через Email

### 3. Frontend
✅ Создана страница `/network/broadcast-messages`:
- Форма создания сообщения
- Выбор каналов доставки (Telegram, Email)
- Выбор получателей (все, по ролям, конкретные)
- История отправленных сообщений
- Статистика доставки

## 📋 Что нужно доделать

### 1. Применить backend миграции PostgreSQL

```bash
cd server
node db/migrate.js
```

Ключевая миграция для broadcast сообщений:
`server/db/migrations/070_messaging.sql`

### 2. Проверить настройки Telegram Bot

В файле `server/.env` должны быть установлены:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_@BotFather
TELEGRAM_BOT_NAME=TradeControl Notifications
TELEGRAM_BOT_USERNAME=TradeControlDW_Bot
```

### 3. Проверить настройки Email (опционально)

В файле `server/.env` для отправки email:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### 4. Перезапустить backend сервер

```bash
cd server
node index.js
```

Или через PM2:
```bash
pm2 restart tradeframe-prod-backend
```

### 5. Открыть страницу в браузере

Перейдите на:
```
http://localhost:3000/network/broadcast-messages
```

Или на production:
```
https://prod.dataworker.ru/network/broadcast-messages
```

## 🧪 Тестирование

### 1. Создание тестового сообщения

1. Откройте страницу `/network/broadcast-messages`
2. Заполните форму:
   - Заголовок: "Тестовое сообщение"
   - Текст: "Это тестовое сообщение для проверки системы рассылки"
   - Тип: "Новости"
   - Приоритет: "Средний"
   - Каналы: выберите Telegram и/или Email
   - Получатели: "Все пользователи"
3. Нажмите "Сохранить черновик" или "Отправить сейчас"

### 2. Проверка получения

**Для Telegram:**
1. Убедитесь что пользователь привязал Telegram через `/settings/notifications`
2. Открыл бота @TradeControlDW_Bot и выполнил `/start [код]`
3. Получил подтверждение привязки

**Для Email:**
1. Убедитесь что у пользователя настроен email в `user_notification_settings`
2. Email уведомления включены (`email_enabled = true`)

### 3. Проверка API endpoints

```bash
# Получить список сообщений
curl http://localhost:3001/api/messages

# Создать тестовое сообщение
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "author_id": "user-uuid-here",
    "title": "Test Message",
    "content": "Test content",
    "channels": ["telegram"],
    "recipient_type": "all"
  }'
```

## 📊 Мониторинг

### Проверка таблиц в PostgreSQL

```sql
-- Количество сообщений
SELECT status, COUNT(*) as count
FROM broadcast_messages
GROUP BY status;

-- Статистика доставки
SELECT
  delivery_status,
  channel,
  COUNT(*) as count
FROM message_recipients
GROUP BY delivery_status, channel;

-- Последние сообщения
SELECT
  id,
  title,
  status,
  total_recipients,
  sent_count,
  created_at
FROM broadcast_messages
ORDER BY created_at DESC
LIMIT 10;
```

### Логи backend

```bash
# Просмотр логов PM2
pm2 logs tradeframe-prod-backend

# Или если запущен напрямую
# Смотрите вывод в консоли
```

## 🚨 Troubleshooting

### Сообщения не отправляются через Telegram

1. Проверьте что Telegram Bot запущен:
   ```
   [Telegram Bot] Initialized successfully: TradeControl Notifications
   [Telegram Bot] Polling started
   ```

2. Проверьте что пользователь привязал Telegram:
   ```sql
   SELECT
     user_id,
     telegram_chat_id,
     telegram_verified
   FROM user_notification_settings
   WHERE telegram_verified = true;
   ```

3. Проверьте логи отправки:
   ```
   [Telegram Bot] Notification sent to chat 123456789: news
   ```

### Сообщения не отправляются через Email

1. Проверьте настройки SMTP в `server/.env`
2. Проверьте что Email сервис инициализирован:
   ```
   ✅ Email транспорт инициализирован
   ```
3. Проверьте что у пользователя настроен email:
   ```sql
   SELECT
     user_id,
     email_address,
     email_enabled
   FROM user_notification_settings
   WHERE email_enabled = true;
   ```

### Ошибки в frontend

1. Откройте DevTools (F12) → Console
2. Проверьте Network tab на ошибки API запросов
3. Убедитесь что backend запущен на порту 3001

## 📝 Примеры использования

### Отправка новостного сообщения всем пользователям

```javascript
const messageData = {
  author_id: 'your-user-id',
  title: 'Важное объявление!',
  content: 'С 1 января изменяются цены на топливо.\n\nПодробнее на сайте.',
  message_type: 'announcement',
  priority: 'high',
  channels: ['telegram', 'email'],
  recipient_type: 'all'
};

// Через API
POST /api/messages (создать черновик)
POST /api/messages/:id/send (отправить)

// Или сразу
// Используйте createAndSendMessage в messageService
```

### Отправка уведомления администраторам

```javascript
const messageData = {
  author_id: 'your-user-id',
  title: 'Требуется внимание',
  content: 'Обнаружена проблема с оборудованием на ТТ-5',
  message_type: 'alert',
  priority: 'critical',
  channels: ['telegram'],
  recipient_type: 'roles',
  recipient_filter: {
    role_ids: ['admin-role-uuid', 'manager-role-uuid']
  }
};
```

## 🎯 Следующие шаги

- [ ] Добавить поддержку шаблонов сообщений
- [ ] Добавить планирование отправки (scheduled_at)
- [ ] Добавить вложения к сообщениям
- [ ] Добавить фильтрацию по торговым точкам и сетям
- [ ] Добавить редактирование черновиков
- [ ] Добавить статистику прочтения сообщений
- [ ] Добавить Rich Text редактор для форматирования

## 🔗 Полезные ссылки

- **Frontend страница**: `/network/broadcast-messages`
- **API Documentation**: `server/routes/messagesRuntime.js`
- **Database Migration**: `server/db/migrations/070_messaging.sql`
- **Telegram Bot**: `server/telegram-bot-runtime.js`
- **Email Service**: `server/services/emailService.js`
