# 🌐 STS API - Краткая справка

## 📚 Swagger документация
**URL**: https://pos.autooplata.ru/tms/docs

Интерактивная документация OpenAPI 3.1.0 со всеми endpoints, схемами и примерами.

## 🆕 Новые методы для отчетности

### 1. `/v1/shifts` - Список смен
Получение списка смен с информацией по ПСМ (постам смены менеджера)

**Параметры**:
- `system` (обязательный) - Код системы
- `station` (опциональный) - ID торговой точки
- `dt_beg`, `dt_end` (опциональные) - Период

**Пример**:
```typescript
import { getShifts } from '@/services/shiftsService';

const shifts = await getShifts({
  system: 15,
  station: 1
});
```

---

### 2. `/v1/report/receipts` - Поступления нефтепродуктов
Отчет по поступлениям н/п за период

**Параметры**:
- `system` (обязательный) - Код системы
- `station` (обязательный) - ID торговой точки
- `dt_beg`, `dt_end` (опциональные) - Период

**Пример**:
```typescript
import { getFuelReceipts } from '@/services/shiftsService';

const receipts = await getFuelReceipts({
  system: 15,
  station: 1,
  dt_beg: '2025-01-01T00:00:00',
  dt_end: '2025-01-31T23:59:59'
});
```

---

### 3. `/v1/report/shift_report` - Полный сменный отчет
Комплексный отчет включающий:
- ✅ Информацию по ПСМ
- ✅ Данные по резервуарам на конец смены
- ✅ Поступления нефтепродуктов
- ✅ Продажи за смену
- ✅ Движение наличных

**Параметры**:
- `system` (обязательный) - Код системы
- `station` (обязательный) - ID торговой точки
- `shift_number` (обязательный) - Номер смены

**Пример**:
```typescript
import { getShiftReport } from '@/services/shiftsService';

const report = await getShiftReport({
  system: 15,
  station: 1,
  shift_number: 123
});

// Структура отчета:
// {
//   shift: { number, state, dt_open, dt_close },
//   pos_info: [...],       // ПСМ
//   tanks: [...],          // Резервуары
//   receipts: [...],       // Поступления
//   fuel_totals: [...],    // Продажи по топливу
//   payment_totals: [...], // По способам оплаты
//   cash_movements: [...]  // Движение наличных
// }
```

---

## 📁 Файлы реализации

| Файл | Описание |
|------|----------|
| `src/types/shifts.ts` | TypeScript типы для смен и отчетов |
| `src/services/shiftsService.ts` | Сервис для работы с API |
| `docs/STS_API_EXAMPLES.md` | Подробные примеры использования |
| `API_INTEGRATION.md` | Полная документация по интеграции |

---

## ⚙️ Конфигурация

### Переменные окружения (.env)
```bash
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=ваш_логин
VITE_STS_API_PASSWORD=ваш_пароль
```

### Аутентификация
API использует **HTTP Basic Auth** для получения JWT токена:
1. Авторизация через `/v1/login` с Basic Auth
2. Получение JWT токена
3. Использование токена в заголовке `Authorization: Bearer <token>`

Вся логика авторизации инкапсулирована в `shiftsService.ts`.

---

## 🔗 Связанные endpoints

### Уже доступные методы
- `/v1/transactions`, `/v2/transactions` - Транзакции
- `/v1/info`, `/v2/info` - Статусы торговых точек
- `/v1/tanks` - Резервуары
- `/v1/coupons` - Купоны
- `/v1/prices` - Управление ценами
- `/v1/control/*` - Управление (restart, shift_open, shift_close)

### Документация
- **Swagger**: https://pos.autooplata.ru/tms/docs
- **CLAUDE.md**: Инструкции для Claude Code
- **API_INTEGRATION.md**: Детальная интеграция

---

## 📝 Примеры использования в React

### С React Query
```tsx
import { useQuery } from '@tanstack/react-query';
import { getShiftReport } from '@/services/shiftsService';

function ShiftReportPage({ shiftNumber }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shift-report', shiftNumber],
    queryFn: () => getShiftReport({
      system: 15,
      station: 1,
      shift_number: shiftNumber
    })
  });

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  return (
    <div>
      <h1>Отчет смены #{data.shift.number}</h1>
      {/* Отображение данных */}
    </div>
  );
}
```

### Обработка ошибок
```typescript
try {
  const shifts = await getShifts({ system: 15, station: 1 });
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    console.error('Проверьте учетные данные');
  }
}
```

---

## ✅ Чеклист внедрения

- [x] TypeScript типы созданы (`src/types/shifts.ts`)
- [x] Сервис реализован (`src/services/shiftsService.ts`)
- [x] Документация обновлена
  - [x] `API_INTEGRATION.md`
  - [x] `CLAUDE.md`
  - [x] `README.md`
- [x] Примеры использования (`docs/STS_API_EXAMPLES.md`)
- [ ] UI компоненты для отображения отчетов
- [ ] Интеграция в существующие страницы

---

**Последнее обновление**: 2025-10-04
**Версия API**: v1 (OpenAPI 3.1.0)
