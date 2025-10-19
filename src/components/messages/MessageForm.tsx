/**
 * Форма создания и отправки broadcast сообщения
 */

import { Send, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import type {
  MessagePriority,
  MessageType,
  RecipientType,
  MessageChannel
} from '@/types/message';
import {
  MESSAGE_TYPE_LABELS,
  MESSAGE_PRIORITY_LABELS,
  RECIPIENT_TYPE_LABELS
} from '@/types/message';

interface MessageFormProps {
  title: string;
  content: string;
  messageType: MessageType;
  priority: MessagePriority;
  channels: MessageChannel[];
  recipientType: RecipientType;
  sending: boolean;
  isMobile?: boolean;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onMessageTypeChange: (value: MessageType) => void;
  onPriorityChange: (value: MessagePriority) => void;
  onChannelsChange: (channels: MessageChannel[]) => void;
  onRecipientTypeChange: (value: RecipientType) => void;
  onSend: () => void;
  onSaveAsDraft: () => void;
  onReset: () => void;
}

export function MessageForm({
  title,
  content,
  messageType,
  priority,
  channels,
  recipientType,
  sending,
  isMobile = false,
  onTitleChange,
  onContentChange,
  onMessageTypeChange,
  onPriorityChange,
  onChannelsChange,
  onRecipientTypeChange,
  onSend,
  onSaveAsDraft,
  onReset
}: MessageFormProps) {
  const handleToggleChannel = (channel: MessageChannel) => {
    const newChannels = channels.includes(channel)
      ? channels.filter(c => c !== channel)
      : [...channels, channel];
    onChannelsChange(newChannels);
  };

  const isFormValid = title.trim() && content.trim();

  return (
    <Card className="p-4 md:p-6 bg-slate-800/50 border-slate-700">
      <h2 className={`font-semibold text-slate-100 mb-4 flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
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
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Введите заголовок..."
            className="mt-1 bg-slate-900 border-slate-700 text-white"
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
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Введите текст сообщения..."
            className="mt-1 min-h-[200px] bg-slate-900 border-slate-700 text-white"
          />
          <p className="text-xs text-slate-500 mt-1">
            Поддерживается Markdown форматирование
          </p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Настройки сообщения */}
        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
          {/* Тип сообщения */}
          <div>
            <Label className="text-slate-300">Тип сообщения</Label>
            <select
              value={messageType}
              onChange={(e) => onMessageTypeChange(e.target.value as MessageType)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              onChange={(e) => onPriorityChange(e.target.value as MessagePriority)}
              className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            onChange={(e) => onRecipientTypeChange(e.target.value as RecipientType)}
            className="w-full mt-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3`}>
          <Button
            onClick={onSend}
            disabled={sending || !isFormValid || channels.length === 0}
            className={`${isMobile ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700`}
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
            onClick={onSaveAsDraft}
            variant="outline"
            disabled={!isFormValid}
            className={`${isMobile ? 'w-full' : ''} border-slate-600 hover:bg-slate-700`}
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить черновик
          </Button>

          <Button
            onClick={onReset}
            variant="ghost"
            className={`${isMobile ? 'w-full' : ''} hover:bg-slate-700`}
          >
            Очистить
          </Button>
        </div>
      </div>
    </Card>
  );
}
