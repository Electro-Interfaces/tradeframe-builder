# PWA (Progressive Web App) Setup

## ✅ Установка завершена

TradeControl Builder теперь поддерживает PWA функциональность с помощью `vite-plugin-pwa`.

## 🎯 Основные возможности

### 1. **Автоматическое обновление**
- Service Worker автоматически обновляется при новых версиях
- Режим `registerType: 'autoUpdate'` обеспечивает бесшовное обновление

### 2. **Офлайн работа**
- Приложение кэширует статические ресурсы (JS, CSS, HTML, шрифты, изображения)
- API запросы кэшируются с помощью стратегии `NetworkFirst`
- Шрифты Google Fonts кэшируются с помощью стратегии `CacheFirst`

### 3. **Установка на устройства**
- Можно установить как нативное приложение на:
  - Android (Chrome, Samsung Internet)
  - iOS (Safari)
  - Desktop (Chrome, Edge, Opera)

## 📦 Установленные пакеты

```json
{
  "vite-plugin-pwa": "^0.21.1",
  "workbox-window": "^7.3.0"
}
```

## ⚙️ Конфигурация

### vite.config.ts

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'TradeControl Builder',
    short_name: 'TradeControl',
    description: 'Платформа управления торговыми сетями АЗС',
    theme_color: '#1e293b',
    background_color: '#0f172a',
    display: 'standalone',
    icons: [...]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    runtimeCaching: [...]
  }
})
```

### Иконки

Созданы PWA иконки в директории `public/`:
- `pwa-192x192.png` - стандартная иконка 192x192
- `pwa-512x512.png` - большая иконка 512x512 (также используется как maskable)

## 🚀 Использование

### Development

```bash
npm run dev
```

PWA включен даже в режиме разработки (`devOptions.enabled: true`).

### Production

```bash
npm run build
npm run preview
```

После сборки в директории `dist/` создаются:
- `manifest.webmanifest` - манифест приложения
- `sw.js` - Service Worker
- `workbox-*.js` - библиотека Workbox
- `registerSW.js` - скрипт регистрации Service Worker

## 📱 Тестирование PWA

### Chrome DevTools

1. Откройте приложение в Chrome
2. DevTools → Application → Service Workers
3. Проверьте регистрацию Service Worker
4. Application → Manifest - просмотр манифеста
5. Lighthouse → Run audit (PWA категория)

### Установка на устройство

**Desktop (Chrome/Edge):**
- В адресной строке появится иконка установки
- Или: Меню → "Установить TradeControl"

**Android:**
- Chrome → Меню → "Добавить на главный экран"

**iOS:**
- Safari → Поделиться → "На экран Домой"

## 🎨 Кэширование

### Стратегии кэширования

1. **Статические ресурсы** - автоматическое кэширование всех JS/CSS/HTML/изображений
2. **API запросы** (`NetworkFirst`):
   - Сначала пытается получить данные из сети
   - При отсутствии сети использует кэш
   - Максимум 50 записей, срок хранения 24 часа
3. **Google Fonts** (`CacheFirst`):
   - Сначала проверяет кэш
   - Срок хранения 1 год

## 🔧 Настройка под конкретный проект

### Изменение иконок

Замените файлы в `public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`

### Изменение цветов темы

В `vite.config.ts` → `VitePWA.manifest`:
```typescript
theme_color: '#1e293b',      // Цвет темы (верхняя панель Android)
background_color: '#0f172a'  // Фон экрана загрузки
```

### Изменение стратегий кэширования

В `vite.config.ts` → `VitePWA.workbox.runtimeCaching`:
```typescript
{
  urlPattern: /ваш-паттерн/i,
  handler: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate',
  options: { ... }
}
```

## 📊 Метрики PWA

Проверьте PWA score с помощью:
- **Lighthouse** (Chrome DevTools)
- **WebPageTest** (https://www.webpagetest.org/)
- **PWA Builder** (https://www.pwabuilder.com/)

## 🐛 Отладка

### Очистка кэша Service Worker

**Chrome:**
```
DevTools → Application → Clear storage → Clear site data
```

**Программно:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})
```

### Проверка обновлений

Service Worker автоматически проверяет обновления каждые 24 часа или при повторном посещении.

## 📚 Дополнительная информация

- [vite-plugin-pwa документация](https://vite-pwa-org.netlify.app/)
- [Workbox документация](https://developer.chrome.com/docs/workbox/)
- [PWA спецификация](https://web.dev/progressive-web-apps/)

## ⚠️ Важные замечания

1. PWA требует HTTPS в production (или localhost для development)
2. Service Worker кэширует ресурсы агрессивно - используйте версионирование
3. Для обновления PWA пользователи должны перезагрузить страницу
4. iOS Safari имеет ограничения на размер кэша (обычно ~50MB)

## 🎉 Следующие шаги

- [ ] Протестировать установку на реальных устройствах
- [ ] Настроить push-уведомления (опционально)
- [ ] Добавить стратегию обновления с уведомлением пользователя
- [ ] Оптимизировать размер кэша для мобильных устройств
