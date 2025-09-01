import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  CalendarIcon, 
  Settings, 
  History, 
  Layers3, 
  Save, 
  Power, 
  PowerOff, 
  Archive,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { 
  Equipment, 
  UpdateEquipmentRequest, 
  EquipmentStatusAction, 
  EquipmentEvent,
  EquipmentStatus 
} from "@/types/equipment";
import { ComponentsTab } from "./ComponentsTab";

// Схема валидации для редактирования
const updateEquipmentSchema = z.object({
  display_name: z.string().min(1, "Название обязательно"),
  serial_number: z.string().optional(),
  external_id: z.string().optional(),
  installation_date: z.date().optional(),
});

type UpdateEquipmentFormData = z.infer<typeof updateEquipmentSchema>;

interface EquipmentDetailCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onUpdate: (id: string, data: UpdateEquipmentRequest) => Promise<void>;
  onStatusChange: (id: string, action: EquipmentStatusAction) => Promise<void>;
  onLoadEvents: (id: string) => Promise<EquipmentEvent[]>;
  loading?: boolean;
}

const getStatusIcon = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    case 'offline': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    case 'disabled': return <PowerOff className="w-4 h-4 text-gray-600" />;
    case 'archived': return <Archive className="w-4 h-4 text-slate-600" />;
    default: return <Info className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusText = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'error': return 'Ошибка';
    case 'disabled': return 'Отключено';
    case 'archived': return 'Архив';
    default: return 'Неизвестно';
  }
};

const getStatusColor = (status: EquipmentStatus) => {
  switch (status) {
    case 'online': return 'bg-green-500';
    case 'offline': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    case 'disabled': return 'bg-gray-500';
    case 'archived': return 'bg-slate-500';
    default: return 'bg-gray-500';
  }
};

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'created': return <Settings className="w-4 h-4 text-blue-600" />;
    case 'updated': return <Settings className="w-4 h-4 text-orange-600" />;
    case 'status_changed': return <Power className="w-4 h-4 text-green-600" />;
    case 'command_executed': return <Settings className="w-4 h-4 text-purple-600" />;
    default: return <Info className="w-4 h-4 text-gray-600" />;
  }
};

export function EquipmentDetailCard({
  open,
  onOpenChange,
  equipment,
  onUpdate,
  onStatusChange,
  onLoadEvents,
  loading = false
}: EquipmentDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState<EquipmentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateEquipmentFormData>({
    resolver: zodResolver(updateEquipmentSchema),
    defaultValues: {
      display_name: "",
      serial_number: "",
      external_id: "",
    },
  });

  // Загружаем данные при открытии
  useEffect(() => {
    if (open && equipment) {
      form.reset({
        display_name: equipment.display_name,
        serial_number: equipment.serial_number || "",
        external_id: equipment.external_id || "",
        installation_date: equipment.installation_date 
          ? new Date(equipment.installation_date) 
          : undefined,
      });
      setIsEditing(false);
    }
  }, [open, equipment, form]);

  const loadEvents = async () => {
    if (!equipment) return;
    
    setEventsLoading(true);
    try {
      const eventsList = await onLoadEvents(equipment.id);
      setEvents(eventsList);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleUpdate = async (data: UpdateEquipmentFormData) => {
    if (!equipment) return;

    setIsSubmitting(true);
    try {
      const updateData: UpdateEquipmentRequest = {
        display_name: data.display_name,
        serial_number: data.serial_number || undefined,
        external_id: data.external_id || undefined,
        installation_date: data.installation_date?.toISOString(),
      };

      await onUpdate(equipment.id, updateData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update equipment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusAction = async (action: EquipmentStatusAction) => {
    if (!equipment) return;

    setIsSubmitting(true);
    try {
      await onStatusChange(equipment.id, action);
    } catch (error) {
      console.error('Failed to change status:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{equipment.display_name}</DialogTitle>
              <div className="flex items-center gap-4 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(equipment.status)}`} />
                  {getStatusText(equipment.status)}
                </Badge>
                {equipment.template && (
                  <Badge variant="outline">
                    {equipment.template.name}
                  </Badge>
                )}
                {equipment.serial_number && (
                  <span className="text-sm text-muted-foreground">
                    SN: {equipment.serial_number}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {equipment.status === 'disabled' ? (
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
                  disabled={isSubmitting || equipment.status === 'archived'}
                >
                  <PowerOff className="w-4 h-4 mr-2" />
                  Отключить
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusAction('archive')}
                disabled={isSubmitting || equipment.status === 'archived'}
              >
                <Archive className="w-4 h-4 mr-2" />
                Архив
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="properties" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties">Свойства</TabsTrigger>
            <TabsTrigger value="components">Компоненты</TabsTrigger>
            <TabsTrigger value="events" onClick={loadEvents}>Журнал событий</TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="mt-6">
            <div className="space-y-6">
              {/* Основная информация */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Основная информация</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      disabled={equipment.status === 'archived' || isSubmitting}
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

                        <div className="grid grid-cols-2 gap-4">
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

                          <FormField
                            control={form.control}
                            name="external_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Внешний ID</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="installation_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Дата установки</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "dd.MM.yyyy")
                                      ) : (
                                        <span>Выберите дату</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date()}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
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
                          <p className="mt-1">{equipment.display_name}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Серийный номер
                          </Label>
                          <p className="mt-1">{equipment.serial_number || "—"}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Внешний ID
                          </Label>
                          <p className="mt-1">{equipment.external_id || "—"}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Дата установки
                          </Label>
                          <p className="mt-1">
                            {equipment.installation_date
                              ? format(new Date(equipment.installation_date), "dd.MM.yyyy")
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Создано
                          </Label>
                          <p className="mt-1">
                            {format(new Date(equipment.created_at), "dd.MM.yyyy HH:mm")}
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Обновлено
                          </Label>
                          <p className="mt-1">
                            {format(new Date(equipment.updated_at), "dd.MM.yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Информация о шаблоне */}
              {equipment.template && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Шаблон оборудования</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Название
                          </Label>
                          <p className="mt-1">{equipment.template.name}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Технический код
                          </Label>
                          <p className="mt-1">{equipment.template.technical_code}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Тип системы
                          </Label>
                          <p className="mt-1">{equipment.template.system_type}</p>
                        </div>

                        {equipment.template.description && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Описание
                            </Label>
                            <p className="mt-1 text-sm">{equipment.template.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Вкладка "Компоненты" */}
          <TabsContent value="components" className="mt-6">
            <ComponentsTab 
              equipmentId={equipment.id}
              equipmentTemplateId={equipment.template_id}
              tradingPointId={equipment.trading_point_id}
            />
          </TabsContent>

          {/* Вкладка "Журнал событий" */}
          <TabsContent value="events" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Журнал событий</CardTitle>
                <CardDescription>
                  История изменений и операций с оборудованием
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {eventsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-sm text-muted-foreground">Загрузка...</div>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <History className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-center">
                        Пока нет событий в журнале
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {events.map((event, index) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="p-2 bg-muted rounded-full">
                              {getEventIcon(event.event_type)}
                            </div>
                            {index < events.length - 1 && (
                              <div className="w-px h-8 bg-border mt-2" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {event.event_type === 'created' && 'Создание'}
                                {event.event_type === 'updated' && 'Обновление'}
                                {event.event_type === 'status_changed' && 'Изменение статуса'}
                                {event.event_type === 'command_executed' && 'Выполнение команды'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.timestamp), "dd.MM.yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">
                              Пользователь: {event.user_name}
                            </p>
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="text-xs bg-muted rounded p-2 mt-2">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(event.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}