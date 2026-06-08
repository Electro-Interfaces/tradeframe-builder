# ЗАДАНИЕ АГЕНТУ: встраивание чата Rocket.Chat в TradeFrame через iframe (PoC)

> Это ТЗ для агента-исполнителя. Делаешь по фазам, после КАЖДОЙ фазы останавливаешься и
> отдаёшь результат на проверку координатору (критерии приёмки в конце каждой фазы).
> Язык работы — русский. Не ломать прод. Перед правкой серверных конфигов — бэкап.

---

## 0. Контекст

**Цель:** в приложении TradeFrame сделать раздел «Чат», который через **iframe** показывает
наш Rocket.Chat (`chat.dataworker.ru`) с **авто-логином** пользователя в его guest-аккаунт.
Это промежуточный (быстрый) вариант: позже чат переведут на свой UI поверх RC API, но СЕЙЧАС —
iframe, чтобы быстро дать клиентам рабочий чат со звонками/файлами/push.

**Что уже готово (НЕ трогать, использовать как есть):**
- Rocket.Chat 8.4 развёрнут на `ai-core` (10.10.70.52:3000), публичный `https://chat.dataworker.ru`
  (через HAProxy на rproxy, LE-сертификат). Настроены: Telegram-тема (Custom CSS), мобильные push
  (workspace зарегистрирован в RC Cloud, план Starter), файлы в MinIO, видеозвонки Jitsi (app + JWT,
  идёт донастройка `aud`). Боты не трогать.
- Клиентская модель в RC: guest-изоляция, провижн-скрипт
  `D:\Users\magsp\ELSYPLUS\Servera\scripts\rocketchat-provision-client.sh` (создаёт `<slug>-general`
  + `<slug>-<contact>`). Все креды/детали RC — в `D:\Users\magsp\ELSYPLUS\Servera\vault\rocketchat-admin.md`.

**Стек TradeFrame:** Vite + React + TypeScript + shadcn/ui (Radix + Tailwind), бэкенд Express
(`server/index.js`, pm2 `ecosystem.config.cjs`), Postgres (`DATABASE_URL`, схема `tradeframe`),
HTTP через `axios`/`fetch`. БЕЗ Supabase. Домены: `https://test.dataworker.ru` (test),
`https://prod.dataworker.ru` (prod), dev `localhost:3000/3002`. Бэкенд на том же origin, путь `/api`.

**Ключевые файлы TradeFrame (точки интеграции):**
- Существующий чат-UI (на TSupport, НЕ удалять пока): `src/pages/support/ChatPage.tsx`
- HTTP-клиент фронта: `src/services/apiClient.ts` (функция `apiRequest(endpoint, options, requiresAuth)`,
  Bearer-токен из `src/utils/authStorage.ts` `getToken()`, базовый origin из `src/utils/backendUrl.ts`).
- Auth-контекст: `src/contexts/NewAuthContext.tsx` (`useNewAuth()` → `user`).
- Текущий чат-сервис (контракт): `src/services/supportService.ts` (chat-функции), типы `src/types/support.ts`
  (`ChatRoom`/`ChatMessage`/`ChatParticipant`).
- Навигация/роутинг: `src/App.tsx`, сайдбар `src/components/layout/AppSidebar.tsx`.

---

## Схема каналов и работы (целевая модель)

Действующие лица: **клиент** = сотрудник компании-клиента (RC role `guest`, изолирован);
**поддержка** = сотрудники ElsyPlus (RC role `user`). Для PoC поддержка = `mag` + `e.orlova`.

На каждую компанию-клиента (slug = `c<companyId>`):
- `c<companyId>-general` — ОБЩИЙ чат компании: все сотрудники + агенты поддержки. fname (отображаемое
  имя) = название компании.
- `c<companyId>-u<userId>` — ИНДИВИДУАЛЬНЫЙ канал: один сотрудник + агенты поддержки. fname = «Поддержка».

Имена каналов (`name`/slug) — латиницей по id (стабильность, упоминания). Русское отображаемое имя
задаётся `fname` (ВАЖНО: RC отображает в сайдбаре `name`, а не `fname` — поэтому для русских имён
правят `name` и `subscription.name` напрямую в Mongo; но в iframe-PoC это вторично, можно оставить
slug — займёмся при переходе на свой UI). Изоляция guest — клиент видит ТОЛЬКО свои каналы.

---

## Доступы к Rocket.Chat (для серверных шагов)

- SSH на сервер RC: `ssh miran-ai-core-via-ns1` (он же ai-core, 10.10.70.52).
- Admin-пароль RC: `grep '^ADMIN_PASS' /opt/rocketchat/.env | cut -d= -f2-` (НЕ выводить в логи/коммиты).
- REST-логин: `POST http://10.10.70.52:3000/api/v1/login {user:'mag',password:<ADMIN_PASS>}` → `authToken`,`userId`.
- **Админ-операции через REST требуют 2FA password-fallback:** заголовки
  `x-2fa-method: password` + `x-2fa-code: <sha256(ADMIN_PASS)>`.
- Контейнеры: `rocketchat`, `rocketchat-mongo` (БД `rocketchat`), `rocketchat-stunnel`.
- Mongo: `docker exec rocketchat-mongo mongosh --quiet rocketchat --eval "..."`.
- Изменение настройки: `POST /api/v1/settings/<_id>` body `{value:...}` (с 2FA-заголовками).

---

## ФАЗА 1 — RC: включить iframe-интеграцию и снять блокировку встраивания

Rocket.Chat по умолчанию запрещает показ в `<iframe>` (X-Frame-Options). Нужно разрешить встраивание
с доменов `*.dataworker.ru` и включить iframe-Auth API.

> **Находка координатора (проверено `curl -sI https://chat.dataworker.ru/`):** реальный блокер —
> только `X-Frame-Options: sameorigin`. CSP у RC присутствует, но в нём **нет** директивы
> `frame-ancestors` → CSP сейчас framing НЕ ограничивает, снятия XFO достаточно. CSP содержит
> script-хеши RC (zapier и пр.) и проходит через rproxy без изменений ⇒ оба заголовка почти наверняка
> ставит сам RC, а не HAProxy. Поэтому п.5 ниже — **диагностическая проверка**, а не обязательная
> правка.

Сделать (через REST settings, с 2FA-заголовками):
1. `Iframe_Integration_send_enable = true`
2. `Iframe_Integration_receive_enable = true`
3. `Iframe_Integration_receive_origin = https://test.dataworker.ru` (для PoC; позже добавить prod)
4. `Iframe_Restrict_Access = false` (PoC; в проде вернуть `true` + точный origin)
   — это управляет заголовком X-Frame-Options со стороны RC.
5. Проверить, не добавляет ли X-Frame-Options/CSP `frame-ancestors` **HAProxy на rproxy**
   (`ssh miran-rproxy`, конфиг `/etc/haproxy/haproxy.cfg`, секция backend `chat_*`). Если добавляет
   `X-Frame-Options: DENY/SAMEORIGIN` или `frame-ancestors 'self'` — нужно для домена RC разрешить
   `frame-ancestors https://*.dataworker.ru` (НЕ убирать защиту глобально; точечно для chat-бэкенда).
   Перед правкой haproxy.cfg — бэкап `.bak-<дата>`, после — `systemctl reload haproxy`, проверить `haproxy -c`.
   Для диагностики источника заголовка сравнить ответ RC напрямую (`curl -sI http://10.10.70.52:3000/`)
   и через rproxy/снаружи (`curl -sI https://chat.dataworker.ru/`).

**Безопасный прод-end-state (рекомендация, НЕ оставлять framing полностью открытым):** вместо
глобального снятия XFO в проде вернуть `Iframe_Restrict_Access=true` и ограничить framing через CSP.
Так как у RC нет `frame-ancestors`, на rproxy для chat-бэкенда добавить **отдельный второй** заголовок
`Content-Security-Policy: frame-ancestors 'self' https://*.dataworker.ru` (браузер применяет пересечение
всех CSP-заголовков; собственный CSP RC со script-хешами не трогаем — он остаётся валидным) и держать
XFO снятым именно для этого бэкенда. В PoC (только `test`) допустимо `Iframe_Restrict_Access=false`.

**Критерии приёмки Ф1 (что покажешь координатору):**
- `curl -sI https://chat.dataworker.ru/ -H 'Host: chat.dataworker.ru'` (через rproxy или снаружи):
  в ответе НЕТ `X-Frame-Options`. CSP в PoC не трогаем — у него нет `frame-ancestors`, значит framing
  не ограничен. (В прод-варианте, наоборот, framing ограничивается через CSP — см. прод-end-state выше.)
- Значения 4 настроек RC выставлены (вывести их через GET `/api/v1/settings/<id>`).
- RC по-прежнему открывается напрямую (200), ничего не сломано.

---

## ФАЗА 2 — RC: тестовая компания + каналы + агенты поддержки

Завести пилот (по образцу прежнего `acme`). slug компании = `c-test`.

> **Конвенция имён (решение координатора):** для PoC переиспользуем формат провижн-скрипта
> `<slug>-<contact-suffix>` → индивидуальный канал называется `c-test-ivanov` (а НЕ `c-test-u1`).
> Целевую нотацию `c<companyId>-u<userId>` из «Схемы каналов» вводим позже, при переходе на свой UI
> (там же правится русский `fname`/`name` в Mongo). Сейчас — не плодить расхождений со скриптом.

1. Создать приватные группы (REST `groups.create`, с 2FA): `c-test-general`, `c-test-ivanov`.
2. Создать 2 guest-юзеров клиента: `c-test.ivanov` (контакт 1), `c-test.petrov` (контакт 2) —
   роль `guest`, `requirePasswordChange:true`, временные пароли. (См. как делает провижн-скрипт.)
3. Состав:
   - `c-test-general`: оба клиента + агенты `mag`, `e.orlova`.
   - `c-test-ivanov`: `c-test.ivanov` + `mag`, `e.orlova`.
4. Проверить изоляцию: под `c-test.ivanov` (REST login) — видит ТОЛЬКО свои каналы, не видит чужих/внутренних.

**Критерии приёмки Ф2:**
- `groups.members` показывает правильный состав обоих каналов.
- Логин под guest `c-test.ivanov` → `groups.list`/`channels.list` отдаёт только его каналы (изоляция).
- Креды тестовых guest записаны в `D:\Users\magsp\ELSYPLUS\Servera\vault\rocketchat-admin.md` (не в git).

---

## ФАЗА 3 — TradeFrame backend: эндпоинт выдачи RC-токена (identity)

Цель: фронт просит у своего бэкенда RC-`loginToken` для ТЕКУЩЕГО пользователя, чтобы залогинить iframe.

> 🔴 **ШАГ 0 — ГЕЙТ (проверяет координатор вручную, ДО backend-кода).** Самый хрупкий узел плана:
> цепочка `сервисный PAT (bypassTwoFactor) → POST /api/v1/users.createToken(guest) → проверка токена
> через GET /api/v1/me` НЕ проверена в этом RC 8.4. Известно: голый `users.createToken` без 2FA отдаёт
> `must have required property 'secret'`. Плюс сервисному аккаунту нужны admin-права / permission на
> создание токенов для ДРУГИХ пользователей. Поэтому СНАЧАЛА координатор прогоняет всю цепочку на
> тестовом guest (`c-test.ivanov`) и подтверждает рабочий токен — только потом агент строит backend.
> **План Б, если PAT-bypass не проходит:** прямой `POST /api/v1/login` под guest (бэкенд знает пароль
> из провижининга) → `authToken`; для этого провижинингом снять у guest `requirePasswordChange`.
> Авторизацию iframe в этом случае вести путём 2 из Ф4 (Custom Script + localStorage). Контракт
> эндпоинта `/chat/rc-token` от выбора механики НЕ зависит — меняется только внутренняя реализация.

1. Таблица маппинга в Postgres (схема `tradeframe`), напр. `rc_user_map`:
   `tf_user_id (pk), rc_user_id, rc_username, created_at, updated_at`.
   **Токен (`rc_auth_token`) НЕ хранить как вечный** — loginToken'ы guest имеют TTL и протухнут.
   Генерить токен **on-demand** при каждом запросе `/chat/rc-token` (createToken/login дёшев). Если
   позже понадобится кэш — только с проверкой валидности (`GET /api/v1/me`) и перевыпуском при 401;
   для PoC проще не кэшировать. Таблица хранит лишь устойчивый маппинг tf↔rc, не сессию.
2. Сервисный механизм получения RC-токена для guest:
   - **Решение координатора (вместо «admin без 2FA»):** создать в RC отдельный **сервисный аккаунт** и
     выдать ему **Personal Access Token с `bypassTwoFactor: true`** (`users.generatePersonalAccessToken`).
     2FA на самом аккаунте НЕ отключаем — bypass действует только для автоматизационного PAT. Бэкенд
     ходит этим PAT (`X-Auth-Token` + `X-User-Id`) и вызывает `POST /api/v1/users.createToken` для
     нужного guest → получает `{ userId, authToken }`. `users.createToken` обходит и 2FA (через PAT),
     и `requirePasswordChange` guest (в отличие от обычного логина под guest). Создание сервисного
     аккаунта/PAT — **согласовать с координатором ПЕРЕД выполнением** (см. правила). PAT хранить только
     в `server/.env` + vault, во фронт НЕ отдавать.
   - Эндпоинт `GET /api/chat/rc-token` (Express, auth по существующему Bearer TradeFrame):
     по `tf_user_id` **из аутентифицированного токена** (НЕ из query/параметра — защита от IDOR)
     находит/создаёт связку, возвращает `{ rcUrl: 'https://chat.dataworker.ru', userId, authToken }`.
     Токен НЕ логировать; повесить rate-limit; только HTTPS.
3. Для PoC допустимо хардкод-маппинг тестового пользователя TradeFrame → guest `c-test.ivanov`
   (чтобы проверить flow), но структуру таблицы заложить сразу.

**Критерии приёмки Ф3:**
- `GET /api/chat/rc-token` с валидным TradeFrame-токеном возвращает рабочие `userId`+`authToken`
  (проверить: этим токеном `GET /api/v1/me` на RC отдаёт того самого guest).
- Секреты не утекают во фронт-бандл и логи. Сервисный аккаунт согласован с координатором.

---

## ФАЗА 4 — TradeFrame frontend: компонент iframe + авто-логин

> **Решение координатора по размещению — вариант A (НЕ отдельная страница/роут/сайдбар).**
> Чат — амбиентный инструмент (нужен с любой страницы, не теряя контекст), открывается **модалкой**
> по образцу кнопки «Заявка». Десктоп — кнопка «Чат» в шапке; мобайл — все три глобальных действия
> (Связь/Чат/Заявка) переносятся вниз в `BottomNav`. Старый `ChatPage` (`/support/chat`) НЕ трогаем.
>
> **Порядок и приёмка — ДВА независимых шага (изоляция регрессий, координатор примет раздельно):**
> — **Шаг 4A (рефактор, БЕЗ чата):** унификация «Связь»/«Заявка» через контекст + перенос трёх действий
>   в `BottomNav` + очистка мобильной верхней панели. Принимается ОТДЕЛЬНО: вся текущая
>   функциональность «Связь» и «Заявка» работает как раньше (десктоп и мобайл), регрессий нет.
> — **Шаг 4B (чат):** только после приёмки 4A — `RcChatIframe` + модалка + кнопка «Чат» + авто-логин.

1. Компонент `src/components/chat/RcChatIframe.tsx`:
   - `<iframe src="https://chat.dataworker.ru/">` на всю область контейнера;
   - **Авто-логин — два пути. Важно (cross-origin): родитель `test.dataworker.ru` НЕ может писать в
     `localStorage` iframe `chat.dataworker.ru` напрямую — приёмник токена должен жить ВНУТРИ RC.**
     - **Путь 1 (штатный, пробовать первым):** RC iframe-Auth API receive — родитель шлёт
       `iframe.contentWindow.postMessage({ externalCommand: 'login-with-token', token: <authToken> },
       'https://chat.dataworker.ru')`. ⚠️ В RC 8.x iframe-Auth — legacy и местами выпилен/изменён;
       если не сработает — сразу путь 2 (не застревать на нём).
     - **Путь 2 (проверенный fallback — координатор логинит этот RC именно так):** в RC вставить
       **Custom Script** (Admin → Layout/Custom Scripts) — приёмник `message` от родителя, который
       пишет `Meteor.loginToken`/`Meteor.userId` в `localStorage` и делает `location.reload()`. Это
       серверная вставка в RC, не код родителя; согласовать с координатором (его рабочий путь).
   - обрабатывать сообщения от RC (`window.addEventListener('message', ...)` с проверкой `origin ===
     'https://chat.dataworker.ru'`): событие готовности/`Custom_Script`/`unread-changed` — опционально.
   - токен берётся из нового сервиса `src/services/rcChatService.ts` → `getRcToken()` (вызывает
     `apiRequest('/chat/rc-token')`).
   - **Поведение iframe: mount-on-open** (монтируется при открытии модалки, размонтируется при
     закрытии). Keep-alive (скрытый постоянный iframe + живой `unread-changed`) — enhancement, не в PoC.
2. Обёртка-модалка: десктоп — крупный `Dialog` (~90% экрана, shadcn `Dialog` как `StationsConnectionDialog`),
   мобайл — полноэкранный `Sheet`. Внутри — `RcChatIframe` + заголовок «Чат» + кнопка закрытия.
   Рендерится **один раз** в `src/App.tsx` (как `CreateTicketDialog`), открывается из контекста.
3. Точка входа и проводка состояния (по образцу `SupportContext.openCreateDialog`):
   - В `src/contexts/SupportContext.tsx` добавить `isChatDialogOpen` + `openChatDialog`/`closeChatDialog`.
   - **Десктоп** (`src/components/layout/Header.tsx`, десктоп-центр): добавить кнопку «Чат» (иконка
     `MessageCircle`/`MessagesSquare`) рядом со «Связь»/«Заявка», `onClick={openChatDialog}`. Бейдж
     непрочитанных — `unreadCounts.chat`, сброс `clearChatBadge()`.
   - **Мобайл (перенос трёх действий вниз):** в `src/components/layout/BottomNav.tsx` сделать раскладку
     `[📶 Связь][💬 Чат][🛟 Заявка][☰ Меню]` — это кнопки-действия (`onClick`), а не `NavLink`;
     навигация по под-страницам уходит в «Меню». Соответственно из мобильной верхней панели `Header`
     убрать кнопки «Связь» и «Заявка» (верх остаётся `NetworkSelect` + аватар).
   - **Рефактор-предусловие:** унифицировать «Связь» так же, как «Заявка», — единый глобальный
     `StationsConnectionDialog`, рендерящийся один раз в `App.tsx` и открываемый из контекста; убрать
     дубли рендера диалога из `Header.tsx` и `src/components/common/ConnectionButton.tsx`. Тогда и
     `Header` (десктоп), и `BottomNav` (мобайл) лишь вызывают `open*` из контекста.
4. Уважать тему TradeFrame, мобильную вёрстку (на мобиле iframe может быть ограничен — предусмотреть
   fallback-сообщение «откройте приложение Rocket.Chat» со ссылкой).

Справочно (RC iframe-Auth API): помимо `login-with-token` есть `'go'` (навигация) и `'logout'`. Точные
имена/доступность свериться по докам RC iframe integration для 8.4 — если receive-API выпилен, основным
становится путь 2 (Custom Script + `localStorage` + reload), см. п.1 выше.

**Критерии приёмки Ф4:**
- Заходишь в TradeFrame (test.dataworker.ru) под тестовым пользователем → кнопка «Чат» (десктоп — в
  шапке рядом со «Связь»/«Заявка»; мобайл — в нижнем меню `[📶][💬][🛟][☰]`) → открывается модалка
  (десктоп) / полноэкранный Sheet (мобайл) → iframe грузит RC и пользователь УЖЕ залогинен (без формы
  входа), видит свои 2 канала.
- На мобайле кнопки «Связь» и «Заявка» переехали вниз и работают оттуда; верхняя панель чистая.
- Можно написать сообщение в канал и получить ответ (проверить с координатором: он ответит из RC).
- Console без CORS/X-Frame ошибок; origin сообщений проверяется.

---

## ФАЗА 5 — Документация и хвосты

1. Описать реализацию в `docs/chat-rocketchat-integration.md` (этот же каталог): что сделано, эндпоинты,
   таблица маппинга, как провижинить новую компанию, как вернуть `Iframe_Restrict_Access=true` для прода.
2. Отметить, что НЕ входит в PoC и остаётся на «свой UI»: брендинг, привязка к заявке, realtime-DDP,
   миграция со старого TSupport-чата.
3. Прод-готовность: для `prod.dataworker.ru` добавить origin в `Iframe_Integration_receive_origin`,
   вернуть `Iframe_Restrict_Access=true` с точным origin, проверить CSP.

**Критерии приёмки Ф5:** документ есть, прод-чеклист описан.

---

## Правила и ограничения
- Прод RC и его контейнеры не ломать; настройки менять только перечисленные; перед правкой
  haproxy/конфигов — бэкап и `-c`/reload.
- Секреты (RC admin pass, токены, пароли guest) — НЕ в git, только в `Servera/vault/rocketchat-admin.md`.
- После каждой фазы — СТОП, отдать результат координатору на проверку (он сверяет по «Критериям приёмки»).
- Координация с другими AI-агентами — через `AI-WORKFLOW.md` / `AI-BOARD.md`, если правишь общие части.
- Вопросы/блокеры (особенно: создание сервисного RC-аккаунта + PAT с `bypassTwoFactor`,
  правка HAProxy) — согласовывать с координатором ДО выполнения.
