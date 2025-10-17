# 🚀 TradeFrame - Автоматический деплой через GitHub Actions

## ✅ Что было создано

Система автоматического деплоя для двух сред:

### 📁 Файлы

- **`.github/workflows/deploy-test.yml`** - Автодеплой для TEST среды
- **`.github/workflows/deploy-prod.yml`** - Автодеплой для PRODUCTION среды
- **`DEPLOYMENT_GUIDE.md`** - Полное руководство по настройке и использованию
- **`QUICK_DEPLOY_SETUP.md`** - Быстрая настройка за 6 шагов
- **`DEPLOYMENT_FLOW.md`** - Диаграммы и визуализация процесса деплоя

## 🎯 Что дает автоматический деплой

### ✅ Преимущества

1. **Скорость**: Деплой за 3-5 минут вместо ручного процесса
2. **Безопасность**: Учетные данные в GitHub Secrets, не в коде
3. **Надежность**: Автоматические бэкапы перед каждым деплоем
4. **Прозрачность**: Все деплои видны в GitHub Actions с полными логами
5. **Rollback**: Быстрый откат через бэкапы при проблемах
6. **Версионирование**: Автоматическое создание git tags для production
7. **Health checks**: Проверка доступности после деплоя

### 🔄 Процесс работы

```
Developer → git push → GitHub Actions → Build → Deploy → PM2 Restart → ✅ Live
```

## 📋 Что нужно сделать для запуска

### Шаг 1: Создать SSH ключ (5 минут)

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_deploy_key
```

### Шаг 2: Добавить ключ на сервер (2 минуты)

```bash
ssh root@194.135.36.195
echo "ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
```

### Шаг 3: Настроить GitHub Secrets (10 минут)

Добавить 8 секретов в каждый репозиторий:
- SSH_PRIVATE_KEY
- REMOTE_HOST
- REMOTE_USER
- VITE_SUPABASE_URL
- VITE_SUPABASE_SERVICE_ROLE_KEY
- VITE_STS_API_URL
- VITE_STS_API_USERNAME
- VITE_STS_API_PASSWORD

### Шаг 4: Загрузить workflows (2 минуты)

```bash
git add .github/workflows/
git commit -m "ci: добавлен автоматический деплой"
git push origin main
```

### Шаг 5: Готово! ✅

Теперь каждый push автоматически деплоится.

---

## 📚 Документация

### Для быстрого старта:
👉 **`QUICK_DEPLOY_SETUP.md`** - 6 шагов за 20 минут

### Для подробного изучения:
👉 **`DEPLOYMENT_GUIDE.md`** - Полная документация со всеми деталями

### Для визуализации:
👉 **`DEPLOYMENT_FLOW.md`** - Диаграммы и схемы процесса

---

## 🌐 Среды

| Среда | URL | Репозиторий | Деплой |
|-------|-----|-------------|--------|
| **TEST** | https://testtf.dataworker.ru | `tradeframe-builder` | Auto on push to main |
| **PROD** | https://prod.dataworker.ru | `TradeControl` | Auto on push to main |

---

## 🔧 Типичные сценарии использования

### Разработка новой функции

```bash
# 1. Работаем в TEST репозитории
git checkout -b feature/new-function
# ... разработка ...
git commit -m "feat: новая функция"
git push origin feature/new-function

# 2. Pull Request → Review → Merge to main
# 3. Автоматический деплой на TEST
# 4. Тестирование на https://testtf.dataworker.ru

# 5. Синхронизация с PROD
./sync-repos.sh test-to-prod

# 6. В PROD репозитории: PR → Merge → Автодеплой
```

### Hotfix в production

```bash
# 1. Работаем в PROD репозитории
git checkout -b hotfix/critical-bug
# ... исправление ...
git commit -m "fix: критический баг"
git push origin hotfix/critical-bug

# 2. PR → Merge → Автодеплой на PROD

# 3. Синхронизация обратно в TEST
./sync-repos.sh prod-to-test
```

### Ручной деплой (если нужно)

```bash
# Через GitHub UI: Actions → Run workflow
# Или через скрипты:
./deploy-to-test.sh
./deploy-to-prod.sh
```

---

## 🛡️ Безопасность

- ✅ SSH ключи хранятся в GitHub Secrets (зашифрованы)
- ✅ Учетные данные API не в коде
- ✅ Возможность настроить manual approval для PROD
- ✅ Автоматические бэкапы перед каждым деплоем
- ✅ Health checks после деплоя

---

## 📊 Мониторинг

### GitHub Actions
- Все деплои видны в: Repository → Actions
- Логи каждого шага доступны
- Email уведомления при ошибках (настраивается)

### Сервер
```bash
# PM2 статус
pm2 list

# Логи
pm2 logs tradeframe-test-frontend
pm2 logs tradeframe-prod-frontend

# Nginx логи
tail -f /var/log/nginx/access.log
```

---

## 🔙 Rollback (откат)

Если что-то пошло не так:

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Смотрим бэкапы
ls -lh /tmp/backups/

# Восстанавливаем
cd /var/www/www-root/data/www/prod.dataworker.ru
tar -xzf /tmp/backups/prod-backup-TIMESTAMP.tar.gz
pm2 restart tradeframe-prod-frontend tradeframe-prod-backend
```

---

## ⚙️ Настройка Environment Protection (опционально)

Для PROD можно настроить ручное подтверждение деплоя:

1. GitHub → Settings → Environments
2. Create environment: `production`
3. Add required reviewers
4. Save

Теперь каждый деплой в PROD будет требовать approve.

---

## 🎉 Итог

**До:**
- ⏱️ Ручной деплой: 15-20 минут
- 🐛 Риск ошибок при ручной работе
- 📝 Нужно помнить все команды
- 🔐 Учетные данные в скриптах

**После:**
- ⚡ Автоматический деплой: 3-5 минут
- ✅ Консистентный процесс
- 🚀 Просто: git push → готово
- 🔒 Безопасное хранение credentials

---

## 📞 Поддержка

- **Вопросы по настройке**: см. `QUICK_DEPLOY_SETUP.md`
- **Проблемы с деплоем**: см. `DEPLOYMENT_GUIDE.md` раздел "Rollback"
- **Визуализация процесса**: см. `DEPLOYMENT_FLOW.md`

---

**Готово к использованию!** 🚀
