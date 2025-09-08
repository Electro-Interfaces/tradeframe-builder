import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Mail, MessageSquare, Webhook } from "lucide-react";

// Функция для локализации ключей данных триггера
const getTriggerKeyLabel = (key: string): string => {
  const labels: Record<string, string> = {
    'point': 'Торговая точка',
    'tank': 'Резервуар',
    'level': 'Уровень',
    'fuelType': 'Тип топлива',
    'temperature': 'Температура',
    'pressure': 'Давление',
    'flow': 'Поток',
    'user': 'Пользователь',
    'equipment': 'Оборудование',
    'component': 'Компонент',
    'threshold': 'Порог',
    'value': 'Значение',
    'status': 'Статус',
    'time': 'Время',
    'network': 'Сеть'
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

interface NotificationEvent {
  id: string;
  timestamp: string;
  triggerData: Record<string, any>;
  generatedMessage: string;
  channels: {
    type: 'email' | 'telegram' | 'webhook';
    status: 'sent' | 'failed';
    recipients: string[];
    error?: string;
  }[];
  status: 'sent' | 'partial' | 'failed';
}

// ❌ MOCK ДАННЫЕ УДАЛЕНЫ ИЗ СООБРАЖЕНИЙ БЕЗОПАСНОСТИ
const mockEvents: NotificationEvent[] = [];

interface NotificationHistoryProps {
  ruleId: string;
  onClose: () => void;
}

export function NotificationHistory({ ruleId, onClose }: NotificationHistoryProps) {
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (status: NotificationEvent['status']) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Отправлено</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Частично</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ошибка</Badge>;
      default:
        return <Badge variant="secondary">Неизвестно</Badge>;
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'telegram':
        return <MessageSquare className="w-4 h-4" />;
      case 'webhook':
        return <Webhook className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const renderTriggerData = (data: Record<string, any>) => {
    return Object.entries(data).map(([key, value]) => (
      <div key={key} className="text-sm">
        <span className="font-medium text-muted-foreground">
          {getTriggerKeyLabel(key)}:
        </span>
        <span className="ml-2">
          {typeof value === 'object' && value !== null
            ? Object.entries(value).map(([k, v]) => (
                <span key={k} className="text-xs bg-muted px-2 py-1 rounded ml-1">
                  {getTriggerKeyLabel(k)}: {String(v)}
                </span>
              ))
            : String(value)
          }
        </span>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">История уведомлений</h3>
        
        {mockEvents.length > 0 ? (
          <div className="space-y-4">
            {mockEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {formatDateTime(event.timestamp)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.generatedMessage}
                      </p>
                    </div>
                    {getStatusBadge(event.status)}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Trigger Data */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Данные события:</h4>
                    <div className="bg-muted/30 p-3 rounded-lg space-y-1">
                      {renderTriggerData(event.triggerData)}
                    </div>
                  </div>

                  {/* Channels */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Каналы отправки:</h4>
                    <div className="space-y-2">
                      {event.channels.map((channel, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getChannelIcon(channel.type)}
                            <div>
                              <div className="text-sm font-medium capitalize">{channel.type}</div>
                              <div className="text-xs text-muted-foreground">
                                {channel.recipients.join(', ')}
                              </div>
                              {channel.error && (
                                <div className="text-xs text-red-600 mt-1">
                                  Ошибка: {channel.error}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {channel.status === 'sent' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <Badge 
                              variant={channel.status === 'sent' ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {channel.status === 'sent' ? 'Отправлено' : 'Ошибка'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>История уведомлений пуста</p>
            <p className="text-sm">Это правило еще не активировалось</p>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}