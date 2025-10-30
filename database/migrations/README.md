# Database Migrations

## Применение миграции add_calibration_step_mm_column.sql

### ⚠️ ВАЖНО
Миграцию необходимо применить ВРУЧНУЮ через Supabase Dashboard SQL Editor, так как:
1. PostgREST API не поддерживает DDL команды (ALTER TABLE)
2. Прямое PostgreSQL подключение требует DATABASE_URL с правильным паролем

### 📝 Инструкция по применению

#### Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/ssvazdgnmatbdynkhkqo

2. Перейдите в **SQL Editor** (левое меню)

3. Скопируйте и выполните следующий SQL:

```sql
-- Миграция: Добавление колонки calibration_step_mm в tank_calibration_settings
-- Дата: 2025-10-28
-- Описание: Добавляет колонку для хранения шага калибровочной таблицы (в миллиметрах)

-- Добавляем колонку calibration_step_mm
ALTER TABLE tank_calibration_settings 
ADD COLUMN IF NOT EXISTS calibration_step_mm INTEGER DEFAULT 10
CHECK (calibration_step_mm > 0 AND calibration_step_mm <= 1000);

-- Комментарий к колонке
COMMENT ON COLUMN tank_calibration_settings.calibration_step_mm IS 
'Шаг калибровочной таблицы в миллиметрах. По умолчанию 10 мм. Используется для построения геометрической калибровочной таблицы.';

-- Обновляем существующие записи (если есть NULL)
UPDATE tank_calibration_settings 
SET calibration_step_mm = 10 
WHERE calibration_step_mm IS NULL;
```

4. Нажмите **Run** для выполнения

5. Проверьте результат:
```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings'
AND column_name = 'calibration_step_mm';
```

Должна вернуться одна строка с информацией о колонке.

#### Способ 2: Через PostgreSQL клиент (psql)

Если у вас есть доступ к DATABASE_URL с паролем:

```bash
# Получите DATABASE_URL из Supabase Dashboard → Settings → Database → Connection String (Transaction)
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.ssvazdgnmatbdynkhkqo.supabase.co:5432/postgres"

# Выполните миграцию
psql $DATABASE_URL -f database/migrations/add_calibration_step_mm_column.sql
```

#### Способ 3: Через Node.js скрипт с правильной строкой подключения

1. Получите DATABASE_URL из Supabase Dashboard → Settings → Database

2. Установите переменную окружения:
```bash
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.ssvazdgnmatbdynkhkqo.supabase.co:5432/postgres"
```

3. Запустите скрипт:
```bash
node tools/apply-migration-direct.js
```

### ✅ Проверка успешного применения

После применения миграции выполните:

```bash
node tools/apply-tank-calibration-migration.js
```

Должно вывести:
```
✅ Колонка calibration_step_mm УЖЕ существует
```

### 📊 Структура колонки

- **Имя**: `calibration_step_mm`
- **Тип**: `INTEGER`
- **По умолчанию**: `10`
- **Ограничения**: `CHECK (calibration_step_mm > 0 AND calibration_step_mm <= 1000)`
- **Nullable**: `NOT NULL` (из-за DEFAULT 10)

### 🎯 Назначение

Колонка используется для хранения шага калибровочной таблицы резервуара в миллиметрах. Этот параметр определяет:

- Через сколько миллиметров уровня строить точки в геометрической калибровочной таблице
- По умолчанию 10 мм (т.е. таблица: 0, 10, 20, 30, ... до максимального уровня)
- Более мелкий шаг = более точная таблица, но больше точек данных
- Более крупный шаг = меньше точек, быстрее расчет

### 🔗 Связанные файлы

- **Миграция**: `database/migrations/add_calibration_step_mm_column.sql`
- **Проверка**: `tools/apply-tank-calibration-migration.js`
- **TypeScript тип**: `src/types/tanks.ts` (interface TankCalibrationSettings)
- **Использование**: `src/utils/calibrationAlgorithm.ts` (buildGeometricCalibrationTable)
