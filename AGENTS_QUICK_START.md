# 🤖 Быстрый старт для Claude Code агентов

## 🔧 Прямой SQL доступ

**ВАЖНО**: Теперь у вас есть прямой доступ к базе данных!

### Основные команды

```bash
# 1. Проверить доступные таблицы
node tools/sql-direct.js tables

# 2. Изучить структуру таблицы 
node tools/sql-direct.js describe equipment_templates

# 3. Получить данные
node tools/sql-direct.js select equipment_templates
```

### 📊 Доступные таблицы (всего 8)

| Таблица | Записей | Описание |
|---------|---------|----------|
| `equipment_templates` | 6 | Шаблоны оборудования |
| `equipment` | 0 | Конкретное оборудование |
| `networks` | 1 | Торговые сети |
| `trading_points` | 1 | Торговые точки (АЗС) |
| `operations` | 1 | Операции |
| `nomenclature` | 1 | Номенклатура товаров |
| `users` | 1 | Пользователи |
| `fuel_types` | 1 | Типы топлива |

### ⚠️ Важные особенности схемы

- **✅ Колонка статуса**: `is_active` (boolean), НЕ `status` (string)
- **✅ ID поля**: UUID формат, не строки
- **✅ JSON поля**: `default_params`, `config` - JSONB
- **✅ Доступ**: Service Role Key (полные права)

### 🚀 Примеры использования

#### Быстрая диагностика
```bash
# Что не так с таблицей?
node tools/sql-direct.js describe problematic_table
node tools/sql-direct.js select problematic_table
```

#### Анализ данных
```bash
# Сколько шаблонов оборудования?
node tools/sql-direct.js select equipment_templates
# Ответ: 6 шаблонов (Резервуар, ТСО, Система управления, и др.)
```

#### В коде JavaScript
```javascript
import { executeSelect, describeTable } from './tools/sql-direct.js';

// Получить все шаблоны
const templates = await executeSelect('equipment_templates');

// Структура таблицы  
const structure = await describeTable('equipment_templates');
```

### 🔍 Решение типичных проблем

**Проблема**: "Column 'status' not found"  
**Решение**: Используйте `is_active` вместо `status`

**Проблема**: "Invalid UUID format"  
**Решение**: Генерируйте правильные UUID, не строки

**Проблема**: "401 Unauthorized"  
**Решение**: Service Role Key уже настроен в инструменте

### 📚 Полная документация

- `tools/README.md` - Полное описание всех инструментов
- `DATABASE_SETUP_GUIDE.md` - Настройка базы данных
- `CLAUDE.md` - Общее руководство для агентов

---
**Обновлено**: September 4, 2025  
**Статус**: ✅ Готово к использованию  
**База данных**: ✅ 100% функциональна