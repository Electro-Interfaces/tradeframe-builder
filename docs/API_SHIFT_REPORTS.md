# API Сменных Отчетов - Подробная Документация

## Оглавление
- [Обзор](#обзор)
- [Аутентификация](#аутентификация)
- [Получение списка смен](#получение-списка-смен)
- [Получение детального отчета о смене](#получение-детального-отчета-о-смене)
- [Структура данных по секциям](#структура-данных-по-секциям)
- [Примеры использования](#примеры-использования)

---

## Обзор

API предоставляет доступ к сменным отчетам АЗС через два основных endpoint:
- **GET `/v1/shifts`** - список смен с базовой информацией
- **GET `/v1/report/shift_report`** - детальный отчет о конкретной смене

**Base URL:** `https://pos.autooplata.ru/tms`
**Документация Swagger:** https://pos.autooplata.ru/tms/docs

---

## Аутентификация

API использует HTTP Basic Authentication.

### Заголовки запроса
```http
Authorization: Basic <base64(username:password)>
Content-Type: application/json
```

### Пример с credentials
```javascript
const credentials = btoa(`${username}:${password}`);
const headers = {
  'Authorization': `Basic ${credentials}`,
  'Content-Type': 'application/json'
};
```

---

## Получение списка смен

### Endpoint
```http
GET /v1/shifts?system={system}&station={station}&dt_beg={dt_beg}&dt_end={dt_end}
```

### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `system` | number | ✅ | Код системы (например, 15) |
| `station` | number | ❌ | Код торговой точки (например, 4) |
| `dt_beg` | string | ❌ | Дата начала периода (ISO 8601) |
| `dt_end` | string | ❌ | Дата окончания периода (ISO 8601) |

### Пример запроса
```bash
curl -X GET "https://pos.autooplata.ru/tms/v1/shifts?system=15&station=4&dt_beg=2025-10-01T00:00:00&dt_end=2025-10-05T23:59:59" \
  -H "Authorization: Basic <credentials>"
```

### Структура ответа
```json
[
  {
    "shift": 40,
    "dt_open": "2025-10-04T00:00:55",
    "dt_close": "2025-10-05T00:00:31"
  },
  {
    "shift": 39,
    "dt_open": "2025-10-03T00:01:12",
    "dt_close": "2025-10-04T00:00:30"
  }
]
```

### Поля ответа

| Поле | Тип | Описание |
|------|-----|----------|
| `shift` | number | Номер смены |
| `dt_open` | string | Дата и время открытия смены (ISO 8601) |
| `dt_close` | string \| null | Дата и время закрытия смены (null если смена открыта) |

---

## Получение детального отчета о смене

### Endpoint
```http
GET /v1/report/shift_report?system={system}&station={station}&shift={shift}
```

### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `system` | number | ✅ | Код системы (например, 15) |
| `station` | number | ✅ | Код торговой точки (например, 4) |
| `shift` | number | ✅ | Номер смены (например, 40) |

### Пример запроса
```bash
curl -X GET "https://pos.autooplata.ru/tms/v1/report/shift_report?system=15&station=4&shift=40" \
  -H "Authorization: Basic <credentials>"
```

### Общая структура ответа
```json
{
  "shift": 40,
  "psm": { /* Данные по ПСМ и ТРК */ },
  "release": [ /* Данные по резервуарам */ ],
  "sales": [ /* Данные по продажам */ ],
  "receipt": [ /* Данные по поступлениям */ ],
  "money": [ /* Движение наличных */ ]
}
```

---

## Структура данных по секциям

### 1. Секция `psm` - Информация по ПСМ и ТРК

#### Структура
```json
{
  "psm": {
    "total": [
      {
        "pos": 1,
        "shift_num": 40,
        "shift_status": 2,
        "operator": "Иванова М.П."
      }
    ],
    "data": [
      {
        "pos": 1,
        "pump": 1,
        "nozzle": "1-1",
        "tank": 1,
        "psm_beg": 1234567.89,
        "psm_end": 1235728.54,
        "density": 0.745,
        "price": 56.60,
        "service": {
          "service_code": 2,
          "service_name": "АИ-92"
        },
        "release": {
          "volume": "1160.65",
          "amount": "864.88",
          "cost": "65700.79"
        }
      }
    ]
  }
}
```

#### Поля `psm.total` (Информация о рабочих местах)

| Поле | Тип | Описание |
|------|-----|----------|
| `pos` | number | Номер POS (рабочего места) |
| `shift_num` | number | Номер смены |
| `shift_status` | number | Статус смены (1-открыта, 2-закрыта) |
| `operator` | string | ФИО оператора |

#### Поля `psm.data` (Показания счетных механизмов ТРК)

| Поле | Тип | Описание |
|------|-----|----------|
| `pos` | number | Номер POS |
| `pump` | number | Номер ТРК |
| `nozzle` | string | Номер пистолета (например, "1-1") |
| `tank` | number | Номер резервуара |
| `psm_beg` | number | Показания счетного механизма на начало смены |
| `psm_end` | number | Показания счетного механизма на конец смены |
| `density` | number | Плотность (г/см³) |
| `price` | number | Цена за литр (руб.) |
| `service.service_code` | number | Код топлива |
| `service.service_name` | string | Название топлива |
| `release.volume` | string | Отпущено литров |
| `release.amount` | string | Отпущено кг |
| `release.cost` | string | Стоимость (руб.) |

---

### 2. Секция `release` - Состояние резервуаров

#### Структура
```json
{
  "release": [
    {
      "tank": 1,
      "service": {
        "service_code": 2,
        "service_name": "АИ-92"
      },
      "doc_beg": {
        "volume": "5234.50",
        "amount": "3899.80"
      },
      "doc_end": {
        "volume": "4073.85",
        "amount": "3034.92"
      },
      "receipt": {
        "volume": "0.00",
        "amount": "0.00"
      },
      "release": {
        "volume": "1160.65",
        "amount": "864.88",
        "cost": "65700.79"
      },
      "level_end": 758,
      "temp_end": 15.5,
      "density_end": 0.745,
      "water": {
        "level": 0.00,
        "volume": 0.00
      }
    }
  ]
}
```

#### Поля резервуара

| Поле | Тип | Описание |
|------|-----|----------|
| `tank` | number | Номер резервуара |
| `service.service_code` | number | Код топлива |
| `service.service_name` | string | Название топлива |
| `doc_beg.volume` | string | Объем на начало смены (л) |
| `doc_beg.amount` | string | Масса на начало смены (кг) |
| `doc_end.volume` | string | Объем на конец смены (л) |
| `doc_end.amount` | string | Масса на конец смены (кг) |
| `receipt.volume` | string | Поступило (л) |
| `receipt.amount` | string | Поступило (кг) |
| `release.volume` | string | Отпущено по ТРК (л) |
| `release.amount` | string | Отпущено по ТРК (кг) |
| `release.cost` | string | Стоимость отпуска (руб.) |
| `level_end` | number | Уровень на конец смены (мм) |
| `temp_end` | number | Температура на конец смены (°C) |
| `density_end` | number | Плотность на конец смены (г/см³) |
| `water.level` | number | Уровень воды (см) |
| `water.volume` | number | Объем воды (л) |

#### Расчетные поля
- **Расчетный остаток** = `doc_beg.volume` + `receipt.volume` - `release.volume`
- **Разница** = `doc_end.volume` - Расчетный остаток
- **Превышение погрешности** = `Math.abs(Разница) > 10` литров

---

### 3. Секция `sales` - Продажи по топливу и способам оплаты

#### Структура
```json
{
  "sales": [
    {
      "pay_type": {
        "id": 1,
        "name": "Наличные"
      },
      "fuel": [
        {
          "service": {
            "service_code": 2,
            "service_name": "АИ-92"
          },
          "release": {
            "volume": "227.95",
            "cost": "12900.00",
            "discount": 0.04
          }
        },
        {
          "service": {
            "service_code": 3,
            "service_name": "АИ-95"
          },
          "release": {
            "volume": "154.54",
            "cost": "9300.00",
            "discount": 0.01
          }
        }
      ]
    },
    {
      "pay_type": {
        "id": 12,
        "name": "Сбербанк"
      },
      "fuel": [
        {
          "service": {
            "service_code": 2,
            "service_name": "АИ-92"
          },
          "release": {
            "volume": "848.79",
            "cost": "48041.40",
            "discount": 0.12
          }
        }
      ]
    },
    {
      "pay_type": {
        "id": 15,
        "name": "МобилПр."
      },
      "fuel": [
        {
          "service": {
            "service_code": 2,
            "service_name": "АИ-92"
          },
          "release": {
            "volume": "66.24",
            "cost": "3749.19",
            "discount": 0.00
          }
        }
      ]
    },
    {
      "pay_type": {
        "id": 16,
        "name": "Купон на сдачу"
      },
      "fuel": [
        {
          "service": {
            "service_code": 2,
            "service_name": "АИ-92"
          },
          "release": {
            "volume": "17.67",
            "cost": "1000.00",
            "discount": 0.12
          }
        },
        {
          "service": {
            "service_code": 3,
            "service_name": "АИ-95"
          },
          "release": {
            "volume": "-16.62",
            "cost": "-1000.00",
            "discount": 1.04
          }
        }
      ]
    }
  ]
}
```

#### Поля продаж

| Поле | Тип | Описание |
|------|-----|----------|
| `pay_type.id` | number | ID способа оплаты |
| `pay_type.name` | string | Название способа оплаты |
| `fuel` | array | Массив продаж по видам топлива |
| `service.service_code` | number | Код топлива |
| `service.service_name` | string | Название топлива |
| `release.volume` | string | Объем (л) |
| `release.cost` | string | Стоимость (руб.) |
| `release.discount` | number | Скидка (руб.) |

#### Способы оплаты (маппинг)

| ID | Название | Категория |
|----|----------|-----------|
| 1 | Наличные | Наличные |
| 12 | Сбербанк | Карты |
| 15 | МобилПр. | Безналичные |
| 16 | Купон на сдачу | Корректировка |

**Важно:**
- **Купоны** - это корректировка объема (отложенная поставка), может быть отрицательной
- **Скидка из купонов НЕ учитывается** в общей сумме скидок
- **Купоны попадают в "Безнал."** в расшифровке реализации

---

### 4. Секция `receipt` - Поступления нефтепродуктов

#### Структура
```json
{
  "receipt": [
    {
      "datetime": "2025-10-04T10:30:00",
      "tank": 1,
      "service": {
        "service_code": 2,
        "service_name": "АИ-92"
      },
      "volume": "5000.00",
      "amount": "3725.00",
      "density": 0.745,
      "temp": 15.0,
      "actual_volume": "4998.50",
      "actual_amount": "3723.88",
      "actual_density": 0.7448,
      "actual_temp": 15.2,
      "doc_num": "ТТН-12345",
      "supplier": "Нефтебаза №1"
    }
  ]
}
```

#### Поля поступления

| Поле | Тип | Описание |
|------|-----|----------|
| `datetime` | string | Дата и время поступления (ISO 8601) |
| `tank` | number | Номер резервуара |
| `service.service_code` | number | Код топлива |
| `service.service_name` | string | Название топлива |
| **По документу:** | | |
| `volume` | string | Объем (л) |
| `amount` | string | Масса (кг) |
| `density` | number | Плотность (г/см³) |
| `temp` | number | Температура (°C) |
| **Фактически:** | | |
| `actual_volume` | string | Объем (л) |
| `actual_amount` | string | Масса (кг) |
| `actual_density` | number | Плотность (г/см³) |
| `actual_temp` | number | Температура (°C) |
| **Метаданные:** | | |
| `doc_num` | string | Номер документа |
| `supplier` | string | Поставщик |

---

### 5. Секция `money` - Движение наличных денежных средств

#### Структура
```json
{
  "money": [
    {
      "operation": {
        "id": 3,
        "name": "Приход"
      },
      "datetime": "2025-10-04T12:00:00",
      "pos": 1,
      "money": 24200.00,
      "description": "Выручка"
    },
    {
      "operation": {
        "id": 7,
        "name": "Закрытие смены"
      },
      "datetime": "2025-10-05T00:00:31",
      "pos": 1,
      "money": 25103.54,
      "description": "Остаток на конец смены по всей АЗС"
    }
  ]
}
```

#### Поля движения наличных

| Поле | Тип | Описание |
|------|-----|----------|
| `operation.id` | number | ID операции |
| `operation.name` | string | Название операции |
| `datetime` | string | Дата и время операции (ISO 8601) |
| `pos` | number | Номер POS |
| `money` | number | Сумма (руб.) |
| `description` | string | Описание операции |

#### Типы операций

| ID | Название | Тип | Описание |
|----|----------|-----|----------|
| 1 | Открытие смены | opening | Остаток на начало смены |
| 3 | Приход | income | Внесение денег |
| 4 | Расход | expense | Выдача денег |
| 7 | Закрытие смены | closing | Остаток на конец смены |

#### Расчет итогов движения наличных

```javascript
// Принято по смене = closing из API (operation.id: 7)
const openingAmount = money.find(m => m.operation.id === 7)?.money || 0;

// Внесено за смену (operation.id: 3, если есть)
const incomeAmount = money
  .filter(m => m.operation.id === 3)
  .reduce((sum, m) => sum + m.money, 0);

// Выручка за смену = из paymentSales (наличные)
const revenue = paymentSales
  .find(p => p.paymentTypeName.includes('наличн'))?.cost || 0;

// Передано по смене = Принято + Внесено + Выручка
const closingAmount = openingAmount + incomeAmount + revenue;
```

---

## Примеры использования

### Пример 1: Получение списка смен за неделю

```javascript
import { shiftsService } from './services/shiftsService';

async function getWeeklyShifts() {
  const params = {
    system: 15,
    station: 4,
    dt_beg: '2025-09-29T00:00:00',
    dt_end: '2025-10-05T23:59:59'
  };

  const shifts = await shiftsService.getShifts(params);

  console.log(`Получено смен: ${shifts.length}`);
  shifts.forEach(shift => {
    console.log(`Смена №${shift.shift}: ${shift.dt_open} - ${shift.dt_close || 'открыта'}`);
  });
}
```

### Пример 2: Получение детального отчета

```javascript
import { shiftsService } from './services/shiftsService';

async function getShiftReport() {
  const params = {
    system: 15,
    station: 4,
    shift: 40
  };

  const report = await shiftsService.getShiftReport(params);

  console.log('ПСМ информация:', report.psm.total);
  console.log('Резервуары:', report.release);
  console.log('Продажи:', report.sales);
  console.log('Поступления:', report.receipt);
  console.log('Движение наличных:', report.money);
}
```

### Пример 3: Преобразование в UI формат

```javascript
import { ShiftReportAdapterV2 } from './services/adapters/shiftReportAdapterV2';

async function getFormattedShiftDetails() {
  const params = {
    system: 15,
    station: 4,
    shift: 40
  };

  // 1. Получаем базовую информацию о смене
  const shifts = await shiftsService.getShifts({
    system: params.system,
    station: params.station
  });
  const shiftInfo = shifts.find(s => s.shift === params.shift);

  // 2. Получаем детальный отчет
  const apiResponse = await shiftsService.getShiftReport(params);

  // 3. Преобразуем в UI формат
  const details = ShiftReportAdapterV2.toDetails(
    apiResponse,
    params.shift,
    params.system,
    params.station,
    'АЗС №4',
    shiftInfo
  );

  console.log('UI формат:', details);
}
```

### Пример 4: Расчет расшифровки реализации

```javascript
function calculateSalesBreakdown(sales) {
  const breakdown = new Map();

  sales.forEach(sale => {
    const paymentName = sale.pay_type.name.toLowerCase();

    sale.fuel.forEach(fuelItem => {
      const fuelCode = fuelItem.service.service_code;
      const fuelName = fuelItem.service.service_name;
      const volume = parseFloat(fuelItem.release.volume);
      const cost = parseFloat(fuelItem.release.cost);
      const discount = fuelItem.release.discount || 0;

      if (!breakdown.has(fuelCode)) {
        breakdown.set(fuelCode, {
          fuelCode,
          fuelName,
          pumpVolume: 0,
          cardVolume: 0,
          cardCost: 0,
          discountCost: 0,
          cashVolume: 0,
          cashCost: 0,
          nonCashVolume: 0,
          totalVolume: 0,
          difference: 0
        });
      }

      const item = breakdown.get(fuelCode);

      if (paymentName.includes('купон')) {
        // Купон - корректировка, попадает в безнал
        item.nonCashVolume += volume;
        item.totalVolume += volume;
        // Скидку НЕ учитываем
      } else if (paymentName.includes('сбербанк') || paymentName.includes('карт')) {
        item.cardVolume += volume;
        item.cardCost += cost;
        item.discountCost += discount;
        item.totalVolume += volume;
      } else if (paymentName.includes('наличн')) {
        item.cashVolume += volume;
        item.cashCost += cost;
        item.discountCost += discount;
        item.totalVolume += volume;
      } else if (paymentName.includes('мобил')) {
        item.nonCashVolume += volume;
        item.discountCost += discount;
        item.totalVolume += volume;
      }
    });
  });

  return Array.from(breakdown.values());
}
```

---

## Обработка ошибок

### Возможные коды ошибок

| Код | Описание | Решение |
|-----|----------|---------|
| 401 | Unauthorized | Проверьте credentials |
| 404 | Not Found | Проверьте параметры запроса |
| 500 | Internal Server Error | Обратитесь к администратору |

### Пример обработки ошибок

```javascript
async function safeGetShiftReport(params) {
  try {
    const report = await shiftsService.getShiftReport(params);
    return report;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Ошибка аутентификации');
    } else if (error.response?.status === 404) {
      console.error('Смена не найдена');
    } else {
      console.error('Неизвестная ошибка:', error);
    }
    throw error;
  }
}
```

---

## Полезные ссылки

- **Swagger документация:** https://pos.autooplata.ru/tms/docs
- **Исходный код адаптера:** `src/services/adapters/shiftReportAdapterV2.ts`
- **Типы данных:** `src/types/shift-reports-v2.ts`
- **Сервис API:** `src/services/shiftsService.ts`
- **Страница отчетов:** `src/pages/ShiftReportsV2.tsx`

---

*Документация актуальна на 05.10.2025*
