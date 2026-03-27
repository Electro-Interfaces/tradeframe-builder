# Управление версиями TradeControl

## 📌 Единый источник версии

Версия приложения управляется из **одного места**: `src/config/version.ts`

```typescript
export const APP_VERSION = '2.0.2';
```

## 🔄 Автоматическая синхронизация

При сборке приложения версия автоматически синхронизируется во все файлы:

### Файлы, обновляемые автоматически:

1. **package.json** - версия npm пакета
2. **public/manifest.json** - версия PWA манифеста
3. **index.html** (5 мест):
   - `<title>` - заголовок страницы
   - `<meta name="cache-buster">` - cache-buster с датой
   - `const APP_VERSION` - версия для мобильного скрипта
   - `<link rel="manifest">` - версия в query параметре
   - `<p>v2.0.2</p>` - версия на экране загрузки

### Скрипт синхронизации

**Путь**: `scripts/update-version.cjs`

**Запуск вручную**:
```bash
npm run sync-version
```

**Автоматический запуск**: Перед каждой сборкой
```bash
npm run build      # TEST
npm run build:prod # Production
npm run build:dev  # Development
```

## 📝 Как изменить версию

### Шаг 1: Измените версию в одном файле

```typescript
// src/config/version.ts
export const APP_VERSION = '1.5.26'; // Новая версия
```

### Шаг 2: Запустите синхронизацию (опционально)

Если хотите проверить изменения до сборки:
```bash
npm run sync-version
```

### Шаг 3: Соберите проект

```bash
npm run build
```

Версия автоматически обновится во всех файлах! ✅

## 🎯 Формат версии

Используется **семантическое версионирование**: `MAJOR.MINOR.PATCH`

- **MAJOR** (1.x.x) - Breaking changes, несовместимые изменения
- **MINOR** (x.5.x) - Новые функции, обратная совместимость
- **PATCH** (x.x.25) - Исправления ошибок, мелкие улучшения

### Примеры обновления версии:

```typescript
// Исправление бага
'1.5.25' → '1.5.26'

// Новая функция
'1.5.26' → '1.6.0'

// Breaking change
'1.6.0' → '2.0.0'
```

## ⚠️ Важные заметки

1. **НЕ редактируйте версию вручную** в `package.json`, `manifest.json` или `index.html`
2. Все изменения делайте **только в** `src/config/version.ts`
3. Скрипт синхронизации запускается **автоматически** перед каждой сборкой
4. Cache-buster в `index.html` автоматически получает текущую дату

## 🔍 Проверка версии

### В браузере (DevTools Console):

```javascript
// После загрузки приложения
import { APP_VERSION } from './src/config/version';
console.log(APP_VERSION); // "1.5.25"
```

### В терминале:

```bash
# Проверить версию в package.json
npm version

# Проверить версию в исходниках
grep "APP_VERSION = " src/config/version.ts
```

## 🚀 CI/CD Integration

GitHub Actions автоматически запускает `npm run build`, который включает синхронизацию версии:

```yaml
# .github/workflows/ghp-deploy.yml
- name: Build project
  run: npm run build  # ← Включает sync-version
```

## 📚 Дополнительные ресурсы

- [Semantic Versioning](https://semver.org/)
- [Vite Build Configuration](https://vitejs.dev/config/)
- [PWA Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
