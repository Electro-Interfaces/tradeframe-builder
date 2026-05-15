/**
 * Страница отправки broadcast сообщений пользователям (РЕФАКТОРИНГ)
 * Отправка через Telegram
 */

import { useMemo, useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MessageForm } from '@/components/messages/MessageForm';
import { MessageHistory } from '@/components/messages/MessageHistory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBroadcastMessage } from '@/hooks/useBroadcastMessage';
import messageService from '@/services/messageService';
import type { BroadcastMessage, CreateMessageData } from '@/types/message';
import { MESSAGE_STATUS_LABELS } from '@/types/message';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';

type MessageStatusFilter = BroadcastMessage['status'] | 'all';

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

export default function BroadcastMessagesPage() {
  const { user } = useNewAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Управление состоянием формы через кастомный хук
  const messageForm = useBroadcastMessage();

  // Состояния списка сообщений
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MessageStatusFilter>('all');

  // Загружаем сообщения при монтировании
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Загружаем сообщения для фиксированной сети (ID 15)
      const response = await messageService.getMessages({
        networkId: messageForm.selectedNetworkId,
        limit: 20
      });

      setMessages(response.data || []);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить список сообщений',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsDraft = async () => {
    if (!user?.id) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive'
      });
      return;
    }

    if (!messageForm.isValid()) {
      toast({
        title: 'Ошибка',
        description: 'Заполните заголовок и текст сообщения',
        variant: 'destructive'
      });
      return;
    }

    try {
      const messageData: CreateMessageData = {
        author_id: user.id,
        ...messageForm.getFormData()
      };

      await messageService.createMessage(messageData);

      toast({
        title: 'Сохранено',
        description: 'Черновик сообщения сохранен'
      });

      messageForm.reset();
      loadMessages();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить черновик',
        variant: 'destructive'
      });
    }
  };

  const handleSend = async () => {
    if (!user?.id) {
      toast({
        title: 'Ошибка',
        description: 'Пользователь не авторизован',
        variant: 'destructive'
      });
      return;
    }

    if (!messageForm.isValid()) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все обязательные поля',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);

    try {
      const messageData: CreateMessageData = {
        author_id: user.id,
        ...messageForm.getFormData()
      };

      const { sendResult } = await messageService.createAndSendMessage(messageData);

      toast({
        title: 'Отправлено!',
        description: `Сообщение отправлено ${sendResult.total_recipients} получателям`
      });

      messageForm.reset();

      // Задержка перед обновлением списка, чтобы дать время async отправке завершиться
      setTimeout(() => {
        loadMessages();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Ошибка отправки',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return messages.filter((message) => {
      const matchesStatus = statusFilter === 'all' || message.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [message.title, message.content, MESSAGE_STATUS_LABELS[message.status]]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [messages, searchTerm, statusFilter]);

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`font-bold text-foreground flex items-center gap-2 md:gap-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              <MessageSquare className={`text-primary ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              Рассылка сообщений
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Отправка новостных сообщений и объявлений через Telegram
            </p>
          </div>
        </div>

        <div className={FILTER_PANEL_CLASS}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры истории</span>
              <span className="text-sm text-muted-foreground">
                Найдено: {formatInteger(filteredMessages.length)}
              </span>
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label htmlFor="broadcast-messages-search" className="text-xs text-muted-foreground">
                Поиск
              </Label>
              <Input
                id="broadcast-messages-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Заголовок или текст сообщения"
                className={FILTER_PANEL_CONTROL_CLASS}
              />
            </div>

            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="broadcast-messages-status" className="text-xs text-muted-foreground">
                Статус
              </Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MessageStatusFilter)}>
                <SelectTrigger id="broadcast-messages-status" className={FILTER_PANEL_CONTROL_CLASS}>
                  <SelectValue placeholder="Все статусы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(MESSAGE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:flex-none sm:min-w-[180px] sm:self-end`}>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Сбросить
              </Button>
            </div>
          </div>
        </div>

        {/* Адаптивный layout: вертикальный на мобильных, grid на desktop */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-4 md:gap-6`}>
          {/* Форма создания сообщения */}
          <div className={isMobile ? '' : 'lg:col-span-2'}>
            <MessageForm
              title={messageForm.title}
              content={messageForm.content}
              messageType={messageForm.messageType}
              priority={messageForm.priority}
              channels={messageForm.channels}
              recipientType={messageForm.recipientType}
              selectedNetworkId={messageForm.selectedNetworkId}
              networks={[]} // Не используется при фиксированной сети
              sending={sending}
              isMobile={isMobile}
              onTitleChange={messageForm.setTitle}
              onContentChange={messageForm.setContent}
              onMessageTypeChange={messageForm.setMessageType}
              onPriorityChange={messageForm.setPriority}
              onChannelsChange={messageForm.setChannels}
              onRecipientTypeChange={messageForm.setRecipientType}
              onNetworkChange={() => {}} // Заглушка - сеть фиксирована
              onSend={handleSend}
              onSaveAsDraft={handleSaveAsDraft}
              onReset={messageForm.reset}
            />
          </div>

          {/* Список сообщений */}
          <div>
            <MessageHistory messages={filteredMessages} loading={loading} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
