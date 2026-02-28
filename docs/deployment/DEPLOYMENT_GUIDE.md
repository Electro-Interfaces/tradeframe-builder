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
| `VITE_SUPABASE_URL` | URL Supabase | `https://ssvazdgnmatbdynkhkqo.supabase.co` |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Service Role Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `VITE_STS_API_URL` | URL STS API | `https://pos.autooplata.ru/tms` |
| `VITE_STS_API_USERNAME` | STS API Username | `UserApi` |
| `VITE_STS_API_PASSWORD` | STS API Password | `lHQfLZHzB3tn` |

### Для репозитория `TradeControl` (PRODUCTION)

Добавьте те же секреты + дополнительно:

| Secret Name | Описание |
|------------|----------|
| `SSH_PRIVATE_KEY_PROD` | Отдельный SSH ключ для production (для безопасности) |

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

### Вариант 1: Разработка в TEST репозитории

```bash
# 1. Клонируем TEST репозиторий
git clone https://github.com/Electro-Interfaces/tradeframe-builder.git
cd tradeframe-builder

# 2. Создаем feature ветку
git checkout -b feature/new-functionality

# 3. Разработка
# ... делаем изменения ...

# 4. Коммитим и пушим
git add .
git commit -m "feat: добавлена новая функциональность"
git push origin feature/new-functionality

# 5. Создаем Pull Request на GitHub
# Review → Approve → Merge to main

# 6. После merge в main - автоматический деплой на TEST
# Проверяем: https://testtf.dataworker.ru

# 7. Если все протестировано - синхронизируем с PROD
./sync-repos.sh test-to-prod

# 8. В PROD репозитории делаем merge → автоматический деплой на PROD
```

### Вариант 2: Ручной деплой (если нужно)

```bash
# TEST
./deploy-to-test.sh

# PRODUCTION (с подтверждением)
./deploy-to-prod.sh
```

---

## 🔄 Синхронизация между TEST и PROD

### Синхронизация TEST → PROD (после тестирования):

```bash
./sync-repos.sh test-to-prod
```

Это создаст sync ветку в PROD репозитории. Затем:

1. Перейдите в GitHub репозиторий `TradeControl`
2. Создайте Pull Request из sync ветки в main
3. Review изменений
4. Merge → автоматический деплой на PROD

### Синхронизация PROD → TEST (hotfix в продакшене):

```bash
./sync-repos.sh prod-to-test
```

---

## 🎯 GitHub Actions Workflows

### `.github/workflows/deploy-test.yml`

**Триггеры:**
- Push в ветку `main` репозитория `tradeframe-builder`
- Ручной запуск через GitHub UI (Actions → Deploy to TEST → Run workflow)

**Процесс:**
1. ✅ Checkout кода
2. ✅ Setup Node.js 20
3. ✅ Установка зависимостей (`npm ci`)
4. ✅ Синхронизация версии (`npm run sync-version`)
5. ✅ Сборка для TEST (`npm run build:prod`)
6. ✅ Создание архива dist.tar.gz
7. ✅ Загрузка архива на сервер (`appleboy/scp-action`)
8. ✅ Создание бэкапа на сервере
9. ✅ Распаковка новой версии
10. ✅ git pull на сервере
11. ✅ Установка backend зависимостей
12. ✅ Перезапуск PM2 процессов
13. ✅ Проверка доступности сайта (HTTP 200)

**GitHub Actions используются:**
- `actions/checkout@v4` - клонирование репозитория
- `actions/setup-node@v4` - установка Node.js
- `appleboy/scp-action@v0.1.7` - копирование файлов по SCP
- `appleboy/ssh-action@v1.0.3` - выполнение команд по SSH

### `.github/workflows/deploy-prod.yml`

**Триггеры:**
- Push в ветку `main` репозитория `TradeControl`
- Ручной запуск через GitHub UI (Actions → Deploy to PRODUCTION → Run workflow)

**Процесс:**
- Аналогично TEST, но с:
  - Отдельным SSH ключом (`SSH_PRIVATE_KEY_PROD`)
  - Environment protection (можно настроить manual approval)
  - Автоматическое создание git tag с версией после успешного деплоя
  - Увеличенный timeout для проверки (10 сек вместо 5)
  - Бэкап включает также server/ и .env файлы

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

Каждый деплой создает бэкап в `/tmp/backups/`. Для отката:

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Переходим в директорию
cd /var/www/www-root/data/www/prod.dataworker.ru  # или testTF.dataworker.ru

# Смотрим доступные бэкапы
ls -lh /tmp/backups/

# Восстанавливаем бэкап (пример)
tar -xzf /tmp/backups/prod-backup-20251017_235900.tar.gz

# Перезапускаем PM2
pm2 restart tradeframe-prod-frontend tradeframe-prod-backend
```

### Rollback через Git:

```bash
# На сервере
cd /var/www/www-root/data/www/prod.dataworker.ru
git log --oneline  # Смотрим историю коммитов
git reset --hard <commit-hash>  # Откатываемся на нужный коммит
npm run build:prod
pm2 restart tradeframe-prod-frontend tradeframe-prod-backend
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
./deploy-to-test.sh

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

1. **Бэкапы**: Автоматически создаются в `/tmp/backups/`, но `/tmp` может очищаться при перезагрузке. Для долгосрочного хранения настройте копирование в другую директорию.

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

4. **Node версия**: На сервере должна быть установлена Node.js >= 20:
   ```bash
   node --version  # должен быть >= v20.0.0
   ```

5. **Disk space**: Регулярно проверяйте место на диске:
   ```bash
   df -h
   du -sh /tmp/backups/*
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
