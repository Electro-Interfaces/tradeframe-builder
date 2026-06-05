/**
 * CreateTicketDialog — «умное» создание заявки.
 *
 * Шаг 1 (ввод): клиент описывает проблему свободно — текстом, голосом (🎤) и/или
 * прикрепляет файлы. Никаких обязательных полей тема/категория/приоритет.
 * Шаг 2 (черновик): AI формирует заявку (тема/описание/категория/приоритет/тип),
 * клиент при желании правит и отправляет.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, X, Image, FileText, Sparkles, ChevronLeft, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSupportContext } from '@/contexts/SupportContext';
import { createTicket, createDraft, getCategories, uploadFiles } from '@/services/supportService';
import VoiceInputButton from './VoiceInputButton';
import type { TicketCategory, TicketPriority, TicketType } from '@/types/support';
import { MAX_FILE_SIZE, MAX_FILES_TICKET } from '@/types/support';

const selectTriggerCls = 'h-10 w-full bg-card border-border text-foreground';
const selectContentCls = 'bg-card border-border text-foreground';
const emptySelectValue = '__none__';

export default function CreateTicketDialog() {
  const { isCreateDialogOpen, closeCreateDialog, buildAppContext } = useSupportContext();

  const [step, setStep] = useState<'input' | 'draft'>('input');
  const [rawText, setRawText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Поля черновика (после AI — редактируемые)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [type, setType] = useState<TicketType>('incident');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<TicketCategory[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateDialogOpen) {
      getCategories().then(setCategories).catch(() => setCategories([]));
    } else {
      setStep('input');
      setRawText('');
      setFiles([]);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setType('incident');
      setCategory('');
    }
  }, [isCreateDialogOpen]);

  // плоский список категорий (для select черновика)
  const flatCategories: { code: string; name: string }[] = [];
  for (const c of categories) {
    flatCategories.push({ code: c.code, name: c.name });
    for (const ch of c.children || []) flatCategories.push({ code: ch.code, name: `— ${ch.name}` });
  }

  const handleVoice = (text: string) => setRawText(prev => (prev ? `${prev} ${text}` : text));

  const addFiles = (list: FileList | null) => {
    const newFiles = Array.from(list || []);
    const oversized = newFiles.find(f => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(`Файл "${oversized.name}" превышает ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
      return;
    }
    setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES_TICKET));
  };

  // Шаг 1 → AI формирует черновик
  const handleFormDraft = async () => {
    if (!rawText.trim() && files.length === 0) {
      toast.error('Опишите проблему или прикрепите файл');
      return;
    }
    setDrafting(true);
    try {
      const d = await createDraft(rawText.trim(), files.map(f => f.name));
      setTitle(d.title || '');
      setDescription(d.description || rawText.trim());
      setCategory(d.category || '');
      setPriority(d.priority || 'medium');
      setType(d.type || 'request');
      setStep('draft');
      if (d.ai === false) toast.message('AI временно недоступен — проверьте поля вручную');
    } catch (err: any) {
      // фоллбэк: переходим к черновику с исходным текстом
      setTitle(rawText.trim().slice(0, 60));
      setDescription(rawText.trim());
      setCategory('');
      setPriority('medium');
      setType('request');
      setStep('draft');
      toast.message('Не удалось оформить автоматически — заполните поля сами');
    } finally {
      setDrafting(false);
    }
  };

  // Шаг 2 → отправка заявки
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Укажите тему заявки');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        type,
        category: category || undefined,
        app_context: buildAppContext(),
      });
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

  const filesBlock = (
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
          onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
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
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
      <DialogContent className="sm:max-w-lg bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {step === 'input' ? (
              <><Sparkles className="h-4 w-4 text-primary" /> Опишите проблему</>
            ) : (
              <><Wand2 className="h-4 w-4 text-primary" /> Проверьте заявку</>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Расскажите своими словами, что случилось — можно надиктовать голосом 🎤 и приложить фото.
              Заявку оформим за вас.
            </p>
            <div>
              <div className="flex items-center justify-end mb-1">
                <VoiceInputButton onResult={handleVoice} />
              </div>
              <Textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder="Например: на Витебской колонка 3 не наливает 95-й, клиенты уезжают…"
                rows={6}
                className="bg-card border-border text-foreground placeholder:text-muted-foreground resize-none"
                autoFocus
              />
            </div>
            {filesBlock}
            <Button
              onClick={handleFormDraft}
              disabled={drafting || (!rawText.trim() && files.length === 0)}
              className="w-full bg-primary hover:bg-primary/80 text-white"
            >
              {drafting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wand2 className="h-4 w-4 mr-2" />}
              {drafting ? 'Оформляем заявку…' : 'Оформить заявку'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              Заявка оформлена автоматически. Поправьте, если нужно, и отправьте.
            </p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тема *</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-card border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Описание</label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                className="bg-card border-border text-foreground resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
                <Select value={category || emptySelectValue} onValueChange={v => setCategory(v === emptySelectValue ? '' : v)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value={emptySelectValue}>—</SelectItem>
                    {flatCategories.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
                <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
                  <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="critical">Критический</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <Select value={type} onValueChange={v => setType(v as TicketType)}>
                <SelectTrigger className={selectTriggerCls}><SelectValue /></SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="incident">Инцидент</SelectItem>
                  <SelectItem value="request">Запрос</SelectItem>
                  <SelectItem value="question">Вопрос</SelectItem>
                  <SelectItem value="problem">Проблема</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filesBlock}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setStep('input')}
                disabled={submitting}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Изменить
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="flex-1 bg-primary hover:bg-primary/80 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Отправить заявку
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
