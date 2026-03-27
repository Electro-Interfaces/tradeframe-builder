# 🚀 Руководство по деплою TradeControl

## 📋 Архитектура деплоя

Используется система **двух репозиториев** для TEST и PRODUCTION сред:

```
┌────────────────────────────────────────────────────────────┐
│  GitHub: Electro-Interfaces/tradeframe-builder            │
│  Branch: main                                              │
│  Push → GitHub Actions → Auto Deploy to TEST               │
│  URL: https://testtf.dataworker.ru                         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  GitHub: Electro-Interfaces/TradeControl                   │
│  Branch: main                                              │
│  Push → GitHub Actions → Auto Deploy to PRODUCTION         │
│  URL: https://prod.dataworker.ru                           │
└────────────────────────────────────────────────────────────┘
```

## 🔐 Настройка GitHub Secrets

### Для репозитория `tradeframe-builder` (TEST)

Перейдите в: **Settings → Secrets and variables → Actions → New repository secret**

Добавьте следующие секреты:

| Secret Name | Описание | Пример значения |
|------------|----------|----------------|
| `SSH_PRIVATE_KEY` | SSH ключ для доступа к серверу | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `REMOTE_HOST` | IP адрес сервера | `194.135.36.195` |
| `REMOTE_USER` | Пользователь SSH | `root` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Секрет подписи app-токенов | `your_jwt_secret` |
| `STS_API_URL` | URL STS API | `https://pos.autooplata.ru/tms` |
| `STS_API_USERNAME` | STS API Username | `UserApi` |
| `STS_API_PASSWORD` | STS API Password | `your_sts_api_password` |

`deploy-test.yml` и `deploy-prod.yml` используют только `STS_API_*`. Legacy secrets `VITE_STS_*` после миграции должны быть удалены из GitHub.

### Для репозитория `TradeControl` (PRODUCTION)

Добавьте тот же набор секретов. В текущих workflow используется тот же `SSH_PRIVATE_KEY`, отдельный `SSH_PRIVATE_KEY_PROD` не требуется.

---

## 🔑 Создание SSH ключа для GitHub Actions

### 1. Генерация SSH ключа на локальной машине:

```bash
# Генерируем новый SSH ключ
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Копируем публичный ключ
cat ~/.ssh/github_deploy_key.pub
```

### 2. Добавление публичного ключа на сервер:

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Добавляем публичный ключ в authorized_keys
echo "ssh-ed25519 AAAAC3Nza... github-actions-deploy" >> ~/.ssh/authorized_keys

# Проверяем права доступа
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. Тестирование подключения:

```bash
# С локальной машины тестируем ключ
ssh -i ~/.ssh/github_deploy_key root@194.135.36.195 "echo 'SSH key works!'"
```

### 4. Добавление приватного ключа в GitHub Secrets:

```bash
# Копируем приватный ключ (ПОЛНОСТЬЮ, включая BEGIN/END строки)
cat ~/.ssh/github_deploy_key
```

Вставьте содержимое в GitHub Secret `SSH_PRIVATE_KEY`.

---

## 📝 Процесс разработки и деплоя

### Рекомендуемый рабочий поток

```bash
# 1. Работаем в локальном checkout
git add .
git commit -m "feat: описание изменений"

# 2. Сначала выкатываем в TEST
git push test main

# 3. После зелёного test-деплоя и smoke выкатываем в PROD
git push prod main
```

### Вспомогательные shell-скрипты

Если нужен запуск через shell-скрипты, используйте актуальные пути:

```bash
scripts/deploy/deploy-to-test.sh
scripts/deploy/deploy-to-prod.sh
scripts/deploy/sync-repos.sh test-to-prod
scripts/deploy/sync-repos.sh prod-to-test
```

---

## 🎯 GitHub Actions Workflows

### `.github/workflows/deploy-test.yml`

**Триггеры:**
- Push в ветку `main` репозитория `tradeframe-builder`
- Ручной запуск через GitHub UI (Actions → Deploy to TEST → Run workflow)

**Процесс:**
1. ✅ Checkout кода
2. ✅ Setup Node.js 22
3. ✅ Установка зависимостей (`npm ci`)
4. ✅ Repository guards (`npm run check:repo-guards`)
5. ✅ Синхронизация версии (`npm run sync-version`)
6. ✅ Сборка для TEST (`npm run build:prod`)
7. ✅ Создание архива `deployment.tar.gz`
8. ✅ Генерация `server/.env` из GitHub Secrets на сервере
9. ✅ Установка backend зависимостей (`npm install --production`)
10. ✅ Перезапуск PM2 процессов
11. ✅ Проверка `site` + `/api/healthz`
12. ✅ Авторизованный smoke: `auth/me`, `support/unread`, `legal/document-types`, `messages`, `sts/v2/info`

**GitHub Actions используются:**
- `actions/checkout@v6` - клонирование репозитория
- `actions/setup-node@v6` - установка Node.js
- `appleboy/scp-action@v0.1.7` - копирование файлов по SCP
- `appleboy/ssh-action@v1.0.3` - выполнение команд по SSH

### `.github/workflows/deploy-prod.yml`

**Триггеры:**
- Push в ветку `main` репозитория `TradeControl`
- Ручной запуск через GitHub UI (Actions → Deploy to PRODUCTION → Run workflow)

**Процесс:**
- Аналогично TEST, но с:
  - Production URL `https://prod.dataworker.ru`
  - Увеличенный timeout для проверки (10 сек вместо 5)
  - Тем же авторизованным smoke после деплоя

### `.github/workflows/smoke-check.yml`

**Назначение:**
- отдельная smoke-проверка без деплоя
- TEST: по расписанию каждые 4 часа и вручную
- PRODUCTION: вручную

**Что проверяет:**
- публичный сайт
- `/api/healthz`
- авторизованный smoke: `auth/me`, `support/unread`, `legal/document-types`, `messages`, `sts/v2/info`

---

## 🛡️ Environment Protection для Production

Для дополнительной безопасности рекомендуется настроить **Environment Protection** в GitHub:

1. Перейдите в **Settings → Environments**
2. Создайте environment `production`
3. Настройте **Required reviewers** - укажите ответственных за approve деплоя
4. Настройте **Wait timer** - задержка перед деплоем (опционально)

После этого каждый деплой в PROD будет требовать ручного подтверждения.

---

## 📊 Мониторинг деплоя

### Просмотр логов GitHub Actions:

1. Перейдите в репозиторий на GitHub
2. Вкладка **Actions**
3. Выберите workflow run
4. Просмотрите логи каждого шага

### Просмотр логов на сервере:

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Логи PM2
pm2 logs tradeframe-test-frontend
pm2 logs tradeframe-test-backend

pm2 logs tradeframe-prod-frontend
pm2 logs tradeframe-prod-backend

# Статус процессов
pm2 list

# Системные логи Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔙 Rollback (откат версии)

### Автоматический rollback через бэкап:

Каждый деплой создает бэкап в `/var/backups/tradeframe/`. Для отката:

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Переходим в директорию
cd /var/www/www-root/data/www/prod.dataworker.ru  # или testTF.dataworker.ru

# Смотрим доступные бэкапы
ls -lh /var/backups/tradeframe/

# Восстанавливаем бэкап (пример)
tar -xzf /var/backups/tradeframe/prod-backup-20251017_235900.tar.gz

# Перезапускаем PM2
pm2 restart tradeframe-prod-frontend tradeframe-prod-backend
```

### Rollback через Git:

Безопаснее откатывать не `git reset --hard` на сервере, а повторным деплоем известного хорошего коммита:

```bash
# Локально
git log --oneline
git revert <bad-commit>
git push prod main
```

---

## 🧪 Тестирование перед настройкой

Перед первым запуском GitHub Actions рекомендуется протестировать:

### 1. Проверка SSH подключения:

```bash
ssh -i ~/.ssh/github_deploy_key root@194.135.36.195 "echo 'Connection successful!'"
```

### 2. Проверка прав доступа:

```bash
ssh -i ~/.ssh/github_deploy_key root@194.135.36.195 "ls -la /var/www/www-root/data/www/"
```

### 3. Тестовый деплой вручную:

```bash
# Сначала запустите существующие скрипты
scripts/deploy/deploy-to-test.sh

# Убедитесь что все работает
curl -I https://testtf.dataworker.ru
```

### 4. Проверка переменных окружения:

```bash
# На сервере проверяем .env файлы
ssh root@194.135.36.195 "cat /var/www/www-root/data/www/testTF.dataworker.ru/server/.env"
```

---

## ⚠️ Важные замечания

1. **Бэкапы**: Автоматически создаются в `/var/backups/tradeframe/`. Следите за местом на диске и политикой хранения.

2. **SSL сертификаты**: Certbot автоматически обновляет сертификаты Let's Encrypt. Проверьте настройку:
   ```bash
   certbot certificates
   systemctl status certbot.timer
   ```

3. **PM2 автозапуск**: Убедитесь что PM2 настроен на автозапуск:
   ```bash
   pm2 startup
   pm2 save
   ```

4. **Node версия**: GitHub Actions используют Node.js 22. На сервере желательно держать актуальный LTS:
   ```bash
   node --version  # должен быть >= v20.0.0
   ```

5. **Disk space**: Регулярно проверяйте место на диске:
   ```bash
   df -h
   du -sh /var/backups/tradeframe/*
   ```

---

## 📞 Контакты и поддержка

- **GitHub Repository (TEST)**: https://github.com/Electro-Interfaces/tradeframe-builder
- **GitHub Repository (PROD)**: https://github.com/Electro-Interfaces/TradeControl
- **TEST Environment**: https://testtf.dataworker.ru
- **PROD Environment**: https://prod.dataworker.ru

---

## 🎉 Готово!

После настройки GitHub Secrets можно делать push в main ветку, и деплой будет происходить автоматически!

```bash
git add .
git commit -m "feat: новая функция"
git push origin main

# Автоматический деплой запустится через 10-30 секунд
# Отслеживайте прогресс на GitHub → Actions
```
