import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, Plus, Edit, Trash2, Copy, History, Play, Pause, Mail, MessageSquare, Webhook } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NotificationRuleForm } from "@/components/notifications/NotificationRuleForm";
import { NotificationHistory } from "@/components/notifications/NotificationHistory";

interface NotificationChannel {
  type: 'email' | 'telegram' | 'webhook';
  enabled: boolean;
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  priority: 'info' | 'warning' | 'critical';
  trigger: {
    type: 'equipment_status' | 'tank_level' | 'transaction' | 'workflow_completed';
    label: string;
  };
  conditions: Record<string, any>;
  channels: NotificationChannel[];
  recipients: string[];
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: {
    date: string;
    status: 'sent' | 'failed';
  };
}

const mockNotificationRules: NotificationRule[] = [
  {
    id: "1",
    name: "Критический уровень топлива",
    description: "Уведомление при низком уровне топлива в резервуарах",
    isActive: true,
    priority: "critical",
    trigger: {
      type: "tank_level",
      label: "Уровень в резервуаре: Меньше 15%"
    },
    conditions: {
      condition: "less_than",
      value: 15,
      fuelType: "АИ-95"
    },
    channels: [
      { type: "email", enabled: true },
      { type: "telegram", enabled: true },
      { type: "webhook", enabled: false }
    ],
    recipients: ["manager@azs.com", "operator@azs.com"],
    messageTemplate: "🚨 КРИТИЧЕСКИЙ УРОВЕНЬ! На точке {{point.name}} в резервуаре {{tank.name}} осталось {{tank.level}}% топлива {{tank.fuelType}}",
    createdAt: "2024-08-15T10:00:00Z",
    updatedAt: "2024-08-20T14:30:00Z",
    lastTriggered: {
      date: "2024-08-29T08:30:00Z",
      status: "sent"
    }
  },
  {
    id: "2",
    name: "Оборудование в офлайне",
    description: "Уведомление о переходе оборудования в офлайн статус",
    isActive: true,
    priority: "warning",
    trigger: {
      type: "equipment_status",
      label: "Статус оборудования: Офлайн"
    },
    conditions: {
      equipmentType: "ТРК",
      newStatus: "offline"
    },
    channels: [
      { type: "email", enabled: true },
      { type: "telegram", enabled: false },
      { type: "webhook", enabled: true }
    ],
    recipients: ["tech@azs.com"],
    messageTemplate: "⚠️ Оборудование {{equipment.name}} ({{equipment.type}}) на точке {{point.name}} перешло в статус 'Офлайн'",
    createdAt: "2024-08-10T12:00:00Z",
    updatedAt: "2024-08-25T16:45:00Z",
    lastTriggered: {
      date: "2024-08-28T14:15:00Z",
      status: "sent"
    }
  },
  {
    id: "3",
    name: "Завершение ночного регламента",
    description: "Информирование о завершении ночных регламентов",
    isActive: false,
    priority: "info",
    trigger: {
      type: "workflow_completed",
      label: "Регламент завершен: Ежедневное закрытие смены"
    },
    conditions: {
      workflowId: "workflow_1",
      status: "success"
    },
    channels: [
      { type: "email", enabled: true },
      { type: "telegram", enabled: false },
      { type: "webhook", enabled: false }
    ],
    recipients: ["manager@azs.com"],
    messageTemplate: "✅ Регламент '{{workflow.name}}' успешно завершен. Время выполнения: {{workflow.duration}}",
    createdAt: "2024-08-05T09:00:00Z",
    updatedAt: "2024-08-28T08:15:00Z"
  }
];

export default function NotificationRules() {
  const [rules, setRules] = useState<NotificationRule[]>(mockNotificationRules);
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const formatLastTriggered = (lastTriggered?: NotificationRule['lastTriggered']) => {
    if (!lastTriggered) return "Никогда";
    
    const date = new Date(lastTriggered.date);
    const formattedDate = date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${formattedDate} (${lastTriggered.status === 'sent' ? 'Отправлено' : 'Ошибка'})`;
  };

  const getChannelIcons = (channels: NotificationChannel[]) => {
    const enabledChannels = channels.filter(c => c.enabled);
    
    return (
      <div className="flex gap-1">
        {enabledChannels.map((channel) => {
          const Icon = channel.type === 'email' ? Mail : 
                      channel.type === 'telegram' ? MessageSquare : Webhook;
          return <Icon key={channel.type} className="w-4 h-4 text-muted-foreground" />;
        })}
        {enabledChannels.length === 0 && (
          <span className="text-xs text-muted-foreground">Нет каналов</span>
        )}
      </div>
    );
  };

  const getPriorityBadge = (priority: NotificationRule['priority']) => {
    const variants = {
      info: { variant: "default" as const, label: "Информация", color: "bg-blue-100 text-blue-800 border-blue-200" },
      warning: { variant: "secondary" as const, label: "Предупреждение", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      critical: { variant: "destructive" as const, label: "Критическое", color: "bg-red-100 text-red-800 border-red-200" }
    };
    
    const config = variants[priority];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId 
        ? { ...r, isActive: !r.isActive }
        : r
    ));
    
    const rule = rules.find(r => r.id === ruleId);
    toast({
      title: rule?.isActive ? "Правило приостановлено" : "Правило активировано",
      description: `Правило "${rule?.name}" ${rule?.isActive ? 'приостановлено' : 'активировано'}.`,
    });
  };

  const duplicateRule = (rule: NotificationRule) => {
    const newRule: NotificationRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (копия)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTriggered: undefined
    };
    
    setRules(prev => [...prev, newRule]);
    toast({
      title: "Правило скопировано",
      description: `Создана копия правила "${rule.name}".`,
    });
  };

  const deleteRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast({
      title: "Правило удалено",
      description: `Правило "${rule?.name}" было удалено.`,
    });
  };

  const handleCreateRule = (ruleData: Partial<NotificationRule>) => {
    const newRule: NotificationRule = {
      id: Date.now().toString(),
      name: ruleData.name!,
      description: ruleData.description!,
      isActive: ruleData.isActive ?? true,
      priority: ruleData.priority!,
      trigger: ruleData.trigger!,
      conditions: ruleData.conditions ?? {},
      channels: ruleData.channels ?? [],
      recipients: ruleData.recipients ?? [],
      messageTemplate: ruleData.messageTemplate!,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setRules(prev => [...prev, newRule]);
    setIsCreateDialogOpen(false);
    toast({
      title: "Правило создано",
      description: `Правило "${newRule.name}" успешно создано.`,
    });
  };

  const handleEditRule = (ruleData: Partial<NotificationRule>) => {
    if (!selectedRule) return;
    
    setRules(prev => prev.map(r => 
      r.id === selectedRule.id 
        ? { ...r, ...ruleData, updatedAt: new Date().toISOString() }
        : r
    ));
    
    setIsEditDialogOpen(false);
    setSelectedRule(null);
    toast({
      title: "Правило обновлено",
      description: `Правило "${ruleData.name}" успешно обновлено.`,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Правила оповещений</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать правило
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Создать новое правило оповещения</DialogTitle>
              </DialogHeader>
              <NotificationRuleForm onSubmit={handleCreateRule} onCancel={() => setIsCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название правила</TableHead>
                <TableHead>Триггер</TableHead>
                <TableHead>Каналы</TableHead>
                <TableHead>Получатели</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последнее срабатывание</TableHead>
                <TableHead className="w-[100px]">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{rule.description}</div>
                      <div className="mt-1">{getPriorityBadge(rule.priority)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{rule.trigger.label}</span>
                  </TableCell>
                  <TableCell>
                    {getChannelIcons(rule.channels)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {rule.recipients.length > 0 ? (
                        <>
                          <div>{rule.recipients[0]}</div>
                          {rule.recipients.length > 1 && (
                            <div className="text-muted-foreground">+{rule.recipients.length - 1} ещё</div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Нет получателей</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.isActive ? "default" : "secondary"}>
                      {rule.isActive ? "Активно" : "Приостановлено"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rule.lastTriggered && (
                        <div className={`w-2 h-2 rounded-full ${
                          rule.lastTriggered.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      )}
                      <span className="text-sm">{formatLastTriggered(rule.lastTriggered)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRule(rule);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleRuleStatus(rule.id)}
                        >
                          {rule.isActive ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Приостановить
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Активировать
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicateRule(rule)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Дублировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRule(rule);
                            setIsHistoryDialogOpen(true);
                          }}
                        >
                          <History className="w-4 h-4 mr-2" />
                          История срабатываний
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteRule(rule.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Редактировать правило оповещения</DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <NotificationRuleForm 
                initialData={selectedRule}
                onSubmit={handleEditRule} 
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedRule(null);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>История срабатываний: {selectedRule?.name}</DialogTitle>
            </DialogHeader>
            {selectedRule && (
              <NotificationHistory 
                ruleId={selectedRule.id}
                onClose={() => {
                  setIsHistoryDialogOpen(false);
                  setSelectedRule(null);
                }} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}