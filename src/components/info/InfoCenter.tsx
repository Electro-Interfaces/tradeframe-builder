/**
 * InfoCenter — раздел «Инфо». Левая панель — 4 сворачиваемые секции (по умолчанию свёрнуты;
 * при поиске авто-раскрываются):
 *   📘 Работа с приложением — инструкции по приложению (markdown в репо, офлайн).
 *   📚 База знаний — УНИВЕРСАЛЬНАЯ нормативка (законы/ГОСТы/нормы), одна на все компании.
 *   📋 Локальные документы {компания} — ЛНД компании (уникальны для неё).
 *   👤 Контакты {компания} — справочник контактов компании.
 *
 * Изоляция — на backend (universal видно всем; локальные/контакты — по сети). Раскладка адаптивна
 * через CSS (md), без JS-ветвления. Детали — docs/info-knowledge-base-AGENT-TASK.md §13.
 */
import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Search, BookOpen, Type, Library, FileText, Phone, Mail, Users } from 'lucide-react';
import { useSupportContext } from '@/contexts/SupportContext';
import { useSelection } from '@/contexts/SelectionContext';
import { HELP_ARTICLES, findArticleByRoute, findArticleById, type HelpArticleMeta } from '@/content/help/manifest';
import {
  fetchKbTree, fetchKbArticle, fetchKbContacts, searchKb,
  type KbArticleListItem, type KbCategory, type KbArticle, type KbContact, type KbSearchResult, type KbTreePart,
} from '@/services/knowledgeBase';
import MarkdownRenderer from './MarkdownRenderer';

const FONT_STEPS = [16, 18, 20];
const FONT_KEY = 'kb:fontStep';
const EMPTY_PART: KbTreePart = { categories: [], articles: [] };

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

// Группировка статей по категориям (для режима просмотра).
function groupByCategory(articles: KbArticleListItem[], categories: KbCategory[]): [string, KbArticleListItem[]][] {
  const titleById = new Map(categories.map((c) => [c.id, c.title]));
  const order = categories.map((c) => c.title);
  const byCat = new Map<string, KbArticleListItem[]>();
  for (const a of articles) {
    const key = (a.category_id && titleById.get(a.category_id)) || 'Без категории';
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(a);
  }
  return Array.from(byCat.entries()).sort((x, y) => {
    const ix = order.indexOf(x[0]); const iy = order.indexOf(y[0]);
    return (ix === -1 ? 999 : ix) - (iy === -1 ? 999 : iy);
  });
}

// Сворачиваемый подраздел (2-й уровень: категория). Раскрытые пункты — с тонкой направляющей слева.
function CatGroup({ title, count, open, toggle, children }: { title: string; count: number; open: boolean; toggle: () => void; children: ReactNode }) {
  return (
    <div className="pt-1.5">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[13px] font-semibold text-foreground/70 hover:text-foreground hover:bg-secondary/60 transition-colors">
        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1 text-left truncate">{title}</span>
        <span className="text-[10px] font-normal text-muted-foreground/60 tabular-nums">{count}</span>
      </button>
      {open && <div className="ml-[15px] pl-2 border-l border-border/40 space-y-0.5 mt-0.5">{children}</div>}
    </div>
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
  } catch { /* вне SelectionProvider (тесты) */ }

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

  // Секции свёрнуты по умолчанию.
  const [aOpen, setAOpen] = useState(false);
  const [uniOpen, setUniOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  // Категории (2-й уровень) — свёрнуты по умолчанию; ключ `${prefix}:${title}`.
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  const toggleCat = (key: string) =>
    setOpenCats((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  // Данные B (по сети)
  const [universal, setUniversal] = useState<KbTreePart>(EMPTY_PART);
  const [local, setLocal] = useState<KbTreePart>(EMPTY_PART);
  const [contacts, setContacts] = useState<KbContact[]>([]);
  const [serverSearch, setServerSearch] = useState<KbSearchResult | null>(null);

  useEffect(() => {
    if (infoTarget?.articleId) {
      const id = findArticleById(infoTarget.articleId)?.id;
      if (id) setSelected({ kind: 'a', id });
    }
  }, [infoTarget?.articleId]);

  useEffect(() => { localStorage.setItem(FONT_KEY, String(fontStep)); }, [fontStep]);

  // Дерево (универсальное + локальное) и контакты. Универсальное доступно и без выбранной сети.
  useEffect(() => {
    let alive = true;
    fetchKbTree(networkId)
      .then((r) => { if (alive) { setUniversal(r.universal || EMPTY_PART); setLocal(r.company || EMPTY_PART); } })
      .catch(() => { if (alive) { setUniversal(EMPTY_PART); setLocal(EMPTY_PART); } });
    fetchKbContacts(networkId)
      .then((r) => { if (alive) setContacts(r.contacts || []); })
      .catch(() => { if (alive) setContacts([]); });
    return () => { alive = false; };
  }, [networkId]);

  // Серверный поиск (debounce + отмена in-flight).
  const searchAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setServerSearch(null); return; }
    const t = setTimeout(() => {
      searchAbort.current?.abort();
      const ac = new AbortController();
      searchAbort.current = ac;
      searchKb(q, networkId, ac.signal).then((r) => setServerSearch(r)).catch(() => { /* отменён/ошибка */ });
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
      meta.load().then((md) => { if (alive) { setAContent(md); setReading(false); } })
        .catch(() => { if (alive) { setAContent('# Не удалось загрузить статью'); setReading(false); } });
    } else if (selected.kind === 'b') {
      setReading(true);
      fetchKbArticle(selected.id).then((a) => { if (alive) { setBArticle(a); setReading(false); } })
        .catch(() => { if (alive) { setBArticle(null); setReading(false); } });
    }
    return () => { alive = false; };
  }, [selected]);

  const queryActive = query.trim().length >= 2;

  // A — инструкции (группы + клиентский фильтр).
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

  const uniGroups = useMemo(() => groupByCategory(universal.articles, universal.categories), [universal]);
  const localGroups = useMemo(() => groupByCategory(local.articles, local.categories), [local]);

  // Поисковые совпадения, разделённые на универсальные/локальные.
  const uniMatches = useMemo(() => (serverSearch?.articles ?? []).filter((a) => a.is_universal), [serverSearch]);
  const localMatches = useMemo(() => (serverSearch?.articles ?? []).filter((a) => !a.is_universal), [serverSearch]);
  const contactMatches = serverSearch?.contacts ?? [];

  const selectedTitle = useMemo(() => {
    if (!selected) return '';
    if (selected.kind === 'a') return findArticleById(selected.id)?.title ?? '';
    if (selected.kind === 'b') return bArticle?.title ?? '…';
    return contacts.concat(contactMatches).find((c) => c.id === selected.id)?.full_name ?? '';
  }, [selected, bArticle, contacts, contactMatches]);

  const itemBtn = (active: boolean) =>
    `w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
      active ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
    }`;

  // Заголовок сворачиваемой секции.
  const SectionHead = ({ icon: Icon, title, count, open, toggle }: { icon: typeof BookOpen; title: string; count: number; open: boolean; toggle: () => void }) => (
    <button type="button" onClick={toggle} aria-expanded={open}
      className="w-full flex items-center gap-2 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors">
      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      <Icon className="h-3.5 w-3.5" />
      <span className="flex-1 text-left truncate">{title}</span>
      <span className="text-[10px] font-normal text-muted-foreground/70">{count}</span>
    </button>
  );

  // Рендер статей B: просмотр — сворачиваемые категории; поиск — плоские совпадения.
  const renderB = (prefix: string, groups: [string, KbArticleListItem[]][], matches: KbSearchResult['articles']) =>
    queryActive
      ? matches.map((a) => (
          <button key={a.id} type="button" onClick={() => setSelected({ kind: 'b', id: a.id })}
            className={itemBtn(selected?.kind === 'b' && selected.id === a.id)}>
            <span className="block truncate">{a.title}</span>
            {a.snippet ? <span className="block text-xs text-muted-foreground truncate"><Snippet text={a.snippet} /></span> : null}
          </button>
        ))
      : groups.map(([cat, items]) => {
          const key = `${prefix}:${cat}`;
          return (
            <CatGroup key={key} title={cat} count={items.length} open={openCats.has(key)} toggle={() => toggleCat(key)}>
              {items.map((a) => (
                <button key={a.id} type="button" onClick={() => setSelected({ kind: 'b', id: a.id })}
                  className={itemBtn(selected?.kind === 'b' && selected.id === a.id)}>
                  {a.title}
                </button>
              ))}
            </CatGroup>
          );
        });

  const uniOpenEff = uniOpen || queryActive;
  const localOpenEff = localOpen || queryActive;
  const contactsOpenEff = contactsOpen || queryActive;
  const aOpenEff = aOpen || queryActive;

  return (
    <div className="flex h-full min-h-0 bg-background text-foreground">
      <div className={`${selected ? 'hidden' : 'flex'} md:flex w-full md:w-72 md:border-r border-border/50 flex-col min-h-0`}>
        <div className="p-2.5 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по справке и базе знаний…" aria-label="Поиск"
              className="w-full bg-secondary border border-border rounded-md pl-8 pr-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <nav aria-label="Разделы" className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4">
          {/* 📘 Работа с приложением */}
          <div className="space-y-0.5">
            <SectionHead icon={BookOpen} title="Работа с приложением" count={HELP_ARTICLES.length} open={aOpenEff} toggle={() => setAOpen((v) => !v)} />
            {aOpenEff && (
              <>
                {aGroups.map(([cat, items]) => {
                  const key = `a:${cat}`;
                  return (
                    <CatGroup key={key} title={cat} count={items.length} open={queryActive || openCats.has(key)} toggle={() => toggleCat(key)}>
                      {items.map((a) => (
                        <button key={a.id} type="button" onClick={() => setSelected({ kind: 'a', id: a.id })}
                          className={itemBtn(selected?.kind === 'a' && selected.id === a.id)}>{a.title}</button>
                      ))}
                    </CatGroup>
                  );
                })}
                {aGroups.length === 0 && <div className="px-2 py-2 text-xs text-muted-foreground">В инструкциях ничего не найдено</div>}
              </>
            )}
          </div>

          {/* 📚 База знаний (универсальная) */}
          {(universal.articles.length > 0 || (queryActive && uniMatches.length > 0)) && (
            <div className="space-y-0.5">
              <SectionHead icon={Library} title="База знаний" count={queryActive ? uniMatches.length : universal.articles.length} open={uniOpenEff} toggle={() => setUniOpen((v) => !v)} />
              {uniOpenEff && renderB('uni', uniGroups, uniMatches)}
            </div>
          )}

          {/* 📋 Локальные документы компании */}
          {(local.articles.length > 0 || (queryActive && localMatches.length > 0)) && (
            <div className="space-y-0.5">
              <SectionHead icon={FileText} title={`Локальные документы${networkName ? ` · ${networkName}` : ''}`} count={queryActive ? localMatches.length : local.articles.length} open={localOpenEff} toggle={() => setLocalOpen((v) => !v)} />
              {localOpenEff && renderB('local', localGroups, localMatches)}
            </div>
          )}

          {/* 👤 Контакты компании */}
          {(contacts.length > 0 || (queryActive && contactMatches.length > 0)) && (
            <div className="space-y-0.5">
              <SectionHead icon={Users} title={`Контакты${networkName ? ` · ${networkName}` : ''}`} count={queryActive ? contactMatches.length : contacts.length} open={contactsOpenEff} toggle={() => setContactsOpen((v) => !v)} />
              {contactsOpenEff && (queryActive ? contactMatches : contacts).map((c) => (
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
          <div className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">{selectedTitle || 'Инфо'}</div>
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
            <ContactCard contact={contacts.concat(contactMatches).find((c) => c.id === selected.id)} />
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
