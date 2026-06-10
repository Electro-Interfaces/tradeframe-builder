# ТЗ для агента: чат в TradeFrame на базе Matrix

> Версия 1.1 — 10.06.2026: добавлена Фаза 6 «Звонки и видео» (§6a), обновлена Фаза 5 (RC-сервер выведен из эксплуатации 10.06, откат его настроек не нужен).
> Версия 1.0 — 09.06.2026. Заменяет устаревшее `chat-rc-iframe-AGENT-TASK.md` (Rocket.Chat оказался платным: guest/custom-роли — только Enterprise). Перешли на **Matrix/Synapse** (бесплатно, self-hosted, изоляция клиентов доказана).
>
> Этот документ — исполнимое задание. Делай по фазам, после каждой — проверяй критерии готовности. Все пути — абсолютные. Секреты НЕ коммить.

---

## 0. Что строим (человеческими словами)

Клиент (например компания ГИГ) работает в TradeFrame — мониторит свою сеть АЗС. Ему нужен **канал связи с поддержкой ElsyPlus прямо внутри TradeFrame**, без перехода в сторонний мессенджер. Два режима:

1. **Личный чат с поддержкой** — приватный канал «этот сотрудник клиента ↔ вся наша команда поддержки». Изолирован: клиент видит только свою переписку.
2. **Тематические каналы компании** (фаза 3) — Общий / Учет / АЗС / Процессинг, общие для сотрудников компании-клиента и нашей поддержки.

Наша сторона (команда ElsyPlus) читает и отвечает из **Element** (element.dataworker.ru) или мобильного **Element X** — там эти комнаты уже видны. То есть TradeFrame — это **клиентский Matrix-клиент с родным UI**, а не отдельная система.

**Почему Matrix, а не строить свой чат:** сервер, изоляция, мобильные приложения, push, хранение, история — уже готовы и работают. TradeFrame нужно только показать клиенту его комнаты и дать писать.

---

## 1. Архитектурное решение

**Подход: нативный UI на `matrix-js-sdk` + переиспользование существующего `ChatPage.tsx`.**

НЕ iframe Element — потому что:
- у TradeFrame уже есть готовый Telegram-style `ChatPage.tsx` + типы + helpers — бесшовный родной UX;
- iframe тянет чужой интерфейс Element, тяжёлый, с отдельной авторизацией;
- нужен полный контроль над брендингом и поведением.

**Схема:**
```
TradeFrame Frontend (React)
  └─ matrix-js-sdk (клиент, БЕЗ E2EE — клиентские комнаты не шифруются)
       │  access_token берётся с backend (не логинимся паролем на фронте)
       ▼
TradeFrame Backend (Express)
  └─ /api/chat/matrix/* — выдаёт per-user Matrix access_token,
       провиженит Matrix-аккаунт и комнаты через Synapse Admin API
       │  (хранит admin-token в server/.env, маппинг в Postgres)
       ▼
Synapse (matrix.dataworker.ru) — уже развёрнут, изоляция работает
```

**Почему токен выдаёт backend, а не фронт логинится:** клиент уже залогинен в TradeFrame (JWT). Второй логин в Matrix недопустим. Backend по TradeFrame-сессии находит/создаёт Matrix-аккаунт клиента и выдаёт фронту готовый Matrix-токен (Synapse admin login, минуя пароль и rate-limit).

### 1a. Замечания принимающего — учесть при реализации (R1–R5)
- **R1 — TTL/refresh токена.** `admin/v1/users/<mxid>/login` отдаёт access_token, который может истечь/быть отозван. Фронт при `401`/`M_UNKNOWN_TOKEN` от Matrix должен повторно дёрнуть `/session` и пересоздать клиент. Токен держать **только в памяти** SDK (`MemoryStore`), **НЕ в `localStorage`** (XSS). [фаза 1+2]
- **R2 — гонка создания support-комнаты.** Два одновременных `/session` (два таба, дабл-клик) до записи `support_room_id` → дубль комнаты. Закрыть явно: `pg_advisory_xact_lock` по `tradeframe_user_id` (или `UNIQUE` + on-conflict) вокруг `ensureSupportRoom`. Идемпотентность ≠ защита от гонки. [фаза 1]
- **R3 — realtime ≠ «только источник данных».** Замена polling→`Room.timeline` трогает логику обновления `ChatPage`, не только data-source. Для MVP (фаза 2) допустимо оставить polling через адаптер; `Room.timeline` подключить в фазе 4. UI-раскладку не трогаем в любом случае. [фаза 2/4]
- **R4 — клиентские `createChatRoom`/`searchUsers`.** В Matrix клиент комнаты не создаёт и людей не ищет (изоляция/права → 403). Адаптер обязан эти методы нейтрализовать (no-op) и скрыть соответствующий UI в `ChatPage` для клиента. [фаза 2]
- **R5 — `matrix-js-sdk` + Vite bundle.** SDK крупный, тянет node-полифиллы (`buffer`/`events`/`stream`). Прогнать `npm run build:prod` сразу после установки; lazy-load `ChatPage` оставить (не тащить SDK в основной chunk). [фаза 2]

---

## 2. Что уже готово на стороне Matrix (НЕ переделывать)

| Параметр | Значение |
|---|---|
| Homeserver (внешний) | `https://matrix.dataworker.ru` |
| Homeserver (внутренний, для серверов Miran) | `http://10.10.70.52:8008` |
| server_name | `matrix.dataworker.ru` |
| Federation | выключена (изолированный сервер) |
| Публичный каталог комнат | пуст (клиент ничего не обнаружит) |
| Клиентское пространство ГИГ | Space `!IPVxLAgctPznZUPnRp:matrix.dataworker.ru` |
| ГИГ / Общий | `!zfIquVUUWzIRZWPCJO:matrix.dataworker.ru` |
| ГИГ / Учет | `!UjGvnLRzevbrUYauhG:matrix.dataworker.ru` |
| ГИГ / АЗС | `!fMsvEzDUbgUdzPkJtP:matrix.dataworker.ru` |
| ГИГ / Процессинг | `!gkYqUFNspIirJDDcSV:matrix.dataworker.ru` |
| Команда поддержки (во всех клиентских чатах) | `@mag`, `@e.orlova`, `@d.korolev`, `@v.krol`, `@v.ginko`, `@gavrilov` |
| TURN для WebRTC-звонков | настроен 10.06 (общий coturn, Synapse `/voip/turnServer` выдаёт креды; сквозной тест аллокации снаружи пройден) |
| Видеоконференции | Jitsi `https://meet.dataworker.ru` — `external_api.js` отдаётся, iframe разрешён, демонстрация экрана из коробки; в Element подключён как `preferred_domain` |

Полный реестр доступов/токенов — `D:\Users\magsp\ELSYPLUS\Servera\vault\matrix-admin.md` (НЕ в git).

**Изоляция доказана:** тестовый `@gig.test` видит только 6 комнат ГИГ, наш внутренний канал отдаёт 403, публичный каталог пуст.

**Важно про E2EE:** клиентские комнаты НЕ шифрованы (в них бот уведомлений). Поэтому `matrix-js-sdk` инициализируем **без crypto** — проще, легче bundle, не нужен key backup.

---

## 3. Synapse Admin API — приёмы (backend будет их использовать)

Все запросы с заголовком `Authorization: Bearer <MATRIX_ADMIN_TOKEN>`.

- **Создать/обновить аккаунт** (идемпотентно): `PUT /_synapse/admin/v2/users/@<localpart>:matrix.dataworker.ru` body `{"password":"<rand>","displayname":"<имя>","admin":false}` → создаёт аккаунт, если нет.
- **Выдать access_token аккаунта без пароля** (минуя rate-limit логина): `POST /_synapse/admin/v1/users/@<mxid>/login` body `{}` → `{"access_token":"..."}`. ← **главный приём для SSO.**
- **Принудительно ввести в комнату**: `POST /_synapse/admin/v1/join/<room_id>` body `{"user_id":"@<mxid>"}` (без необходимости принимать invite).
- **Создать комнату** (client API, под токеном поддержки/admin-юзера): `POST /_matrix/client/v3/createRoom` `{"name","topic","preset":"private_chat","visibility":"private"}`.
- **Привязать комнату к Space**: `PUT /_matrix/client/v3/rooms/<space>/state/m.space.child/<room>` `{"via":["matrix.dataworker.ru"]}`.

⚠️ `localpart` (часть до `:`) допускает `a-z 0-9 . _ = - /`. Email-адрес как localpart нельзя напрямую (символ `@`) — мапь по схеме ниже.

---

## 4. Подготовка инфраструктуры (сделать ДО кода)

### 4.1. Сервисный admin-аккаунт для backend
НЕ использовать личный `@mag`. Завести отдельный:
```bash
ssh miran-ai-core-via-ns1
docker exec matrix-synapse register_new_matrix_user -c /data/homeserver.yaml \
  -u tf-chat-svc -p '<СГЕНЕРИРОВАТЬ>' -a http://localhost:8008
```
Получить долгоживущий токен (admin-login самому себе):
```bash
# под токеном mag (из vault .magtok) или сразу password-login tf-chat-svc
curl -X POST http://10.10.70.52:8008/_synapse/admin/v1/users/@tf-chat-svc:matrix.dataworker.ru/login \
  -H "Authorization: Bearer <MAG_ADMIN_TOKEN>" -d '{}'
```
Токен → в `server/.env` как `MATRIX_ADMIN_TOKEN`. Пароль сервисного аккаунта — в vault.

### 4.2. ENV в `D:\Users\magsp\ELSYPLUS\TradeFrame\server\.env`
```
MATRIX_HOMESERVER=https://matrix.dataworker.ru
MATRIX_SERVER_NAME=matrix.dataworker.ru
MATRIX_ADMIN_TOKEN=<токен @tf-chat-svc>
MATRIX_SUPPORT_MXIDS=@mag:matrix.dataworker.ru,@e.orlova:matrix.dataworker.ru,@d.korolev:matrix.dataworker.ru,@v.krol:matrix.dataworker.ru,@v.ginko:matrix.dataworker.ru,@gavrilov:matrix.dataworker.ru
```
> На проде backend TradeFrame ходит к Matrix по ПУБЛИЧНОМУ `https://matrix.dataworker.ru` (TradeFrame не в сети Miran). Проверить сетевую доступность с прод-хоста.
> Удалить старые `RC_URL`, `RC_POC_USERNAME`, `RC_POC_PASSWORD` (Rocket.Chat больше не нужен).

### 4.3. Таблица маппинга (Postgres)
```sql
CREATE TABLE chat_matrix_accounts (
  tradeframe_user_id UUID PRIMARY KEY REFERENCES users(id),
  matrix_user_id     TEXT UNIQUE NOT NULL,     -- @gig.ivanov:matrix.dataworker.ru
  support_room_id    TEXT,                       -- личный чат поддержки этого юзера
  created_at         TIMESTAMP DEFAULT now()
);

CREATE TABLE chat_matrix_companies (
  network_id   UUID PRIMARY KEY,                 -- TradeFrame network (selectedNetwork)
  space_id     TEXT NOT NULL,                     -- Matrix space клиента (ГИГ: !IPVxLAgctPznZUPnRp:...)
  direction_rooms JSONB                            -- {"Общий":"!...","Учет":"!...","АЗС":"!...","Процессинг":"!..."}
);
```
Заполнить `chat_matrix_companies` для ГИГ вручную (network_id ГИГ ↔ space/rooms из раздела 2).

### 4.4. Схема mxid (СОГЛАСОВАНО)
`@<company_slug>.<localpart>:matrix.dataworker.ru`, где:
- `localpart` = **email-localpart** TF-юзера, нормализованный (lowercase, `[a-z0-9._-]`, `@`/прочее → удалить/заменить). Берём из email (а НЕ из ФИО) — стабильно: не ломается при смене фамилии и уникально. Пример: `aivanov@gig.ru` + ГИГ → `@gig.aivanov`.
- **displayName = ФИО** («Иванов И.») — задаётся через `PUT admin/v2/users/.../displayname`, чтобы команда в Element видела человека, а не localpart.
- Коллизия localpart внутри компании — добавить суффикс из части UUID.
- Сохранять готовый mxid в `chat_matrix_accounts`, не вычислять каждый раз.

---

## 5. Backend — реализация

### 5.1. `server/services/matrixAdmin.js`
Функции (через `axios`, base = `MATRIX_HOMESERVER`, header admin token):
- `ensureMatrixAccount(tfUser, companySlug)` → mxid. Идемпотентно: смотрит `chat_matrix_accounts`; если нет — генерит mxid, `PUT admin/v2/users` (создать с рандомным паролем), `PUT admin/v2/users/.../displayname`, ставит аватар (опц), пишет в таблицу.
- `getUserLoginToken(mxid)` → access_token (`POST admin/v1/users/<mxid>/login`).
- `ensureSupportRoom(mxid, tfUser)` → room_id. Если у юзера нет `support_room_id`: создать комнату «💬 Поддержка — <Имя>» (под admin/сервисным аккаунтом или одним из support), force-join всех `MATRIX_SUPPORT_MXIDS` + самого клиента + бота уведомлений, привязать к space компании, записать `support_room_id`.
- `ensureCompanyRooms(mxid, network_id)` → force-join клиента в `direction_rooms` его компании (фаза 3).
- `forceJoin(roomId, mxid)`, `createRoom(...)`, `linkToSpace(space, room)` — низкоуровневые.

Пиши с обработкой ошибок и идемпотентностью (повторный вызов не плодит комнаты). Соблюдай паузы ~0.6с между admin-join (Synapse rate-limit 429 — ловить и ретраить с backoff).

### 5.2. `server/routes/chat-matrix.js`
```js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const mx = require('../services/matrixAdmin');

// Выдать фронту всё для подключения matrix-js-sdk
router.post('/session', requireAuth, async (req, res) => {
  try {
    const tfUser = req.user;                       // {id,email,name,...}
    const networkId = req.body?.networkId || null; // из SelectionContext (tc:selectedNetwork)
    const companySlug = await mx.resolveCompanySlug(networkId); // 'gig' или дефолт
    const mxid = await mx.ensureMatrixAccount(tfUser, companySlug);
    const supportRoom = await mx.ensureSupportRoom(mxid, tfUser);
    if (networkId) await mx.ensureCompanyRooms(mxid, networkId); // фаза 3
    const accessToken = await mx.getUserLoginToken(mxid);
    res.json({
      homeserver: process.env.MATRIX_HOMESERVER,
      userId: mxid,
      accessToken,                                  // scoped к аккаунту клиента
      supportRoomId: supportRoom,
    });
  } catch (e) {
    console.error('matrix session error', e);
    res.status(500).json({ error: 'chat unavailable' });
  }
});

module.exports = router;
```
Зарегистрировать в `server/index.js`: `app.use('/api/chat/matrix', require('./routes/chat-matrix'))`. Поставить отдельный rate-limit на `/session`.

**Безопасность backend:**
- `MATRIX_ADMIN_TOKEN` НИКОГДА не уходит на фронт. Фронт получает только `accessToken` своего аккаунта.
- `/session` под `requireAuth` — токен выдаётся строго для аккаунта, привязанного к текущему TradeFrame-юзеру.
- Логировать выдачу токенов (audit).

---

## 6. Frontend — реализация

### 6.1. Установка
```bash
cd D:\Users\magsp\ELSYPLUS\TradeFrame
npm i matrix-js-sdk
```
ChatPage уже lazy-загружается — bundle SDK не попадёт в основной chunk.

### 6.2. `src/services/matrixChat.ts`
Тонкая обёртка над `matrix-js-sdk` (инициализация БЕЗ crypto):
```ts
import * as sdk from 'matrix-js-sdk';
import { apiRequest } from './apiClient';

let client: sdk.MatrixClient | null = null;

export async function initMatrix(networkId?: string) {
  const s = await apiRequest('/chat/matrix/session', {
    method: 'POST', body: JSON.stringify({ networkId }),
  }); // {homeserver,userId,accessToken,supportRoomId}
  client = sdk.createClient({
    baseUrl: s.homeserver,
    accessToken: s.accessToken,
    userId: s.userId,
    // НЕ инициализировать crypto — клиентские комнаты не шифрованы
  });
  await client.startClient({ initialSyncLimit: 50 });
  return { client, supportRoomId: s.supportRoomId };
}
```
Экспортировать функции под сигнатуры существующего `supportService` (чтобы ChatPage менялся минимально):
- `getChatRooms()` → из `client.getRooms()` → маппинг в `ChatRoom[]`
- `getChatMessages(roomId)` → `room.timeline` / `client.scrollback` → `ChatMessage[]`
- `sendChatMessage(roomId, content)` → `client.sendTextMessage(roomId, content)`
- `markChatRead(roomId)` → `client.sendReadReceipt(...)`
- подписка на события `client.on('Room.timeline', ...)` → react-query invalidate / локальный стейт

### 6.3. Адаптер Matrix → типы TradeFrame
Существующие типы (`src/types/support.ts`) переиспользуем, маппинг:

| ChatRoom | Matrix |
|---|---|
| `id` | `room.roomId` |
| `name` | `room.name` |
| `type` | `'direct'` для личного, `'group'` для направлений |
| `unread_count` | `room.getUnreadNotificationCount()` |
| `last_message` / `last_message_at` | последнее `m.room.message` в timeline |
| `participants` | `room.getJoinedMembers()` → ChatParticipant |

| ChatMessage | Matrix event |
|---|---|
| `id` | `event.getId()` |
| `room_id` | `event.getRoomId()` |
| `user_id` / `user_name` | `event.getSender()` / member.name |
| `content` | `event.getContent().body` |
| `type` | по `msgtype` (m.text→text, m.image→image, m.file→file) |
| `created_at` | `event.getTs()` |
| `is_edited` | наличие `m.replace` |
| `reply_to*` | `m.relates_to` → `m.in_reply_to` |

### 6.4. Интеграция в `ChatPage.tsx`
- Минимально-инвазивно: ввести флаг источника данных. Либо новый хук `useMatrixChat()` рядом с текущим `supportService`, либо заменить импорт сервиса на `matrixChat` за фиче-флагом `VITE_CHAT_BACKEND=matrix`.
- UI (левая панель комнат, лента, поле ввода, группировка) — **не трогать**, он уже Telegram-style и подходит. Помогают: `src/components/support/telegram-helpers.ts` (`computeGrouping`, `bubbleRadius`, `formatTime`, `getDateLabel`).
- Реалтайм: вместо текущего polling — подписка на `Room.timeline` событие SDK (живые сообщения без перезапроса).
- Бейдж непрочитанных в сайдбаре (`/support/chat`, `unreadCounts.chat` из `SupportContext`) — кормить из суммы `getUnreadNotificationCount()` по комнатам.

### 6.5. Точка входа
- Маршрут `/support/chat` уже есть (App.tsx, ProtectedRoute) и пункт в сайдбаре (`AppSidebar.tsx`, `MessageCircleMore`). Менять не нужно — только источник данных внутри ChatPage.

---

## 6a. Звонки и видео — Фаза 6 (добавлено 10.06.2026)

Инфраструктура готова и проверена 10.06 (TURN-аллокация снаружи, Jitsi iframe — см. §2). Осталась чисто фронтовая/backend-обвязка.

### 6a.1. Архитектурное решение: Jitsi-виджет, НЕ нативные m.call

Нативные 1:1-звонки matrix-js-sdk (`m.call.*`) в Element **рендерят звонилку только в комнатах из 2 участников**. Наши комнаты — клиент + 6 поддержки + боты, поэтому на стороне команды входящий m.call просто не покажет UI ответа. Основной механизм — **Jitsi-виджет** (`m.widget` state event): работает в комнате любого размера, Element показывает команде нативную плашку «Join conference», демонстрация экрана из коробки (замена AnyDesk для «покажите, что у вас на экране»).

```
TradeFrame (кнопка 📞/🎥 в шапке чата)
  └─ POST /api/chat/matrix/call {roomId}        ← backend, под TF-JWT
       ├─ ensureCallWidget(roomId): state event m.widget от @tf-chat-svc (PL100), идемпотентно
       │    url = https://meet.dataworker.ru/tf-<companySlug>-<8hex>   (suffix хранится в data виджета)
       ├─ notify: m.room.message от @tf-chat-svc «📞 <Имя> начал звонок» + mention @room  → push команде
       └─ ответ фронту: {domain, roomName, displayName}
  └─ фронт открывает конференцию в модалке через external_api.js (meet.dataworker.ru)
Команда: Element → в комнате видна плашка виджета → Join (или клик по упоминанию)
```

### 6a.2. Backend (`server/routes/chatMatrix.js` — дописать)

- `POST /api/chat/matrix/call` (requireAuth): проверить, что комната принадлежит юзеру (его support-room или направление его компании — по таблицам `chat_matrix_*`), иначе 403.
- `ensureCallWidget(roomId)`: GET state `m.widget`/`im.vector.modular.widgets` (id `tf-call`); если нет — PUT от `@tf-chat-svc`: `{type:"jitsi", url:"https://meet.dataworker.ru/<jitsiRoom>#config...", name:"Звонок", data:{domain:"meet.dataworker.ru", conferenceId:"<jitsiRoom>"}}`. `jitsiRoom = tf-<companySlug>-<crypto 8 hex>` — генерится ОДИН раз на комнату и переиспользуется (хранится в state виджета). Неугадываемость имени = изоляция конференции (Jitsi пускает анонимно).
- Сообщение-вызов: не чаще 1 раза в 2 мин на комнату (анти-спам), формат `m.text` + `m.mentions {room:true}`.

### 6a.3. Frontend

- `src/services/jitsiCall.ts`: ленивая загрузка `https://meet.dataworker.ru/external_api.js`, `new JitsiMeetExternalAPI(domain, {roomName, parentNode, userInfo:{displayName: <ФИО из TF-профиля>}, configOverwrite:{prejoinConfig:{enabled:false}}})`.
- Кнопки 📞 (аудио: `startWithVideoMuted:true`) и 🎥 в шапке ChatPage — только когда выбрана комната. Конференция — в модалке поверх чата (не уводить со страницы); закрытие модалки = `api.dispose()`.
- НЕ тащить external_api.js в bundle — только динамический `<script>` (R5 остаётся в силе).

### 6a.4. Фаза 6b — нативные 1:1 звонки (РЕАЛИЗОВАНО 10.06.2026)

Для комнат **ровно из 2 участников** (клиентские чаты «сотрудник ↔ сотрудник», будущие DM) кнопки 📞/🎥 делают **нативный Matrix-звонок** (`createNewMatrixCall`) вместо Jitsi: WebRTC точка-точка через TURN, у собеседника в Element/Element X — настоящий входящий звонок с рингтоном и push.

- `src/services/matrixCall.ts` — placeCall / onIncomingCall / getCallPeerName; `matrixChat.getMatrixClientForCalls()` (ensureClient). Модуль грузится динамическим import — SDK не в основном чанке (R5).
- `src/components/support/MatrixCallOverlay.tsx` — исходящий («Вызов…»), входящий (Принять/Отклонить), активный (медиа, mute мик/камера, таймер, Завершить). Feeds через `call.getFeeds()` → `srcObject`.
- ChatPage: `nativeCallEligible = participants.length === 2` → ветвление в `startCall`; глобальная подписка на `Call.incoming` (второй входящий при активном — авто-reject «занято»).
- Маршрутизация: 2 участника → нативный; 3+ → Jitsi-виджет (§6a.1, Element не рендерит m.call в группах).

### 6a.5. Критерий готовности Фазы 6

Клиент в TradeFrame жмёт 🎥 → открывается конференция в модалке; у команды в Element в той же комнате — плашка виджета + push-упоминание; сотрудник входит → двусторонние аудио/видео и демонстрация экрана работают; чужой человек угадать URL конференции не может; повторные клики не плодят виджеты/спам-сообщения.

---

## 7. Провижн при онбординге клиента (организационное)

Когда заводим нового сотрудника компании-клиента в TradeFrame:
1. создаётся TradeFrame-пользователь (как сейчас);
2. при первом открытии «Чат» backend сам провиженит Matrix-аккаунт + персональный чат поддержки (lazy, идемпотентно) — отдельный шаг онбординга не нужен;
3. для новой компании-клиента — один раз создать её Space + направления (по шаблону ГИГ из vault) и добавить запись в `chat_matrix_companies`.
4. **ОБЯЗАТЕЛЬНО при создании компании:** ввести сервисный `@tf-chat-svc` во все комнаты компании (Space + направления) и выдать ему **power level 100**. Без этого backend (`ensureCompanyRooms`/`linkToSpace`) получает `403` при force-join клиентов и привязке к Space — Synapse admin-join требует, чтобы инициатор реально имел права в комнате, серверного admin-флага недостаточно. (Для ГИГ сделано 09.06 через mag-токен: join @tf-chat-svc + PUT m.room.power_levels users[@tf-chat-svc]=100 в Space и 4 направлениях.)

---

## 8. Фазы и критерии готовности

| Фаза | Объём | Критерий готовности |
|---|---|---|
| **0. Инфра** | сервисный admin-аккаунт, env, 2 таблицы, заполнить ГИГ | `POST admin/v1/users/@tf-chat-svc/login` отдаёт токен; таблицы есть |
| **1. Backend SSO** | `matrixAdmin.js` + `/api/chat/matrix/session` | под токеном TF-юзера `/session` возвращает homeserver+userId+accessToken+supportRoomId; повторный вызов не плодит комнаты |
| **2. Frontend MVP** | matrix-js-sdk + adapter + ChatPage на личном чате | клиент входит в TradeFrame → Чат → видит «Поддержка — <Имя>» → пишет → сообщение видно в Element у команды → ответ команды виден в TradeFrame |
| **3. Направления** | `ensureCompanyRooms` + показ Space-комнат | сотрудник ГИГ видит Общий/Учет/АЗС/Процессинг; чужую компанию не видит |
| **4. Богатый UX** | файлы (`m.image`/`m.file` через `/_matrix/media`), typing, read receipts, unread badge | загрузка файла, индикатор печати, счётчик непрочитанных в сайдбаре |
| **5. Чистка** | убрать `/api/chat/rc-token`, `server/routes/chat.js`, `server/services/rcChatService.js`, RC env, RC-зависимости. ~~Откат настроек RC-сервера~~ — не нужен: **Rocket.Chat выведен из эксплуатации 10.06.2026** (сервер удалён, см. `ai-base/updates/2026-06-10-rocketchat-decommission.md`) | grep по `RC_`/`rocket` в коде/env пуст; старый код удалён |
| **6. Звонки и видео** | §6a: `/api/chat/matrix/call` + `ensureCallWidget` + кнопки 📞/🎥 + модалка Jitsi + Jitsi-JWT (инициатор = организатор) | см. §6a.5: клиент звонит из TradeFrame, команда входит из Element, экран шарится, виджеты/уведомления не дублируются |
| **6b. Нативные 1:1** | §6a.4: matrixCall.ts + MatrixCallOverlay + ветвление по числу участников | в комнате из 2 человек звонок звонит в Element X с рингтоном; в группе — по-прежнему Jitsi; входящий при активном звонке отклоняется |

**Сквозной тест изоляции (обязателен):** под клиентским аккаунтом `getRooms()` отдаёт только комнаты его компании; прямой запрос чужой/внутренней комнаты → 403; `publicRooms` пуст.

---

## 9. Открытые вопросы — СОГЛАСОВАНО 09.06.2026
1. **mxid-схема:** `@<company>.<email-localpart>:matrix.dataworker.ru` (стабильность по email), а **displayName = ФИО** (читаемость в Element). Коллизии редки → суффикс из части UUID. См. §4.4.
2. **Объём MVP:** только **личный чат поддержки** (фаза 2). Направления компании — отдельным шагом (фаза 3).
3. **История:** начинаем **чисто**. Миграцию TSupport/RC — отдельным проектом при необходимости; старые каналы остаются доступны для справки.
4. **Поддержка в клиентских чатах:** **вся команда (6 чел)** в `MATRIX_SUPPORT_MXIDS`. Переход на «ответственных по компании» — оптимизация на потом (состав комнат меняется force-join/leave, не блокирующее решение).

---

## 10. Чего НЕ делать
- НЕ включать E2EE в клиентских комнатах (там бот уведомлений; шифрование необратимо и сломает ботов).
- НЕ выносить `MATRIX_ADMIN_TOKEN` на фронт.
- НЕ трогать UI-раскладку ChatPage (она уже подходит) — менять только источник данных.
- НЕ создавать комнаты/аккаунты вне идемпотентных `ensure*`-функций (иначе дубли при каждом заходе).
- НЕ использовать личный `@mag` как сервисный токен backend — только `@tf-chat-svc`.
- НЕ делать звонки через нативные `m.call` в комнатах поддержки — Element не показывает UI звонка в комнате с >2 участниками. Только Jitsi-виджет (§6a). Нативные 1:1 — лишь если появятся настоящие DM (§6a.4).

---

## 11. Справочные файлы TradeFrame (куда смотреть/что менять)
| Назначение | Путь |
|---|---|
| Auth-контекст фронта | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\contexts\NewAuthContext.tsx` |
| API-клиент фронта | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\services\apiClient.ts` (`apiRequest`) |
| Хранилище токена | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\utils\authStorage.ts` |
| UI чата (переиспользовать) | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\pages\support\ChatPage.tsx` |
| Типы чата | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\types\support.ts` |
| Helpers UI | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\components\support\telegram-helpers.ts` |
| Текущий сервис чата (образец сигнатур) | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\services\supportService.ts` |
| Backend entry | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\index.js` |
| Auth middleware backend | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\middleware\auth.js` (`requireAuth`) |
| DB pool | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\db\pool.js` (`query`, `queryOne`, `withTransaction`) |
| Образец защищённого роута | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\routes\auth.js` |
| Реестр Matrix-доступов (НЕ git) | `D:\Users\magsp\ELSYPLUS\Servera\vault\matrix-admin.md` |

## 12. Dev-запуск (из CLAUDE.md проекта)
```
# backend: cd server && node index.js   (порт 3001)
# frontend: npm run dev                 (порт 3000, проксирует /api → 3001)
```
Тесты: `npm test` (vitest), `npm run test:e2e` (Playwright). Прод: `ssh dw-prod`, nginx + GitHub Actions.
