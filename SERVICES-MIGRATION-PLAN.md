# 📋 ПЛАН МИГРАЦИИ ВСЕХ СЕРВИСОВ НА ЦЕНТРАЛИЗОВАННУЮ КОНФИГУРАЦИЮ

## 🎯 ЦЕЛЬ
Привести все сервисы к единой архитектуре с использованием централизованной конфигурации из раздела "Обмен данными" (`apiConfigServiceDB`) и исключить локальную работу.

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ

### ✅ Уже корректно настроены:
- `operationsService.ts` - использует `apiConfigServiceDB.isMockMode()`
- `pricesService.ts` - использует `apiConfigServiceDB.isMockMode()`  
- `networksService.ts` - использует только Supabase
- `tanksService.ts` - переключен на tanksServiceSupabase
- `equipment.ts` - использует `apiConfigServiceDB.getCurrentConnection()`
- `equipmentTypes.ts` - работает с Supabase

### ❌ Требуют миграции:
**Работают локально:** 20 сервисов  
**Не используют конфигурацию:** 25 сервисов  
**Устаревшие/дублирующие:** 15 сервисов

---

## 🚀 ПЛАН МИГРАЦИИ (ПОЭТАПНО)

### ЭТАП 1: АВТОРИЗАЦИЯ И ПОЛЬЗОВАТЕЛИ
**Приоритет: КРИТИЧЕСКИЙ**

#### 1.1 Миграция authService.ts
**Текущее состояние:** Использует localStorage + WebCrypto
**План:**
- [ ] Создать `authSupabaseService.ts` с интеграцией Supabase Auth
- [ ] Модифицировать `authService.ts` для использования `apiConfigServiceDB`
- [ ] Добавить переключение mock/database режимов
- [ ] Сохранить совместимость с WebCrypto для локальной разработки
- [ ] Тестирование авторизации

#### 1.2 Миграция usersService.ts
**Текущее состояние:** Использует PersistentStorage (localStorage)
**План:**
- [ ] Интегрировать с существующим `usersSupabaseService.ts`
- [ ] Добавить логику переключения через `apiConfigServiceDB.isMockMode()`
- [ ] Сохранить fallback на localStorage при недоступности БД
- [ ] Обновить интерфейсы для совместимости

### ЭТАП 2: СООБЩЕНИЯ И КОММУНИКАЦИИ
**Приоритет: ВЫСОКИЙ**

#### 2.1 Миграция messagesService.ts
**Текущее состояние:** Использует PersistentStorage (localStorage)
**План:**
- [ ] Интегрировать с существующим `messagesSupabaseService.ts`
- [ ] Добавить переключение mock/database через `apiConfigServiceDB`
- [ ] Обновить типы для совместимости с Supabase схемой
- [ ] Реализовать миграцию данных из localStorage в Supabase

#### 2.2 Миграция telegramService.ts
**Текущее состояние:** Telegram API + localStorage настройки
**План:**
- [ ] Интегрировать настройки Telegram с `systemConfigService`
- [ ] Использовать `apiConfigServiceDB` для управления конфигурацией
- [ ] Сохранить функциональность Telegram Bot API
- [ ] Добавить централизованное хранение webhook настроек

### ЭТАП 3: КОМАНДЫ И ШАБЛОНЫ
**Приоритет: ВЫСОКИЙ**

#### 3.1 Миграция commandsService.ts
**Текущее состояние:** Использует PersistentStorage (localStorage)
**План:**
- [ ] Интегрировать с существующим `commandTemplatesSupabase.ts`
- [ ] Добавить переключение mock/database через `apiConfigServiceDB`
- [ ] Создать миграцию шаблонов команд в Supabase
- [ ] Обновить типы и интерфейсы

#### 3.2 Миграция commandTemplates.ts
**Текущее состояние:** Использует PersistentStorage (localStorage)
**План:**
- [ ] Объединить с `commandTemplatesSupabase.ts`
- [ ] Использовать `apiConfigServiceDB` для переключения режимов
- [ ] Сохранить совместимость с существующими шаблонами

### ЭТАП 4: СИСТЕМНЫЕ ТИПЫ И КОМПОНЕНТЫ
**Приоритет: СРЕДНИЙ**

#### 4.1 Миграция systemTypesService.ts
**Текущее состояние:** Моки + localStorage
**План:**
- [ ] Интегрировать с существующим `systemTypesSupabaseService.ts`
- [ ] Добавить переключение через `apiConfigServiceDB.isMockMode()`
- [ ] Перенести моковые данные в Supabase
- [ ] Обновить компоненты для работы с новой архитектурой

#### 4.2 Миграция componentSystemTypesService.ts
**План:**
- [ ] Интегрировать с `componentsSupabase.ts`
- [ ] Использовать централизованную конфигурацию
- [ ] Убрать прямую работу с localStorage

#### 4.3 Миграция componentStatusService.ts
**План:**
- [ ] Интегрировать с `componentStatusSupabaseService.ts`
- [ ] Добавить переключение режимов
- [ ] Обновить статусную логику

### ЭТАП 5: РАБОЧИЕ ПРОЦЕССЫ И ИНСТРУКЦИИ
**Приоритет: СРЕДНИЙ**

#### 5.1 Миграция workflowsService.ts
**План:**
- [ ] Интегрировать с `workflowsSupabaseService.ts`
- [ ] Добавить переключение через `apiConfigServiceDB`
- [ ] Сохранить логику выполнения workflow

#### 5.2 Миграция instructionsService.ts
**План:**
- [ ] Интегрировать с `instructionsSupabaseService.ts`
- [ ] Добавить управление через `apiConfigServiceDB`
- [ ] Перенести существующие инструкции

### ЭТАП 6: ИСПРАВЛЕНИЕ ПРЯМЫХ ПОДКЛЮЧЕНИЙ К SUPABASE
**Приоритет: КРИТИЧЕСКИЙ**

#### 6.1 Исправить tradingNetworkConfigService.ts
**Проблема:** Собственный localStorage.getItem()
**План:**
- [ ] Интегрировать с `systemConfigService`
- [ ] Использовать `apiConfigServiceDB` для управления
- [ ] Обновить компоненты настроек
- [ ] Сохранить совместимость с существующими настройками

#### 6.2 Исправить tradingPointsService.ts
**Проблема:** Прямое подключение к Supabase
**План:**
- [ ] Добавить переключение через `apiConfigServiceDB`
- [ ] Реализовать mock режим для разработки
- [ ] Сохранить существующую функциональность

#### 6.3 Стандартизировать Supabase сервисы
**Проблема:** Все *SupabaseService.ts минуют конфигурацию
**План:**
- [ ] Добавить проверку `apiConfigServiceDB.getCurrentConnection()`
- [ ] Реализовать fallback механизмы
- [ ] Стандартизировать обработку ошибок
- [ ] Добавить логирование подключений

### ЭТАП 7: ОЧИСТКА И ОПТИМИЗАЦИЯ
**Приоритет: НИЗКИЙ**

#### 7.1 Удалить устаревшие файлы
- [ ] `*Service.old.ts` файлы
- [ ] `*Service-old.ts` файлы
- [ ] `*Service.original.ts` файлы
- [ ] `*Service.clean.ts` файлы

#### 7.2 Обновить документацию
- [ ] Обновить CLAUDE.md
- [ ] Создать документацию по новой архитектуре
- [ ] Обновить комментарии в коде

---

## 🛠️ ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ

### Архитектурные принципы:
1. **Централизованная конфигурация** - все через `apiConfigServiceDB`
2. **Graceful fallback** - localStorage как резерв при недоступности БД
3. **Режим переключения** - mock/database через `isMockMode()`
4. **Единообразие** - стандартные паттерны для всех сервисов
5. **Обратная совместимость** - сохранение существующих API

### Стандартный шаблон сервиса:
```typescript
import { apiConfigServiceDB } from './apiConfigServiceDB';
import { supabaseSpecificService } from './supabaseSpecificService';
import { PersistentStorage } from '@/utils/persistentStorage';

class StandardService {
  async initialize() {
    await apiConfigServiceDB.initialize();
  }

  async getData() {
    try {
      if (await apiConfigServiceDB.isMockMode()) {
        // Fallback на localStorage
        return PersistentStorage.getItem('key') || [];
      } else {
        // Работа с базой данных
        return await supabaseSpecificService.getData();
      }
    } catch (error) {
      // Graceful fallback
      console.warn('Database unavailable, falling back to localStorage');
      return PersistentStorage.getItem('key') || [];
    }
  }
}
```

---

## 📅 ВРЕМЕННЫЕ РАМКИ

### Неделя 1: Критические сервисы
- Авторизация (authService, usersService)
- TradingNetworkConfig исправление
- Базовое тестирование

### Неделя 2: Основные сервисы
- Сообщения и команды
- Системные типы
- Компоненты

### Неделя 3: Прямые подключения Supabase
- Стандартизация *SupabaseService.ts
- TradingPoints и другие
- Интенсивное тестирование

### Неделя 4: Финализация
- Очистка кода
- Документация
- Финальное тестирование

---

## ⚠️ РИСКИ И МЕРЫ СНИЖЕНИЯ

### Риск 1: Потеря данных при миграции
**Мера:** Резервное копирование localStorage перед каждой миграцией

### Риск 2: Нарушение работы существующих компонентов
**Мера:** Поэтапная миграция с сохранением обратной совместимости

### Риск 3: Проблемы с производительностью
**Мера:** Кэширование и оптимизация запросов к БД

### Риск 4: Недоступность Supabase
**Мера:** Обязательный fallback на localStorage

---

## ✅ КРИТЕРИИ УСПЕХА

1. Все сервисы используют `apiConfigServiceDB` для конфигурации
2. Нет прямой работы с localStorage (кроме fallback)
3. Все сервисы поддерживают переключение mock/database
4. Сохранена функциональность всех существующих компонентов
5. Проходят все тесты
6. Настройки корректно управляются из раздела "Обмен данными"

---

## 📞 ПОДДЕРЖКА

При возникновении проблем:
1. Проверить логи `apiConfigServiceDB`
2. Проверить статус в разделе "Обмен данными"
3. Использовать fallback режим для критических функций
4. Документировать проблемы в этом файле

---

**Последнее обновление:** 2025-09-05  
**Статус:** План создан, готов к выполнению  
**Исполнитель:** Claude Code Agent