/**
 * Диалог создания/редактирования правила уведомления
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CronBuilder } from '@/components/notifications/CronBuilder';
import type { NotificationRule } from '@/types/notification';

// Схема валидации формы
const ruleFormSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().optional(),
  type: z.enum(['bill_acceptor_threshold', 'equipment_offline', 'low_fuel_level', 'shift_not_closed', 'terminal_offline', 'unpunched_receipts']),
  is_active: z.boolean().default(true),

  // Конфигурация правила
  checkType: z.string(),
  warningLevel: z.enum(['warning', 'critical', 'both']),
  applyToAllStations: z.boolean().default(true),

  // Расписание
  scheduleType: z.enum(['cron', 'interval', 'realtime']).default('cron'),
  cronExpression: z.string().default('0 */6 * * *'),
  scheduleDescription: z.string().optional(), // человекочитаемое описание

  // Каналы уведомлений
  channels: z.array(z.enum(['email', 'telegram'])).min(1, 'Выберите хотя бы один канал'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('high'),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: NotificationRule | null;
  tenantId: string;
  onSave: (rule: Partial<NotificationRule>) => Promise<void>;
}

export function RuleDialog({ open, onOpenChange, rule, tenantId, onSave }: RuleDialogProps) {
  const [saving, setSaving] = useState(false);
  const isEditing = !!rule;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'bill_acceptor_threshold',
      is_active: true,
      checkType: 'count',
      warningLevel: 'both',
      applyToAllStations: true,
      scheduleType: 'cron',
      cronExpression: '0 */6 * * *',
      scheduleDescription: 'Каждые 6 часов',
      channels: ['email'],
      priority: 'high',
    },
  });

  // Загрузка данных правила при редактировании
  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description || '',
        type: rule.type as any,
        is_active: rule.is_active,
        checkType: rule.rule_config?.checkType || 'count',
        warningLevel: (rule.rule_config?.warningLevel as any) || 'both',
        applyToAllStations: rule.rule_config?.applyToAllStations ?? true,
        scheduleType: rule.schedule_type as any,
        cronExpression: rule.schedule_config?.cron || '0 */6 * * *',
        channels: (rule.notification_config?.channels as any) || ['email'],
        priority: (rule.notification_config?.priority as any) || 'high',
      });
    } else {
      form.reset();
    }
  }, [rule, form]);

  const onSubmit = async (values: RuleFormValues) => {
    setSaving(true);
    try {
      const ruleData: Partial<NotificationRule> = {
        ...(rule?.id && { id: rule.id }), // Добавляем id при редактировании
        tenant_id: tenantId,
        name: values.name,
        description: values.description,
        type: values.type,
        is_active: values.is_active,
        rule_config: {
          checkType: values.checkType,
          warningLevel: values.warningLevel,
          applyToAllStations: values.applyToAllStations,
        },
        schedule_type: values.scheduleType,
        schedule_config: {
          cron: values.cronExpression,
        },
        notification_config: {
          channels: values.channels,
          priority: values.priority,
          suppressDuplicates: true,
          suppressDuration: 21600000, // 6 часов
        },
        recipients: {
          roles: [],
          users: [],
        },
      };

      await onSave(ruleData);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Ошибка сохранения правила:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? 'Редактирование правила' : 'Создание правила'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing
              ? 'Измените параметры правила уведомления'
              : 'Настройте новое правило для автоматических уведомлений'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Основная информация */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Основная информация</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Название правила</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Например: Контроль купюроприемников"
                        className="bg-card border-border text-foreground"
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
                    <FormLabel className="text-foreground/80">Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Краткое описание правила"
                        className="bg-card border-border text-foreground"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Тип события</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-card border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="bill_acceptor_threshold">Пороги купюроприемника</SelectItem>
                        <SelectItem value="terminal_offline">Проблемы с терминалом</SelectItem>
                        <SelectItem value="low_fuel_level">Низкий уровень топлива</SelectItem>
                        <SelectItem value="unpunched_receipts">Непробитые чеки</SelectItem>
                        <SelectItem value="equipment_offline">Оборудование офлайн</SelectItem>
                        <SelectItem value="shift_not_closed">Незакрытая смена</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-4 bg-card">
                    <div className="space-y-0.5">
                      <FormLabel className="text-foreground/80">Активно</FormLabel>
                      <FormDescription className="text-muted-foreground">
                        Правило будет проверяться автоматически
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Конфигурация для порогов купюроприемника */}
            {form.watch('type') === 'bill_acceptor_threshold' && (
              <div className="space-y-4 p-4 rounded-lg bg-card/50 border border-border">
                <h3 className="text-sm font-semibold text-foreground">Настройки проверки</h3>

                <FormField
                  control={form.control}
                  name="warningLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Уровень предупреждения</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-card border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-card border-border">
                          <SelectItem value="warning">Только предупреждение</SelectItem>
                          <SelectItem value="critical">Только критичные</SelectItem>
                          <SelectItem value="both">Оба уровня</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applyToAllStations"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-4 bg-card">
                      <div className="space-y-0.5">
                        <FormLabel className="text-foreground/80">Применять ко всем ТТ</FormLabel>
                        <FormDescription className="text-muted-foreground">
                          Проверять все торговые точки сети
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Расписание */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Расписание проверки</h3>

              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Тип расписания</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-card border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="cron">По расписанию (cron)</SelectItem>
                        <SelectItem value="interval">Через интервал</SelectItem>
                        <SelectItem value="realtime">Реальное время</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('scheduleType') === 'cron' && (
                <CronBuilder
                  value={form.watch('cronExpression')}
                  onChange={(cron, description) => {
                    form.setValue('cronExpression', cron);
                    form.setValue('scheduleDescription', description);
                  }}
                />
              )}
            </div>

            {/* Уведомления */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Настройки уведомлений</h3>

              <FormField
                control={form.control}
                name="channels"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Каналы доставки</FormLabel>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="channels"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes('email')}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, 'email']);
                                  } else {
                                    field.onChange(current.filter((c) => c !== 'email'));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-foreground/80 font-normal cursor-pointer">
                              Email
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="channels"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes('telegram')}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, 'telegram']);
                                  } else {
                                    field.onChange(current.filter((c) => c !== 'telegram'));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-foreground/80 font-normal cursor-pointer">
                              Telegram
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Приоритет</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-card border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="low">Низкий</SelectItem>
                        <SelectItem value="medium">Средний</SelectItem>
                        <SelectItem value="high">Высокий</SelectItem>
                        <SelectItem value="critical">Критичный</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/80">
                {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
