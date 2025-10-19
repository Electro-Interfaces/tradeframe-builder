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
import type { NotificationRule } from '@/types/notification';

// Схема валидации формы
const ruleFormSchema = z.object({
  name: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().optional(),
  type: z.enum(['bill_acceptor_threshold', 'equipment_offline', 'low_fuel_level', 'shift_not_closed']),
  is_active: z.boolean().default(true),

  // Конфигурация правила
  checkType: z.string(),
  warningLevel: z.enum(['warning', 'critical', 'both']),
  applyToAllStations: z.boolean().default(true),

  // Расписание
  scheduleType: z.enum(['cron', 'interval', 'realtime']).default('cron'),
  cronExpression: z.string().default('0 */6 * * *'),

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
      console.log('[RuleDialog] tenantId:', tenantId);
      console.log('[RuleDialog] values:', values);

      const ruleData: Partial<NotificationRule> = {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Редактирование правила' : 'Создание правила'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isEditing
              ? 'Измените параметры правила уведомления'
              : 'Настройте новое правило для автоматических уведомлений'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Основная информация */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Основная информация</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Название правила</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Например: Контроль купюроприемников"
                        className="bg-slate-800 border-slate-700 text-white"
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
                    <FormLabel className="text-slate-300">Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Краткое описание правила"
                        className="bg-slate-800 border-slate-700 text-white"
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
                    <FormLabel className="text-slate-300">Тип события</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="bill_acceptor_threshold">Пороги купюроприемника</SelectItem>
                        <SelectItem value="equipment_offline">Оборудование офлайн</SelectItem>
                        <SelectItem value="low_fuel_level">Низкий уровень топлива</SelectItem>
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
                  <FormItem className="flex items-center justify-between rounded-lg border border-slate-700 p-4 bg-slate-800">
                    <div className="space-y-0.5">
                      <FormLabel className="text-slate-300">Активно</FormLabel>
                      <FormDescription className="text-slate-500">
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
              <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h3 className="text-sm font-semibold text-white">Настройки проверки</h3>

                <FormField
                  control={form.control}
                  name="warningLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Уровень предупреждения</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-800 border-slate-700">
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
                    <FormItem className="flex items-center justify-between rounded-lg border border-slate-700 p-4 bg-slate-800">
                      <div className="space-y-0.5">
                        <FormLabel className="text-slate-300">Применять ко всем ТТ</FormLabel>
                        <FormDescription className="text-slate-500">
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
              <h3 className="text-sm font-semibold text-white">Расписание проверки</h3>

              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Тип расписания</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
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
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="cronExpression"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Cron выражение</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="0 */6 * * *"
                            className="bg-slate-800 border-slate-700 text-white font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-slate-500">
                          Формат: минута час день месяц день_недели
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Готовые шаблоны */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                    <div className="text-xs font-semibold text-slate-300 mb-2">Готовые шаблоны:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 */1 * * *')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 */1 * * *</div>
                        <div className="text-slate-500">Каждый час</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 */6 * * *')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 */6 * * *</div>
                        <div className="text-slate-500">Каждые 6 часов</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 9 * * *')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 9 * * *</div>
                        <div className="text-slate-500">Ежедневно в 9:00</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 9 * * 1')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 9 * * 1</div>
                        <div className="text-slate-500">По понедельникам в 9:00</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 9,18 * * *')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 9,18 * * *</div>
                        <div className="text-slate-500">В 9:00 и 18:00</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => form.setValue('cronExpression', '0 0 1 * *')}
                        className="text-left p-2 hover:bg-slate-800 rounded text-blue-400"
                      >
                        <div className="font-mono">0 0 1 * *</div>
                        <div className="text-slate-500">1-го числа в полночь</div>
                      </button>
                    </div>
                  </div>

                  {/* Справка по синтаксису */}
                  <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                    <div className="text-xs font-semibold text-blue-400 mb-2">Формат Cron:</div>
                    <div className="text-xs text-slate-300 font-mono mb-2">
                      минута час день месяц день_недели
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div><span className="text-blue-400">*</span> — любое значение</div>
                      <div><span className="text-blue-400">*/N</span> — каждые N единиц (например, */6 = каждые 6)</div>
                      <div><span className="text-blue-400">A,B,C</span> — список значений (например, 9,12,18)</div>
                      <div><span className="text-blue-400">A-B</span> — диапазон (например, 9-17)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Уведомления */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Настройки уведомлений</h3>

              <FormField
                control={form.control}
                name="channels"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Каналы доставки</FormLabel>
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
                            <FormLabel className="text-slate-300 font-normal cursor-pointer">
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
                            <FormLabel className="text-slate-300 font-normal cursor-pointer">
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
                    <FormLabel className="text-slate-300">Приоритет</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-700">
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
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
