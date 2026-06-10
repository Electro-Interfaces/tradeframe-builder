# Раздел «Инфо» — инструкции по приложению + база знаний компании (ТЗ)

Дата: 2026-06-09
Статус: проектирование (реализация после согласования)
Версия приложения: 2.2.0
Ветка-основа: `chat-matrix-test` (кнопка «Инфо» уже есть как заглушка)

---

## 1. Цель

Превратить заглушку «Инфо» (кнопка в шапке/нижнем меню, `InteractionHost`) в полноценный
информационный центр из **двух пластов контента**:

- **A. Работа с приложением** — инструкции по TradePoint (цены, резервуары, смены,
  оборудование, заявки, чат…). Единые для всех клиентов, ведём мы (поставщик).
- **B. База знаний компании** — законодательство, нормы, требования, регламенты,
  локальные нормативные документы (ЛНД) конкретного клиента. У каждой компании своя,
  изоляция по сети. Ведём мы по поручению клиента (клиент только читает).

Принятые на старте решения (09.06.2026):

| Развилка | Решение |
| --- | --- |
| Источник инструкций (A) | markdown-файлы в репозитории, версионирование через git, деплой с кодом, клиент не правит |
| Кто ведёт базу знаний (B) | только мы (super-admin); клиент читает |
| Фиксация ознакомления (kb_acks) | **не** в MVP, чистый справочник; заложить как отложенную фазу |
| Объём | сначала спроектировать всё (этот документ), затем реализация по фазам |

---

## 2. Карта переиспользуемых паттернов (с путями)

| Что | Где | Как используем |
| --- | --- | --- |
| Кнопка «Инфо» (заглушка) | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\components\support\InteractionHost.tsx` (ветка `help`) | заменить заглушку на `<InfoCenter />` |
| Состояние модалки | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\contexts\SupportContext.tsx` (`interactionSection`, `toggleInteraction`) | открытие «Инфо», deep-link на статью |
| Текущий роут → читаемое имя | `SupportContext.tsx` (`ROUTE_NAMES`, `getSection`) | контекстная привязка статьи к экрану |
| Роутинг SPA + защита роли | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\App.tsx` (`<ProtectedRoute requireAdmin>`, `lazy`) | роут админ-редактора B |
| Пункты меню | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\components\layout\AppSidebar.tsx` (`adminMenuItems`) | пункт «База знаний» (админ) |
| Изоляция по компании/сети | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\services\matrixAdmin.js` (`getCompany`, `listCompanyMembers`, `member_network_ids`) | резолв компании по `networkId`, группировка ГИГ+БТО, проверка доступа |
| Реестр компаний-сетей | таблица `chat_matrix_companies` (network_id + member_network_ids) | опорная сущность «компания = одна/несколько сетей» |
| Backend-роут по образцу | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\routes\chat-matrix.js` (`requireAuth`, rate-limit, `networkId` из тела) | структура `server/routes/kb.js` |
| Санитайзинг/типографика | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\utils\sanitize.ts` (`sanitizeHtml`, богатый allowlist) | переиспользуем как есть |
| **Готовый редактор markdown** | `D:\Users\magsp\ELSYPLUS\TradeFrame\src\components\legal\MarkdownEditor.tsx` (табы Редактирование/Предпросмотр/Статистика) | каркас редактора менеджера; **конвертер заменить** на `react-markdown` |
| Мёртвая legacy-задумка | `src\components\help\InstructionModal.tsx` + `instructionsService` (файла НЕТ, импорт битый) + `types/instructions` — числится в `docs\_archive\migration\UNUSED_FEATURES.md` | **не тащим**, можно удалить |
| Миграции | `D:\Users\magsp\ELSYPLUS\TradeFrame\server\db\migrations\` (167–170 — чат) | новая миграция KB |

> Важно: `react-markdown` в зависимостях **нет**, а существующий `MarkdownEditor.tsx` рендерит
> markdown самописным regex-конвертером (без таблиц/ссылок/картинок/код-блоков — в самом коде
> помечено «нужно marked/remark»). Добавляем `react-markdown` + `remark-gfm` (см. §7) и используем
> его и в просмотре, и в превью редактора — единый корректный рендер вместо regex.

---

## 3. Архитектура: два независимых источника, один UI

```
                ┌─────────────────────────────────────────┐
                │            Раздел «Инфо»                  │
                │  (InfoCenter — модалка / deep-link /info) │
                └───────────────┬───────────────┬──────────┘
                                │               │
        ┌───────────────────────┘               └────────────────────────┐
        ▼                                                                 ▼
  A. Работа с приложением                              B. База знаний компании
  ───────────────────────                              ─────────────────────────
  Источник: markdown в репо                            Источник: PostgreSQL
  src/content/help/**/*.md + manifest.ts               kb_categories / kb_articles / kb_attachments
  Рендер целиком на фронте                             Backend /api/kb/* (изоляция по сети)
  Версии — git, деплой с кодом                         Ведём мы (admin), клиент читает published
  Видно: всем авторизованным                           Видно: членам компании (по доступу к сети)
```

Ключевой принцип: **A и B технически независимы**. A не трогает БД и backend (статика в
бандле). B — обычный CRUD в существующей PostgreSQL. `InfoCenter` объединяет их в одном
дереве и едином поиске на уровне frontend.

---

## 4. Часть A — инструкции по приложению (markdown в репозитории)

### 4.1. Хранение контента

```
src/content/help/
  manifest.ts                  # реестр статей: мета + ленивые импортёры
  getting-started.md
  network/pricing.md
  point/tanks.md
  point/equipment.md
  shift-reports.md
  support-chat.md
  support-tickets.md
  ...
```

`src/content/help/` (внутри `src/`) — Vite-glob импортирует надёжно и кладёт в бандл.
Папка `docs/` остаётся для проектной документации (HANDOVER и пр.) и не смешивается с
пользовательским контентом.

### 4.2. Манифест вместо frontmatter

Метаданные держим в типобезопасном манифесте, тело — в `.md` (без парсера frontmatter,
без новой зависимости `gray-matter`):

```ts
// src/content/help/manifest.ts
export interface HelpArticleMeta {
  id: string;                 // 'network-pricing'
  title: string;              // 'Ценообразование сети'
  category: string;           // 'Торговые сети'  (группа в дереве)
  order: number;              // порядок
  routes?: string[];          // ['/network/pricing'] — контекстная «?»
  keywords?: string[];        // для клиентского поиска
  load: () => Promise<string>;// () => import('./network/pricing.md?raw').then(m => m.default)
}

export const HELP_ARTICLES: HelpArticleMeta[] = [
  { id: 'getting-started', title: 'С чего начать', category: 'Общее', order: 0,
    load: () => import('./getting-started.md?raw').then(m => m.default) },
  { id: 'network-pricing', title: 'Ценообразование сети', category: 'Торговые сети', order: 30,
    routes: ['/network/pricing'], keywords: ['цена','прайс','топливо'],
    load: () => import('./network/pricing.md?raw').then(m => m.default) },
  // ...
];
```

`.md?raw` — Vite отдаёт содержимое строкой; `import()` делает тело lazy (в бандле «Инфо»
сидит только манифест, статьи подгружаются по клику).

### 4.3. Контекстная справка «?»

- Маленькая кнопка «?» рядом с заголовком страницы (или в шапке).
- По `location.pathname` ищем в `HELP_ARTICLES` статью, у которой `routes` содержит роут.
- Нашли → открываем «Инфо» сразу на этой статье (`toggleInteraction('help')` + выбранный
  `articleId`). Не нашли → открываем корень «Работа с приложением».
- Привязка опирается на уже существующий `ROUTE_NAMES` (тот же список роутов).

---

## 5. Часть B — база знаний компании (PostgreSQL)

### 5.1. Модель данных (новая миграция, следующий номер после 170)

```sql
-- Категории (разделы) базы знаний компании
CREATE TABLE kb_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id  UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES kb_categories(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_categories_network_idx ON kb_categories(network_id);

-- Статьи базы знаний компании
CREATE TABLE kb_articles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES kb_categories(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  body_md        TEXT NOT NULL DEFAULT '',
  status         TEXT NOT NULL DEFAULT 'draft',      -- draft | published
  doc_kind       TEXT,                               -- law | regulation | lnd | guide | other
  doc_number     TEXT,                               -- номер приказа/ЛНД (опц.)
  effective_date DATE,                               -- «действует с» (для ЛНД/регламентов)
  tags           TEXT[] NOT NULL DEFAULT '{}',
  sort_order     INT  NOT NULL DEFAULT 0,
  search_tsv     tsvector,                           -- full-text (триггер ниже)
  created_by     UUID REFERENCES users(id),
  updated_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_articles_network_status_idx ON kb_articles(network_id, status);
CREATE INDEX kb_articles_tsv_idx ON kb_articles USING GIN(search_tsv);

-- Полнотекстовый индекс (русская конфигурация)
CREATE FUNCTION kb_articles_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('russian', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('russian', coalesce(NEW.body_md,'')), 'B') ||
    setweight(to_tsvector('russian', array_to_string(NEW.tags,' ')), 'C');
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER kb_articles_tsv_trg BEFORE INSERT OR UPDATE ON kb_articles
  FOR EACH ROW EXECUTE FUNCTION kb_articles_tsv_update();

-- Вложения статей (PDF, картинки) — см. §5.3 о способе хранения
CREATE TABLE kb_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  mime        TEXT,
  size_bytes  BIGINT,
  file_path   TEXT NOT NULL,                         -- §12.5: файл на диске server/uploads/kb/, НЕ BYTEA
  checksum    TEXT,                                  -- sha256 для целостности
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_attachments_article_idx ON kb_attachments(article_id);

-- Справочник контактов компании (отдельный структурированный тип в поиске и дереве)
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- триграммы: опечатки, поиск по части ФИО/номера
CREATE TABLE kb_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  category_id    UUID REFERENCES kb_categories(id) ON DELETE SET NULL, -- группа (Экстренные/Ответственные/Подрядчики)
  full_name      TEXT NOT NULL,
  position       TEXT,                          -- должность
  responsibility TEXT,                          -- зона ответственности
  phone          TEXT,
  email          TEXT,
  note           TEXT,
  sort_order     INT NOT NULL DEFAULT 0,
  search_tsv     tsvector,                       -- to_tsvector('russian', ФИО+должность+зона+note)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_contacts_network_idx ON kb_contacts(network_id);
CREATE INDEX kb_contacts_tsv_idx     ON kb_contacts USING GIN(search_tsv);
-- триграммы по ФИО+телефону: опечатки и поиск по части фамилии/номера
CREATE INDEX kb_contacts_trgm_idx ON kb_contacts USING GIN ((full_name || ' ' || coalesce(phone,'')) gin_trgm_ops);

-- триграммы по заголовкам статей (опечатки/подстрока в дополнение к full-text)
CREATE INDEX kb_articles_title_trgm_idx ON kb_articles USING GIN (title gin_trgm_ops);

-- Отложено (НЕ в MVP): фиксация ознакомления с ЛНД
-- CREATE TABLE kb_acks ( id, article_id, user_id, article_version, acked_at );
```

Привязка к компании: статья принадлежит `network_id`. «Компания = одна или несколько
сетей» (ГИГ+БТО — одни лица) разрешается так же, как в чате — через
`chat_matrix_companies.member_network_ids`: при выборке статей берём список сетей компании
и отдаём статьи по всем им. Так контент, заведённый под ГИГ, виден и сотрудникам БТО.

### 5.2. Изоляция и доступ (КРИТИЧНО)

- **Чтение** (любой авторизованный): backend **не доверяет** `networkId` с фронта вслепую —
  резолвит сети, к которым у пользователя реально есть доступ (по `user_roles`/`roles`
  `scope=network`/`trading_point`, тем же запросом-паттерном, что `listCompanyMembers`).
  Отдаёт только `status='published'` статьи сетей компании пользователя.
- **Запись** (создание/правка/удаление, черновики): только роль admin/super (`requireAdmin`
  на фронте + проверка роли на backend write-эндпоинтах). Это соответствует «ведём только мы».
- Вложения отдаются строго через backend с той же проверкой доступа к сети статьи
  (никаких прямых ссылок на BYTEA/файлы).

### 5.3. Хранение вложений (РЕШЕНО §12.5 — диск)

- **Диск `server/uploads/kb/`** (как `inventory-adjustments`, паттерн уже в проде, `deploy-prod.yml`
  создаёт `server/uploads`). В БД — только метаданные (`file_path`, `mime`, `size_bytes`, `checksum`,
  через `article_id`→`network_id`). НЕ BYTEA: единая prod-БД (чат/цены/смены) не должна раздуваться
  сканами ЛНД (мегабайты), и её `pg_dump`/бэкап не должен их тащить.
- Отдача строго через `GET /api/kb/attachments/:id` с проверкой доступа к сети (НЕ открытый
  `express.static`). На загрузке — allowlist MIME по magic-bytes (pdf/png/jpeg), hard-лимит размера
  (глобальный `express.json` = 1 МБ; для вложений — отдельный multipart-лимит, см. §13.3).

---

## 6. API (backend `server/routes/kb.js`, по образцу `chat-matrix.js`)

```
# ── Чтение (requireAuth, изоляция по сети) ───────────────────────────────
GET  /api/kb/tree?networkId=...        → { company: Category[] с articles[] (только published) }
GET  /api/kb/articles/:id              → { article } (проверка доступа к сети статьи)
GET  /api/kb/search?q=...&networkId=.. → { articles[], contacts[] } (tsvector+trgm, сниппеты ts_headline, по доступным сетям)
GET  /api/kb/attachments/:id           → файл (Content-Type/Disposition, проверка доступа)
GET  /api/kb/contacts?networkId=...    → Contact[] (справочник контактов компании)

# ── Запись (requireAuth + admin) ─────────────────────────────────────────
POST   /api/kb/categories              { networkId, title, parentId?, icon?, sortOrder? }
PUT    /api/kb/categories/:id
DELETE /api/kb/categories/:id
POST   /api/kb/articles                { networkId, categoryId?, title, bodyMd, status, docKind?, docNumber?, effectiveDate?, tags? }
PUT    /api/kb/articles/:id
DELETE /api/kb/articles/:id
POST   /api/kb/articles/:id/attachments  (multipart/form-data)
DELETE /api/kb/attachments/:id
POST   /api/kb/contacts                { networkId, fullName, position?, responsibility?, phone?, email?, note?, categoryId? }
PUT    /api/kb/contacts/:id
DELETE /api/kb/contacts/:id
```

- `networkId` приходит из `SelectionContext` (как в `chat-matrix.js`).
- Rate-limit на write-эндпоинты (как `roomLimiter`).
- Часть A (инструкции) **API не требует** — она целиком на фронте.

Сервис-слой: `server/services/kbService.js` (резолв доступных сетей, выборки дерева/статей/
поиска, CRUD, выдача вложений). Регистрация роутера в `server/index.js` рядом с `/api/chat/matrix`.

---

## 7. Рендеринг markdown

Рекомендация: **`react-markdown` + `remark-gfm`** (таблицы, списки задач, автоссылки).

- Один общий компонент `src/components/info/MarkdownRenderer.tsx`, обёрнутый в `prose`
  (`@tailwindcss/typography` уже есть) для единой типографики и тёмной темы (`prose-invert`).
- Безопасность: `react-markdown` по умолчанию **не** вставляет сырой HTML — XSS-инъекции из
  тела статьи невозможны. `rehype-raw` не подключаем.
- Используется и для A (`.md` из репо), и для B (`body_md` из БД) — единый рендер.
- Зависимости lazy-грузятся внутри чанка «Инфо» (как `matrix-js-sdk` в чате) — на стартовый
  бандл не влияют.

Альтернатива без новой зависимости: компиляция `.md`→HTML на билде (vite-плагин) + рендер
санитизированного HTML через `dompurify`. Хуже для части B (контент из БД в рантайме), поэтому
основной путь — `react-markdown`.

---

## 8. Frontend — компоненты и точки входа

### 8.1. Точки входа
1. **Кнопка «Инфо»** (есть) → `InfoCenter` вместо заглушки в `InteractionHost.tsx`.
2. **Контекстная «?»** на странице → открыть «Инфо» на статье, привязанной к роуту (§4.3).
3. **Deep-link** роуты `/info` и `/info/:articleId` (опционально, фаза 4) — для прямых ссылок.

### 8.2. Структура UI (`InfoCenter`) — приоритет читателю (клиенту)

Десктоп — три зоны, центральная читаемая (как doc-сайт / Обсидиан reading view):
```
┌──────────────┬─────────────────────────────────┬──────────────┐
│ 🔎 Поиск…     │ Законодательство › Промбезопас.  │ НА СТРАНИЦЕ   │ ← хлебные крошки
│              │ ─────────────────────────────    │ • Общие       │
│ 📘 Приложение │ Промышленная безопасность        │ • Запреты     │ ← оглавление (TOC),
│ 📚 База знаний │ 🏷 ЛНД · №12-ПБ · с 01.06.2026   │ • Действия    │   якоря, sticky
│ 👤 Контакты   │ · ~4 мин                         │ • Контакты    │
│              │ **Запрещено** курить…            │               │
│ ★ Недавнее    │ См. также: [[Регламент АЗС]]      │               │ ← вики-связь
│ ☆ Закладки    │ 📎 Скачать оригинал (PDF)         │               │ ← вложение
└──────────────┴─────────────────────────────────┴──────────────┘
```
- Левая колонка: дерево (A + B), раздел «👤 Контакты», «Недавнее», «Закладки».
- Раздел B и «Контакты» показываются, только если для текущей сети есть данные.
- Мобайл — drill-down (см. §8.5); TOC схлопнут сверху.
- Дизайн — по эталону Equipment (без градиентов/кислотных цветов/hex; токены дизайн-системы).

### 8.2a. Фичи удобства чтения (выбраны в MVP)
- **Оглавление статьи (TOC)** — якоря по заголовкам markdown, sticky-колонка справа на десктопе,
  схлопнутый блок сверху на мобайле. Клик → плавный скролл к разделу.
- **Вики-ссылки `[[…]]`** — в `MarkdownRenderer` препроцессим `[[id|текст]]` / `[[Название]]`
  в внутренние ссылки на статью KB (remark-плагин или предобработка строки). Внизу статьи —
  блок «Связанные» (по тегам/явным ссылкам). Обсидиан-стиль для перекрёстных ссылок нормативки.
- **Закладки + «Недавнее»** — клиентское хранилище (localStorage по `user.id`): список последних
  открытых и помеченных звёздочкой статей; показываются в левой колонке и при пустом поиске.

### 8.3. Файлы frontend
```
src/components/info/
  InfoCenter.tsx          # дерево + поиск + просмотр; вставляется в InteractionHost
  KbTree.tsx              # дерево категорий (A + B) + раздел «Контакты»
  ArticleView.tsx         # шапка статьи (для B: doc_kind/effective_date/вложения) + рендер
  TableOfContents.tsx     # TOC по заголовкам статьи (якоря, sticky/схлопнутый)
  MarkdownRenderer.tsx    # react-markdown + prose + вики-ссылки [[…]]
  KbSearch.tsx            # объединённый поиск (A — клиентский, B+контакты — /api/kb/search)
  ContactCard.tsx         # карточка контакта (tel:/mailto:, должность, зона)
  HelpButton.tsx          # контекстная «?» по роуту
src/content/help/         # см. §4
src/services/knowledgeBase.ts   # API-клиент B/контакты + объединение с A для дерева/поиска
src/services/kbBookmarks.ts     # закладки + «Недавнее» (localStorage)
src/pages/admin/KnowledgeBaseAdmin.tsx       # список/редактор B + контакты (admin)
src/pages/admin/KnowledgeBaseArticleEditor.tsx
```

### 8.4. Админ-редактор B
- Роут `/admin/knowledge-base` (+ `/admin/knowledge-base/:id/edit`), `<ProtectedRoute requireAdmin>`.
- Пункт меню в `adminMenuItems` (`AppSidebar.tsx`): «База знаний», иконка `BookOpen`/`Library`.
- Экран: выбор сети (компании) → дерево категорий + список статей → редактор:
  заголовок, категория, тело (markdown textarea + live-preview через `MarkdownRenderer`),
  статус (draft/published), тип (`doc_kind`), номер, «действует с», теги, вложения.

---

## 8.5. Мобильная адаптация (приоритет — PWA, основной сценарий)

Формат контента и layout раздела «Инфо» рассчитаны в первую очередь на телефон.

**Формат контента:** основной — markdown → адаптивный HTML (reflow по ширине, масштаб
системного шрифта, поиск/выделение/копирование, тёмная тема, lazy-картинки, офлайн в PWA).
PDF — **только** прикреплённый оригинал документа (кнопка «Скачать оригинал» для юридической
точности ЛНД/приказа), а не способ чтения: A4 не делает reflow, требует зума и не
индексируется поиском приложения.

**Layout — drill-down (как в чате `RoomListPanel → ChatPanel`):**
```
ДЕСКТОП                          МОБАЙЛ
┌────────┬──────────────┐        Экран 1: список (дерево A+B, поиск)
│ дерево │   статья      │   →    тап по статье →
│  A/B   │  <Markdown/>  │        Экран 2: статья + кнопка «← Назад»
└────────┴──────────────┘
```
- Вход на мобайле — через кнопку «Инфо» в `BottomNav`; полноэкранная модалка или `vaul`-Drawer
  (`vaul` уже в зависимостях). Десктоп — две панели в общей модалке.
- Контекстная «?» открывает сразу статью (минуя список).

**Типографика и элементы под мобайл:**
- `prose prose-sm sm:prose-base`; на телефоне full-width (жёсткий `max-w` ~65ch — только desktop).
- Таблицы — в контейнере `overflow-x-auto` (широкие не влезают в экран).
- Картинки — `max-w-full h-auto`; длинные строки/код — `break-words`.
- Цели тапа ≥ 44px; учитывать `mobile-safe-top/bottom` (как в `AppSidebar`).

---

## 8.6. Эффективный поиск (ядро раздела)

Поиск — главная функция: без него база знаний/инструкции бесполезны. Два слоя в PostgreSQL,
федеративная выдача по источникам.

### Движок (PostgreSQL)
| Слой | Решает | Технология |
| --- | --- | --- |
| Полнотекстовый | морфология («цены» → «цена»), релевантность, стоп-слова | `to_tsvector('russian',…)` + `websearch_to_tsquery('russian', q)` + `ts_rank`; GIN на `search_tsv` |
| Триграммный | опечатки, частичный ввод, подстрока (фамилии, номера, коды) | `pg_trgm`, оператор `%` / `similarity()`, GIN `gin_trgm_ops` |

- **Ранжирование**: вес заголовка > тела > тегов (`setweight A/B/C`) → `ts_rank`.
- **Сниппеты с подсветкой**: `ts_headline('russian', body_md, query, 'StartSel=<mark>,StopSel=</mark>')`.
- **Запросы человека**: `websearch_to_tsquery` понимает `"фразу"`, `-исключение`, `или`.

### Источники (federated)
- **📘 Инструкции (A)** — клиентский индекс в памяти (статей немного): нормализация + поиск по
  `title`/`keywords`/тексту. Мгновенно, офлайн в PWA, без сети.
- **📚 База знаний (B)** — серверный `GET /api/kb/search` (tsvector + trgm + headline + rank),
  **с изоляцией по сети** (только доступные клиенту published-документы).
- **👤 Контакты** — та же `/api/kb/search`: trgm по `ФИО+телефон` (опечатки, часть номера) +
  tsvector по должности/зоне/примечанию. Отдаются отдельным массивом `contacts[]`.
- Слияние и сортировка по типу+релевантности — на фронте; дебаунс ввода ~250 мс.

### UX
```
┌─────────────────────────────────────────────────┐
│ 🔎 пожарн|                                  [Esc] │  ← Cmd+K / поле сверху
├─────────────────────────────────────────────────┤
│ 📚 БАЗА ЗНАНИЙ                                     │
│  • Пожарная безопасность на АЗС          ЛНД №12  │
│    «…курить, при <mark>пожар</mark>е…»            │  ← сниппет ts_headline
│ 📘 ИНСТРУКЦИИ                                      │
│  • Действия оператора при ЧС                      │
│ 👤 КОНТАКТЫ                                        │
│  • Ответственный за ПБ — Иванов И.И.  ☎ …         │
└─────────────────────────────────────────────────┘
```
- Клик по результату → открыть статью + скролл к совпадению + подсветка.
- Пустой запрос → «Недавнее» + закладки.
- 0 результатов → «возможно, вы искали…» через `similarity()` по заголовкам/ФИО (trigram-подсказка).

---

## 9. RBAC — сводка

| Действие | Кто | Механизм |
| --- | --- | --- |
| Открыть «Инфо», читать A | любой авторизованный | без ограничений |
| Читать B (published) | члены компании | проверка доступа к сети (backend) |
| Видеть черновики B, создавать/править/удалять B | admin/super (мы) | `requireAdmin` фронт + проверка роли backend |
| Контекстная «?» | любой авторизованный | по роуту |
| Пункт «База знаний» в меню | admin | `menuVisibility.admin` / `requireAdmin` |

---

## 10. Фазы реализации

- **Фаза 0 — каркас A.** `MarkdownRenderer` (+ `react-markdown`/`remark-gfm`), `src/content/help/`
  с манифестом и 2–3 демо-статьями, `InfoCenter` заменяет заглушку «Инфо», контекстная «?»
  по роуту. Результат виден сразу, без backend.
- **Фаза 1 — наполнение A.** Инструкции по ключевым экранам (цены сети/ТТ, резервуары, смены,
  оборудование, заявки, чат, связь, остатки, поступления, купоны). Привязка `routes` к экранам.
- **Фаза 2 — backend B + контакты + поиск.** Миграция (kb_categories/articles/attachments/
  **contacts** + tsv-триггеры + `pg_trgm`), `server/routes/kb.js` + `kbService.js` (изоляция по
  сети, дерево/статьи/контакты, **`/api/kb/search` tsvector+trgm+headline**). Вывод раздела B,
  контактов и **поиска** в `InfoCenter` — поиск это ядро, не доводка.
- **Фаза 3 — читательские фичи.** TOC (якоря, sticky/схлопнутый), вики-ссылки `[[…]]` + блок
  «Связанные», закладки + «Недавнее» (localStorage), карточки контактов (tel:/mailto:).
- **Фаза 4 — админ-редактор B.** CRUD категорий/статей/контактов, markdown-редактор с preview
  (на базе `MarkdownEditor.tsx`, конвертер → `react-markdown`), вложения, выбор сети, статусы,
  пункт меню. Заведение реального контента клиента (мы вводим руками). Опц. deep-link `/info/:id`.
- **Фаза 5 — отложено (по решению, не MVP).** Ознакомление `kb_acks` + отчёт «кто не
  ознакомился» для админа компании. Включить, если появится требование комплаенса.

---

## 11. Решения и ограничения (зафиксировано)

- Часть A не использует БД/backend — версионируется git, деплоится с кодом, клиент не правит.
- Часть B — в существующей PostgreSQL; ведём только мы; клиент читает published.
- Markdown — `react-markdown` без сырого HTML (нет XSS из тела статьи).
- Вложения — BYTEA в БД (MVP, лимит ~10 МБ), отдача через backend с проверкой доступа.
- Изоляция B — backend резолвит доступные пользователю сети, не доверяет `networkId` слепо;
  группировка ГИГ+БТО — через `chat_matrix_companies.member_network_ids` (как в чате).
- **Контакты** — отдельный структурированный справочник `kb_contacts` (ФИО/должность/зона/
  телефон/email), ведём мы, изоляция по сети, отдельный тип в поиске и разделе дерева.
- **Поиск — ядро**: PostgreSQL `tsvector('russian')` (морфология) + `pg_trgm` (опечатки/подстрока),
  федеративная выдача A(клиент)/B+контакты(сервер), сниппеты `ts_headline`. Не «доводка».
- **Читательские фичи MVP**: оглавление (TOC), вики-ссылки `[[…]]`, закладки + «Недавнее».
- Переиспользуем `MarkdownEditor.tsx` (конвертер → `react-markdown`) и `sanitize.ts`;
  legacy `InstructionModal`/`instructionsService` (битый) — не используем.
- Ознакомление с ЛНД — вне MVP (заложено в модель и фазу 5).
- Дизайн — по эталону Equipment (дизайн-система TradePoint, без хардкод-цветов).

---

## 12. Открытые вопросы к согласованию

Контентные (решаются при наполнении):
1. Стартовый список экранов для инструкций A (фаза 1) — какие в первую очередь.
2. Стартовые категории базы знаний B (для ГИГ): «Законодательство / Промбезопасность / ЛНД / Регламенты».
3. Стартовые группы контактов (Экстренные / Ответственные / Подрядчики) и поля карточки.

Архитектурные развилки — **РЕШЕНЫ (10.06.2026):**
4. **Ознакомление с ЛНД → только чтение** (явный осознанный отказ от acks). Следствие (критика): в
   описании для клиента НЕ обещать «доведение ЛНД до сведения» — только «ознакомительная база для
   чтения». Задел в модели (`article_version`) оставить, реализацию acks не делать.
5. **Хранение вложений → диск `server/uploads/kb/`** (как inventory-adjustments). В БД — только
   метаданные (путь, mime, size, checksum, network_id). НЕ BYTEA (не раздувать единую prod-БД/бэкап).
6. **Модалка InfoCenter → `modal=true`** (Radix focus-trap, aria-hidden фона, scroll-lock; «Инфо» —
   destination, не «помощь рядом»). Внутренний Esc-стек поверх (поиск→Cmd+F→drill-down→закрыть).
7. **Версионирование нормативки → иммутабельные редакции** (паттерн `document_versions`): правка
   law/regulation/lnd = новая редакция, прежняя → archived. Питает карточку статуса и историю.

---

## 13. Глубокая проработка (multi-agent v2) — авторитетный слой

> Результат многоагентного анализа (6 заземлений + 4 дизайн-подхода + 3 судьи + 5 состязательных
> критик). Этот раздел **уточняет и местами отменяет** ранние §2–§11, опираясь на проверенный код.

### 13.1. Вердикт и видение
Единогласно (3 судьи, ~9.1/10) победил подход **«Reading-first — премиальная читальня нормативки»**.

**Видение «нашей фишки»:** «Инфо» — не справочник, а *читальня корпоративной нормативки*. Оператор
АЗС в 6 утра на телефоне под навесом открывает «Пожарную безопасность №12-ПБ», за 2 секунды видит
«✅ действует с 01.06.2026, ред. 3», читает пункт 4.3 крупным шрифтом без зума, отправляет коллеге
**постоянную ссылку именно на этот пункт**, при проверке скачивает юридически точный PDF-оригинал.
Премиальность = доверие к документу (статус/редакция) + комфорт чтения (reading-view) + адресуемость
(ссылка/цитата на пункт) + единый Cmd+K-поиск как дверь + офлайн (A) / онлайн (B). Конкуренты дают
PDF-свалку в облаке — мы даём живой, версионированный, адресуемый, ищущийся документ.

**Обязательные прививки от проигравших подходов:**
- *От палитры:* глобальный **Cmd/Ctrl+K** (cmdk, один listener в `SupportProvider`, `preventDefault`
  только когда фокус не в редактируемом поле); 4-й тип результата **«⚡ Действия»** (навигация из
  существующих `adminMenuItems/networkMenuItems/tradingPointMenuItems` — один источник правды, +
  «Позвонить дежурному»); **tap-to-act** из результата; `shouldFilter={false}` для серверных групп.
- *От компаньона:* контекстная **«?» по `location.pathname`/`ROUTE_NAMES`** (детерминированно, НЕ по
  DOM-скрейпу); контекстный **буст** выдачи (аддитивный тай-брейкер ПОСЛЕ scope-фильтра, не отдельный
  запрос); авто-**«Что нового»** по `APP_VERSION` (релиз-нота как статья A `doc_kind='release'`).
- *От графа:* блок **«Связанное»** (типизированные группы «Основано на / Исполняет / На это
  ссылаются») с **дешёвыми бэклинками** (вычисляются из `[[…]]`, БЕЗ графовых таблиц/триггеров в MVP);
  **контакт-как-ответственный**; мост **A↔B** через `[[…]]`. Полный граф-режим/мини-граф — НЕ в MVP.
- *Общее:* **Cmd+F внутри документа**; подсказка `similarity()` при 0 результатов.

### 13.2. Исправленные факты о коде (проверено агентами — отменяет допущения §2–§8)
- ✅ **pdfmake с кириллицей уже есть** (`src/utils/pdfMakeLoader.ts`, Roboto-VFS, `pdfmake ^0.2.20`) —
  клиентский PDF-экспорт почти бесплатен, серверная печать не нужна.
- ✅ Типографика чтения — реальный theme-aware класс **`.instruction-content`** (`src/index.css`),
  а НЕ `prose-invert`. Но в нём `font-size:15px` зашит — регулятор A−/A/A+ = новая работа.
- ✅ **cmdk + vaul уже обёрнуты** (`src/components/ui/command.tsx`, `drawer.tsx`). НО: Cmd+K глобально
  НЕ подключён; **vaul не используется ни одной страницей** (мёртв).
- ⚠️ **`use-debounce` — локальный хук** (`src/hooks/use-debounce.ts`), дебаунсит только значение,
  **не отменяет запросы** (нужен AbortController).
- ⚠️ **`HelpButton.tsx` существует, но `return null`** (заглушка) → переписать с нуля.
- ❌ **Миф во всех подходах:** «drill-down `RoomListPanel→ChatPanel` как в чате» — таких компонентов
  НЕТ; в `ChatPage` это инлайн `useState+isMobile` без vaul. Мобильный drill-down строить заново.
- ❌ **`matrix-js-sdk` течёт в главный бандл** (`index.js` 1.42 МБ, НЕ lazy) — «ленивый как matrix» —
  это **антипример**. Code-split здесь даёт только граница `React.lazy()` (как `ChatPage` в
  `InteractionHost`), НЕ `manualChunks`. `InfoCenter` обязан быть `lazy()`; `react-markdown`/`remark`
  импортировать только внутри него + `manualChunks: 'info-vendor'`. Вынос matrix из бандла — отд. задача.
- ❌ **pg_trgm / русская FTS НЕ установлены** (`001_extensions.sql` = только pgcrypto; `to_tsvector`
  нигде нет, весь существующий поиск — ILIKE).
- ✅ **Готовый движок жизненного цикла документов** — `server/db/migrations/040_legal.sql`
  (`document_versions`: status/version/is_current/checksum/changelog/published_at/archived_at;
  `user_document_acceptances`: IP/UA/revoke/привязка к версии) + `server/services/legal/legalPgSource.js`.
  **Переиспользовать, не изобретать третью модель версий.**
- ✅ **Готовый резолвер доступа** — `server/middleware/scopeFilter.js::getUserScope(req.user)`.
  `matrixAdmin` с `LIKE '%uuid%'` — **небезопасен** для KB (ложные совпадения сетей).
- ✅ **Дисковое хранилище уже есть** — `server/uploads/` (inventory-adjustments). `express.json` лимит = 1 МБ.
- ⚠️ **PWA:** `/api/*` = `NetworkOnly` (B офлайн = жёсткое падение). `autoUpdate` SW +
  `controllerchange→reload()` выкидывает читателя из документа при деплое.

### 13.3. Инварианты безопасности (ОБЯЗАТЕЛЬНО — главный риск задачи: утечка между компаниями)
- **Единый scope-резолвер `getUserScope` на КАЖДОМ `/api/kb/*`** (tree, articles/:id, search,
  contacts, attachments). networkId с фронта НЕ доверять.
- **Чтение:** фильтр `network_id = ANY($allowed::uuid[])` (структурно, не `LIKE '%uuid%'`).
  Для `/articles/:id`, `/attachments/:id` — достать network_id ресурса, проверить доступ → иначе **404**
  (не 403, чтобы не подтверждать существование).
- **Запись:** строго `super_admin`/`system_admin` (НЕ `hasAdminAccess` — он включает `network_admin`
  клиента); при ограниченной роли networkId обязан быть в scope; PUT/DELETE — проверять сеть ресурса.
- **Поиск:** каждый под-запрос (статьи, контакты-trgm, headline-фаза, similarity-подсказка, фасеты)
  строить через один билдер, всегда инжектящий scope. Пустой scope + не-super → пустая выдача, не
  «без фильтра». **e2e cross-tenant тест по КАЖДОМУ типу результата** (ГИГ не видит ЛНД/контакт/сниппет/
  подсказку чужого клиента).
- **Вложения:** allowlist MIME по magic-bytes (pdf/png/jpeg), hard-лимит размера до буферизации,
  всегда `Content-Disposition: attachment`, Content-Type из нашего allowlist, `X-Content-Type-Options:
  nosniff`, `CSP default-src 'none'`. Доступ → иначе 404.
- **Markdown/XSS:** `[[…]]` только внутренние (резолв в `/info/:id`, валидация UUID в доступной сети;
  битая → неактивный текст). Allowlist протоколов href (нет `javascript:`/`data:`). Внешние img —
  запретить или `referrerpolicy=no-referrer`. `target=_blank` → `rel=noopener noreferrer`. Сузить
  `sanitize.ts` для KB (убрать `style`, `id`). `<mark>` из ts_headline — собирать React-узлами
  (split-by-match), НЕ как HTML-строку.
- **Офлайн-кэш:** ключ `(user.id + networkId)`, очистка при logout/смене; контакты/ЛНД по умолчанию не
  кэшировать; «Недавнее/Закладки» = список id, чистится при logout. (Проще: для MVP без IndexedDB-B.)
- **`contextScore`** — аддитивный тай-брейкер ПОСЛЕ scope-фильтра, никогда не отдельный запрос по `routes[]`.

### 13.4. Поиск — hardening (поиск = ядро, фаза 2)
- **Расширения отдельной ранней миграцией** (`CREATE EXTENSION pg_trgm`, `unaccent`) от DBA-superuser,
  НЕ в KB-миграции таблиц (BEGIN/COMMIT откатит таблицы). **ILIKE+unaccent-фолбэк** в `kbService`, если
  trgm/russian недоступны → деградация, не падение. Guard версии PG (`websearch_to_tsquery` ≥ 11).
- **Кастомная конфигурация `kb_ru`**: russian-стеммер + simple для латиницы/цифр/марок («АИ-92», «ДТ»,
  «12-ПБ») + `unaccent` (ё→е). Коды/номера — в `tags` (вес C) + trgm по title.
- **`body_plain`** (markdown→plain при сохранении) для `tsvector` и `ts_headline` (не по сырому md).
  `ts_headline` только для top-N после `ts_rank` (LIMIT 8–10/группа), `MaxFragments/MaxWords` ограничены.
- **Единая стратегия ранга:** full-text первичен, trgm — фолбэк при 0; либо дискретные тиры (точное
  совпадение title → body → trgm). НЕ суммировать разные шкалы. Федеративные группы — фикс. порядок
  (📚→📘→👤→⚡), без кросс-групповой сортировки по сумме.
- **AbortController + seq-guard** на каждый запрос (stale-response гонка). `statement_timeout ~1500мс`.
  Дебаунс серверного слоя 300–350мс; локальные A/Действия — мгновенно.
- **Пороги trgm:** короткие (<4 симв.) → ILIKE подстрока/префикс; телефон → ILIKE `'%q%'` + trgm по
  ФИО. Фикстура 30–50 реальных запросов оператора (АИ92, дт, пожар, 12пб…) как acceptance-тест.
- **Масштаб:** составной `btree_gin (network_id, search_tsv)`; всегда LIMIT; `EXPLAIN ANALYZE` на 10k×30.
- **Индекс A:** предсобранный компактный индекс (title+keywords+леммы или MiniSearch/FlexSearch); полные
  `.md` остаются lazy для чтения; нормализация как у B (lowercase, ё→е); `keywords` — обязательное поле.
- **PDF-вложения не индексируются** → правило: текст нормы ОБЯЗАН быть в `body_md`; редактор
  предупреждает, если есть PDF, но тело почти пустое; опц. извлекать текстовый слой PDF (pdfjs) в индекс;
  OCR сканов — вне MVP, но факт неиндексируемости показывать админу.

### 13.5. Жизненный цикл контента (фаза 2/4)
- **Переиспользовать legal-модель:** добавить в `kb_articles` `version/is_current/archived_at/
  published_at/changelog/checksum`. Для `doc_kind IN (law, regulation, lnd)` — **иммутабельная
  опубликованная редакция** (правка → новая версия, прежняя → archived + `effective_until`,
  `supersedes_id`); для `guide/other` — in-place. Тип документа задаёт политику в `kbService`, не в UI.
- **Карточка статуса** наполняется: «действует» = published И `effective_date<=today` И
  (`effective_until` пуст ИЛИ `>=today`); иначе бейдж «Архив»/«Вступает в силу с…». Показывать поля
  условно (нет даты → не рисовать строку; для A — «Инструкция · ~N мин»).
- **Мягкое удаление/архив** вместо жёсткого CASCADE (операции над сетями в проекте часты и опасны).
  Осиротевшие статьи (`category_id IS NULL`) → раздел «Без категории», не прятать.
- **Редактор + импорт — ВПЕРЁД** (в одну фазу с backend B): загрузка `.md` + `.docx→markdown`
  (`mammoth`) — ручной ввод в textarea нереалистичен для десятков ЛНД на клиента. Owner/ответственный
  на сеть, журнал правок, канал заявок клиента через support/Plane. Пилот строго на ГИГ.
- **Единый `MarkdownRenderer`** (react-markdown+remark-gfm) и в просмотре, и в превью редактора
  (заменить regex `convertMarkdownToHtml` в `MarkdownEditor.tsx`, убрать `dangerouslySetInnerHTML`).
- **Русская сортировка** `COLLATE "ru-RU-x-icu"`; нормализация мусора из Word (NBSP, soft hyphen U+00AD).
- **Адресное пространство ссылок:** `[[kb:UUID|текст]]` (B) и `[[help:manifest-id|текст]]` (A) с явным
  префиксом; A-ссылки и `routes[]` проверять CI-линтом против манифеста/`ROUTE_NAMES`.

### 13.6. Мобайл / PWA / UX (фазы 0/3)
- **`modal=true`** для InfoCenter (destination) → Radix focus-trap + aria-hidden + scroll-lock; либо свой
  FocusScope + **Esc-стек** (поиск→Cmd+F→drill-down→закрыть). НЕ `CommandDialog` (тянет свой Dialog) —
  встроить `cmdk Command` панелью.
- **Deep-link `/info`, `/info/:articleId#anchor` — в MVP** (не фаза 4): постоянные ссылки на пункт —
  главная дифференциация. Расширить `SupportContext`: `openInfo(articleId?, anchor?)`. Внутренний
  history-стек, синхронизированный с `history.pushState/popstate`, чтобы системная «Назад» возвращала
  к предыдущей статье, а не закрывала PWA.
- **`scroll-margin-top` 64–80px** на заголовках reading-view (якоря под sticky-шапкой); `scrollIntoView`
  внутри скролл-контейнера статьи; IntersectionObserver `rootMargin` = высота шапки.
- **Регулятор шрифта A−/A/A+** — новая работа (CSS-переменная, база ≥16px против iOS-зума, localStorage).
- **`useIsMobile`** — синхронная инициализация из `matchMedia` (иначе вспышка десктоп-раскладки) либо
  адаптив на CSS-классах.
- **SW autoUpdate:** откладывать reload, когда открыт InfoCenter; тост «новая версия»; сохранять
  scroll/articleId+anchor в sessionStorage.
- **Состояния B и Контактов:** skeleton при загрузке, строка «временно недоступно · Повторить» при
  ошибке, «база пока наполняется» при пустом — НЕ исчезновение. A рендерить независимо и сразу.
- **HelpButton** переписать с нуля; единый слот в `PageShell`/шапке; для роутов без статьи —
  деградация в раздел + «инструкция готовится», не в корень; CI-линт `routes[]↔ROUTE_NAMES`.
- **Доступность:** эталон Equipment даёт токены, но `aria`/`role` в нём НЕТ — задать заново:
  `tree/treeitem`, `nav/aria-label`, иконочные кнопки — `aria-label`, активный TOC — `aria-current`,
  счётчик результатов — `aria-live`; контраст `<mark>` в обеих темах.
- **Состояния действий:** скачивание вложения/PDF-экспорт/tap-to-act — loading/error/прогресс;
  показывать размер до скачивания; на десктопе рядом с `tel:` — «Скопировать номер».

### 13.7. Уточнённые фазы
- **Фаза 0 — каркас A + чтение.** `lazy(InfoCenter)` вместо заглушки; `MarkdownRenderer`
  (react-markdown, чанк `info-vendor`); reading-view на `.instruction-content` + `scroll-margin` +
  A−/A/A+; 2–3 демо-статьи A; контекстная «?» по pathname (переписать `HelpButton`); deep-link
  `/info/:id#anchor`; `openInfo` в `SupportContext`. Видимо, без backend.
- **Фаза 1 — наполнение A.** Ключевые экраны; `keywords` обязательны; клиентский индекс A;
  «Что нового» по `APP_VERSION`.
- **Фаза 2 — backend B + поиск + безопасность (ядро).** Миграции (расширения отдельно/DBA;
  kb_categories/articles[+поля версий]/contacts; `body_plain`; `btree_gin`; tsv-триггер; `kb_ru`+unaccent
  + ILIKE-фолбэк); scope-резолвер `getUserScope` на ВСЕХ эндпоинтах; tree/articles/search/contacts/
  attachments (диск); инварианты безопасности §13.3 + cross-tenant e2e; глобальный Cmd+K; федеративный
  поиск (4 группы вкл. ⚡Действия); AbortController/seq; карточка статуса условно.
- **Фаза 3 — премиальное чтение.** TOC scroll-spy; постоянные ссылки/цитирование; «Связанное» +
  дешёвые бэклинки; `[[…]]` (kb:/help:); PDF-экспорт (pdfmake); Cmd+F в документе; матрица офлайна
  (A офлайн; экстренные контакты/ЧС-действия → в A); состояния (пусто/ошибка/офлайн/загрузка).
- **Фаза 4 — редактор + импорт.** CRUD + `.docx→mammoth`; иммутабельные редакции для lnd/regulation;
  owner/журнал; пилот ГИГ.
- **Фаза 2.5 (опц.)** — `kb_search_log` (анонимно, по сети, TTL).
- **Ознакомление (`kb_acks`) — НЕ реализуем** (решение §12.4: только чтение). Задел в модели
  (`article_version`) оставить. Важно: в клиентских материалах не позиционировать как «доведение ЛНД»,
  только «ознакомительная база для чтения».

### 13.8. Предусловия-блокеры (закрыть до/вместе с реализацией)
1. Проверить права `app_user` на prod для `CREATE EXTENSION`; согласовать DBA-пре-шаг (связано с
   [[reference_deploy_ci]] — одна prod-БД, миграции в неё же).
2. Вынести `matrix-js-sdk` из главного бандла (ленивый init) — иначе любая работа над стартовым весом
   PWA бессмысленна.
3. Решить хранение вложений (диск рекомендуется) и влияние на бэкап единой prod-БД — ДО релиза.
