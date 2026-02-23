/**
 * ChatPage — Telegram-стиль мессенджер
 * Левая панель: список чат-комнат + создание нового чата
 * Правая панель: переписка с группировкой, пузырями, разделителями дат
 * Правая боковая: инфо о чате + участники (по клику на header)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Search, Send, Loader2, RefreshCw, MessageCircle, Users, Plus,
  Menu, User, Building2, X, Calendar, Shield, Eye, Crown,
  Paperclip, FileText, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSupportContext } from '@/contexts/SupportContext';
import {
  getChatRooms, getChatMessages, sendChatMessage, markChatRead, createChatRoom, getChatRoom, uploadChatFiles, getTSupportMe,
} from '@/services/supportService';
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
}: {
  rooms: ChatRoom[];
  loading: boolean;
  selectedRoomId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectRoom: (id: string) => void;
  onRefresh: () => void;
  onNewChat: () => void;
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          {/* Filter tabs inline with title */}
          <div className="flex gap-1 flex-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={onNewChat} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onRefresh} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Поиск..."
            className="!h-9 pl-8 text-sm bg-slate-800 border-slate-600 text-white"
          />
        </div>
      </div>

      {/* Room list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            {search ? 'Ничего не найдено' : 'Нет диалогов'}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {filteredRooms.map(room => {
              const isSelected = selectedRoomId === room.id;
              const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';
              return (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room.id)}
                  className={`w-full text-left p-3 hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-slate-800' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isCompany ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                      {isCompany ? (
                        <Users className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <User className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium truncate">
                          {room.name || (isCompany ? 'Чат компании' : 'Личный чат')}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {(room.unread_count ?? 0) > 0 && (
                            <span className="inline-flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1">
                              {room.unread_count}
                            </span>
                          )}
                          {room.last_message_at && (
                            <span className="text-xs text-slate-500">
                              {formatTime(room.last_message_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      {room.last_message && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {room.last_message_by ? `${room.last_message_by}: ` : ''}{room.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ========== New Chat Dialog ==========

function NewChatDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (type: 'direct' | 'company', name?: string, participant_ids?: string[]) => void;
}) {
  const [type, setType] = useState<'direct' | 'company'>('direct');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreate(type, name.trim() || undefined);
      setName('');
      setType('direct');
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Новый чат</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Type selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType('direct')}
              className={`p-4 rounded-lg border transition-colors text-center ${
                type === 'direct'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <User className={`h-6 w-6 mx-auto mb-2 ${type === 'direct' ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className="text-sm font-medium">Личный</p>
              <p className="text-xs text-slate-500 mt-0.5">Чат с Elsy</p>
            </button>
            <button
              onClick={() => setType('company')}
              className={`p-4 rounded-lg border transition-colors text-center ${
                type === 'company'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Building2 className={`h-6 w-6 mx-auto mb-2 ${type === 'company' ? 'text-emerald-400' : 'text-slate-400'}`} />
              <p className="text-sm font-medium">Компания</p>
              <p className="text-xs text-slate-500 mt-0.5">Групповой чат</p>
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Тема (необязательно)</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Например: Вопрос по оплате"
              className="bg-slate-800 border-slate-600 text-white text-sm"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-blue-600 hover:bg-blue-700"
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
      <span className="bg-slate-800/80 text-slate-400 text-xs px-3 py-1 rounded-full">
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
}: {
  message: ChatMessage;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}) {
  // Системное сообщение
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-500 italic px-3 py-1">
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
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : 'mt-0.5'}`}>
      <div
        className={`max-w-[75%] px-3 py-1.5 ${radius} ${
          isOwn
            ? 'bg-[#2B5278]'
            : 'bg-slate-800'
        }`}
      >
        {/* Author name (only for others, first in group) */}
        {!isOwn && isFirstInGroup && (
          <p className={`text-xs font-semibold mb-0.5 ${colorClass}`}>
            {message.user_name}
          </p>
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
              isOwn ? 'bg-[#1e3f5e] hover:bg-[#244a6e]' : 'bg-slate-700/50 hover:bg-slate-700'
            }`}
          >
            <FileText className="h-8 w-8 text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white truncate">{message.file_name || 'Файл'}</p>
              {message.file_size != null && (
                <p className="text-[10px] text-slate-400">
                  {message.file_size < 1024 * 1024
                    ? `${(message.file_size / 1024).toFixed(0)} КБ`
                    : `${(message.file_size / (1024 * 1024)).toFixed(1)} МБ`}
                </p>
              )}
            </div>
            <Download className="h-4 w-4 text-slate-400 shrink-0" />
          </a>
        ))}

        {/* Content */}
        <div className="flex items-end gap-2">
          {message.content && (
            <p className="text-sm text-white whitespace-pre-wrap break-words flex-1">
              {message.content}
            </p>
          )}
          <span className="text-xs text-slate-400 shrink-0 translate-y-0.5 select-none">
            {message.is_edited && <span className="text-slate-500 mr-1">ред.</span>}
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
  if (role === 'admin') return <Crown className="h-3 w-3 text-amber-400" />;
  if (role === 'observer') return <Eye className="h-3 w-3 text-slate-500" />;
  return <Shield className="h-3 w-3 text-slate-600" />;
}

function ChatInfoPanel({
  room,
  participants,
  loadingInfo,
  onClose,
}: {
  room: ChatRoom;
  participants: ChatParticipant[];
  loadingInfo: boolean;
  onClose: () => void;
}) {
  const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';
  const typeLabel = isCompany ? 'Чат компании' : 'Личный чат';

  return (
    <div className="w-[280px] border-l border-slate-700/50 flex flex-col shrink-0 bg-slate-900/50">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-white">Информация</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center text-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${isCompany ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
              {isCompany ? (
                <Users className="h-7 w-7 text-emerald-400" />
              ) : (
                <User className="h-7 w-7 text-blue-400" />
              )}
            </div>
            <p className="text-sm font-medium text-white">
              {room.name || typeLabel}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{typeLabel}</p>
          </div>

          {/* Info fields */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <div>
                <p className="text-slate-500">Создан</p>
                <p className="text-slate-300">
                  {new Date(room.created_at).toLocaleDateString('ru', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {isCompany && (
              <div className="flex items-center gap-2.5 text-xs">
                <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <div>
                  <p className="text-slate-500">Тип</p>
                  <p className="text-slate-300">Групповой</p>
                </div>
              </div>
            )}
          </div>

          {/* Participants */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
              Участники{!loadingInfo && ` (${participants.length})`}
            </p>

            {loadingInfo ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            ) : participants.length === 0 ? (
              <p className="text-xs text-slate-600 py-2">Нет участников</p>
            ) : (
              <div className="space-y-1">
                {participants.map(p => {
                  const colorClass = getUserColor(p.user_id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
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
                          <span className="text-[10px] text-slate-500">
                            {ROLE_LABELS[p.role] || p.role}
                          </span>
                          {p.user_role && p.user_role !== p.role && (
                            <>
                              <span className="text-[10px] text-slate-700">·</span>
                              <span className="text-[10px] text-slate-600">
                                {USER_ROLE_LABELS[p.user_role] || p.user_role}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-700" />
          <p>Выберите диалог</p>
        </div>
      </div>
    );
  }

  const isCompany = room.type === 'company' || room.type === 'group' || room.type === 'ticket';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat Header — clickable to open info panel */}
      <button
        onClick={onHeaderClick}
        className="p-3 border-b border-slate-700/50 flex items-center gap-2.5 shrink-0 hover:bg-slate-800/30 transition-colors text-left w-full"
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isCompany ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
          {isCompany ? (
            <Users className="h-4 w-4 text-emerald-400" />
          ) : (
            <User className="h-4 w-4 text-blue-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate">
            {room.name || (isCompany ? 'Чат компании' : 'Личный чат')}
          </p>
          <p className="text-xs text-slate-500">
            {isCompany ? 'Чат компании' : 'Личный чат'}
            {participantCount != null && participantCount > 0 && (
              <span className="ml-1">· {participantCount} участн.</span>
            )}
          </p>
        </div>
      </button>

      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] text-slate-500 text-sm">
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
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-3 pt-2 border-t border-slate-700/50 shrink-0">
          <div className="flex gap-2 flex-wrap">
            {pendingFiles.map((f, i) => (
              <div key={i} className="relative group">
                {isImage(f) ? (
                  <img
                    src={getBlobUrl(f, i)}
                    alt={f.name}
                    className="h-16 w-16 rounded object-cover border border-slate-600"
                  />
                ) : (
                  <div className="h-16 w-16 rounded border border-slate-600 bg-slate-800 flex flex-col items-center justify-center p-1">
                    <FileText className="h-5 w-5 text-blue-400 mb-0.5" />
                    <span className="text-[9px] text-slate-400 truncate w-full text-center">{f.name.split('.').pop()}</span>
                  </div>
                )}
                <button
                  onClick={() => onRemoveFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-[9px] text-slate-500 truncate max-w-[64px] mt-0.5">{f.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`p-3 ${pendingFiles.length === 0 ? 'border-t border-slate-700/50' : ''} shrink-0`}>
        <div className="flex gap-2 items-end">
          {/* Attach button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={openFilePicker}
            disabled={sending}
            className="h-9 w-9 text-slate-400 hover:text-white shrink-0"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={messageText}
            onChange={e => onMessageTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            className="flex-1 bg-slate-800 border-slate-600 text-white text-sm resize-none min-h-[38px] max-h-[120px]"
            rows={1}
          />
          <Button
            size="icon"
            onClick={onSend}
            disabled={sending || (!messageText.trim() && pendingFiles.length === 0)}
            className="h-9 w-9 bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========== Main ChatPage ==========

export default function ChatPage() {
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [tsupportUserId, setTsupportUserId] = useState('');

  // Chat info panel state
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [roomDetail, setRoomDetail] = useState<ChatRoom | null>(null);
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

  // Load TSupport user ID (maps TradeFrame ID → TSupport internal ID)
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

  // Send message (with optional file attachments)
  const handleSend = async () => {
    if (!selectedRoomId || (!messageText.trim() && pendingFiles.length === 0)) return;
    setSending(true);
    try {
      if (pendingFiles.length > 0) {
        // Upload files first, then send each as a message
        const uploaded = await uploadChatFiles(selectedRoomId, pendingFiles);
        const text = messageText.trim();
        for (let i = 0; i < uploaded.length; i++) {
          const file = uploaded[i];
          const isImg = file.type.startsWith('image/');
          // Текст прикрепляем только к первому файлу
          const msg = await sendChatMessage(selectedRoomId, i === 0 ? text : '', {
            type: isImg ? 'image' : 'file',
            file_url: file.url,
            file_name: file.name,
            file_size: file.size,
          });
          setMessages(prev => [...prev, msg]);
        }
        setMessageText('');
        setPendingFiles([]);
      } else {
        const msg = await sendChatMessage(selectedRoomId, messageText.trim());
        setMessages(prev => [...prev, msg]);
        setMessageText('');
      }
      refreshUnreadCounts();
      loadRooms();
    } catch {
      toast.error('Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  // Create chat room
  const handleCreateRoom = async (type: 'direct' | 'company', name?: string, participant_ids?: string[]) => {
    try {
      const room = await createChatRoom({ type, name, participant_ids });
      await loadRooms();
      setSelectedRoomId(room.id);
      if (isMobile) setSheetOpen(false);
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
    if (isMobile) setSheetOpen(false);
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
    } catch {
      toast.error('Не удалось загрузить информацию о чате');
    } finally {
      setLoadingInfo(false);
    }
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
    <MainLayout fullWidth>
      <div className="flex h-[calc(100dvh-var(--header-height,3.5rem))] overflow-hidden">
        {/* Desktop: fixed left panel */}
        {!isMobile && (
          <div className="w-[420px] border-r border-slate-700/50 flex flex-col shrink-0">
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
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Mobile chat header with back button */}
                  <div className="p-2 border-b border-slate-700/50 flex items-center gap-2 shrink-0">
                    <SheetTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRoomId(null)}
                      className="text-xs text-slate-400"
                    >
                      Назад
                    </Button>
                  </div>

                  <MessagePanel {...messagePanelProps} />
                </div>

                <SheetContent side="left" className="w-[300px] p-0 bg-slate-900 border-slate-700">
                  {roomListPanel}
                </SheetContent>
              </Sheet>
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
          />
        )}
      </div>

      {/* Mobile: info panel as Dialog */}
      {isMobile && infoPanelOpen && selectedRoom && (
        <Dialog open={infoPanelOpen} onOpenChange={setInfoPanelOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white p-0 max-w-[340px] max-h-[80vh] overflow-hidden">
            <div className="h-full max-h-[80vh]">
              <ChatInfoPanel
                room={selectedRoom}
                participants={roomDetail?.participants || []}
                loadingInfo={loadingInfo}
                onClose={() => setInfoPanelOpen(false)}
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
    </MainLayout>
  );
}
