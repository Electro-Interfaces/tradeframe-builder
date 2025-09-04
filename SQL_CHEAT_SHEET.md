# 🗄️ SQL Quick Reference для Claude Code Агентов

## ⚡ Быстрые команды

```bash
node tools/sql-direct.js tables                        # Все таблицы
node tools/sql-direct.js describe <table_name>         # Структура таблицы
node tools/sql-direct.js select <table_name>           # Данные таблицы
```

## 📊 Доступные таблицы

| Таблица | Статус | Описание |
|---------|--------|----------|
| `equipment_templates` | ✅ 6 записей | Шаблоны оборудования |
| `equipment` | ✅ 0 записей | Экземпляры оборудования |
| `networks` | ✅ 1 запись | Торговые сети |
| `trading_points` | ✅ 1 запись | Торговые точки |
| `operations` | ✅ 1 запись | Операции |
| `nomenclature` | ✅ 1 запись | Товары |
| `users` | ✅ 1 запись | Пользователи |
| `fuel_types` | ✅ 1 запись | Типы топлива |

## ⚠️ Критичные особенности схемы

- **✅ Статус**: `is_active` (boolean), НЕ `status` (string)
- **✅ ID**: UUID формат, НЕ строки
- **✅ JSON**: `default_params`, `config` - JSONB объекты

## 🔧 В коде JavaScript

```javascript
import { executeSelect, describeTable } from './tools/sql-direct.js';

// Получить данные
const data = await executeSelect('equipment_templates', { limit: 5 });

// Структура таблицы
const structure = await describeTable('equipment_templates');
```

## 🚨 Частые ошибки

❌ **"Column 'status' not found"** → ✅ Используйте `is_active`  
❌ **"Invalid UUID"** → ✅ Генерируйте правильные UUID  
❌ **"401 Unauthorized"** → ✅ Service Role Key уже настроен  

---
Последнее обновление: September 4, 2025