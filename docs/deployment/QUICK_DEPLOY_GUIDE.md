# 🚀 Руководство по быстрому деплою TradeControl

## 📋 Обзор системы деплоя

TradeControl использует **прямой SSH деплой** на VPS сервер с автоматическим управлением через PM2.

### Архитектура production сервера

**Сервер:** 194.135.36.195 (prod.dataworker.ru)
**Путь:** `/var/www/www-root/data/www/prod.dataworker.ru`
**URL:** https://prod.dataworker.ru

**PM2 Процессы:**
1. `tradeframe-prod` - Frontend (Vite preview на порту 3006)
2. `tradeframe-backend-proxy` - Backend API (Express на порту 3001)

---

## ⚡ Быстрый деплой (рекомендуется)

### Вариант 1: PowerShell (Windows)

```powershell
# Требуется: PuTTY (plink, pscp)
.\quick-deploy.ps1
```

**Что делает скрипт:**
1. ✅ Собирает production bundle (`npm run build:prod`)
2. ✅ Создает архив `dist.tar.gz`
3. ✅ Загружает архив на сервер
4. ✅ Останавливает PM2 процессы
5. ✅ Разворачивает новые файлы
6. ✅ Обновляет backend файлы (sts.js)
7. ✅ Перезапускает PM2
8. ✅ Проверяет статус и версию

**Время выполнения:** ~2-3 минуты

---

### Вариант 2: Bash (Linux/Mac/Git Bash)

```bash
# Сделать исполняемым (один раз)
chmod +x quick-deploy.sh

# Запустить деплой
./quick-deploy.sh
```

---

### Вариант 3: Node.js (кроссплатформенный)

```bash
# Требуется: node-ssh установлен
node deploy-auto.cjs
```

**Примечание:** Требует пакет `node-ssh` (уже установлен в devDependencies).

---

## 🔐 Учетные данные

**SSH доступ:**
- Host: `194.135.36.195`
- Username: `root`
- Password: `n3cBMDPU2@N*C`
- Port: `22`

**⚠️ ВАЖНО:** Пароль хранится в скриптах для автоматизации. В production окружении рекомендуется использовать SSH ключи.

---

## 📦 Ручной деплой (пошагово)

Если автоматические скрипты не работают, используйте эти команды:

### Шаг 1: Сборка

```bash
npm run build:prod
```

### Шаг 2: Создание архива

```bash
cd dist
tar -czf ../dist.tar.gz .
cd ..
```

### Шаг 3: Загрузка на сервер

```bash
scp dist.tar.gz root@194.135.36.195:/tmp/
# Пароль: n3cBMDPU2@N*C
```

### Шаг 4: Остановка PM2

```bash
ssh root@194.135.36.195 "pm2 stop tradeframe-prod"
# Пароль: n3cBMDPU2@N*C
```

### Шаг 5: Развертывание

```bash
ssh root@194.135.36.195 "cd /var/www/www-root/data/www/prod.dataworker.ru && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"
```

### Шаг 6: Обновление backend (опционально)

```bash
scp server/routes/sts.js root@194.135.36.195:/var/www/www-root/data/www/prod.dataworker.ru/server/routes/
```

### Шаг 7: Перезапуск PM2

```bash
ssh root@194.135.36.195 "pm2 restart tradeframe-prod tradeframe-backend-proxy"
```

### Шаг 8: Проверка статуса

```bash
ssh root@194.135.36.195 "pm2 list"
```

---

## 🔍 Проверка деплоя

### 1. Проверка версии приложения

```bash
ssh root@194.135.36.195 "grep -r 'APP_VERSION = ' /var/www/www-root/data/www/prod.dataworker.ru/dist/assets/*.js | head -1"
```

Должно вывести: `APP_VERSION = "1.5.30"`

### 2. Проверка PM2 статуса

```bash
ssh root@194.135.36.195 "pm2 status"
```

Оба процесса должны быть в статусе `online`:
- ✅ `tradeframe-prod` - online
- ✅ `tradeframe-backend-proxy` - online

### 3. Проверка в браузере

Откройте: https://prod.dataworker.ru

**Что проверить:**
- ✅ Приложение загружается
- ✅ Версия в футере: `v1.5.30`
- ✅ Логин работает
- ✅ API запросы выполняются
- ✅ Нет ошибок в Console

### 4. Проверка логов

```bash
# Frontend логи
ssh root@194.135.36.195 "pm2 logs tradeframe-prod --lines 50"

# Backend логи
ssh root@194.135.36.195 "pm2 logs tradeframe-backend-proxy --lines 50"
```

---

## 🛠️ Устранение проблем

### Проблема: PM2 процесс не запускается

**Решение:**
```bash
ssh root@194.135.36.195
cd /var/www/www-root/data/www/prod.dataworker.ru
pm2 delete tradeframe-prod
pm2 start ecosystem.config.cjs
pm2 save
```

### Проблема: Порт уже занят

**Решение:**
```bash
ssh root@194.135.36.195
# Найти процесс на порту 3006
lsof -i :3006
# Убить процесс
kill -9 <PID>
pm2 restart tradeframe-prod
```

### Проблема: 502 Bad Gateway

**Причина:** Frontend процесс не запущен

**Решение:**
```bash
ssh root@194.135.36.195
pm2 restart tradeframe-prod
pm2 logs tradeframe-prod
```

### Проблема: API запросы не работают

**Причина:** Backend proxy не запущен

**Решение:**
```bash
ssh root@194.135.36.195
pm2 restart tradeframe-backend-proxy
pm2 logs tradeframe-backend-proxy
```

---

## 📊 Конфигурация PM2

Файл: `ecosystem.config.cjs`

```javascript
{
  name: 'tradeframe-prod',
  script: 'npx',
  args: 'vite preview --port 3006 --host 0.0.0.0',
  cwd: '/var/www/www-root/data/www/prod.dataworker.ru',
  instances: 1,
  autorestart: true,
  max_memory_restart: '500M'
}
```

---

## 🔄 Откат версии (Rollback)

Если новая версия работает некорректно:

### Вариант 1: Быстрый откат через PM2

```bash
ssh root@194.135.36.195
cd /var/www/www-root/data/www/prod.dataworker.ru
# Восстановить из бэкапа (если есть)
cp -r dist.backup dist
pm2 restart tradeframe-prod
```

### Вариант 2: Повторный деплой предыдущей версии

1. Локально переключитесь на предыдущий коммит
2. Запустите деплой скрипт
3. Проверьте работоспособность

---

## 📝 Чеклист перед деплоем

- [ ] Протестировано локально (`npm run dev`)
- [ ] Production build работает (`npm run build:prod && npm run preview`)
- [ ] Версия обновлена в `src/config/version.ts`
- [ ] Нет критических ошибок в консоли
- [ ] API endpoints проверены
- [ ] Создан git commit с описанием изменений
- [ ] Создан бэкап текущей версии на сервере (опционально)

---

## 🎯 После деплоя

1. ✅ Проверить https://prod.dataworker.ru
2. ✅ Проверить версию в футере
3. ✅ Проверить основные функции
4. ✅ Проверить PM2 статус
5. ✅ Проверить логи на ошибки
6. ✅ Уведомить команду о новой версии

---

## 🔒 Безопасность

### Рекомендации для production:

1. **Использовать SSH ключи вместо пароля:**
   ```bash
   ssh-keygen -t rsa -b 4096
   ssh-copy-id root@194.135.36.195
   ```

2. **Удалить пароли из скриптов:**
   - Использовать переменные окружения
   - Использовать `.env` файлы (не коммитить в git)

3. **Настроить firewall:**
   ```bash
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw allow 22/tcp
   ufw enable
   ```

4. **Регулярные бэкапы:**
   ```bash
   ssh root@194.135.36.195 "cd /var/www/www-root/data/www && tar -czf prod-backup-$(date +%Y%m%d).tar.gz prod.dataworker.ru"
   ```

---

## 📚 Дополнительная документация

- `DEPLOYMENT.md` - Полное руководство по развертыванию
- `DEPLOYMENT_HISTORY.md` - История деплоев
- `DEPLOY_AUTO.md` - Документация по автоматизации
- `ecosystem.config.cjs` - Конфигурация PM2

---

## 🆘 Поддержка

При проблемах с деплоем:
1. Проверьте логи PM2
2. Проверьте статус сервера
3. Проверьте доступность портов
4. Проверьте наличие свободного места на диске

**Контакты технической поддержки:**
- Проверка статуса: `ssh root@194.135.36.195 "pm2 status"`
- Просмотр логов: `ssh root@194.135.36.195 "pm2 logs"`

---

*Документ обновлен: 2025-10-14*
*Версия приложения: TradeControl v1.5.30*
