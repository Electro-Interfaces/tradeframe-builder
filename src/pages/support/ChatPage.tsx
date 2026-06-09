/**
 * ChatPage — Telegram-стиль мессенджер
 * Левая панель: список чат-комнат + создание нового чата
 * Правая панель: переписка с группировкой, пузырями, разделителями дат
 * Правая боковая: инфо о чате + участники (по клику на header)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
// Sheet removed — mobile chat uses back button instead of drawer
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Send, Loader2, RefreshCw, MessageCircle, Users, Plus,
  User, Building2, X, Calendar, Shield, Eye, Crown, Megaphone, Lock,
  Paperclip, FileText, Download, Reply, Pencil, Trash2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupportContext } from '@/contexts/SupportContext';
import {
  getChatRooms, getChatMessages, sendChatMessage, markChatRead, createChatRoom, getChatRoom, uploadChatFiles, getTSupportMe,
  editChatMessage, deleteChatMessage, subscribeChat,
  getCompanyMembers, addRoomMember, removeRoomMember, deleteRoom, canManageRoom,
} from '@/services/chatBackend';
import type { ChatRoom, ChatMessage, ChatParticipant } from '@/types/support';
import { MAX_FILE_SIZE, MAX_FILES_CHAT } from '@/types/support';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getUserColor, getDateLabel, formatTime, computeGrouping, bubbleRadius,
} from '@/components/support/telegram-helpers';

// ========== Room List Panel ==========

function RoomListPanel({
  rooms,
  loading,
  selectedRoomId,
  search,
  onSearchChange,
  onSelectRoom,
  onRefresh,
  onNewChat,
  isMobile,
}: {
  rooms: ChatRoom[];
  loading: boolean;
  selectedRoomId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectRoom: (id: string) => void;
  onRefresh: () => void;
  onNewChat: () => void;
  isMobile: boolean;
}) {
  const [filter, setFilter] = useState<'all' | 'direct' | 'company'>('all');

  const filteredRooms = rooms.filter(r => {
    const isGroup = r.type === 'company' || r.type === 'group' || r.type === 'ticket';
    if (filter === 'direct' && isGroup) return false;
    if (filter === 'company' && !isGroup) return false;
    if (search && !(r.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const TABS = [
    { key: 'all' as const, label: 'Все' },
    { key: 'direct' as const, label: 'Личные' },
    { key: 'company' as const, label: 'Компания' },
  ];

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="px-3 pt-3 pb-2.5 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-1.5 mb-2.5">
          <div className="flex gap-1.5 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-colors touch-manipulation ${
                  filter === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onRefresh} className="h-10 w-10 p-0 border-border text-foreground/80 hover:text-foreground hover:bg-secondary rounded-full touch-manipulation" aria-label="Обновить">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Поиск..."
            className="!h-10 pl-9 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {search ? 'Ничего не найдено' : 'Нет диалогов'}
          </div>
        ) : (
          <div>
            {(() => {
              // Индекс первого клиентского чата — перед ним рисуем разделитель,
              // отделяющий наши закреплённые каналы (Новости/Общая/Индивидуальная).
              const firstClientIdx = filteredRooms.findIndex(r => (r.kind ?? 'client') === 'client');
              return filteredRooms.map((room, i) => {
              const isSelected = selectedRoomId === room.id;
              const isNews = room.kind === 'news';
              const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';
              const hasUnread = (room.unread_count ?? 0) > 0;
              const showDivider = firstClientIdx > 0 && i === firstClientIdx;
              return (
                <div key={room.id}>
                {showDivider && (
                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Чаты компании</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <button
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full text-left px-3 py-3 transition-colors touch-manipulation border-b border-border/20 ${
                    isSelected ? 'bg-card' : 'hover:bg-card/40 active:bg-card/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isNews ? 'bg-amber-100 dark:bg-amber-500/20' : isCompany ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-primary/10 dark:bg-primary/20'}`}>
                      {isNews ? (
                        <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      ) : isCompany ? (
                        <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <User className="h-5 w-5 text-primary dark:text-primary/70" />
                      )}
                    </div>
                    {/* Однострочно: бейдж непрочитанных заменяет вторую строку с превью */}
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${hasUnread ? 'text-foreground font-semibold' : 'text-foreground font-medium'}`}>
                        {room.name || (isCompany ? 'Чат компании' : 'Личный чат')}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {room.last_message_at && (
                          <span className={`text-[11px] ${hasUnread ? 'text-primary dark:text-primary/70' : 'text-muted-foreground'}`}>
                            {formatTime(room.last_message_at)}
                          </span>
                        )}
                        {hasUnread && (
                          <span className="inline-flex items-center justify-center bg-primary text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5">
                            {room.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                </div>
              );
            });
            })()}
          </div>
        )}
      </ScrollArea>

      {/* FAB — Новый чат */}
      <button
        onClick={onNewChat}
        className={`${isMobile ? 'fixed' : 'absolute'} bottom-6 right-4 h-14 w-14 rounded-full bg-primary hover:bg-primary/80 active:bg-primary/90 text-white shadow-xl shadow-primary/40 flex items-center justify-center touch-manipulation transition-colors`}
        style={{ zIndex: 50 }}
        aria-label="Новый чат"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

// ========== New Chat Dialog ==========

// Новый клиентский чат: название + выбор своих сотрудников (без нашей поддержки).
function NewChatDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, memberMxids: string[]) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [members, setMembers] = useState<{ id: string; name: string; email: string; mxid: string | null }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) { setName(''); setSelected(new Set()); return; }
    setLoadingMembers(true);
    getCompanyMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [open]);

  const toggle = (mxid: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(mxid)) next.delete(mxid); else next.add(mxid);
    return next;
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), [...selected]);
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground">Новый чат</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Название</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Смена №2"
              className="bg-card border-border text-foreground text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Сотрудники компании</label>
            {loadingMembers ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Нет других сотрудников компании</p>
            ) : (
              <div className="max-h-48 overflow-auto space-y-1 border border-border rounded-lg p-1">
                {members.map(m => {
                  const sel = selected.has(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-left text-sm transition-colors ${sel ? 'bg-primary/15 text-foreground' : 'hover:bg-card text-foreground/80'}`}
                    >
                      <span className="truncate">{m.name}</span>
                      {sel && <Check className="h-4 w-4 text-primary dark:text-primary/70 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full bg-primary hover:bg-primary/80"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Создать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== Date Divider ==========

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="bg-card/80 text-muted-foreground text-xs px-3 py-1 rounded-full">
        {label}
      </span>
    </div>
  );
}

// ========== Message Bubble ==========

function MessageBubble({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  onReply,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  message: ChatMessage;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onReply?: (msg: ChatMessage) => void;
  onEdit?: (msg: ChatMessage) => void;
  onDelete?: (msg: ChatMessage) => void;
  readOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // Deleted placeholder
  if (message.is_deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
        <div className="max-w-[75%] px-3 py-1.5 rounded-xl bg-card/30 border border-border/30">
          <p className="text-xs text-muted-foreground italic">Сообщение удалено</p>
        </div>
      </div>
    );
  }

  // Системное сообщение
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground italic px-3 py-1">
          {message.content}
        </span>
      </div>
    );
  }

  const radius = bubbleRadius(isOwn, isFirstInGroup, isLastInGroup);
  const colorClass = getUserColor(message.user_id);

  // Convert TSupport relative /uploads/... to proxied /api/support/files/...
  const fileUrl = (() => {
    if (!message.file_url) return undefined;
    try {
      const u = new URL(message.file_url, 'http://x');
      const clean = u.pathname;
      return clean.startsWith('/uploads/')
        ? `/api/support/files/${clean.slice('/uploads/'.length)}`
        : message.file_url;
    } catch {
      return message.file_url.startsWith('/uploads/')
        ? `/api/support/files/${message.file_url.slice('/uploads/'.length)}`
        : message.file_url;
    }
  })();

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'} group relative`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action buttons (hover) — скрыты в read-only каналах */}
      {hovered && !readOnly && (
        <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} flex items-center gap-0.5 z-10`}>
          <button onClick={() => onReply?.(message)} className="p-1 rounded bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Ответить">
            <Reply className="h-3.5 w-3.5" />
          </button>
          {isOwn && (
            <button onClick={() => onEdit?.(message)} className="p-1 rounded bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {isOwn && (
            <button onClick={() => onDelete?.(message)} className="p-1 rounded bg-secondary/80 hover:bg-red-600/80 text-muted-foreground hover:text-white transition-colors" title="Удалить">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        className={`max-w-[75%] px-3 py-1.5 ${radius} ${
          isOwn
            ? 'bg-[#dbeafe] dark:bg-[#2B5278]'
            : 'bg-card border border-border/60 dark:border-transparent'
        }`}
      >
        {/* Author name (only for others, first in group) */}
        {!isOwn && isFirstInGroup && (
          <p className={`text-xs font-semibold mb-0.5 ${colorClass}`}>
            {message.user_name}
          </p>
        )}

        {/* Reply-to quote */}
        {message.reply_to && (
          <div className={`border-l-2 pl-2 mb-1.5 ${isOwn ? 'border-primary/50' : 'border-border/50'}`}>
            <p className="text-[11px] font-medium text-primary dark:text-primary/80">{message.reply_to_user_name || ''}</p>
            <p className="text-xs text-muted-foreground truncate">
              {message.reply_to_deleted ? 'Сообщение удалено' : (message.reply_to_content || '')}
            </p>
          </div>
        )}

        {/* File attachment */}
        {fileUrl && (message.type === 'image' ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
            <img
              src={fileUrl}
              alt={message.file_name || 'image'}
              className="max-w-full max-h-[280px] rounded object-contain cursor-pointer"
              loading="lazy"
            />
          </a>
        ) : (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded mb-1 transition-colors ${
              isOwn ? 'bg-[#bcd9fb] hover:bg-[#a8ccf7] dark:bg-[#1e3f5e] dark:hover:bg-[#244a6e]' : 'bg-secondary/50 hover:bg-secondary'
            }`}
          >
            <FileText className="h-8 w-8 text-primary dark:text-primary/70 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-foreground truncate">{message.file_name || 'Файл'}</p>
              {message.file_size != null && (
                <p className="text-[10px] text-muted-foreground">
                  {message.file_size < 1024 * 1024
                    ? `${(message.file_size / 1024).toFixed(0)} КБ`
                    : `${(message.file_size / (1024 * 1024)).toFixed(1)} МБ`}
                </p>
              )}
            </div>
            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>
        ))}

        {/* Content */}
        <div className="flex items-end gap-2">
          {message.content && (
            <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1">
              {message.content}
            </p>
          )}
          <span className="text-xs text-muted-foreground shrink-0 translate-y-0.5 select-none">
            {message.is_edited && <span className="text-muted-foreground mr-1">ред.</span>}
            {formatTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ========== Chat Info Panel ==========

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  member: 'Участник',
  observer: 'Наблюдатель',
};

const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Админ',
  manager: 'Менеджер',
  operator: 'Оператор',
  tech: 'Техник',
  partner: 'Партнёр',
};

function ParticipantRoleIcon({ role }: { role: string }) {
  if (role === 'admin') return <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />;
  if (role === 'observer') return <Eye className="h-3 w-3 text-muted-foreground" />;
  return <Shield className="h-3 w-3 text-muted-foreground" />;
}

function ChatInfoPanel({
  room,
  participants,
  loadingInfo,
  onClose,
  canManage,
  currentUserId,
  availableMembers,
  onAddMember,
  onRemoveMember,
  onDeleteRoom,
}: {
  room: ChatRoom;
  participants: ChatParticipant[];
  loadingInfo: boolean;
  onClose: () => void;
  canManage?: boolean;
  currentUserId?: string;
  availableMembers?: { id: string; name: string; email: string; mxid: string | null }[];
  onAddMember?: (tfUserId: string) => void;
  onRemoveMember?: (mxid: string) => void;
  onDeleteRoom?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';
  const typeLabel = isCompany ? 'Чат компании' : 'Личный чат';

  return (
    <div className="w-[280px] border-l border-border/50 flex flex-col shrink-0 bg-background/50">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Информация</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isCompany ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-primary/10 dark:bg-primary/20'}`}>
              {isCompany ? (
                <Users className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <User className="h-7 w-7 text-primary dark:text-primary/70" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {room.name || typeLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}</p>
          </div>

          {/* Info fields */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground">Создан</p>
                <p className="text-foreground/80">
                  {new Date(room.created_at).toLocaleDateString('ru', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {isCompany && (
              <div className="flex items-center gap-2.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground">Тип</p>
                  <p className="text-foreground/80">Групповой</p>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Участники{!loadingInfo && ` (${participants.length})`}
            </p>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Нет участников</p>
            ) : (
              <div className="space-y-1">
                {participants.map(p => {
                  const colorClass = getUserColor(p.user_id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-card/50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <span className={`text-xs font-semibold ${colorClass}`}>
                            {(p.name || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${colorClass}`}>
                          {p.name || p.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ParticipantRoleIcon role={p.role} />
                          <span className="text-[10px] text-muted-foreground">
                            {ROLE_LABELS[p.role] || p.role}
                          </span>
                          {p.user_role && p.user_role !== p.role && (
                            <>
                              <span className="text-[10px] text-foreground">·</span>
                              <span className="text-[10px] text-muted-foreground">
                                {USER_ROLE_LABELS[p.user_role] || p.user_role}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {canManage && p.user_id !== currentUserId && (
                        <button
                          onClick={() => onRemoveMember?.(p.user_id)}
                          className="p-1 text-muted-foreground hover:text-red-500 shrink-0"
                          title="Удалить из чата"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Управление — только для своих (клиентских) чатов */}
          {canManage && (
            <div className="mt-5 space-y-2 border-t border-border/50 pt-4">
              {!adding ? (
                <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="w-full text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Добавить участника
                </Button>
              ) : (
                <div className="space-y-1 border border-border rounded-lg p-1 max-h-40 overflow-auto">
                  {(availableMembers || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Все сотрудники уже в чате</p>
                  ) : (
                    (availableMembers || []).map(m => (
                      <button
                        key={m.id}
                        onClick={() => { onAddMember?.(m.id); setAdding(false); }}
                        className="w-full text-left text-sm px-2.5 py-2 rounded-md hover:bg-card text-foreground/80 truncate"
                      >
                        {m.name}
                      </button>
                    ))
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeleteRoom}
                className="w-full text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Удалить чат
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ========== Message Panel ==========

function MessagePanel({
  room,
  messages,
  loadingMessages,
  currentUserId,
  messageText,
  onMessageTextChange,
  onSend,
  sending,
  onHeaderClick,
  participantCount,
  pendingFiles,
  onAddFiles,
  onRemoveFile,
  replyingTo,
  onSetReplyingTo,
  editingMessage,
  onSetEditingMessage,
  onEditConfirm,
  onDeleteMessage,
}: {
  room: ChatRoom | undefined;
  messages: ChatMessage[];
  loadingMessages: boolean;
  currentUserId: string;
  messageText: string;
  onMessageTextChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onHeaderClick?: () => void;
  participantCount?: number;
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  replyingTo: ChatMessage | null;
  onSetReplyingTo: (msg: ChatMessage | null) => void;
  editingMessage: ChatMessage | null;
  onSetEditingMessage: (msg: ChatMessage | null) => void;
  onEditConfirm: (msgId: string, content: string) => void;
  onDeleteMessage: (msg: ChatMessage) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Scroll to bottom on new messages (only within ScrollArea, not the whole page)
  useEffect(() => {
    const viewport = messagesEndRef.current?.closest('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  // Grouping
  const grouping = useMemo(() => computeGrouping(messages), [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Dynamic file input to avoid Windows 11 "Explorer collection" indexing bug
  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (files.length) onAddFiles(files);
    };
    input.click();
  };

  const isImage = (f: File) => f.type.startsWith('image/');

  // Управление blob URL для превью файлов (очистка при размонтировании)
  const blobUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => { blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  // Очищаем blob URL при смене списка файлов
  useEffect(() => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = pendingFiles
      .filter(f => f.type.startsWith('image/'))
      .map(f => URL.createObjectURL(f));
  }, [pendingFiles]);
  const getBlobUrl = (file: File, index: number) => {
    const imgIndex = pendingFiles.slice(0, index + 1).filter(f => f.type.startsWith('image/')).length - 1;
    return blobUrlsRef.current[imgIndex] || URL.createObjectURL(file);
  };

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-foreground" />
          <p>Выберите диалог</p>
        </div>
      </div>
    );
  }

  const isNews = room.kind === 'news';
  const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';
  const subtitle = isNews ? 'Канал новостей' : isCompany ? 'Чат компании' : 'Личный чат';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat Header — clickable to open info panel */}
      <button
        onClick={onHeaderClick}
        className="p-3 border-b border-border/50 flex items-center gap-2.5 shrink-0 hover:bg-card/30 transition-colors text-left w-full"
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isNews ? 'bg-amber-100 dark:bg-amber-500/20' : isCompany ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-primary/10 dark:bg-primary/20'}`}>
          {isNews ? (
            <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : isCompany ? (
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <User className="h-4 w-4 text-primary dark:text-primary/70" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {room.name || subtitle}
          </p>
          <p className="text-xs text-muted-foreground">
            {subtitle}
            {participantCount != null && participantCount > 0 && (
              <span className="ml-1">· {participantCount} участн.</span>
            )}
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary dark:text-primary/80 text-xs font-semibold border border-primary/30">
          <Users className="h-4 w-4" />
          Участники
        </span>
      </button>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
            Нет сообщений. Напишите первое!
          </div>
        ) : (
          <div className="py-2">
            {messages.map((msg, i) => {
              const g = grouping[i];
              const isOwn = msg.user_id === currentUserId;
              return (
                <div key={msg.id}>
                  {g.showDate && <DateDivider label={getDateLabel(msg.created_at)} />}
                  <MessageBubble
                    message={msg}
                    isOwn={isOwn}
                    isFirstInGroup={g.isFirstInGroup}
                    isLastInGroup={g.isLastInGroup}
                    onReply={onSetReplyingTo}
                    onEdit={onSetEditingMessage}
                    onDelete={onDeleteMessage}
                    readOnly={!!room.readonly}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Reply bar */}
      {replyingTo && (
        <div className="px-3 pt-2 border-t border-border/50 shrink-0 flex items-center gap-2">
          <div className="flex-1 border-l-2 border-primary pl-2 min-w-0">
            <p className="text-xs font-medium text-primary dark:text-primary/70">{replyingTo.user_name}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content || 'Файл'}</p>
          </div>
          <button onClick={() => onSetReplyingTo(null)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Edit bar */}
      {editingMessage && (
        <div className="px-3 pt-2 border-t border-border/50 shrink-0 flex items-center gap-2">
          <Pencil className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Редактирование</p>
            <p className="text-xs text-muted-foreground truncate">{editingMessage.content}</p>
          </div>
          <button onClick={() => onSetEditingMessage(null)} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-3 pt-2 border-t border-border/50 shrink-0">
          <div className="flex gap-2 flex-wrap">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative group">
                {isImage(f) ? (
                  <img
                    src={getBlobUrl(f, i)}
                    alt={f.name}
                    className="h-16 w-16 rounded object-cover border border-border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded border border-border bg-card flex flex-col items-center justify-center p-1">
                    <FileText className="h-5 w-5 text-primary dark:text-primary/70 mb-0.5" />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center">{f.name.split('.').pop()}</span>
                  </div>
                )}
                <button
                  onClick={() => onRemoveFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-[9px] text-muted-foreground truncate max-w-[64px] mt-0.5">{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input — для read-only каналов (например «Новости») композер скрыт */}
      {room.readonly ? (
        <div className="p-3.5 border-t border-border/50 shrink-0 flex items-center justify-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span className="text-xs">Только чтение — публикуют сотрудники поддержки</span>
        </div>
      ) : (
      <div className={`p-3 ${pendingFiles.length === 0 ? 'border-t border-border/50' : ''} shrink-0`}>
        <div className="flex gap-2 items-end">
          {/* Attach button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={openFilePicker}
            disabled={sending}
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={e => onMessageTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            className="flex-1 bg-card border-border text-foreground text-sm resize-none min-h-[38px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => {
              if (editingMessage) {
                onEditConfirm(editingMessage.id, messageText.trim());
              } else {
                onSend();
              }
            }}
            disabled={sending || (!messageText.trim() && pendingFiles.length === 0)}
            className={`h-9 w-9 shrink-0 ${editingMessage ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/80'}`}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMessage ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

// ========== Main ChatPage ==========

export default function ChatPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useNewAuth();
  const { refreshUnreadCounts, clearChatBadge } = useSupportContext();
  const isMobile = useIsMobile();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  // sheetOpen removed — mobile uses back button
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [tsupportUserId, setTsupportUserId] = useState('');

  // Reply/Edit state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Chat info panel state
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [roomDetail, setRoomDetail] = useState<ChatRoom | null>(null);
  const [companyMembers, setCompanyMembers] = useState<{ id: string; name: string; email: string; mxid: string | null }[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const pollingRoomsRef = useRef<ReturnType<typeof setInterval>>();
  const pollingMsgsRef = useRef<ReturnType<typeof setInterval>>();

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // Load rooms
  const loadRooms = useCallback(async () => {
    try {
      const data = await getChatRooms();
      setRooms(data);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Load TSupport user ID (maps TradePoint ID → TSupport internal ID)
  useEffect(() => {
    getTSupportMe()
      .then(data => setTsupportUserId(data.tsupportUserId))
      .catch(() => toast.error('Не удалось получить ID пользователя'));
  }, []);

  useEffect(() => {
    loadRooms();
    clearChatBadge();

    // Poll rooms every 30 sec (skip when tab is hidden)
    pollingRoomsRef.current = setInterval(() => {
      if (document.visibilityState !== 'hidden') loadRooms();
    }, 30_000);
    return () => {
      if (pollingRoomsRef.current) clearInterval(pollingRoomsRef.current);
    };
  }, [loadRooms, clearChatBadge]);

  // Load messages on room select
  useEffect(() => {
    if (!selectedRoomId) {
      setMessages([]);
      setInfoPanelOpen(false);
      setRoomDetail(null);
      return;
    }

    // Оптимистично обнуляем unread у выбранной комнаты
    setRooms(prev => prev.map(r => r.id === selectedRoomId ? { ...r, unread_count: 0 } : r));

    setLoadingMessages(true);
    getChatMessages(selectedRoomId)
      .then(async (msgs) => {
        setMessages(msgs);
        await markChatRead(selectedRoomId).catch(() => {});
        // Обновляем и sidebar, и список комнат
        refreshUnreadCounts();
        loadRooms();
      })
      .catch(() => toast.error('Не удалось загрузить сообщения'))
      .finally(() => setLoadingMessages(false));

    // Poll messages every 10 sec (markChatRead только при новых сообщениях)
    let prevLastId = '';
    pollingMsgsRef.current = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const msgs = await getChatMessages(selectedRoomId);
        const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : '';
        if (lastId !== prevLastId) {
          prevLastId = lastId;
          setMessages(msgs);
          await markChatRead(selectedRoomId);
          refreshUnreadCounts();
          loadRooms();
        }
      } catch {/* silent */}
    }, 10_000);

    return () => {
      if (pollingMsgsRef.current) clearInterval(pollingMsgsRef.current);
    };
  }, [selectedRoomId, refreshUnreadCounts, loadRooms]);

  // Realtime: живые события поверх polling (Matrix). Для TSupport-источника — noop.
  useEffect(() => {
    const unsub = subscribeChat((roomId) => {
      loadRooms();
      if (roomId === selectedRoomId) {
        getChatMessages(selectedRoomId).then(setMessages).catch(() => {});
        markChatRead(selectedRoomId).then(() => refreshUnreadCounts()).catch(() => {});
      }
    });
    return unsub;
  }, [selectedRoomId, loadRooms, refreshUnreadCounts]);

  // Send message (with optional file attachments)
  const handleSend = async () => {
    if (!selectedRoomId || (!messageText.trim() && pendingFiles.length === 0)) return;
    setSending(true);
    try {
      const replyId = replyingTo?.id;
      if (pendingFiles.length > 0) {
        // Upload files first, then send each as a message
        const uploaded = await uploadChatFiles(selectedRoomId, pendingFiles);
        const text = messageText.trim();
        for (let i = 0; i < uploaded.length; i++) {
          const file = uploaded[i];
          const isImg = file.type.startsWith('image/');
          // Текст и reply прикрепляем только к первому файлу
          await sendChatMessage(selectedRoomId, i === 0 ? text : '', {
            type: isImg ? 'image' : 'file',
            file_url: file.url,
            file_name: file.name,
            file_size: file.size,
          }, i === 0 ? replyId : undefined);
        }
        setMessageText('');
        setPendingFiles([]);
      } else {
        await sendChatMessage(selectedRoomId, messageText.trim(), undefined, replyId);
        setMessageText('');
      }
      setReplyingTo(null);
      // Канонично перечитываем таймлайн вместо оптимистичного добавления:
      // matrix-js-sdk уже кладёт local-echo в timeline, а ручной append давал
      // дубль (две одинаковые картинки/сообщения до схлопывания local-echo с remote-эхом).
      getChatMessages(selectedRoomId).then(setMessages).catch(() => {});
      refreshUnreadCounts();
      loadRooms();
    } catch {
      toast.error('Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditConfirm = async (msgId: string, content: string) => {
    if (!selectedRoomId || !content) return;
    setSending(true);
    try {
      await editChatMessage(selectedRoomId, msgId, content);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content, is_edited: true } : m));
      setEditingMessage(null);
      setMessageText('');
    } catch {
      toast.error('Не удалось отредактировать');
    } finally {
      setSending(false);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!selectedRoomId || !confirm('Удалить сообщение?')) return;
    try {
      await deleteChatMessage(selectedRoomId, msg.id);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_deleted: true, content: '' } : m));
    } catch {
      toast.error('Не удалось удалить');
    }
  };

  // Start editing — put content in textarea
  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessage(msg);
    setReplyingTo(null);
    setMessageText(msg.content);
  };

  // Create chat room
  const handleCreateRoom = async (name: string, memberMxids: string[]) => {
    try {
      const room = await createChatRoom({ type: 'company', name, participant_ids: memberMxids });
      await loadRooms();
      setSelectedRoomId(room.id);
      toast.success('Чат создан');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось создать чат';
      toast.error(message);
      throw err;
    }
  };

  const handleSelectRoom = (id: string) => {
    setSelectedRoomId(id);
    setInfoPanelOpen(false);
    setRoomDetail(null);
  };

  // Toggle info panel — load room detail with participants
  const handleToggleInfo = async () => {
    if (infoPanelOpen) {
      setInfoPanelOpen(false);
      return;
    }
    if (!selectedRoomId) return;

    setInfoPanelOpen(true);
    setLoadingInfo(true);
    try {
      const detail = await getChatRoom(selectedRoomId);
      setRoomDetail(detail);
      if (canManageRoom(selectedRoomId)) {
        getCompanyMembers().then(setCompanyMembers).catch(() => setCompanyMembers([]));
      }
    } catch {
      toast.error('Не удалось загрузить информацию о чате');
    } finally {
      setLoadingInfo(false);
    }
  };

  const reloadRoomDetail = async () => {
    if (!selectedRoomId) return;
    try { setRoomDetail(await getChatRoom(selectedRoomId)); } catch { /* ignore */ }
  };
  const handleAddMember = async (mxid: string) => {
    if (!selectedRoomId) return;
    try { await addRoomMember(selectedRoomId, mxid); await reloadRoomDetail(); }
    catch { toast.error('Не удалось добавить участника'); }
  };
  const handleRemoveMember = async (mxid: string) => {
    if (!selectedRoomId) return;
    try { await removeRoomMember(selectedRoomId, mxid); await reloadRoomDetail(); }
    catch { toast.error('Не удалось удалить участника'); }
  };
  const handleDeleteRoom = async () => {
    if (!selectedRoomId || !confirm('Удалить этот чат?')) return;
    try {
      await deleteRoom(selectedRoomId);
      setInfoPanelOpen(false);
      setSelectedRoomId(null);
      await loadRooms();
      toast.success('Чат удалён');
    } catch { toast.error('Не удалось удалить чат'); }
  };

  const roomListPanel = (
    <RoomListPanel
      rooms={rooms}
      loading={loading}
      selectedRoomId={selectedRoomId}
      search={search}
      onSearchChange={setSearch}
      onSelectRoom={handleSelectRoom}
      onRefresh={loadRooms}
      onNewChat={() => setNewChatOpen(true)}
      isMobile={isMobile}
    />
  );

  const messagePanelProps = {
    room: selectedRoom,
    messages,
    loadingMessages,
    currentUserId: tsupportUserId,
    messageText,
    onMessageTextChange: setMessageText,
    onSend: handleSend,
    sending,
    onHeaderClick: handleToggleInfo,
    participantCount: roomDetail?.participants?.length,
    replyingTo,
    onSetReplyingTo: setReplyingTo,
    editingMessage,
    onSetEditingMessage: handleStartEdit,
    onEditConfirm: handleEditConfirm,
    onDeleteMessage: handleDeleteMessage,
    pendingFiles,
    onAddFiles: (files: File[]) => {
      const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        toast.error(`Файл "${oversized[0].name}" превышает ${MAX_FILE_SIZE / (1024 * 1024)} МБ`);
        return;
      }
      setPendingFiles(prev => {
        const combined = [...prev, ...files];
        if (combined.length > MAX_FILES_CHAT) {
          toast.error(`Максимум ${MAX_FILES_CHAT} файлов`);
          return combined.slice(0, MAX_FILES_CHAT);
        }
        return combined;
      });
    },
    onRemoveFile: (index: number) => setPendingFiles(prev => prev.filter((_, i) => i !== index)),
  };

  return (
    <PageShell embedded={embedded}>
      <div className="flex h-full overflow-hidden">
        {/* Desktop: fixed left panel */}
        {!isMobile && (
          <div className="w-[340px] xl:w-[380px] border-r border-border/50 flex flex-col shrink-0">
            {roomListPanel}
          </div>
        )}

        {/* Mobile */}
        {isMobile && (
          <>
            {!selectedRoomId && (
              <div className="flex-1 flex flex-col">
                {roomListPanel}
              </div>
            )}

            {selectedRoomId && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Mobile chat header with back button */}
                <div className="px-2 py-1.5 border-b border-border/50 flex items-center shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedRoomId(null)}
                    className="h-10 px-2 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
                  >
                    ← Назад
                  </Button>
                </div>

                <MessagePanel {...messagePanelProps} />
              </div>
            )}
          </>
        )}

        {/* Desktop: message panel */}
        {!isMobile && (
          <div className="flex-1 flex flex-col min-h-0">
            <MessagePanel {...messagePanelProps} />
          </div>
        )}

        {/* Desktop: info panel (right side) */}
        {!isMobile && infoPanelOpen && selectedRoom && (
          <ChatInfoPanel
            room={selectedRoom}
            participants={roomDetail?.participants || []}
            loadingInfo={loadingInfo}
            onClose={() => setInfoPanelOpen(false)}
            canManage={!!selectedRoomId && canManageRoom(selectedRoomId)}
            currentUserId={tsupportUserId}
            availableMembers={companyMembers.filter(m => !m.mxid || !(roomDetail?.participants || []).some(p => p.user_id === m.mxid))}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onDeleteRoom={handleDeleteRoom}
          />
        )}
      </div>

      {/* Mobile: info panel as Dialog */}
      {isMobile && infoPanelOpen && selectedRoom && (
        <Dialog open={infoPanelOpen} onOpenChange={setInfoPanelOpen}>
          <DialogContent className="bg-background border-border text-foreground p-0 max-w-[340px] max-h-[80vh] overflow-hidden">
            <div className="h-full max-h-[80vh]">
              <ChatInfoPanel
                room={selectedRoom}
                participants={roomDetail?.participants || []}
                loadingInfo={loadingInfo}
                onClose={() => setInfoPanelOpen(false)}
                canManage={!!selectedRoomId && canManageRoom(selectedRoomId)}
                currentUserId={tsupportUserId}
                availableMembers={companyMembers.filter(m => !m.mxid || !(roomDetail?.participants || []).some(p => p.user_id === m.mxid))}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onDeleteRoom={handleDeleteRoom}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* New Chat Dialog */}
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreate={handleCreateRoom}
      />
    </PageShell>
  );
}
