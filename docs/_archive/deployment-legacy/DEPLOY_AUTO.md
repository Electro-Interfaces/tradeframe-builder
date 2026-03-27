# Автоматизация деплоя с паролем SSH

## Проблема
Скрипт `deploy-manual.sh` требует ручного ввода пароля SSH при каждом вызове команд `scp` и `ssh`.

**Пароль SSH**: `<ssh_password_removed>`

## Решения

### ✅ Решение 1: Node.js скрипт (deploy-auto.cjs)
Уже создан файл `deploy-auto.cjs` который использует библиотеку `node-ssh` для автоматического деплоя.

**Использование:**
```bash
node deploy-auto.cjs
```

**Статус:** Создан, библиотека установлена, но требуется настройка SSH на сервере для парольной аутентификации.

**Проблема:** Возможно SSH сервер не принимает парольную аутентификацию через node-ssh. Нужно проверить конфигурацию `/etc/ssh/sshd_config` на сервере:
```bash
PasswordAuthentication yes
```

---

### ✅ Решение 2: PowerShell скрипт (deploy-manual.ps1)
Создан файл `deploy-manual.ps1` который использует утилиты `plink` и `pscp` из PuTTY.

**Использование:**
```powershell
.\deploy-manual.ps1
```

**Требования:**
1. Установить PuTTY: https://www.putty.org/
2. Добавить путь к plink/pscp в PATH или указать полные пути в скрипте

---

### ✅ Решение 3: SSH ключи (РЕКОМЕНДУЕТСЯ)
Самый безопасный и удобный способ - настроить SSH ключи для беспарольного доступа.

**Шаги:**
1. Генерация SSH ключа (если еще не создан):
   ```bash
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   ```

2. Копирование ключа на сервер:
   ```bash
   ssh-copy-id root@194.135.36.195
   ```
   (При этом нужно один раз ввести пароль `<ssh_password_removed>`)

3. После этого `deploy-manual.sh` будет работать БЕЗ запроса пароля!

---

### ⚠️ Решение 4: sshpass (Linux/WSL)
Если используется WSL или Linux, можно использовать утилиту `sshpass`.

**Установка (Ubuntu/Debian):**
```bash
sudo apt-get install sshpass
```

**Использование:**
```bash
export SSHPASS='<ssh_password_removed>'
sshpass -e scp dist.tar.gz root@194.135.36.195:/tmp/
sshpass -e ssh root@194.135.36.195 "команда"
```

---

## Текущая ситуация

✅ **Версия 1.5.29 собрана** - архив `dist.tar.gz` готов (2.3 MB)
❌ **Не развернута на сервере** - прервано на этапе загрузки архива
🔧 **Содержит критический фикс** - исправление метода `getTransactions` в `src/services/stsApi.ts`

## Быстрый деплой (с ручным вводом пароля)

Так как архив уже собран, можно завершить деплой вручную:

```bash
# 1. Загрузка архива (введите пароль когда спросит)
scp dist.tar.gz root@194.135.36.195:/tmp/

# 2. Остановка PM2
ssh root@194.135.36.195 "pm2 stop tradeframe-prod"

# 3. Развертывание
ssh root@194.135.36.195 "cd /var/www/www-root/data/www/prod.dataworker.ru && rm -rf dist && mkdir dist && cd dist && tar -xzf /tmp/dist.tar.gz && rm /tmp/dist.tar.gz"

# 4. Копирование sts.js
scp server/routes/sts.js root@194.135.36.195:/var/www/www-root/data/www/prod.dataworker.ru/server/routes/

# 5. Перезапуск PM2
ssh root@194.135.36.195 "pm2 restart tradeframe-prod tradeframe-backend-proxy"

# 6. Проверка статуса
ssh root@194.135.36.195 "pm2 list"
```

Пароль для всех команд: `<ssh_password_removed>`

---

## Рекомендация

**Лучший вариант:** Настроить SSH ключи (Решение 3) - это займет 2 минуты, но навсегда избавит от ввода пароля.
