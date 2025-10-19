/**
 * Страница отправки broadcast сообщений пользователям
 * Отправка через Telegram и Email
 */

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Save,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useNewAuth } from '@/contexts/NewAuthContext';
import messageService from '@/services/messageService';
import type {
  BroadcastMessage,
  CreateMessageData,
  MessagePriority,
  MessageType,
  RecipientType,
  MessageChannel
} from '@/types/message';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_PRIORITY_LABELS,
  RECIPIENT_TYPE_LABELS,
  MESSAGE_STATUS_LABELS,
  MESSAGE_STATUS_COLORS
} from '@/types/message';

export default function BroadcastMessagesPage() {
  const { user } = useNewAuth();
  const { toast } = useToast();

  // Состояния формы
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('news');
  const [priority, setPriority] = useState<MessagePriority>('medium');
  const [channels, setChannels] = useState<MessageChannel[]>(['telegram', 'email']);
  const [recipientType, setRecipientType] = useState<RecipientType>('all');

  // Состояния списка сообщений
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await messageService.getMessages({
        authorId: user.id,
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

    if (!title.trim() || !content.trim()) {
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
        title,
        content,
        message_type: messageType,
        priority,
        channels,
        recipient_type: recipientType
      };

      await messageService.createMessage(messageData);

      toast({
        title: 'Сохранено',
        description: 'Черновик сообщения сохранен'
      });

      resetForm();
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

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Заполните заголовок и текст сообщения',
        variant: 'destructive'
      });
      return;
    }

    if (channels.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы один канал отправки',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);

    try {
      const messageData: CreateMessageData = {
        author_id: user.id,
        title,
        content,
        message_type: messageType,
        priority,
        channels,
        recipient_type: recipientType
      };

      const { sendResult } = await messageService.createAndSendMessage(messageData);

      toast({
        title: 'Отправлено!',
        description: `Сообщение отправлено ${sendResult.total_recipients} получателям`
      });

      resetForm();

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

  const handleToggleChannel = (channel: MessageChannel) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMessageType('news');
    setPriority('medium');
    setChannels(['telegram', 'email']);
    setRecipientType('all');
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-500" />
              Рассылка сообщений
            </h1>
            <p className="text-slate-400 mt-2">
              Отправка новостных сообщений и объявлений через Telegram и Email
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Форма создания сообщения */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5" />
                Новое сообщение
              </h2>

              <div className="space-y-4">
                {/* Заголовок */}
                <div>
                  <Label htmlFor="title" className="text-slate-300">
                    Заголовок сообщения
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Введите заголовок..."
                    className="mt-1"
                  />
                </div>

                {/* Текст сообщения */}
                <div>
                  <Label htmlFor="content" className="text-slate-300">
                    Текст сообщения
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Введите текст сообщения..."
                    className="mt-1 min-h-[200px]"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Поддерживается Markdown форматирование
                  </p>
                </div>

                <Separator className="bg-slate-700" />

                {/* Настройки сообщения */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Тип сообщения */}
                  <div>
                    <Label className="text-slate-300">Тип сообщения</Label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value as MessageType)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                    >
                      {Object.entries(MESSAGE_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Приоритет */}
                  <div>
                    <Label className="text-slate-300">Приоритет</Label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as MessagePriority)}
                      className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                    >
                      {Object.entries(MESSAGE_PRIORITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Каналы доставки */}
                <div>
                  <Label className="text-slate-300 mb-2 block">
                    Каналы доставки
                  </Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={channels.includes('telegram')}
                        onCheckedChange={() => handleToggleChannel('telegram')}
                      />
                      <span className="text-slate-300">Telegram</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch
                        checked={channels.includes('email')}
                        onCheckedChange={() => handleToggleChannel('email')}
                      />
                      <span className="text-slate-300">Email</span>
                    </label>
                  </div>
                </div>

                {/* Получатели */}
                <div>
                  <Label className="text-slate-300">Получатели</Label>
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100"
                  >
                    {Object.entries(RECIPIENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <Separator className="bg-slate-700" />

                {/* Кнопки действий */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleSend}
                    disabled={sending || !title.trim() || !content.trim()}
                    className="flex-1"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Отправить сейчас
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleSaveAsDraft}
                    variant="outline"
                    disabled={!title.trim() || !content.trim()}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Сохранить черновик
                  </Button>

                  <Button onClick={resetForm} variant="ghost">
                    Очистить
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Список сообщений */}
          <div>
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                История сообщений
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Нет отправленных сообщений</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-slate-200 text-sm line-clamp-1">
                          {msg.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={MESSAGE_STATUS_COLORS[msg.status]}
                        >
                          {MESSAGE_STATUS_LABELS[msg.status]}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {msg.content}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>{msg.total_recipients} получателей</span>

                        {msg.sent_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(msg.sent_at).toLocaleString('ru-RU')}</span>
                          </>
                        )}
                      </div>

                      {msg.status === 'sent' && (
                        <div className="mt-2 flex gap-2 text-xs">
                          <span className="text-green-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {msg.delivered_count} доставлено
                          </span>
                          {msg.failed_count > 0 && (
                            <span className="text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {msg.failed_count} ошибок
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
