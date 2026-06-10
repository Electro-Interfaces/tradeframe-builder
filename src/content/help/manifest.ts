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
  {
    id: 'getting-started',
    title: 'С чего начать',
    category: 'Общее',
    order: 0,
    keywords: ['начало', 'обзор', 'вход', 'навигация', 'разделы', 'помощь'],
    load: () => import('./getting-started.md?raw').then((m) => m.default),
  },
  {
    id: 'equipment',
    title: 'Оборудование и связь',
    category: 'Торговая точка',
    order: 10,
    routes: ['/', '/point/equipment'],
    keywords: ['оборудование', 'статус', 'терминал', 'связь', 'сеть', 'нода', 'трк'],
    load: () => import('./equipment.md?raw').then((m) => m.default),
  },
  {
    id: 'network-pricing',
    title: 'Ценообразование сети',
    category: 'Торговые сети',
    order: 20,
    routes: ['/network/pricing'],
    keywords: ['цена', 'цены', 'прайс', 'топливо', 'стоимость', 'тариф', 'аи-92', 'дт'],
    load: () => import('./network-pricing.md?raw').then((m) => m.default),
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
