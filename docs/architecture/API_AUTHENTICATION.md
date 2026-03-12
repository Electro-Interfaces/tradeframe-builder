# Аутентификация внешнего API (STS API)

**Дата обновления:** 2025-10-18
**Версия:** 1.0

---

## 🔐 Схема авторизации

Внешний API торговой сети (STS API) использует **JWT (JSON Web Token) аутентификацию**.

### Принцип работы

```
1. Backend получает учетные данные из .env
   ↓
2. POST /v1/login { username, password }
   ↓
3. STS API возвращает JWT токен (строка в кавычках)
   ↓
4. Backend сохраняет токен и устанавливает в заголовок Authorization
   ↓
5. Все последующие запросы: Authorization: Bearer {token}
   ↓
6. Токен действителен 20 минут
   ↓
7. Автообновление за 2 минуты до истечения
```

---

## ⚙️ Конфигурация

### Переменные окружения

**Файл:** `server/.env`

```env
# STS API Configuration (External Trading System)
STS_API_URL=https://pos.autooplata.ru/tms
STS_API_USERNAME=UserApi
STS_API_PASSWORD=lHQfLZHzB3tn
```

### Важные параметры

| Параметр | Значение | Описание |
|----------|----------|----------|
| `STS_API_URL` | https://pos.autooplata.ru/tms | Базовый URL API |
| `STS_API_USERNAME` | UserApi | Логин для получения токена |
| `STS_API_PASSWORD` | lHQfLZHzB3tn | Пароль для получения токена |
| Срок действия токена | 20 минут | Токен автоматически обновляется |
| Время обновления | 18 минут | За 2 минуты до истечения |

---

## 🔧 Реализация

### Файл: `server/routes/sts.js`

#### 1. Инициализация клиента

```javascript
let stsClient = null;
let jwtToken = null;
let tokenExpiry = null;

async function getStsClient() {
  if (!stsClient) {
    // Создание axios клиента
    stsClient = axios.create({
      baseURL: process.env.STS_API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Проверка и обновление токена
  if (!jwtToken || (tokenExpiry && Date.now() >= tokenExpiry)) {
    await refreshJwtToken();
  }

  return stsClient;
}
```

#### 2. Получение JWT токена

```javascript
async function refreshJwtToken() {
  console.log('[STS Proxy] Refreshing JWT token...');

  try {
    // POST запрос на /v1/login с учетными данными
    const response = await stsClient.post('/v1/login', {
      username: process.env.STS_API_USERNAME,
      password: process.env.STS_API_PASSWORD
    });

    // Токен приходит как строка в кавычках: "eyJhbGc..."
    // Убираем кавычки
    const rawToken = response.data;
    jwtToken = typeof rawToken === 'string'
      ? rawToken.replace(/"/g, '')
      : rawToken;

    // Устанавливаем время истечения (18 минут)
    tokenExpiry = Date.now() + (18 * 60 * 1000);

    // Устанавливаем заголовок для всех будущих запросов
    stsClient.defaults.headers['Authorization'] = `Bearer ${jwtToken}`;

    console.log('[STS Proxy] JWT token refreshed successfully');
  } catch (error) {
    console.error('[STS Proxy] Failed to refresh JWT token:', error.message);
    throw new Error('Failed to authenticate with STS API');
  }
}
```

#### 3. Выполнение запросов

```javascript
async function proxyRequest(req, res) {
  try {
    // Получаем клиент (с автоматическим обновлением токена)
    const client = await getStsClient();

    // Выполняем запрос с JWT токеном в заголовке
    const response = await client.request({
      method: req.method,
      url: req.path,
      params: req.query,
      data: req.body
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    // Обработка ошибок
  }
}
```

---

## 📋 Доступные endpoints

### Информация о торговых точках

- `GET /v1/info` - Статусы оборудования (старая версия)
- `GET /v2/info` - Расширенная информация о ТО

### Резервуары и топливо

- `GET /v1/tanks` - Данные резервуаров

### Транзакции

- `GET /v1/transactions` - Список транзакций (старая версия)
- `GET /v2/transactions` - Расширенный список транзакций

### Смены и отчеты

- `GET /v1/shifts` - Список смен
- `GET /v1/report/receipts` - Поступления нефтепродуктов
- `GET /v1/report/shift_report` - Сменный отчет (ПСМ, резервуары, продажи)

### Цены

- `GET /v1/prices` - Текущие цены
- `GET /v1/pos/prices/:station_number` - Цены на конкретной ТО
- `GET /v1/schedule/prices/:station_number` - Расписание цен

### Купоны

- `GET /v1/coupons` - Список купонов

### Управление (POST запросы)

- `POST /v1/control/terminal/open` - Открыть терминал
- `POST /v1/control/terminal/close` - Закрыть терминал
- `POST /v1/control/shift/open` - Открыть смену
- `POST /v1/control/shift/close` - Закрыть смену

---

## 🚨 Обработка ошибок

### Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| 403 Forbidden | Неверные credentials или истек токен | Проверить username/password в .env |
| 401 Unauthorized | Токен не валиден | Токен обновится автоматически |
| 503 Service Unavailable | STS API недоступен | Проверить доступность API |
| ECONNREFUSED | Backend сервер не запущен | Запустить `cd server && node index.js` |

### Логи для отладки

```javascript
// При инициализации
[STS Proxy] Client initialized with URL: https://pos.autooplata.ru/tms

// При обновлении токена
[STS Proxy] Refreshing JWT token...
[STS Proxy] JWT token refreshed successfully

// При ошибке
[STS Proxy Error] Request failed with status code 403
[STS Proxy Error] Failed to refresh JWT token: ...
```

---

## 🔄 Поток данных в приложении

```
Frontend (React)
    ↓ HTTP request
Vite Dev Server (proxy на :3001)
    ↓ /api/sts/*
Backend Server (:3001)
    ↓ JWT Authorization
External STS API (https://pos.autooplata.ru/tms)
    ↓ JSON response
Backend Server
    ↓ JSON response
Vite Dev Server
    ↓ JSON response
Frontend (React)
```

### Development режим

- Frontend делает запросы на `/api/sts/*`
- Vite proxy перенаправляет на `http://localhost:3001/api/sts/*`
- Backend получает JWT токен и проксирует на STS API

### Production режим

- Nginx проксирует `/api/sts/*` на Backend Server
- Backend работает с JWT токеном
- Ответы возвращаются через Nginx на Frontend

---

## 🧪 Тестирование подключения

### Проверка доступности API

```bash
# Прямой запрос (вернет 403 без токена)
curl https://pos.autooplata.ru/tms/v1/info

# Через локальный backend
curl http://localhost:3001/api/sts/v1/info?system=15&station=4
```

### Проверка логов backend

```bash
cd server
node index.js

# Должны появиться логи:
# [STS Proxy] Client initialized with URL: https://pos.autooplata.ru/tms
# [STS Proxy] Refreshing JWT token...
# [STS Proxy] JWT token refreshed successfully
```

### Проверка в браузере

1. Открыть DevTools → Network
2. Перейти на страницу с данными (Оборудование, Резервуары)
3. Должны быть запросы `/api/sts/v1/tanks`, `/api/sts/v2/info` со статусом 200

---

---

## 🔑 Двухуровневая аутентификация

В TradeFrame используются **два уровня** авторизации для STS запросов:

### Уровень 1: Frontend → Backend (requireAuth)

Frontend отправляет **app-токен** (`tradeframe_token_v2`) в заголовке `Authorization: Bearer` при каждом запросе к backend proxy `/api/sts/*`.

- Middleware `requireAuth` (`server/middleware/auth.js`) проверяет JWT и ищет пользователя в PostgreSQL
- Токен хранится в `localStorage` под ключом `tradeframe_token_v2`
- Без этого токена backend вернёт **401 Unauthorized**

**Два frontend STS клиента** (оба обязаны отправлять Bearer token):

| Клиент | Файл | Используется для |
|--------|------|-----------------|
| `stsProxyClient` | `src/services/stsProxyClient.ts` | Смены, резервуары, сверка |
| `STSApiService` | `src/services/sts/STSApiService.ts` | Операции, оборудование, цены |

### Уровень 2: Backend → STS API (JWT)

Backend проксирует запрос к внешнему STS API с **STS JWT-токеном** (получается через `/v1/login`).

- Учётные данные STS API хранятся **только в `server/.env`** — никогда не попадают во frontend
- STS JWT токен действителен 20 минут, обновляется автоматически каждые 18 минут

```
Frontend → [Bearer tradeframe_token_v2] → Backend requireAuth
                                           ↓
Backend  → [Bearer STS_JWT] → External STS API (pos.autooplata.ru)
```

---

## 📝 История изменений

### 2026-03-12 - v2.0
- ✅ Добавлен `requireAuth` middleware на все STS-роуты (`server/routes/sts.js`)
- ✅ `STSApiService.ts` — добавлена отправка Bearer token из localStorage
- ✅ `stsProxyClient.ts` — добавлена отправка Bearer token из localStorage
- ✅ Документирована двухуровневая схема аутентификации

### 2025-10-18 - v1.0
- ✅ Переход с Basic Auth на JWT авторизацию
- ✅ Автоматическое обновление токена каждые 18 минут
- ✅ Синхронизация с production конфигурацией
- ✅ Добавлены все endpoints из Swagger документации

### Предыдущие версии
- ❌ Basic Auth (не работал, возвращал 403)
- ❌ Статические учетные данные в заголовках

---

## 🔗 Связанные документы

- `API_INTEGRATION.md` - Полная документация по интеграции с внешним API
- `server/routes/sts.js` - Реализация проксирования + requireAuth
- `server/middleware/auth.js` - JWT-валидация app-токена
- `src/services/stsProxyClient.ts` - Frontend STS клиент (смены, резервуары, сверка)
- `src/services/sts/STSApiService.ts` - Frontend STS клиент (операции, оборудование, цены)
- `vite.config.ts` - Конфигурация proxy для dev режима
- Swagger: https://pos.autooplata.ru/tms/docs

---

## 💡 Важные замечания

1. **STS JWT токен НЕ хранится в frontend** — только на backend
2. **App-токен (tradeframe_token_v2) хранится в localStorage** — отправляется с каждым запросом к backend
3. **Два отдельных STS-клиента на frontend** — оба обязаны отправлять Bearer token
4. **Учетные данные STS API НИКОГДА не попадают в frontend bundle** — только в server/.env
5. **Один STS JWT токен на весь backend** — переиспользуется для всех запросов
6. **Время жизни STS токена 20 минут** — обновление за 2 минуты до истечения
