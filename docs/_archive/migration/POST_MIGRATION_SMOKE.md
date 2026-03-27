# Пост-миграционный Smoke Test (Supabase → PostgreSQL)

## Эндпоинты диагностики

### GET /health (публичный)

Состояние backend. Не требует авторизации, не раскрывает внутренние детали PG.

```json
{
  "status": "healthy",
  "timestamp": "2026-03-09T12:00:00.000Z",
  "version": "2.1.0",
  "dataSource": "pg",
  "supabase": "removed",
  "postgres": {
    "configured": true,
    "connected": true
  }
}
```

- HTTP 200 при `status: "healthy"`, HTTP 503 при `status: "degraded"`
- `dataSource: "pg"` — backend работает на PostgreSQL напрямую
- `supabase: "removed"` — Supabase код удалён

### GET /api/smoke (требует Authorization: Bearer)

Полная проверка всех таблиц из миграций. Если таблица отсутствует — `ok: false, status: "missing"`.

```json
{
  "status": "pass",
  "dataSource": "pg",
  "summary": { "total": 13, "passed": 13, "failed": 0 },
  "checks": {
    "postgres": { "ok": true, "database": "tradecontrol" },
    "users": { "ok": true, "count": 12 },
    "roles": { "ok": true, "count": 5 },
    "networks": { "ok": true, "count": 3 },
    "tradingPoints": { "ok": true, "count": 45 },
    "notificationRules": { "ok": true, "count": 8 },
    "telegramLinkCodes": { "ok": true, "count": 2 },
    "userNotificationSettings": { "ok": true, "count": 4 },
    "broadcastMessages": { "ok": true, "count": 15 },
    "auditLog": { "ok": true, "count": 1247 },
    "tankCalibration": { "ok": true, "count": 3 },
    "documentVersions": { "ok": true, "count": 4 },
    "nomenclature": { "ok": true, "count": 22 }
  }
}
```

- HTTP 200 при `status: "pass"`, HTTP 503 при `status: "fail"`
- 401 без валидного JWT-токена

---

## Ручной Smoke Checklist

### 1. Backend запуск
```bash
cd server && node index.js
# Ожидание: сервер стартует на :3001 без ошибок
```

### 2. Health check (публичный)
```bash
curl http://localhost:3001/health | jq .
# Ожидание: status=healthy, dataSource=pg, postgres.connected=true
```

### 3. Аутентификация (логин)
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}' | jq .
# Ожидание: JWT-токен в ответе, user object с ролями
```

### 4. Smoke test (требует токен)
```bash
TOKEN="Bearer <jwt_from_step_3>"
curl http://localhost:3001/api/smoke -H "Authorization: $TOKEN" | jq .
# Ожидание: status=pass, все checks.*.ok === true
```

### 5. Пользователи
```bash
curl http://localhost:3001/api/users -H "Authorization: $TOKEN" | jq '.| length'
# Ожидание: массив пользователей, length > 0
```

### 6. Роли
```bash
curl http://localhost:3001/api/roles -H "Authorization: $TOKEN" | jq '.| length'
# Ожидание: массив ролей с permissions
```

### 7. Торговые сети
```bash
curl http://localhost:3001/api/networks -H "Authorization: $TOKEN" | jq '.| length'
# Ожидание: массив сетей (>= 1)
```

### 8. Торговые точки
```bash
curl http://localhost:3001/api/trading-points -H "Authorization: $TOKEN" | jq '.| length'
# Ожидание: массив точек (>= 1)
```

### 9. Уведомления — правила
```bash
# Правила по tenant (замените TENANT_ID)
curl http://localhost:3001/api/telegram/get-rules/TENANT_ID -H "Authorization: $TOKEN" | jq .
# Ожидание: 200 OK, { success: true, data: [...] }
```

### 10. Уведомления — настройки пользователя
```bash
# Настройки (замените USER_ID)
curl http://localhost:3001/api/telegram/get-settings/USER_ID -H "Authorization: $TOKEN" | jq .
# Ожидание: 200 OK, { success: true, data: {...} }
```

### 11. Telegram — генерация кода привязки
```bash
curl -X POST http://localhost:3001/api/telegram/generate-link-code \
  -H "Authorization: $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"userId":"USER_ID"}' | jq .
# Ожидание: 200 OK, { success: true, linkCode: "...", telegramLink: "...", expiresAt: "..." }
```

### 12. Broadcast-рассылки
```bash
curl http://localhost:3001/api/messages -H "Authorization: $TOKEN" | jq '.data | length'
# Ожидание: 200 OK, { success: true, data: [...], total, limit, offset }
```

### 13. Журнал аудита
```bash
curl "http://localhost:3001/api/audit?limit=5" -H "Authorization: $TOKEN" | jq '.data | length'
# Ожидание: массив записей аудита
```

### 14. Оборудование (STS API — прокси)
```bash
curl http://localhost:3001/api/sts/info -H "Authorization: $TOKEN" | jq .
# Ожидание: данные от STS API (статусы оборудования)
```

### 15. Резервуары (калибровка)
```bash
# Замените TANK_ID на реальный ID резервуара
curl http://localhost:3001/api/tank-calibration/TANK_ID -H "Authorization: $TOKEN" | jq .
# Ожидание: 200 OK, настройки калибровки или null
```

### 16. Правовые документы
```bash
curl http://localhost:3001/api/legal/document-types -H "Authorization: $TOKEN" | jq .
# Ожидание: массив типов документов (tos, privacy, pdn)
```

### 17. Номенклатура
```bash
curl http://localhost:3001/api/nomenclature -H "Authorization: $TOKEN" | jq .
# Ожидание: массив номенклатурных позиций
```

### 18. Frontend
```bash
npm run dev
# Открыть http://localhost:3000
# Ожидание: страница логина, успешный вход, данные загружаются
```

---

## Что проверяет /api/smoke (13 модулей)

| # | Модуль | Таблица | Что проверяется |
|---|--------|---------|-----------------|
| 1 | PostgreSQL | — | Соединение, current_database() |
| 2 | Пользователи | `users` | COUNT активных (deleted_at IS NULL) |
| 3 | Роли | `roles` | COUNT ролей |
| 4 | Сети | `networks` | COUNT сетей |
| 5 | Точки | `trading_points` | COUNT точек |
| 6 | Правила уведомлений | `notification_rules` | COUNT правил |
| 7 | Telegram-коды | `telegram_link_codes` | COUNT кодов привязки |
| 8 | Настройки уведомлений | `user_notification_settings` | COUNT настроек |
| 9 | Рассылки | `broadcast_messages` | COUNT сообщений |
| 10 | Аудит | `audit_log` | COUNT записей |
| 11 | Калибровка | `tank_calibration_settings` | COUNT настроек |
| 12 | Документы | `document_versions` | COUNT версий |
| 13 | Номенклатура | `nomenclature` | COUNT позиций |

---

## Критерии успеха

- `/health` → `status: "healthy"` (HTTP 200), `dataSource: "pg"`, `supabase: "removed"`
- `/api/smoke` → `status: "pass"` (HTTP 200), все 13 checks `ok: true`
- Логин через UI работает, JWT сохраняется в `localStorage('auth_token')`
- Все страницы загружают данные без ошибок 401/500
- Нет обращений к `*.supabase.co` в Network tab браузера
