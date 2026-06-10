/**
 * InfoCenter — раздел «Инфо».
 *  - Часть A: инструкции по приложению (markdown в репо, manifest) — всегда, офлайн в бандле.
 *  - Часть B: база знаний компании (PostgreSQL, /api/kb) — по выбранной сети, изоляция на backend.
 *  - Контакты компании + федеративный поиск (A локально + B/контакты с сервера).
 *
 * Раскладка адаптивна через CSS (md), без JS-ветвления → нет вспышки на мобайле. B/контакты/поиск
 * деградируют мягко: при отсутствии сети/связи показываются только инструкции A.
 * Версионирование/редактор/PDF/TOC — дальнейшие фазы (docs/info-knowledge-base-AGENT-TASK.md §13).
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Search, BookOpen, Type, Library, Phone, Mail, Users } from 'lucide-react';
import { useSupportContext } from '@/contexts/SupportContext';
import { useSelection } from '@/contexts/SelectionContext';
import { HELP_ARTICLES, findArticleByRoute, findArticleById, type HelpArticleMeta } from '@/content/help/manifest';
import {
  fetchKbTree, fetchKbArticle, fetchKbContacts, searchKb,
  type KbArticleListItem, type KbArticle, type KbContact, type KbSearchResult,
} from '@/services/knowledgeBase';
import MarkdownRenderer from './MarkdownRenderer';

const FONT_STEPS = [16, 18, 20];
const FONT_KEY = 'kb:fontStep';

type Selected =
  | { kind: 'a'; id: string }
  | { kind: 'b'; id: string }
  | { kind: 'contact'; id: string }
  | null;

// Подсветка сниппета: backend отдаёт фрагмент с маркерами <<...>>. Рендерим React-узлами (без HTML).
function Snippet({ text }: { text: string }) {
  const parts = text.split(/<<|>>/);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <mark key={i} className="rounded px-0.5 bg-amber-200 text-slate-900 dark:bg-amber-500/30 dark:text-amber-100">{p}</mark>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function InfoCenter({ initialArticleId }: { initialArticleId?: string }) {
  const { pathname } = useLocation();
  const { infoTarget } = useSupportContext();
  let networkId: string | null = null;
  let networkName = '';
  try {
    const sel = useSelection();
    networkId = sel.selectedNetwork?.id ?? null;
    networkName = sel.selectedNetwork?.name ?? '';
  } catch { /* вне SelectionProvider (тесты) — работаем только с частью A */ }

  // Стартовая статья A: явная цель → проп → по роуту → первая.
  const startId = useMemo(
    () =>
      findArticleById(infoTarget?.articleId)?.id ||
      findArticleById(initialArticleId)?.id ||
      findArticleByRoute(pathname)?.id ||
      HELP_ARTICLES[0]?.id,
    [infoTarget?.articleId, initialArticleId, pathname],
  );

  const [selected, setSelected] = useState<Selected>(startId ? { kind: 'a', id: startId } : null);
  const [aContent, setAContent] = useState('');
  const [bArticle, setBArticle] = useState<KbArticle | null>(null);
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState('');
  const [fontStep, setFontStep] = useState(() => {
    const v = Number(localStorage.getItem(FONT_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 2 ? v : 0;
  });

  // Часть B + контакты (по сети)
  const [bArticles, setBArticles] = useState<KbArticleListItem[]>([]);
  const [contacts, setContacts] = useState<KbContact[]>([]);
  const [serverSearch, setServerSearch] = useState<KbSearchResult | null>(null);
  const [aExpanded, setAExpanded] = useState(false); // «Работа с приложением» — свёрнута по умолчанию

  // Внешняя цель (повторный openInfo).
  useEffect(() => {
    if (infoTarget?.articleId) {
      const id = findArticleById(infoTarget.articleId)?.id;
      if (id) setSelected({ kind: 'a', id });
    }
  }, [infoTarget?.articleId]);

  useEffect(() => { localStorage.setItem(FONT_KEY, String(fontStep)); }, [fontStep]);

  // Загрузка дерева B + контактов при выбранной сети (мягко: ошибки → пусто).
  useEffect(() => {
    let alive = true;
    if (!networkId) { setBArticles([]); setContacts([]); return; }
    fetchKbTree(networkId).then((r) => { if (alive) setBArticles(r.articles || []); }).catch(() => { if (alive) setBArticles([]); });
    fetchKbContacts(networkId).then((r) => { if (alive) setContacts(r.contacts || []); }).catch(() => { if (alive) setContacts([]); });
    return () => { alive = false; };
  }, [networkId]);

  // Серверный поиск B (debounce + отмена in-flight).
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !networkId) { setServerSearch(null); return; }
    const t = setTimeout(() => {
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      searchKb(q, networkId, ac.signal)
        .then((r) => setServerSearch(r))
        .catch(() => { /* отменён или ошибка — оставляем как есть */ });
    }, 300);
    return () => clearTimeout(t);
  }, [query, networkId]);

  // Загрузка тела выбранного материала.
  useEffect(() => {
    let alive = true;
    setBArticle(null);
    if (!selected) { setAContent(''); return; }
    if (selected.kind === 'a') {
      const meta = findArticleById(selected.id);
      if (!meta) { setAContent(''); return; }
      setReading(true);
      meta.load()
        .then((md) => { if (alive) { setAContent(md); setReading(false); } })
        .catch(() => { if (alive) { setAContent('# Не удалось загрузить статью'); setReading(false); } });
    } else if (selected.kind === 'b') {
      setReading(true);
      fetchKbArticle(selected.id)
        .then((a) => { if (alive) { setBArticle(a); setReading(false); } })
        .catch(() => { if (alive) { setBArticle(null); setReading(false); } });
    }
    return () => { alive = false; };
  }, [selected]);

  // Список A (группировка + клиентский фильтр).
  const aGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = HELP_ARTICLES.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.keywords?.some((k) => k.includes(q)),
    );
    const byCat = new Map<string, HelpArticleMeta[]>();
    for (const a of [...filtered].sort((x, y) => x.order - y.order)) {
      if (!byCat.has(a.category)) byCat.set(a.category, []);
      byCat.get(a.category)!.push(a);
    }
    return Array.from(byCat.entries());
  }, [query]);

  const queryActive = query.trim().length >= 2;
  // B-список: при поиске — серверная выдача; иначе всё дерево.
  const bList = queryActive ? (serverSearch?.articles ?? []) : bArticles;
  const contactList = queryActive ? (serverSearch?.contacts ?? []) : contacts;

  const selectedTitle = useMemo(() => {
    if (!selected) return 'Инструкции';
    if (selected.kind === 'a') return findArticleById(selected.id)?.title ?? '';
    if (selected.kind === 'b') return bArticle?.title ?? '…';
    return contacts.concat(serverSearch?.contacts ?? []).find((c) => c.id === selected.id)?.full_name ?? '';
  }, [selected, bArticle, contacts, serverSearch]);

  const itemBtn = (active: boolean) =>
    `w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
      active ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
    }`;

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      {/* Список */}
      <div className={`${selected ? 'hidden' : 'flex'} md:flex w-full md:w-72 md:border-r border-border/50 flex-col min-h-0`}>
        <div className="p-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по справке и базе знаний…"
              aria-label="Поиск"
              className="w-full bg-secondary border border-border rounded-md pl-8 pr-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <nav aria-label="Инструкции" className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
          {/* A — работа с приложением (свёрнута по умолчанию; при поиске авто-раскрывается) */}
          <div className="space-y-0.5">
            <button type="button" onClick={() => setAExpanded((v) => !v)} aria-expanded={aExpanded || queryActive}
              className="w-full flex items-center gap-2 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${aExpanded || queryActive ? 'rotate-90' : ''}`} />
              <BookOpen className="h-3.5 w-3.5" />
              <span className="flex-1 text-left">Работа с приложением</span>
              <span className="text-[10px] font-normal text-muted-foreground/70">{HELP_ARTICLES.length}</span>
            </button>
            {(aExpanded || queryActive) && (
              <>
                {aGroups.map(([cat, items]) => (
                  <div key={cat} className="space-y-0.5">
                    <div className="px-2 pt-1 text-[11px] font-medium text-muted-foreground/80">{cat}</div>
                    {items.map((a) => (
                      <button key={a.id} type="button" onClick={() => setSelected({ kind: 'a', id: a.id })}
                        className={itemBtn(selected?.kind === 'a' && selected.id === a.id)}>
                        {a.title}
                      </button>
                    ))}
                  </div>
                ))}
                {aGroups.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">В инструкциях ничего не найдено</div>}
              </>
            )}
          </div>

          {/* B — база знаний компании */}
          {(bList.length > 0 || (queryActive && networkId)) && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Library className="h-3.5 w-3.5" /> База знаний{networkName ? ` · ${networkName}` : ''}
              </div>
              {bList.map((a) => (
                <button key={a.id} type="button" onClick={() => setSelected({ kind: 'b', id: a.id })}
                  className={itemBtn(selected?.kind === 'b' && selected.id === a.id)}>
                  <span className="block truncate">{a.title}</span>
                  {'snippet' in a && a.snippet
                    ? <span className="block text-xs text-muted-foreground truncate"><Snippet text={a.snippet} /></span>
                    : null}
                </button>
              ))}
              {bList.length === 0 && <div className="px-2 py-1 text-xs text-muted-foreground">Ничего не найдено</div>}
            </div>
          )}

          {/* Контакты */}
          {contactList.length > 0 && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Контакты
              </div>
              {contactList.map((c) => (
                <button key={c.id} type="button" onClick={() => setSelected({ kind: 'contact', id: c.id })}
                  className={itemBtn(selected?.kind === 'contact' && selected.id === c.id)}>
                  <span className="block truncate">{c.full_name}</span>
                  {c.position && <span className="block text-xs text-muted-foreground truncate">{c.position}</span>}
                </button>
              ))}
            </div>
          )}
        </nav>
      </div>

      {/* Читальня */}
      <div className={`${selected ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 flex-col`}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
          <button type="button" onClick={() => setSelected(null)} aria-label="Назад к списку"
            className="md:hidden p-1.5 -ml-1 rounded-md text-foreground/80 hover:bg-secondary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">{selectedTitle}</div>
          {selected?.kind !== 'contact' && (
            <div className="flex items-center gap-0.5 text-muted-foreground" role="group" aria-label="Размер шрифта">
              <Type className="h-3.5 w-3.5 mr-0.5" />
              <button type="button" onClick={() => setFontStep((s) => Math.max(0, s - 1))} disabled={fontStep === 0}
                aria-label="Уменьшить шрифт" className="px-1.5 py-0.5 text-xs rounded hover:bg-secondary disabled:opacity-40">A−</button>
              <button type="button" onClick={() => setFontStep((s) => Math.min(2, s + 1))} disabled={fontStep === 2}
                aria-label="Увеличить шрифт" className="px-1.5 py-0.5 text-sm rounded hover:bg-secondary disabled:opacity-40">A+</button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {reading ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : selected?.kind === 'contact' ? (
            <ContactCard contact={contacts.concat(serverSearch?.contacts ?? []).find((c) => c.id === selected.id)} />
          ) : selected?.kind === 'b' && bArticle ? (
            <article className="instruction-content info-reading mx-auto max-w-[68ch] px-4 sm:px-6 py-5" style={{ fontSize: FONT_STEPS[fontStep] }}>
              <KbStatusCard article={bArticle} />
              <MarkdownRenderer content={bArticle.body_md} />
            </article>
          ) : selected?.kind === 'a' ? (
            <article className="instruction-content info-reading mx-auto max-w-[68ch] px-4 sm:px-6 py-5" style={{ fontSize: FONT_STEPS[fontStep] }}>
              <MarkdownRenderer content={aContent} />
            </article>
          ) : (
            <div className="flex h-full items-center justify-center text-center p-8">
              <div className="text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-60" />
                <p className="text-sm">Выберите материал слева</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const DOC_KIND_LABEL: Record<string, string> = {
  law: 'Закон', regulation: 'Регламент', lnd: 'ЛНД', guide: 'Инструкция', release: 'Что нового', other: 'Документ',
};

function KbStatusCard({ article }: { article: KbArticle }) {
  const eff = article.effective_date ? new Date(article.effective_date).toLocaleDateString('ru-RU') : null;
  return (
    <div className="not-prose mb-4 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-medium text-foreground">🏷 {DOC_KIND_LABEL[article.doc_kind] ?? 'Документ'}</span>
      {article.doc_number && <span>№ {article.doc_number}</span>}
      {eff && <span>✅ действует с {eff}</span>}
    </div>
  );
}

function ContactCard({ contact }: { contact?: KbContact }) {
  if (!contact) return <div className="p-8 text-center text-sm text-muted-foreground">Контакт не найден</div>;
  return (
    <div className="mx-auto max-w-[60ch] px-4 sm:px-6 py-6">
      <h2 className="text-xl font-semibold text-foreground">{contact.full_name}</h2>
      {contact.position && <p className="text-sm text-muted-foreground mt-0.5">{contact.position}</p>}
      {contact.responsibility && <p className="text-sm text-foreground/80 mt-3">{contact.responsibility}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {contact.phone && (
          <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-sm">
            <Phone className="h-4 w-4" /> {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border text-foreground px-3 py-1.5 text-sm hover:bg-secondary">
            <Mail className="h-4 w-4" /> {contact.email}
          </a>
        )}
      </div>
    </div>
  );
}
