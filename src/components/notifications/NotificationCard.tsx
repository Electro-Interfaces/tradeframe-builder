/**
 * Карточка уведомления
 */

import { AlertTriangle, Bell, MessageCircle, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Notification, NotificationPriority } from '@/types/notification';

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  showReadStatus?: boolean;
  isMobile?: boolean;
}

export function NotificationCard({ notification, onMarkAsRead, showReadStatus = false, isMobile = false }: NotificationCardProps) {
  const isRead = notification.status === 'read';

  return (
    <Card className={`bg-card border-border hover:border-border transition-colors ${!isRead ? 'border-l-4 border-l-blue-500' : ''} ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-start justify-between'} mb-4`}>
        <div className="flex-1">
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'gap-3'} mb-2`}>
            <div className={`${getPriorityColor(notification.priority)} ${isMobile ? 'p-1.5' : 'p-2'} rounded-lg`}>
              {getPriorityIcon(notification.priority, isMobile)}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-foreground ${isMobile ? 'text-base' : 'text-lg'}`}>{notification.title}</h3>
              <p className="text-xs text-muted-foreground">{getTypeLabel(notification.type)}</p>
            </div>
            <Badge className={`${getPriorityColor(notification.priority)} text-foreground text-xs`}>
              {notification.priority}
            </Badge>
            {showReadStatus && isRead && (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                Прочитано
              </Badge>
            )}
          </div>
          <p className={`text-foreground/80 ${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>{notification.message}</p>
        </div>
        {!isRead && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkAsRead(notification.id)}
            title="Отметить как прочитанное"
            className={isMobile ? 'w-full' : 'ml-4'}
          >
            <Eye className="w-4 h-4" />
            {isMobile && <span className="ml-2">Отметить прочитанным</span>}
          </Button>
        )}
      </div>

      <div className={`grid gap-4 text-xs ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
        <div>
          <div className="text-muted-foreground mb-1">Создано</div>
          <div className="text-foreground/80">{formatDate(notification.created_at)}</div>
        </div>
        {notification.sent_at && (
          <div>
            <div className="text-muted-foreground mb-1">Отправлено</div>
            <div className="text-foreground/80">{formatDate(notification.sent_at)}</div>
          </div>
        )}
        {notification.read_at && (
          <div>
            <div className="text-muted-foreground mb-1">Прочитано</div>
            <div className="text-foreground/80">{formatDate(notification.read_at)}</div>
          </div>
        )}
      </div>

      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Детали:</div>
          <div className="text-xs text-foreground/80 font-mono bg-background p-2 rounded">
            {JSON.stringify(notification.metadata, null, 2)}
          </div>
        </div>
      )}
    </Card>
  );
}

// Вспомогательные функции
function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'critical': return 'bg-red-600';
    case 'high': return 'bg-orange-600';
    case 'medium': return 'bg-yellow-600';
    case 'low': return 'bg-primary';
    default: return 'bg-secondary';
  }
}

function getPriorityIcon(priority: NotificationPriority, isMobile: boolean = false) {
  const iconSize = isMobile ? 'w-4 h-4' : 'w-5 h-5';

  switch (priority) {
    case 'critical':
    case 'high':
      return <AlertTriangle className={iconSize} />;
    case 'medium':
      return <Bell className={iconSize} />;
    case 'low':
      return <MessageCircle className={iconSize} />;
    default:
      return <Bell className={iconSize} />;
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'bill_acceptor_threshold': return 'Пороги купюроприемника';
    case 'equipment_offline': return 'Оборудование офлайн';
    case 'low_fuel_level': return 'Низкий уровень топлива';
    case 'shift_not_closed': return 'Незакрытая смена';
    case 'terminal_offline': return 'Проблемы с терминалом';
    case 'unpunched_receipts': return 'Непробитые чеки';
    default: return type;
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Неизвестно';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
