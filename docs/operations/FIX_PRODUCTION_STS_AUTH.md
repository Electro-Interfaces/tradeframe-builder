# Исправления аутентификации STS API на production

## Инцидент 2026-03-12: Сменные отчёты + операции не загружаются

### Симптомы
1. **Сменные отчёты** — «Смены не найдены (0 из 0)», запросы `/v1/shifts` не отправляются
2. **Операции** — пустая страница (0 операций), `STSApiService` получает 401

### Причина 1: Сломанный импорт в useTradingPoint.ts

После миграции PostgreSQL (коммит `6dfd049`, 9 марта) из `tradingPointsService.ts` был удалён `export default`.
Хук `useTradingPoint.ts` использовал `.default` при динамическом импорте:

```typescript
// СЛОМАНО (молчаливый fail — tradingPoint всегда null):
const tradingPointsService = (await import('@/services/tradingPointsService')).default;

// ИСПРАВЛЕНО:
const { tradingPointsService } = await import('@/services/tradingPointsService');
```

Ошибка была **бесшумной**: try/catch ловил undefined, tradingPoint оставался null → useShiftReports делал early return.

### Причина 2: STSApiService не отправлял Bearer token

После добавления `requireAuth` middleware на `server/routes/sts.js`, все запросы через `STSApiService` стали получать **401 Unauthorized**.

`stsProxyClient.ts` уже был исправлен ранее, но `STSApiService.ts` (второй STS-клиент) — нет.

```typescript
// ДОБАВЛЕНО в STSApiService.apiRequest():
const token = localStorage.getItem('auth_token');
if (token) {
  authHeaders['Authorization'] = `Bearer ${token}`;
}
```

### Причина 3: Nginx timeout на test (30s → 120s)

Test-окружение (`testtf.dataworker.ru`) имело `proxy_read_timeout 30s`, а STS API может отвечать до 95 секунд.

```nginx
# /etc/nginx/sites-enabled/testtf.dataworker.ru
proxy_read_timeout 120s;
```

### Затронутые файлы

| Файл | Изменение |
|------|-----------|
| `src/hooks/useTradingPoint.ts` | `.default` → named import |
| `src/services/sts/STSApiService.ts` | Добавлен Bearer token |
| `src/services/stsProxyClient.ts` | Bearer token (исправлен ранее) |
| Nginx test config | timeout 30s → 120s |

### Уроки

1. **Два STS-клиента** — при изменении auth нужно обновлять оба (`stsProxyClient` + `STSApiService`)
2. **`.default` импорт** — при миграции проверять все динамические импорты на наличие `export default`
3. **Бесшумные ошибки** — catch-блоки скрывают проблемы; если данные не грузятся, проверить промежуточные хуки

---

## Инцидент 2025-10-18: Missing .env на production

### Симптом
```
HTTP 500: Failed to authenticate with STS API
```

### Причина
Файл `server/.env` с учетными данными STS API не установлен на production.

### Решение
Создать `server/.env` на сервере с `STS_API_URL`, `STS_API_USERNAME`, `STS_API_PASSWORD` и перезапустить PM2.
