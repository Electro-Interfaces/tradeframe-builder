# 🔐 Настройка GitHub Secrets - Пошаговая инструкция

## Текущая ошибка

```
Error: can't connect without a private SSH key or password
```

**Причина:** GitHub Secrets не настроены. Workflow не может найти `SSH_PRIVATE_KEY`.

---

## 📋 Пошаговая настройка

### Шаг 1: Создание SSH ключа (если еще не создан)

#### На Windows (PowerShell):
```powershell
# Создаем SSH ключ
ssh-keygen -t ed25519 -C "github-actions-deploy" -f $HOME\.ssh\github_deploy_key

# Показываем публичный ключ (скопируйте его)
Get-Content $HOME\.ssh\github_deploy_key.pub

# Показываем приватный ключ (скопируйте его)
Get-Content $HOME\.ssh\github_deploy_key
```

#### На Linux/Mac:
```bash
# Создаем SSH ключ
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# Показываем публичный ключ (скопируйте его)
cat ~/.ssh/github_deploy_key.pub

# Показываем приватный ключ (скопируйте его)
cat ~/.ssh/github_deploy_key
```

---

### Шаг 2: Добавление публичного ключа на сервер

```bash
# Подключаемся к серверу
ssh root@194.135.36.195

# Добавляем публичный ключ
echo "ВСТАВЬТЕ_ПУБЛИЧНЫЙ_КЛЮЧ_СЮДА" >> ~/.ssh/authorized_keys

# Проверяем права доступа
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Выходим
exit
```

**Пример публичного ключа:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJx... github-actions-deploy
```

---

### Шаг 3: Тестирование SSH ключа

#### Windows:
```powershell
ssh -i $HOME\.ssh\github_deploy_key root@194.135.36.195 "echo 'SSH works!'"
```

#### Linux/Mac:
```bash
ssh -i ~/.ssh/github_deploy_key root@194.135.36.195 "echo 'SSH works!'"
```

Если видите `SSH works!` - ключ работает! ✅

---

### Шаг 4: Добавление секретов в GitHub (TEST репозиторий)

1. **Откройте репозиторий TEST:**
   https://github.com/Electro-Interfaces/tradeframe-builder

2. **Перейдите в Settings:**
   Settings → Secrets and variables → Actions

3. **Нажмите "New repository secret"**

4. **Добавьте каждый секрет по очереди:**

#### Секрет 1: SSH_PRIVATE_KEY
- **Name:** `SSH_PRIVATE_KEY`
- **Value:** Скопируйте содержимое приватного ключа **ПОЛНОСТЬЮ**
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...
  (ВСЕ СТРОКИ)
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```

#### Секрет 2: REMOTE_HOST
- **Name:** `REMOTE_HOST`
- **Value:** `194.135.36.195`

#### Секрет 3: REMOTE_USER
- **Name:** `REMOTE_USER`
- **Value:** `root`

#### Секрет 4: VITE_SUPABASE_URL
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://ssvazdgnmatbdynkhkqo.supabase.co`

#### Секрет 5: VITE_SUPABASE_SERVICE_ROLE_KEY
- **Name:** `VITE_SUPABASE_SERVICE_ROLE_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzdmF6ZGdubWF0YmR5bmtoa3FvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM0MzgzNCwiZXhwIjoyMDcyOTE5ODM0fQ.Gen-PI-vDkKjskpIvJNcQw0Uj3d0zGXB98zIxNK6di0`

#### Секрет 6: VITE_STS_API_URL
- **Name:** `VITE_STS_API_URL`
- **Value:** `https://pos.autooplata.ru/tms`

#### Секрет 7: VITE_STS_API_USERNAME
- **Name:** `VITE_STS_API_USERNAME`
- **Value:** `UserApi`

#### Секрет 8: VITE_STS_API_PASSWORD
- **Name:** `VITE_STS_API_PASSWORD`
- **Value:** `lHQfLZHzB3tn`

---

### Шаг 5: Проверка секретов

После добавления всех секретов вы должны увидеть список:

```
Actions secrets (8)

SSH_PRIVATE_KEY             Updated now
REMOTE_HOST                 Updated now
REMOTE_USER                 Updated now
VITE_SUPABASE_URL          Updated now
VITE_SUPABASE_SERVICE_ROLE_KEY  Updated now
VITE_STS_API_URL           Updated now
VITE_STS_API_USERNAME      Updated now
VITE_STS_API_PASSWORD      Updated now
```

---

### Шаг 6: Повторный запуск деплоя

1. **Перейдите в Actions:**
   https://github.com/Electro-Interfaces/tradeframe-builder/actions

2. **Найдите последний failed run**

3. **Нажмите "Re-run all jobs"**

**ИЛИ**

4. **Сделайте любой commit и push:**
   ```bash
   git commit --allow-empty -m "test: trigger deploy with secrets"
   git push test main
   ```

---

### Шаг 7: Мониторинг деплоя

1. Перейдите в **Actions**
2. Откройте запущенный workflow
3. Наблюдайте за процессом:
   - ✅ Checkout code
   - ✅ Setup Node.js 20
   - ✅ Install dependencies (npm ci)
   - ✅ Sync version
   - ✅ Build for TEST (npm run build:prod)
   - ✅ Create deployment archive
   - ✅ Deploy to TEST server (SCP)
   - ✅ Execute deployment (SSH)
   - ✅ Verify deployment (HTTP 200)

**Ожидаемое время:** 3-5 минут

---

## ✅ Успешный деплой

После успешного завершения вы увидите:
```
✅ TEST deployment completed!
🌐 URL: https://testtf.dataworker.ru
✅ TEST site is responding with HTTP 200
```

**Проверьте сайт:**
https://testtf.dataworker.ru

---

## 🔧 Для PRODUCTION репозитория

Повторите те же шаги для репозитория `TradeControl`:

1. https://github.com/Electro-Interfaces/TradeControl/settings/secrets/actions
2. Добавьте **те же 8 секретов**
3. **Важно:** Для безопасности можно использовать отдельный SSH ключ:
   - Создайте новый ключ: `ssh-keygen -t ed25519 -C "github-actions-prod" -f ~/.ssh/github_deploy_key_prod`
   - Добавьте публичный ключ на сервер
   - В GitHub используйте секрет `SSH_PRIVATE_KEY_PROD` (уже настроено в workflow)

---

## ❓ Частые проблемы

### Проблема 1: "Permission denied (publickey)"
**Решение:**
- Проверьте что публичный ключ добавлен на сервер
- Проверьте права: `chmod 600 ~/.ssh/authorized_keys`

### Проблема 2: "Host key verification failed"
**Решение:**
- Один раз подключитесь вручную: `ssh root@194.135.36.195`
- Подтвердите fingerprint сервера

### Проблема 3: Секрет не работает
**Решение:**
- Удалите секрет и создайте заново
- Убедитесь что скопировали **весь** приватный ключ включая `-----BEGIN` и `-----END`

---

## 🎉 Готово!

После настройки секретов каждый push в `main` будет автоматически деплоиться!

```
git push test main → GitHub Actions → Build → Deploy → testtf.dataworker.ru ✅
```

**Время деплоя:** 3-5 минут

**URL:** https://testtf.dataworker.ru

---

## 📚 Дополнительная документация

- `QUICK_DEPLOY_SETUP.md` - краткая инструкция
- `DEPLOYMENT_GUIDE.md` - полное руководство
- `WORKFLOWS_FIXED.md` - описание workflows
