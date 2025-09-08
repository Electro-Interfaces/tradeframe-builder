# 🚀 TradeFrame Telegram Verification System - Руководство по развертыванию

## 📋 Обзор системы

Система авторизации через Telegram позволяет пользователям быстро и безопасно привязывать свои аккаунты TradeFrame к Telegram для получения уведомлений.

### ✨ Особенности:
- **Без email отправки** - код отображается прямо в веб-интерфейсе
- **Мгновенное подключение** - процесс занимает менее 60 секунд
- **Безопасность** - одноразовые коды с коротким сроком жизни (15 минут)
- **Real-time обновления** - автоматическое обновление статуса в UI
- **Простота использования** - копирование кода одним кликом

---

## 🗂️ Созданные файлы

### **Backend/Services:**
1. `create-telegram-verification-tables.sql` - Миграция БД с таблицами и функциями
2. `src/services/telegramVerificationService.ts` - Сервис работы с верификацией
3. `run-telegram-migration.cjs` - Скрипт применения миграций

### **Frontend/UI:**
4. `src/components/settings/TelegramConnectionSettings.tsx` - React компонент подключения
5. `src/pages/Profile.tsx` - Обновленная страница профиля (интегрирован компонент)
6. `src/config/system.ts` - Обновленная конфигурация с поддержкой botUsername

### **Telegram Bot:**
7. `telegram-bot-handler.js` - Полноценный Node.js бот с обработкой команд
8. `telegram-bot-package.json` - Зависимости для бота
9. `telegram-bot-setup.md` - Детальная инструкция по настройке бота

### **Тестирование:**
10. `test-telegram-verification-system.html` - Интерактивная страница тестирования
11. `TELEGRAM-VERIFICATION-DEPLOYMENT-GUIDE.md` - Этот файл

---

## 🚀 Пошаговое развертывание

### **Этап 1: Подготовка базы данных**

1. **Применить миграцию:**
```bash
# Через Node.js скрипт (рекомендуется)
node run-telegram-migration.cjs

# Или напрямую через psql
psql $DATABASE_URL -f create-telegram-verification-tables.sql
```

2. **Проверить создание объектов:**
```sql
-- Проверка таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('telegram_verification_codes');

-- Проверка новых колонок в users
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name LIKE 'telegram%';

-- Проверка функций
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%telegram%';
```

### **Этап 2: Создание и настройка Telegram бота**

1. **Создание бота в Telegram:**
   - Откройте [@BotFather](https://t.me/botfather)
   - Отправьте `/newbot`
   - Укажите имя: `TradeFrame Notifications Bot`
   - Укажите username: `tradeframe_bot` (или доступный)
   - Сохраните полученный **Bot Token**

2. **Настройка команд бота:**
```
/setcommands
/start - Подключить аккаунт TradeFrame
/help - Показать справку
/status - Проверить статус подключения
```

3. **Настройка описания бота:**
```
/setdescription
Официальный бот системы TradeFrame для получения уведомлений о важных событиях и операциях.
```

### **Этап 3: Развертывание Node.js бота**

1. **Подготовка окружения:**
```bash
# Создание директории для бота
mkdir tradeframe-telegram-bot
cd tradeframe-telegram-bot

# Копирование файлов
cp telegram-bot-handler.js ./
cp telegram-bot-package.json ./package.json
```

2. **Настройка переменных окружения (.env):**
```bash
BOT_TOKEN=123456789:ABCdefGHijklMNopqrsTUvwxyz
BOT_USERNAME=tradeframe_bot
DATABASE_URL=postgresql://username:password@host:port/database
NODE_ENV=production
```

3. **Установка и запуск:**
```bash
npm install
npm start

# Для разработки с автоперезагрузкой:
npm run dev
```

### **Этап 4: Настройка веб-интерфейса**

1. **Обновление переменных окружения фронтенда (.env):**
```bash
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHijklMNopqrsTUvwxyz
VITE_TELEGRAM_BOT_USERNAME=tradeframe_bot
```

2. **Настройка системной конфигурации:**
   - Войдите как администратор
   - Перейдите в **Администрирование → Системные интеграции**
   - В разделе **Telegram Bot**:
     - Bot Token: `123456789:ABCdefGHijklMNopqrsTUvwxyz`
     - Bot Username: `tradeframe_bot`
     - Включить интеграцию: ✅
   - Сохраните настройки

3. **Пересборка фронтенда:**
```bash
npm run build
# или для разработки
npm run dev
```

---

## 🧪 Тестирование системы

### **Автоматическое тестирование:**

1. **Откройте тестовую страницу:**
```bash
# Запустите локальный сервер и откройте:
start test-telegram-verification-system.html
```

2. **Выполните полный тест:**
   - Выберите тестового пользователя
   - Нажмите "Полный тест"
   - Проверьте все этапы в логах

### **Ручное тестирование:**

1. **В веб-интерфейсе:**
   - Войдите в систему
   - Перейдите: **Профиль → Интеграции**
   - Нажмите **"Подключить Telegram"**
   - Скопируйте появившийся код

2. **В Telegram:**
   - Найдите бота `@tradeframe_bot`
   - Отправьте: `/start ВАШ_КОД`
   - Получите подтверждение подключения

3. **Проверка в веб-интерфейсе:**
   - Обновите страницу
   - Статус должен быть "Подключен ✅"
   - Нажмите "Тест уведомления"

### **Тестирование edge cases:**

```bash
# В боте протестируйте:
/start INVALID      # Неверный код
/start TF123456     # Несуществующий код  
/start              # Команда без кода
/help              # Справка
/status            # Проверка статуса
```

---

## 📊 Мониторинг и диагностика

### **Логи бота:**
```bash
# Просмотр логов
tail -f bot.log

# Ключевые события для мониторинга:
# - VERIFICATION_ATTEMPT - попытки верификации
# - VERIFICATION_SUCCESS - успешные верификации
# - VERIFICATION_FAILED - ошибки верификации
# - BOT_ERROR - ошибки бота
```

### **SQL запросы для мониторинга:**
```sql
-- Активные коды верификации
SELECT COUNT(*) as active_codes 
FROM telegram_verification_codes 
WHERE is_used = false AND expires_at > NOW();

-- Пользователи с подключенным Telegram
SELECT COUNT(*) as connected_users 
FROM users 
WHERE telegram_chat_id IS NOT NULL;

-- Статистика верификаций за последний час
SELECT 
  COUNT(*) as total_attempts,
  SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as successful
FROM telegram_verification_codes 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Очистка просроченных кодов
DELETE FROM telegram_verification_codes 
WHERE expires_at < NOW() AND is_used = false;
```

### **Health check endpoints:**
```bash
# Проверка бота через Telegram API
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Проверка подключения к БД
node -e "
const { Client } = require('pg');
new Client({connectionString: process.env.DATABASE_URL})
  .connect()
  .then(() => console.log('✅ Database OK'))
  .catch(err => console.log('❌ Database Error:', err.message));
"
```

---

## 🔧 Решение проблем

### **Проблема: Бот не отвечает**
```bash
# Диагностика:
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Решение:
1. Проверьте правильность BOT_TOKEN
2. Убедитесь, что процесс бота запущен
3. Проверьте логи на ошибки
```

### **Проблема: Код не генерируется**
```sql
-- Диагностика:
SELECT COUNT(*) FROM telegram_verification_codes;

-- Решение:
1. Проверьте подключение к БД в веб-приложении
2. Убедитесь, что миграции применены
3. Проверьте права доступа пользователя БД
```

### **Проблема: Верификация не работает**
```sql
-- Диагностика:
SELECT * FROM telegram_verification_codes 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Решение:
1. Убедитесь, что код не истек (15 минут)
2. Проверьте логи бота на ошибки
3. Убедитесь, что таблицы созданы правильно
```

---

## 🚀 Продакшн развертывание

### **1. Сервер (рекомендуется PM2):**
```bash
# Установка PM2
npm install -g pm2

# Запуск бота
pm2 start telegram-bot-handler.js --name="tradeframe-telegram-bot"

# Настройка автозапуска
pm2 save
pm2 startup

# Мониторинг
pm2 status
pm2 logs tradeframe-telegram-bot
```

### **2. Docker контейнер:**
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY telegram-bot-handler.js ./

EXPOSE 3000
CMD ["npm", "start"]
```

### **3. Systemd сервис:**
```ini
[Unit]
Description=TradeFrame Telegram Bot
After=network.target

[Service]
Type=simple
User=nodeuser
WorkingDirectory=/opt/tradeframe-bot
ExecStart=/usr/bin/node telegram-bot-handler.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

---

## 📈 Оптимизация производительности

### **Индексы БД (уже в миграции):**
```sql
-- Для быстрого поиска активных кодов
CREATE INDEX idx_telegram_codes_active 
ON telegram_verification_codes(verification_code) 
WHERE is_used = FALSE;

-- Для очистки просроченных
CREATE INDEX idx_telegram_codes_expires 
ON telegram_verification_codes(expires_at) 
WHERE is_used = FALSE;
```

### **Кэширование и оптимизация:**
- **Redis** для кэширования активных кодов (опционально)
- **Rate limiting** для предотвращения спама (встроено в бот)
- **Connection pooling** для БД (автоматически в pg)

### **Мониторинг метрик:**
```javascript
// Добавить в бот для сбора метрик
const metrics = {
  totalAttempts: 0,
  successfulVerifications: 0,
  failedAttempts: 0,
  averageResponseTime: 0
};
```

---

## 🔒 Безопасность

### **Обязательные меры:**
1. ✅ **Никогда не коммитьте .env файлы**
2. ✅ **Используйте HTTPS для webhook (продакшн)**
3. ✅ **Ограничивайте доступ к БД по IP**
4. ✅ **Регулярно обновляйте зависимости**
5. ✅ **Мониторьте подозрительную активность**

### **Rate limiting (встроено в бот):**
```javascript
const RATE_LIMITS = {
  CODE_GENERATION: {
    maxAttempts: 5,      // максимум 5 кодов
    timeWindow: 3600000, // за 1 час
  },
  INVALID_ATTEMPTS: {
    maxAttempts: 10,     // максимум 10 неверных попыток
    timeWindow: 1800000, // за 30 минут
    blockDuration: 3600000 // блок на 1 час
  }
};
```

---

## 📞 Поддержка и обратная связь

### **При возникновении проблем:**

1. **Проверьте логи системы**
2. **Убедитесь в правильности настроек**
3. **Используйте тестовую страницу для диагностики**
4. **Обратитесь к администратору TradeFrame**

### **Полезные команды:**
```bash
# Статус всех компонентов
systemctl status tradeframe-telegram-bot
systemctl status postgresql
systemctl status nginx

# Проверка портов
netstat -tlnp | grep :3000  # Веб-приложение
netstat -tlnp | grep :5432  # PostgreSQL

# Логи приложения
journalctl -u tradeframe-telegram-bot -f
tail -f /var/log/tradeframe/telegram-bot.log
```

---

## 🎉 Заключение

Система Telegram верификации TradeFrame готова к использованию! 

**Основные преимущества реализованного решения:**
- 🚀 **Быстрота** - подключение за 60 секунд
- 🔒 **Безопасность** - одноразовые коды с коротким TTL  
- 💡 **Удобство** - копирование кода одним кликом
- 🔄 **Real-time** - мгновенное обновление статуса
- 📱 **Мобильность** - работает на всех устройствах

**Версия системы:** 1.0.0  
**Дата создания:** 06.09.2025  
**Автор:** TradeFrame Development Team

---

*Система протестирована и готова к продакшн развертыванию. Следуйте инструкциям пошагово для успешного внедрения.*