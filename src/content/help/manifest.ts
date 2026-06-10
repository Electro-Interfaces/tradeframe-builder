/**
 * Реестр инструкций по приложению (часть A раздела «Инфо»).
 *
 * Контент — markdown-файлы в этой же папке, версионируются через git и деплоятся с кодом
 * (клиент их не правит). Метаданные держим здесь (типобезопасно, без парсера frontmatter),
 * тело статьи грузится лениво через `load()` (`*.md?raw`) — в стартовый бандл попадает
 * только манифест.
 *
 * `routes` — для контекстной привязки: «Инфо»/кнопка «?» на этом экране открывают статью.
 * `keywords` — для клиентского поиска по части A (обязательны при ревью контента).
 */
export interface HelpArticleMeta {
  id: string;
  title: string;
  category: string;
  order: number;
  routes?: string[];
  keywords?: string[];
  load: () => Promise<string>;
}

export const HELP_ARTICLES: HelpArticleMeta[] = [
  // ── Общее ───────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'С чего начать',
    category: 'Общее',
    order: 0,
    keywords: ['начало', 'обзор', 'вход', 'навигация', 'разделы', 'помощь'],
    load: () => import('./getting-started.md?raw').then((m) => m.default),
  },
  {
    id: 'profile',
    title: 'Профиль',
    category: 'Общее',
    order: 5,
    routes: ['/profile'],
    keywords: ['профиль', 'учётная запись', 'настройки', 'выход', 'пароль'],
    load: () => import('./profile.md?raw').then((m) => m.default),
  },

  // ── Торговые сети ───────────────────────────────────────
  {
    id: 'network-overview',
    title: 'Обзор сети',
    category: 'Торговые сети',
    order: 10,
    routes: ['/network/overview'],
    keywords: ['обзор', 'сеть', 'показатели', 'сводка', 'дашборд'],
    load: () => import('./network-overview.md?raw').then((m) => m.default),
  },
  {
    id: 'network-pricing',
    title: 'Ценообразование сети',
    category: 'Торговые сети',
    order: 12,
    routes: ['/network/pricing'],
    keywords: ['цена', 'цены', 'прайс', 'топливо', 'стоимость', 'тариф', 'аи-92', 'дт'],
    load: () => import('./network-pricing.md?raw').then((m) => m.default),
  },
  {
    id: 'operations',
    title: 'Операции и транзакции',
    category: 'Торговые сети',
    order: 14,
    routes: ['/network/operations-transactions'],
    keywords: ['операции', 'транзакции', 'продажи', 'чек', 'оплата', 'возврат'],
    load: () => import('./operations.md?raw').then((m) => m.default),
  },
  {
    id: 'online-orders',
    title: 'Онлайн-заказы',
    category: 'Торговые сети',
    order: 16,
    routes: ['/network/online-orders'],
    keywords: ['онлайн', 'заказы', 'агрегатор', 'приложение', 'налив', 'заправки'],
    load: () => import('./online-orders.md?raw').then((m) => m.default),
  },
  {
    id: 'fuel-inventory',
    title: 'Остатки топлива',
    category: 'Торговые сети',
    order: 18,
    routes: ['/network/fuel-inventory'],
    keywords: ['остатки', 'топливо', 'ёмкость', 'запас', 'сводка'],
    load: () => import('./fuel-inventory.md?raw').then((m) => m.default),
  },
  {
    id: 'receipts',
    title: 'Поступления',
    category: 'Торговые сети',
    order: 20,
    routes: ['/network/receipts'],
    keywords: ['поступления', 'приёмка', 'приход', 'поставка', 'слив'],
    load: () => import('./receipts.md?raw').then((m) => m.default),
  },
  {
    id: 'coupons',
    title: 'Купоны',
    category: 'Торговые сети',
    order: 22,
    routes: ['/network/coupons'],
    keywords: ['купоны', 'талоны', 'погашение', 'скидка'],
    load: () => import('./coupons.md?raw').then((m) => m.default),
  },
  {
    id: 'messages',
    title: 'Сообщения и рассылка',
    category: 'Торговые сети',
    order: 24,
    routes: ['/network/messages'],
    keywords: ['сообщения', 'рассылка', 'оповещения', 'уведомления'],
    load: () => import('./messages.md?raw').then((m) => m.default),
  },

  // ── Торговая точка ──────────────────────────────────────
  {
    id: 'prices-tt',
    title: 'Цены торговой точки',
    category: 'Торговая точка',
    order: 30,
    routes: ['/point/prices'],
    keywords: ['цены', 'точка', 'азс', 'топливо', 'доставка', 'терминал'],
    load: () => import('./prices-tt.md?raw').then((m) => m.default),
  },
  {
    id: 'tanks',
    title: 'Резервуары',
    category: 'Торговая точка',
    order: 32,
    routes: ['/point/tanks'],
    keywords: ['резервуары', 'уровень', 'остаток', 'датчик', 'книжный', 'реальный', 'инвентаризация'],
    load: () => import('./tanks.md?raw').then((m) => m.default),
  },
  {
    id: 'equipment',
    title: 'Оборудование и связь',
    category: 'Торговая точка',
    order: 34,
    routes: ['/', '/point/equipment'],
    keywords: ['оборудование', 'статус', 'терминал', 'связь', 'сеть', 'нода', 'трк'],
    load: () => import('./equipment.md?raw').then((m) => m.default),
  },
  {
    id: 'shift-reports',
    title: 'Сменные отчёты',
    category: 'Торговая точка',
    order: 36,
    routes: ['/point/shift-reports-v2', '/point/shift-dashboard'],
    keywords: ['смена', 'отчёт', 'оператор', 'продажи', 'закрытие'],
    load: () => import('./shift-reports.md?raw').then((m) => m.default),
  },

  // ── Администрирование ───────────────────────────────────
  {
    id: 'networks',
    title: 'Сети и торговые точки',
    category: 'Администрирование',
    order: 50,
    routes: ['/admin/networks'],
    keywords: ['сети', 'точки', 'азс', 'структура', 'код', 'привязка'],
    load: () => import('./networks.md?raw').then((m) => m.default),
  },
  {
    id: 'users-and-roles',
    title: 'Пользователи',
    category: 'Администрирование',
    order: 52,
    routes: ['/admin/users-and-roles'],
    keywords: ['пользователи', 'доступ', 'учётная запись', 'сотрудник', 'блокировка'],
    load: () => import('./users-and-roles.md?raw').then((m) => m.default),
  },
  {
    id: 'roles',
    title: 'Роли и права',
    category: 'Администрирование',
    order: 54,
    routes: ['/admin/roles'],
    keywords: ['роли', 'права', 'доступ', 'разрешения', 'область', 'scope'],
    load: () => import('./roles.md?raw').then((m) => m.default),
  },
  {
    id: 'audit',
    title: 'Журнал аудита',
    category: 'Администрирование',
    order: 56,
    routes: ['/admin/audit'],
    keywords: ['аудит', 'журнал', 'история', 'действия', 'кто', 'когда'],
    load: () => import('./audit.md?raw').then((m) => m.default),
  },
  {
    id: 'legal-documents',
    title: 'Правовые документы',
    category: 'Администрирование',
    order: 58,
    routes: ['/admin/legal-documents'],
    keywords: ['правовые', 'документы', 'соглашение', 'политика', 'редакция', 'публикация'],
    load: () => import('./legal-documents.md?raw').then((m) => m.default),
  },

  // ── Поддержка ───────────────────────────────────────────
  {
    id: 'support',
    title: 'Поддержка: чат и заявки',
    category: 'Поддержка',
    order: 70,
    routes: ['/support/chat', '/support/tickets', '/support/interaction'],
    keywords: ['поддержка', 'чат', 'заявка', 'вопрос', 'помощь', 'связаться'],
    load: () => import('./support.md?raw').then((m) => m.default),
  },
];

/** Статья, привязанная к текущему роуту (для контекстного входа). */
export function findArticleByRoute(pathname: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find((a) => a.routes?.includes(pathname));
}

/** Статья по id. */
export function findArticleById(id?: string): HelpArticleMeta | undefined {
  if (!id) return undefined;
  return HELP_ARTICLES.find((a) => a.id === id);
}
