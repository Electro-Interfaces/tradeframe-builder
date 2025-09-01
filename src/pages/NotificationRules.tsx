import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Trash2, Copy, History, Play, Pause, Mail, MessageSquare, Webhook, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  userId: string; // Привязка к пользователю
  userName: string; // Имя пользователя для отображения
  createdAt: string;
  updatedAt: string;
  lastTriggered?: {
    date: string;
    status: 'sent' | 'failed';
  };
}

// Mock данные пользователей
const mockUsers = [
  { id: "1", name: "Иван Петров", email: "ivan.petrov@azs.com", role: "Администратор" },
  { id: "2", name: "Анна Сидорова", email: "anna.sidorova@azs.com", role: "Менеджер сети" },
  { id: "3", name: "Дмитрий Козлов", email: "dmitry.kozlov@azs.com", role: "Технический специалист" },
  { id: "4", name: "Елена Морозова", email: "elena.morozova@azs.com", role: "Оператор" },
];

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
    userId: "2",
    userName: "Анна Сидорова",
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
    userId: "3",
    userName: "Дмитрий Козлов",
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
    userId: "2",
    userName: "Анна Сидорова",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  // Состояние фильтров
  const [filters, setFilters] = useState({
    status: "all", // all, active, inactive
    priority: "all", // all, info, warning, critical
    userId: "all", // all, user1, user2, etc
    triggerType: "all", // all, equipment_status, tank_level, etc
    hasTriggered: "all" // all, yes, no
  });
  const { toast } = useToast();

  // Фильтрация правил по поиску и фильтрам
  const filteredRules = rules.filter(rule => {
    // Текстовый поиск
    const matchesSearch = searchQuery === "" || 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.trigger.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.recipients.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

    // Фильтр по статусу
    const matchesStatus = filters.status === "all" || 
      (filters.status === "active" && rule.isActive) ||
      (filters.status === "inactive" && !rule.isActive);

    // Фильтр по приоритету
    const matchesPriority = filters.priority === "all" || rule.priority === filters.priority;

    // Фильтр по пользователю
    const matchesUser = filters.userId === "all" || rule.userId === filters.userId;

    // Фильтр по типу триггера
    const matchesTrigger = filters.triggerType === "all" || rule.trigger.type === filters.triggerType;

    // Фильтр по наличию срабатываний
    const matchesTriggered = filters.hasTriggered === "all" ||
      (filters.hasTriggered === "yes" && rule.lastTriggered) ||
      (filters.hasTriggered === "no" && !rule.lastTriggered);

    return matchesSearch && matchesStatus && matchesPriority && matchesUser && matchesTrigger && matchesTriggered;
  });

  // Подсчёт активных фильтров
  const activeFiltersCount = Object.values(filters).filter(value => value !== "all").length;

  // Функции для работы с фильтрами
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: "all",
      priority: "all", 
      userId: "all",
      triggerType: "all",
      hasTriggered: "all"
    });
  };

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
      info: { label: "Информация", color: "bg-blue-600 text-blue-200" },
      warning: { label: "Предупреждение", color: "bg-yellow-600 text-yellow-200" },
      critical: { label: "Критическое", color: "bg-red-600 text-red-200" }
    };
    
    const config = variants[priority];
    return <Badge variant="secondary" className={`${config.color} border-slate-600`}>{config.label}</Badge>;
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (rule: NotificationRule) => {
    setSelectedRule(rule);
    setIsEditDialogOpen(true);
  };

  const handleClone = (rule: NotificationRule) => {
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

  const handleDeleteConfirm = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
    toast({
      title: "Правило удалено",
      description: `Правило "${rule?.name}" было удалено.`,
    });
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

  const handleCreateRule = (ruleData: Partial<NotificationRule>) => {
    // Если пользователь не указан, используем первого из списка (текущего пользователя)
    const selectedUser = mockUsers.find(u => u.id === ruleData.userId) || mockUsers[0];
    
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
      userId: selectedUser.id,
      userName: selectedUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setRules(prev => [...prev, newRule]);
    setIsCreateDialogOpen(false);
    toast({
      title: "Правило создано",
      description: `Правило "${newRule.name}" успешно создано для ${selectedUser.name}.`,
    });
  };

  const handleEditRule = (ruleData: Partial<NotificationRule>) => {
    if (!selectedRule) return;
    
    // Если пользователь изменился, обновляем имя пользователя
    const selectedUser = mockUsers.find(u => u.id === ruleData.userId);
    const updatedRule = {
      ...ruleData,
      userId: selectedUser?.id || selectedRule.userId,
      userName: selectedUser?.name || selectedRule.userName,
      updatedAt: new Date().toISOString()
    };
    
    setRules(prev => prev.map(r => 
      r.id === selectedRule.id 
        ? { ...r, ...updatedRule }
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
      <div className="w-full h-full px-4 md:px-6 lg:px-8">
        {/* Заголовок страницы */}
        <div className="mb-6 pt-4">
          <h1 className="text-2xl font-semibold text-white">Правила оповещений</h1>
          <p className="text-slate-400 mt-2">Создавайте и управляйте правилами автоматических оповещений для торговых сетей</p>
        </div>

        {/* Панель правил оповещений */}
        <div className="bg-slate-800 mb-6 w-full">
          <div className="px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🔔</span>
                </div>
                <h2 className="text-lg font-semibold text-white">Правила оповещений</h2>
              </div>
              <Button 
                onClick={handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex-shrink-0"
              >
                + Создать правило
              </Button>
            </div>
            
            {/* Поиск и фильтры */}
            <div className="mt-4 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Поиск правил оповещений..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Фильтры
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-600 text-blue-200">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>

              {/* Панель фильтров */}
              {showFilters && (
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white">Фильтры</h3>
                        {activeFiltersCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-slate-400 hover:text-white"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Очистить
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* Фильтр по статусу */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 mb-2 block">
                            Статус
                          </label>
                          <Select
                            value={filters.status}
                            onValueChange={(value) => updateFilter("status", value)}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              <SelectItem value="active">Активные</SelectItem>
                              <SelectItem value="inactive">Неактивные</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Фильтр по приоритету */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 mb-2 block">
                            Приоритет
                          </label>
                          <Select
                            value={filters.priority}
                            onValueChange={(value) => updateFilter("priority", value)}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              <SelectItem value="info">Информация</SelectItem>
                              <SelectItem value="warning">Предупреждение</SelectItem>
                              <SelectItem value="critical">Критическое</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Фильтр по пользователю */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 mb-2 block">
                            Пользователь
                          </label>
                          <Select
                            value={filters.userId}
                            onValueChange={(value) => updateFilter("userId", value)}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              {mockUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Фильтр по типу триггера */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 mb-2 block">
                            Тип события
                          </label>
                          <Select
                            value={filters.triggerType}
                            onValueChange={(value) => updateFilter("triggerType", value)}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              <SelectItem value="equipment_status">Статус оборудования</SelectItem>
                              <SelectItem value="tank_level">Уровень в резервуаре</SelectItem>
                              <SelectItem value="transaction">Транзакция</SelectItem>
                              <SelectItem value="workflow_completed">Завершение регламента</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Фильтр по срабатываниям */}
                        <div>
                          <label className="text-xs font-medium text-slate-300 mb-2 block">
                            Срабатывания
                          </label>
                          <Select
                            value={filters.hasTriggered}
                            onValueChange={(value) => updateFilter("hasTriggered", value)}
                          >
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Все</SelectItem>
                              <SelectItem value="yes">Были срабатывания</SelectItem>
                              <SelectItem value="no">Без срабатываний</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Результаты поиска */}
            {(searchQuery || activeFiltersCount > 0) && (
              <div className="px-6 py-2 text-sm text-slate-400 border-t border-slate-600">
                Найдено правил: {filteredRules.length} из {rules.length}
                {searchQuery && (
                  <span> по запросу "{searchQuery}"</span>
                )}
              </div>
            )}
          </div>

        {rules.length === 0 ? (
          <div className="px-4 md:px-6 pb-6">
            <EmptyState 
              title="Нет правил оповещений" 
              description="Создайте первое правило оповещения для начала работы"
              cta={
                <Button 
                  onClick={handleCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  + Создать правило
                </Button>
              }
              className="py-16"
            />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="px-4 md:px-6 pb-6">
            <EmptyState 
              title="Ничего не найдено" 
              description="Попробуйте изменить условия поиска"
              className="py-16"
            />
          </div>
        ) : (
          <>
            {/* Десктоп: таблица на всю ширину */}
            <div className="hidden md:block w-full">
          <div className="overflow-x-auto w-full rounded-lg border border-slate-600">
            <table className="w-full text-sm min-w-full table-fixed">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '22%'}}>НАЗВАНИЕ ПРАВИЛА</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '18%'}}>ТРИГГЕР</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '15%'}}>ПОЛЬЗОВАТЕЛЬ</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '12%'}}>КАНАЛЫ</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '10%'}}>СТАТУС</th>
                  <th className="px-6 py-4 text-left text-slate-200 font-medium" style={{width: '13%'}}>ПОСЛЕДНЕЕ СРАБАТЫВАНИЕ</th>
                  <th className="px-6 py-4 text-right text-slate-200 font-medium" style={{width: '10%'}}>ДЕЙСТВИЯ</th>
                </tr>
              </thead>
              <tbody className="bg-slate-800">
                {filteredRules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="border-b border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <div>
                        <div className="font-medium text-white text-base">{rule.name}</div>
                        <div className="text-sm text-slate-400 mb-1">{rule.description}</div>
                        <div className="mt-1">{getPriorityBadge(rule.priority)}</div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="text-slate-200 text-sm">{rule.trigger.label}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {rule.userName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-slate-200 text-sm">{rule.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      {getChannelIcons(rule.channels)}
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Активно" : "Приостановлено"}
                      </Badge>
                    </td>
                    <td className="px-4 md:px-6 py-4">
                      <div className="flex items-center gap-2">
                        {rule.lastTriggered && (
                          <div className={`w-2 h-2 rounded-full ${
                            rule.lastTriggered.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        )}
                        <span className="text-sm text-slate-200">{formatLastTriggered(rule.lastTriggered)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => handleClone(rule)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => toggleRuleStatus(rule.id)}
                        >
                          {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                          onClick={() => {
                            setSelectedRule(rule);
                            setIsHistoryDialogOpen(true);
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                          onClick={() => handleDeleteConfirm(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

            {/* Мобайл: карточки */}
            <div className="md:hidden space-y-3 px-6 pb-6">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-base mb-1">{rule.name}</div>
                      <div className="text-sm text-slate-400 mb-2">{rule.description}</div>
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Пользователь:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-medium">
                                {rule.userName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <span className="text-slate-200">{rule.userName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Триггер:</span>
                          <span className="text-slate-200">{rule.trigger.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Каналы:</span>
                          {getChannelIcons(rule.channels)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Статус:</span>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Активно" : "Приостановлено"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Последнее:</span>
                          <span className="text-slate-200">{formatLastTriggered(rule.lastTriggered)}</span>
                        </div>
                        <div className="mt-1">{getPriorityBadge(rule.priority)}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => handleClone(rule)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-white"
                        onClick={() => toggleRuleStatus(rule.id)}
                      >
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-9 w-9 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => handleDeleteConfirm(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedRule(null);
          }
        }}>
          <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto sm:w-full">
            <DialogHeader>
              <DialogTitle>
                {selectedRule ? "Редактировать правило оповещения" : "Создать правило оповещения"}
              </DialogTitle>
            </DialogHeader>
            <NotificationRuleForm 
              initialData={selectedRule || undefined}
              users={mockUsers}
              onSubmit={selectedRule ? handleEditRule : handleCreateRule} 
              onCancel={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedRule(null);
              }} 
            />
          </DialogContent>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto sm:w-full">
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