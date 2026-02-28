# 🤖 Telegram Боты - Конфигурация

**Дата создания:** 22 октября 2025
**Статус:** ✅ Активны и работают

---

## 📋 Обзор

TradeControl использует **ДВА ОТДЕЛЬНЫХ** Telegram бота для разных окружений.

**⚠️ КРИТИЧНО:** Никогда не используйте один и тот же бот для PROD и TEST одновременно!

---

## 🟢 PRODUCTION Bot

### Основная информация
- **Username:** @TradeControlDW_Bot
- **Bot ID:** 8049816280
- **Full Name:** TradeControlDW
- **Назначение:** Боевая среда prod.dataworker.ru

### Токен
```
8049816280:AAEHimSlNiuyRIRA_sjrG9f78lvc9aprwa8
```

### Конфигурация на сервере
- **Сервер:** 194.135.36.195
- **Путь:** `/var/www/www-root/data/www/prod.dataworker.ru/server/.env`
- **PM2 процесс:** tradeframe-prod-backend
- **Порт:** 3001

### Проверка работы
```bash
# SSH на сервер
ssh root@194.135.36.195

# Проверка логов
pm2 logs tradeframe-prod-backend --lines 20 | grep Telegram

# Проверка через Telegram API
curl "https://api.telegram.org/bot8049816280:AAEHimSlNiuyRIRA_sjrG9f78lvc9aprwa8/getMe"
```

### Telegram ссылка
https://t.me/TradeControlDW_Bot

---

## 🔵 TEST Bot

### Основная информация
- **Username:** @TradeControlTest_Bot
- **Bot ID:** 8136366785
- **Full Name:** TradeControlTest_Bot
- **Назначение:** Тестовая среда testtf.dataworker.ru

### Токен
```
8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0
```

### Конфигурация на сервере
- **Сервер:** testtf.dataworker.ru (тот же физический сервер 194.135.36.195)
- **Путь:** `/var/www/www-root/data/www/testTF.dataworker.ru/server/.env`
- **PM2 процесс:** tradeframe-test-backend
- **Порт:** 3002

### Проверка работы
```bash
# SSH на сервер
ssh root@testtf.dataworker.ru

# Проверка логов
pm2 logs tradeframe-test-backend --lines 20 | grep Telegram

# Проверка через Telegram API
curl "https://api.telegram.org/bot8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0/getMe"
```

### Telegram ссылка
https://t.me/TradeControlTest_Bot

---

## 🛠️ Локальная разработка

### ⚠️ ВАЖНО!

**НЕ используйте PROD токен** в локальном `server/.env`!

### Варианты для локальной разработки:

**Вариант 1: Использовать TEST токен**
```env
# В локальном server/.env
TELEGRAM_BOT_TOKEN=8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0
TELEGRAM_BOT_NAME=TradeControl Test Notifications
TELEGRAM_BOT_USERNAME=TradeControlTest_Bot
```

**Вариант 2: Создать отдельный DEV бот**
1. Откройте @BotFather в Telegram
2. Команда: `/newbot`
3. Имя: `TradeControl Dev Bot`
4. Username: `@TradeControlDev_Bot` (или любой доступный)
5. Скопируйте токен в локальный `server/.env`

**Вариант 3: Отключить Telegram бот локально**
```env
# В локальном server/.env
TELEGRAM_BOT_TOKEN=
```

---

## 🔧 Типичные проблемы

### Ошибка 409 Conflict

**Симптомы:**
```
[Telegram Bot] Polling error: ETELEGRAM: 409 Conflict:
terminated by other getUpdates request
```

**Причина:**
Два или более процесса пытаются читать обновления одного бота.

**Решение:**
1. Проверьте локальный dev сервер:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill //F //PID <PID>

   # Linux/Mac
   lsof -ti:3001 | xargs kill -9
   ```

2. Проверьте webhook (должен быть удален для polling):
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
   ```

3. Перезапустите backend:
   ```bash
   pm2 restart tradeframe-prod-backend
   ```

### Ошибка 401 Unauthorized

**Причина:**
Неправильный или неполный токен.

**Решение:**
1. Проверьте токен в `.env` файле
2. Убедитесь что токен полный (должен быть вида `NUMBER:ALPHANUM`)
3. Проверьте через API:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getMe"
   ```

---

## 📊 Мониторинг

### Проверка статуса PROD
```bash
ssh root@194.135.36.195 "pm2 logs tradeframe-prod-backend --lines 20 --nostream | grep -E '(Telegram|✅|❌)'"
```

### Проверка статуса TEST
```bash
ssh root@testtf.dataworker.ru "pm2 logs tradeframe-test-backend --lines 20 --nostream | grep -E '(Telegram|✅|❌)'"
```

### Проверка обоих через API
```bash
# PROD
curl -s "https://api.telegram.org/bot8049816280:AAEHimSlNiuyRIRA_sjrG9f78lvc9aprwa8/getMe" | jq

# TEST
curl -s "https://api.telegram.org/bot8136366785:AAGeedwALOK5jIM8ACDb1i99vxjZebyRdD0/getMe" | jq
```

---

## 🔐 Безопасность

1. **Никогда не коммитьте токены** в Git
2. **Храните токены только в .env файлах** на серверах
3. **Используйте GitHub Secrets** для CI/CD
4. **Регулярно проверяйте** доступ к @BotFather
5. **При компрометации** создайте нового бота через @BotFather

---

## 📝 История изменений

- **2025-10-22:** Созданы оба бота (PROD и TEST), настроены токены, устранены конфликты 409
- **2025-10-22:** Документация создана и добавлена в CLAUDE.md

---

## 🆘 Контакты

При проблемах с ботами:
1. Проверьте этот файл
2. Проверьте `CLAUDE.md` секцию "Telegram Боты"
3. Проверьте логи PM2 на серверах
4. Проверьте @BotFather в Telegram
