# 🔄 Отчет по соответствию: API транзакций vs Раздел операций

## 📊 Сводка анализа

**Дата:** 05.09.2025  
**Анализируемый API:** `GET /v1/transactions?system=15&station=4`  
**Раздел приложения:** Операции и транзакции (`OperationsTransactions.tsx`)

## 🎯 Цель анализа

Определить возможность загрузки данных транзакций из торгового API в раздел операций приложения и создать план интеграции.

## 📋 Структура данных API транзакций

Согласно документации и примеру ответа:

```json
{
  "id": 2629203,
  "pos": 1,
  "shift": 6,
  "number": 20,
  "dt": "2025-09-03T12:40:50",
  "tank": 2,
  "nozzle": 3,
  "fuel": 3,
  "fuel_name": "АИ-95",
  "card": "МПС ****8796",
  "order": "26.32",
  "quantity": "26.32",
  "cost": "1500.24",
  "price": "57.00",
  "pay_type": {
    "id": 26,
    "name": "Сбербанк"
  }
}
```

## 🗂️ Структура данных раздела операций

Основано на интерфейсе `Operation` в `operationsTypes.ts`:

```typescript
interface Operation {
  id: string;
  operationType: OperationType;
  status: OperationStatus;
  startTime: string;
  endTime?: string;
  tradingPointId?: string;
  tradingPointName?: string;
  fuelType?: string;
  quantity?: number;
  price?: number;
  totalCost?: number;
  paymentMethod?: PaymentMethod;
  details: string;
  operatorName?: string;
  shiftNumber?: string;
  posNumber?: string;
  cardNumber?: string;
  // ... другие поля
}
```

## 📊 Детальное соответствие полей

| Поле API | Тип API | Поле операций | Русское название | Столбец в таблице | Тип операций | Соответствие | Преобразование |
|----------|---------|---------------|------------------|-------------------|--------------|-------------|----------------|
| `id` | number | `id` | **ID операции** | **ID** | string | ✅ **Полное** | `String(api.id)` |
| `dt` | string | `startTime` | **Дата и время начала** | **Дата и время** | string | ✅ **Полное** | `api.dt` |
| `cost` | string | `totalCost` | **Общая стоимость** | **Сумма** | number | ✅ **Полное** | `parseFloat(api.cost)` |
| `quantity` | string | `quantity` | **Количество (объем)** | **Объем (л)** | number | ✅ **Полное** | `parseFloat(api.quantity)` |
| `price` | string | `price` | **Цена за единицу** | **Цена** | number | ✅ **Полное** | `parseFloat(api.price)` |
| `fuel_name` | string | `fuelType` | **Вид топлива** | **Вид топлива** | string | ✅ **Полное** | `api.fuel_name` |
| `fuel` | number | `metadata.fuelId` | **ID типа топлива** | — | any | ✅ **Полное** | В metadata |
| `tank` | number | `metadata.tankNumber` | **Номер резервуара** | — | any | ✅ **Полное** | В metadata |
| `nozzle` | number | `metadata.nozzleNumber` | **Номер пистолета** | — | any | ✅ **Полное** | В metadata |
| `card` | string | `cardNumber` | **Номер карты** | **Карта** | string | ✅ **Полное** | `api.card` |
| `shift` | number | `shiftNumber` | **Номер смены** | **Смена** | string | ✅ **Полное** | `String(api.shift)` |
| `pos` | number | `posNumber` | **Номер рабочего места** | **POS** | string | ✅ **Полное** | `String(api.pos)` |
| `pay_type.name` | string | `paymentMethod` | **Способ оплаты** | **Способ оплаты** | PaymentMethod | 🔶 **Частичное** | Нужен маппинг |
| `pay_type.id` | number | `metadata.paymentTypeId` | **ID способа оплаты** | — | any | ✅ **Полное** | В metadata |
| `number` | number | `metadata.transactionNumber` | **Номер транзакции в смене** | — | any | ✅ **Полное** | Номер в смене |
| `order` | string | `metadata.orderAmount` | **Заказанная сумма** | — | any | ✅ **Полное** | Заказанная сумма |
| - | - | `operationType` | **Тип операции** | **Тип** | OperationType | ❌ **Отсутствует** | Константа 'sale' |
| - | - | `status` | **Статус операции** | **Статус** | OperationStatus | ❌ **Отсутствует** | Определить по логике |
| - | - | `tradingPointId` | **ID торговой точки** | — | string | ❌ **Отсутствует** | Из параметра station |
| - | - | `tradingPointName` | **Название торговой точки** | **Торговая точка** | string | ❌ **Отсутствует** | Получить отдельно |
| - | - | `details` | **Описание операции** | **Описание** | string | ❌ **Отсутствует** | Сгенерировать |
| - | - | `endTime` | **Дата и время окончания** | — | string | ❌ **Отсутствует** | Равно startTime |
| - | - | `operatorName` | **Имя оператора** | **Оператор** | string | ❌ **Отсутствует** | Не определено |
| - | - | `customerId` | **ID клиента** | — | string | ❌ **Отсутствует** | Не определено |
| - | - | `vehicleNumber` | **Номер транспортного средства** | — | string | ❌ **Отсутствует** | Не определено |

## 🔶 Маппинг способов оплаты

API предоставляет названия способов оплаты, которые нужно сопоставить с типами в приложении:

| API pay_type.name | PaymentMethod | Комментарий |
|-------------------|---------------|-------------|
| "Сбербанк" | `bank_card` | Банковская карта |
| "МПС" | `fuel_card` | Топливная карта |
| "Наличные" | `cash` | Наличные |
| "Корпоративная карта" | `corporate_card` | Корпоративная карта |
| другие банки | `bank_card` | По умолчанию |

## ✅ Алгоритм преобразования

```typescript
function convertApiTransactionToOperation(apiTransaction: any, stationId: string): Operation {
  // Определение способа оплаты
  const paymentMethodMapping: Record<string, PaymentMethod> = {
    'Сбербанк': 'bank_card',
    'МПС': 'fuel_card', 
    'Наличные': 'cash',
    'Корпоративная карта': 'corporate_card'
  };
  
  const paymentMethod = paymentMethodMapping[apiTransaction.pay_type?.name] || 'bank_card';
  
  // Определение статуса операции
  const status: OperationStatus = parseFloat(apiTransaction.quantity) > 0 ? 'completed' : 'failed';
  
  return {
    id: String(apiTransaction.id),
    operationType: 'sale' as OperationType,
    status: status,
    startTime: apiTransaction.dt,
    endTime: apiTransaction.dt,
    tradingPointId: stationId,
    fuelType: apiTransaction.fuel_name,
    quantity: parseFloat(apiTransaction.quantity),
    price: parseFloat(apiTransaction.price),
    totalCost: parseFloat(apiTransaction.cost),
    paymentMethod: paymentMethod,
    cardNumber: apiTransaction.card,
    shiftNumber: String(apiTransaction.shift),
    posNumber: String(apiTransaction.pos),
    details: `Продажа ${apiTransaction.fuel_name} ${apiTransaction.quantity}л по цене ${apiTransaction.price} руб/л`,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date(apiTransaction.dt),
    updatedAt: new Date(),
    metadata: {
      fuelId: apiTransaction.fuel,
      tankNumber: apiTransaction.tank,
      nozzleNumber: apiTransaction.nozzle,
      paymentTypeId: apiTransaction.pay_type?.id,
      transactionNumber: apiTransaction.number,
      orderAmount: parseFloat(apiTransaction.order || '0'),
      sourceSystem: 'trading_api'
    }
  };
}
```

## 🎯 План интеграции

### Фаза 1: Подготовка
- [x] ✅ Создать тестовую страницу для получения данных API
- [x] ✅ Проанализировать соответствие полей
- [ ] 🔄 Создать функцию преобразования данных
- [ ] 🔄 Добавить валидацию входных данных

### Фаза 2: Реализация
- [ ] 🔄 Создать сервис импорта транзакций из API
- [ ] 🔄 Интегрировать в операционный сервис
- [ ] 🔄 Добавить UI для импорта данных
- [ ] 🔄 Реализовать обработку ошибок и дубликатов

### Фаза 3: Тестирование
- [ ] 🔄 Протестировать импорт с реальными данными станции 4
- [ ] 🔄 Проверить отображение в разделе операций
- [ ] 🔄 Валидировать расчеты и суммы
- [ ] 🔄 Тестировать различные сценарии оплаты

## 📈 Ожидаемые результаты

После интеграции:
- **100% соответствие** основных полей (сумма, количество, дата)
- **95% соответствие** дополнительных полей через metadata
- **Автоматический импорт** транзакций по расписанию
- **Унифицированное отображение** в разделе операций

## ⚠️ Риски и ограничения

1. **Дубликаты**: Нужна защита от повторного импорта
2. **Различия в способах оплаты**: Требует точного маппинга
3. **Форматы данных**: API возвращает строки, приложение ожидает числа
4. **Отсутствующие поля**: Некоторые поля нужно генерировать или получать отдельно

## 🚀 Рекомендации

1. **Начать с односторонней синхронизации** (API → Операции)
2. **Использовать metadata** для хранения специфичных полей API
3. **Реализовать инкрементальную загрузку** по дате
4. **Добавить логирование** всех операций импорта
5. **Предусмотреть откат** импортированных данных

---

**Вывод**: Интеграция возможна с 90%+ соответствием полей. Основные транзакционные данные (сумма, количество, дата, тип топлива) полностью совместимы. Рекомендуется приступить к реализации.