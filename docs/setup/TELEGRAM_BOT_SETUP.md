# 🤖 Настройка Telegram Bot для уведомлений

**Дата создания:** 2025-10-18
**Версия:** 1.0

---

## 📋 Общая информация

Telegram Bot используется для отправки уведомлений пользователям системы TradeFrame Builder.

**Архитектура:** Один бот для всего проекта (все сети используют единый бот)

**Функции:**
- ✅ Привязка Telegram аккаунта к пользователю
- ✅ Отправка уведомлений о событиях (купюроприемник, топливо, оборудование)
- ✅ Управление подписками через команды бота

---

## 🚀 Шаг 1: Создание бота через @BotFather

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду `/newbot`
3. Введите **имя бота** (отображается в списке контактов):
   ```
   TradeFrame Notifications
   ```
4. Введите **username бота** (уникальный, должен заканчиваться на `bot`):
   ```
   tradeframe_notify_bot
   ```
   > ⚠️ Если занят, попробуйте: `tradeframe_alerts_bot`, `tradeframe_notifier_bot`

5. Сохраните **токен бота**, который вам выдаст BotFather:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz-123456
   ```

### Дополнительные настройки (опционально):

```bash
# Установить описание бота
/setdescription
# Введите:
Бот для получения уведомлений о событиях в системе TradeFrame Builder

# Установить краткое описание
/setabouttext
# Введите:
Уведомления о событиях на АЗС: купюроприемники, топливо, оборудование

# Добавить аватар
/setuserpic
# Загрузите изображение (логотип проекта)
```

---

## 🗄️ Шаг 2: Применение миграции БД

Выполните SQL миграцию для создания таблицы временных кодов:

```bash
# Подключитесь к Supabase через SQL Editor или используйте CLI
psql -h <your-supabase-host> -U postgres -d postgres -f supabase/migrations/20251018_create_telegram_link_codes.sql
```

Или через **Supabase Dashboard**:
1. Откройте SQL Editor
2. Скопируйте содержимое файла `supabase/migrations/20251018_create_telegram_link_codes.sql`
3. Выполните запрос

**Результат:** Создана таблица `telegram_link_codes` с индексами и RLS политиками.

---

## ⚙️ Шаг 3: Настройка переменных окружения

### Для Development (`server/.env`)

Добавьте в файл `server/.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
TELEGRAM_BOT_NAME=TradeFrame Notifications
```

**Замените** `YOUR_BOT_TOKEN_FROM_BOTFATHER` на реальный токен из Шага 1.

### Для Production

На production сервере добавьте в `server/.env`:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
TELEGRAM_BOT_NAME=TradeFrame Notifications
```

---

## 📦 Шаг 4: Установка зависимостей

```bash
cd server
npm install node-telegram-bot-api
```

---

## 🔧 Шаг 5: Запуск бота

После установки пакетов и настройки переменных окружения:

```bash
# Development
cd server
node index.js
```

В логах должно появиться:

```
[Telegram Bot] Initialized successfully: @tradeframe_notify_bot
[Telegram Bot] Polling started
```

---

## 🔗 Процесс привязки пользователя

### Frontend → Backend

1. Пользователь нажимает **"Привязать Telegram"** на странице `/settings/notifications`
2. Frontend вызывает API: `POST /api/notifications/telegram/generate-link`
3. Backend генерирует уникальный код и сохраняет в `telegram_link_codes`
4. Frontend получает ссылку: `https://t.me/tradeframe_notify_bot?start=ABC123XYZ`

### Telegram → Backend

5. Пользователь открывает ссылку → Telegram открывается с ботом
6. Пользователь нажимает **"Start"**
7. Бот получает команду: `/start ABC123XYZ`
8. Бот проверяет код в БД:
   - Код существует? ✅
   - Не истёк (< 15 минут)? ✅
   - Не использован ранее? ✅
9. Бот сохраняет `telegram_chat_id` в `user_notification_settings`:
   ```sql
   UPDATE user_notification_settings
   SET telegram_chat_id = {chat_id},
       telegram_verified = true,
       telegram_username = '@{username}'
   WHERE user_id = {user_id_from_code}
   ```
10. Бот отправляет подтверждение: **"✅ Аккаунт успешно привязан!"**

---

## 📨 Отправка уведомлений

### Триггер отправки

Уведомления отправляются автоматически при создании записи в таблице `notifications`:

1. **Cron-задача** проверяет условия (например, купюроприемник заполнен > 80%)
2. Создаёт запись в `notifications`:
   ```sql
   INSERT INTO notifications (tenant_id, notification_type, priority, message, metadata)
   VALUES ('network-uuid', 'bill_acceptor_threshold', 'high', 'Купюроприемник заполнен', {...})
   ```
3. **Backend** находит пользователей с подпиской:
   ```sql
   SELECT ns.user_id, ns.telegram_chat_id, ns.email
   FROM user_notification_settings ns
   JOIN user_notification_subscriptions sub ON sub.user_id = ns.user_id
   WHERE sub.notification_type = 'bill_acceptor_threshold'
     AND sub.enabled = true
     AND ns.telegram_verified = true
   ```
4. **Telegram Bot** отправляет сообщения:
   ```javascript
   bot.sendMessage(telegram_chat_id, "⚠️ Купюроприемник на ТТ #4 заполнен на 90%")
   ```

---

## 🧪 Тестирование

### Проверка подключения бота

```bash
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

**Ожидаемый ответ:**
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "TradeFrame Notifications",
    "username": "tradeframe_notify_bot"
  }
}
```

### Тестирование привязки

1. Откройте `/settings/notifications`
2. Нажмите **"Привязать Telegram"**
3. Скопируйте ссылку или откройте в Telegram
4. Нажмите **"Start"** в боте
5. Должно прийти сообщение: **"✅ Аккаунт успешно привязан!"**

### Тестирование отправки

Создайте тестовое уведомление через backend:

```bash
curl -X POST http://localhost:3001/api/notifications/test-send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "your-user-uuid",
    "message": "Тестовое уведомление от TradeFrame"
  }'
```

---

## 🔒 Безопасность

### Защита токена

- ✅ Токен хранится только в `server/.env`
- ✅ НЕ коммитится в Git (добавлен в `.gitignore`)
- ✅ Не передаётся на frontend

### RLS политики

- ✅ Пользователи видят только свои коды привязки
- ✅ Только сервисная роль может обновлять коды

### Валидация кодов

- ✅ Код действителен только 15 минут
- ✅ Код можно использовать только один раз
- ✅ Автоматическая очистка истёкших кодов

---

## 📊 Мониторинг

### Логи бота

```bash
# Проверка логов в production
pm2 logs tradeframe-backend --lines 100 | grep "Telegram Bot"
```

### Статистика отправки

```sql
-- Количество отправленных уведомлений за сегодня
SELECT COUNT(*)
FROM notifications
WHERE created_at >= CURRENT_DATE
  AND delivery_channels @> '["telegram"]';

-- Количество привязанных пользователей
SELECT COUNT(*)
FROM user_notification_settings
WHERE telegram_verified = true;
```

---

## 🐛 Troubleshooting

### Бот не отвечает

1. Проверьте токен:
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   ```
2. Проверьте логи backend:
   ```bash
   cd server && node index.js
   # Должно быть: [Telegram Bot] Initialized successfully
   ```

### Привязка не работает

1. Проверьте таблицу `telegram_link_codes`:
   ```sql
   SELECT * FROM telegram_link_codes ORDER BY created_at DESC LIMIT 10;
   ```
2. Проверьте срок действия кода (должен быть < 15 минут)

### Уведомления не приходят

1. Проверьте `telegram_chat_id` в БД:
   ```sql
   SELECT user_id, telegram_chat_id, telegram_verified
   FROM user_notification_settings
   WHERE telegram_verified = true;
   ```
2. Проверьте подписки пользователя:
   ```sql
   SELECT * FROM user_notification_subscriptions
   WHERE user_id = 'your-uuid' AND enabled = true;
   ```

---

## 📚 Связанные файлы

- `server/routes/telegram.js` - Основная логика бота
- `server/routes/notifications.js` - Интеграция отправки
- `supabase/migrations/20251018_create_telegram_link_codes.sql` - Миграция БД
- `src/services/notificationService.ts` - Frontend API
- `src/pages/UserNotificationSettings.tsx` - UI настроек

---

## 🔗 Полезные ссылки

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [node-telegram-bot-api на GitHub](https://github.com/yagop/node-telegram-bot-api)
- [BotFather команды](https://core.telegram.org/bots#6-botfather)
