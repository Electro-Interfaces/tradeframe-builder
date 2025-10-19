/**
 * Компонент истории отправленных сообщений
 */

import { Clock, MessageSquare, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { BroadcastMessage } from '@/types/message';
import { MESSAGE_STATUS_LABELS, MESSAGE_STATUS_COLORS } from '@/types/message';

interface MessageHistoryProps {
  messages: BroadcastMessage[];
  loading: boolean;
}

export function MessageHistory({ messages, loading }: MessageHistoryProps) {
  if (loading) {
    return (
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          История сообщений
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="p-6 bg-slate-800/50 border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          История сообщений
        </h2>
        <div className="text-center py-8 text-slate-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Нет отправленных сообщений</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-800/50 border-slate-700">
      <h2 className="text-xl font-semibold text-slate-100 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        История сообщений
      </h2>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {messages.map((msg) => (
          <MessageCard key={msg.id} message={msg} />
        ))}
      </div>
    </Card>
  );
}

/**
 * Карточка отдельного сообщения
 */
interface MessageCardProps {
  message: BroadcastMessage;
}

function MessageCard({ message }: MessageCardProps) {
  return (
    <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-blue-500/50 transition-all cursor-pointer group">
      {/* Заголовок и статус */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-slate-200 text-sm line-clamp-1 group-hover:text-blue-400 transition-colors">
          {message.title}
        </h3>
        <Badge
          variant="outline"
          className={`${MESSAGE_STATUS_COLORS[message.status]} flex-shrink-0 ml-2`}
        >
          {MESSAGE_STATUS_LABELS[message.status]}
        </Badge>
      </div>

      {/* Содержимое */}
      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
        {message.content}
      </p>

      {/* Информация */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Users className="w-3 h-3" />
        <span>{message.total_recipients} получателей</span>

        {message.sent_at && (
          <>
            <span>•</span>
            <span>{new Date(message.sent_at).toLocaleString('ru-RU', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </>
        )}
      </div>

      {/* Статистика доставки */}
      {message.status === 'sent' && (
        <div className="mt-2 flex gap-3 text-xs">
          <span className="text-green-500 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {message.delivered_count} доставлено
          </span>
          {message.failed_count > 0 && (
            <span className="text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {message.failed_count} ошибок
            </span>
          )}
        </div>
      )}
    </div>
  );
}
