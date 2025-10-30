# Миграция таблицы tank_calibration_settings

**Дата:** 2025-10-28
**Версия:** TradeFrame Builder v1.5.79+
**Статус:** Готово к применению

---

## 📋 Описание

Миграция приводит SQL схему таблицы `tank_calibration_settings` в полное соответствие с TypeScript типом `TankCalibrationSettings` из `src/types/tanks.ts`.

**Проблема:**
- TypeScript интерфейс содержит ~50 полей
- SQL таблица содержала только ~30 полей
- Несоответствие приводило к проблемам при сохранении/загрузке настроек

**Решение:**
- Добавлены все недостающие поля из TypeScript типа
- Добавлены CHECK constraints для валидации данных
- Добавлены индексы для производительности
- Добавлено JSONB поле `custom_params` для будущих расширений

---

## 🆕 Новые поля

### Характеристики резервуара и оборудования

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `tank_shape_type` | TEXT | 'horizontal_cylinder' | Тип резервуара: horizontal_cylinder, vertical_cylinder, spherical, rectangular |
| `tank_location_type` | TEXT | 'underground' | Расположение: underground (подземный), surface (наземный) |
| `tank_diameter_mm` | INTEGER | 2500 | Диаметр резервуара (мм) |
| `tank_length_mm` | INTEGER | 6300 | Длина резервуара (мм) - для горизонтальных |
| `tank_height_mm` | INTEGER | 2500 | Высота резервуара (мм) - для вертикальных |
| `tank_tilt_angle_degrees` | NUMERIC(5,2) | 0 | Угол наклона (градусы) - для горизонтальных |
| `level_sensor_type` | TEXT | 'radar' | Тип датчика: radar, float, capacitive, hydrostatic, other |
| `nozzles_count` | INTEGER | 2 | Количество пистолетов (ТРК), привязанных к резервуару |
| `bias_offset_percent` | NUMERIC(5,2) | 0 | Смещение в процентах (%) |

### Температурные параметры

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `has_thermal_insulation` | BOOLEAN | FALSE | Наличие теплоизоляции |

### Временные параметры

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `data_polling_interval_minutes` | INTEGER | 10 | Интервал получения данных по остаткам (минуты) |

### Пороговые значения уведомлений

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `fuel_level_warning_percent` | NUMERIC(5,2) | 20 | ⚠️ Порог предупреждения о низком уровне (%) |
| `fuel_level_critical_percent` | NUMERIC(5,2) | 10 | 🔴 Критический порог низкого уровня (%) |
| `fuel_level_max_percent` | NUMERIC(5,2) | 95 | 🔼 Максимальный уровень заполнения (%, для безопасности) |

### Мёртвый остаток и зоны измерений

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `dead_stock_liters` | NUMERIC(10,2) | 0 | Технический (мёртвый) остаток под заливной трубой (литры) |
| `dead_stock_percent` | NUMERIC(5,2) | 0 | Технический остаток (% от объёма) |
| `sensor_blind_zone_bottom_mm` | INTEGER | 100 | Мёртвая зона датчика уровня снизу (мм) |
| `sensor_blind_zone_top_mm` | INTEGER | 100 | Мёртвая зона датчика уровня сверху (мм) |

### Критический уровень воды

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `critical_water_level_mm` | INTEGER | 50 | Критический уровень воды, требующий откачки (мм) |

### JSONB для расширений

| Поле | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `custom_params` | JSONB | '{}' | Дополнительные/экспериментальные параметры |

---

## ✅ CHECK Constraints

Добавлены следующие проверки целостности данных:

### 1. Проверка корректности порогов уведомлений
```sql
CHECK (
  fuel_level_critical_percent < fuel_level_warning_percent
  AND fuel_level_warning_percent < fuel_level_max_percent
)
```
**Логика:** Критический уровень < Предупреждение < Максимум

### 2. Проверка положительных размеров
```sql
CHECK (
  tank_diameter_mm > 0
  AND tank_length_mm > 0
  AND tank_height_mm > 0
)
```

### 3. Проверка диапазона погрешностей
```sql
CHECK (
  dispensers_error_percent BETWEEN 0 AND 100
  AND level_sensor_error_percent BETWEEN 0 AND 100
  AND bias_offset_percent BETWEEN -100 AND 100
)
```

### 4. Проверка количества пистолетов
```sql
CHECK (nozzles_count BETWEEN 1 AND 8)
```

---

## 🔍 Новые индексы

Для улучшения производительности добавлены индексы:

1. **GIN индекс для JSONB custom_params**
   ```sql
   CREATE INDEX idx_tank_calibration_custom_params
     ON tank_calibration_settings USING gin(custom_params);
   ```

2. **Индекс для поиска по типу резервуара**
   ```sql
   CREATE INDEX idx_tank_calibration_shape_type
     ON tank_calibration_settings(tank_shape_type);
   ```

3. **Индекс для поиска по типу топлива**
   ```sql
   CREATE INDEX idx_tank_calibration_fuel_type
     ON tank_calibration_settings(fuel_type);
   ```

---

## 🔄 Миграция данных

При применении миграции автоматически происходит:

1. **Копирование `tank_tilt_degrees` → `tank_tilt_angle_degrees`**
   ```sql
   UPDATE tank_calibration_settings
   SET tank_tilt_angle_degrees = tank_tilt_degrees
   WHERE tank_tilt_degrees IS NOT NULL AND tank_tilt_degrees != 0;
   ```

2. **Установка `fuel_level_max_percent` в зависимости от типа топлива**
   ```sql
   UPDATE tank_calibration_settings
   SET fuel_level_max_percent = CASE
     WHEN fuel_type IN ('propane', 'gas') THEN 85  -- Пропан/газ: 85%
     ELSE 95  -- Бензин/дизель: 95%
   END;
   ```

---

## 🚀 Применение миграции

### Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. Откройте Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/editor/sql
   ```

2. Откройте файл миграции:
   ```
   database/migrations/alter_tank_calibration_settings_add_missing_fields.sql
   ```

3. Скопируйте всё содержимое файла в SQL Editor

4. Нажмите "Run" или Ctrl+Enter

5. Проверьте результат выполнения

### Способ 2: Через Node.js скрипт (требует настройки RPC)

```bash
node tools/apply-tank-calibration-migration.js
```

**Примечание:** Требует создания PostgreSQL функции `exec_sql` в Supabase.

---

## ✅ Проверка после миграции

После применения миграции выполните проверку:

```sql
-- 1. Проверка структуры таблицы
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
ORDER BY ordinal_position;

-- 2. Проверка constraint'ов
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'tank_calibration_settings';

-- 3. Проверка индексов
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tank_calibration_settings';

-- 4. Подсчет полей
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings';
-- Ожидаемый результат: ~50 полей
```

---

## 🔙 Откат миграции

Если необходимо откатить изменения:

```sql
-- Удаление новых полей
ALTER TABLE tank_calibration_settings
  DROP COLUMN IF EXISTS tank_shape_type,
  DROP COLUMN IF EXISTS tank_location_type,
  DROP COLUMN IF EXISTS tank_diameter_mm,
  DROP COLUMN IF EXISTS tank_length_mm,
  DROP COLUMN IF EXISTS tank_height_mm,
  DROP COLUMN IF EXISTS tank_tilt_angle_degrees,
  DROP COLUMN IF EXISTS level_sensor_type,
  DROP COLUMN IF EXISTS nozzles_count,
  DROP COLUMN IF EXISTS bias_offset_percent,
  DROP COLUMN IF EXISTS has_thermal_insulation,
  DROP COLUMN IF EXISTS data_polling_interval_minutes,
  DROP COLUMN IF EXISTS fuel_level_warning_percent,
  DROP COLUMN IF EXISTS fuel_level_critical_percent,
  DROP COLUMN IF EXISTS fuel_level_max_percent,
  DROP COLUMN IF EXISTS dead_stock_liters,
  DROP COLUMN IF EXISTS dead_stock_percent,
  DROP COLUMN IF EXISTS sensor_blind_zone_bottom_mm,
  DROP COLUMN IF EXISTS sensor_blind_zone_top_mm,
  DROP COLUMN IF EXISTS critical_water_level_mm,
  DROP COLUMN IF EXISTS custom_params;

-- Удаление constraints
ALTER TABLE tank_calibration_settings
  DROP CONSTRAINT IF EXISTS check_fuel_level_thresholds,
  DROP CONSTRAINT IF EXISTS check_positive_dimensions,
  DROP CONSTRAINT IF EXISTS check_error_percent_range,
  DROP CONSTRAINT IF EXISTS check_nozzles_count_range;

-- Удаление индексов
DROP INDEX IF EXISTS idx_tank_calibration_custom_params;
DROP INDEX IF EXISTS idx_tank_calibration_shape_type;
DROP INDEX IF EXISTS idx_tank_calibration_fuel_type;
```

---

## 📊 Сравнение до/после

### До миграции
- Полей в SQL: ~30
- Полей в TypeScript: ~50
- ❌ Несоответствие типов и БД

### После миграции
- Полей в SQL: ~50
- Полей в TypeScript: ~50
- ✅ Полное соответствие типов и БД
- ✅ Валидация через CHECK constraints
- ✅ Индексы для производительности
- ✅ JSONB для будущих расширений

---

## 🛡️ Безопасность

**Перед применением миграции:**
1. ✅ Сделайте резервную копию данных
2. ✅ Протестируйте на тестовой среде
3. ✅ Проверьте, что нет активных транзакций
4. ✅ Убедитесь, что backend сервер остановлен

**После применения миграции:**
1. ✅ Проверьте структуру таблицы (см. раздел "Проверка")
2. ✅ Убедитесь, что все constraints работают
3. ✅ Проверьте существующие данные
4. ✅ Перезапустите backend сервер

---

## 📚 Связанные файлы

- **SQL миграция:** `database/migrations/alter_tank_calibration_settings_add_missing_fields.sql`
- **TypeScript типы:** `src/types/tanks.ts` (интерфейс `TankCalibrationSettings`)
- **Frontend сервис:** `src/services/tankCalibrationService.ts`
- **Backend роуты:** `server/routes/tankCalibration.js`
- **Скрипт применения:** `tools/apply-tank-calibration-migration.js`

---

## ❓ FAQ

**Q: Можно ли применить миграцию на production без остановки сервиса?**
A: Да, миграция использует `ADD COLUMN IF NOT EXISTS`, что безопасно для работающей БД. Но рекомендуется остановить backend для предотвращения конфликтов.

**Q: Что будет с существующими данными?**
A: Все существующие данные сохранятся. Новые поля получат значения по умолчанию.

**Q: Нужно ли обновлять backend код?**
A: Нет, backend уже поддерживает все новые поля через TypeScript типы.

**Q: Можно ли добавить больше полей в будущем?**
A: Да, используйте JSONB поле `custom_params` для экспериментальных параметров без миграций.

---

## ✅ Чек-лист применения

- [ ] Прочитана документация миграции
- [ ] Создана резервная копия БД
- [ ] Остановлен backend сервер
- [ ] Открыт Supabase SQL Editor
- [ ] Скопирован SQL файл миграции
- [ ] Выполнен SQL запрос
- [ ] Проверена структура таблицы (должно быть ~50 полей)
- [ ] Проверены constraints (4 новых CHECK)
- [ ] Проверены индексы (3 новых индекса)
- [ ] Перезапущен backend сервер
- [ ] Протестирована работа настроек калибровки в UI
- [ ] Обновлена версия приложения в `src/config/version.ts`
