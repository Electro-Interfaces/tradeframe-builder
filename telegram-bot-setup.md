# 🤖 Telegram Bot для TradeFrame - Инструкция по развертыванию

## 📋 Требования

- **Node.js** 16.0.0 или выше
- **PostgreSQL** или **Supabase** база данных
- **Telegram Bot Token** (получить у @BotFather)
- **Доступ к базе данных TradeFrame**

## 🚀 Быстрый старт

### 1. Создание Telegram бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/botfather)
2. Отправьте команду `/newbot`
3. Выберите имя бота: `TradeFrame Notifications Bot`
4. Выберите username: `tradeframe_bot` (или доступный)
5. Скопируйте полученный **Bot Token**

### 2. Настройка окружения

Создайте файл `.env` в директории с ботом:

```bash
# Telegram Bot настройки
BOT_TOKEN=123456789:ABCdefGHijklMNopqrsTUvwxyz
BOT_USERNAME=tradeframe_bot

# База данных (выберите один из вариантов)

# Для Supabase:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Для обычного PostgreSQL:
DATABASE_URL=postgresql://username:password@localhost:5432/tradeframe_db

# Для локальной разработки:
DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres
```

### 3. Установка зависимостей

```bash
# Скопируйте package.json
cp telegram-bot-package.json package.json

# Установите зависимости
npm install

# Или для разработки:
npm install --include=dev
```

### 4. Применение миграций базы данных

```bash
# Выполните SQL миграции
psql $DATABASE_URL -f create-telegram-verification-tables.sql

# Или через Supabase SQL Editor:
# Скопируйте содержимое create-telegram-verification-tables.sql и выполните
```

### 5. Запуск бота

```bash
# Продакшн режим
npm start

# Режим разработки (с автоперезагрузкой)
npm run dev
```

## 🔧 Конфигурация веб-интерфейса

### Обновление системных настроек

В веб-интерфейсе TradeFrame:

1. Перейдите в **Администрирование → Системные интеграции**
2. В разделе **Telegram Bot** введите:
   - **Bot Token**: `123456789:ABCdefGHijklMNopqrsTUvwxyz`
   - **Bot Username**: `tradeframe_bot`
3. Включите **Telegram интеграцию**
4. Нажмите **Сохранить**

### Переменные окружения для фронтенда

Добавьте в `.env` файл фронтенда:

```bash
VITE_TELEGRAM_BOT_TOKEN=123456789:ABCdefGHijklMNopqrsTUvwxyz
VITE_TELEGRAM_BOT_USERNAME=tradeframe_bot
```

## 🧪 Тестирование

### Локальное тестирование

1. Убедитесь, что бот запущен: `npm start`
2. Найдите бота в Telegram: `@tradeframe_bot`
3. Отправьте команду: `/start`
4. Бот должен ответить приветственным сообщением

### Тестирование полного цикла

1. **В веб-интерфейсе:**
   - Войдите в систему
   - Перейдите: Профиль → Интеграции
   - Нажмите "Подключить Telegram"
   - Скопируйте код (например: `TF7K2M`)

2. **В Telegram:**
   - Найдите бота `@tradeframe_bot`
   - Отправьте: `/start TF7K2M`
   - Получите подтверждение подключения

3. **Проверка в веб-интерфейсе:**
   - Обновите страницу профиля
   - Статус должен измениться на "Подключен ✅"
   - Нажмите "Тест уведомления"

## 🔍 Мониторинг и логи

### Просмотр логов

```bash
# Запуск с выводом логов
npm start

# Логи в файл
npm start > bot.log 2>&1
```

### Основные события в логах

- `VERIFICATION_ATTEMPT` - попытка верификации
- `VERIFICATION_SUCCESS` - успешная верификация  
- `VERIFICATION_FAILED` - неудачная верификация
- `WELCOME_MESSAGE` - отправка приветствия
- `BOT_ERROR` - ошибки бота
- `CRITICAL_ERROR` - критические ошибки

### Команды для мониторинга

```bash
# Проверка статуса процесса
ps aux | grep telegram-bot-handler

# Проверка подключения к БД
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  console.log('✅ БД подключена');
  return client.query('SELECT COUNT(*) FROM telegram_verification_codes');
}).then(res => {
  console.log('📊 Активных кодов:', res.rows[0].count);
  client.end();
});
"
```

## 🚀 Продакшн развертывание

### Вариант 1: Обычный VPS/сервер

1. **Установка Node.js и PM2:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2
npm install -g pm2
```

2. **Развертывание:**
```bash
# Клонирование и настройка
git clone <your-repo>
cd tradeframe-telegram-bot
npm install --production

# Настройка переменных окружения
cp .env.example .env
nano .env

# Запуск через PM2
pm2 start telegram-bot-handler.js --name="tradeframe-bot"
pm2 save
pm2 startup
```

### Вариант 2: Docker

Создайте `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY telegram-bot-handler.js ./

EXPOSE 3000
CMD ["npm", "start"]
```

Запуск:
```bash
docker build -t tradeframe-bot .
docker run -d --env-file .env --name tradeframe-bot tradeframe-bot
```

### Вариант 3: Heroku/Railway/Render

1. Добавьте в `package.json`:
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

2. Настройте переменные окружения в панели управления
3. Деплойте через Git

## ⚠️ Безопасность

### Важные рекомендации:

1. **Никогда не коммитьте `.env` файлы в Git**
2. **Используйте HTTPS для webhook'ов (продакшн)**
3. **Ограничьте доступ к базе данных**
4. **Регулярно обновляйте зависимости**
5. **Мониторьте логи на подозрительную активность**

### Настройка webhook (для продакшн):

```bash
curl -F "url=https://yourdomain.com/webhook" \
     "https://api.telegram.org/bot$BOT_TOKEN/setWebhook"
```

## 🆘 Решение проблем

### Bot не отвечает

```bash
# Проверка статуса бота
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"

# Проверка подключения к БД
node -e "require('pg').Client({connectionString:process.env.DATABASE_URL}).connect().then(()=>console.log('OK')).catch(console.error)"
```

### Коды не работают

```sql
-- Проверка таблиц
SELECT COUNT(*) FROM telegram_verification_codes WHERE is_used = false;

-- Очистка просроченных кодов
DELETE FROM telegram_verification_codes WHERE expires_at < NOW();
```

### Ошибки авторизации

```bash
# Проверка переменных окружения
echo $BOT_TOKEN
echo $DATABASE_URL

# Проверка прав доступа к БД
psql $DATABASE_URL -c "SELECT current_user;"
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи бота
2. Убедитесь в правильности настроек
3. Проверьте доступность базы данных
4. Обратитесь к администратору TradeFrame

---

**Версия:** 1.0.0  
**Дата:** 06.09.2025  
**Автор:** TradeFrame Development Team