# Промпт: Дизайн-система TradePoint (Deep Intel)

> Используй этот промпт при работе с любым проектом ElsyPlus для применения единого стиля.
> Эталон: страница Оборудование в TradeFrame.

---

## Промпт для AI / разработчика

```
Применяй дизайн-систему TradePoint (Deep Intel) ко всем UI-компонентам.
Поддержка light и dark тем обязательна. Все цвета через CSS-переменные,
переключаются автоматически через :root / .dark.

═══════════════════════════════════════════════════════
ШРИФТЫ
═══════════════════════════════════════════════════════

- Заголовки: font-family "Manrope" (класс: font-headline)
  Подключение: Google Fonts <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@700;800&display=swap">
- Тело/метки: font-family "Inter" (по умолчанию)
  Подключение: Google Fonts <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">

═══════════════════════════════════════════════════════
ЦВЕТОВЫЕ ТОКЕНЫ (CSS-переменные)
═══════════════════════════════════════════════════════

Светлая тема (:root):
  --di-bg: #f7f9fb              (фон приложения)
  --di-surface: #f0f4f7         (фон секций)
  --di-surface-mid: #ffffff     (фон карточек)
  --di-surface-high: #ffffff    (фон при hover)
  --di-surface-lowest: #ffffff  (фон инпутов)
  --di-on-surface: #2a3439     (основной текст)
  --di-on-surface-variant: #566166  (вторичный текст)
  --di-primary: #565e74         (⚠ серый в светлой! не использовать для синего)
  --di-primary-light: #3b82f6   (синий акцент, ссылки)
  --di-outline-variant: #c5cdd3 (границы, разделители)

Тёмная тема (.dark):
  --di-bg: #0c1320
  --di-surface: #19202d
  --di-surface-mid: #1e2533     (фон карточек)
  --di-surface-high: #232a38    (фон при hover)
  --di-surface-lowest: #070e1b  (фон инпутов)
  --di-on-surface: #dce2f5
  --di-on-surface-variant: #c3c6d7
  --di-primary: #2563eb         (синий акцент)
  --di-primary-light: #b4c5ff   (светло-синий)
  --di-outline-variant: #434655

Tailwind config:
  di: {
    bg, surface, 'surface-low', 'surface-lowest', 'surface-mid',
    'surface-high', 'surface-highest', 'surface-bright',
    'on-surface', 'on-surface-variant',
    primary, 'primary-light', tertiary, 'tertiary-container',
    outline, 'outline-variant', 'error-container'
  }

═══════════════════════════════════════════════════════
КАРТОЧКИ
═══════════════════════════════════════════════════════

Базовый паттерн:
  bg-di-surface-mid rounded-xl border border-transparent
  hover:border-di-primary/20 transition-all p-4

Никаких shadow, никаких градиентов. Только border меняется при hover.
Padding одинаковый на mobile и desktop: p-4.

Пример:
  <div class="bg-di-surface-mid rounded-xl border border-transparent
              hover:border-di-primary/20 transition-all p-4">
    ...
  </div>

═══════════════════════════════════════════════════════
СТАТУС-ИНДИКАТОРЫ
═══════════════════════════════════════════════════════

Формат: цветная точка + текст uppercase

  <div class="flex items-center gap-1.5">
    <span class="w-2 h-2 rounded-full bg-green-500"></span>
    <span class="text-[10px] font-bold uppercase text-green-600">Онлайн</span>
  </div>

Цвета (Tailwind стандартные, НЕ hex):
  Успех/Онлайн:   bg-green-500  + text-green-600
  Внимание:        bg-amber-500  + text-amber-600
  Ошибка/Офлайн:  bg-red-500    + text-red-600
  Информация:      bg-blue-500   + text-blue-600

ЗАПРЕЩЕНО:
  ❌ Hex-цвета (#4ade80, #fbbf24, #f87171)
  ❌ Pill с border/glow/shadow
  ❌ dark: дубли цветов (dark:text-green-400)

═══════════════════════════════════════════════════════
ЗАГОЛОВОК СТРАНИЦЫ
═══════════════════════════════════════════════════════

Одна строка: название слева, кнопки справа.

  <div class="flex items-center justify-between gap-4 mb-6">
    <div class="flex-1 min-w-0">
      <h1 class="font-headline font-bold text-foreground text-lg md:text-xl">
        Название страницы
      </h1>
      <p class="text-[11px] text-muted-foreground">Подзаголовок / метаданные</p>
    </div>
    <div class="flex gap-3 items-center shrink-0">
      <!-- Кнопка обновить -->
      <button class="border-di-outline-variant/15 text-muted-foreground
                      hover:bg-di-surface-high rounded-md p-2">
        <RefreshCw class="w-4 h-4" />
      </button>
      <!-- Основное действие -->
      <button class="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-4 py-2
                      text-sm font-semibold">
        Действие
      </button>
    </div>
  </div>

НЕ использовать:
  ❌ Категорийные подзаголовки (УПРАВЛЕНИЕ ЦЕНАМИ)
  ❌ Градиенты на кнопках
  ❌ text-2xl и больше для заголовков страниц

═══════════════════════════════════════════════════════
ТИПОГРАФИКА ВНУТРИ КАРТОЧЕК
═══════════════════════════════════════════════════════

Метка (label):
  text-[10px] font-bold text-muted-foreground uppercase
  Или text-[10px] text-di-outline uppercase tracking-tighter

Значение (value):
  font-headline font-bold text-foreground
  Размеры: text-sm (компактно), text-lg (стандарт), text-xl (акцент)

Иконка устройства/элемента:
  Lucide React, w-4 h-4 (mobile) / w-5 h-5 (desktop)
  Цвет: text-di-primary-light (или text-blue-500 для universal)
  БЕЗ фоновой обёртки (никаких bg-blue-100 квадратов)

═══════════════════════════════════════════════════════
КНОПКИ
═══════════════════════════════════════════════════════

Outline (вторичное действие):
  border-di-outline-variant/15 text-muted-foreground
  hover:bg-di-surface-high

Primary (основное действие):
  bg-blue-600 hover:bg-blue-700 text-white

Danger (опасное действие):
  border-red-600 text-red-600 hover:bg-red-600 hover:text-white

ЗАПРЕЩЕНО:
  ❌ Зелёные кнопки (border-green-600)
  ❌ Оранжевые кнопки (bg-orange-600)
  ❌ Градиенты (bg-gradient-to-br)

═══════════════════════════════════════════════════════
ТАБЛИЦЫ
═══════════════════════════════════════════════════════

Desktop — border-separate с зазорами:

  <table class="w-full border-separate border-spacing-y-1.5">
    <thead>
      <tr class="text-[10px] font-bold text-muted-foreground uppercase text-left">
        <th class="px-4 py-3">Столбец</th>
      </tr>
    </thead>
    <tbody>
      <tr class="bg-di-surface-high hover:bg-di-surface-highest
                  transition-colors rounded-lg">
        <td class="px-4 py-4 first:rounded-l-xl last:rounded-r-xl">
          Значение
        </td>
      </tr>
    </tbody>
  </table>

Mobile — карточки с border-l-4 цветным:

  <div class="bg-card rounded-xl p-3.5 border-l-4 border-l-blue-500">
    ...
  </div>

═══════════════════════════════════════════════════════
ФИЛЬТРЫ
═══════════════════════════════════════════════════════

Плоская панель (всегда видна):
  bg-di-surface-mid rounded-xl border-transparent p-4
  Grid: grid-cols-2 md:grid-cols-4 gap-4

Лейблы инпутов:
  text-[10px] font-bold text-muted-foreground uppercase tracking-widest

Инпуты:
  border-di-outline-variant/20 bg-di-surface-lowest

═══════════════════════════════════════════════════════
KPI / STAT КАРТОЧКИ
═══════════════════════════════════════════════════════

  <div class="bg-di-surface-mid rounded-xl border-transparent p-5
              flex flex-col justify-between h-28">
    <span class="text-[10px] font-bold text-muted-foreground uppercase
                  tracking-widest">Метрика</span>
    <span class="font-headline text-4xl font-extrabold text-foreground
                  tracking-tight">42</span>
  </div>

Все числа — text-foreground (белые в тёмной, чёрные в светлой).
Никаких цветных чисел, иконок, badge внутри stat-карточек.

═══════════════════════════════════════════════════════
ПУСТЫЕ / ЗАГРУЗОЧНЫЕ СОСТОЯНИЯ
═══════════════════════════════════════════════════════

Загрузка:
  <RefreshCw class="w-5 h-5 text-blue-500 animate-spin" />
  <span class="text-muted-foreground text-sm">Загрузка...</span>

Пустое:
  <AlertCircle class="w-8 h-8 text-muted-foreground" />
  <p class="text-muted-foreground text-sm">Нет данных</p>

Без обёрток в квадраты, без bg-di-surface-high контейнеров для иконок.

═══════════════════════════════════════════════════════
SIDEBAR
═══════════════════════════════════════════════════════

- Сворачивается горизонтально до иконок (collapsible="icon", 48px)
- Все секции сворачиваемые (ChevronRight с rotate-90)
- Кнопка «» в header (ChevronsLeft/ChevronsRight)
- Drag-edge на правом краю для resize мышью
- Cookie persistence для collapsed state
- Нет border-r, нет shadow

═══════════════════════════════════════════════════════
ОБЩИЕ ЗАПРЕТЫ
═══════════════════════════════════════════════════════

❌ Градиенты (bg-gradient-to-br)
❌ Hex-цвета (#4ade80, #fbbf24, #f87171) — только Tailwind (green-500, amber-500, red-500)
❌ dark: дубли (dark:text-green-400 рядом с text-green-600) — один цвет
❌ Декоративные элементы без смысла (accent bars, progress bars без данных)
❌ shadow-md, shadow-lg на карточках
❌ Кислотные/неоновые цвета в светлой теме
❌ di-primary для синего в светлой теме (он серый #565e74) — использовать blue-500
❌ Pill с border + glow для статусов — только dot + text
❌ text-2xl+ для заголовков страниц (max text-xl)
❌ Разные стили на разных страницах
```

---

## Применение в новом проекте

1. Скопировать CSS-переменные (`--di-*`) в `index.css`
2. Добавить `di` секцию в `tailwind.config.ts`
3. Подключить шрифты Manrope + Inter
4. Использовать промпт выше при создании каждого компонента
