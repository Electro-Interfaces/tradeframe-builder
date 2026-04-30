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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, X, Image, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSupportContext } from '@/contexts/SupportContext';
import { createTicket, getCategories, uploadFiles } from '@/services/supportService';
import VoiceInputButton from './VoiceInputButton';
import type { TicketCategory, TicketPriority, TicketType } from '@/types/support';
import { MAX_FILE_SIZE, MAX_FILES_TICKET } from '@/types/support';

const selectTriggerCls = 'h-10 w-full bg-card border-border text-foreground';
const selectContentCls = 'bg-card border-border text-foreground';
const emptySelectValue = '__none__';

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
              <Select
                value={parentCategory || emptySelectValue}
                onValueChange={(value) => {
                  setParentCategory(value === emptySelectValue ? '' : value);
                  setChildCategory('');
                }}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value={emptySelectValue}>Выберите</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Подкатегория</label>
              <Select
                value={childCategory || emptySelectValue}
                onValueChange={(value) => setChildCategory(value === emptySelectValue ? '' : value)}
                disabled={childCategories.length === 0}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder={childCategories.length ? 'Выберите' : '—'} />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value={emptySelectValue}>{childCategories.length ? 'Выберите' : '—'}</SelectItem>
                  {childCategories.map(cat => (
                    <SelectItem key={cat.code} value={cat.code}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Приоритет + Тип */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Приоритет</label>
              <Select
                value={priority}
                onValueChange={value => setPriority(value as TicketPriority)}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="critical">Критический</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Тип</label>
              <Select
                value={type}
                onValueChange={value => setType(value as TicketType)}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="incident">Инцидент</SelectItem>
                  <SelectItem value="request">Запрос</SelectItem>
                  <SelectItem value="question">Вопрос</SelectItem>
                  <SelectItem value="problem">Проблема</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
