/**
 * Админ-редактор базы знаний компании (часть B). Только поставщик (super_admin) — клиент читает.
 * Сеть берётся из выбора в шапке (SelectionContext). Запись идёт на backend /api/kb (гейт super).
 * Иммутабельные редакции (law/regulation/lnd): правка опубликованного создаёт новую версию.
 */
import { useEffect, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useSelection } from '@/contexts/SelectionContext';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Trash2, Eye, Pencil } from 'lucide-react';
import MarkdownRenderer from '@/components/info/MarkdownRenderer';
import {
  adminListKbArticles, fetchKbArticle, createKbArticle, updateKbArticle, deleteKbArticle,
  type KbAdminArticle, type KbArticleInput,
} from '@/services/knowledgeBase';

const DOC_KINDS: { value: string; label: string }[] = [
  { value: 'guide', label: 'Инструкция' },
  { value: 'lnd', label: 'ЛНД' },
  { value: 'regulation', label: 'Регламент' },
  { value: 'law', label: 'Закон' },
  { value: 'release', label: 'Что нового' },
  { value: 'other', label: 'Документ' },
];

const EMPTY: KbArticleInput = {
  title: '', bodyMd: '', status: 'draft', docKind: 'guide', docNumber: '', effectiveDate: '', tags: [],
};

export default function KnowledgeBaseAdmin() {
  const { selectedNetwork } = useSelection();
  const networkId = selectedNetwork?.id ?? null;
  const networkName = selectedNetwork?.name ?? '';

  const [articles, setArticles] = useState<KbAdminArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<KbArticleInput>(EMPTY);
  const [tagsText, setTagsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const reload = useCallback(() => {
    if (!networkId) { setArticles([]); return; }
    setLoading(true);
    adminListKbArticles(networkId)
      .then((r) => setArticles(r.articles || []))
      .catch((e) => toast.error(e.message || 'Не удалось загрузить список'))
      .finally(() => setLoading(false));
  }, [networkId]);

  useEffect(() => { reload(); }, [reload]);

  const newArticle = () => { setEditingId(null); setForm(EMPTY); setTagsText(''); setPreview(false); };

  const selectArticle = (id: string) => {
    setEditingId(id);
    fetchKbArticle(id)
      .then((a) => {
        setForm({
          title: a.title, bodyMd: a.body_md, status: a.status, docKind: a.doc_kind,
          docNumber: a.doc_number || '', effectiveDate: a.effective_date || '',
          categoryId: a.category_id, tags: [],
        });
        setTagsText('');
      })
      .catch((e) => toast.error(e.message || 'Не удалось открыть статью'));
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error('Укажите заголовок'); return; }
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    const payload: KbArticleInput = { ...form, tags, networkId: networkId || undefined, effectiveDate: form.effectiveDate || null, docNumber: form.docNumber || null };
    setSaving(true);
    try {
      if (editingId) {
        const r = await updateKbArticle(editingId, payload);
        toast.success(r.newRevision ? 'Сохранено как новая редакция' : 'Сохранено');
        if (r.newRevision && r.id) setEditingId(r.id);
      } else {
        const r = await createKbArticle(payload);
        toast.success('Статья создана');
        if (r.id) setEditingId(r.id);
      }
      reload();
    } catch (e) {
      toast.error((e as Error).message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    if (!window.confirm('Архивировать эту статью? Она перестанет показываться клиенту.')) return;
    try {
      await deleteKbArticle(editingId);
      toast.success('Статья архивирована');
      newArticle();
      reload();
    } catch (e) {
      toast.error((e as Error).message || 'Не удалось удалить');
    }
  };

  const upd = (patch: Partial<KbArticleInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <MainLayout fullWidth>
      <div className="h-full min-h-0 flex flex-col">
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">База знаний{networkName ? ` · ${networkName}` : ''}</h1>
          <button type="button" onClick={newArticle}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-3 py-1.5 text-sm">
            <Plus className="h-4 w-4" /> Новая статья
          </button>
        </div>

        {!networkId ? (
          <div className="flex-1 flex items-center justify-center text-center p-8 text-muted-foreground">
            Выберите сеть (компанию) в шапке, чтобы вести её базу знаний.
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex">
            {/* Список */}
            <div className="w-72 border-r border-border/50 overflow-y-auto shrink-0">
              {loading ? (
                <div className="flex items-center justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : articles.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">Статей пока нет</div>
              ) : (
                <ul className="p-2 space-y-0.5">
                  {articles.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => selectArticle(a.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                          editingId === a.id ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-secondary'
                        }`}>
                        <span className="block truncate">{a.title}</span>
                        <span className={`text-xs ${editingId === a.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {DOC_KINDS.find((k) => k.value === a.doc_kind)?.label} · {a.status}{a.is_current ? '' : ' · архив'} · v{a.version}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Редактор */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="max-w-3xl mx-auto space-y-3">
                <input value={form.title} onChange={(e) => upd({ title: e.target.value })} placeholder="Заголовок статьи"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-foreground text-base font-medium focus:outline-none focus:ring-1 focus:ring-primary" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="text-xs text-muted-foreground">Тип
                    <select value={form.docKind} onChange={(e) => upd({ docKind: e.target.value })}
                      className="mt-1 w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm">
                      {DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">Номер
                    <input value={form.docNumber || ''} onChange={(e) => upd({ docNumber: e.target.value })}
                      className="mt-1 w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm" />
                  </label>
                  <label className="text-xs text-muted-foreground">Статус
                    <select value={form.status} onChange={(e) => upd({ status: e.target.value })}
                      className="mt-1 w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm">
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликовано</option>
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">Действует с
                    <input type="date" value={form.effectiveDate || ''} onChange={(e) => upd({ effectiveDate: e.target.value })}
                      className="mt-1 w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-foreground text-sm" />
                  </label>
                </div>

                <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Теги через запятую"
                  className="w-full bg-secondary border border-border rounded-md px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary" />

                <div className="flex items-center gap-2 text-sm">
                  <button type="button" onClick={() => setPreview(false)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${!preview ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>
                    <Pencil className="h-3.5 w-3.5" /> Текст
                  </button>
                  <button type="button" onClick={() => setPreview(true)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded ${preview ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>
                    <Eye className="h-3.5 w-3.5" /> Предпросмотр
                  </button>
                  <span className="ml-auto text-xs text-muted-foreground">Markdown</span>
                </div>

                {preview ? (
                  <article className="instruction-content border border-border/50 rounded-md p-4 min-h-[300px]">
                    <MarkdownRenderer content={form.bodyMd || '_Пусто_'} />
                  </article>
                ) : (
                  <textarea value={form.bodyMd} onChange={(e) => upd({ bodyMd: e.target.value })}
                    placeholder="Текст статьи в формате Markdown…"
                    className="w-full min-h-[300px] bg-secondary border border-border rounded-md px-3 py-2 text-foreground text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-primary" />
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={save} disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary text-white px-4 py-2 text-sm disabled:opacity-60">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Сохранить
                  </button>
                  {editingId && (
                    <button type="button" onClick={remove}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border text-foreground px-3 py-2 text-sm hover:bg-secondary">
                      <Trash2 className="h-4 w-4" /> Архивировать
                    </button>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {editingId ? 'Правка опубликованной нормативки создаёт новую редакцию' : 'Новая статья'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
