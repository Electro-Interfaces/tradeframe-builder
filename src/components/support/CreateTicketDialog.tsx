/**
 * CreateTicketDialog — модалка создания заявки в TSupport
 * Доступна с любой страницы через SupportContext
 */

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, Send, Loader2, MapPin, Monitor, Route, Paperclip, X, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSupportContext } from '@/contexts/SupportContext';
import { createTicket, getCategories, uploadFiles } from '@/services/supportService';
import VoiceInputButton from './VoiceInputButton';
import type { TicketCategory, TicketPriority, TicketType } from '@/types/support';
import { MAX_FILE_SIZE, MAX_FILES_TICKET } from '@/types/support';

const selectCls = "h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 appearance-none cursor-pointer";

export default function CreateTicketDialog() {
  const { isCreateDialogOpen, closeCreateDialog, buildAppContext } = useSupportContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [type, setType] = useState<TicketType>('incident');
  const [parentCategory, setParentCategory] = useState('');
  const [childCategory, setChildCategory] = useState('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузить категории при каждом открытии (инвалидация кэша)
  useEffect(() => {
    if (isCreateDialogOpen) {
      getCategories().then(setCategories).catch((err) => {
        toast.error(`Категории: ${err.message}`);
      });
    }
  }, [isCreateDialogOpen]);

  // Reset при закрытии
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setType('incident');
      setParentCategory('');
      setChildCategory('');
      setFiles([]);
      setContextOpen(false);
    }
  }, [isCreateDialogOpen]);

  const selectedParent = categories.find(c => c.code === parentCategory);
  const childCategories = selectedParent?.children || [];

  // Обновить приоритет из категории
  useEffect(() => {
    if (childCategory) {
      const child = childCategories.find(c => c.code === childCategory);
      if (child?.default_priority) setPriority(child.default_priority);
    } else if (parentCategory) {
      const parent = categories.find(c => c.code === parentCategory);
      if (parent?.default_priority) setPriority(parent.default_priority);
    }
  }, [parentCategory, childCategory, categories, childCategories]);

  const handleVoiceResult = (text: string) => {
    setDescription(prev => prev ? `${prev} ${text}` : text);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Укажите тему заявки');
      return;
    }

    setSubmitting(true);
    try {
      const appContext = buildAppContext();

      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        type,
        category: childCategory || parentCategory || undefined,
        app_context: appContext,
      });

      // Загружаем файлы после создания заявки
      if (files.length > 0 && ticket?.id) {
        try {
          await uploadFiles(ticket.id, files);
        } catch (uploadErr: any) {
          toast.error(`Заявка создана, но файлы не загружены: ${uploadErr.message}`);
          closeCreateDialog();
          return;
        }
      }

      toast.success(files.length > 0 ? `Заявка создана (${files.length} файл(ов))` : 'Заявка создана');
      closeCreateDialog();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания заявки');
    } finally {
      setSubmitting(false);
    }
  };

  const appContext = isCreateDialogOpen ? buildAppContext() : null;

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
      <DialogContent className="sm:max-w-lg bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Новая заявка</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Тема */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Тема *</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Кратко опишите проблему"
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          {/* Описание + голос */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Описание</label>
              <VoiceInputButton onResult={handleVoiceResult} />
            </div>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Подробное описание проблемы..."
              rows={4}
              className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Файлы */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Вложения</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-primary dark:text-primary/70 hover:text-blue-300 transition-colors"
              >
                <Paperclip className="h-3 w-3" />
                Прикрепить
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.docx,.xlsx,.csv,.txt,.mp4,.webm"
                className="hidden"
                onChange={e => {
                  const newFiles = Array.from(e.target.files || []);
                  const oversized = newFiles.filter(f => f.size > MAX_FILE_SIZE);
                  if (oversized.length > 0) {
                    toast.error(`Файл "${oversized[0].name}" превышает ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
                    e.target.value = '';
                    return;
                  }
                  setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES_TICKET));
                  e.target.value = '';
                }}
              />
            </div>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card rounded px-2 py-1.5 text-xs">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-primary dark:text-primary/70 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 text-foreground/80">{file.name}</span>
                    <span className="text-muted-foreground flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-red-400 flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {files.length >= MAX_FILES_TICKET && (
                  <div className="text-[10px] text-muted-foreground">Максимум {MAX_FILES_TICKET} файлов</div>
                )}
              </div>
            )}
          </div>

          {/* Категория + Подкатегория */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
              <select
                value={parentCategory}
                onChange={e => { setParentCategory(e.target.value); setChildCategory(''); }}
                className={selectCls}
              >
                <option value="">Выберите</option>
                {categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Подкатегория</label>
              <select
                value={childCategory}
                onChange={e => setChildCategory(e.target.value)}
                disabled={childCategories.length === 0}
                className={selectCls}
              >
                <option value="">{childCategories.length ? 'Выберите' : '—'}</option>
                {childCategories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Приоритет + Тип */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TicketPriority)}
                className={selectCls}
              >
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критический</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TicketType)}
                className={selectCls}
              >
                <option value="incident">Инцидент</option>
                <option value="request">Запрос</option>
                <option value="question">Вопрос</option>
                <option value="problem">Проблема</option>
              </select>
            </div>
          </div>

          {/* Контекст приложения */}
          {appContext && (
            <div>
              <button
                type="button"
                onClick={() => setContextOpen(!contextOpen)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${contextOpen ? '' : '-rotate-90'}`} />
                Контекст приложения
              </button>
              {contextOpen && (
                <div className="mt-2 rounded-md bg-card/50 border border-border/50 p-3 space-y-2 text-xs text-muted-foreground">
                  {/* Раздел + страница */}
                  <div className="flex items-center gap-1.5">
                    <Route className="h-3 w-3 text-primary dark:text-primary/70" />
                    <span><span className="text-muted-foreground">{appContext.section} →</span> {appContext.routeName || appContext.route}</span>
                  </div>

                  {/* Сеть */}
                  {appContext.networkName && (
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span>Сеть: <span className="text-foreground">{appContext.networkName}</span></span>
                    </div>
                  )}

                  {/* ТТ */}
                  {appContext.tradingPointId && appContext.tradingPointId !== 'all' && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span>ТТ: <span className="text-foreground">{appContext.tradingPointName || appContext.tradingPointId}</span></span>
                    </div>
                  )}

                  {/* URL-фильтры */}
                  {appContext.urlParams && Object.keys(appContext.urlParams).length > 0 && (
                    <div className="text-muted-foreground font-mono text-[10px]">
                      Фильтры: {Object.entries(appContext.urlParams).map(([k, v]) => `${k}=${v}`).join(', ')}
                    </div>
                  )}

                  {/* Данные страницы */}
                  {appContext.pageData && Object.keys(appContext.pageData).length > 0 && (
                    <div className="border-t border-border/50 pt-1.5 text-muted-foreground font-mono text-[10px] break-all">
                      {JSON.stringify(appContext.pageData, null, 0)}
                    </div>
                  )}

                  {/* Размер экрана */}
                  <div className="text-muted-foreground text-[10px]">
                    Экран: {appContext.screenSize}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Кнопка отправки */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="w-full bg-primary hover:bg-primary/80 text-white"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Создать заявку
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
