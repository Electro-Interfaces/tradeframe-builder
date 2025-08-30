import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

const notificationRuleSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.enum(["info", "warning", "critical"]),
  triggerType: z.enum(["equipment_status", "tank_level", "transaction", "workflow_completed"]),
  messageTemplate: z.string().min(1, "Шаблон сообщения обязателен"),
});

type NotificationRuleFormData = z.infer<typeof notificationRuleSchema>;

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

interface NotificationRuleFormProps {
  initialData?: Partial<NotificationRule>;
  onSubmit: (data: Partial<NotificationRule>) => void;
  onCancel: () => void;
}

const triggerOptions = [
  { 
    value: "equipment_status", 
    label: "Изменился статус оборудования",
    description: "Срабатывает при изменении статуса оборудования (онлайн/офлайн/ошибка)"
  },
  { 
    value: "tank_level", 
    label: "Изменился уровень в резервуаре",
    description: "Срабатывает при достижении определенного уровня топлива"
  },
  { 
    value: "transaction", 
    label: "Создана новая транзакция",
    description: "Срабатывает при создании транзакции продажи"
  },
  { 
    value: "workflow_completed", 
    label: "Завершен регламент",
    description: "Срабатывает при завершении выполнения регламента"
  }
];

export function NotificationRuleForm({ initialData, onSubmit, onCancel }: NotificationRuleFormProps) {
  const [conditions, setConditions] = useState<Record<string, any>>(initialData?.conditions || {});
  const [channels, setChannels] = useState<NotificationChannel[]>(
    initialData?.channels || [
      { type: "email", enabled: true },
      { type: "telegram", enabled: false },
      { type: "webhook", enabled: false }
    ]
  );
  const [recipients, setRecipients] = useState<string[]>(initialData?.recipients || []);
  const [newRecipient, setNewRecipient] = useState("");

  const form = useForm<NotificationRuleFormData>({
    resolver: zodResolver(notificationRuleSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      isActive: initialData?.isActive ?? true,
      priority: initialData?.priority || "info",
      triggerType: initialData?.trigger?.type || "equipment_status",
      messageTemplate: initialData?.messageTemplate || "",
    },
  });

  const watchTriggerType = form.watch("triggerType");

  const handleSubmit = (data: NotificationRuleFormData) => {
    const triggerOption = triggerOptions.find(opt => opt.value === data.triggerType);
    
    onSubmit({
      ...data,
      trigger: {
        type: data.triggerType,
        label: getTriggerLabel(data.triggerType, conditions)
      },
      conditions,
      channels,
      recipients,
    });
  };

  const getTriggerLabel = (triggerType: string, conditions: Record<string, any>) => {
    switch (triggerType) {
      case "equipment_status":
        return `Статус оборудования: ${conditions.newStatus || 'Любой статус'}`;
      case "tank_level":
        return `Уровень в резервуаре: ${conditions.condition === 'less_than' ? 'Меньше' : 'Больше'} ${conditions.value || 0}%`;
      case "transaction":
        return "Новая транзакция";
      case "workflow_completed":
        return `Регламент завершен: ${conditions.workflowName || 'Любой регламент'}`;
      default:
        return "Неизвестный триггер";
    }
  };

  const renderConditionsFields = () => {
    switch (watchTriggerType) {
      case "equipment_status":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Тип оборудования</label>
              <Select 
                value={conditions.equipmentType || ""} 
                onValueChange={(value) => setConditions(prev => ({ ...prev, equipmentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип оборудования" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ТРК">ТРК (Топливораздаточная колонка)</SelectItem>
                  <SelectItem value="ГРК">ГРК (Газораздаточная колонка)</SelectItem>
                  <SelectItem value="Касса">Касса</SelectItem>
                  <SelectItem value="Сервер">Сервер</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Новый статус</label>
              <Select 
                value={conditions.newStatus || ""} 
                onValueChange={(value) => setConditions(prev => ({ ...prev, newStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offline">Офлайн</SelectItem>
                  <SelectItem value="error">Ошибка</SelectItem>
                  <SelectItem value="maintenance">Обслуживание</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "tank_level":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Условие</label>
              <Select 
                value={conditions.condition || ""} 
                onValueChange={(value) => setConditions(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите условие" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less_than">Стал меньше чем</SelectItem>
                  <SelectItem value="greater_than">Стал больше чем</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Значение (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={conditions.value || ""}
                onChange={(e) => setConditions(prev => ({ ...prev, value: parseInt(e.target.value) }))}
                placeholder="Например: 15"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Вид топлива</label>
              <Select 
                value={conditions.fuelType || ""} 
                onValueChange={(value) => setConditions(prev => ({ ...prev, fuelType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите вид топлива" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="АИ-92">АИ-92</SelectItem>
                  <SelectItem value="АИ-95">АИ-95</SelectItem>
                  <SelectItem value="АИ-98">АИ-98</SelectItem>
                  <SelectItem value="ДТ">Дизельное топливо</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "transaction":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Минимальная сумма транзакции</label>
              <Input
                type="number"
                min="0"
                value={conditions.minAmount || ""}
                onChange={(e) => setConditions(prev => ({ ...prev, minAmount: parseFloat(e.target.value) }))}
                placeholder="Например: 1000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Оставьте пустым для срабатывания на любую сумму
              </p>
            </div>
          </div>
        );

      case "workflow_completed":
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Конкретный регламент</label>
              <Select 
                value={conditions.workflowId || ""} 
                onValueChange={(value) => {
                  const workflowName = value === "workflow_1" ? "Ежедневное закрытие смены" : 
                                      value === "workflow_2" ? "Обновление цен на топливо" : 
                                      "Любой регламент";
                  setConditions(prev => ({ ...prev, workflowId: value, workflowName }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите регламент или оставьте пустым" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Любой регламент</SelectItem>
                  <SelectItem value="workflow_1">Ежедневное закрытие смены</SelectItem>
                  <SelectItem value="workflow_2">Обновление цен на топливо</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Статус завершения</label>
              <Select 
                value={conditions.status || ""} 
                onValueChange={(value) => setConditions(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Успешно</SelectItem>
                  <SelectItem value="error">С ошибкой</SelectItem>
                  <SelectItem value="">Любой статус</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !recipients.includes(newRecipient.trim())) {
      setRecipients(prev => [...prev, newRecipient.trim()]);
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setRecipients(prev => prev.filter(r => r !== email));
  };

  const updateChannelStatus = (type: NotificationChannel['type'], enabled: boolean) => {
    setChannels(prev => prev.map(c => 
      c.type === type ? { ...c, enabled } : c
    ));
  };

  const getVariablesHelp = () => {
    const variables = {
      equipment_status: ["{{point.name}}", "{{equipment.name}}", "{{equipment.type}}", "{{equipment.status}}"],
      tank_level: ["{{point.name}}", "{{tank.name}}", "{{tank.level}}", "{{tank.fuelType}}"],
      transaction: ["{{point.name}}", "{{transaction.amount}}", "{{transaction.fuelType}}", "{{transaction.volume}}"],
      workflow_completed: ["{{workflow.name}}", "{{workflow.duration}}", "{{workflow.status}}"]
    };

    return variables[watchTriggerType] || [];
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название правила</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Например: Критический уровень топлива на АЗС-5" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Подробное описание когда и зачем срабатывает это правило"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Уровень важности</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите уровень" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="info">Информация</SelectItem>
                          <SelectItem value="warning">Предупреждение</SelectItem>
                          <SelectItem value="critical">Критическое</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Статус</FormLabel>
                        <FormDescription>
                          Активные правила срабатывают автоматически
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ЕСЛИ (Триггер и Условия) */}
          <Card>
            <CardHeader>
              <CardTitle>ЕСЛИ (Триггер и Условия)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Триггер (Событие)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип события" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {triggerOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchTriggerType && (
                <div>
                  <label className="text-sm font-medium">Условия (Фильтры)</label>
                  <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                    {renderConditionsFields()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ТО (Действия и Получатели) */}
          <Card>
            <CardHeader>
              <CardTitle>ТО (Действия и Получатели)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Каналы доставки */}
              <div>
                <label className="text-sm font-medium mb-3 block">Каналы доставки</label>
                <div className="space-y-3">
                  {channels.map((channel) => (
                    <div key={channel.type} className="flex items-center space-x-2">
                      <Checkbox
                        id={channel.type}
                        checked={channel.enabled}
                        onCheckedChange={(checked) => updateChannelStatus(channel.type, !!checked)}
                      />
                      <label htmlFor={channel.type} className="text-sm font-medium capitalize">
                        {channel.type === 'email' ? 'Email' : 
                         channel.type === 'telegram' ? 'Telegram' : 'Webhook'}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Получатели */}
              <div>
                <label className="text-sm font-medium mb-3 block">Получатели</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите email получателя"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRecipient();
                        }
                      }}
                    />
                    <Button type="button" onClick={addRecipient}>
                      Добавить
                    </Button>
                  </div>
                  {recipients.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((email) => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-1">
                          {email}
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => removeRecipient(email)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Шаблон сообщения */}
              <FormField
                control={form.control}
                name="messageTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Шаблон сообщения</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Например: ⚠️ На точке {{point.name}} оборудование {{equipment.name}} перешло в статус '{{equipment.status}}'"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Доступные переменные: {getVariablesHelp().join(", ")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit">
              {initialData ? "Сохранить изменения" : "Создать правило"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}