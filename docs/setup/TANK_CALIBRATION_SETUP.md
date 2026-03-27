# 🚀 Быстрая настройка Tank Calibration Settings

## 📋 Что это?

Система автокалибровки резервуаров для точного учета топлива на АЗС.

Хранит ~50 параметров для каждого резервуара:
- Геометрия резервуара (размеры, форма, наклон)
- Погрешности оборудования (ТРК, уровнемеры)
- Температурные параметры
- Пороговые значения уведомлений
- Настройки калибровки

## ⚡ Быстрый старт

### Шаг 1: Применить PostgreSQL миграции

1. **Убедитесь, что в `server/.env` задан `DATABASE_URL`**

2. **Примените миграции:**
   ```bash
   cd server
   node db/migrate.js
   ```

3. **При необходимости проверьте SQL-файлы:**
   ```
   server/db/migrations/030_equipment.sql
   server/db/migrations/100_tank_calibration_tables.sql
   ```

4. **Проверьте результат:**
   - Должно быть создано ~50 полей
   - 4 CHECK constraints
   - 6 индексов
   - 1 триггер

### Шаг 2: Проверка в БД

Выполните проверочный запрос:

```sql
-- Должно вернуть ~50
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'tank_calibration_settings';
```

### Шаг 3: Создание тестовой настройки

```sql
INSERT INTO tank_calibration_settings (
  tank_id,
  tank_shape_type,
  fuel_type,
  tank_diameter_mm,
  tank_length_mm,
  nozzles_count
) VALUES (
  'tank_1',
  'horizontal_cylinder',
  'gasoline',
  2500,
  6300,
  2
);
```

### Шаг 4: Проверка в приложении

1. Перезапустите backend сервер:
   ```bash
   cd server
   node index.js
   ```

2. Откройте приложение: http://localhost:3000/

3. Перейдите на страницу резервуаров

4. Откройте настройки калибровки резервуара

## 📂 Структура файлов

```
D:\Users\magsp\ELSYPLUS\TradeControl\
├── database/migrations/
│   ├── create_tank_calibration_settings_full.sql    ← Применить это!
│   ├── alter_tank_calibration_settings_add_missing_fields.sql
│   └── README.md
├── docs/
│   └── TANK_CALIBRATION_MIGRATION.md                ← Полная документация
├── src/
│   ├── types/tanks.ts                               ← TypeScript типы
│   ├── services/tankCalibrationService.ts           ← API клиент
│   └── components/tanks/TankCalibrationSettings.tsx
├── server/routes/
│   └── tankCalibration.js                           ← Backend API
└── tools/
    └── apply-tank-calibration-migration.js
```

## 🎯 Основные параметры

### Геометрия резервуара
- `tank_shape_type`: horizontal_cylinder, vertical_cylinder, spherical, rectangular
- `tank_diameter_mm`: диаметр (мм)
- `tank_length_mm`: длина (мм)
- `tank_height_mm`: высота (мм)

### Погрешности оборудования
- `dispensers_error_percent`: 0.25% (ГОСТ 9018-89)
- `level_sensor_error_percent`: 0.1% (радарные датчики)
- `level_sensor_accuracy_mm`: ±1 мм

### Пороговые значения уведомлений
- `fuel_level_warning_percent`: 20% - предупреждение
- `fuel_level_critical_percent`: 10% - критично
- `fuel_level_max_percent`: 95% - максимум безопасности

### Температурные параметры
- `thermal_expansion_coefficient`: 0.00083 (бензин АИ-92/95)
- `base_temperature`: 15°C
- `working_temp_min`: -40°C
- `working_temp_max`: 50°C

## 📊 API Endpoints

**Backend Proxy:** `http://localhost:3001/api/tank-calibration`

```javascript
// Получить настройки резервуара
GET /api/tank-calibration/:tankId

// Сохранить настройки
POST /api/tank-calibration
Body: TankCalibrationSettings

// Удалить настройки
DELETE /api/tank-calibration/:tankId

// Запустить калибровку
POST /api/tank-calibration/:tankId/run
```

## 🔧 Frontend использование

```typescript
import {
  getCalibrationSettings,
  saveCalibrationSettings
} from '@/services/tankCalibrationService';

// Загрузка настроек
const settings = await getCalibrationSettings('tank_1');

// Сохранение
const updated = await saveCalibrationSettings({
  tank_id: 'tank_1',
  fuel_type: 'gasoline',
  tank_shape_type: 'horizontal_cylinder',
  // ... остальные параметры
});
```

## ✅ Проверка работы

### 1. Проверка таблицы в Supabase
```sql
SELECT * FROM tank_calibration_settings LIMIT 1;
```

### 2. Проверка API через curl
```bash
curl http://localhost:3001/api/tank-calibration/tank_1
```

### 3. Проверка в UI
- Откройте страницу резервуаров
- Выберите резервуар
- Откройте "Настройки калибровки"
- Заполните параметры
- Сохраните

## 📚 Документация

- **Полная документация миграции:** `docs/TANK_CALIBRATION_MIGRATION.md`
- **TypeScript типы:** `src/types/tanks.ts` (строки 376-537)
- **SQL миграции:** `database/migrations/README.md`
- **Backend API:** `server/routes/tankCalibration.js`

## ❓ Частые вопросы

**Q: Таблица уже существует, но не хватает полей?**
A: Используйте `alter_tank_calibration_settings_add_missing_fields.sql`

**Q: Нужно ли останавливать backend при применении миграции?**
A: Рекомендуется, но не обязательно (миграция использует IF NOT EXISTS)

**Q: Как добавить кастомные параметры?**
A: Используйте JSONB поле `custom_params`:
```sql
UPDATE tank_calibration_settings
SET custom_params = '{"my_param": "value"}'::jsonb
WHERE tank_id = 'tank_1';
```

**Q: Где посмотреть значения по умолчанию?**
A: См. константу `DEFAULT_CALIBRATION_SETTINGS` в `src/types/tanks.ts` (строки 463-537)

## 🎉 Готово!

После применения миграции система калибровки резервуаров полностью готова к работе!

📖 Для подробной информации см. `docs/TANK_CALIBRATION_MIGRATION.md`
