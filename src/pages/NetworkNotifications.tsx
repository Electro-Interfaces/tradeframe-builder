/**
 * Страница "Оповещения сети"
 * Управление правилами уведомлений и просмотр истории
 */

import { useState, useEffect } from 'react';
import { Bell, Plus, Settings2, Mail, MessageCircle, AlertTriangle, Clock, CheckCircle2, RefreshCw, Edit, Trash2, Power, PowerOff, Eye } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSelection } from '@/contexts/SelectionContext';
import { useToast } from '@/hooks/use-toast';
import { getNotificationRules, updateNotificationRule, deleteNotificationRule, createNotificationRule, getNotifications, markNotificationAsRead } from '@/services/notificationService';
import { RuleDialog } from '@/components/notifications/RuleDialog';
import { cronToHumanReadable } from '@/utils/scheduleFormatter';
import type { NotificationRule, Notification, NotificationPriority, NotificationChannel } from '@/types/notification';

export default function NetworkNotifications() {
  const { selectedNetwork } = useSelection();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('rules');
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<Notification[]>([]);
  const [historyNotifications, setHistoryNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);

  const loadRules = async () => {
    if (!selectedNetwork?.id) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const data = await getNotificationRules(selectedNetwork.id);
      setRules(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить правила уведомлений',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadActiveNotifications = async () => {
    if (!selectedNetwork?.id) return;

    try {
      const data = await getNotifications(selectedNetwork.id, {
        status: 'pending',
        limit: 50
      });
      setActiveNotifications(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить активные уведомления',
        variant: 'destructive'
      });
    }
  };

  const loadHistoryNotifications = async () => {
    if (!selectedNetwork?.id) return;

    try {
      const data = await getNotifications(selectedNetwork.id, {
        limit: 100
      });
      setHistoryNotifications(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить историю уведомлений',
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      await loadActiveNotifications();
      await loadHistoryNotifications();
      toast({
        title: 'Уведомление прочитано',
        description: 'Статус обновлен'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить статус',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadRules();
    loadActiveNotifications();
    loadHistoryNotifications();
  }, [selectedNetwork]);

  const handleToggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      await updateNotificationRule(ruleId, { is_active: !currentState });
      await loadRules();
      toast({
        title: currentState ? 'Правило отключено' : 'Правило активировано',
        description: 'Изменения сохранены'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить состояние правила',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteNotificationRule(ruleId);
      await loadRules();
      toast({
        title: 'Правило удалено',
        description: 'Правило успешно удалено'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить правило',
        variant: 'destructive'
      });
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<NotificationRule>) => {
    try {
      if (editingRule) {
        await updateNotificationRule(editingRule.id, ruleData);
        toast({
          title: 'Правило обновлено',
          description: 'Изменения сохранены'
        });
      } else {
        await createNotificationRule(ruleData);
        toast({
          title: 'Правило создано',
          description: 'Новое правило успешно создано'
        });
      }
      await loadRules();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить правило',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">
              Оповещения сети
            </h1>
          </div>
          <p className="text-slate-400 mt-2">
            Управление правилами уведомлений и автоматическими оповещениями
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRules}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateRule}>
            <Plus className="w-4 h-4 mr-2" />
            Создать правило
          </Button>
        </div>
      </div>

      {/* Диалог создания/редактирования */}
      {selectedNetwork && (
        <RuleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={editingRule}
          tenantId={selectedNetwork.id}
          onSave={handleSaveRule}
        />
      )}

      {/* Табы */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="rules" className="data-[state=active]:bg-blue-600">
            <Settings2 className="w-4 h-4 mr-2" />
            Правила ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-blue-600">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Активные ({activeNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-600">
            <Clock className="w-4 h-4 mr-2" />
            История ({historyNotifications.length})
          </TabsTrigger>
        </TabsList>

        {/* Вкладка: Правила */}
        <TabsContent value="rules" className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center bg-slate-800 border-slate-700">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Загрузка правил...
              </h3>
            </Card>
          ) : rules.length === 0 ? (
            <Card className="p-12 text-center bg-slate-800 border-slate-700">
              <Bell className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Нет настроенных правил
              </h3>
              <p className="text-slate-400 mb-6">
                Создайте первое правило для автоматических оповещений
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreateRule}>
                <Plus className="w-4 h-4 mr-2" />
                Создать правило
              </Button>
            </Card>
          ) : (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={handleToggleRule}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
              />
            ))
          )}
        </TabsContent>

        {/* Вкладка: Активные уведомления */}
        <TabsContent value="active" className="space-y-4">
          {activeNotifications.length === 0 ? (
            <Card className="p-12 text-center bg-slate-800 border-slate-700">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Нет активных оповещений
              </h3>
              <p className="text-slate-400">
                Все системы работают нормально
              </p>
            </Card>
          ) : (
            activeNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))
          )}
        </TabsContent>

        {/* Вкладка: История */}
        <TabsContent value="history" className="space-y-4">
          {historyNotifications.length === 0 ? (
            <Card className="p-12 text-center bg-slate-800 border-slate-700">
              <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <h3 className="text-xl font-semibold text-white mb-2">
                История пуста
              </h3>
              <p className="text-slate-400">
                История отправленных уведомлений появится здесь
              </p>
            </Card>
          ) : (
            historyNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                showReadStatus
              />
            ))
          )}
        </TabsContent>
      </Tabs>
      </div>
    </MainLayout>
  );
}

/**
 * Карточка правила уведомления
 */
interface RuleCardProps {
  rule: NotificationRule;
  onToggle: (ruleId: string, currentState: boolean) => void;
  onEdit: (rule: NotificationRule) => void;
  onDelete: (ruleId: string) => void;
}

function RuleCard({ rule, onToggle, onEdit, onDelete }: RuleCardProps) {
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'telegram': return <MessageCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'bill_acceptor_threshold': return 'Пороги купюроприемника';
      case 'equipment_offline': return 'Оборудование офлайн';
      case 'low_fuel_level': return 'Низкий уровень топлива';
      default: return type;
    }
  };

  const getScheduleText = (rule: NotificationRule) => {
    if (rule.schedule_type === 'cron') {
      const cron = rule.schedule_config?.cron;
      return cronToHumanReadable(cron || '');
    }
    if (rule.schedule_type === 'interval') {
      const hours = (rule.schedule_config?.interval || 0) / 3600000;
      return `Каждые ${hours} ч`;
    }
    return 'Реальное время';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card className="p-6 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-white">{rule.name}</h3>
            <Badge className={`${getPriorityColor(rule.notification_config?.priority || 'medium')} text-white`}>
              {rule.notification_config?.priority || 'medium'}
            </Badge>
            {rule.is_active ? (
              <Badge className="bg-green-600 text-white">Активно</Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400">Отключено</Badge>
            )}
          </div>
          <p className="text-slate-400 text-sm">{rule.description}</p>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(rule.id, rule.is_active)}
            title={rule.is_active ? 'Отключить правило' : 'Включить правило'}
          >
            {rule.is_active ? (
              <Power className="w-4 h-4 text-green-500" />
            ) : (
              <PowerOff className="w-4 h-4 text-slate-500" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(rule)}
            title="Редактировать"
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
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">Тип</div>
          <div className="text-sm text-white">{getRuleTypeLabel(rule.type)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Расписание</div>
          <div className="text-sm text-white">{getScheduleText(rule)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Каналы</div>
          <div className="flex gap-2">
            {rule.notification_config?.channels?.map((channel) => (
              <div key={channel} className="text-blue-400">
                {getChannelIcon(channel)}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 mb-1">Отправлено</div>
          <div className="text-sm text-white">{rule.total_notifications_sent || 0}</div>
        </div>
      </div>

      <div className="flex gap-6 text-xs text-slate-400 pt-4 border-t border-slate-700">
        <div>
          <span className="mr-2">Последняя проверка:</span>
          <span className="text-slate-300">{formatDate(rule.last_check_at)}</span>
        </div>
        <div>
          <span className="mr-2">Последнее оповещение:</span>
          <span className="text-slate-300">{formatDate(rule.last_notification_at)}</span>
        </div>
      </div>
    </Card>
  );
}

/**
 * Карточка уведомления
 */
interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  showReadStatus?: boolean;
}

function NotificationCard({ notification, onMarkAsRead, showReadStatus = false }: NotificationCardProps) {
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      case 'medium':
        return <Bell className="w-5 h-5" />;
      case 'low':
        return <MessageCircle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'bill_acceptor_threshold': return 'Пороги купюроприемника';
      case 'equipment_offline': return 'Оборудование офлайн';
      case 'low_fuel_level': return 'Низкий уровень топлива';
      case 'shift_not_closed': return 'Незакрытая смена';
      default: return type;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Неизвестно';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const isRead = notification.status === 'read';

  return (
    <Card className={`p-6 bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors ${!isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`${getPriorityColor(notification.priority)} p-2 rounded-lg`}>
              {getPriorityIcon(notification.priority)}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">{notification.title}</h3>
              <p className="text-xs text-slate-400">{getTypeLabel(notification.type)}</p>
            </div>
            <Badge className={`${getPriorityColor(notification.priority)} text-white`}>
              {notification.priority}
            </Badge>
            {showReadStatus && isRead && (
              <Badge variant="outline" className="text-slate-400">
                Прочитано
              </Badge>
            )}
          </div>
          <p className="text-slate-300 text-sm mt-2">{notification.message}</p>
        </div>
        {!isRead && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMarkAsRead(notification.id)}
            title="Отметить как прочитанное"
            className="ml-4"
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-slate-400 mb-1">Создано</div>
          <div className="text-slate-300">{formatDate(notification.created_at)}</div>
        </div>
        {notification.sent_at && (
          <div>
            <div className="text-slate-400 mb-1">Отправлено</div>
            <div className="text-slate-300">{formatDate(notification.sent_at)}</div>
          </div>
        )}
        {notification.read_at && (
          <div>
            <div className="text-slate-400 mb-1">Прочитано</div>
            <div className="text-slate-300">{formatDate(notification.read_at)}</div>
          </div>
        )}
      </div>

      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-400 mb-2">Детали:</div>
          <div className="text-xs text-slate-300 font-mono bg-slate-900 p-2 rounded">
            {JSON.stringify(notification.metadata, null, 2)}
          </div>
        </div>
      )}
    </Card>
  );
}
