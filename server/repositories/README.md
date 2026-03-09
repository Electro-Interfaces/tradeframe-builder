# Репозитории PostgreSQL

Сюда переносим доступ к данным по мере ухода от Supabase.

Правило слоя:

- `routes` не пишут SQL напрямую
- `repositories` работают через `server/db/pool.js`
- `services` собирают бизнес-логику поверх репозиториев

Первые целевые репозитории:

- `usersRepository`
- `rolesRepository`
- `userRolesRepository`
- `networksRepository`
- `tradingPointsRepository`
