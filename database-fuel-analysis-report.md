# 📊 Анализ данных по видам топлива в базе данных

## 🔍 Результаты анализа схемы БД

### ✅ Найденные таблицы (7 из 7):
- 🏷️ **fuel_types** - 8 записей ✅
- 📋 **nomenclature** - 5 записей ✅  
- 🔗 **nomenclature_external_codes** - 7 записей ✅
- 🛢️ **tanks** - 8 записей ✅
- 🏪 **trading_points** - 6 записей ✅
- 🌐 **networks** - 2 записи ✅
- ❌ **prices** - Таблица недоступна ⚠️

## 🔥 Критические проблемы

### 1. ❌ **Отсутствует таблица prices**
- **Проблема:** Таблица `prices` не найдена или недоступна
- **Влияние:** Невозможно установить и получить цены на топливо
- **Решение:** Проверить существование таблицы или создать её

### 2. ⚠️ **Некорректные связи в tanks**
- **Проблема:** В таблице `tanks` поле `fuel_type_id` = null у всех записей
- **Ожидалось:** Ссылки на `fuel_types.id`
- **Текущие данные:**
  ```
  Резервуар №1 (АИ-95) → fuel_type_id: null
  Резервуар №2 (АИ-92) → fuel_type_id: null  
  Резервуар №3 (ДТ) → fuel_type_id: null
  ```

### 3. 🔄 **Несоответствие структуры данных**

**Правильная схема должна быть:**
```
fuel_types (справочник)
├── id: UUID (PK)
├── name: "АИ-95", "АИ-92", "ДТ"
└── code: "AI95", "AI92", "DT"

tanks (резервуары)
├── id: UUID (PK)
├── fuel_type_id: UUID (FK → fuel_types.id) ❌ сейчас null
└── trading_point_id: UUID (FK → trading_points.id)

prices (цены)
├── id: UUID (PK)
├── fuel_type_id: UUID (FK → fuel_types.id)
├── trading_point_id: UUID (FK → trading_points.id)
└── price_gross: number
```

## 📋 Детальные данные

### 🏷️ **fuel_types** (8 записей) ✅
**Виды топлива в справочнике:**
- АИ-92 (AI92, Бензин, октановое число: 92)
- АИ-95 (AI95, Бензин, октановое число: 95) 
- АИ-98 (AI98, Бензин, октановое число: 98)
- ДТ (DT, Дизель)
- Газ (GAS, Газ)
- ДТ Зимнее (DT_WINTER, Дизель)
- ДТ Арктическое (DT_ARCTIC, Дизель)
- AdBlue (ADBLUE, Присадка)

### 📋 **nomenclature** (5 записей) ✅
**Номенклатура по сетям:**
- АИ-92 (AI92) → network: Демо сеть АЗС
- АИ-95 (AI95) → network: Демо сеть АЗС  
- АИ-98 (AI98) → network: Демо сеть АЗС
- ДТ (DT) → network: Демо сеть АЗС
- АИ-95 Премиум (AI95_PREMIUM) → network: Норд Лайн

### 🛢️ **tanks** (8 резервуаров) ⚠️
**Проблема:** Все `fuel_type_id = null`
```
Резервуар №1 (АИ-95) → fuel_type_id: null ❌
Резервуар №2 (АИ-92) → fuel_type_id: null ❌
Резервуар №3 (ДТ) → fuel_type_id: null ❌
```

### 🏪 **trading_points** (6 точек) ✅
- АЗС №001 - Центральная (Невский проспект)
- АЗС №002 - Северная (пр. Энгельса)  
- АЗС №003 - Южная (Московский проспект)
- АЗС №004 - Восточная
- АЗС №005 - Западная
- АЗС №006 - Промышленная

## 🔧 Необходимые исправления

### 1. **Создать/проверить таблицу prices**
```sql
CREATE TABLE IF NOT EXISTS prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_point_id UUID REFERENCES trading_points(id),
    fuel_type_id UUID REFERENCES fuel_types(id),
    price_net INTEGER NOT NULL, -- в копейках
    price_gross INTEGER NOT NULL, -- в копейках
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_to TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. **Исправить связи в tanks**
```sql
-- Обновить резервуары с правильными fuel_type_id
UPDATE tanks SET fuel_type_id = (
    SELECT id FROM fuel_types WHERE name = 'АИ-95' LIMIT 1
) WHERE name LIKE '%АИ-95%';

UPDATE tanks SET fuel_type_id = (
    SELECT id FROM fuel_types WHERE name = 'АИ-92' LIMIT 1  
) WHERE name LIKE '%АИ-92%';

UPDATE tanks SET fuel_type_id = (
    SELECT id FROM fuel_types WHERE name = 'ДТ' LIMIT 1
) WHERE name LIKE '%ДТ%';
```

### 3. **Создать демо-данные для prices**
```sql
-- Добавить цены для каждой торговой точки и вида топлива
INSERT INTO prices (trading_point_id, fuel_type_id, price_net, price_gross)
SELECT 
    tp.id as trading_point_id,
    ft.id as fuel_type_id,
    CASE ft.name 
        WHEN 'АИ-92' THEN 5500  -- 55.00 руб нетто
        WHEN 'АИ-95' THEN 5800  -- 58.00 руб нетто  
        WHEN 'АИ-98' THEN 6200  -- 62.00 руб нетто
        WHEN 'ДТ' THEN 5200     -- 52.00 руб нетто
        ELSE 5000
    END as price_net,
    CASE ft.name 
        WHEN 'АИ-92' THEN 6600  -- 66.00 руб с НДС
        WHEN 'АИ-95' THEN 6960  -- 69.60 руб с НДС
        WHEN 'АИ-98' THEN 7440  -- 74.40 руб с НДС  
        WHEN 'ДТ' THEN 6240     -- 62.40 руб с НДС
        ELSE 6000
    END as price_gross
FROM trading_points tp
CROSS JOIN fuel_types ft
WHERE ft.name IN ('АИ-92', 'АИ-95', 'АИ-98', 'ДТ')
AND ft.is_active = true;
```

## 🎯 Влияние на приложение

### ❌ **Текущие проблемы:**
1. **Страница цен:** Не работает из-за отсутствия таблицы `prices`
2. **Связь резервуаров:** Невозможно определить тип топлива в резервуаре
3. **Фильтрация:** Нарушена логика связи топлива между компонентами

### ✅ **После исправления:**
1. **Корректная связь:** fuel_types ← tanks ← trading_points  
2. **Рабочие цены:** fuel_types ← prices ← trading_points
3. **Правильная фильтрация:** Виды топлива берутся из резервуаров торговой точки

## 🚨 Критичность: ВЫСОКАЯ
Без этих исправлений функциональность работы с ценами и резервуарами работать не будет.

## 📋 План действий
1. ✅ Проверить/создать таблицу `prices`
2. ✅ Исправить `fuel_type_id` в таблице `tanks`  
3. ✅ Добавить демо-данные цен
4. ✅ Протестировать связи между таблицами
5. ✅ Обновить сервисы приложения под правильную структуру