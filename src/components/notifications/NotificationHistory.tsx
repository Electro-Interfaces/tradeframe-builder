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

// Mock notification history
const mockEvents: NotificationEvent[] = [
  {
    id: "event-1",
    timestamp: "2024-08-29T08:30:00Z",
    triggerData: {
      point: { name: "АЗС-5" },
      tank: { name: "Резервуар #3", level: 12, fuelType: "АИ-95" }
    },
    generatedMessage: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке АЗС-5 в резервуаре Резервуар #3 осталось 12% топлива АИ-95",
    channels: [
      {
        type: "email",
        status: "sent",
        recipients: ["manager@azs.com", "operator@azs.com"]
      },
      {
        type: "telegram",
        status: "sent",
        recipients: ["@manager_azs", "@operator_azs"]
      }
    ],
    status: "sent"
  },
  {
    id: "event-2",
    timestamp: "2024-08-28T14:15:00Z",
    triggerData: {
      point: { name: "АЗС-3" },
      tank: { name: "Резервуар #1", level: 8, fuelType: "АИ-95" }
    },
    generatedMessage: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке АЗС-3 в резервуаре Резервуар #1 осталось 8% топлива АИ-95",
    channels: [
      {
        type: "email",
        status: "sent",
        recipients: ["manager@azs.com", "operator@azs.com"]
      },
      {
        type: "telegram",
        status: "failed",
        recipients: ["@manager_azs"],
        error: "Bot was blocked by user"
      }
    ],
    status: "partial"
  },
  {
    id: "event-3",
    timestamp: "2024-08-27T16:45:00Z",
    triggerData: {
      point: { name: "АЗС-1" },
      tank: { name: "Резервуар #2", level: 14, fuelType: "АИ-95" }
    },
    generatedMessage: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке АЗС-1 в резервуаре Резервуар #2 осталось 14% топлива АИ-95",
    channels: [
      {
        type: "email",
        status: "failed",
        recipients: ["manager@azs.com"],
        error: "SMTP server timeout"
      },
      {
        type: "telegram",
        status: "sent",
        recipients: ["@manager_azs", "@operator_azs"]
      }
    ],
    status: "partial"
  },
  {
    id: "event-4",
    timestamp: "2024-08-26T09:20:00Z",
    triggerData: {
      point: { name: "АЗС-2" },
      tank: { name: "Резервуар #4", level: 13, fuelType: "АИ-95" }
    },
    generatedMessage: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке АЗС-2 в резервуаре Резервуар #4 осталось 13% топлива АИ-95",
    channels: [
      {
        type: "email",
        status: "failed",
        recipients: ["manager@azs.com", "operator@azs.com"],
        error: "Invalid email address"
      },
      {
        type: "telegram",
        status: "failed",
        recipients: ["@manager_azs"],
        error: "Network error"
      }
    ],
    status: "failed"
  },
  {
    id: "event-5",
    timestamp: "2024-08-25T11:10:00Z",
    triggerData: {
      point: { name: "АЗС-4" },
      tank: { name: "Резервуар #1", level: 11, fuelType: "АИ-95" }
    },
    generatedMessage: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке АЗС-4 в резервуаре Резервуар #1 осталось 11% топлива АИ-95",
    channels: [
      {
        type: "email",
        status: "sent",
        recipients: ["manager@azs.com", "operator@azs.com"]
      },
      {
        type: "telegram",
        status: "sent",
        recipients: ["@manager_azs", "@operator_azs"]
      }
    ],
    status: "sent"
  }
];

interface NotificationHistoryProps {
  ruleId: string;
  onClose: () => void;
}

export function NotificationHistory({ ruleId, onClose }: NotificationHistoryProps) {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <div className="w-4 h-4 rounded-full bg-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-emerald-100 text-green-800 border-green-200">Отправлено</Badge>;
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

  const getChannelStatusColor = (status: string) => {
    return status === 'sent' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {mockEvents.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(event.status)}
                  <div>
                    <CardTitle className="text-sm font-medium">
                      {formatDateTime(event.timestamp)}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      Триггер: {Object.entries(event.triggerData).map(([key, value]) => 
                        typeof value === 'object' ? `${getTriggerKeyLabel(key)}: ${JSON.stringify(value)}` : `${getTriggerKeyLabel(key)}: ${value}`
                      ).join(', ')}
                    </div>
                  </div>
                </div>
                {getStatusBadge(event.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Сгенерированное сообщение:</h4>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {event.generatedMessage}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Статус доставки по каналам:</h4>
                <div className="space-y-2">
                  {event.channels.map((channel, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                      <div className={`flex items-center gap-2 ${getChannelStatusColor(channel.status)}`}>
                        {getChannelIcon(channel.type)}
                        <span className="text-sm font-medium capitalize">{channel.type}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className={getChannelStatusColor(channel.status)}>
                            {channel.status === 'sent' ? '✓ Отправлено' : '✗ Ошибка'}
                          </span>
                          {channel.recipients.length > 0 && (
                            <span className="text-muted-foreground ml-2">
                              → {channel.recipients.join(', ')}
                            </span>
                          )}
                        </div>
                        {channel.error && (
                          <div className="text-xs text-red-600 mt-1">
                            Ошибка: {channel.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockEvents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>История срабатываний пуста</p>
          <p className="text-sm">Это правило еще не срабатывало</p>
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </div>
  );
}