/**
 * InfoCenter — раздел «Инфо» (фаза 0: инструкции по приложению, часть A).
 *
 * Десктоп — две зоны (список + читальня) одновременно; мобайл — drill-down (список ↔ статья
 * с кнопкой «Назад»). Раскладка адаптивна через CSS (брейкпоинт md), без JS-ветвления —
 * поэтому нет вспышки десктоп-раскладки на телефоне (см. критику §13.6).
 *
 * Контекстность: при открытии выбирается статья по текущему роуту (если есть привязка `routes`),
 * либо первая. Внешняя цель (openInfo / deep-link) переопределяет выбор.
 *
 * Дальше: база знаний компании (B), контакты, федеративный поиск, оглавление/якоря, вики-ссылки,
 * PDF — см. docs/info-knowledge-base-AGENT-TASK.md §13.
 */
import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, ChevronLeft, Search, BookOpen, Type } from 'lucide-react';
import { useSupportContext } from '@/contexts/SupportContext';
import { HELP_ARTICLES, findArticleByRoute, findArticleById, type HelpArticleMeta } from '@/content/help/manifest';
import MarkdownRenderer from './MarkdownRenderer';

const FONT_STEPS = [16, 18, 20];
const FONT_KEY = 'kb:fontStep';

export default function InfoCenter({ initialArticleId }: { initialArticleId?: string }) {
  const { pathname } = useLocation();
  const { infoTarget } = useSupportContext();

  // Стартовая статья: явная цель (openInfo) → проп (deep-link) → по роуту → первая.
  const startId = useMemo(
    () =>
      findArticleById(infoTarget?.articleId)?.id ||
      findArticleById(initialArticleId)?.id ||
      findArticleByRoute(pathname)?.id ||
      HELP_ARTICLES[0]?.id,
    [infoTarget?.articleId, initialArticleId, pathname],
  );

  const [selectedId, setSelectedId] = useState<string | undefined>(startId);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [fontStep, setFontStep] = useState(() => {
    const v = Number(localStorage.getItem(FONT_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 2 ? v : 0;
  });

  // Реакция на внешнюю цель (повторный openInfo с другим articleId).
  useEffect(() => {
    if (infoTarget?.articleId) {
      const id = findArticleById(infoTarget.articleId)?.id;
      if (id) setSelectedId(id);
    }
  }, [infoTarget?.articleId]);

  useEffect(() => {
    localStorage.setItem(FONT_KEY, String(fontStep));
  }, [fontStep]);

  const selected = findArticleById(selectedId);

  // Загрузка тела выбранной статьи.
  useEffect(() => {
    let alive = true;
    if (!selected) {
      setContent('');
      return;
    }
    setLoading(true);
    selected
      .load()
      .then((md) => {
        if (alive) {
          setContent(md);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) {
          setContent('# Не удалось загрузить статью\n\nПопробуйте позже.');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [selected]);

  // Дерево (группировка по категориям) + фильтр по запросу.
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = HELP_ARTICLES.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.keywords?.some((k) => k.includes(q)),
    );
    const byCat = new Map<string, HelpArticleMeta[]>();
    for (const a of [...filtered].sort((x, y) => x.order - y.order)) {
      if (!byCat.has(a.category)) byCat.set(a.category, []);
      byCat.get(a.category)!.push(a);
    }
    return Array.from(byCat.entries());
  }, [query]);

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      {/* Список — на мобайле скрыт, когда выбрана статья; на десктопе виден всегда */}
      <div
        className={`${selectedId ? 'hidden' : 'flex'} md:flex w-full md:w-72 md:border-r border-border/50 flex-col min-h-0`}
      >
        <div className="p-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по инструкциям…"
              aria-label="Поиск по инструкциям"
              className="w-full bg-secondary border border-border rounded-md pl-8 pr-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <nav aria-label="Инструкции" className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
          <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" /> Работа с приложением
          </div>
          {groups.map(([cat, items]) => (
            <div key={cat} className="space-y-0.5">
              <div className="px-2 pt-1 text-[11px] font-medium text-muted-foreground/80">{cat}</div>
              {items.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    a.id === selectedId
                      ? 'bg-primary text-white'
                      : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {a.title}
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
          )}
        </nav>
      </div>

      {/* Читальня — на мобайле скрыта, пока не выбрана статья; на десктопе видна всегда */}
      <div className={`${selectedId ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 flex-col`}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedId(undefined)}
            aria-label="Назад к списку"
            className="md:hidden p-1.5 -ml-1 rounded-md text-foreground/80 hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
            {selected ? selected.title : 'Инструкции'}
          </div>
          {/* Регулятор размера шрифта чтения */}
          <div className="flex items-center gap-0.5 text-muted-foreground" role="group" aria-label="Размер шрифта">
            <Type className="h-3.5 w-3.5 mr-0.5" />
            <button
              type="button"
              onClick={() => setFontStep((s) => Math.max(0, s - 1))}
              disabled={fontStep === 0}
              aria-label="Уменьшить шрифт"
              className="px-1.5 py-0.5 text-xs rounded hover:bg-secondary disabled:opacity-40"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => setFontStep((s) => Math.min(2, s + 1))}
              disabled={fontStep === 2}
              aria-label="Увеличить шрифт"
              className="px-1.5 py-0.5 text-sm rounded hover:bg-secondary disabled:opacity-40"
            >
              A+
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : selected ? (
            <article
              className="instruction-content info-reading mx-auto max-w-[68ch] px-4 sm:px-6 py-5"
              style={{ fontSize: FONT_STEPS[fontStep] }}
            >
              <MarkdownRenderer content={content} />
            </article>
          ) : (
            <div className="flex h-full items-center justify-center text-center p-8">
              <div className="text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-60" />
                <p className="text-sm">Выберите инструкцию слева</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
