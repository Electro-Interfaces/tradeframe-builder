# ТЗ: корректировка остатков нефтепродуктов по результатам инвентаризации

Дата: 2026-04-30
Статус: реализовано (MVP)
Парадигма: документ-уведомление, без автоприменения
Связанные документы: `INVENTORY_ADJUSTMENT_PROPOSAL.md` (бизнес), `FUEL_ACCOUNTING_SYSTEM.md`, `API_SHIFT_REPORTS.md`

---

## 1. Контекст

В TradeFrame ведётся учёт остатков топлива в резервуарах АЗС. Источник данных — STS API (`/v1/tanks`, `/v1/report/shift_report`). Движение топлива формируется по сменным отчётам.

Периодически на АЗС выезжает **комиссия для физической инвентаризации** — производятся реальные замеры остатков. По итогам комиссия фиксирует **расхождение** между книжным и фактическим остатком и оформляет приказ генерального директора.

На обычных АЗС с оператором приказ исполняется на станции через интерфейс терминала. На **автоматизированных АЗС (АКАЗС)** оператора нет — приказ некому ввести. Раньше специалист с прямым доступом к poscontrol правил остатки вручную, но процесс не был оформлен в системе.

Эта функциональность закрывает «бумажный» процесс: бухгалтер заполняет в TradeFrame документ корректировки → утверждает → система генерирует PDF приказа и отправляет его по email на список рассылки → специалист вручную вносит правки в poscontrol.

## 2. Архитектурное решение

**TradeFrame не применяет корректировку автоматически.** Документ хранится в PostgreSQL TradeFrame, PDF отправляется на email. Дальше работа исполнителя в poscontrol — вне зоны TradeFrame.

Это упрощает MVP: нет cron, нет интеграции со сменами, нет фантомного слоя над shift-отчётами. PDF-приказ — единственный артефакт для исполнителя.

Жизненный цикл документа: `draft → sent | cancelled`. После `sent` документ не редактируется и не отменяется. Чтобы откатить — оформляют новый документ с противоположным знаком (сторно).

Поле `effective_at` в форме — **информация для исполнителя**, печатается в PDF. Правило «через смену + в пределах отчётного месяца» из бизнес-документа выполняет вручную исполнитель, читая PDF.

## 3. Модель данных

Миграции:
- `153_inventory_adjustments.sql` — две таблицы документа.
- `154_inventory_email_recipients.sql` — список email-получателей по сети.
- `155_inventory_permissions.sql` — seed-разрешения inventory.read/write/send.

### `inventory_adjustments`

| Поле | Тип | Обязательно | Описание |
| --- | --- | --- | --- |
| `id` | UUID | да | PK |
| `network_id` | UUID | да | FK `networks(id)` |
| `trading_point_id` | TEXT | да | FK `trading_points(id)` |
| `order_number` | TEXT | да | Номер приказа |
| `order_date` | DATE | да | Дата подписания приказа |
| `inventory_date` | DATE | да | Дата фактической инвентаризации |
| `effective_at` | TIMESTAMPTZ | да | Время начала действия (справочное, для PDF) |
| `comment` | TEXT | нет | Свободный текст |
| `status` | TEXT | да | `draft \| sent \| cancelled` |
| `created_by_user_id` / `created_at` / `updated_at` | UUID/TIMESTAMPTZ | да | Аудит |
| `sent_by_user_id` / `sent_at` | UUID / TIMESTAMPTZ | нет | Заполняется при переходе в `sent` |
| `cancelled_by_user_id` / `cancelled_at` / `cancel_reason` | — | нет | Заполняется при отмене |
| `pdf_path` | TEXT | нет | Путь к сохранённому PDF в FS сервера |
| `email_to` | TEXT[] | нет | Снимок списка адресов на момент отправки |
| `email_status` | TEXT | нет | `pending \| sent \| failed` |
| `email_error` | TEXT | нет | Текст ошибки последней отправки |

### `inventory_adjustment_items`

| Поле | Тип | Обязательно | Описание |
| --- | --- | --- | --- |
| `id` | UUID | да | PK |
| `adjustment_id` | UUID | да | FK на документ, ON DELETE CASCADE |
| `tank_number` | INT | да | Номер резервуара (из STS `/v1/tanks`) |
| `fuel_name` | TEXT | да | Тип топлива (снимок) |
| `book_volume_l` | NUMERIC(12,2) | да | Книжный остаток-снимок (литры) |
| `book_mass_kg` | NUMERIC(12,2) | нет | Книжная масса-снимок |
| `fact_volume_l` | NUMERIC(12,2) | нет | Фактический замер. NULL = строка не попала в приказ |
| `fact_mass_kg` | NUMERIC(12,2) | нет | Фактическая масса по приказу |
| `delta_volume_l` | NUMERIC(12,2) | вычисляется | `fact_volume_l - book_volume_l` (GENERATED STORED) |
| `delta_mass_kg` | NUMERIC(12,2) | вычисляется | `fact_mass_kg - book_mass_kg` (GENERATED STORED) |

Уникальный ключ: `(adjustment_id, tank_number)` — один резервуар появляется в документе один раз.

### `inventory_adjustment_email_recipients`

| Поле | Тип | Обязательно | Описание |
| --- | --- | --- | --- |
| `network_id` | UUID | PK | Сеть, для которой настроена рассылка |
| `recipients` | TEXT[] | да, не пустой | Основные адресаты (TO) |
| `cc` | TEXT[] | да | Копия (по умолчанию пустой массив) |
| `from_address` | TEXT | нет | Адрес отправителя (если NULL, берётся `SMTP_FROM` из `server/.env`) |

На старте список заводится через `psql`. UI для редактирования — следующая итерация.

## 4. Backend

| Компонент | Путь |
| --- | --- |
| Repository | `server/repositories/inventoryAdjustmentsRepository.js` |
| Service | `server/services/inventoryAdjustments/inventoryAdjustmentsService.js` |
| PDF-renderer | `server/services/inventoryAdjustments/pdfRenderer.js` (pdfmake + Roboto) |
| Mailer | `server/services/inventoryAdjustments/mailer.js` (nodemailer + SMTP_*) |
| Routes | `server/routes/inventoryAdjustments.js` |
| Permission middleware | `server/middleware/inventoryPermission.js` |

### REST endpoints

| Метод | Путь | Permission | Назначение |
| --- | --- | --- | --- |
| GET | `/api/inventory-adjustments` | `read` | Список с фильтрами `networkId`, `tradingPointId`, `status`, `limit`, `offset` |
| GET | `/api/inventory-adjustments/:id` | `read` | Детали + items |
| GET | `/api/inventory-adjustments/:id/pdf` | `read` | Скачать PDF (генерируется на лету, если файла нет) |
| POST | `/api/inventory-adjustments` | `write` | Создать draft |
| PUT | `/api/inventory-adjustments/:id` | `write` | Обновить draft (шапка + items) |
| POST | `/api/inventory-adjustments/:id/send` | `send` | Сгенерировать PDF + отправить email. Также для повторной отправки после `email_status='failed'` |
| POST | `/api/inventory-adjustments/:id/cancel` | `write` | Отменить draft |
| DELETE | `/api/inventory-adjustments/:id` | `write` | Удалить draft |

### PDF-приказ

Шаблон: `server/services/inventoryAdjustments/pdfRenderer.js`. Содержит шапку («Приказ № … от …»), реквизиты (сеть, точка с адресом, даты, время начала действия, комментарий), таблицу резервуаров с заполненной корректировкой и подвал с местом для подписи. Шрифт — Roboto (включая кириллицу), берётся из `pdfmake/build/vfs_fonts`.

PDF сохраняется в FS на сервере: `${INVENTORY_ADJUSTMENTS_UPLOADS_DIR || server/uploads/inventory-adjustments}/<adjustment_id>.pdf`. Путь пишется в `inventory_adjustments.pdf_path`.

### Email-отправка

Используется `nodemailer` с конфигом из `server/.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`).

Шаги в `sendAdjustment`:
1. Проверка статуса (`draft`).
2. Проверка что хотя бы одна строка с `fact_volume_l != null`.
3. Получение `recipients` для `network_id`. Если пусто — 400.
4. Генерация PDF.
5. Отправка email (TO + CC) с PDF-вложением.
6. Если PDF или email упали — `email_status='failed'`, `email_error=...`, статус остаётся `draft`. Пользователь увидит ошибку и сможет повторить через ту же кнопку.
7. Если успех — `status='sent'`, `email_status='sent'`, `pdf_path` заполнен, `email_to` зафиксирован snapshot'ом.

## 5. Frontend

| Компонент | Путь |
| --- | --- |
| Типы | `src/types/inventoryAdjustment.ts` |
| API-клиент | `src/services/inventoryAdjustmentsService.ts` |
| Hook списка | `src/hooks/useInventoryAdjustments.ts` |
| Страница списка | `src/pages/InventoryAdjustments/index.tsx` |
| Editor (форма + детали) | `src/pages/InventoryAdjustments/Editor.tsx` |
| Таблица desktop | `src/pages/InventoryAdjustments/components/InventoryAdjustmentsTable.tsx` |
| Карточки mobile | `src/pages/InventoryAdjustments/components/InventoryAdjustmentsCards.tsx` |
| Форматтеры | `src/pages/InventoryAdjustments/utils/formatters.ts` |
| Тесты | `src/pages/InventoryAdjustments/utils/__tests__/formatters.test.ts` |

### Маршруты

- `/point/inventory-adjustments` — список документов выбранной торговой точки.
- `/point/inventory-adjustments?create=1` — список с автопереходом в форму создания.
- `/point/inventory-adjustments/new` — форма создания.
- `/point/inventory-adjustments/:id` — просмотр / редактирование draft.

Кнопка «Инвентаризация» в шапке страницы Оборудование (`src/pages/Equipment.tsx`) ведёт на `/point/inventory-adjustments?create=1`.

### Форма

Одна страница, две секции: реквизиты приказа + таблица резервуаров. Резервуары при создании подтягиваются через `tanksService.getTanks(networkId, tradingPointId)`. `book_volume_l` и `book_mass_kg` фиксируются на момент создания и не меняются при последующем редактировании.

Расчёт дельт live: при вводе `fact_volume_l` пересчитывается «Δ, л» (с подсветкой знака). Аналогично для массы.

Для документа в статусе `draft` доступно: «Сохранить черновик», «Отменить документ», «Удалить черновик», «Отправить» (или «Повторить отправку» если `email_status='failed'`). Для `sent` и `cancelled` — только просмотр и «Скачать PDF».

## 6. RBAC

Permissions (объектный формат `{section, resource, actions}`):

- `inventory.read` — просмотр списка и деталей, скачивание PDF.
- `inventory.write` — создание, редактирование draft, отмена draft, удаление draft.
- `inventory.send` — отправка/повторная отправка (= утверждение).

Sane defaults в `155_inventory_permissions.sql`:
- `super_admin`, `system_admin`, `network_admin` → `read + write + send`.
- `accountant`, `bto_manager`, `bto_station_manager`, `enticom_manager` → `read + write` (если роли существуют).

Конкретный маппинг утверждается заказчиком (см. `INVENTORY_ADJUSTMENT_PROPOSAL.md` §7). После утверждения администратор доназначает `inventory.send` нужным пользователям через UI ролей.

Middleware: `server/middleware/inventoryPermission.js` — `requireInventoryPermission(action)`. `super_admin`/`system_admin` имеют полный доступ без проверки permissions.

## 7. Аудит

Каждое действие пишется в `audit_log` через `auditPgSource.createAuditLog`:

- `object_type = 'inventory_adjustment'`
- `object_id = adjustment.id`
- `action_type` ∈ `create | update | cancel | delete | send | send_failed`
- `action` — человекочитаемая строка («Создан черновик корректировки № 145-к», «Документ корректировки № 145-к отправлен на 3 адр.»)
- `details` — для cancel: `reason`; для send: `recipients`, `cc`; для send_failed: `error`, `stage`.
- `metadata` — `network_id`, `trading_point_id`, `status_from/to` для переходов.

Аудит-вызов не блокирует основное действие: при ошибке записи журналим в `console.error` и идём дальше.

## 8. Что НЕ входит в MVP

- Сторно как отдельный action (создание зеркального документа). На MVP — оформляется ручным созданием нового документа с противоположными значениями.
- Excel-экспорт. Только PDF.
- Web-предпросмотр PDF. Только скачивание.
- Push-интеграция в poscontrol/STS. Корректировка не доходит до poscontrol автоматически — её вносит специалист вручную.
- Telegram-уведомления.
- Автоматический трекинг исполнения. После `sent` статус не меняется.
- UI для управления списком email-получателей. На старте — `psql`.
- Истёкший статус (`expired`), правило «через смену + в пределах месяца». В коде не реализуется, остаётся текстом в PDF.
- Multi-network приказ.
- Backfill исторических корректировок.
- Scope-проверка по `network_id` / `trading_point_id` в endpoints (защита от cross-network утечек). На MVP — RBAC по permissions, scope добавляется в следующую итерацию.
- Backend unit-тесты сервиса и E2E. На MVP — только frontend unit на форматтерах + ручное smoke-тестирование (см. §10).

## 9. ENV

В `server/.env`:

```
# Email-рассылка приказов
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=tradeframe@...

# Опционально: каталог для PDF (по умолчанию server/uploads/inventory-adjustments)
INVENTORY_ADJUSTMENTS_UPLOADS_DIR=/var/www/.../uploads/inventory-adjustments
```

Каталог должен быть доступен на запись пользователю, под которым запущен backend.

## 10. Verification (как проверить вручную)

1. Применить миграции: `cd server && npm run db:migrate` — миграции 153/154/155 в `schema_migrations`.
2. Заполнить адресатов рассылки руками для тестовой сети:
   ```sql
   INSERT INTO inventory_adjustment_email_recipients (network_id, recipients)
   VALUES ('<network_id>', ARRAY['ops@example.com']);
   ```
3. Перезапустить backend: `cd server && node index.js`.
4. UI smoke под пользователем с ролью `super_admin` (или с `inventory.write`):
   - Открыть TradeFrame → выбрать АКАЗС → Оборудование → нажать «Инвентаризация».
   - Должен открыться `/point/inventory-adjustments?create=1` → авто-редирект на `/point/inventory-adjustments/new`, форма с резервуарами АЗС.
   - Заполнить шапку, ввести fact в одном резервуаре → «Сохранить черновик» → редирект на детали, статус `draft`.
5. Под пользователем с `inventory.send`:
   - Открыть документ → «Отправить» → подтверждение → status `sent`, появилась кнопка «Скачать PDF».
   - Проверить почту получателей — пришло письмо с PDF-вложением.
6. RBAC smoke: пользователь без `inventory.send` — кнопка «Отправить» возвращает 403.
7. Audit smoke: в `audit_log` есть записи `action_type` ∈ `create`, `update`, `send` с `object_type='inventory_adjustment'` и правильным `object_id`.
8. Failure smoke: указать заведомо битый адрес в `recipients` → попытка send → `email_status='failed'`, `email_error` заполнено, статус остаётся `draft`. Кнопка превращается в «Повторить отправку».

## 11. Связанные файлы (итог)

```
server/
├── db/migrations/
│   ├── 153_inventory_adjustments.sql
│   ├── 154_inventory_email_recipients.sql
│   └── 155_inventory_permissions.sql
├── repositories/
│   └── inventoryAdjustmentsRepository.js
├── services/inventoryAdjustments/
│   ├── inventoryAdjustmentsService.js
│   ├── pdfRenderer.js
│   └── mailer.js
├── routes/
│   └── inventoryAdjustments.js
├── middleware/
│   └── inventoryPermission.js
└── index.js                          (регистрация роута)

src/
├── types/
│   └── inventoryAdjustment.ts
├── services/
│   └── inventoryAdjustmentsService.ts
├── hooks/
│   └── useInventoryAdjustments.ts
├── pages/
│   ├── Equipment.tsx                 (handleInventoryAdjustment → navigate)
│   └── InventoryAdjustments/
│       ├── index.tsx                 (список)
│       ├── Editor.tsx                (форма / детали)
│       ├── components/
│       │   ├── InventoryAdjustmentsTable.tsx
│       │   └── InventoryAdjustmentsCards.tsx
│       └── utils/
│           ├── formatters.ts
│           └── __tests__/formatters.test.ts
└── App.tsx                           (маршруты)

docs/
├── INVENTORY_ADJUSTMENT_PROPOSAL.md  (бизнес-документ для заказчика)
└── INVENTORY_ADJUSTMENT_SPEC.md      (этот файл)
```
