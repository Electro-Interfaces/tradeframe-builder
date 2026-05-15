/**
 * Компонент истории отправленных сообщений
 */

import { Clock, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BroadcastMessage } from '@/types/message';
import { MESSAGE_STATUS_LABELS } from '@/types/message';

interface MessageHistoryProps {
  messages: BroadcastMessage[];
  loading: boolean;
}

function formatDateTime(dateString?: string): string {
  if (!dateString) {
    return '—';
  }

  return new Date(dateString).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadgeClass(message: BroadcastMessage): string {
  if (message.status === 'failed') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
  }

  if (message.failed_count > 0) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
  }

  return 'bg-secondary text-foreground border-border';
}

export function MessageHistory({ messages, loading }: MessageHistoryProps) {
  if (loading) {
    return (
      <Card className="p-6 bg-card/50 border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          История сообщений
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="p-6 bg-card/50 border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          История сообщений
        </h2>
        <EmptyState
          className="py-12"
          title="Нет отправленных сообщений"
          description="История рассылки появится после сохранения или отправки первого сообщения."
        />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        История сообщений
      </h2>

      <div className="hidden md:block max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сообщение</TableHead>
              <TableHead className="w-[120px]">Статус</TableHead>
              <TableHead className="w-[110px] text-right">Получатели</TableHead>
              <TableHead className="w-[150px] text-right">Доставка</TableHead>
              <TableHead className="w-[150px]">Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">{message.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{message.content}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusBadgeClass(message)}>
                    {MESSAGE_STATUS_LABELS[message.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-foreground/80">
                  {message.total_recipients.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="space-y-1 text-xs">
                    <div className="font-mono text-foreground/80">{message.delivered_count.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
                    {message.failed_count > 0 && (
                      <div className="text-red-600 dark:text-red-400">
                        {message.failed_count.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ошибок
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-foreground/80">
                  {formatDateTime(message.sent_at || message.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Сообщение</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={message.id} className="align-top">
                <TableCell className="align-top">
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium text-foreground">{message.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground line-clamp-3">{message.content}</div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={getStatusBadgeClass(message)}>
                        {MESSAGE_STATUS_LABELS[message.status]}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        Получатели: {message.total_recipients.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </div>
                      <div>
                        Доставлено: {message.delivered_count.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                      </div>
                      {message.failed_count > 0 && (
                        <div className="text-red-600 dark:text-red-400">
                          Ошибок: {message.failed_count.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
                        </div>
                      )}
                      <div className="font-mono">
                        {formatDateTime(message.sent_at || message.created_at)}
                      </div>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
