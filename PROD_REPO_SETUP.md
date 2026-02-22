# 🚀 Настройка PRODUCTION репозитория

## Проблема которую исправили

В TEST репозитории `tradeframe-builder` были **оба** workflow:
- ✅ `deploy-test.yml` - для TEST
- ❌ `deploy-prod.yml` - **удален** (не нужен в TEST репо)

Поэтому при каждом push запускались 2 деплоя сразу!

## Решение

**TEST репозиторий** (`tradeframe-builder`):
- Только `deploy-test.yml`
- Деплоит на https://testtf.dataworker.ru

**PROD репозиторий** (`TradeControl`):
- Только `deploy-prod.yml`
- Деплоит на https://prod.dataworker.ru

---

## 📋 Настройка PRODUCTION репозитория

### Шаг 1: Скопировать workflow в PROD репозиторий

У вас есть файл: `D:\Users\magsp\ELSYPLUS\TradeFrame\.github\workflows\deploy-prod.yml`

**Вариант 1: Через локальную копию**

Если у вас есть клон PROD репозитория:

```bash
# Перейдите в PROD репозиторий
cd /path/to/TradeControl

# Создайте директорию
mkdir -p .github/workflows

# Скопируйте файл
cp /d/Users/magsp/ELSYPLUS/TradeFrame/.github/workflows/deploy-prod.yml .github/workflows/

# Коммит
git add .github/workflows/deploy-prod.yml
git commit -m "ci: добавлен автоматический деплой на PRODUCTION"
git push origin main
```

**Вариант 2: Через GitHub UI**

1. Откройте: https://github.com/Electro-Interfaces/TradeControl
2. Создайте папку: `.github/workflows/`
3. Создайте файл: `deploy-prod.yml`
4. Скопируйте содержимое из `D:\Users\magsp\ELSYPLUS\TradeFrame\.github\workflows\deploy-prod.yml`
5. Commit changes

---

### Шаг 2: Настроить GitHub Secrets для PROD

**URL:** https://github.com/Electro-Interfaces/TradeControl/settings/secrets/actions

**Добавьте те же 8 секретов:**

```
SSH_PRIVATE_KEY_PROD - (можно использовать тот же ключ или создать новый)
REMOTE_HOST - 194.135.36.195
REMOTE_USER - root
VITE_SUPABASE_URL
VITE_SUPABASE_SERVICE_ROLE_KEY
VITE_STS_API_URL
VITE_STS_API_USERNAME
VITE_STS_API_PASSWORD
```

**Примечание:** В `deploy-prod.yml` используется `SSH_PRIVATE_KEY_PROD` вместо `SSH_PRIVATE_KEY` для безопасности.

**Опции:**
- **Вариант 1:** Использовать тот же SSH ключ (добавить как `SSH_PRIVATE_KEY_PROD`)
- **Вариант 2:** Создать отдельный ключ для PROD (более безопасно)

---

### Шаг 3: Создать отдельный SSH ключ для PROD (опционально)

Если хотите использовать отдельный ключ для безопасности:

```bash
# Создать ключ
ssh-keygen -t ed25519 -C "github-actions-prod" -f ~/.ssh/github_deploy_key_prod -N ""

# Показать публичный ключ
cat ~/.ssh/github_deploy_key_prod.pub

# Добавить на сервер
cat ~/.ssh/github_deploy_key_prod.pub | ssh root@194.135.36.195 "cat >> ~/.ssh/authorized_keys"

# Показать приватный ключ (для GitHub Secret)
cat ~/.ssh/github_deploy_key_prod
```

Затем добавьте приватный ключ как `SSH_PRIVATE_KEY_PROD` в GitHub Secrets.

---

### Шаг 4: Тестовый деплой

После настройки secrets:

```bash
# Если есть локальная копия PROD репозитория
cd /path/to/TradeControl
git commit --allow-empty -m "ci: тестируем автодеплой на PRODUCTION"
git push origin main
```

**ИЛИ** сделайте любой коммит через GitHub UI.

---

## 🎯 Результат

**TEST репозиторий** (`tradeframe-builder`):
- Push → Запускается только `Deploy to TEST Environment`
- Деплой на https://testtf.dataworker.ru

**PROD репозиторий** (`TradeControl`):
- Push → Запускается только `Deploy to PRODUCTION Environment`
- Деплой на https://prod.dataworker.ru

**Теперь деплои не конфликтуют!** ✅

---

## 📁 Содержимое deploy-prod.yml

Файл уже создан и готов к использованию:
`D:\Users\magsp\ELSYPLUS\TradeFrame\.github\workflows\deploy-prod.yml`

Просто скопируйте его в PROD репозиторий.

---

## ⚠️ Важно

**Environment Protection для PROD** (опционально, но рекомендуется):

1. GitHub → Settings → Environments
2. Create environment: `production`
3. Required reviewers: Добавьте себя
4. Save

Теперь каждый PROD деплой будет требовать ручного подтверждения через кнопку "Approve and deploy".

Это защитит от случайных деплоев в PROD.

---

## 🎉 Готово!

Теперь у вас:
- ✅ TEST деплой работает автоматически
- ✅ PROD деплой настроен и изолирован
- ✅ Каждый репозиторий деплоит только свою среду
