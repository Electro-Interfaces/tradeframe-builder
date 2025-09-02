# API торговой сети

## Базовая информация

**Swagger документация:** https://pos.autooplata.ru/tms/docs  
**API базовый URL:** https://pos.autooplata.ru/tms

## Авторизация

### 1. Вход в систему
```http
POST https://pos.autooplata.ru/tms/v1/login
```

**Тестовые данные:**
- username: `UserTest`
- password: `sys5tem6`

**Пример тела запроса:**
```json
{
  "username": "UserTest",
  "password": "sys5tem6"  
}
```

**Пример ответа (JWT токен):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6eyJpZCI6IkFDQ0FFNDA4LTYzMzItNDI0NS04NUIxLTI1RjkxNEYzQkQ2NCIsIm5hbWUiOiJVc2VyVGVzdCIsInJvbGUiOm51bGx9LCJ1c2VyIjp7ImlkIjoiQUNDQUU0MDgtNjMzMi00MjQ1LTg1QjEtMjVGOTE0RjNCRDY0IiwibmFtZSI6IlVzZXJUZXN0In0sImV4cCI6MTc1NjgzMjA0OH0.vcl8_bvjhFvWySQ9V44A25PmBbAmQXieNg8_OCOGofI
```

**Авторизация:**
Данный токен необходимо передавать в заголовке всех последующих запросов:
```
Authorization: Bearer <JWT-токен>
```

> **Примечание:** Возможно потребуется настроить систему так, чтобы пароль не кодировался автоматически.

## Управление ценами

### 2. Получение цен
```http
GET https://pos.autooplata.ru/tms/v1/pos/prices/{station_number}
```

**Параметры:**
- `station_number` - номер станции
- `system` - ID системы
- `date` - дата в формате ISO 8601

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v1/pos/prices/77?system=15&date=2025-09-01T17%3A25%3A58
```

**Пример ответа:**
```json
{
  "prices": [
    {
      "service_code": 2,
      "service_name": "АИ-92",
      "price": 58.2
    },
    {
      "service_code": 3,
      "service_name": "АИ-95",
      "price": 62.9
    }
  ]
}
```

### 3. Установка цен
```http
POST https://pos.autooplata.ru/tms/v1/prices
```

**Параметры URL:**
- `system` - ID системы
- `station` - номер станции

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v1/prices?system=15&station=45
```

**Пример тела запроса:**
```json
{
  "prices": {
    "2": 45.8,
    "3": 98.7
  },
  "effective_date": "2025-09-01T09:50:34"
}
```

**Описание полей:**
- `prices` - объект с кодами услуг как ключи и ценами как значения
- `effective_date` - дата и время начала действия цен в формате ISO 8601

## Справочники

### 4. Справочник услуг
```http
GET https://pos.autooplata.ru/tms/v1/services
```

**Параметры:**
- `system` - ID системы

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v1/services?system=15
```

**Пример ответа:**
```json
[
  {
    "service_code": 1,
    "service_name": "АИ-100"
  },
  {
    "service_code": 2,
    "service_name": "АИ-92"
  },
  {
    "service_code": 3,
    "service_name": "АИ-95"
  }
]
```

## Мониторинг оборудования

### 5. Статусы оборудования

#### а) Сокращенный набор данных
```http
GET https://pos.autooplata.ru/tms/v1/info
```

**Параметры:**
- `system` - ID системы
- `station` - номер станции

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v1/info?system=15&station=77
```

**Пример ответа:**
```json
[
  {
    "system": 15,
    "station": 77,
    "shift": {
      "number": 12,
      "state": "Открытая"
    },
    "pos": [
      {
        "number": 3,
        "dt_info": "2025-08-12T16:31:05",
        "shift": {
          "number": 12,
          "state": "Открытая",
          "dt_open": "2025-08-07T15:11:55",
          "dt_close": "2025-08-12T16:03:35"
        },
        "devices": [
          {
            "name": "Фискальный регистратор",
            "state": "OK"
          },
          {
            "name": "Купюроприемник",
            "state": "Не работает"
          },
          {
            "name": "Картридер",
            "state": "OK"
          },
          {
            "name": "МПС-ридер",
            "state": "Не работает"
          }
        ]
      },
      {
        "number": 4,
        "dt_info": "2025-08-28T16:06:38",
        "uptime": "2025-08-28T15:11:32",
        "shift": {
          "number": 12,
          "state": "Открытая",
          "dt_open": "2025-08-25T12:54:32"
        },
        "devices": [
          {
            "name": "Фискальный регистратор",
            "state": "OK"
          },
          {
            "name": "Купюроприемник",
            "state": "Не работает"
          },
          {
            "name": "Картридер",
            "state": "OK"
          },
          {
            "name": "МПС-ридер",
            "state": "OK"
          }
        ]
      }
    ]
  }
]
```

#### б) Расширенный вариант
```http
GET https://pos.autooplata.ru/tms/v2/info
```

**Параметры:**
- `system` - ID системы
- `station` - номер станции

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v2/info?system=15&station=77
```

**Пример ответа:**
```json
[
  {
    "system": 15,
    "station": 77,
    "shift": {
      "number": 12,
      "state": "Открытая"
    },
    "pos": [
      {
        "number": 3,
        "dt_info": "2025-08-12T16:31:05",
        "shift": {
          "number": 12,
          "state": "Открытая",
          "dt_open": "2025-08-07T15:11:55",
          "dt_close": "2025-08-12T16:03:35"
        },
        "devices": [
          {
            "params": [
              {
                "name": "Состояние",
                "value": "OK"
              }
            ],
            "id": 1,
            "name": "Фискальный регистратор"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "Не работает"
              }
            ],
            "id": 10,
            "name": "Купюроприемник"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "OK"
              }
            ],
            "id": 11,
            "name": "Картридер"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "Не работает"
              }
            ],
            "id": 12,
            "name": "МПС-ридер"
          }
        ]
      },
      {
        "number": 4,
        "dt_info": "2025-08-28T16:06:38",
        "uptime": "2025-08-28T15:11:32",
        "shift": {
          "number": 12,
          "state": "Открытая",
          "dt_open": "2025-08-25T12:54:32"
        },
        "devices": [
          {
            "params": [
              {
                "name": "Состояние",
                "value": "OK"
              }
            ],
            "id": 1,
            "name": "Фискальный регистратор"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "Работает"
              }
            ],
            "id": 10,
            "name": "Купюроприемник"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "OK"
              }
            ],
            "id": 11,
            "name": "Картридер"
          },
          {
            "params": [
              {
                "name": "Состояние",
                "value": "OK"
              }
            ],
            "id": 12,
            "name": "МПС-ридер"
          }
        ]
      }
    ]
  }
]
```

**Примечания по структуре данных:**
- **Главная смена:** первая секция `shift` - это главная смена на ТО
  - `shift.number` - номер смены
  - `shift.state` - состояние смены
- **Рабочие места:** секция `pos` - рабочие места на ТО
  - Каждый `pos` имеет свою смену `shift` и список устройств `devices`
  - `dt_info` - дата выгрузки статусов по рабочему месту
  - `uptime` - дата загрузки терминала

## Управление оборудованием

### 6. Перезагрузка терминала
```http
POST https://pos.autooplata.ru/tms/v1/control/restart
```

**Параметры:**
- `system` - ID системы
- `station` - номер станции

**Пример запроса:**
```
https://pos.autooplata.ru/tms/v1/control/restart?system=15&station=77
```

## Коды состояний устройств

| Состояние | Описание |
|-----------|----------|
| OK | Устройство работает нормально |
| Не работает | Устройство неисправно или недоступно |
| Работает | Устройство в рабочем состоянии |

## Типы устройств

| ID | Название |
|----|----------|
| 1 | Фискальный регистратор |
| 10 | Купюроприемник |
| 11 | Картридер |
| 12 | МПС-ридер |

## Примеры интеграции

### Получение актуальных цен для станции
```javascript
// 1. Авторизация
const authResponse = await fetch('https://pos.autooplata.ru/tms/v1/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'UserTest',
    password: 'sys5tem6'
  })
});
const token = await authResponse.text();

// 2. Получение цен
const pricesResponse = await fetch(
  'https://pos.autooplata.ru/tms/v1/pos/prices/77?system=15&date=2025-09-01T17:25:58',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
const prices = await pricesResponse.json();
```

### Установка новых цен
```javascript
const response = await fetch(
  'https://pos.autooplata.ru/tms/v1/prices?system=15&station=45',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prices: {
        "2": 45.8, // АИ-92
        "3": 98.7  // АИ-95
      },
      effective_date: "2025-09-01T09:50:34"
    })
  }
);
```