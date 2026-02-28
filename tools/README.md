# 🛠️ TradeControl Builder - Инструменты разработки

Коллекция инструментов для разработки и отладки TradeControl Builder.

## 📋 Доступные инструменты

### 1. 🗄️ SQL Query Tool (`sql-direct.js`)
Прямой доступ к базе данных Supabase для всех агентов Claude Code.

**Возможности:**
- ✅ Список всех таблиц в базе данных
- ✅ Анализ структуры любой таблицы  
- ✅ Выборка данных из таблиц
- ✅ Прямые SQL запросы через REST API
- ✅ Диагностика проблем с базой данных

**Использование:**
```bash
# Показать справку
node tools/sql-direct.js

# Список таблиц
node tools/sql-direct.js tables

# Структура таблицы
node tools/sql-direct.js describe equipment_templates

# Первые 10 записей из таблицы
node tools/sql-direct.js select equipment_templates

# Выборка с фильтром
node tools/sql-direct.js select equipment_templates --limit 5
```

**Примеры:**
```bash
# Проверить доступные таблицы
node tools/sql-direct.js tables
# Результат: equipment_templates, equipment, networks, trading_points, operations, nomenclature, users, fuel_types

# Посмотреть структуру таблицы оборудования
node tools/sql-direct.js describe equipment_templates  
# Результат: id, name, system_type, technical_code, is_active, created_at, etc.

# Получить шаблоны оборудования
node tools/sql-direct.js select equipment_templates
# Результат: JSON с данными таблицы
```

## 🔧 Интеграция в разработку

### Для Claude Code агентов

Любой агент может использовать SQL Tool:

```javascript
// Импорт в коде
import { executeSelect, describeTable } from './tools/sql-direct.js';

// Получить данные
const templates = await executeSelect('equipment_templates', { limit: 5 });

// Анализ структуры
const structure = await describeTable('equipment_templates');
```

### Для отладки

```bash
# Быстрая проверка подключения
node tools/sql-direct.js tables

# Диагностика таблицы
node tools/sql-direct.js describe problematic_table

# Анализ данных
node tools/sql-direct.js select problematic_table
```

## 🔍 Диагностические возможности

### Проверка схемы базы данных
```bash
node tools/sql-direct.js describe equipment_templates
# Покажет все колонки: is_active (не status!), UUID поля, etc.
```

### Анализ данных
```bash  
node tools/sql-direct.js select equipment_templates
# Покажет реальные данные с правильными типами
```

### Проверка доступности таблиц
```bash
node tools/sql-direct.js tables  
# Покажет какие таблицы доступны для чтения/записи
```

## 📚 База данных TradeControl Builder

### Основные таблицы

| Таблица | Описание | Статус |
|---------|----------|--------|
| `equipment_templates` | Шаблоны оборудования | ✅ 6 записей |
| `equipment` | Конкретное оборудование | ✅ Доступна |
| `networks` | Торговые сети | ✅ 1 запись |  
| `trading_points` | Торговые точки | ✅ 1 запись |
| `operations` | Операции | ✅ 1 запись |
| `nomenclature` | Номенклатура товаров | ✅ 1 запись |
| `users` | Пользователи | ✅ 1 запись |
| `fuel_types` | Типы топлива | ✅ 1 запись |

### Важные особенности схемы

- **UUID поля**: Все ID в формате UUID, не строки
- **Статус полей**: Используется `is_active` (boolean), НЕ `status` (string)
- **JSON поля**: `default_params`, `config` хранятся как JSONB
- **Временные метки**: `created_at`, `updated_at` в формате ISO 8601

## 🚀 Быстрый старт для агентов

1. **Проверить подключение:**
   ```bash
   node tools/sql-direct.js tables
   ```

2. **Изучить структуру нужной таблицы:**
   ```bash
   node tools/sql-direct.js describe your_table_name
   ```

3. **Получить примеры данных:**
   ```bash
   node tools/sql-direct.js select your_table_name
   ```

4. **Интегрировать в код:**
   ```javascript
   import { executeSelect } from './tools/sql-direct.js';
   const data = await executeSelect('your_table_name');
   ```

## ⚠️ Важные замечания

- Использует Service Role Key для полного доступа
- Только для development окружения
- Для production используйте anon key с RLS политиками  
- Все изменения логируются в консоль

## 🔒 Безопасность

- Service Role Key встроен в инструмент для development
- Полный доступ к базе данных (обход RLS)
- НЕ использовать в production коде
- Только для отладки и разработки

---

**Создано**: September 4, 2025  
**Статус**: ✅ Готово к использованию  
**Доступность**: Все Claude Code агенты