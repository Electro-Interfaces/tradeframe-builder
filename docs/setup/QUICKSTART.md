# ⚡ Быстрый старт TradeControl Builder

> Краткое руководство по локальной разработке и деплою

## 🚀 Локальная разработка

### Шаг 1: Запуск Backend API (обязательно!)

```bash
cd server
node index.js
```

✅ **Проверка:** `http://localhost:3001/health` или `http://localhost:3001/api/healthz` должны вернуть JSON со статусом `ok`

### Шаг 2: Запуск Frontend

```bash
# В новом терминале (из корня проекта)
npm run dev
```

✅ **Проверка:** Откройте `http://127.0.0.1:3000/`

### ⚠️ Важно!

- Backend ВСЕГДА запускается **ПЕРВЫМ**
- Service Worker **ОТКЛЮЧЕН** на localhost (нет перезагрузок)
- HMR работает для быстрой разработки

---

## 📦 Деплой

### На TEST (тестовый сервер с PWA)

```bash
git add .
git commit -m "feat: описание изменений"
git push test main
```

**Результат:**
- ✅ GitHub Actions соберет проект
- ✅ Деплой на https://testtf.dataworker.ru/
- ✅ Service Worker активируется
- ✅ PWA работает полностью
- ✅ Workflow проверит `site`, `/api/healthz` и авторизованный smoke

**Для тестировщиков:**
- Тестируйте на реальном URL
- Проверяйте PWA (установка, офлайн)
- Все данные РЕАЛЬНЫЕ

### На PRODUCTION (боевой сервер)

```bash
# ТОЛЬКО после успешного тестирования на TEST!
git push prod main
```

**Результат:**
- ✅ Деплой на https://prod.dataworker.ru/
- ✅ Пользователи получают обновление
- ✅ Service Worker обновляется автоматически

---

## 🔍 Проверка окружений

### Git Remotes

```bash
git remote -v

# Должно быть:
# test → Electro-Interfaces/tradeframe-builder
# prod → TradeControl (Production)
```

### Окружения

| Параметр | Development | Test | Production |
|----------|-------------|------|------------|
| URL | localhost:3000 | testtf.dataworker.ru | prod.dataworker.ru |
| Service Worker | ❌ | ✅ | ✅ |
| PWA | ❌ | ✅ | ✅ |
| HMR | ✅ | ❌ | ❌ |

---

## 🛠️ Частые команды

```bash
# Разработка
npm run dev                  # Запуск dev server
npm run build               # Сборка для TEST
npm run build:prod          # Сборка для PRODUCTION
npm run preview             # Предпросмотр сборки

# Backend
cd server && node index.js  # Запуск backend API
curl http://localhost:3001/api/healthz  # Проверка backend

# Git
git push test main          # Деплой на TEST
git push prod main          # Деплой на PRODUCTION
```

---

## ❓ Проблемы?

### Приложение постоянно перезагружается

**Решение:**
1. Service Worker должен быть отключен в `vite.config.ts`
2. Удалите SW из браузера: DevTools → Application → Service Workers → Unregister
3. Перезапустите `npm run dev`

### Backend не отвечает

**Решение:**
```bash
# Проверьте что backend запущен
curl http://localhost:3001/api/healthz

# Если не работает:
cd server
node index.js
```

### PWA не работает на TEST

**Решение:**
1. Проверьте что деплой завершился успешно
2. Очистите кеш браузера (Ctrl+Shift+R)
3. Проверьте Service Worker: DevTools → Application

---

## 📚 Документация

- [DEPLOYMENT_STRATEGY.md](./DEPLOYMENT_STRATEGY.md) - Полная стратегия деплоя
- [CLAUDE.md](./CLAUDE.md) - Инструкции для разработки
- [PWA_SETUP.md](./PWA_SETUP.md) - Настройка PWA
- [API_INTEGRATION.md](./API_INTEGRATION.md) - Интеграция API

---

**Версия:** 1.0
**Дата:** 2025-01-19
