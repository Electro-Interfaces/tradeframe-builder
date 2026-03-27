# ⚡ Быстрая настройка автодеплоя

## Шаг 1: Создание SSH ключа

```bash
# Генерируем SSH ключ
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Копируем публичный ключ
cat ~/.ssh/github_deploy_key.pub
```

## Шаг 2: Добавление ключа на сервер

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Добавляем публичный ключ
echo "ВСТАВЬТЕ_ПУБЛИЧНЫЙ_КЛЮЧ_СЮДА" >> ~/.ssh/authorized_keys

# Проверяем права
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
exit
```

## Шаг 3: Тестирование ключа

```bash
# Проверяем подключение
ssh -i ~/.ssh/github_deploy_key root@194.135.36.195 "echo 'SSH works!'"
```

## Шаг 4: Настройка GitHub Secrets

### Для `tradeframe-builder` (TEST):

1. Перейдите: https://github.com/Electro-Interfaces/tradeframe-builder/settings/secrets/actions
2. Нажмите **New repository secret**
3. Добавьте секреты:

```
SSH_PRIVATE_KEY
(Скопируйте содержимое: cat ~/.ssh/github_deploy_key)

REMOTE_HOST
194.135.36.195

REMOTE_USER
root

DATABASE_URL
postgresql://user:password@194.135.36.195:5432/tradecontrol

JWT_SECRET
(секретный ключ для JWT)

VITE_STS_API_URL
https://pos.autooplata.ru/tms

VITE_STS_API_USERNAME
UserApi

VITE_STS_API_PASSWORD
lHQfLZHzB3tn
```

### Для `TradeControl` (PROD):

1. Перейдите: https://github.com/Electro-Interfaces/TradeControl/settings/secrets/actions
2. Добавьте **те же секреты** + дополнительно:

```
SSH_PRIVATE_KEY_PROD
(Можно использовать тот же ключ или создать отдельный для безопасности)
```

## Шаг 5: Загрузка workflows в репозитории

### TEST (tradeframe-builder):

```bash
cd /path/to/tradeframe-builder
mkdir -p .github/workflows
cp .github/workflows/deploy-test.yml .github/workflows/
git add .github/workflows/deploy-test.yml
git commit -m "ci: добавлен автоматический деплой на TEST"
git push origin main
```

### PROD (TradeControl):

```bash
cd /path/to/TradeControl
mkdir -p .github/workflows
cp .github/workflows/deploy-prod.yml .github/workflows/
git add .github/workflows/deploy-prod.yml
git commit -m "ci: добавлен автоматический деплой на PRODUCTION"
git push origin main
```

## Шаг 6: Проверка работы

1. Перейдите в GitHub → Actions
2. Вы должны увидеть запущенный workflow
3. Дождитесь завершения (обычно 2-5 минут)
4. Проверьте сайт:
   - TEST: https://testtf.dataworker.ru
   - PROD: https://prod.dataworker.ru

## ✅ Готово!

Теперь каждый push в main ветку будет автоматически деплоиться!

---

## 🔧 Ручной запуск деплоя

Если нужно задеплоить без push:

1. Перейдите в GitHub → Actions
2. Выберите workflow (Deploy to TEST / Deploy to PRODUCTION)
3. Нажмите **Run workflow**
4. Выберите ветку и нажмите **Run workflow**

---

## 📚 Полная документация

См. `DEPLOYMENT_GUIDE.md` для подробной информации.
