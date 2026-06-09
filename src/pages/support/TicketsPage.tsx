/**
 * TicketsPage — страница списка заявок с деталями
 * Dual-panel: список слева, детали справа
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import PageShell from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Clock, Send, Loader2, RefreshCw,
  AlertCircle, CheckCircle2, Timer, ArrowUpCircle,
  MessageSquare, History, Tag, Building2, User,
  Calendar, ChevronRight, ChevronLeft, Inbox, FileText, Globe,
  Monitor, MapPin, Route, ChevronDown, UserCircle,
  Shield, Paperclip, X, Image as ImageIcon, File, SlidersHorizontal,
  AlarmClock, CheckCheck, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSupportContext } from '@/contexts/SupportContext';
import {
  getTickets, getTicket, getTicketActivity, sendTicketMessage, uploadFiles, updateTicket,
  markTicketRead, getTSupportMe,
  type TicketListResponse,
} from '@/services/supportService';
import type { SupportTicket, TicketActivity, TicketStatus, AppContext } from '@/types/support';
import { MAX_FILE_SIZE, MAX_FILES_TICKET } from '@/types/support';
import { canMarkResolved, canReopen } from '@/utils/ticketPermissions';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  TICKET_TYPE_LABELS,
} from '@/types/support';

const STATUS_ICONS: Record<TicketStatus, typeof Clock> = {
  new: AlertCircle,
  in_progress: Timer,
  waiting_customer: Clock,
  escalated: ArrowUpCircle,
  resolved: CheckCircle2,
  closed: CheckCircle2,
  cancelled: X,
  reopened: RefreshCw,
};

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-muted-foreground', medium: 'bg-primary/70', high: 'bg-amber-400', critical: 'bg-red-400',
};

// Единый минутный тик на все SLA-индикаторы: один таймер вместо setInterval на каждый тикет.
const _slaTickListeners = new Set<() => void>();
let _slaTickTimer: ReturnType<typeof setInterval> | null = null;
function useMinuteTick(): number {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force(n => n + 1);
    _slaTickListeners.add(cb);
    if (!_slaTickTimer) _slaTickTimer = setInterval(() => _slaTickListeners.forEach(f => f()), 60_000);
    return () => {
      _slaTickListeners.delete(cb);
      if (_slaTickListeners.size === 0 && _slaTickTimer) { clearInterval(_slaTickTimer); _slaTickTimer = null; }
    };
  }, []);
  return Date.now();
}

// ========== SLA Indicator ==========
function SlaIndicator({ deadline, breached }: { deadline?: string; breached?: boolean }) {
  const now = useMinuteTick();

  if (!deadline) return null;

  const dl = new Date(deadline).getTime();
  const diffMs = dl - now;
  const diffH = diffMs / (1000 * 60 * 60);

  if (breached || diffMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded animate-pulse">
        <AlarmClock className="h-3 w-3" /> SLA!
      </span>
    );
  }
  if (diffH > 4) return null;

  const hours = Math.floor(diffH);
  const mins = Math.floor((diffMs / (1000 * 60)) % 60);
  const label = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  const color = diffH <= 2 ? 'text-red-600 dark:text-red-400 bg-red-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10';

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color} px-2 py-0.5 rounded`}>
      <AlarmClock className="h-3 w-3" /> {label}
    </span>
  );
}

// ========== Assignee Selector ==========
export default function TicketsPage({ embedded = false }: { embedded?: boolean }) {
  const isMobile = useIsMobile();
  const { refreshUnreadCounts, clearTicketsBadge, ticketsVersion, notifyTicketsChanged } = useSupportContext();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [activity, setActivity] = useState<TicketActivity[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [tsupportUserId, setTsupportUserId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval>>();
  const sendingRef = useRef(false);
  const [listWidth, setListWidth] = useState(() => {
    const saved = localStorage.getItem('tf:tickets:listW');
    return saved ? Number(saved) : 460;
  });
  const isDragging = useRef(false);

  const activityEndRef = useRef<HTMLDivElement>(null);
  const activityContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startWidth = listWidth;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      let newWidth = startWidth + (ev.clientX - startX);
      newWidth = Math.max(240, Math.min(newWidth, 600));
      setListWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setListWidth(w => { localStorage.setItem('tf:tickets:listW', String(w)); return w; });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [listWidth]);

  // Debounce поиска (300мс)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(0);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await getTickets({
        status: statusFilter === 'all' ? undefined : statusFilter || undefined,
        priority: priorityFilter === 'all' ? undefined : priorityFilter || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter || undefined,
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setTickets(resp.data);
      setTotal(resp.total);
    } catch {
      toast.error('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, typeFilter, debouncedSearch, page]);

  // Перезагрузка списка при изменении фильтров/страницы и при создании новой заявки (ticketsVersion).
  useEffect(() => { loadTickets(); }, [loadTickets, ticketsVersion]);

  // Новая заявка создаётся со статусом «new» и попадает наверх — возвращаемся на первую страницу,
  // чтобы она была видна сразу (если открыт фильтр, скрывающий «new», это ожидаемо).
  useEffect(() => {
    if (ticketsVersion > 0 && page !== 0) setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketsVersion]);

  // Получить TSupport userId для определения своих сообщений
  useEffect(() => {
    getTSupportMe().then(data => setTsupportUserId(data.tsupportUserId)).catch(() => {});
  }, []);

  // При заходе на страницу заявок — сбрасываем бейдж (пользователь видит список)
  useEffect(() => {
    clearTicketsBadge();
  }, [clearTicketsBadge]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedTicket(null);
      setActivity([]);
      return;
    }

    setLoadingDetail(true);
    Promise.all([getTicket(selectedId), getTicketActivity(selectedId)])
      .then(([ticket, acts]) => {
        setSelectedTicket(ticket);
        setActivity(acts);

        // Пометить заявку как прочитанную на сервере
        markTicketRead(selectedId).catch(() => {});
        refreshUnreadCounts();
      })
      .catch(() => toast.error('Не удалось загрузить заявку'))
      .finally(() => setLoadingDetail(false));

    // Polling активности каждые 30 сек (пропускаем при отправке или если вкладка неактивна)
    pollingRef.current = setInterval(async () => {
      if (sendingRef.current || document.visibilityState === 'hidden') return;
      try {
        const acts = await getTicketActivity(selectedId);
        setActivity(acts);
      } catch {/* silent */}
    }, 30_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedId, refreshUnreadCounts]);

  // Auto-scroll to bottom only when switching tickets
  const prevSelectedId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId && selectedId !== prevSelectedId.current && activityContainerRef.current) {
      activityContainerRef.current.scrollTop = activityContainerRef.current.scrollHeight;
      prevSelectedId.current = selectedId;
    }
  }, [selectedId, activity]);

  // Смена статуса доступная клиенту: «выполнено» (resolved) и «переоткрыть» (reopened).
  // Закрытие/отмена и назначение исполнителя — на стороне поддержки.
  const changeStatus = async (status: TicketStatus) => {
    if (!selectedId) return;
    try {
      const updated = await updateTicket(selectedId, { status } as Partial<SupportTicket>);
      setSelectedTicket(updated);
      notifyTicketsChanged();
      refreshUnreadCounts();
      toast.success(status === 'resolved' ? 'Заявка отмечена выполненной' : 'Заявка переоткрыта');
    } catch {
      toast.error('Не удалось изменить статус');
    }
  };

  const handleSendReply = async () => {
    if (!selectedId || (!replyText.trim() && attachedFiles.length === 0)) return;
    setSending(true);
    sendingRef.current = true;
    try {
      // Загрузить файлы, если есть
      let mediaUrls: string[] = [];
      if (attachedFiles.length > 0) {
        const uploaded = await uploadFiles(selectedId, attachedFiles);
        mediaUrls = uploaded.map(f => f.url);
      }

      // Текст: если только файлы без текста — пустая строка
      const text = replyText.trim();
      await sendTicketMessage(selectedId, text || '', mediaUrls.length > 0 ? mediaUrls : undefined);

      setReplyText('');
      setAttachedFiles([]);
      const acts = await getTicketActivity(selectedId);
      setActivity(acts);
      refreshUnreadCounts();
      toast.success('Сообщение отправлено');
    } catch (err) {
      console.error('[TicketsPage] Ошибка отправки:', err);
      toast.error(`Не удалось отправить: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`Файл "${oversized[0].name}" превышает ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
      return;
    }

    setAttachedFiles(prev => {
      const combined = [...prev, ...files];
      if (combined.length > MAX_FILES_TICKET) {
        toast.error(`Максимум ${MAX_FILES_TICKET} файлов`);
        return combined.slice(0, MAX_FILES_TICKET);
      }
      return combined;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('ru', { day: '2-digit', month: '2-digit' }) + ' ' +
      date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDate = (d: string) => {
    return new Date(d).toLocaleString('ru', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getCategoryDisplay = (ticket: SupportTicket) => {
    if (ticket.parent_category_name && ticket.category_name && ticket.parent_category_name !== ticket.category_name) {
      return `${ticket.parent_category_name} → ${ticket.category_name}`;
    }
    return ticket.category_name || ticket.parent_category_name || '';
  };

  const activeFilterCount = [statusFilter, priorityFilter, typeFilter].filter(f => f !== 'all').length;

  return (
    <PageShell embedded={embedded}>
    <div ref={containerRef} className="flex h-full overflow-hidden">
      {/* === Левая панель: список === */}
      <div className={`flex flex-col bg-background shrink-0 overflow-hidden ${isMobile && selectedId ? 'hidden' : ''}`} style={isMobile ? { width: '100%' } : { width: `${listWidth}px` }}>
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-border/50 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground flex-1">
              Заявки
              {total > 0 && <span className="text-muted-foreground font-normal ml-1.5 text-sm">({total})</span>}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 w-9 p-0 transition-colors relative ${showFilters ? 'text-primary dark:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
              title="Фильтры"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={loadTickets}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                placeholder="Поиск..."
                className="!h-9 pl-8 py-0 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="!h-9 w-[120px] py-0 text-sm bg-card border-border text-foreground">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all" className="text-foreground text-sm">Все статусы</SelectItem>
                <SelectItem value="new" className="text-foreground text-sm">Новые</SelectItem>
                <SelectItem value="in_progress" className="text-foreground text-sm">В работе</SelectItem>
                <SelectItem value="waiting_customer" className="text-foreground text-sm">Ожидают</SelectItem>
                <SelectItem value="escalated" className="text-foreground text-sm">Эскалация</SelectItem>
                <SelectItem value="resolved" className="text-foreground text-sm">Решены</SelectItem>
                <SelectItem value="closed" className="text-foreground text-sm">Закрыты</SelectItem>
                <SelectItem value="cancelled" className="text-foreground text-sm">Отменены</SelectItem>
                <SelectItem value="reopened" className="text-foreground text-sm">Переоткрыты</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Расширенные фильтры */}
          {showFilters && (
            <div className="flex gap-2 items-center flex-wrap">
              <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(0); }}>
                <SelectTrigger className="!h-9 w-[120px] py-0 text-sm bg-card border-border text-foreground">
                  <SelectValue placeholder="Приоритет" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground text-sm">Все приоритеты</SelectItem>
                  <SelectItem value="critical" className="text-foreground text-sm">Критический</SelectItem>
                  <SelectItem value="high" className="text-foreground text-sm">Высокий</SelectItem>
                  <SelectItem value="medium" className="text-foreground text-sm">Средний</SelectItem>
                  <SelectItem value="low" className="text-foreground text-sm">Низкий</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger className="!h-9 w-[120px] py-0 text-sm bg-card border-border text-foreground">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground text-sm">Все типы</SelectItem>
                  <SelectItem value="incident" className="text-foreground text-sm">Инцидент</SelectItem>
                  <SelectItem value="request" className="text-foreground text-sm">Запрос</SelectItem>
                  <SelectItem value="question" className="text-foreground text-sm">Вопрос</SelectItem>
                  <SelectItem value="problem" className="text-foreground text-sm">Проблема</SelectItem>
                </SelectContent>
              </Select>
              {(priorityFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setPriorityFilter('all'); setTypeFilter('all'); }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground px-2"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Сбросить
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Список тикетов */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Заявок нет</p>
              <p className="text-xs mt-1">Создайте первую заявку</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {tickets.map(ticket => {
                const isSelected = selectedId === ticket.id;
                const StatusIcon = STATUS_ICONS[ticket.status] || AlertCircle;
                const hasUnread = (ticket.unread_count ?? 0) > 0;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedId(ticket.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors border-l-2 ${
                      isSelected
                        ? 'bg-card border-l-blue-500'
                        : hasUnread
                          ? 'border-l-blue-400 bg-primary/5 hover:bg-primary/90/10'
                          : 'border-l-transparent hover:bg-card/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Иконка статуса */}
                      <div className={`mt-0.5 w-7 h-7 rounded flex items-center justify-center shrink-0 relative ${
                        isSelected ? 'bg-primary/10 dark:bg-primary/20' : hasUnread ? 'bg-primary/10 dark:bg-primary/20' : 'bg-card'
                      }`}>
                        <StatusIcon className={`h-3.5 w-3.5 ${
                          isSelected ? 'text-primary dark:text-primary/70' : hasUnread ? 'text-primary dark:text-primary/70' : 'text-muted-foreground'
                        }`} />
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary rounded-full border-2 border-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.display_number ? `#${ticket.display_number}` : ''}
                          </span>
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 leading-4 ${TICKET_STATUS_COLORS[ticket.status] || ''}`}>
                            {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                          </Badge>
                        </div>
                        <p className={`text-sm truncate ${isSelected ? 'text-foreground font-medium' : hasUnread ? 'text-foreground font-medium' : 'text-foreground'}`}>
                          {ticket.title}
                        </p>
                        {(() => { const cat = getCategoryDisplay(ticket); return cat ? (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{cat}</p>
                        ) : null; })()}
                      </div>
                      <div className="text-right shrink-0 pt-0.5">
                        <span className="text-xs text-muted-foreground block">{formatDate(ticket.created_at)}</span>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {hasUnread ? (
                            <span className="bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              !
                            </span>
                          ) : (
                            <>
                              <SlaIndicator deadline={ticket.sla_deadline} breached={ticket.sla_breached} />
                              <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ticket.priority] || 'bg-muted-foreground'}`} />
                              <span className={`text-xs ${TICKET_PRIORITY_COLORS[ticket.priority] || 'text-muted-foreground'}`}>
                                {TICKET_PRIORITY_LABELS[ticket.priority] || ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Пагинация */}
        {total > PAGE_SIZE && (
          <div className="px-3 py-2 border-t border-border/50 flex items-center justify-between shrink-0">
            <Button
              size="sm"
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              Назад
            </Button>
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из {total}
            </span>
            <Button
              size="sm"
              variant="ghost"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage(p => p + 1)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              Далее
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Resize handle (desktop only) */}
      {!isMobile && (
        <div
          onMouseDown={handleResizeStart}
          className="w-1 hover:w-1.5 bg-secondary/50 hover:bg-primary/90/50 cursor-col-resize transition-all shrink-0"
        />
      )}

      {/* === Правая панель: детали === */}
      <div className={`flex-1 flex-col bg-background/50 overflow-hidden ${isMobile ? (selectedId ? 'flex' : 'hidden') : (!selectedId ? 'hidden md:flex' : 'flex')}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-12 w-12 mb-3" />
            <p className="text-sm font-medium">Выберите заявку</p>
            <p className="text-xs mt-1">Нажмите на заявку в списке слева</p>
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedTicket ? (
          <>
            {/* Header заявки */}
            <div className="px-4 py-3 border-b border-border/50 bg-background/80 shrink-0 overflow-y-auto">
              {/* Кнопка "Назад" на мобильном */}
              {isMobile && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedId(null)}
                  className="mb-2 -ml-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  К списку
                </Button>
              )}
              {/* Бейджи */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {selectedTicket.display_number && (
                  <span className="text-xs font-mono text-muted-foreground bg-card px-2 py-0.5 rounded">
                    #{selectedTicket.display_number}
                  </span>
                )}
                <Badge variant="outline" className={`text-xs ${TICKET_STATUS_COLORS[selectedTicket.status]}`}>
                  {TICKET_STATUS_LABELS[selectedTicket.status]}
                </Badge>
                <span className={`text-xs ${TICKET_PRIORITY_COLORS[selectedTicket.priority]}`}>
                  {TICKET_PRIORITY_LABELS[selectedTicket.priority]}
                </span>
                {selectedTicket.type && (
                  <span className="text-xs text-muted-foreground bg-card px-2 py-0.5 rounded">
                    {TICKET_TYPE_LABELS[selectedTicket.type] || selectedTicket.type}
                  </span>
                )}
                {selectedTicket.source_code && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {selectedTicket.source_code}
                  </span>
                )}
              </div>

              {/* Заголовок + описание */}
              <h3 className="text-base font-semibold text-foreground leading-snug">{selectedTicket.title}</h3>
              {selectedTicket.description && (
                <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
              )}

              {/* Основная информация — сворачиваемый блок */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors mb-2"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? '' : '-rotate-90'}`} />
                  Подробности
                </button>
                {detailsOpen && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Сеть:</span>
                      <span className="text-foreground font-medium">{selectedTicket.company_name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Автор:</span>
                      <span className="text-foreground font-medium">{selectedTicket.customer_name || selectedTicket.customer_email || '—'}</span>
                    </div>
                    {selectedTicket.location_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">ТТ:</span>
                        <span className="text-foreground font-medium">{selectedTicket.location_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Исполнитель:</span>
                      <span className="text-foreground font-medium">{selectedTicket.assignee_name || 'Назначается'}</span>
                    </div>
                    {getCategoryDisplay(selectedTicket) && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">Категория:</span>
                        <span className="text-foreground font-medium">{getCategoryDisplay(selectedTicket)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Создана:</span>
                      <span className="text-foreground font-medium">{formatFullDate(selectedTicket.created_at)}</span>
                    </div>
                    {selectedTicket.sla_deadline && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">SLA:</span>
                        <span className={`font-medium ${selectedTicket.sla_breached ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                          {formatFullDate(selectedTicket.sla_deadline)}
                        </span>
                        <SlaIndicator deadline={selectedTicket.sla_deadline} breached={selectedTicket.sla_breached} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Контекст приложения (сворачиваемый) */}
              {selectedTicket.app_context && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setContextOpen(!contextOpen)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/80 transition-colors"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${contextOpen ? '' : '-rotate-90'}`} />
                    Контекст приложения
                  </button>
                  {contextOpen && (
                    <div className="mt-1.5 rounded-md bg-card/50 border border-border/50 p-3 space-y-2 text-xs text-muted-foreground">
                      {selectedTicket.app_context.source && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-primary dark:text-primary/70 shrink-0" />
                          <span>Источник: <span className="text-foreground font-medium">{selectedTicket.app_context.source}</span>
                            {selectedTicket.app_context.version && <span className="text-muted-foreground ml-1">v{selectedTicket.app_context.version}</span>}
                          </span>
                        </div>
                      )}
                      {(selectedTicket.app_context.section || selectedTicket.app_context.routeName) && (
                        <div className="flex items-center gap-1.5">
                          <Route className="h-3.5 w-3.5 text-primary dark:text-primary/70 shrink-0" />
                          <span>
                            {selectedTicket.app_context.section && <span className="text-muted-foreground">{selectedTicket.app_context.section} →</span>}
                            {' '}<span className="text-foreground">{selectedTicket.app_context.routeName || selectedTicket.app_context.route}</span>
                          </span>
                        </div>
                      )}
                      {selectedTicket.app_context.networkName && (
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                          <span>Сеть: <span className="text-foreground">{selectedTicket.app_context.networkName}</span></span>
                        </div>
                      )}
                      {selectedTicket.app_context.tradingPointName && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>ТТ: <span className="text-foreground">{selectedTicket.app_context.tradingPointName}</span></span>
                        </div>
                      )}
                      {selectedTicket.app_context.userName && (
                        <div className="flex items-center gap-1.5">
                          <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Пользователь: <span className="text-foreground">{selectedTicket.app_context.userName}</span>
                            {selectedTicket.app_context.userRole && <span className="text-muted-foreground ml-1">({selectedTicket.app_context.userRole})</span>}
                          </span>
                        </div>
                      )}
                      {selectedTicket.app_context.urlParams && Object.keys(selectedTicket.app_context.urlParams).length > 0 && (
                        <div className="text-muted-foreground font-mono text-xs">
                          Фильтры: {Object.entries(selectedTicket.app_context.urlParams).map(([k, v]) => `${k}=${v}`).join(', ')}
                        </div>
                      )}
                      {selectedTicket.app_context.pageData && Object.keys(selectedTicket.app_context.pageData).length > 0 && (
                        <details className="text-xs">
                          <summary className="text-muted-foreground cursor-pointer hover:text-muted-foreground">Данные страницы</summary>
                          <pre className="mt-1 text-muted-foreground font-mono text-xs break-all whitespace-pre-wrap">
                            {JSON.stringify(selectedTicket.app_context.pageData, null, 2)}
                          </pre>
                        </details>
                      )}
                      {selectedTicket.app_context.screenSize && (
                        <div className="text-muted-foreground text-xs">
                          {selectedTicket.app_context.screenSize} · {selectedTicket.app_context.timestamp ? formatFullDate(selectedTicket.app_context.timestamp) : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Таймлайн/Активность */}
            <div ref={activityContainerRef} className="flex-1 overflow-y-auto px-4 py-3">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <p className="text-sm">Нет активности</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activity.map(act => {
                    if (act.event_type === 'message') {
                      const isSystem = act.user_role === 'system' || act.message_type === 'system';
                      const isAi = act.ai_generated || act.message_type === 'ai';
                      const isCustomer = tsupportUserId ? act.user_id === tsupportUserId : act.user_role === 'customer';

                      if (isSystem) {
                        return (
                          <div key={act.id} className="flex justify-center py-2">
                            <span className="text-xs text-muted-foreground bg-card/50 px-3 py-1 rounded-full">
                              {act.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={act.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} py-1 group/msg`}>
                          <div className={`max-w-[75%] ${isCustomer ? 'order-1' : ''}`}>
                            <div className={`flex items-center gap-1.5 mb-0.5 ${isCustomer ? 'justify-end' : ''}`}>
                              <span className="text-xs font-medium text-muted-foreground">
                                {act.user_name || 'Система'}
                              </span>
                              {((act.user_role && act.user_role !== 'customer') || isAi) && (
                                <span className="text-xs px-1.5 py-px rounded bg-secondary text-muted-foreground">
                                  {isAi ? 'Поддержка' : act.user_role}
                                </span>
                              )}
                              {act.is_edited && <span className="text-[10px] text-muted-foreground">ред.</span>}
                              <span className="text-xs text-muted-foreground">{formatDate(act.created_at)}</span>
                            </div>
                            <div className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                              isCustomer
                                ? 'bg-primary/20 text-white rounded-br-sm'
                                : isAi
                                  ? 'bg-purple-600/10 text-foreground/80 rounded-bl-sm border border-purple-500/20'
                                  : 'bg-card text-foreground/80 rounded-bl-sm'
                            }`}>
                              {/* Текст сообщения (скрываем пустой) */}
                              {act.content && act.content.trim() && (
                                <p className="whitespace-pre-wrap">{act.content}</p>
                              )}
                              {/* Вложения */}
                              {act.media_attachments && act.media_attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {act.media_attachments.map((att, i) => {
                                    const cleanUrl = att.url.split('?')[0];
                                    const proxyBase = cleanUrl.startsWith('/uploads/')
                                      ? `/api/support/files/${cleanUrl.slice('/uploads/'.length)}`
                                      : cleanUrl;
                                    const proxyUrl = att.name ? `${proxyBase}?name=${encodeURIComponent(att.name)}` : proxyBase;
                                    const isImg = /\.(jpe?g|png|gif|webp|heic|heif|svg)$/i.test(att.name);
                                    return isImg ? (
                                      <a key={i} href={proxyUrl} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                          src={proxyUrl}
                                          alt={att.name}
                                          className="max-w-[200px] max-h-[160px] rounded object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                          loading="lazy"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        key={i}
                                        href={proxyUrl}
                                        download={att.name}
                                        className="flex items-center gap-2 bg-secondary/40 hover:bg-secondary/60 rounded px-2.5 py-2 text-xs transition-colors"
                                      >
                                        <File className="h-4 w-4 text-primary dark:text-primary/70 shrink-0" />
                                        <div className="min-w-0">
                                          <span className="text-foreground truncate block max-w-[200px]">{att.name}</span>
                                          {att.size ? (
                                            <span className="text-muted-foreground text-[10px]">
                                              {att.size < 1024 * 1024
                                                ? `${(att.size / 1024).toFixed(0)} КБ`
                                                : `${(att.size / (1024 * 1024)).toFixed(1)} МБ`}
                                            </span>
                                          ) : null}
                                        </div>
                                      </a>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // History event
                    return (
                      <div key={act.id} className="flex items-center gap-2 py-2">
                        <div className="flex-1 border-t border-border/30 hidden md:block" />
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground flex-wrap min-w-0">
                          <History className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="font-medium text-muted-foreground">{act.user_name || 'Система'}</span>
                          <span>изменил</span>
                          <span className="text-muted-foreground break-all">«{act.field}»</span>
                          <span className="break-all">{act.old_value || '—'} → {act.new_value || '—'}</span>
                          <span className="text-foreground">·</span>
                          <span className="whitespace-nowrap">{formatDate(act.created_at)}</span>
                        </div>
                        <div className="flex-1 border-t border-border/30 hidden md:block" />
                      </div>
                    );
                  })}
                  <div ref={activityEndRef} />
                </div>
              )}
            </div>

            {/* Действия по статусу: клиент отмечает «выполнено» или переоткрывает; закрытие — за поддержкой */}
            <div className="px-4 py-2 border-t border-border/50 flex flex-wrap gap-2">
              {canMarkResolved(selectedTicket.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus('resolved')}
                  className="gap-1.5 border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 hover:text-green-600"
                >
                  <CheckCheck className="h-4 w-4" /> Отметить выполненной
                </Button>
              )}
              {canReopen(selectedTicket.status) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => changeStatus('reopened')}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Переоткрыть
                </Button>
              )}
            </div>

            {/* Поле ответа */}
            {!['closed', 'cancelled'].includes(selectedTicket.status) && (
              <div className="px-4 py-2.5 border-t border-border/50 bg-background/80">
                {/* Превью прикреплённых файлов */}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachedFiles.map((file, i) => {
                      const isImage = file.type.startsWith('image/');
                      return (
                        <div key={i} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground/80">
                          {isImage ? (
                            <ImageIcon className="h-3.5 w-3.5 text-primary dark:text-primary/70 shrink-0" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                          <button
                            onClick={() => removeFile(i)}
                            className="text-muted-foreground hover:text-red-400 transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  {/* Кнопка прикрепления */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary min-h-[36px] max-h-[100px]"
                    style={{ height: 'auto', overflow: 'hidden' }}
                    onInput={e => {
                      const el = e.target as HTMLTextAreaElement;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                      el.style.overflow = el.scrollHeight > 100 ? 'auto' : 'hidden';
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply();
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendReply}
                    disabled={sending || (!replyText.trim() && attachedFiles.length === 0)}
                    className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/80 disabled:opacity-30 shrink-0"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-0.5">Ctrl+Enter — отправить · Файлы до {MAX_FILE_SIZE / (1024 * 1024)} МБ</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
    </PageShell>
  );
}
