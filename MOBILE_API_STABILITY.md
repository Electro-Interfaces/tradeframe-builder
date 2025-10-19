# План улучшения устойчивости работы с API и мобильными устройствами

**Дата:** 2025-10-13
**Версия:** 1.5.29
**Статус:** ✅ Развернута на production

---

## 📊 Текущее состояние

### ✅ Что уже реализовано

1. **Backend Proxy Pattern** (src/services/stsApi.ts)
   - Все запросы к STS API идут через `/api/sts/*`
   - Токены управляются на сервере (безопасность)
   - Автоматическое обновление токенов каждые 20 минут
   - Валидация параметров `system` и `station`

2. **Mobile Cache Management** (index.html:32-91)
   - Автоматическая очистка кэша Service Worker
   - Версионный контроль (tf_cache_version)
   - Принудительная очистка каждые 60 секунд
   - Перезагрузка при смене версии

3. **Динамический импорт модулей** (App.tsx:66-99)
   - Глобальный обработчик ошибок chunk loading
   - Защита от бесконечных перезагрузок (10 сек throttle)
   - Автоматическая перезагрузка при ошибках импорта

4. **Увеличенные timeout для мобильных** (index.html:73-90)
   - Fetch timeout: 30 секунд
   - Глобальный перехват всех fetch запросов
   - Автоматический AbortController

5. **HTTP клиент с retry логикой** (httpClients.ts)
   - Автообновление токенов при 401
   - Idempotency-Key для мутирующих операций
   - Trace-Id для отладки
   - RFC 7807 (Problem Details) обработка ошибок

---

## 🚨 Выявленные проблемы

### 1. **Периодические ошибки "Invalid base URL"**
**Локация:** `src/services/stsApi.ts:947-988`
**Статус:** ✅ ИСПРАВЛЕНО в v1.5.29

**Проблема:**
```typescript
// СТАРЫЙ КОД (вызывал ошибки)
const url = new URL('/v1/transactions', this.config?.url || '');
```

**Решение:**
```typescript
// НОВЫЙ КОД (использует Backend Proxy)
const data = await this.apiRequest<any>(endpoint, {}, contextParams);
```

---

### 2. **Агрессивное кэширование на мобильных**
**Локация:** index.html, браузерный кэш
**Статус:** ⚠️ ЧАСТИЧНО РЕШЕНО

**Проблема:**
- Мобильные браузеры агрессивно кэшируют index.html
- Даже с HTTP заголовками `no-cache`
- Пользователи видят старую версию после обновления

**Текущее решение:**
- Очистка Service Worker кэша каждые 60 сек
- Версионная проверка при каждой загрузке
- Meta-теги `no-cache`

**Недостатки:**
- Не гарантирует 100% обновление
- Может сработать не сразу

---

### 3. **window.location.origin возвращает 'null' на мобильных**
**Локация:** `src/services/stsApi.ts:402-417`, `src/services/stsProxyClient.ts:23-40`
**Статус:** ✅ ИСПРАВЛЕНО

**Решение:**
```typescript
const origin = window.location.origin;
if (!origin || origin === 'null' || origin === 'undefined') {
  console.error('❌ window.location.origin некорректен:', origin);
  baseUrl = 'https://prod.dataworker.ru'; // Fallback
} else {
  baseUrl = origin;
}
```

---

### 4. **Нет retry логики для сетевых ошибок**
**Локация:** `src/services/stsApi.ts:apiRequest`
**Статус:** ❌ НЕ РЕАЛИЗОВАНО

**Проблема:**
- Временные сетевые сбои приводят к ошибкам
- Нет автоматических повторных попыток
- Пользователю нужно вручную перезагружать

**Рекомендация:**
Добавить exponential backoff retry:
```typescript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

---

### 5. **Отсутствие offline режима**
**Локация:** Вся система
**Статус:** ❌ НЕ РЕАЛИЗОВАНО

**Проблема:**
- При потере сети приложение полностью неработоспособно
- Нет кэширования критических данных
- Нет индикатора offline статуса

**Рекомендация:**
1. Service Worker с offline fallback
2. IndexedDB кэширование последних данных
3. UI индикатор сетевого статуса
4. Очередь запросов для sync при восстановлении связи

---

### 6. **Недостаточная диагностика ошибок**
**Локация:** Все сервисы
**Статус:** ⚠️ ЧАСТИЧНО РЕШЕНО

**Проблема:**
- Нет централизованного логирования ошибок
- Нет отправки ошибок на сервер
- Сложно отладить проблемы пользователей

**Рекомендация:**
```typescript
// Централизованный error reporter
class ErrorReporter {
  static report(error: Error, context?: any) {
    // 1. Логирование в консоль
    console.error('🚨 Error:', error, context);

    // 2. Отправка на сервер (Sentry, LogRocket, etc)
    if (import.meta.env.PROD) {
      fetch('/api/log-error', {
        method: 'POST',
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          context,
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(() => {}); // Silent fail
    }

    // 3. Сохранение в localStorage для отладки
    const errorLog = JSON.parse(localStorage.getItem('error_log') || '[]');
    errorLog.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      context
    });
    localStorage.setItem('error_log', JSON.stringify(errorLog.slice(-50)));
  }
}
```

---

### 7. **Нет проверки качества сети**
**Локация:** Вся система
**Статус:** ❌ НЕ РЕАЛИЗОВАНО

**Проблема:**
- Не учитывается скорость соединения
- Нет адаптации timeout'ов под качество сети
- Нет предупреждений о медленной сети

**Рекомендация:**
```typescript
// Network quality detection
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

if (connection) {
  const effectiveType = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'

  // Адаптация timeout'ов
  const timeouts = {
    '4g': 10000,
    '3g': 30000,
    '2g': 60000,
    'slow-2g': 120000
  };

  const timeout = timeouts[effectiveType] || 30000;
}
```

---

## ✅ Рекомендации по приоритетам

### 🔥 КРИТИЧЕСКИЕ (сделать немедленно)

1. **✅ Исправить getTransactions (СДЕЛАНО в v1.5.29)**
   - Используем Backend Proxy pattern
   - Устраняет "Invalid base URL" ошибки

2. **⚠️ Добавить retry логику с exponential backoff**
   - Файл: `src/services/stsApi.ts:apiRequest`
   - Время: 2-3 часа
   - Приоритет: ВЫСОКИЙ

3. **⚠️ Реализовать централизованный error reporter**
   - Новый файл: `src/utils/errorReporter.ts`
   - Интеграция во все сервисы
   - Время: 3-4 часа
   - Приоритет: ВЫСОКИЙ

---

### 📊 ВАЖНЫЕ (сделать в ближайшие дни)

4. **Network quality adaptation**
   - Файл: `src/utils/networkQuality.ts`
   - Адаптивные timeout'ы
   - Время: 2-3 часа

5. **Offline mode (базовый)**
   - Service Worker с fallback
   - Индикатор offline статуса
   - Время: 4-6 часов

6. **Request deduplication**
   - Предотвращение дублирующих запросов
   - Кэширование в React Query
   - Время: 2-3 часа

---

### 💡 ЖЕЛАТЕЛЬНЫЕ (можно отложить)

7. **IndexedDB кэширование**
   - Хранение последних 100 транзакций
   - Работа в offline
   - Время: 6-8 часов

8. **Request queue для offline sync**
   - Очередь запросов при offline
   - Автосинхронизация при online
   - Время: 8-10 часов

9. **Performance monitoring**
   - Метрики времени загрузки
   - Метрики API запросов
   - Время: 4-6 часов

---

## 🛠️ Код-примеры решений

### 1. Retry логика с exponential backoff

```typescript
// src/utils/fetchWithRetry.ts
interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => {
      // Retry на сетевые ошибки и 5xx
      return (
        error.name === 'TypeError' || // Network error
        error.name === 'AbortError' || // Timeout
        (error.status && error.status >= 500)
      );
    }
  } = retryOptions;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Если 5xx - можем retry
      if (response.status >= 500 && attempt < maxRetries) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      // Не retry если это последняя попытка
      if (attempt === maxRetries) {
        break;
      }

      // Проверяем, нужен ли retry
      if (!shouldRetry(error)) {
        throw error;
      }

      // Exponential backoff с jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.log(`🔄 Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

### 2. Централизованный error reporter

```typescript
// src/utils/errorReporter.ts
interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  networkId?: string;
  [key: string]: any;
}

class ErrorReporter {
  private static instance: ErrorReporter;
  private errorQueue: Array<any> = [];
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    // Мониторинг online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  report(error: Error, context?: ErrorContext): void {
    const errorData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo()
    };

    // Логирование в консоль
    console.error('🚨 Error reported:', errorData);

    // Сохранение в localStorage
    this.saveToLocalStorage(errorData);

    // Отправка на сервер (если online)
    if (this.isOnline && import.meta.env.PROD) {
      this.sendToServer(errorData);
    } else {
      // Добавляем в очередь для отправки позже
      this.errorQueue.push(errorData);
    }
  }

  private saveToLocalStorage(errorData: any): void {
    try {
      const errorLog = JSON.parse(localStorage.getItem('error_log') || '[]');
      errorLog.push(errorData);
      // Храним только последние 50 ошибок
      localStorage.setItem('error_log', JSON.stringify(errorLog.slice(-50)));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
  }

  private async sendToServer(errorData: any): Promise<void> {
    try {
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (e) {
      // Silent fail - ошибка отправки ошибки не должна ломать приложение
      console.error('Failed to send error to server:', e);
      this.errorQueue.push(errorData);
    }
  }

  private async flushQueue(): Promise<void> {
    while (this.errorQueue.length > 0 && this.isOnline) {
      const errorData = this.errorQueue.shift();
      await this.sendToServer(errorData);
    }
  }

  private getConnectionInfo(): any {
    const conn = (navigator as any).connection;
    if (!conn) return null;

    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }
}

export const errorReporter = ErrorReporter.getInstance();
```

### 3. Network quality adapter

```typescript
// src/utils/networkQuality.ts
export class NetworkQualityAdapter {
  private static CONNECTION = (navigator as any).connection;

  static getTimeout(): number {
    if (!this.CONNECTION) {
      return 30000; // Default 30s
    }

    const effectiveType = this.CONNECTION.effectiveType;

    const timeouts: Record<string, number> = {
      '4g': 10000,    // 10s
      '3g': 30000,    // 30s
      '2g': 60000,    // 60s
      'slow-2g': 120000  // 120s
    };

    return timeouts[effectiveType] || 30000;
  }

  static shouldShowSlowNetworkWarning(): boolean {
    if (!this.CONNECTION) return false;

    const effectiveType = this.CONNECTION.effectiveType;
    return effectiveType === '2g' || effectiveType === 'slow-2g';
  }

  static isOnline(): boolean {
    return navigator.onLine;
  }

  static getConnectionType(): string {
    return this.CONNECTION?.effectiveType || 'unknown';
  }
}
```

---

## 📈 Метрики для мониторинга

### Критические метрики:
1. **API Success Rate** - процент успешных запросов (> 95%)
2. **Average Response Time** - среднее время ответа (< 2s)
3. **Error Rate by Type** - количество ошибок по типам
4. **Mobile vs Desktop Error Rate** - сравнение ошибок
5. **Cache Hit Rate** - эффективность кэширования (> 60%)

### Дополнительные метрики:
6. **Time to Interactive** - время до интерактивности (< 3s)
7. **Retry Success Rate** - процент успешных retry
8. **Offline Duration** - время работы offline
9. **Network Quality Distribution** - распределение по типам сети
10. **Bundle Size** - размер JS bundle (< 1MB gzipped)

---

## 🎯 Итоговые выводы

### Сильные стороны:
✅ Backend Proxy pattern обеспечивает безопасность
✅ Агрессивное кэширование на мобильных предотвращает проблемы
✅ Глобальная обработка ошибок динамического импорта
✅ Адаптация timeout'ов для мобильных устройств

### Слабые места:
❌ Нет retry логики для сетевых ошибок
❌ Отсутствует offline режим
❌ Недостаточная диагностика и мониторинг
❌ Нет адаптации под качество сети

### Следующие шаги:
1. Реализовать retry логику (2-3 часа)
2. Добавить error reporter (3-4 часа)
3. Внедрить network quality adapter (2-3 часа)
4. Базовый offline mode (4-6 часов)

**Общее время на критические улучшения: 11-16 часов**

---

## 📝 Чеклист для тестирования

### Мобильные устройства:
- [ ] Тест на медленном 3G (Network throttling)
- [ ] Тест на 2G
- [ ] Тест с периодическим offline
- [ ] Тест с таймаутами
- [ ] Тест кэширования после обновления
- [ ] Тест различных браузеров (Chrome, Safari, Firefox)

### Desktop:
- [ ] Тест на быстром соединении
- [ ] Тест с VPN (задержки)
- [ ] Тест различных браузеров

### Edge cases:
- [ ] Потеря сети во время запроса
- [ ] Частые переключения online/offline
- [ ] Очень медленное соединение (slow-2g)
- [ ] Большое количество одновременных запросов
