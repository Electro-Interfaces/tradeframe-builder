/**
 * Страница "Оповещения сети" (РЕФАКТОРИНГ)
 * Управление правилами уведомлений и просмотр истории
 */

import { useMemo, useState } from 'react';
import { Bell, Plus, Settings2, AlertTriangle, Clock, RefreshCw, Mail, MessageCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSelection } from '@/contexts/SelectionContext';
import { RuleDialog } from '@/components/notifications/RuleDialog';
import { useNotifications } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FILTER_PANEL_CLASS,
  FILTER_PANEL_CONTROL_CLASS,
  FILTER_PANEL_FIELD_CLASS,
  FILTER_PANEL_FIELDS_CLASS,
  FILTER_PANEL_HEADER_CLASS,
  FILTER_PANEL_TITLE_CLASS,
} from '@/components/common/filterPanel';
import type { Notification, NotificationChannel, NotificationPriority, NotificationRule } from '@/types/notification';

type RuleStatusFilter = 'all' | 'active' | 'inactive';
type NotificationStatusFilter = 'all' | 'pending' | 'sent' | 'read' | 'archived' | 'failed';

function formatInteger(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function formatDateTime(value?: string): string {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRuleTypeLabel(type: string): string {
  switch (type) {
    case 'bill_acceptor_threshold': return 'Пороги купюроприемника';
    case 'equipment_offline': return 'Оборудование офлайн';
    case 'low_fuel_level': return 'Низкий уровень топлива';
    case 'terminal_offline': return 'Проблемы с терминалом';
    case 'unpunched_receipts': return 'Непробитые чеки';
    case 'shift_not_closed': return 'Незакрытая смена';
    default: return type;
  }
}

function getNotificationTypeLabel(type: string): string {
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

function getScheduleText(rule: NotificationRule): string {
  if (rule.schedule_type === 'cron') {
    const cron = rule.schedule_config?.cron;
    return cron || 'Cron';
  }

  if (rule.schedule_type === 'interval') {
    const hours = (rule.schedule_config?.interval || 0) / 3600000;
    return `Каждые ${hours} ч`;
  }

  return 'Реальное время';
}

function getPriorityBadgeClass(priority: NotificationPriority): string {
  switch (priority) {
    case 'critical':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
    case 'high':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
    default:
      return 'bg-secondary text-foreground border-border';
  }
}

function getRuleStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-secondary text-foreground border-border'
    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
}

function getNotificationStatusBadgeClass(notification: Notification): string {
  if (notification.status === 'failed') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300';
  }

  if (notification.status === 'pending') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300';
  }

  return 'bg-secondary text-foreground border-border';
}

function getNotificationStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Ожидает';
    case 'sent': return 'Отправлено';
    case 'read': return 'Прочитано';
    case 'archived': return 'Архив';
    case 'failed': return 'Ошибка';
    default: return status;
  }
}

function getNotificationDate(notification: Notification, field: 'created' | 'sent' | 'read'): string | undefined {
  const source = notification as Notification & {
    created_at?: string;
    sent_at?: string;
    read_at?: string;
  };

  if (field === 'created') {
    return source.createdAt || source.created_at;
  }

  if (field === 'sent') {
    return source.sentAt || source.sent_at;
  }

  return source.readAt || source.read_at;
}

function getChannelLabel(channel: NotificationChannel): string {
  return channel === 'telegram' ? 'Telegram' : 'Email';
}

export default function NetworkNotifications() {
  const { selectedNetwork } = useSelection();
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState('rules');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = useState<RuleStatusFilter>('all');
  const [notificationStatusFilter, setNotificationStatusFilter] = useState<NotificationStatusFilter>('all');

  // Используем кастомный хук для управления состоянием
  const {
    rules,
    activeNotifications,
    historyNotifications,
    loading,
    refreshing,
    loadAll,
    toggleRule,
    removeRule,
    saveRule,
    markAsRead
  } = useNotifications({
    tenantId: selectedNetwork?.id,
    autoLoad: true
  });

  const handleCreateRule = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleSaveRule = async (ruleData: Partial<NotificationRule>) => {
    await saveRule(ruleData, !!editingRule);
    setDialogOpen(false);
    setEditingRule(null);
  };

  const filteredRules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesStatus = ruleStatusFilter === 'all'
        || (ruleStatusFilter === 'active' && rule.is_active)
        || (ruleStatusFilter === 'inactive' && !rule.is_active);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [rule.name, rule.description || '', getRuleTypeLabel(rule.type)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [ruleStatusFilter, rules, searchTerm]);

  const filteredActiveNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return activeNotifications.filter((notification) => {
      const matchesStatus = notificationStatusFilter === 'all' || notification.status === notificationStatusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [notification.title, notification.message, getNotificationTypeLabel(notification.type)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeNotifications, notificationStatusFilter, searchTerm]);

  const filteredHistoryNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return historyNotifications.filter((notification) => {
      const matchesStatus = notificationStatusFilter === 'all' || notification.status === notificationStatusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [notification.title, notification.message, getNotificationTypeLabel(notification.type)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [historyNotifications, notificationStatusFilter, searchTerm]);

  const currentCount = selectedTab === 'rules'
    ? filteredRules.length
    : selectedTab === 'active'
      ? filteredActiveNotifications.length
      : filteredHistoryNotifications.length;

  return (
    <MainLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Заголовок */}
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center justify-between'}`}>
          <div>
            <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
              <Bell className={`text-primary dark:text-primary/70 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
              <h1 className={`font-bold text-foreground ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
                Оповещения сети
              </h1>
            </div>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm mt-1' : 'mt-2'}`}>
              Управление правилами уведомлений и автоматическими оповещениями
            </p>
          </div>
          <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              disabled={refreshing}
              className={isMobile ? 'flex-1' : ''}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              className={`bg-primary hover:bg-primary/80 ${isMobile ? 'flex-1' : ''}`}
              onClick={handleCreateRule}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isMobile ? 'Правило' : 'Создать правило'}
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

        <div className={FILTER_PANEL_CLASS}>
          <div className={FILTER_PANEL_HEADER_CLASS}>
            <div className={FILTER_PANEL_TITLE_CLASS}>
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">Фильтры</span>
              <span className="text-sm text-muted-foreground">
                Найдено: {formatInteger(currentCount)}
              </span>
            </div>
          </div>

          <div className={FILTER_PANEL_FIELDS_CLASS}>
            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:min-w-[260px]`}>
              <Label htmlFor="network-notifications-search" className="text-xs text-muted-foreground">
                Поиск
              </Label>
              <Input
                id="network-notifications-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={selectedTab === 'rules' ? 'Название или описание правила' : 'Заголовок или текст уведомления'}
                className={FILTER_PANEL_CONTROL_CLASS}
              />
            </div>

            <div className={FILTER_PANEL_FIELD_CLASS}>
              <Label htmlFor="network-notifications-status" className="text-xs text-muted-foreground">
                Статус
              </Label>
              {selectedTab === 'rules' ? (
                <Select value={ruleStatusFilter} onValueChange={(value) => setRuleStatusFilter(value as RuleStatusFilter)}>
                  <SelectTrigger id="network-notifications-status" className={FILTER_PANEL_CONTROL_CLASS}>
                    <SelectValue placeholder="Все правила" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все правила</SelectItem>
                    <SelectItem value="active">Активные</SelectItem>
                    <SelectItem value="inactive">Отключённые</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select value={notificationStatusFilter} onValueChange={(value) => setNotificationStatusFilter(value as NotificationStatusFilter)}>
                  <SelectTrigger id="network-notifications-status" className={FILTER_PANEL_CONTROL_CLASS}>
                    <SelectValue placeholder="Все уведомления" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все уведомления</SelectItem>
                    <SelectItem value="pending">Ожидают</SelectItem>
                    <SelectItem value="sent">Отправлены</SelectItem>
                    <SelectItem value="read">Прочитаны</SelectItem>
                    <SelectItem value="archived">Архив</SelectItem>
                    <SelectItem value="failed">Ошибка</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className={`${FILTER_PANEL_FIELD_CLASS} sm:flex-none sm:min-w-[180px] sm:self-end`}>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSearchTerm('');
                  setRuleStatusFilter('all');
                  setNotificationStatusFilter('all');
                }}
              >
                Сбросить
              </Button>
            </div>
          </div>
        </div>

        {/* Табы */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="rules" className="data-[state=active]:bg-primary">
              <Settings2 className="w-4 h-4 mr-2" />
              Правила ({rules.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-primary">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Активные ({activeNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary">
              <Clock className="w-4 h-4 mr-2" />
              История ({historyNotifications.length})
            </TabsTrigger>
          </TabsList>

          {/* Вкладка: Правила */}
          <TabsContent value="rules" className="space-y-4">
            {loading ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <RefreshCw className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Загрузка правил...
                  </h3>
                </CardContent>
              </Card>
            ) : filteredRules.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <EmptyState
                    className="py-16"
                    title="Правила не найдены"
                    description={rules.length === 0
                      ? 'Создайте первое правило для автоматических оповещений.'
                      : 'Нет правил, соответствующих выбранным фильтрам.'}
                    cta={rules.length === 0 ? (
                      <Button className="bg-primary hover:bg-primary/80" onClick={handleCreateRule}>
                        <Plus className="w-4 h-4 mr-2" />
                        Создать правило
                      </Button>
                    ) : undefined}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Правило</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Приоритет</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Расписание</TableHead>
                        <TableHead>Каналы</TableHead>
                        <TableHead className="text-right">Отправлено</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{rule.name}</div>
                            <div className="text-xs text-muted-foreground">{rule.description || '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRuleStatusBadgeClass(rule.is_active)}>
                              {rule.is_active ? 'Активно' : 'Отключено'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadgeClass(rule.notification_config?.priority || 'medium')}>
                              {rule.notification_config?.priority || 'medium'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {getRuleTypeLabel(rule.type)}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {getScheduleText(rule)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2 text-muted-foreground">
                              {(rule.notification_config?.channels || []).map((channel) => (
                                <Badge key={channel} variant="outline" className="border-border bg-secondary text-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    {channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}
                                    {getChannelLabel(channel)}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-foreground/80">
                            {formatInteger(rule.total_notifications_sent || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => onToggleRuleDeleteHelper(rule, toggleRule, removeRule, 'toggle')}>
                                {rule.is_active ? 'Откл.' : 'Вкл.'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                                Изменить
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => onToggleRuleDeleteHelper(rule, toggleRule, removeRule, 'delete')}>
                                Удалить
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Вкладка: Активные уведомления */}
          <TabsContent value="active" className="space-y-4">
            {filteredActiveNotifications.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <EmptyState
                    className="py-16"
                    title="Нет активных оповещений"
                    description={activeNotifications.length === 0
                      ? 'Все системы работают нормально.'
                      : 'Нет активных уведомлений, соответствующих выбранным фильтрам.'}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Оповещение</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Приоритет</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Создано</TableHead>
                        <TableHead>Отправлено</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActiveNotifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{notification.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{notification.message}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getNotificationStatusBadgeClass(notification)}>
                              {getNotificationStatusLabel(notification.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadgeClass(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {getNotificationTypeLabel(notification.type)}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {formatDateTime(getNotificationDate(notification, 'created'))}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {formatDateTime(getNotificationDate(notification, 'sent'))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => markAsRead(notification.id)}>
                              Прочитано
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Вкладка: История */}
          <TabsContent value="history" className="space-y-4">
            {filteredHistoryNotifications.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <EmptyState
                    className="py-16"
                    title="История пуста"
                    description={historyNotifications.length === 0
                      ? 'История отправленных уведомлений появится здесь.'
                      : 'Нет уведомлений истории, соответствующих выбранным фильтрам.'}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Оповещение</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Приоритет</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Создано</TableHead>
                        <TableHead>Прочитано</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistoryNotifications.map((notification) => (
                        <TableRow key={notification.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{notification.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{notification.message}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getNotificationStatusBadgeClass(notification)}>
                              {getNotificationStatusLabel(notification.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadgeClass(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {getNotificationTypeLabel(notification.type)}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {formatDateTime(getNotificationDate(notification, 'created'))}
                          </TableCell>
                          <TableCell className="text-foreground/80">
                            {formatDateTime(getNotificationDate(notification, 'read'))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function onToggleRuleDeleteHelper(
  rule: NotificationRule,
  toggleRule: (ruleId: string, currentState: boolean) => void,
  removeRule: (ruleId: string) => void,
  action: 'toggle' | 'delete',
) {
  if (action === 'toggle') {
    void toggleRule(rule.id, rule.is_active);
    return;
  }

  if (confirm(`Удалить правило "${rule.name}"?`)) {
    void removeRule(rule.id);
  }
}
