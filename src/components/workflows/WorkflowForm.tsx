import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { WorkflowSteps } from "./WorkflowSteps";

const workflowSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  triggerType: z.enum(["schedule", "event"]),
  schedule: z.string().optional(),
});

type WorkflowFormData = z.infer<typeof workflowSchema>;

interface WorkflowStep {
  id: string;
  commandId: string;
  commandName: string;
  params: Record<string, any>;
  target: {
    type: 'all_networks' | 'specific_network' | 'all_trading_points' | 'specific_trading_point' | 'equipment_type' | 'specific_equipment';
    value?: string;
    description: string;
  };
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: 'schedule' | 'event';
  schedule?: string;
  steps: WorkflowStep[];
  lastRun?: {
    date: string;
    status: 'success' | 'error' | 'running';
  };
  createdAt: string;
  updatedAt: string;
}

interface WorkflowFormProps {
  initialData?: Partial<Workflow>;
  onSubmit: (data: Partial<Workflow>) => void;
  onCancel: () => void;
}

export function WorkflowForm({ initialData, onSubmit, onCancel }: WorkflowFormProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [steps, setSteps] = useState<WorkflowStep[]>(initialData?.steps || []);

  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      isActive: initialData?.isActive ?? true,
      triggerType: initialData?.triggerType || "schedule",
      schedule: initialData?.schedule || "",
    },
  });

  const watchTriggerType = form.watch("triggerType");

  const handleSubmit = (data: WorkflowFormData) => {
    onSubmit({
      ...data,
      steps,
    });
  };

  const isFormValid = () => {
    const formData = form.getValues();
    const isBasicValid = formData.name.trim() !== "";
    const isTriggerValid = formData.triggerType !== "schedule" || (formData.schedule && formData.schedule.trim() !== "");
    return isBasicValid && isTriggerValid;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Основная информация</TabsTrigger>
              <TabsTrigger value="trigger">Триггер (Запуск)</TabsTrigger>
              <TabsTrigger value="steps">Шаги (Действия)</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название регламента</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Например: Ежедневное закрытие смены" 
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
                        placeholder="Подробное описание того, что делает этот регламент"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
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
                        Активные регламенты выполняются автоматически по расписанию
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

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentTab("trigger")}
                >
                  Далее: Триггер
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="trigger" className="space-y-4">
              <FormField
                control={form.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип триггера</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип триггера" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="schedule">По расписанию (CRON)</SelectItem>
                        <SelectItem value="event" disabled>По событию (скоро)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchTriggerType === "schedule" && (
                <FormField
                  control={form.control}
                  name="schedule"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Расписание (CRON)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Например: 55 23 * * * (каждый день в 23:55)"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Формат: минута час день месяц день_недели
                        <br />
                        Примеры:
                        <br />
                        • <code>0 6 * * 1</code> - каждый понедельник в 6:00
                        <br />
                        • <code>30 14 * * *</code> - каждый день в 14:30
                        <br />
                        • <code>0 0 1 * *</code> - первого числа каждого месяца в полночь
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentTab("basic")}
                >
                  Назад
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentTab("steps")}
                >
                  Далее: Шаги
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="steps" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Шаги выполнения</h3>
                <WorkflowSteps steps={steps} onStepsChange={setSteps} />
              </div>

              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentTab("trigger")}
                >
                  Назад
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!isFormValid()}
                  >
                    {initialData ? "Сохранить изменения" : "Создать регламент"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}