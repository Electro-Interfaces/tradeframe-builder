# 🚀 Стратегия развертывания TradeFrame Builder

> Документация по работе с тремя окружениями: Development, Test, Production

## 📋 Оглавление

- [Обзор архитектуры](#обзор-архитектуры)
- [Окружения](#окружения)
- [Workflow разработки](#workflow-разработки)
- [PWA и Service Worker](#pwa-и-service-worker)
- [Команды деплоя](#команды-деплоя)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Обзор архитектуры

TradeFrame Builder использует **трехуровневую архитектуру развертывания**:

```
DEVELOPMENT (localhost) → TEST (GitHub Pages) → PRODUCTION (prod.dataworker.ru)
```

### Принципы работы:

1. ✅ **Development** - локальная разработка БЕЗ Service Worker
2. ✅ **Test** - полное тестирование С Service Worker и реальными данными
3. ✅ **Production** - боевой сервер для пользователей С Service Worker

---

## 🌍 Окружения

### 1️⃣ DEVELOPMENT (Локальная разработка)

**Назначение:** Быстрая разработка и отладка

```bash
# Характеристики:
- URL: http://127.0.0.1:3000/
- Backend: http://localhost:3001/
- Service Worker: ОТКЛЮЧЕН
- PWA: НЕТ
- HMR: ДА (Vite Hot Reload)
- База данных: Supabase (реальная)
- STS API: через Backend Proxy
```

**Конфигурация:**
- `vite.config.ts` → `devOptions.enabled: false`
- Base path: `/`
- Mode: `development`

**Запуск:**
```bash
# Terminal 1: Backend Proxy
cd server
node index.js

# Terminal 2: Frontend
npm run dev
```

**Проверка:**
```bash
curl http://localhost:3001/health  # Backend
curl http://127.0.0.1:3000/        # Frontend
```

---

### 2️⃣ TEST (Тестовый сервер)

**Назначение:** Тестирование с реальными данными и полным PWA

```bash
# Характеристики:
- URL: https://electro-interfaces.github.io/tradeframe-builder/
- Git Remote: test (tradeframe-builder repo)
- Service Worker: ВКЛЮЧЕН
- PWA: ПОЛНОСТЬЮ РАБОТАЕТ
- Данные: РЕАЛЬНЫЕ (Supabase + STS API)
- Доступ: Тестировщики
```

**Конфигурация:**
- Build mode: `github-pages`
- Base path: `/tradeframe-builder/`
- PWA scope: `/tradeframe-builder/`
- Service Worker: Активен

**Деплой:**
```bash
git add .
git commit -m "feat: описание изменений"
git push test main
```

**GitHub Actions:**
- Автоматическая сборка: `npm run build`
- Деплой на GitHub Pages
- Service Worker регистрируется автоматически

**Проверка PWA:**
```bash
# Chrome DevTools:
1. Application → Service Workers → Проверить регистрацию
2. Application → Manifest → Проверить иконки и scope
3. Lighthouse → PWA Audit → Должен быть зеленый
```

---

### 3️⃣ PRODUCTION (Боевой сервер)

**Назначение:** Работа с реальными пользователями

```bash
# Характеристики:
- URL: https://prod.dataworker.ru/
- Git Remote: prod (TradeControl repo)
- Service Worker: ВКЛЮЧЕН
- PWA: ПОЛНОСТЬЮ РАБОТАЕТ
- Данные: РЕАЛЬНЫЕ (Supabase + STS API)
- Доступ: Реальные пользователи
```

**Конфигурация:**
- Build mode: `production`
- Base path: `/`
- PWA scope: `/`
- Service Worker: Активен

**Деплой:**
```bash
# После успешного тестирования на TEST
git push prod main
```

---

## 🔄 Workflow разработки

### Полный цикл разработки фичи

```bash
┌─────────────────────────────────────────────────────────────┐
│ 1. DEVELOPMENT: Разработка локально                         │
├─────────────────────────────────────────────────────────────┤
│ • cd server && node index.js                                │
│ • npm run dev                                               │
│ • Пишете код, тестируете на localhost                       │
│ • Service Worker ОТКЛЮЧЕН (нет перезагрузок)                │
│ • HMR работает (быстрая разработка)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. TEST: Тестирование с реальными данными                   │
├─────────────────────────────────────────────────────────────┤
│ • git add . && git commit -m "feat: ..."                    │
│ • git push test main                                        │
│ • GitHub Actions собирает и деплоит                         │
│ • Тестировщики проверяют на реальном URL                    │
│ • Service Worker РАБОТАЕТ (полное PWA)                      │
│ • Проверка офлайн режима, установки, обновлений             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. PRODUCTION: Деплой для пользователей                     │
├─────────────────────────────────────────────────────────────┤
│ • Только после успешного тестирования на TEST!              │
│ • git push prod main                                        │
│ • Пользователи получают обновление                          │
│ • Service Worker обновляется автоматически                  │
└─────────────────────────────────────────────────────────────┘
```

### Быстрые команды

```bash
# Локальная разработка
npm run dev

# Деплой на TEST
git push test main

# Деплой на PRODUCTION
git push prod main

# Проверка сборки локально
npm run build
npm run preview
```

---

## 🔧 PWA и Service Worker

### Конфигурация PWA по окружениям

| Параметр | Development | Test | Production |
|----------|-------------|------|------------|
| Service Worker | ❌ ОТКЛЮЧЕН | ✅ ВКЛЮЧЕН | ✅ ВКЛЮЧЕН |
| PWA Manifest | ❌ НЕТ | ✅ ДА | ✅ ДА |
| Офлайн кеш | ❌ НЕТ | ✅ ДА | ✅ ДА |
| Установка | ❌ НЕТ | ✅ ДА | ✅ ДА |
| HMR | ✅ ДА | ❌ НЕТ | ❌ НЕТ |

### Почему Service Worker отключен в Development?

**Проблема:**
- Service Worker перехватывает все запросы
- Конфликтует с Vite HMR (Hot Module Replacement)
- Вызывает циклические перезагрузки страницы
- Затрудняет отладку (кешированные ответы)

**Решение:**
```typescript
// vite.config.ts
VitePWA({
  devOptions: {
    enabled: false, // ← КРИТИЧНО!
    type: 'module'
  }
})
```

### Тестирование PWA

**На TEST окружении:**
```bash
1. Откройте https://electro-interfaces.github.io/tradeframe-builder/
2. Chrome DevTools → Application:
   - Service Workers: должен быть активен
   - Manifest: проверить иконки
   - Cache Storage: проверить кеши
3. Lighthouse → PWA Audit → Run
4. Установите приложение (кнопка в адресной строке)
5. Протестируйте офлайн:
   - DevTools → Network → Offline
   - Приложение должно работать
```

**На PRODUCTION:**
```bash
1. Откройте https://prod.dataworker.ru/
2. Повторите все проверки из TEST
3. Проверьте автообновление:
   - Задеплойте новую версию
   - Обновление должно показаться автоматически
```

---

## 📦 Команды деплоя

### Сборка проекта

```bash
# GitHub Pages (TEST)
npm run build
# → vite build --mode github-pages
# → dist/ с base: /tradeframe-builder/

# Production
npm run build:prod
# → vite build --mode production
# → dist/ с base: /

# Development (для локального preview)
npm run build:dev
# → vite build --mode development
# → dist/ с base: /
```

### Git remotes

```bash
# Проверка настроенных remotes
git remote -v

# Результат:
# prod → https://github.com/Electro-Interfaces/TradeControl.git
# test → https://github.com/Electro-Interfaces/tradeframe-builder.git
```

### Деплой на TEST

```bash
# Полный цикл
git add .
git commit -m "feat: новая функциональность"
git push test main

# GitHub Actions сделает:
# 1. npm install
# 2. npm run build (github-pages mode)
# 3. Деплой на GitHub Pages
# 4. Service Worker активируется

# Проверка через ~2 минуты:
# https://electro-interfaces.github.io/tradeframe-builder/
```

### Деплой на PRODUCTION

```bash
# ТОЛЬКО после успешного тестирования на TEST!

# Вариант 1: Cherry-pick конкретных коммитов
git log test/main  # Посмотреть коммиты с test
git cherry-pick <commit-hash>
git push prod main

# Вариант 2: Merge всех изменений
git fetch test
git merge test/main
git push prod main

# Вариант 3: Прямой push (если main синхронизирован)
git push prod main
```

---

## 🔍 Troubleshooting

### Проблема: Приложение постоянно перезагружается на localhost

**Причина:** Service Worker включен в development

**Решение:**
```typescript
// vite.config.ts
VitePWA({
  devOptions: {
    enabled: false, // ← Должно быть false
  }
})
```

```bash
# Удалить старый Service Worker из браузера
# Chrome DevTools → Application → Service Workers → Unregister

# Перезапустить dev server
npm run dev
```

---

### Проблема: PWA не устанавливается на TEST

**Причина:** Неправильный scope или start_url

**Решение:**
```typescript
// vite.config.ts
const base = mode === 'github-pages' ? '/tradeframe-builder/' : '/';

VitePWA({
  manifest: {
    scope: base,        // ← Должно совпадать с base
    start_url: base,    // ← Должно совпадать с base
  }
})
```

**Проверка:**
```bash
# Откройте dist/manifest.webmanifest после сборки
cat dist/manifest.webmanifest | grep -E "(scope|start_url)"

# Должно быть:
# "scope": "/tradeframe-builder/",
# "start_url": "/tradeframe-builder/",
```

---

### Проблема: Service Worker не обновляется

**Причина:** Кеш браузера или старая версия SW

**Решение:**
```bash
# Chrome DevTools → Application → Service Workers:
1. ✅ Update on reload
2. Нажать "Unregister"
3. Hard Reload (Ctrl+Shift+R)
4. Проверить новую регистрацию
```

**Автообновление:**
```typescript
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',  // ← Автообновление
})
```

---

### Проблема: Иконки PWA не отображаются

**Причина:** Неправильный путь к иконкам

**Решение:**
```typescript
// vite.config.ts
const base = mode === 'github-pages' ? '/tradeframe-builder/' : '/';

VitePWA({
  manifest: {
    icons: [
      {
        src: `${base}pwa-192x192.png`,  // ← С учетом base
        sizes: '192x192',
      }
    ]
  }
})
```

**Проверка:**
```bash
# Убедитесь что файлы существуют
ls -la public/pwa-*.png

# Должно быть:
# pwa-192x192.png
# pwa-512x512.png
```

---

## ✅ Чеклист перед деплоем

### На TEST:
- [ ] Код работает на localhost без ошибок
- [ ] Backend proxy запущен и работает
- [ ] Все тесты пройдены (если есть)
- [ ] Код прошел lint: `npm run lint`
- [ ] Версия обновлена в `package.json`
- [ ] Коммит создан с понятным сообщением

### На PRODUCTION:
- [ ] Тестирование на TEST прошло успешно
- [ ] PWA работает корректно (установка, офлайн, обновления)
- [ ] Тестировщики подтвердили готовность
- [ ] Критические баги исправлены
- [ ] Создан changelog для версии
- [ ] Пользователи предупреждены об обновлении (если нужно)

---

## 📊 Сравнение окружений

| Параметр | Development | Test | Production |
|----------|-------------|------|------------|
| URL | localhost:3000 | electro-interfaces.github.io | prod.dataworker.ru |
| Base Path | `/` | `/tradeframe-builder/` | `/` |
| Service Worker | ❌ | ✅ | ✅ |
| PWA | ❌ | ✅ | ✅ |
| HMR | ✅ | ❌ | ❌ |
| Build Command | `npm run dev` | `npm run build` | `npm run build:prod` |
| Auto Deploy | ❌ | ✅ (GitHub Actions) | ✅ (GitHub Actions) |
| Аудитория | Разработчики | Тестировщики | Пользователи |
| Данные | Реальные (Supabase) | Реальные (Supabase) | Реальные (Supabase) |

---

## 🎯 Лучшие практики

### ✅ ДЕЛАЕМ:

1. **Всегда тестируем на TEST** перед деплоем на PRODUCTION
2. **Используем осмысленные commit messages**:
   - `feat:` - новая функциональность
   - `fix:` - исправление бага
   - `refactor:` - рефакторинг
   - `docs:` - документация
3. **Проверяем PWA на TEST** (установка, офлайн, обновления)
4. **Обновляем версию** перед деплоем (`package.json`)
5. **Сохраняем changelog** для отслеживания изменений

### 🚫 НЕ ДЕЛАЕМ:

1. ❌ НЕ включаем Service Worker в development
2. ❌ НЕ деплоим на PRODUCTION без тестирования
3. ❌ НЕ используем `git push --force` на main ветках
4. ❌ НЕ коммитим чувствительные данные (.env файлы)
5. ❌ НЕ меняем базовые настройки PWA без тестирования

---

## 📚 Дополнительные ресурсы

- [PWA Setup Guide](./PWA_SETUP.md)
- [API Integration](./API_INTEGRATION.md)
- [CLAUDE.md](./CLAUDE.md) - Инструкции для разработки
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)

---

**Версия документа:** 1.0
**Последнее обновление:** 2025-01-19
**Автор:** TradeFrame Development Team
