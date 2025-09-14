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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { nomenclatureService } from "@/services/nomenclatureService";
import { FuelNomenclature } from "@/types/nomenclature";
import { useSelection } from "@/contexts/SelectionContext";
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

// Функция для локализации полей резервуара
const getFieldLabel = (key: string): string => {
  const labels: Record<string, string> = {
    'id': 'ID резервуара',
    'name': 'Название резервуара',
    'fuelType': 'Тип топлива',
    'currentLevelLiters': 'Текущий уровень (литры)',
    'capacityLiters': 'Объем резервуара (литры)',
    'minLevelPercent': 'Минимальный уровень (%)',
    'criticalLevelPercent': 'Критический уровень (%)',
    'maxLevelPercent': 'Максимальный уровень (%)',
    'temperature': 'Температура (°C)',
    'waterLevelMm': 'Уровень воды (мм)',
    'density': 'Плотность',
    'material': 'Материал',
    'status': 'Статус',
    'location': 'Местоположение',
    'supplier': 'Поставщик',
    'lastCalibration': 'Последняя калибровка'
  };
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1);
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
  const { selectedNetwork } = useSelection();
  const [isEditing, setIsEditing] = useState(false);
  const [events, setEvents] = useState<EquipmentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Состояние для параметров резервуара (отдельно от основной формы)
  const [tankParams, setTankParams] = useState<Record<string, any>>({});
  const [fuelNomenclature, setFuelNomenclature] = useState<FuelNomenclature[]>([]);

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
      
      // Инициализируем параметры резервуара
      if (equipment.system_type === "fuel_tank" && equipment.params) {
        setTankParams(equipment.params);
      }
      
      setIsEditing(false);

      // Загружаем номенклатуру топлива если это резервуар
      if (equipment.system_type === "fuel_tank") {
        const loadFuelNomenclature = async () => {
          try {
            const filters = { 
              status: 'active' as const,
              ...(selectedNetwork?.id && { networkId: selectedNetwork.id })
            };
            const data = await nomenclatureService.getNomenclature(filters);
            
            // Удаляем дубликаты по названию топлива, оставляя только уникальные названия
            const uniqueFuelTypes = data.reduce((acc, fuel) => {
              if (!acc.some(item => item.name === fuel.name)) {
                acc.push(fuel);
              }
              return acc;
            }, [] as FuelNomenclature[]);
            
            setFuelNomenclature(uniqueFuelTypes);
          } catch (error) {
            console.error('Failed to load fuel nomenclature:', error);
            setFuelNomenclature([]);
          }
        };
        loadFuelNomenclature();
      }
    }
  }, [open, equipment, form, selectedNetwork]);

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
        // Если это топливный резервуар, включаем обновленные параметры
        ...(equipment.system_type === "fuel_tank" && {
          params: tankParams
        })
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
                <Badge variant="outline">
                  {equipment.name}
                </Badge>
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

              {/* Информация об оборудовании */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Технические характеристики</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Название
                        </Label>
                        <p className="mt-1">{equipment.name}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">
                          Тип системы
                        </Label>
                        <p className="mt-1">{equipment.system_type}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {equipment.created_from_template && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Шаблон
                          </Label>
                          <p className="mt-1">Шаблон #{equipment.created_from_template}</p>
                        </div>
                      )}

                      {equipment.external_id && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Внешний ID
                          </Label>
                          <p className="mt-1">{equipment.external_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Параметры резервуара - только для fuel_tank */}
              {equipment.system_type === "fuel_tank" && equipment.params && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Параметры резервуара</CardTitle>
                    <CardDescription>
                      Настройки и характеристики резервуара
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-6">
                        {/* Форма редактирования параметров резервуара */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Базовые характеристики */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Базовые характеристики</h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Тип топлива</Label>
                                <Select 
                                  value={tankParams.fuelType || ""} 
                                  onValueChange={(value) => setTankParams(prev => ({...prev, fuelType: value}))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Выберите тип топлива" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fuelNomenclature.length === 0 ? (
                                      <SelectItem value="" disabled>Загрузка...</SelectItem>
                                    ) : (
                                      fuelNomenclature.map((fuel) => (
                                        <SelectItem key={fuel.id} value={fuel.name}>
                                          {fuel.name}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Объем резервуара (л)</Label>
                                <Input
                                  type="number"
                                  value={tankParams.capacityLiters || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, capacityLiters: Number(e.target.value)}))}
                                  placeholder="10000"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Текущий уровень (л)</Label>
                                <Input
                                  type="number"
                                  value={tankParams.currentLevelLiters || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, currentLevelLiters: Number(e.target.value)}))}
                                  placeholder="5000"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-sm font-medium">Мин. уровень (%)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tankParams.minLevelPercent || ""}
                                    onChange={(e) => setTankParams(prev => ({...prev, minLevelPercent: Number(e.target.value)}))}
                                    placeholder="10"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Крит. уровень (%)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={tankParams.criticalLevelPercent || ""}
                                    onChange={(e) => setTankParams(prev => ({...prev, criticalLevelPercent: Number(e.target.value)}))}
                                    placeholder="5"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Физические параметры */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Физические параметры</h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Температура (°C)</Label>
                                <Input
                                  type="number"
                                  value={tankParams.temperature !== null && tankParams.temperature !== undefined ? tankParams.temperature : ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, temperature: e.target.value ? Number(e.target.value) : null}))}
                                  placeholder="15"
                                />
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Уровень воды (мм)</Label>
                                <Input
                                  type="number"
                                  value={tankParams.waterLevelMm !== null && tankParams.waterLevelMm !== undefined ? tankParams.waterLevelMm : ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, waterLevelMm: e.target.value ? Number(e.target.value) : null}))}
                                  placeholder="0"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Плотность</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={tankParams.density || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, density: e.target.value ? Number(e.target.value) : null}))}
                                  placeholder="0.740"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Материал</Label>
                                <Input
                                  value={tankParams.material || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, material: e.target.value}))}
                                  placeholder="Сталь, Алюминий"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Статус и местоположение */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Статус и местоположение</h4>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-sm font-medium">Статус</Label>
                                <select 
                                  className="w-full p-2 border border-input rounded-md"
                                  value={tankParams.status || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, status: e.target.value}))}
                                >
                                  <option value="">Выберите статус</option>
                                  <option value="active">Активен</option>
                                  <option value="maintenance">Техобслуживание</option>
                                  <option value="offline">Не в сети</option>
                                </select>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Местоположение</Label>
                                <Input
                                  value={tankParams.location || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, location: e.target.value}))}
                                  placeholder="Резервуарный парк #1"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Поставщик</Label>
                                <Input
                                  value={tankParams.supplier || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, supplier: e.target.value}))}
                                  placeholder="ООО Поставщик"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Последняя калибровка</Label>
                                <Input
                                  type="date"
                                  value={tankParams.lastCalibration || ""}
                                  onChange={(e) => setTankParams(prev => ({...prev, lastCalibration: e.target.value}))}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Пороговые значения */}
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700">Пороговые значения</h4>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-sm font-medium">Мин. температура (°C)</Label>
                                  <Input
                                    type="number"
                                    value={tankParams.thresholds?.criticalTemp?.min || ""}
                                    onChange={(e) => setTankParams(prev => ({
                                      ...prev, 
                                      thresholds: {
                                        ...prev.thresholds,
                                        criticalTemp: {
                                          ...prev.thresholds?.criticalTemp,
                                          min: e.target.value ? Number(e.target.value) : null
                                        }
                                      }
                                    }))}
                                    placeholder="-10"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Макс. температура (°C)</Label>
                                  <Input
                                    type="number"
                                    value={tankParams.thresholds?.criticalTemp?.max || ""}
                                    onChange={(e) => setTankParams(prev => ({
                                      ...prev, 
                                      thresholds: {
                                        ...prev.thresholds,
                                        criticalTemp: {
                                          ...prev.thresholds?.criticalTemp,
                                          max: e.target.value ? Number(e.target.value) : null
                                        }
                                      }
                                    }))}
                                    placeholder="50"
                                  />
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Макс. уровень воды (мм)</Label>
                                <Input
                                  type="number"
                                  value={tankParams.thresholds?.maxWaterLevel || ""}
                                  onChange={(e) => setTankParams(prev => ({
                                    ...prev, 
                                    thresholds: {
                                      ...prev.thresholds,
                                      maxWaterLevel: e.target.value ? Number(e.target.value) : null
                                    }
                                  }))}
                                  placeholder="10"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Режим просмотра - без изменений */}
                        {/* Базовые характеристики */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-700">Базовые характеристики</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Тип топлива
                              </Label>
                              <p className="mt-1">{equipment.params.fuelType || "—"}</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Объем резервуара (л)
                              </Label>
                              <p className="mt-1">{equipment.params.capacityLiters?.toLocaleString() || "—"}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Текущий уровень (л)
                              </Label>
                              <p className="mt-1">{equipment.params.currentLevelLiters?.toLocaleString() || "0"}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Мин. уровень (%)
                                </Label>
                                <p className="mt-1">{equipment.params.minLevelPercent || "—"}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Крит. уровень (%)
                                </Label>
                                <p className="mt-1">{equipment.params.criticalLevelPercent || "—"}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Физические параметры */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-700">Физические параметры</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Температура (°C)
                              </Label>
                              <p className="mt-1">{equipment.params.temperature !== null && equipment.params.temperature !== undefined ? equipment.params.temperature : "—"}</p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Уровень воды (мм)
                              </Label>
                              <p className="mt-1">{equipment.params.waterLevelMm !== null && equipment.params.waterLevelMm !== undefined ? equipment.params.waterLevelMm : "—"}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Плотность
                              </Label>
                              <p className="mt-1">{equipment.params.density || "—"}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Материал
                              </Label>
                              <p className="mt-1">{equipment.params.material || "—"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Статус и местоположение */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-700">Статус и местоположение</h4>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Статус
                              </Label>
                              <p className="mt-1">
                                <Badge variant={equipment.params.status === 'active' ? 'default' : 'secondary'}>
                                  {equipment.params.status === 'active' ? 'Активен' : 
                                   equipment.params.status === 'maintenance' ? 'Техобслуживание' :
                                   equipment.params.status === 'offline' ? 'Не в сети' : equipment.params.status || '—'}
                                </Badge>
                              </p>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Местоположение
                              </Label>
                              <p className="mt-1">{equipment.params.location || "—"}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Поставщик
                              </Label>
                              <p className="mt-1">{equipment.params.supplier || "—"}</p>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Последняя калибровка
                              </Label>
                              <p className="mt-1">{equipment.params.lastCalibration || "—"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Пороговые значения и уведомления */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-semibold text-slate-700">Пороговые значения</h4>
                          <div className="space-y-3">
                            {equipment.params.thresholds && (
                              <>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-sm font-medium text-muted-foreground">
                                      Мин. температура (°C)
                                    </Label>
                                    <p className="mt-1">{equipment.params.thresholds.criticalTemp?.min || "—"}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium text-muted-foreground">
                                      Макс. температура (°C)
                                    </Label>
                                    <p className="mt-1">{equipment.params.thresholds.criticalTemp?.max || "—"}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground">
                                    Макс. уровень воды (мм)
                                  </Label>
                                  <p className="mt-1">{equipment.params.thresholds.maxWaterLevel || "—"}</p>
                                </div>
                              </>
                            )}
                            
                            {equipment.params.notifications && (
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Настройки уведомлений
                                </Label>
                                <div className="mt-2 flex gap-2 flex-wrap">
                                  <Badge variant={equipment.params.notifications.enabled ? 'default' : 'secondary'}>
                                    {equipment.params.notifications.enabled ? 'Включены' : 'Отключены'}
                                  </Badge>
                                  {equipment.params.notifications.drainAlerts && (
                                    <Badge variant="outline">Слив</Badge>
                                  )}
                                  {equipment.params.notifications.levelAlerts && (
                                    <Badge variant="outline">Уровень</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Вкладка "Компоненты" */}
          <TabsContent value="components" className="mt-6">
            <ComponentsTab 
              equipmentId={equipment.id}
              equipmentTemplateId={equipment.created_from_template}
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