# PostgreSQL слой TradeFrame

Этот каталог подготавливает переход с Supabase на PostgreSQL.

Текущее правило:

- новый `pg`-код добавляем сюда
- текущий production runtime не переключаем до прохождения миграционных этапов
- схему ведем через SQL-файлы в `server/db/migrations`
- все новые backend модули должны работать по схеме:
  - `routes -> services/repositories -> db/pool`

Базовые переменные окружения:

- `DATABASE_URL`
- `PG_MAX_POOL_SIZE`
- `PG_IDLE_TIMEOUT_MS`
- `PG_CONNECT_TIMEOUT_MS`

Первый обязательный smoke test после любого изменения:

1. backend стартует без ошибок
2. `/health` отвечает
3. `postgres.configured` и `postgres.connected` отражают реальное состояние
