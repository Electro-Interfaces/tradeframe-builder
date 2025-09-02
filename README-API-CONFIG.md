# 🛠️ API Configuration System

Система централизованного управления подключениями к базе данных через UI.

## 🎯 Обзор

TradeFrame Builder теперь поддерживает переключение между различными источниками данных:
- **Mock Data** - локальные демо-данные (по умолчанию)
- **Local Database** - локальная PostgreSQL БД
- **Production Database** - продакшн PostgreSQL БД
- **Custom Connections** - любые пользовательские подключения

## 🚀 Быстрый старт

### 1. Переключение через UI

1. Перейдите в **Настройки > Настройки БД**
2. Выберите нужное подключение
3. Нажмите **"Переключиться"**
4. Перезагрузите страницу

### 2. Добавление нового подключения

```typescript
// В UI или программно:
await apiConfigService.addConnection({
  name: 'Моя БД',
  url: 'https://api.example.com/v1',
  type: 'postgresql',
  settings: {
    timeout: 5000,
    ssl: true
  }
});
```

### 3. Переменные окружения

```bash
# .env файл
VITE_API_URL=https://your-api.com/v1
VITE_USE_HTTP_API=true
```

## 📁 Структура файлов

```
src/services/
├── apiConfigService.ts          # Центральный сервис конфигурации
├── equipment.ts                 # ✅ Обновлен
├── components.ts                # ✅ Обновлен  
├── connections.ts               # ✅ Обновлен
├── nomenclatureService.ts       # ✅ Обновлен
├── commandTemplates.ts          # ✅ Обновлен
├── httpClients.ts               # ✅ Обновлен
├── newConnectionsService.ts     # ✅ Обновлен
└── apiSwitch.ts                 # ✅ Обновлен

src/pages/
└── DatabaseSettings.tsx         # 🆕 Страница управления БД

.env.example                     # 🆕 Пример конфигурации
```

## 🔧 Использование в коде

### Получение URL API

```typescript
import { getApiBaseUrl, isApiMockMode } from '@/services/apiConfigService';

// Получить текущий URL
const apiUrl = getApiBaseUrl();

// Проверить режим
if (isApiMockMode()) {
  console.log('Работаем с mock данными');
} else {
  console.log('Работаем с реальной БД');
}
```

### Работа с сервисом

```typescript
import { apiConfigService } from '@/services/apiConfigService';

// Получить все подключения
const connections = apiConfigService.getAllConnections();

// Текущее подключение
const current = apiConfigService.getCurrentConnection();

// Тестирование
const result = await apiConfigService.testConnection('local-db');
console.log(result); // { success: true, responseTime: 245 }

// Переключение
await apiConfigService.switchConnection('prod-db');
```

## ⚙️ Настройка подключений

### Mock режим (по умолчанию)
```typescript
{
  id: 'mock',
  name: 'Mock Data (Демо)',
  url: 'localStorage', 
  type: 'mock'
}
```

### PostgreSQL подключение
```typescript
{
  id: 'postgres-prod',
  name: 'Production PostgreSQL',
  url: 'https://api.mycompany.com/v1',
  type: 'postgresql',
  settings: {
    timeout: 10000,
    retryAttempts: 5,
    poolSize: 20,
    ssl: true
  }
}
```

### MySQL подключение
```typescript
{
  id: 'mysql-dev',
  name: 'Development MySQL',
  url: 'http://localhost:3306/api/v1',
  type: 'mysql',
  settings: {
    timeout: 5000,
    retryAttempts: 3,
    poolSize: 10,
    ssl: false
  }
}
```

## 🧪 Тестирование

### Тест одного подключения
```typescript
const result = await apiConfigService.testConnection('prod-db');
// { success: true, responseTime: 156, details: {...} }
```

### Тест всех подключений
```typescript
const results = await apiConfigService.testAllConnections();
// { 'mock': { success: true }, 'prod-db': { success: false, error: 'Timeout' } }
```

## 🔒 Безопасность

### Валидация
- URL валидация
- Timeout защита (до 10 минут)
- SSL поддержка
- Retry механизм

### Ограничения
- Нельзя удалить активное подключение
- Нельзя удалить системные подключения
- Автоматическое тестирование перед переключением

## 📊 Мониторинг

### Получение статистики
```typescript
const stats = apiConfigService.getUsageStats();
console.log(stats);
// {
//   currentConnection: 'Production БД',
//   connectionType: 'postgresql', 
//   totalConnections: 3,
//   mockMode: false,
//   debugMode: true
// }
```

### Отладка (dev режим)
```javascript
// В консоли браузера доступно:
window.apiConfigService.getCurrentConnection();
window.apiConfigService.testAllConnections();
```

## 💾 Экспорт/Импорт

### Экспорт конфигурации
```typescript
const config = apiConfigService.exportConfig();
// JSON строка с полной конфигурацией
```

### Импорт конфигурации  
```typescript
const success = apiConfigService.importConfig(configJson);
if (success) {
  console.log('Конфигурация импортирована');
}
```

### Сброс к умолчанию
```typescript
apiConfigService.resetToDefault();
```

## 🔄 Миграция с старой системы

### Было (разрозненные конфигурации):
```typescript
// В разных файлах:
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const API_BASE_URL = '/api/v1';
const API_BASE_URL = 'http://localhost:3000/api/v1';
```

### Стало (централизованно):
```typescript
// Везде одинаково:
import { getApiBaseUrl } from '@/services/apiConfigService';
const API_BASE_URL = getApiBaseUrl();
```

## 🚦 Статусы подключений

| Статус | Описание | Иконка |
|--------|----------|--------|
| `active` | Активное подключение | ✅ |
| `success` | Тест прошел успешно | ✅ |
| `error` | Ошибка подключения | ❌ |
| `testing` | Идет тестирование | 🔄 |
| `unknown` | Статус не определен | ❓ |

## 📋 TODO для разработчиков

- [ ] Добавить аутентификацию для API
- [ ] Интеграция с CI/CD
- [ ] Мониторинг в реальном времени  
- [ ] Автоматический failover
- [ ] Кэширование результатов тестирования

## 🆘 Поддержка

При возникновении проблем:

1. **Проверьте настройки** в `Настройки > Настройки БД`
2. **Протестируйте подключение** кнопкой "Тест"
3. **Посмотрите логи** в консоли браузера (F12)
4. **Сбросьте настройки** к умолчанию при необходимости

---

**🎯 Результат:** Теперь переключение между различными БД происходит через удобный UI без изменения кода!