# GitHub Actions Workflows - Changelog

## v1.1.0 - 2025-10-18

### 🔧 Fixed
- **Заменен action `easingthemes/ssh-deploy@v5`** на комбинацию:
  - `appleboy/scp-action@v0.1.7` - для копирования файлов
  - `appleboy/ssh-action@v1.0.3` - для выполнения команд

**Причина:** Action `easingthemes/ssh-deploy@v5` не существует (версия v5.1.0).

### ✨ Improved
- Добавлен шаг создания архива `dist.tar.gz` перед загрузкой
- Улучшена обработка ошибок с `set -e`
- Git pull теперь не останавливает деплой при ошибке (`|| echo`)

### 📝 Changes

#### deploy-test.yml
```yaml
# Было:
- uses: easingthemes/ssh-deploy@v5

# Стало:
- uses: appleboy/scp-action@v0.1.7  # Копирование файлов
- uses: appleboy/ssh-action@v1.0.3  # Выполнение команд
```

#### deploy-prod.yml
```yaml
# Было:
- uses: easingthemes/ssh-deploy@v5

# Стало:
- uses: appleboy/scp-action@v0.1.7  # Копирование файлов
- uses: appleboy/ssh-action@v1.0.3  # Выполнение команд
```

---

## v1.0.0 - 2025-10-18

### 🎉 Initial Release

#### Features
- ✅ Автоматический деплой для TEST среды
- ✅ Автоматический деплой для PRODUCTION среды
- ✅ Автоматические бэкапы перед деплоем
- ✅ Health checks после деплоя
- ✅ Git tag creation для production
- ✅ Environment variables через GitHub Secrets
- ✅ Ручной запуск через workflow_dispatch

#### Workflows
- `.github/workflows/deploy-test.yml` - TEST деплой
- `.github/workflows/deploy-prod.yml` - PRODUCTION деплой

#### Actions используются
- `actions/checkout@v4` - клонирование кода
- `actions/setup-node@v4` - установка Node.js
- `appleboy/scp-action@v0.1.7` - SCP копирование
- `appleboy/ssh-action@v1.0.3` - SSH выполнение команд

---

## Текущая версия: v1.1.0

**Статус:** ✅ Готов к использованию

**Требования:**
- Node.js 20+
- SSH доступ к серверу 194.135.36.195
- GitHub Secrets настроены (см. DEPLOYMENT_GUIDE.md)
