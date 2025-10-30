# 📊 Итоги анализа хранения параметров резервуаров

**Дата:** 2025-10-28
**Версия:** TradeFrame Builder v1.5.79+

---

## 🎯 Задача

Определить оптимальное место для хранения параметров резервуаров (калибровочные данные, погрешности, пороги).

## ✅ Решение

**Выбрано: Расширение существующей таблицы `tank_calibration_settings` в Supabase**

### Почему этот вариант?

1. ✅ **Уже есть основа** - таблица создана, backend API работает
2. ✅ **Простота SQL** - один запрос получает все данные, без JOIN
3. ✅ **TypeScript типы готовы** - интерфейс `TankCalibrationSettings` уже существует
4. ✅ **Производительность** - PostgreSQL отлично работает с широкими таблицами
5. ✅ **Централизация** - все параметры резервуара в одном месте
6. ✅ **Безопасность** - CHECK constraints на уровне БД
7. ✅ **Расширяемость** - JSONB поле `custom_params` для экспериментов

---

## 📦 Что было создано

### 1. SQL Миграции

**Полная миграция (для новых установок):**
```
database/migrations/create_tank_calibration_settings_full.sql
```
- Создание таблицы с ~50 полями
- 4 CHECK constraints
- 6 индексов
- 1 триггер для updated_at
- JSONB поле для расширений

**Инкрементальная миграция (для обновления существующих):**
```
database/migrations/alter_tank_calibration_settings_add_missing_fields.sql
```
- Добавление недостающих полей
- Обновление constraints
- Миграция данных

### 2. Документация

**Полная документация:**
```
docs/TANK_CALIBRATION_MIGRATION.md
```
- Описание всех полей
- CHECK constraints
- Индексы
- Инструкции по применению
- FAQ

**Быстрый старт:**
```
TANK_CALIBRATION_SETUP.md
```
- Пошаговые инструкции
- Примеры API
- Проверка работы

**README миграций:**
```
database/migrations/README.md
```
- Список всех миграций
- Способы применения
- Ссылки на ресурсы

### 3. Инструменты

**Node.js скрипт для применения:**
```
tools/apply-tank-calibration-migration.js
```
- Проверка текущей структуры
- Инструкции по ручному применению

---

## 📋 Структура таблицы

### Всего полей: ~50

**Категории параметров:**

1. **ID и привязка** (2 поля)
   - id, tank_id

2. **Геометрия резервуара** (9 полей)
   - tank_shape_type, tank_location_type
   - tank_diameter_mm, tank_length_mm, tank_height_mm
   - tank_tilt_angle_degrees
   - tank_shape (legacy), tank_tilt_degrees (legacy)
   - has_calibration_table

3. **Оборудование** (8 полей)
   - level_sensor_type, nozzles_count
   - dispensers_error_percent, dispensers_error_liters
   - level_sensor_error_percent, level_sensor_error_liters
   - level_sensor_accuracy_mm, bias_offset_percent

4. **Температурные параметры** (7 полей)
   - fuel_type, thermal_expansion_coefficient
   - base_temperature, temp_gradient_liters_per_degree
   - working_temp_min, working_temp_max
   - has_thermal_insulation

5. **Испарение и потери** (3 поля)
   - natural_loss_summer_percent
   - natural_loss_winter_percent
   - discharge_loss_percent

6. **Временные параметры** (4 поля)
   - data_polling_interval_minutes
   - averaging_period_minutes
   - analysis_window_days
   - tank_rest_time_minutes

7. **Пороговые значения калибровки** (4 поля)
   - min_change_for_calibration_liters
   - max_acceptable_deviation_percent
   - max_acceptable_deviation_liters
   - critical_error_threshold_percent

8. **Пороговые значения уведомлений** (3 поля)
   - fuel_level_warning_percent
   - fuel_level_critical_percent
   - fuel_level_max_percent

9. **Мёртвые зоны и остатки** (5 полей)
   - dead_stock_liters, dead_stock_percent
   - sensor_blind_zone_bottom_mm
   - sensor_blind_zone_top_mm
   - critical_water_level_mm

10. **Фильтрация аномалий** (4 поля)
    - exclude_delivery_periods
    - exclude_maintenance_periods
    - outlier_filter_enabled
    - outlier_filter_sigma

11. **Метод калибровки** (4 поля)
    - calibration_method
    - sensor_weight, dispenser_weight
    - auto_calibration_enabled

12. **JSONB расширения** (1 поле)
    - custom_params

13. **Метаданные** (4 поля)
    - last_calibration_date, calibration_status
    - created_at, updated_at

---

## 🔧 CHECK Constraints

1. **check_fuel_level_thresholds**
   - Критический < Предупреждение < Максимум

2. **check_positive_dimensions**
   - Размеры резервуара > 0

3. **check_error_percent_range**
   - Погрешности 0-100%

4. **check_nozzles_count_range**
   - Количество пистолетов 1-8

---

## 🔍 Индексы

1. `idx_tank_calibration_tank_id` - поиск по tank_id
2. `idx_tank_calibration_auto_enabled` - резервуары с автокалибровкой
3. `idx_tank_calibration_status` - поиск по статусу
4. `idx_tank_calibration_custom_params` - GIN для JSONB
5. `idx_tank_calibration_shape_type` - поиск по типу
6. `idx_tank_calibration_fuel_type` - поиск по топливу

---

## 🚀 Следующие шаги

### 1. Применить миграцию (ОБЯЗАТЕЛЬНО)

```bash
# Откройте Supabase SQL Editor
https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo/editor/sql

# Выполните файл:
database/migrations/create_tank_calibration_settings_full.sql
```

### 2. Проверить результат

```sql
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings';
-- Ожидается: ~50
```

### 3. Создать тестовую запись

```sql
INSERT INTO tank_calibration_settings (tank_id, fuel_type)
VALUES ('tank_test', 'gasoline');
```

### 4. Проверить в приложении

```bash
# Перезапустить backend
cd server && node index.js

# Открыть UI
http://localhost:3000/point/tanks
```

---

## 📚 Ссылки на документацию

| Документ | Назначение |
|----------|------------|
| `TANK_CALIBRATION_SETUP.md` | 🚀 Быстрый старт |
| `docs/TANK_CALIBRATION_MIGRATION.md` | 📖 Полная документация |
| `database/migrations/README.md` | 📋 Список миграций |
| `src/types/tanks.ts` | 💻 TypeScript типы |
| `server/routes/tankCalibration.js` | 🔧 Backend API |

---

## 🎯 Преимущества решения

### Производительность
- ✅ Один SELECT получает все данные
- ✅ Индексы ускоряют поиск
- ✅ JSONB индекс для расширений

### Безопасность
- ✅ CHECK constraints валидируют данные
- ✅ Типы данных на уровне БД
- ✅ Триггер для updated_at

### Расширяемость
- ✅ JSONB для новых параметров
- ✅ Можно добавлять поля без кода
- ✅ Обратная совместимость (legacy поля)

### Удобство разработки
- ✅ TypeScript типы = SQL схема
- ✅ Автодополнение в IDE
- ✅ Меньше кода для CRUD

---

## 📊 Сравнение вариантов

| Критерий | Расширить таблицу | JSONB | Несколько таблиц |
|----------|-------------------|-------|------------------|
| **Скорость чтения** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Скорость записи** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Валидация** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Расширяемость** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Простота кода** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Типобезопасность** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |

**Итого: Расширение таблицы - лучший баланс всех критериев** ✅

---

## ✅ Результат

Подготовлена полная миграция для хранения всех ~50 параметров резервуаров в таблице `tank_calibration_settings`.

**Статус:** ✅ Готово к применению
**Следующий шаг:** Применить миграцию в Supabase Dashboard

🎉 **Проблема решена!**
