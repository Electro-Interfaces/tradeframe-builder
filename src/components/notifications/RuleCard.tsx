/**
 * Карточка правила уведомления
 */

import { Mail, MessageCircle, Bell, Power, PowerOff, Edit, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { NotificationRule, NotificationPriority, NotificationChannel } from '@/types/notification';

interface RuleCardProps {
  rule: NotificationRule;
  onToggle: (ruleId: string, currentState: boolean) => void;
  onEdit: (rule: NotificationRule) => void;
  onDelete: (ruleId: string) => void;
  isMobile?: boolean;
}

export function RuleCard({ rule, onToggle, onEdit, onDelete, isMobile = false }: RuleCardProps) {
  return (
    <Card className={`bg-card border-border hover:border-border transition-colors ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-start justify-between'} mb-4`}>
        <div className="flex-1">
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'gap-3'} mb-2`}>
            <h3 className={`font-semibold text-foreground ${isMobile ? 'text-lg' : 'text-xl'}`}>{rule.name}</h3>
            <Badge className={`${getPriorityColor(rule.notification_config?.priority || 'medium')} text-foreground text-xs`}>
              {rule.notification_config?.priority || 'medium'}
            </Badge>
            {rule.is_active ? (
              <Badge className="bg-emerald-600 text-white text-xs">Активно</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">Отключено</Badge>
            )}
          </div>
          <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>{rule.description}</p>
        </div>
        <div className={`flex gap-2 ${isMobile ? 'w-full' : 'ml-4'}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(rule.id, rule.is_active)}
            title={rule.is_active ? 'Отключить правило' : 'Включить правило'}
            className={isMobile ? 'flex-1' : ''}
          >
            {rule.is_active ? (
              <Power className="w-4 h-4 text-green-500" />
            ) : (
              <PowerOff className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(rule)}
            title="Редактировать"
            className={isMobile ? 'flex-1' : ''}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm(`Удалить правило "${rule.name}"?`)) {
                onDelete(rule.id);
              }
            }}
            title="Удалить"
            className={isMobile ? 'flex-1' : ''}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 mb-4 ${isMobile ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Тип</div>
          <div className="text-sm text-foreground">{getRuleTypeLabel(rule.type)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Расписание</div>
          <div className="text-sm text-foreground">{getScheduleText(rule)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Каналы</div>
          <div className="flex gap-2">
            {rule.notification_config?.channels?.map((channel) => (
              <div key={channel} className="text-blue-600 dark:text-blue-400">
                {getChannelIcon(channel)}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Отправлено</div>
          <div className="text-sm text-foreground">{rule.total_notifications_sent || 0}</div>
        </div>
      </div>

      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'gap-6'} text-xs text-muted-foreground pt-4 border-t border-border`}>
        <div>
          <span className="mr-2">Последняя проверка:</span>
          <span className="text-foreground/80">{formatDate(rule.last_check_at)}</span>
        </div>
        <div>
          <span className="mr-2">Последнее оповещение:</span>
          <span className="text-foreground/80">{formatDate(rule.last_notification_at)}</span>
        </div>
      </div>
    </Card>
  );
}

// Вспомогательные функции
function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'critical': return 'bg-red-600';
    case 'high': return 'bg-orange-600';
    case 'medium': return 'bg-yellow-600';
    case 'low': return 'bg-blue-600';
    default: return 'bg-secondary';
  }
}

function getChannelIcon(channel: NotificationChannel) {
  switch (channel) {
    case 'email': return <Mail className="w-4 h-4" />;
    case 'telegram': return <MessageCircle className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
}

function getRuleTypeLabel(type: string): string {
  switch (type) {
    case 'bill_acceptor_threshold': return 'Пороги купюроприемника';
    case 'equipment_offline': return 'Оборудование офлайн';
    case 'low_fuel_level': return 'Низкий уровень топлива';
    case 'terminal_offline': return 'Проблемы с терминалом';
    case 'unpunched_receipts': return 'Непробитые чеки';
    default: return type;
  }
}

function getScheduleText(rule: NotificationRule): string {
  if (rule.schedule_type === 'cron') {
    const cron = rule.schedule_config?.cron;
    // Используем cronToHumanReadable из utils
    return cronToHumanReadable(cron || '');
  }
  if (rule.schedule_type === 'interval') {
    const hours = (rule.schedule_config?.interval || 0) / 3600000;
    return `Каждые ${hours} ч`;
  }
  return 'Реальное время';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Никогда';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// Импорт функции cronToHumanReadable
import { cronToHumanReadable } from '@/utils/scheduleFormatter';
