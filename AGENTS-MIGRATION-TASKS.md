# 🚀 ТЕХНИЧЕСКИЕ ЗАДАНИЯ АГЕНТАМ: ЗАВЕРШЕНИЕ МИГРАЦИИ НА 100%

## 📊 ТЕКУЩИЙ СТАТУС
- **Прогресс миграции: 36.4%**
- **Осталось обновить: 21 файл**
- **Цель: 100% миграция на централизованную БД**

---

## 🤖 АГЕНТ 1: КРИТИЧЕСКИЕ СЕРВИСЫ И API

### 📋 ЗАДАНИЕ
Обновить оставшиеся критически важные сервисы приложения

### 🎯 ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ (7 файлов):
1. `src/services/legalDocumentsService.ts` 
2. `src/services/operationsService.ts` (дочистить)
3. `src/services/equipment.ts` (дочистить) 
4. `src/services/shiftReportsService.ts`
5. `src/services/supabaseAuthService.ts`
6. `src/services/newConnectionsService.ts`
7. `src/services/connections.ts`

### 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
```typescript
// ❌ ЗАМЕНИТЬ:
import { apiConfigService } from './apiConfigService';
const url = apiConfigService.getCurrentApiUrl();
if (apiConfigService.isMockMode()) { ... }

// ✅ НА:
import { apiConfigServiceDB } from './apiConfigServiceDB';
const url = await this.getApiUrl();
if (await apiConfigServiceDB.isMockMode()) { ... }

// ✅ ДОБАВИТЬ HELPER:
private async getApiUrl() {
  const connection = await apiConfigServiceDB.getCurrentConnection();
  return connection?.url || '';
}
```

### 📝 ПАТТЕРН ЗАМЕН:
- `apiConfigService.getCurrentApiUrl()` → `await this.getApiUrl()`
- `apiConfigService.isMockMode()` → `await apiConfigServiceDB.isMockMode()`
- `apiConfigService.getCurrentConnection()` → `await apiConfigServiceDB.getCurrentConnection()`
- `localStorage.getItem` → удалить или заменить на БД
- `sessionStorage.getItem` → удалить или заменить на БД

### ✅ КРИТЕРИЙ ЗАВЕРШЕНИЯ:
Все 7 файлов должны использовать только `apiConfigServiceDB` и не содержать `apiConfigService`

---

## 🤖 АГЕНТ 2: СТРАНИЦЫ И КОМПОНЕНТЫ

### 📋 ЗАДАНИЕ
Обновить все страницы приложения для работы с новой архитектурой

### 🎯 ФАЙЛЫ ДЛЯ ОБНОВЛЕНИЯ (7 файлов):
1. `src/pages/DataInspector.tsx`
2. `src/pages/LoginPageWithLegal.tsx` 
3. `src/pages/PartialMigrationSettings.tsx`
4. `src/services/authService.ts`
5. `src/services/componentSystemTypesService.ts`
6. `src/services/systemTypesService.ts`
7. `src/services/tradingNetworkConfigService.ts`

### 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
```typescript
// ❌ В React компонентах заменить:
const config = apiConfigService.getCurrentConfig();

// ✅ НА:
const [config, setConfig] = useState(null);
useEffect(() => {
  const loadConfig = async () => {
    const cfg = await apiConfigServiceDB.getCurrentConfig();
    setConfig(cfg);
  };
  loadConfig();
}, []);
```

### 📝 СПЕЦИФИЧНЫЕ ЗАМЕНЫ:
- В `.tsx` файлах: создать асинхронную загрузку конфигурации
- `localStorage.getItem("database_connections")` → вызов `systemConfigService`
- Все синхронные вызовы конфигурации → асинхронные с useState/useEffect

### ✅ КРИТЕРИЙ ЗАВЕРШЕНИЯ:
Все страницы загружают конфигурацию из БД асинхронно

---

## 🤖 АГЕНТ 3: УСТАРЕВШИЕ И ДУБЛИРУЮЩИЕ ФАЙЛЫ

### 📋 ЗАДАНИЕ
Очистить устаревшие файлы и исправить дублирование конфигураций

### 🎯 ФАЙЛЫ ДЛЯ ОБРАБОТКИ (7 файлов):
1. `src/services/commandTemplates.ts`
2. `src/services/components.ts`
3. `src/services/nomenclatureService-old.ts`
4. `src/services/operationsService.clean.ts`
5. `src/services/operationsService.old.ts` 
6. `src/services/operationsService.original.ts`
7. `src/services/pricesService.updated.ts`

### 🔧 ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
```typescript
// ✅ ОЧИСТИТЬ ФАЙЛЫ С СУФФИКСАМИ:
// - .old.ts (устаревшие версии)
// - .clean.ts (временные версии) 
// - .original.ts (бэкапы)
// - .updated.ts (если есть основная версия)

// ✅ В ОСТАВШИХСЯ ФАЙЛАХ:
// Применить тот же паттерн замен что и у Агента 1
```

### 📝 ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ:
- Убрать дублирование в смешанных файлах (оставить только новую архитектуру)
- Проверить что основные файлы не потеряют функциональность
- Удалить неиспользуемые импорты

### ✅ КРИТЕРИЙ ЗАВЕРШЕНИЯ:
- Удалены дублирующие файлы
- Основные файлы используют только новую архитектуру

---

## 🎯 ОБЩИЕ ТРЕБОВАНИЯ ДЛЯ ВСЕХ АГЕНТОВ

### 🛠️ ОБЯЗАТЕЛЬНЫЕ ДЕЙСТВИЯ:
1. **НЕ ЗАДАВАТЬ ВОПРОСОВ** - выполнять миграцию согласно паттернам
2. **СОХРАНЯТЬ ФУНКЦИОНАЛЬНОСТЬ** - не ломать существующую логику
3. **ТЕСТИРОВАТЬ ИЗМЕНЕНИЯ** - проверять что файлы компилируются
4. **ЛОГИРОВАТЬ ПРОГРЕСС** - отчитываться о выполненных файлах

### 🔍 ПРОВЕРКА КАЧЕСТВА:
```bash
# После работы каждого агента запускать:
node analyze-services-config.js

# Цель: увидеть рост процента миграции
# Агент 1: ~60%
# Агент 2: ~85% 
# Агент 3: ~100%
```

### ⚡ ФИНАЛЬНАЯ ПРОВЕРКА:
После работы всех агентов должно быть:
- **0 файлов** с `apiConfigService` (кроме самого `apiConfigService.ts`)
- **0 файлов** с `localStorage.getItem("database_connections")`
- **100% файлов** используют `apiConfigServiceDB` или `systemConfigService`
- **Все разделы приложения** реагируют на изменения в "Обмен данными"

---

## 🚨 КРИТИЧЕСКИ ВАЖНО

### ❌ НЕ ТРОГАТЬ:
- `src/services/apiConfigService.ts` (оригинальный файл для fallback)
- `src/services/apiConfigServiceDB.ts` (новый основной сервис)  
- `src/services/systemConfigService.ts` (сервис БД)
- `src/services/supabaseConfigManager.ts` (менеджер конфигураций)

### ✅ ПАТТЕРН МИГРАЦИИ:
```typescript
// БЫЛО:
import { apiConfigService } from './apiConfigService';
const handleData = () => {
  if (apiConfigService.isMockMode()) {
    return mockData;
  }
  const url = apiConfigService.getCurrentApiUrl();
  return fetch(url);
};

// СТАЛО:
import { apiConfigServiceDB } from './apiConfigServiceDB';
const handleData = async () => {
  if (await apiConfigServiceDB.isMockMode()) {
    return mockData;
  }
  const url = await this.getApiUrl();
  return fetch(url);
};

private async getApiUrl() {
  const connection = await apiConfigServiceDB.getCurrentConnection();
  return connection?.url || '';
}
```

---

## 🎉 РЕЗУЛЬТАТ

После выполнения заданий всеми агентами:
- **✅ 100% миграция завершена**
- **✅ Все разделы используют centralized database configuration**
- **✅ Переключение подключений работает во всех разделах**
- **✅ localStorage больше не используется для конфигурации**

**🎯 ЦЕЛЬ ДОСТИГНУТА: База данных как единственный источник истины для конфигурации!**