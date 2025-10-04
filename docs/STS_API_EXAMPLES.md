# 📚 Примеры использования STS API

Документация по работе с новыми endpoints для отчетности и смен.

## 📋 Оглавление

1. [Swagger документация](#swagger-документация)
2. [Получение списка смен](#получение-списка-смен)
3. [Отчет по поступлениям нефтепродуктов](#отчет-по-поступлениям-нефтепродуктов)
4. [Полный сменный отчет](#полный-сменный-отчет)
5. [Обработка ошибок](#обработка-ошибок)

## Swagger документация

**URL**: https://pos.autooplata.ru/tms/docs

Интерактивная документация OpenAPI 3.1.0 со всеми endpoints, схемами данных и примерами запросов.

## Получение списка смен

### Endpoint
```
GET /v1/shifts
```

### Параметры запроса
- `system` (обязательный) - Код системы
- `station` (опциональный) - Идентификатор торговой точки
- `dt_beg` (опциональный) - Начальная дата
- `dt_end` (опциональный) - Конечная дата

### Пример использования (TypeScript)

```typescript
import { getShifts } from '@/services/shiftsService';

// Получить все смены для торговой точки
const shifts = await getShifts({
  system: 15,
  station: 1,
});

console.log('Список смен:', shifts);
// Результат:
// {
//   system: 15,
//   station: 1,
//   shifts: [
//     {
//       number: 123,
//       state: 1, // 0 - закрыта, 1 - открыта
//       dt_open: '2025-01-15T08:00:00',
//       dt_close: '2025-01-15T20:00:00'
//     },
//     // ...
//   ]
// }
```

### Пример с фильтрацией по датам

```typescript
import { getShifts } from '@/services/shiftsService';

const shiftsInRange = await getShifts({
  system: 15,
  station: 1,
  dt_beg: '2025-01-01T00:00:00',
  dt_end: '2025-01-31T23:59:59',
});

// Фильтруем только открытые смены
const openShifts = shiftsInRange.shifts.filter(shift => shift.state === 1);
console.log('Открытые смены:', openShifts);
```

### В React компоненте

```tsx
import { useQuery } from '@tanstack/react-query';
import { getShifts } from '@/services/shiftsService';

export function ShiftsListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['shifts', { system: 15, station: 1 }],
    queryFn: () => getShifts({ system: 15, station: 1 }),
  });

  if (isLoading) return <div>Загрузка смен...</div>;
  if (error) return <div>Ошибка: {error.message}</div>;

  return (
    <div>
      <h1>Список смен</h1>
      <ul>
        {data?.shifts.map(shift => (
          <li key={shift.number}>
            Смена #{shift.number} - {shift.state === 1 ? 'Открыта' : 'Закрыта'}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Отчет по поступлениям нефтепродуктов

### Endpoint
```
GET /v1/report/receipts
```

### Параметры запроса
- `system` (обязательный) - Код системы
- `station` (обязательный) - Идентификатор торговой точки
- `dt_beg` (опциональный) - Начальная дата
- `dt_end` (опциональный) - Конечная дата

### Пример использования

```typescript
import { getFuelReceipts } from '@/services/shiftsService';

// Получить поступления за месяц
const receipts = await getFuelReceipts({
  system: 15,
  station: 1,
  dt_beg: '2025-01-01T00:00:00',
  dt_end: '2025-01-31T23:59:59',
});

console.log('Поступления нефтепродуктов:', receipts);
// Результат:
// {
//   system: 15,
//   station: 1,
//   receipts: [
//     {
//       dt: '2025-01-10T14:30:00',
//       tank_number: 1,
//       fuel_code: 92,
//       fuel_name: 'АИ-92',
//       volume: 5000, // литры
//       amount: 3650, // кг
//       document: 'ТТН-12345',
//       supplier: 'ООО Поставщик'
//     },
//     // ...
//   ]
// }
```

### Группировка по топливу

```typescript
import { getFuelReceipts } from '@/services/shiftsService';

const receipts = await getFuelReceipts({
  system: 15,
  station: 1,
  dt_beg: '2025-01-01T00:00:00',
  dt_end: '2025-01-31T23:59:59',
});

// Группируем по типу топлива
const byFuel = receipts.receipts.reduce((acc, receipt) => {
  const key = receipt.fuel_name;
  if (!acc[key]) {
    acc[key] = { totalVolume: 0, totalAmount: 0, count: 0 };
  }
  acc[key].totalVolume += receipt.volume;
  acc[key].totalAmount += receipt.amount || 0;
  acc[key].count++;
  return acc;
}, {} as Record<string, { totalVolume: number; totalAmount: number; count: number }>);

console.log('Итого по топливу:', byFuel);
// {
//   'АИ-92': { totalVolume: 15000, totalAmount: 10950, count: 3 },
//   'АИ-95': { totalVolume: 12000, totalAmount: 8760, count: 2 },
//   'ДТ': { totalVolume: 20000, totalAmount: 16400, count: 4 }
// }
```

## Полный сменный отчет

### Endpoint
```
GET /v1/report/shift_report
```

### Параметры запроса
- `system` (обязательный) - Код системы
- `station` (обязательный) - Идентификатор торговой точки
- `shift_number` (обязательный) - Номер смены

### Структура отчета

Полный сменный отчет включает:
- ✅ Информацию по ПСМ (постам смены менеджера)
- ✅ Данные по резервуарам на конец смены
- ✅ Поступления нефтепродуктов
- ✅ Продажи за смену
- ✅ Движение наличных денежных средств

### Пример использования

```typescript
import { getShiftReport } from '@/services/shiftsService';

const report = await getShiftReport({
  system: 15,
  station: 1,
  shift_number: 123,
});

console.log('Сменный отчет:', report);
// Результат:
// {
//   system: 15,
//   station: 1,
//   shift: {
//     number: 123,
//     state: 0, // закрыта
//     dt_open: '2025-01-15T08:00:00',
//     dt_close: '2025-01-15T20:00:00'
//   },
//   pos_info: [
//     {
//       number: 1,
//       shift: { number: 123, state: 0 },
//       devices: [...],
//       dt_info: '2025-01-15T20:00:00',
//       uptime: '12:00:00'
//     }
//   ],
//   tanks: [
//     {
//       number: 1,
//       fuel: 92,
//       fuel_name: 'АИ-92',
//       volume_begin: '10000',
//       volume_end: '7500',
//       release: { volume: '2500', amount: '1825' }
//     }
//   ],
//   receipts: [...],
//   fuel_totals: [
//     {
//       service_code: 92,
//       service_name: 'АИ-92',
//       release: { quantity: 2500, cost: 125000, amount: 1825 }
//     }
//   ],
//   payment_totals: [
//     {
//       id: 1,
//       name: 'Наличные',
//       release: { quantity: 1000, cost: 50000, amount: 730 }
//     },
//     {
//       id: 2,
//       name: 'Карта',
//       release: { quantity: 1500, cost: 75000, amount: 1095 }
//     }
//   ],
//   cash_movements: [...],
//   report_date: '2025-01-15T20:00:00'
// }
```

### Расчет итогов по смене

```typescript
import { getShiftReport } from '@/services/shiftsService';

const report = await getShiftReport({
  system: 15,
  station: 1,
  shift_number: 123,
});

// Общая выручка
const totalRevenue = report.fuel_totals.reduce(
  (sum, fuel) => sum + fuel.release.cost,
  0
);

// Общее количество проданного топлива
const totalVolume = report.fuel_totals.reduce(
  (sum, fuel) => sum + fuel.release.quantity,
  0
);

// Разбивка по способам оплаты
const paymentBreakdown = report.payment_totals.map(payment => ({
  type: payment.name,
  amount: payment.release.cost,
  percentage: (payment.release.cost / totalRevenue * 100).toFixed(2) + '%'
}));

console.log('Итоги смены:');
console.log('Выручка:', totalRevenue, 'руб.');
console.log('Продано:', totalVolume, 'л');
console.log('По способам оплаты:', paymentBreakdown);
```

### В React компоненте с детализацией

```tsx
import { useQuery } from '@tanstack/react-query';
import { getShiftReport } from '@/services/shiftsService';

export function ShiftReportPage({ shiftNumber }: { shiftNumber: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['shift-report', shiftNumber],
    queryFn: () => getShiftReport({
      system: 15,
      station: 1,
      shift_number: shiftNumber,
    }),
  });

  if (isLoading) return <div>Загрузка отчета...</div>;
  if (!report) return <div>Отчет не найден</div>;

  return (
    <div className="shift-report">
      <h1>Сменный отчет #{report.shift.number}</h1>

      <section>
        <h2>Информация о смене</h2>
        <p>Открыта: {new Date(report.shift.dt_open).toLocaleString()}</p>
        <p>Закрыта: {new Date(report.shift.dt_close).toLocaleString()}</p>
      </section>

      <section>
        <h2>Продажи по топливу</h2>
        <table>
          <thead>
            <tr>
              <th>Топливо</th>
              <th>Количество (л)</th>
              <th>Сумма (руб)</th>
            </tr>
          </thead>
          <tbody>
            {report.fuel_totals.map(fuel => (
              <tr key={fuel.service_code}>
                <td>{fuel.service_name}</td>
                <td>{fuel.release.quantity.toFixed(2)}</td>
                <td>{fuel.release.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Способы оплаты</h2>
        <table>
          <thead>
            <tr>
              <th>Способ</th>
              <th>Сумма (руб)</th>
            </tr>
          </thead>
          <tbody>
            {report.payment_totals.map(payment => (
              <tr key={payment.id}>
                <td>{payment.name}</td>
                <td>{payment.release.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Резервуары</h2>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Топливо</th>
              <th>Начало смены</th>
              <th>Конец смены</th>
              <th>Реализация</th>
            </tr>
          </thead>
          <tbody>
            {report.tanks.map(tank => (
              <tr key={tank.number}>
                <td>{tank.number}</td>
                <td>{tank.fuel_name}</td>
                <td>{tank.volume_begin} л</td>
                <td>{tank.volume_end} л</td>
                <td>{tank.release?.volume || 0} л</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

## Обработка ошибок

### Базовая обработка

```typescript
import { getShifts } from '@/services/shiftsService';

try {
  const shifts = await getShifts({ system: 15, station: 1 });
  console.log('Смены получены:', shifts);
} catch (error) {
  if (error instanceof Error) {
    console.error('Ошибка:', error.message);

    // Обработка специфичных ошибок
    if (error.message.includes('Authentication failed')) {
      console.error('Проверьте учетные данные STS API');
    } else if (error.message.includes('API request failed')) {
      console.error('Ошибка запроса к API');
    }
  }
}
```

### С React Query и toast уведомлениями

```tsx
import { useQuery } from '@tanstack/react-query';
import { getShifts } from '@/services/shiftsService';
import { toast } from 'sonner';

export function ShiftsPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts({ system: 15, station: 1 }),
    retry: 2,
    onError: (err) => {
      toast.error('Не удалось загрузить смены', {
        description: err instanceof Error ? err.message : 'Неизвестная ошибка'
      });
    },
  });

  // ...
}
```

## 🔐 Конфигурация

### Переменные окружения

Настройте в `.env` или `.env.local`:

```bash
# STS API Configuration
VITE_STS_API_URL=https://pos.autooplata.ru/tms
VITE_STS_API_USERNAME=your_username
VITE_STS_API_PASSWORD=your_password
```

### Проверка конфигурации

```typescript
// Проверить, настроены ли учетные данные
const isConfigured = Boolean(
  import.meta.env.VITE_STS_API_URL &&
  import.meta.env.VITE_STS_API_USERNAME &&
  import.meta.env.VITE_STS_API_PASSWORD
);

if (!isConfigured) {
  console.warn('⚠️ STS API не настроен. Проверьте переменные окружения.');
}
```

## 📚 Дополнительные ресурсы

- **Swagger**: https://pos.autooplata.ru/tms/docs
- **Типы данных**: `src/types/shifts.ts`
- **Сервис**: `src/services/shiftsService.ts`
- **API документация**: `API_INTEGRATION.md`
