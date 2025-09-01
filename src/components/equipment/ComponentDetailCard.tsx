import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Settings, 
  Save, 
  Power, 
  PowerOff, 
  Archive,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  Layers3
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { 
  Component, 
  UpdateComponentRequest, 
  ComponentStatusAction, 
  ComponentStatus 
} from "@/types/component";

// Схема валидации для редактирования
const updateComponentSchema = z.object({
  display_name: z.string().min(1, "Название обязательно"),
  serial_number: z.string().optional(),
});

type UpdateComponentFormData = z.infer<typeof updateComponentSchema>;

interface ComponentDetailCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: Component | null;
  onUpdate: (id: string, data: UpdateComponentRequest) => Promise<void>;
  onStatusChange: (id: string, action: ComponentStatusAction) => Promise<void>;
  loading?: boolean;
}

const getStatusIcon = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'offline': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'disabled': return <PowerOff className="w-4 h-4 text-gray-600" />;
    case 'archived': return <Archive className="w-4 h-4 text-slate-600" />;
    default: return <Info className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusText = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'error': return 'Ошибка';
    case 'disabled': return 'Отключено';
    case 'archived': return 'Архив';
    default: return 'Неизвестно';
  }
};

const getStatusColor = (status: ComponentStatus) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'disabled': return 'bg-gray-500';
    case 'archived': return 'bg-slate-500';
    default: return 'bg-gray-500';
  }
};

export function ComponentDetailCard({
  open,
  onOpenChange,
  component,
  onUpdate,
  onStatusChange,
  loading = false
}: ComponentDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateComponentFormData>({
    resolver: zodResolver(updateComponentSchema),
    defaultValues: {
      display_name: "",
      serial_number: "",
    },
  });

  // Загружаем данные при открытии
  useEffect(() => {
    if (open && component) {
      form.reset({
        display_name: component.display_name,
        serial_number: component.serial_number || "",
      });
      setIsEditing(false);
    }
  }, [open, component, form]);

  const handleUpdate = async (data: UpdateComponentFormData) => {
    if (!component) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateComponentRequest = {
        display_name: data.display_name,
        serial_number: data.serial_number || undefined,
        // TODO: Добавить поддержку обновления параметров в будущих версиях
      };

      await onUpdate(component.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update component:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusAction = async (action: ComponentStatusAction) => {
    if (!component) return;

    setIsSubmitting(true);
    try {
      await onStatusChange(component.id, action);
    } catch (error) {
      console.error('Failed to change component status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!component) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Layers3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{component.display_name}</DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(component.status)}`} />
                  {getStatusText(component.status)}
                </Badge>
                {component.template && (
                  <Badge variant="outline">
                    {component.template.name}
                  </Badge>
                )}
                {component.serial_number && (
                  <span className="text-sm text-muted-foreground">
                    SN: {component.serial_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {component.status === 'disabled' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusAction('enable')}
                  disabled={isSubmitting}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Включить
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusAction('disable')}
                  disabled={isSubmitting || component.status === 'archived'}
                >
                  <PowerOff className="w-4 h-4 mr-2" />
                  Отключить
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusAction('archive')}
                disabled={isSubmitting || component.status === 'archived'}
              >
                <Archive className="w-4 h-4 mr-2" />
                Архив
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Основная информация</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={component.status === 'archived' || isSubmitting}
                >
                  {isEditing ? "Отмена" : "Редактировать"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="display_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Серийный номер</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isSubmitting}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? "Сохранение..." : "Сохранить"}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Название
                      </Label>
                      <p className="mt-1">{component.display_name}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Серийный номер
                      </Label>
                      <p className="mt-1">{component.serial_number || "—"}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Создано
                      </Label>
                      <p className="mt-1">
                        {format(new Date(component.created_at), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Обновлено
                      </Label>
                      <p className="mt-1">
                        {format(new Date(component.updated_at), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Информация о шаблоне */}
          {component.template && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Шаблон компонента</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Название
                      </Label>
                      <p className="mt-1">{component.template.name}</p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Технический код
                      </Label>
                      <p className="mt-1">{component.template.code}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        ID шаблона
                      </Label>
                      <p className="mt-1 text-xs font-mono text-muted-foreground">
                        {component.template.id}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Параметры */}
          {component.params && Object.keys(component.params).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Параметры компонента</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Редактирование параметров будет добавлено в следующей версии.
                  </AlertDescription>
                </Alert>
                
                <div className="bg-muted rounded-lg p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(component.params, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}