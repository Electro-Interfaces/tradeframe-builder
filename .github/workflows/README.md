# GitHub Actions Workflows

Этот репозиторий содержит два различных workflow файла для разных целей:

## 📁 Файлы конфигурации:

### `deploy.yml`
**Назначение:** Деплой на продакшн сервер
**Триггер:** push в main ветку
**Цель:** `prod.dataworker.ru`
**Технология:** SSH деплой через PM2
**Использование:** Только в репозитории TradeControl

**Процесс:**
1. Build проекта
2. SSH подключение к продакшн серверу
3. Git pull на сервере
4. Перезапуск PM2 процесса

### `ghp-deploy.yml`
**Назначение:** Деплой на GitHub Pages
**Триггер:** push в main ветку
**Цель:** GitHub Pages (https://electro-interfaces.github.io/tradeframe-builder/)
**Технология:** GitHub Pages деплой
**Использование:** В обоих репозиториях для демо версии

**Процесс:**
1. Build проекта
2. Upload artifact в GitHub Pages
3. Deploy на GitHub Pages

## 🔄 Синхронизация репозиториев:

- **tradeframe-builder** (разработка): Имеет `ghp-deploy.yml` для демо версии
- **TradeControl** (продакшн): Имеет оба файла - `deploy.yml` для продакшена и `ghp-deploy.yml` для демо

## ⚠️ Важно:

- Каждый push активирует соответствующие workflow в каждом репозитории
- Продакшн деплой происходит только из TradeControl репозитория
- GitHub Pages деплой может происходить из обоих репозиториев
- Оба деплоя полностью независимы и не влияют друг на друга

## 🚀 Результат:

- **Продакшн**: https://prod.dataworker.ru (автодеплой из TradeControl)
- **Демо**: https://electro-interfaces.github.io/tradeframe-builder/ (автодеплой из любого репозитория)