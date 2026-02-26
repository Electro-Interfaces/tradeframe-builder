# Описание дизайн-системы TradeFrame Builder

## Общая философия

TradeFrame Builder — профессиональная торговая платформа для управления сетями АЗС. Дизайн построен на принципе **adaptive responsive** — не просто масштабирование, а полная адаптация интерфейса под устройство.

- **Единая тёмная тема** (light mode отсутствует) — slate/blue палитра, оптимизированная для длительной работы
- **PWA-first** — приложение устанавливается на любое устройство как нативное
- **Touch-friendly** — все интерактивные элементы минимум 44×44px

---

## Цветовая схема

| Назначение | Цвет | HSL |
|---|---|---|
| Фон | Тёмный сланцевый | `215 28% 12%` |
| Карточки | Чуть светлее | `217 32% 17%` |
| Акцент (primary) | Синий | `217 91% 60%` |
| Sidebar | Очень тёмный | `215 28% 10%` |
| Успех | Зелёный | `120 100% 40%` |
| Предупреждение | Жёлтый | `45 100% 55%` |
| Ошибка | Красный | `0 84% 60%` |

Бренд-акценты: `trade.blue`, `trade.purple`, `trade.green`, `trade.orange`.

Тени — 3 уровня: `soft` (2px), `medium` (4px), `large` (8px). Border-radius по умолчанию 12px.

---

## Desktop версия (≥ 768px)

### Layout

```
┌──────────────────────────────────────────────────────┐
│  HEADER (fixed, 80px)                                │
│  [TF Logo] TradeFrame v1.9.0  [Сеть▾] [ТТ▾] [Связь]│
│                                            [Профиль] │
├────────┬─────────────────────────────────────────────┤
│SIDEBAR │  MAIN CONTENT (flex-1, px-4/6/8)           │
│(16rem) │                                             │
│        │  ┌─ KPI Cards (grid 2-4 cols) ──────────┐  │
│ Группы │  │ Станций: 12  Online: 10  Выручка...  │  │
│ меню   │  └──────────────────────────────────────┘  │
│ (сворач│                                             │
│  ивае- │  ┌─ Charts (grid 2 cols) ──────────────┐  │
│  мые)  │  │ BarChart 350px    PieChart 350px     │  │
│        │  └──────────────────────────────────────┘  │
│        │                                             │
│        │  ┌─ Table (полноширинная) ─────────────┐  │
│        │  │ Header | Cols | Sortable | Filters   │  │
│        │  │ Row 1  |  ... | ...      | ...       │  │
│        │  └──────────────────────────────────────┘  │
└────────┴─────────────────────────────────────────────┘
```

- **Header** — фиксированный, содержит логотип, версию, селекторы сети/точки, кнопку связи, профиль
- **Sidebar** — 256px, постоянный, с группами меню (Торговые сети, Торговая точка, Администрирование, Настройки). Scroll position сохраняется в localStorage
- **Контент** — адаптивные отступы `px-4 → md:px-6 → lg:px-8`
- **Таблицы** — полноценные с сортировкой, фильтрами, пагинацией
- **Графики** — Recharts, высота 350px, grid 2 колонки

### Грид-система (Desktop)

```
KPI-карточки:     grid-cols-2 → lg:grid-cols-4
Графики:          grid-cols-2
Детализация:      grid-cols-3
Формы:            grid-cols-2
```

---

## Мобильная версия (< 768px)

### Layout

```
┌────────────────────────────┐
│ HEADER (relative)          │
│ [☰] [Сеть ▾]       [Связь]│
├────────────────────────────┤
│ [Торговая точка ▾]         │
│ bg-gray-800 rounded-lg     │
├────────────────────────────┤
│                            │
│ KPI Cards (grid-cols-1)    │
│ ┌────────────────────────┐ │
│ │ Станций: 12            │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Online: 10             │ │
│ └────────────────────────┘ │
│                            │
│ Charts (250px height)      │
│ ┌────────────────────────┐ │
│ │ BarChart (compact)     │ │
│ └────────────────────────┘ │
│                            │
│ Card-based data            │
│ ┌────────────────────────┐ │
│ │ ⛽ АИ-95    ✅ Успешно  │ │
│ │ Объем: 40л  Сумма: 2к  │ │
│ │ 💳 Карта    📅 12:30   │ │
│ └────────────────────────┘ │
│                            │
└────────────────────────────┘
```

### Ключевые отличия от Desktop

| Элемент | Desktop | Mobile |
|---|---|---|
| Sidebar | Постоянный (256px) | Sheet (burger-меню, 320px) |
| Header | Fixed, полный | Relative, упрощённый |
| Селектор ТТ | В header | Отдельный блок под header |
| Таблицы | `<Table>` с колонками | Карточки (`<Card>` стек) |
| Графики | 350px высота | 250px высота |
| Grid | 2-4 колонки | 1 колонка |
| Диалоги | Центрированные | Fullscreen / bottom sheet |
| Кнопки | Стандартные | min 44×44px |
| Padding | px-6/px-8 | px-3/px-4 |

### Мобильные таблицы → Карточки

Все основные таблицы имеют мобильную карточную версию:

- `OperationsTable` → `MobileOperationsTable` — карточки транзакций
- `CouponTable` → `CouponTableMobile` — карточки купонов
- `ShiftsTable` → `MobileShiftsTable` — карточки смен
- `ReceiptsTable` → `MobileReceiptsTable` — карточки чеков

Формат карточки: header (иконка + тип + badge статуса) → grid 3 колонки (метрики) → footer (способ оплаты + дата).

### Мобильные диалоги

`MobileDialog` — два режима:
- **Fullscreen** — полноэкранный для сложных форм
- **Bottom Sheet** — выезжает снизу (max 90vh, rounded-t-xl, drag indicator сверху)

На desktop оба режима fallback на стандартный `Dialog`.

---

## Мобильные оптимизации

### Браузерные фиксы

- **iOS Safari**: `overscroll-behavior: none` (нет bounce), `font-size: 16px` на input (нет zoom), backup auth данных при установке PWA
- **Android Chrome**: `100dvh` (динамический viewport с учётом клавиатуры)
- **Samsung Internet**: `touch-action: manipulation`
- **UC Browser**: минимальные анимации (0.1s)

### Safe Areas (iPhone notch)

```css
.mobile-safe-top    → padding-top: env(safe-area-inset-top)
.mobile-safe-bottom → padding-bottom: env(safe-area-inset-bottom)
```

### Производительность

- Pull-to-refresh **заблокирован** (overscroll-behavior: none) — вместо нативного используется кастомный
- `WebkitOverflowScrolling: touch` для плавной инерционной прокрутки
- Тонкие скроллбары (4-6px)
- Виброотклик при нажатии на элементы навигации

### Landscape (горизонтальная ориентация < 500px высоты)

```css
header { height: 48px !important; }
sidebar { width: 240px !important; }
```

### Tiny screens (≤ 320px)

```css
font-size: 14px;
button { min-height: 40px; }
```

---

## UI-компоненты (60 шт.)

Библиотека: **shadcn/ui** с кастомизацией через CVA (class-variance-authority) и Tailwind `cn()`.

| Категория | Кол-во | Примеры |
|---|---|---|
| Layout | 11 | card, sheet, dialog, drawer, sidebar, tabs, accordion |
| Формы | 13 | button, input, select, checkbox, switch, calendar, command |
| Навигация | 6 | dropdown-menu, breadcrumb, pagination, context-menu |
| Данные | 9 | table, badge, avatar, chart, tooltip, popover |
| Обратная связь | 11 | skeleton, empty-state, error-state, progress, toast, alert-dialog |
| Мобильные | 4 | mobile-button, mobile-dialog, mobile-table, mobile-text |
| Кастомные | 6 | dynamic-form, command-history, ComponentHealthIndicator |

---

## PWA

Поддержка установки на все платформы:

- **Chrome/Edge (Android, Desktop)** — `beforeinstallprompt` event → нативная кнопка установки
- **Safari iOS** — инструкция "Поделиться → На экран Домой"
- **Opera Mobile** — инструкция через меню
- **Yandex Browser** — "Установить приложение"

Промпт установки — `Card` с градиентом, фиксированный внизу экрана. Dismiss сохраняется в localStorage на 24 часа.

**Кэширование (Workbox):**
- API: NetworkFirst (timeout 5 сек, кэш 24 часа, max 100 записей)
- Статика: CacheFirst (30 дней, max 200)
- Шрифты Google: CacheFirst (1 год)

---

## Статистика дизайн-системы

| Метрика | Значение |
|---|---|
| UI-компонентов | 60 |
| Мобильных компонентов | 7 |
| CSS-переменных | ~40 |
| Mobile utility классов | ~30 |
| Breakpoint Desktop/Mobile | 768px |
| Тема | Только тёмная |
| Анимации | 200ms transitions |
| Min touch target | 44×44px |
