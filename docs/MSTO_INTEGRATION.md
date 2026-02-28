# MSTO IntegratorService - Спецификация интеграции

## Обзор

Интеграция с MSTO IntegratorService позволяет получать данные об онлайн-заказах топлива для сверки со сменными отчетами.

## Подключение

### Базовый URL
```
http://46.229.214.21:3000
```

### Учетные данные
```
Username: tf-integration
Password: dsvL!r25Api26
```

### Авторизация (Token-based)

MSTO использует **JWT Token авторизацию**. Сначала нужно получить токен через POST /session, затем использовать его в заголовке Authorization.

#### Шаг 1: Получение токена

```http
POST /session
Content-Type: application/json

{
  "username": "tf-integration",
  "password": "dsvL!r25Api26"
}
```

**Ответ:**
```json
{
  "operationStatus": "SUCCESS",
  "item": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "userId": "tf-integration",
      "role": 2
    }
  }
}
```

#### Шаг 2: Использование токена

Все запросы к `/private/*` требуют токен в заголовке:

```http
GET /private/transactions?servicePointId=123&dateFrom=15.01.2026%2008:00:00&dateTo=16.01.2026%2008:00:00
Authorization: eyJhbGciOiJIUzI1NiJ9...
```

> **Важно:** Токен передается без префикса "Bearer", просто значение токена.

---

## API Endpoints

### GET /private/transactions

Получение списка транзакций (онлайн-заказов) с фильтрацией.

#### Параметры запроса

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| `companyGroupId` | Long | Нет | ID группы компаний |
| `companyId` | Long | Нет | ID компании |
| `servicePointId` | Long | Нет | ID точки обслуживания (АЗС) |
| `serviceId` | Long | Нет | ID услуги |
| `page` | Integer | Нет | Номер страницы (default: 0) |
| `size` | Integer | Нет | Размер страницы (default: 12) |
| `operationResult` | String | Нет | Фильтр по статусу: `success`, `error`, `wait`, `unknown`, `sw` |
| `tariffName` | String | Нет | Название тарифа |
| `dateFrom` | String | Нет | Дата начала периода (формат: `dd.MM.yyyy HH:mm:ss`) |
| `dateTo` | String | Нет | Дата окончания периода (формат: `dd.MM.yyyy HH:mm:ss`) |

#### Пример запроса

```typescript
// Получить транзакции за смену
GET /private/transactions?servicePointId=123&dateFrom=15.01.2026%2008:00:00&dateTo=16.01.2026%2008:00:00&operationResult=sw
```

#### Структура ответа

```typescript
interface MSTOTransactionsResponse {
  totalCount: number;
  models: MSTOTransaction[];
  transTotal: MSTOTransTotal;
  totalSum: number;        // Итого сумма с учетом скидок
  totalResultValue: number; // Итого объем
  totalSumPartner: number;  // Итого сумма для партнера
  operationStatus: 'SUCCESS' | 'ERROR';
  operationMessage?: string;
}
```

---

## Модели данных

### MSTOTransaction

```typescript
interface MSTOTransaction {
  id: number;                    // ID транзакции
  sessionId: string;             // ID сессии (уникальный идентификатор заказа)
  dateTime: string;              // Дата/время (dd.MM.yyyy HH:mm:ss)

  // Информация о месте
  companyName: string;           // Название компании
  servicePointName: string;      // Название АЗС
  postNumber: number;            // Номер поста/ТРК

  // Услуга
  service: string;               // Название услуги (топливо)
  tariff: string;                // Название тарифа (агрегатор: Яндекс, FuelUp и т.д.)

  // Заказ
  valueType: string;             // Тип значения: 'volume' | 'sum'
  value: number;                 // Заказанное количество
  price: number;                 // Цена за единицу
  discountPrice: number;         // Цена со скидкой
  discount: number;              // Процент скидки
  sum: number;                   // Сумма заказа

  // Результат
  operationResult: MSTOOperationResult;
  errorDescription?: string;     // Описание ошибки
  resultValue: number;           // Фактическое количество
  resultSum: number;             // Фактическая сумма
  refundSum: number;             // Сумма возврата

  // Данные для партнера (без учета комиссий агрегатора)
  resultSumPartner: number;      // Итого сумма для партнера
  refundSumPartner: number;      // Возврат для партнера
  sumOrderPartner: number;       // Сумма заказа без скидки

  // Комиссии (только для admin)
  agentInteresSum?: number;      // Комиссия агента
  agentGatewayInteresSum?: number;
  integratorInteresSumResult?: number;
  integratorGatewayInteresSum?: number;
  equipmentManufacturerInteresSum?: number;
  partnerOutletInteresSum?: number;

  // Сырые данные
  json?: string;                 // Оригинальный JSON заказа
}
```

### MSTOOperationResult

```typescript
type MSTOOperationResult = 'success' | 'error' | 'wait' | 'unknown';

// Числовые значения для фильтрации
enum MSTOOperationResultValue {
  unknown = 0,
  error = 1,
  success = 2,
  wait = 3
}
```

### MSTOTransTotal

```typescript
interface MSTOTransTotal {
  totalSumOrder: number;         // Сумма заказов
  totalSumOrderPartner: number;  // Сумма заказов для партнера
  totalValue: number;            // Объем из заказов
  totalResultValue: number;      // Фактический объем
  totalSum: number;              // Итого сумма
  totalSumPartner: number;       // Итого для партнера
  totalRefundSum: number;        // Итого возвратов
  totalAgentInteresSum: number;
  totalAgentGatewayInteresSum: number;
  totalIntegratorInteresSumResult: number;
  totalIntegratorGatewayInteresSum: number;
  totalEquipmentManufacturerInteresSum: number;
  totalPartnerOutletInteresSum: number;
}
```

---

## Маппинг станций MSTO → TradeControl

Для сверки необходимо связать станции MSTO с торговыми точками TradeControl.

### Таблица маппинга

| MSTO servicePointId | MSTO servicePointName | TF system | TF station | Примечание |
|---------------------|----------------------|-----------|------------|------------|
| ? | ? | ? | ? | Требуется настройка |

### Рекомендуемая структура конфигурации

```typescript
interface MSTOStationMapping {
  mstoServicePointId: number;
  mstoServicePointName: string;
  tfSystem: number;
  tfStation: number;
  enabled: boolean;
}

// Пример конфигурации (хранить в БД или env)
const stationMappings: MSTOStationMapping[] = [
  { mstoServicePointId: 123, mstoServicePointName: 'АЗС Москва-1', tfSystem: 1, tfStation: 101, enabled: true },
  // ...
];
```

---

## Логика сверки

### Алгоритм сверки онлайн-заказов со сменным отчетом

```typescript
interface ReconciliationResult {
  // Данные из MSTO
  mstoOrders: MSTOTransaction[];
  mstoTotalSum: number;
  mstoTotalVolume: number;
  mstoSuccessCount: number;
  mstoErrorCount: number;

  // Данные из сменного отчета (sbpRevenue / nonCashVolume)
  shiftOnlineRevenue: number;   // sbpRevenue из ShiftDetails
  shiftOnlineVolume: number;    // nonCashVolume из salesBreakdown

  // Результат сверки
  sumDifference: number;        // Разница по сумме
  volumeDifference: number;     // Разница по объему
  hasDiscrepancy: boolean;      // Есть расхождение

  // Детализация расхождений
  discrepancies: ReconciliationDiscrepancy[];
}

interface ReconciliationDiscrepancy {
  type: 'missing_in_shift' | 'missing_in_msto' | 'amount_mismatch';
  mstoOrder?: MSTOTransaction;
  shiftRecord?: any;
  description: string;
}
```

### Сопоставление данных

| MSTO поле | Сменный отчет | Описание |
|-----------|---------------|----------|
| `resultSum` | `sbpRevenue` | Сумма онлайн-заказов |
| `resultValue` | `nonCashVolume` (salesBreakdown) | Объем онлайн-заказов |
| `tariff` | - | Определяет агрегатор (Яндекс, FuelUp и т.д.) |
| `operationResult=success` | - | Только успешные заказы участвуют в сверке |

### Фильтрация данных для сверки

```typescript
// Только успешные транзакции
const successOrders = mstoOrders.filter(
  order => order.operationResult === 'success' || order.operationResult === 'wait'
);

// Группировка по агрегаторам
const byAggregator = groupBy(successOrders, 'tariff');
```

---

## Безопасность

1. **Хранение credentials**: Использовать environment variables, не коммитить в репозиторий
2. **CORS**: API уже настроен с `Access-Control-Allow-Origin: *`
3. **Роли доступа**: Комиссии видны только пользователям с ролью `admin`

---

## Агрегаторы (тарифы)

Список поддерживаемых агрегаторов в MSTO:

| Название в MSTO | Описание |
|-----------------|----------|
| `Яндекс.Заправки` | Yandex Tanker |
| `Benzuber` | Benzuber |
| `FuelUp` | FuelUp |
| `РТР.Заправки` | РТР |
| `АвтоОплата` | АвтоОплата |
| `ШтрихМ` | Штрих-М |
| `Е1Card` | E1 Card |
| `Монополия` | Монополия |
| `АВТОПОЛЕ` | Автополе |

---

## Дополнительные endpoints

### GET /private/servicePoints
Получение списка станций для маппинга.

### GET /private/transactions/reports
Получение Excel-отчета по транзакциям (возвращает .xlsx файл).

---

## Примеры HTTP запросов

### Авторизация

```http
POST http://46.229.214.21:3000/session
Content-Type: application/json

{
  "username": "tf-integration",
  "password": "dsvL!r25Api26"
}
```

### Получение транзакций за период

```http
GET http://46.229.214.21:3000/private/transactions?servicePointId=123&dateFrom=15.01.2026%2008:00:00&dateTo=16.01.2026%2008:00:00&operationResult=sw&size=1000
Authorization: <token>
```

### Получение списка станций

```http
GET http://46.229.214.21:3000/private/servicePoints
Authorization: <token>
```

### Экспорт в Excel

```http
GET http://46.229.214.21:3000/private/transactions/reports?servicePointId=123&dateFrom=15.01.2026%2008:00:00&dateTo=16.01.2026%2008:00:00
Authorization: <token>
```

> Возвращает файл `.xlsx`
