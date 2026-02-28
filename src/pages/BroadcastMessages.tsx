/**
 * Страница отправки broadcast сообщений пользователям (РЕФАКТОРИНГ)
 * Отправка через Telegram
 */

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MessageForm } from '@/components/messages/MessageForm';
import { MessageHistory } from '@/components/messages/MessageHistory';
import { useToast } from '@/hooks/use-toast';
import { useNewAuth } from '@/contexts/NewAuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBroadcastMessage } from '@/hooks/useBroadcastMessage';
import messageService from '@/services/messageService';
import type { BroadcastMessage, CreateMessageData } from '@/types/message';

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

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`font-bold text-foreground flex items-center gap-2 md:gap-3 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              <MessageSquare className={`text-blue-500 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              Рассылка сообщений
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Отправка новостных сообщений и объявлений через Telegram
            </p>
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
            <MessageHistory messages={messages} loading={loading} isMobile={isMobile} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
